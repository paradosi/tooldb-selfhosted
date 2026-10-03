package api

import (
	"bytes"
	"database/sql"
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
	r.Get("/tools/{id}/receipts", ListToolReceipts)
	r.Post("/tools/{id}/photos", UploadToolPhoto)
	r.Post("/tools/{id}/receipts", UploadToolReceipt)
	r.Get("/batteries/{id}/receipts", ListBatteryReceipts)
	r.Post("/batteries/{id}/photos", UploadBatteryPhoto)
	r.Post("/batteries/{id}/receipts", UploadBatteryReceipt)
	r.Delete("/photos/{id}", DeletePhoto)
	r.Delete("/receipts/{id}", DeleteReceipt)
	r.Put("/photos/{id}", UpdatePhoto)
	r.Put("/receipts/{id}", UpdateReceipt)
}

// ListToolReceipts handles GET /api/tools/{id}/receipts
func ListToolReceipts(w http.ResponseWriter, r *http.Request) {
	toolID := chi.URLParam(r, "id")
	if !ownsRow("tools", toolID, auth.GetUserID(r)) {
		Error(w, 404, "tool not found")
		return
	}
	JSON(w, 200, getToolReceipts(toolID))
}

// ListBatteryReceipts handles GET /api/batteries/{id}/receipts
func ListBatteryReceipts(w http.ResponseWriter, r *http.Request) {
	batteryID := chi.URLParam(r, "id")
	if !ownsRow("batteries", batteryID, auth.GetUserID(r)) {
		Error(w, 404, "battery not found")
		return
	}
	JSON(w, 200, getBatteryReceipts(batteryID))
}

