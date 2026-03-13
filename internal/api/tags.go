package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/paradosi/tooldb-selfhosted/internal/auth"
	"github.com/paradosi/tooldb-selfhosted/internal/db"
)

func TagRoutes(r chi.Router) {
	r.Get("/tags", ListTags)
	r.Post("/tags", CreateTag)
	r.Put("/tags/{id}", UpdateTag)
	r.Delete("/tags/{id}", DeleteTag)
	r.Post("/tools/{id}/tags/{tagId}", AddToolTag)
	r.Delete("/tools/{id}/tags/{tagId}", RemoveToolTag)
	r.Post("/batteries/{id}/tags/{tagId}", AddBatteryTag)
	r.Delete("/batteries/{id}/tags/{tagId}", RemoveBatteryTag)
}

func ListTags(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r)
	rows, err := db.DB.Query(`SELECT id, name, color, created_at FROM tags WHERE user_id = ? ORDER BY name ASC`, userID)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}
	defer rows.Close()

	tags := []map[string]interface{}{}
	for rows.Next() {
		var id, name, color, createdAt string
		rows.Scan(&id, &name, &color, &createdAt)
		tags = append(tags, map[string]interface{}{
			"id": id, "name": name, "color": color, "created_at": createdAt,
		})
	}
	JSON(w, 200, tags)
}

func CreateTag(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r)
	var body map[string]interface{}
	if err := ParseBody(r, &body); err != nil {
		Error(w, 400, "invalid request body")
		return
	}

	name := strVal(body, "name")
	if name == nil || name == "" {
		Error(w, 400, "name is required")
		return
	}

	id := NewUUID()
	now := Now()

	_, err := db.DB.Exec(`INSERT INTO tags (id, user_id, name, color, created_at) VALUES (?, ?, ?, ?, ?)`,
		id, userID, name, strValDefault(body, "color", "#4a90e2"), now)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}

	JSON(w, 201, map[string]interface{}{
		"id": id, "name": name, "color": strValDefault(body, "color", "#4a90e2"), "created_at": now,
	})
}

func UpdateTag(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body map[string]interface{}
	if err := ParseBody(r, &body); err != nil {
		Error(w, 400, "invalid request body")
		return
	}

	_, err := db.DB.Exec(`UPDATE tags SET name = ?, color = ? WHERE id = ?`,
		strVal(body, "name"), strVal(body, "color"), id)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}

	// Return updated tag
	row := db.DB.QueryRow(`SELECT id, name, color, created_at FROM tags WHERE id = ?`, id)
	var tagID, name, color, createdAt string
	if err := row.Scan(&tagID, &name, &color, &createdAt); err != nil {
		Error(w, 404, "tag not found")
		return
	}
	JSON(w, 200, map[string]interface{}{
		"id": tagID, "name": name, "color": color, "created_at": createdAt,
	})
}

func DeleteTag(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := db.DB.Exec("DELETE FROM tags WHERE id = ?", id)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}

func AddToolTag(w http.ResponseWriter, r *http.Request) {
	toolID := chi.URLParam(r, "id")
	tagID := chi.URLParam(r, "tagId")

	_, err := db.DB.Exec(`INSERT OR IGNORE INTO tool_tags (tool_id, tag_id) VALUES (?, ?)`, toolID, tagID)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}

func RemoveToolTag(w http.ResponseWriter, r *http.Request) {
	toolID := chi.URLParam(r, "id")
	tagID := chi.URLParam(r, "tagId")

	_, err := db.DB.Exec(`DELETE FROM tool_tags WHERE tool_id = ? AND tag_id = ?`, toolID, tagID)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}

func AddBatteryTag(w http.ResponseWriter, r *http.Request) {
	batteryID := chi.URLParam(r, "id")
	tagID := chi.URLParam(r, "tagId")

	_, err := db.DB.Exec(`INSERT OR IGNORE INTO battery_tags (battery_id, tag_id) VALUES (?, ?)`, batteryID, tagID)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}

func RemoveBatteryTag(w http.ResponseWriter, r *http.Request) {
	batteryID := chi.URLParam(r, "id")
	tagID := chi.URLParam(r, "tagId")

	_, err := db.DB.Exec(`DELETE FROM battery_tags WHERE battery_id = ? AND tag_id = ?`, batteryID, tagID)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}
