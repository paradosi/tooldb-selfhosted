package api

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/paradosi/tooldb-selfhosted/internal/auth"
	"github.com/paradosi/tooldb-selfhosted/internal/db"
)

// allowedUploadTypes is the closed allowlist of sniffed MIME types we store,
// mapped to the extension written to disk. Anything not listed is rejected.
// This prevents client-supplied .svg/.html (and forged Content-Type headers)
// from being stored and then served from the app's own origin.
var allowedUploadTypes = map[string]string{
	"image/jpeg":      ".jpg",
	"image/png":       ".png",
	"image/gif":       ".gif",
	"image/webp":      ".webp",
	"application/pdf": ".pdf",
}

// DataDir returns the configured data directory.
func DataDir() string {
	d := os.Getenv("DATA_DIR")
	if d == "" {
		d = "./data"
	}
	return d
}

// InitUploadDirs creates the photos/ and receipts/ subdirectories under DATA_DIR.
func InitUploadDirs() error {
	base := DataDir()
	if err := os.MkdirAll(filepath.Join(base, "photos"), 0755); err != nil {
		return err
	}
	return os.MkdirAll(filepath.Join(base, "receipts"), 0755)
}

func UploadRoutes(r chi.Router) {
	r.Post("/tools/{id}/photos", UploadToolPhoto)
	r.Post("/tools/{id}/receipts", UploadToolReceipt)
	r.Post("/batteries/{id}/photos", UploadBatteryPhoto)
	r.Post("/batteries/{id}/receipts", UploadBatteryReceipt)
	r.Delete("/photos/{id}", DeletePhoto)
	r.Delete("/receipts/{id}", DeleteReceipt)
	r.Put("/photos/{id}", UpdatePhoto)
}

// UploadToolPhoto handles POST /api/tools/{id}/photos
func UploadToolPhoto(w http.ResponseWriter, r *http.Request) {
	toolID := chi.URLParam(r, "id")
	userID := auth.GetUserID(r)

	filename, _, err := saveUpload(w, r, "photos")
	if err != nil {
		return // error already written
	}

	id := NewUUID()
	now := Now()
	url := "/photos/" + filename

	_, err = db.DB.Exec(`INSERT INTO tool_photos (id, tool_id, user_id, url, is_primary, rotation, uploaded_at)
		VALUES (?, ?, ?, ?, 0, 0, ?)`,
		id, toolID, userID, url, now)
	if err != nil {
		os.Remove(filepath.Join(DataDir(), "photos", filename))
		Error(w, 500, err.Error())
		return
	}

	JSON(w, 201, map[string]interface{}{
		"id": id, "url": url, "is_primary": false, "rotation": 0, "uploaded_at": now,
	})
}