// UploadToolPhoto handles POST /api/tools/{id}/photos
func UploadToolPhoto(w http.ResponseWriter, r *http.Request) {
	toolID := chi.URLParam(r, "id")
	userID := auth.GetUserID(r)

	// Reject uploads aimed at another user's tool before any file is written.
	if !ownsRow("tools", toolID, userID) {
		Error(w, 404, "tool not found")
		return
	}

	filename, _, _, err := saveUpload(w, r, "photos")
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

	if !ownsRow("tools", toolID, userID) {
		Error(w, 404, "tool not found")
		return
	}

	filename, ext, origName, err := saveUpload(w, r, "receipts")
	if err != nil {
		return
	}

	id := NewUUID()
	now := Now()
	url := "/receipts/" + filename
	label := r.FormValue("label")
	name := receiptName(r, origName)

	_, err = db.DB.Exec(`INSERT INTO tool_receipts (id, tool_id, user_id, url, file_type, label, name, uploaded_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		id, toolID, userID, url, ext, label, name, now)
	if err != nil {
		os.Remove(filepath.Join(DataDir(), "receipts", filename))
		Error(w, 500, err.Error())
		return
	}

	JSON(w, 201, map[string]interface{}{
		"id": id, "url": url, "file_type": ext, "label": label, "name": name, "uploaded_at": now,
	})
}

// UploadBatteryPhoto handles POST /api/batteries/{id}/photos
func UploadBatteryPhoto(w http.ResponseWriter, r *http.Request) {
	batteryID := chi.URLParam(r, "id")
	userID := auth.GetUserID(r)

	// Reject uploads aimed at another user's battery before any file is written.
	if !ownsRow("batteries", batteryID, userID) {
		Error(w, 404, "battery not found")
		return
	}

	filename, _, _, err := saveUpload(w, r, "photos")
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

	if !ownsRow("batteries", batteryID, userID) {
		Error(w, 404, "battery not found")
		return
	}

	filename, ext, origName, err := saveUpload(w, r, "receipts")
	if err != nil {
		return
	}

	id := NewUUID()
	now := Now()
	url := "/receipts/" + filename
	label := r.FormValue("label")
	name := receiptName(r, origName)

	_, err = db.DB.Exec(`INSERT INTO battery_receipts (id, battery_id, user_id, url, file_type, label, name, uploaded_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		id, batteryID, userID, url, ext, label, name, now)
	if err != nil {
		os.Remove(filepath.Join(DataDir(), "receipts", filename))
		Error(w, 500, err.Error())
		return
	}

	JSON(w, 201, map[string]interface{}{
		"id": id, "url": url, "file_type": ext, "label": label, "name": name, "uploaded_at": now,
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

// UpdateReceipt handles PUT /api/receipts/{id} — rename an uploaded document
// and/or change its category label. Either field may be omitted, but at least
// one is expected. The row may live in tool_receipts or battery_receipts, so
// mirror DeleteReceipt and probe both.
func UpdateReceipt(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := auth.GetUserID(r)

	var body struct {
		Name  *string `json:"name"`
		Label *string `json:"label"`
	}
	if err := ParseBody(r, &body); err != nil {
		Error(w, 400, "invalid request body")
		return
	}
	if body.Name == nil && body.Label == nil {
		Error(w, 400, "nothing to update")
		return
	}

	var name string
	if body.Name != nil {
		name = strings.TrimSpace(*body.Name)
		if len([]rune(name)) > 200 {
			Error(w, 400, "name too long")
			return
		}
	}

	table, ok := findReceiptTable(id, userID)
	if !ok {
		Error(w, 404, "receipt not found")
		return
	}

	if body.Name != nil {
		if _, err := db.DB.Exec(`UPDATE `+table+` SET name = ? WHERE id = ? AND user_id = ?`, name, id, userID); err != nil {
			Error(w, 500, err.Error())
			return
		}
	}
	if body.Label != nil {
		if _, err := db.DB.Exec(`UPDATE `+table+` SET label = ? WHERE id = ? AND user_id = ?`, *body.Label, id, userID); err != nil {
			Error(w, 500, err.Error())
			return
		}
	}

	receipt := receiptByID(table, id, userID)
	if receipt == nil {
		Error(w, 404, "receipt not found")
		return
	}
	JSON(w, 200, receipt)
}

// findReceiptTable reports which of the two receipt tables owns the row, scoped
// by user so another user's id is neither updated nor disclosed.
func findReceiptTable(id, userID string) (string, bool) {
	for _, table := range []string{"tool_receipts", "battery_receipts"} {
		var got string
		if err := db.DB.QueryRow(`SELECT id FROM `+table+` WHERE id = ? AND user_id = ?`, id, userID).Scan(&got); err == nil {
			return table, true
		}
	}
	return "", false
}

func receiptByID(table, id, userID string) map[string]interface{} {
	var rid, url, fileType, uploadedAt string
	var label, name sql.NullString
	err := db.DB.QueryRow(`SELECT id, url, file_type, label, name, uploaded_at FROM `+table+` WHERE id = ? AND user_id = ?`, id, userID).
		Scan(&rid, &url, &fileType, &label, &name, &uploadedAt)
	if err != nil {
		return nil
	}
	return map[string]interface{}{
		"id": rid, "url": url, "file_type": fileType,
		"label": nullStr(label), "name": nullStr(name), "uploaded_at": uploadedAt,
	}
}

// --- internal helpers ---

// saveUpload reads the multipart "file" field, writes it to disk under subdir, and returns the
// generated filename, extension, and the client's original filename.
// On error it writes the HTTP response and returns a non-nil error.
func saveUpload(w http.ResponseWriter, r *http.Request, subdir string) (filename string, ext string, origName string, err error) {
	r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		Error(w, 400, "file too large or invalid multipart")
		return "", "", "", err
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		Error(w, 400, "missing file field")
		return "", "", "", err
	}
	defer file.Close()

	// Sniff the real type from the file's magic bytes; never trust the
	// client-supplied Content-Type or filename extension.
	head := make([]byte, 512)
	n, err := io.ReadFull(file, head)
	if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
		Error(w, 400, "failed to read file")
		return "", "", "", err
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
		return "", "", "", fmt.Errorf("unsupported content type %q", ct)
	}

	id := NewUUID()
	fname := id + ext
	dst := filepath.Join(DataDir(), subdir, fname)

	out, err := os.Create(dst)
	if err != nil {
		Error(w, 500, "failed to create file")
		return "", "", "", err
	}
	defer out.Close()

	// Write the sniffed prefix first, then stream the remainder, so the
	// buffered head isn't lost.
	if _, err := out.Write(head); err != nil {
		os.Remove(dst)
		Error(w, 500, "failed to write file")
		return "", "", "", err
	}
	if _, err := io.Copy(out, file); err != nil {
		os.Remove(dst)
		Error(w, 500, "failed to write file")
		return "", "", "", err
	}

	return fname, ext, header.Filename, nil
}

// receiptName picks the stored document name: an explicit "name" form value
// when supplied, otherwise the original upload filename (the only label the
// user gave). Capped at 200 characters so a pathological filename can't bloat
// the row.
func receiptName(r *http.Request, origName string) string {
	name := strings.TrimSpace(r.FormValue("name"))
	if name == "" {
		name = strings.TrimSpace(origName)
	}
	if runes := []rune(name); len(runes) > 200 {
		name = string(runes[:200])
	}
	return name
}

func removeFile(url string) {
	// url is like /photos/uuid.jpg or /receipts/uuid.pdf
	// Strip leading slash and join with DataDir
	rel := strings.TrimPrefix(url, "/")
	path := filepath.Join(DataDir(), rel)
	os.Remove(path)
}

// collectMediaURLs returns the url column of a query. It lets a delete handler
// gather a row's media files before the DB cascade removes the rows, since the
// cascade only touches rows, never the files on disk.
func collectMediaURLs(query string, args ...interface{}) []string {
	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var urls []string
	for rows.Next() {
		var u string
		if rows.Scan(&u) == nil {
			urls = append(urls, u)
		}
	}
	return urls
}

// ownsRow reports whether the given row id belongs to the authenticated user.
// Upload handlers call it before writing any file, so a caller can't attach
// media to someone else's tool/battery. The table name is an allowlisted
// literal from our own call sites, never user input.
func ownsRow(table, id, userID string) bool {
	var q string
	switch table {
	case "tools":
		q = `SELECT COUNT(1) FROM tools WHERE id = ? AND user_id = ?`
	case "batteries":
		q = `SELECT COUNT(1) FROM batteries WHERE id = ? AND user_id = ?`
	default:
		return false
	}
	var n int
	if err := db.DB.QueryRow(q, id, userID).Scan(&n); err != nil {
		return false
	}
	return n > 0
}
