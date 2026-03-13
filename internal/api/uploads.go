package api

import (
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/paradosi/tooldb-selfhosted/internal/auth"
	"github.com/paradosi/tooldb-selfhosted/internal/db"
)

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

	// Try tool_photos first
	var url string
	err := db.DB.QueryRow(`SELECT url FROM tool_photos WHERE id = ?`, id).Scan(&url)
	if err == nil {
		db.DB.Exec(`DELETE FROM tool_photos WHERE id = ?`, id)
		removeFile(url)
		w.WriteHeader(204)
		return
	}

	// Try battery_photos
	err = db.DB.QueryRow(`SELECT url FROM battery_photos WHERE id = ?`, id).Scan(&url)
	if err == nil {
		db.DB.Exec(`DELETE FROM battery_photos WHERE id = ?`, id)
		removeFile(url)
		w.WriteHeader(204)
		return
	}

	Error(w, 404, "photo not found")
}

// DeleteReceipt handles DELETE /api/receipts/{id}
func DeleteReceipt(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Try tool_receipts first
	var url string
	err := db.DB.QueryRow(`SELECT url FROM tool_receipts WHERE id = ?`, id).Scan(&url)
	if err == nil {
		db.DB.Exec(`DELETE FROM tool_receipts WHERE id = ?`, id)
		removeFile(url)
		w.WriteHeader(204)
		return
	}

	// Try battery_receipts
	err = db.DB.QueryRow(`SELECT url FROM battery_receipts WHERE id = ?`, id).Scan(&url)
	if err == nil {
		db.DB.Exec(`DELETE FROM battery_receipts WHERE id = ?`, id)
		removeFile(url)
		w.WriteHeader(204)
		return
	}

	Error(w, 404, "receipt not found")
}

// UpdatePhoto handles PUT /api/photos/{id} — update rotation and is_primary
func UpdatePhoto(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

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
	err := db.DB.QueryRow(`SELECT tool_id FROM tool_photos WHERE id = ?`, id).Scan(&toolID)
	if err == nil {
		if body.IsPrimary != nil && *body.IsPrimary {
			db.DB.Exec(`UPDATE tool_photos SET is_primary = 0 WHERE tool_id = ?`, toolID)
		}
		rotation := 0
		if body.Rotation != nil {
			rotation = *body.Rotation
		}
		isPrimary := 0
		if body.IsPrimary != nil && *body.IsPrimary {
			isPrimary = 1
		}
		db.DB.Exec(`UPDATE tool_photos SET rotation = ?, is_primary = ? WHERE id = ?`, rotation, isPrimary, id)
		JSON(w, 200, map[string]interface{}{"id": id, "rotation": rotation, "is_primary": isPrimary == 1})
		return
	}

	var batteryID string
	err = db.DB.QueryRow(`SELECT battery_id FROM battery_photos WHERE id = ?`, id).Scan(&batteryID)
	if err == nil {
		if body.IsPrimary != nil && *body.IsPrimary {
			db.DB.Exec(`UPDATE battery_photos SET is_primary = 0 WHERE battery_id = ?`, batteryID)
		}
		rotation := 0
		if body.Rotation != nil {
			rotation = *body.Rotation
		}
		isPrimary := 0
		if body.IsPrimary != nil && *body.IsPrimary {
			isPrimary = 1
		}
		db.DB.Exec(`UPDATE battery_photos SET rotation = ?, is_primary = ? WHERE id = ?`, rotation, isPrimary, id)
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

	file, header, err := r.FormFile("file")
	if err != nil {
		Error(w, 400, "missing file field")
		return "", "", err
	}
	defer file.Close()

	// Determine extension from content type, falling back to original filename
	ext = extFromContentType(header.Header.Get("Content-Type"))
	if ext == "" {
		ext = strings.ToLower(filepath.Ext(header.Filename))
	}
	if ext == "" {
		ext = ".bin"
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

	if _, err := io.Copy(out, file); err != nil {
		os.Remove(dst)
		Error(w, 500, "failed to write file")
		return "", "", err
	}

	return fname, ext, nil
}

func extFromContentType(ct string) string {
	if ct == "" {
		return ""
	}
	// Use mime package for standard mappings
	exts, _ := mime.ExtensionsByType(ct)
	if len(exts) > 0 {
		// Prefer common extensions
		for _, e := range exts {
			if e == ".jpg" || e == ".jpeg" || e == ".png" || e == ".gif" || e == ".webp" || e == ".pdf" {
				return e
			}
		}
		return exts[0]
	}
	return ""
}

func removeFile(url string) {
	// url is like /photos/uuid.jpg or /receipts/uuid.pdf
	// Strip leading slash and join with DataDir
	rel := strings.TrimPrefix(url, "/")
	path := filepath.Join(DataDir(), rel)
	os.Remove(path)
}
