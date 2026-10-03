package api

import (
	"bytes"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"os"
	"path/filepath"
	"testing"
)

// postFile runs saveUpload against a synthetic multipart request, letting the
// test control both the declared Content-Type and the real file bytes. The
// declared type is deliberately attacker-controlled: saveUpload must ignore it
// and trust only the sniffed content.
func postFile(t *testing.T, subdir, filename, declaredType string, content []byte) (*httptest.ResponseRecorder, string) {
	t.Helper()

	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)

	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", fmt.Sprintf(`form-data; name="file"; filename="%s"`, filename))
	h.Set("Content-Type", declaredType)
	part, err := mw.CreatePart(h)
	if err != nil {
		t.Fatalf("create part: %v", err)
	}
	if _, err := part.Write(content); err != nil {
		t.Fatalf("write part: %v", err)
	}
	if err := mw.Close(); err != nil {
		t.Fatalf("close writer: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/tools/x/photos", &buf)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	rec := httptest.NewRecorder()

	fname, _, _, _ := saveUpload(rec, req, subdir)
	return rec, fname
}

// TestSaveUploadAcceptsAllowedTypes checks that each allowlisted type is
// accepted, gets the right extension, and is written to disk byte-for-byte
// (the sniffed 512-byte prefix must not be dropped).
func TestSaveUploadAcceptsAllowedTypes(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("DATA_DIR", dir)
	if err := InitUploadDirs(); err != nil {
		t.Fatalf("InitUploadDirs: %v", err)
	}

	cases := []struct {
		name     string
		declared string
		body     []byte
		wantExt  string
	}{
		{"photo.png", "image/png", []byte("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"), ".png"},
		{"photo.jpg", "image/jpeg", []byte("\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00"), ".jpg"},
		{"photo.gif", "image/gif", []byte("GIF89a\x01\x00\x01\x00\x00\x00"), ".gif"},
		// Declared as a generic blob on purpose: only the RIFF/WEBP magic
		// bytes identify this one.
		{"photo.webp", "application/octet-stream", []byte("RIFF\x24\x00\x00\x00WEBPVP8 "), ".webp"},
		{"receipt.pdf", "application/pdf", []byte("%PDF-1.4\n1 0 obj\n"), ".pdf"},
	}

	for _, c := range cases {
		rec, fname := postFile(t, "photos", c.name, c.declared, c.body)
		if rec.Code != http.StatusOK {
			t.Errorf("%s: status %d, want 200", c.name, rec.Code)
		}
		if got := filepath.Ext(fname); got != c.wantExt {
			t.Errorf("%s: extension %q, want %q", c.name, got, c.wantExt)
		}
		got, err := os.ReadFile(filepath.Join(dir, "photos", fname))
		if err != nil {
			t.Errorf("%s: file not written: %v", c.name, err)
			continue
		}
		if !bytes.Equal(got, c.body) {
			t.Errorf("%s: stored bytes differ from uploaded bytes (prefix lost?)", c.name)
		}
	}
}

// TestSaveUploadRejectsDisallowedTypes is the stored-XSS regression test: SVG
// and HTML — including one that lies about its Content-Type — must be refused,
// and nothing may reach the disk.
func TestSaveUploadRejectsDisallowedTypes(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("DATA_DIR", dir)
	if err := InitUploadDirs(); err != nil {
		t.Fatalf("InitUploadDirs: %v", err)
	}

	svg := []byte(`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>`)
	html := []byte(`<!DOCTYPE html><html><body><script>alert(1)</script></body></html>`)

	cases := []struct {
		name     string
		declared string
		body     []byte
	}{
		{"evil.svg", "image/svg+xml", svg},
		{"evil.html", "text/html", html},
		// Forged Content-Type: claims PNG, real bytes are SVG.
		{"evil.png", "image/png", svg},
		// Extension lies too; declared type is honest here.
		{"evil.txt", "text/plain", []byte("just text")},
		// Empty file: nothing to sniff, must not be stored.
		{"empty.png", "image/png", nil},
	}

	for _, c := range cases {
		rec, _ := postFile(t, "photos", c.name, c.declared, c.body)
		if rec.Code != http.StatusUnsupportedMediaType {
			t.Errorf("%s: status %d, want 415", c.name, rec.Code)
		}
	}

	entries, err := os.ReadDir(filepath.Join(dir, "photos"))
	if err != nil {
		t.Fatalf("read photos dir: %v", err)
	}
	if len(entries) != 0 {
		t.Errorf("expected no files on disk, found %d", len(entries))
	}
}