// UploadToolReceipt handles POST /api/tools/{id}/receipts
func UploadToolReceipt(w http.ResponseWriter, r *http.Request) {
	toolID := chi.URLParam(r, "id")
	userID := auth.GetUserID(r)

	filename, ext, err := saveUpload(w, r, "receipts")
	if err != nil {
		return
	}

	id := NewUUID()
	now := Now()
	url := "/receipts/" + filename
	label := r.FormValue("label")

	_, err = db.DB.Exec(`INSERT INTO tool_receipts (id, tool_id, user_id, url, file_type, label, uploaded_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		id, toolID, userID, url, ext, label, now)
	if err != nil {
		os.Remove(filepath.Join(DataDir(), "receipts", filename))
		Error(w, 500, err.Error())
		return
	}

	JSON(w, 201, map[string]interface{}{
		"id": id, "url": url, "file_type": ext, "label": label, "uploaded_at": now,
	})
}

// UploadBatteryPhoto handles POST /api/batteries/{id}/photos
func UploadBatteryPhoto(w http.ResponseWriter, r *http.Request) {
	batteryID := chi.URLParam(r, "id")
	userID := auth.GetUserID(r)

	filename, _, err := saveUpload(w, r, "photos")
	if err != nil {
		return
	}

	id := NewUUID()
	now := Now()
	url := "/photos/" + filename

	_, err = db.DB.Exec(`INSERT INTO battery_photos (id, battery_id, user_id, url, is_primary, rotation, uploaded_at)
		VALUES (?, ?, ?, ?, 0, 0, ?)`,
		id, batteryID, userID, url, now)
	if err != nil {
		os.Remove(filepath.Join(DataDir(), "photos", filename))
		Error(w, 500, err.Error())
		return
	}

	JSON(w, 201, map[string]interface{}{
		"id": id, "url": url, "is_primary": false, "rotation": 0, "uploaded_at": now,
	})
}

// UploadBatteryReceipt handles POST /api/batteries/{id}/receipts
func UploadBatteryReceipt(w http.ResponseWriter, r *http.Request) {
	batteryID := chi.URLParam(r, "id")
	userID := auth.GetUserID(r)

	filename, ext, err := saveUpload(w, r, "receipts")
	if err != nil {
		return
	}

	id := NewUUID()
	now := Now()
	url := "/receipts/" + filename
	label := r.FormValue("label")

	_, err = db.DB.Exec(`INSERT INTO battery_receipts (id, battery_id, user_id, url, file_type, label, uploaded_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		id, batteryID, userID, url, ext, label, now)
	if err != nil {
		os.Remove(filepath.Join(DataDir(), "receipts", filename))
		Error(w, 500, err.Error())
		return
	}

	JSON(w, 201, map[string]interface{}{
		"id": id, "url": url, "file_type": ext, "label": label, "uploaded_at": now,
	})
}

// DeletePhoto handles DELETE /api/photos/{id}
func DeletePhoto(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := auth.GetUserID(r)

	// Try tool_photos first
	var url string
	err := db.DB.QueryRow(`SELECT url FROM tool_photos WHERE id = ? AND user_id = ?`, id, userID).Scan(&url)
	if err == nil {
		db.DB.Exec(`DELETE FROM tool_photos WHERE id = ? AND user_id = ?`, id, userID)
		removeFile(url)
		w.WriteHeader(204)
		return
	}

	// Try battery_photos
	err = db.DB.QueryRow(`SELECT url FROM battery_photos WHERE id = ? AND user_id = ?`, id, userID).Scan(&url)
	if err == nil {
		db.DB.Exec(`DELETE FROM battery_photos WHERE id = ? AND user_id = ?`, id, userID)
		removeFile(url)
		w.WriteHeader(204)
		return
	}

	Error(w, 404, "photo not found")
}

// DeleteReceipt handles DELETE /api/receipts/{id}
func DeleteReceipt(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := auth.GetUserID(r)

	// Try tool_receipts first
	var url string
	err := db.DB.QueryRow(`SELECT url FROM tool_receipts WHERE id = ? AND user_id = ?`, id, userID).Scan(&url)
	if err == nil {
		db.DB.Exec(`DELETE FROM tool_receipts WHERE id = ? AND user_id = ?`, id, userID)
		removeFile(url)
		w.WriteHeader(204)
		return
	}

	// Try battery_receipts
	err = db.DB.QueryRow(`SELECT url FROM battery_receipts WHERE id = ? AND user_id = ?`, id, userID).Scan(&url)
	if err == nil {
		db.DB.Exec(`DELETE FROM battery_receipts WHERE id = ? AND user_id = ?`, id, userID)
		removeFile(url)
		w.WriteHeader(204)
		return
	}

	Error(w, 404, "receipt not found")
}

// UpdatePhoto handles PUT /api/photos/{id} — update rotation and is_primary
func UpdatePhoto(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := auth.GetUserID(r)

	var body struct {
		Rotation  *int  `json:"rotation"`
		IsPrimary *bool `json:"is_primary"`
	}
	if err := ParseBody(r, &body); err != nil {
		Error(w, 400, "invalid request body")
		return
	}

	// Determine which table this photo belongs to
	var toolID string
	err := db.DB.QueryRow(`SELECT tool_id FROM tool_photos WHERE id = ? AND user_id = ?`, id, userID).Scan(&toolID)
	if err == nil {
		if body.IsPrimary != nil && *body.IsPrimary {
			db.DB.Exec(`UPDATE tool_photos SET is_primary = 0 WHERE tool_id = ? AND user_id = ?`, toolID, userID)
		}
		rotation := 0
		if body.Rotation != nil {
			rotation = *body.Rotation
		}
		isPrimary := 0
		if body.IsPrimary != nil && *body.IsPrimary {
			isPrimary = 1
		}
		db.DB.Exec(`UPDATE tool_photos SET rotation = ?, is_primary = ? WHERE id = ? AND user_id = ?`, rotation, isPrimary, id, userID)
		JSON(w, 200, map[string]interface{}{"id": id, "rotation": rotation, "is_primary": isPrimary == 1})
		return
	}

	var batteryID string
	err = db.DB.QueryRow(`SELECT battery_id FROM battery_photos WHERE id = ? AND user_id = ?`, id, userID).Scan(&batteryID)
	if err == nil {
		if body.IsPrimary != nil && *body.IsPrimary {
			db.DB.Exec(`UPDATE battery_photos SET is_primary = 0 WHERE battery_id = ? AND user_id = ?`, batteryID, userID)
		}
		rotation := 0
		if body.Rotation != nil {
			rotation = *body.Rotation
		}
		isPrimary := 0
		if body.IsPrimary != nil && *body.IsPrimary {
			isPrimary = 1
		}
		db.DB.Exec(`UPDATE battery_photos SET rotation = ?, is_primary = ? WHERE id = ? AND user_id = ?`, rotation, isPrimary, id, userID)
		JSON(w, 200, map[string]interface{}{"id": id, "rotation": rotation, "is_primary": isPrimary == 1})
		return
	}

	Error(w, 404, "photo not found")
}

// --- internal helpers ---

// saveUpload reads the multipart "file" field, writes it to disk under subdir, and returns the filename and extension.
// On error it writes the HTTP response and returns a non-nil error.
func saveUpload(w http.ResponseWriter, r *http.Request, subdir string) (filename string, ext string, err error) {
	r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		Error(w, 400, "file too large or invalid multipart")
		return "", "", err
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		Error(w, 400, "missing file field")
		return "", "", err
	}
	defer file.Close()

	// Sniff the real type from the file's magic bytes; never trust the
	// client-supplied Content-Type or filename extension.
	head := make([]byte, 512)
	n, err := io.ReadFull(file, head)
	if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
		Error(w, 400, "failed to read file")
		return "", "", err
	}
	head = head[:n]

	ct := http.DetectContentType(head)
	// DetectContentType does not reliably identify webp, so check its
	// RIFF/WEBP magic bytes explicitly.
	if len(head) >= 12 && bytes.Equal(head[0:4], []byte("RIFF")) && bytes.Equal(head[8:12], []byte("WEBP")) {
		ct = "image/webp"
	}

	ext, ok := allowedUploadTypes[ct]
	if !ok {
		Error(w, 415, "unsupported file type")
		return "", "", fmt.Errorf("unsupported content type %q", ct)
	}

	id := NewUUID()
	fname := id + ext
	dst := filepath.Join(DataDir(), subdir, fname)

	out, err := os.Create(dst)
	if err != nil {
		Error(w, 500, "failed to create file")
		return "", "", err
	}
	defer out.Close()

	// Write the sniffed prefix first, then stream the remainder, so the
	// buffered head isn't lost.
	if _, err := out.Write(head); err != nil {
		os.Remove(dst)
		Error(w, 500, "failed to write file")
		return "", "", err
	}
	if _, err := io.Copy(out, file); err != nil {
		os.Remove(dst)
		Error(w, 500, "failed to write file")
		return "", "", err
	}

	return fname, ext, nil
}

func removeFile(url string) {
	// url is like /photos/uuid.jpg or /receipts/uuid.pdf
	// Strip leading slash and join with DataDir
	rel := strings.TrimPrefix(url, "/")
	path := filepath.Join(DataDir(), rel)
	os.Remove(path)
}
