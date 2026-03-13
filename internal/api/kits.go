package api

import (
	"database/sql"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/paradosi/tooldb-selfhosted/internal/auth"
	"github.com/paradosi/tooldb-selfhosted/internal/db"
)

func KitRoutes(r chi.Router) {
	r.Get("/kits", ListKits)
	r.Post("/kits", CreateKit)
	r.Get("/kits/{id}", GetKit)
	r.Put("/kits/{id}", UpdateKit)
	r.Delete("/kits/{id}", DeleteKit)
	r.Post("/kits/{id}/tools", AddKitTool)
	r.Put("/kits/{id}/tools/{kitToolId}", UpdateKitTool)
	r.Delete("/kits/{id}/tools/{kitToolId}", RemoveKitTool)
}

func ListKits(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r)
	rows, err := db.DB.Query(`SELECT k.id, k.name, k.description, k.type, k.status, k.created_at, k.updated_at,
		(SELECT COUNT(*) FROM kit_tools WHERE kit_id = k.id) AS tool_count
		FROM kits k WHERE k.user_id = ? ORDER BY k.created_at DESC`, userID)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}
	defer rows.Close()

	kits := []map[string]interface{}{}
	for rows.Next() {
		var id, name, createdAt, updatedAt string
		var description, kitType, status sql.NullString
		var toolCount int
		rows.Scan(&id, &name, &description, &kitType, &status, &createdAt, &updatedAt, &toolCount)
		kits = append(kits, map[string]interface{}{
			"id": id, "name": name, "description": nullStr(description),
			"type": nullStr(kitType), "status": nullStr(status),
			"created_at": createdAt, "updated_at": updatedAt,
			"tool_count": toolCount,
		})
	}
	JSON(w, 200, kits)
}

func CreateKit(w http.ResponseWriter, r *http.Request) {
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

	_, err := db.DB.Exec(`INSERT INTO kits (id, user_id, name, description, type, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		id, userID, name, strVal(body, "description"),
		strValDefault(body, "type", "permanent"),
		strValDefault(body, "status", "active"),
		now, now)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}

	kit := getKitByID(id)
	JSON(w, 201, kit)
}

func GetKit(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	kit := getKitByID(id)
	if kit == nil {
		Error(w, 404, "kit not found")
		return
	}
	JSON(w, 200, kit)
}

func UpdateKit(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body map[string]interface{}
	if err := ParseBody(r, &body); err != nil {
		Error(w, 400, "invalid request body")
		return
	}

	now := Now()
	_, err := db.DB.Exec(`UPDATE kits SET name = ?, description = ?, type = ?, status = ?, updated_at = ? WHERE id = ?`,
		strVal(body, "name"), strVal(body, "description"),
		strVal(body, "type"), strVal(body, "status"),
		now, id)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}

	kit := getKitByID(id)
	JSON(w, 200, kit)
}

func DeleteKit(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := db.DB.Exec("DELETE FROM kits WHERE id = ?", id)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}

func AddKitTool(w http.ResponseWriter, r *http.Request) {
	kitID := chi.URLParam(r, "id")
	var body map[string]interface{}
	if err := ParseBody(r, &body); err != nil {
		Error(w, 400, "invalid request body")
		return
	}

	toolID := strVal(body, "tool_id")
	if toolID == nil || toolID == "" {
		Error(w, 400, "tool_id is required")
		return
	}

	id := NewUUID()
	_, err := db.DB.Exec(`INSERT INTO kit_tools (id, kit_id, tool_id, checked) VALUES (?, ?, ?, 0)`,
		id, kitID, toolID)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}

	JSON(w, 201, map[string]interface{}{
		"id": id, "kit_id": kitID, "tool_id": toolID, "checked": false,
	})
}

func UpdateKitTool(w http.ResponseWriter, r *http.Request) {
	kitToolID := chi.URLParam(r, "kitToolId")
	var body map[string]interface{}
	if err := ParseBody(r, &body); err != nil {
		Error(w, 400, "invalid request body")
		return
	}

	checked := 0
	if v, ok := body["checked"]; ok && v == true {
		checked = 1
	}

	_, err := db.DB.Exec(`UPDATE kit_tools SET checked = ? WHERE id = ?`, checked, kitToolID)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}

	JSON(w, 200, map[string]interface{}{
		"id": kitToolID, "checked": checked == 1,
	})
}

func RemoveKitTool(w http.ResponseWriter, r *http.Request) {
	kitToolID := chi.URLParam(r, "kitToolId")
	_, err := db.DB.Exec("DELETE FROM kit_tools WHERE id = ?", kitToolID)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}

// --- Helper functions ---

func getKitByID(id string) map[string]interface{} {
	row := db.DB.QueryRow(`SELECT id, user_id, name, description, type, status, created_at, updated_at FROM kits WHERE id = ?`, id)
	var kitID, userID, name, createdAt, updatedAt string
	var description, kitType, status sql.NullString
	if err := row.Scan(&kitID, &userID, &name, &description, &kitType, &status, &createdAt, &updatedAt); err != nil {
		return nil
	}

	kit := map[string]interface{}{
		"id": kitID, "user_id": userID, "name": name,
		"description": nullStr(description),
		"type":        nullStr(kitType),
		"status":      nullStr(status),
		"created_at":  createdAt, "updated_at": updatedAt,
	}

	// Fetch kit tools with tool details
	kit["kit_tools"] = getKitTools(kitID)
	return kit
}

func getKitTools(kitID string) []map[string]interface{} {
	rows, err := db.DB.Query(`SELECT kt.id, kt.tool_id, kt.checked, t.id, t.name, t.brand
		FROM kit_tools kt JOIN tools t ON t.id = kt.tool_id
		WHERE kt.kit_id = ? ORDER BY t.name ASC`, kitID)
	if err != nil {
		return []map[string]interface{}{}
	}
	defer rows.Close()

	kitTools := []map[string]interface{}{}
	for rows.Next() {
		var ktID, toolID, tID, tName string
		var checked int
		var tBrand sql.NullString
		rows.Scan(&ktID, &toolID, &checked, &tID, &tName, &tBrand)
		kitTools = append(kitTools, map[string]interface{}{
			"id":      ktID,
			"tool_id": toolID,
			"checked": checked == 1,
			"tools": map[string]interface{}{
				"id":    tID,
				"name":  tName,
				"brand": nullStr(tBrand),
			},
		})
	}
	return kitTools
}
