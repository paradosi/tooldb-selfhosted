package api

import (
	"database/sql"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/paradosi/tooldb-selfhosted/internal/auth"
	"github.com/paradosi/tooldb-selfhosted/internal/db"
)

func ToolRoutes(r chi.Router) {
	r.Get("/tools", ListTools)
	r.Post("/tools", CreateTool)
	r.Get("/tools/{id}", GetTool)
	r.Put("/tools/{id}", UpdateTool)
	r.Delete("/tools/{id}", DeleteTool)
}

func ListTools(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r)
	search := r.URL.Query().Get("search")
	brand := r.URL.Query().Get("brand")
	location := r.URL.Query().Get("location")
	toolType := r.URL.Query().Get("tool_type")
	limit := QueryInt(r, "limit", 10000)
	offset := QueryInt(r, "offset", 0)

	query := `SELECT id, name, brand, model_number, serial_number, upc, tool_type,
		purchase_date, purchase_price, retailer, warranty_expiry, condition,
		location, notes, lent_to, lent_date,
		custom_field_1_label, custom_field_1_value,
		custom_field_2_label, custom_field_2_value,
		created_at, updated_at
		FROM tools WHERE user_id = ?`
	args := []interface{}{userID}

	if search != "" {
		query += ` AND (name LIKE ? OR brand LIKE ? OR model_number LIKE ? OR serial_number LIKE ? OR notes LIKE ?)`
		s := "%" + search + "%"
		args = append(args, s, s, s, s, s)
	}
	if brand != "" {
		query += ` AND brand = ?`
		args = append(args, brand)
	}
	if location != "" {
		query += ` AND location = ?`
		args = append(args, location)
	}
	if toolType != "" {
		query += ` AND tool_type = ?`
		args = append(args, toolType)
	}

	query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
	args = append(args, limit, offset)

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}

	// Scan all tools first, then close rows before making additional queries
	// (SQLite with MaxOpenConns=1 would deadlock otherwise)
	tools := []map[string]interface{}{}
	for rows.Next() {
		tool := scanTool(rows)
		if tool != nil {
			tools = append(tools, tool)
		}
	}
	rows.Close()

	// Now fetch related data for each tool
	for _, tool := range tools {
		id := tool["id"].(string)
		tool["user_tool_photos"] = getToolPhotos(id)
		tool["user_tool_tags"] = getToolTags(id)
	}

	JSON(w, 200, tools)
}

func CreateTool(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r)
	var body map[string]interface{}
	if err := ParseBody(r, &body); err != nil {
		Error(w, 400, "invalid request body")
		return
	}

	id := NewUUID()
	now := Now()

	_, err := db.DB.Exec(`INSERT INTO tools (id, user_id, name, brand, model_number, serial_number, upc, tool_type,
		purchase_date, purchase_price, retailer, warranty_expiry, condition, location, notes, lent_to, lent_date,
		custom_field_1_label, custom_field_1_value, custom_field_2_label, custom_field_2_value,
		created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		id, userID,
		strVal(body, "name"), strVal(body, "brand"), strVal(body, "model_number"),
		strVal(body, "serial_number"), strVal(body, "upc"), strVal(body, "tool_type"),
		strVal(body, "purchase_date"), numVal(body, "purchase_price"),
		strVal(body, "retailer"), strVal(body, "warranty_expiry"),
		strValDefault(body, "condition", "New"), strVal(body, "location"),
		strVal(body, "notes"), strVal(body, "lent_to"), strVal(body, "lent_date"),
		strVal(body, "custom_field_1_label"), strVal(body, "custom_field_1_value"),
		strVal(body, "custom_field_2_label"), strVal(body, "custom_field_2_value"),
		now, now)

	if err != nil {
		Error(w, 500, err.Error())
		return
	}

	// Return the created tool
	tool := getToolByID(id)
	JSON(w, 201, tool)
}

func GetTool(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	tool := getToolByID(id)
	if tool == nil {
		Error(w, 404, "tool not found")
		return
	}
	JSON(w, 200, tool)
}

func UpdateTool(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body map[string]interface{}
	if err := ParseBody(r, &body); err != nil {
		Error(w, 400, "invalid request body")
		return
	}

	now := Now()
	_, err := db.DB.Exec(`UPDATE tools SET
		name = ?, brand = ?, model_number = ?, serial_number = ?, upc = ?, tool_type = ?,
		purchase_date = ?, purchase_price = ?, retailer = ?, warranty_expiry = ?,
		condition = ?, location = ?, notes = ?, lent_to = ?, lent_date = ?,
		custom_field_1_label = ?, custom_field_1_value = ?,
		custom_field_2_label = ?, custom_field_2_value = ?,
		updated_at = ?
		WHERE id = ?`,
		strVal(body, "name"), strVal(body, "brand"), strVal(body, "model_number"),
		strVal(body, "serial_number"), strVal(body, "upc"), strVal(body, "tool_type"),
		strVal(body, "purchase_date"), numVal(body, "purchase_price"),
		strVal(body, "retailer"), strVal(body, "warranty_expiry"),
		strVal(body, "condition"), strVal(body, "location"),
		strVal(body, "notes"), strVal(body, "lent_to"), strVal(body, "lent_date"),
		strVal(body, "custom_field_1_label"), strVal(body, "custom_field_1_value"),
		strVal(body, "custom_field_2_label"), strVal(body, "custom_field_2_value"),
		now, id)

	if err != nil {
		Error(w, 500, err.Error())
		return
	}

	tool := getToolByID(id)
	JSON(w, 200, tool)
}

func DeleteTool(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := db.DB.Exec("DELETE FROM tools WHERE id = ?", id)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}

// --- Helper functions ---

func scanTool(rows *sql.Rows) map[string]interface{} {
	var id, name string
	var brand, modelNumber, serialNumber, upc, toolType sql.NullString
	var purchaseDate, retailer, warrantyExpiry, condition, location, notes sql.NullString
	var lentTo, lentDate sql.NullString
	var cf1Label, cf1Value, cf2Label, cf2Value sql.NullString
	var purchasePrice sql.NullFloat64
	var createdAt, updatedAt string

	err := rows.Scan(&id, &name, &brand, &modelNumber, &serialNumber, &upc, &toolType,
		&purchaseDate, &purchasePrice, &retailer, &warrantyExpiry, &condition,
		&location, &notes, &lentTo, &lentDate,
		&cf1Label, &cf1Value, &cf2Label, &cf2Value,
		&createdAt, &updatedAt)
	if err != nil {
		return nil
	}

	return map[string]interface{}{
		"id": id, "name": name,
		"brand": nullStr(brand), "model_number": nullStr(modelNumber),
		"serial_number": nullStr(serialNumber), "upc": nullStr(upc),
		"tool_type": nullStr(toolType), "purchase_date": nullStr(purchaseDate),
		"purchase_price": nullFloat(purchasePrice), "retailer": nullStr(retailer),
		"warranty_expiry": nullStr(warrantyExpiry), "condition": nullStr(condition),
		"location": nullStr(location), "notes": nullStr(notes),
		"lent_to": nullStr(lentTo), "lent_date": nullStr(lentDate),
		"custom_field_1_label": nullStr(cf1Label), "custom_field_1_value": nullStr(cf1Value),
		"custom_field_2_label": nullStr(cf2Label), "custom_field_2_value": nullStr(cf2Value),
		"created_at": createdAt, "updated_at": updatedAt,
	}
}

func getToolByID(id string) map[string]interface{} {
	rows, err := db.DB.Query(`SELECT id, name, brand, model_number, serial_number, upc, tool_type,
		purchase_date, purchase_price, retailer, warranty_expiry, condition,
		location, notes, lent_to, lent_date,
		custom_field_1_label, custom_field_1_value,
		custom_field_2_label, custom_field_2_value,
		created_at, updated_at
		FROM tools WHERE id = ?`, id)
	if err != nil {
		return nil
	}
	var tool map[string]interface{}
	if rows.Next() {
		tool = scanTool(rows)
	}
	rows.Close() // Close before making additional queries (SQLite MaxOpenConns=1)
	if tool == nil {
		return nil
	}

	// Add related data
	tool["user_tool_photos"] = getToolPhotos(id)
	tool["user_tool_receipts"] = getToolReceipts(id)
	tool["maintenance_logs"] = getMaintenanceLogs(id)
	tool["user_tool_tags"] = getToolTags(id)
	return tool
}

func getToolPhotos(toolID string) []map[string]interface{} {
	rows, err := db.DB.Query(`SELECT id, url, is_primary, rotation, uploaded_at FROM tool_photos WHERE tool_id = ? ORDER BY is_primary DESC, uploaded_at ASC`, toolID)
	if err != nil {
		return []map[string]interface{}{}
	}
	defer rows.Close()
	photos := []map[string]interface{}{}
	for rows.Next() {
		var id, url, uploadedAt string
		var isPrimary, rotation int
		rows.Scan(&id, &url, &isPrimary, &rotation, &uploadedAt)
		photos = append(photos, map[string]interface{}{
			"id": id, "url": url, "is_primary": isPrimary == 1, "rotation": rotation, "uploaded_at": uploadedAt,
		})
	}
	return photos
}

func getToolReceipts(toolID string) []map[string]interface{} {
	rows, err := db.DB.Query(`SELECT id, url, file_type, label, uploaded_at FROM tool_receipts WHERE tool_id = ? ORDER BY uploaded_at ASC`, toolID)
	if err != nil {
		return []map[string]interface{}{}
	}
	defer rows.Close()
	receipts := []map[string]interface{}{}
	for rows.Next() {
		var id, url, fileType, label, uploadedAt string
		rows.Scan(&id, &url, &fileType, &label, &uploadedAt)
		receipts = append(receipts, map[string]interface{}{
			"id": id, "url": url, "file_type": fileType, "label": label, "uploaded_at": uploadedAt,
		})
	}
	return receipts
}

func getMaintenanceLogs(toolID string) []map[string]interface{} {
	rows, err := db.DB.Query(`SELECT id, date, type, cost, notes, created_at FROM maintenance_logs WHERE tool_id = ? ORDER BY date DESC`, toolID)
	if err != nil {
		return []map[string]interface{}{}
	}
	defer rows.Close()
	logs := []map[string]interface{}{}
	for rows.Next() {
		var id, date, mtype, createdAt string
		var cost sql.NullFloat64
		var notes sql.NullString
		rows.Scan(&id, &date, &mtype, &cost, &notes, &createdAt)
		logs = append(logs, map[string]interface{}{
			"id": id, "date": date, "type": mtype,
			"cost": nullFloat(cost), "notes": nullStr(notes), "created_at": createdAt,
		})
	}
	return logs
}

func getToolTags(toolID string) []map[string]interface{} {
	rows, err := db.DB.Query(`SELECT tt.tag_id, t.id, t.name, t.color FROM tool_tags tt JOIN tags t ON t.id = tt.tag_id WHERE tt.tool_id = ?`, toolID)
	if err != nil {
		return []map[string]interface{}{}
	}
	defer rows.Close()
	tags := []map[string]interface{}{}
	for rows.Next() {
		var tagID, id, name, color string
		rows.Scan(&tagID, &id, &name, &color)
		tags = append(tags, map[string]interface{}{
			"tag_id": tagID,
			"user_tags": map[string]interface{}{
				"id": id, "name": name, "color": color,
			},
		})
	}
	return tags
}

// Value extraction helpers

func strVal(m map[string]interface{}, key string) interface{} {
	v, ok := m[key]
	if !ok || v == nil {
		return nil
	}
	return v
}

func strValDefault(m map[string]interface{}, key, def string) interface{} {
	v, ok := m[key]
	if !ok || v == nil {
		return def
	}
	return v
}

func numVal(m map[string]interface{}, key string) interface{} {
	v, ok := m[key]
	if !ok || v == nil {
		return nil
	}
	return v
}

func nullStr(s sql.NullString) interface{} {
	if s.Valid {
		return s.String
	}
	return nil
}

func nullFloat(f sql.NullFloat64) interface{} {
	if f.Valid {
		return f.Float64
	}
	return nil
}
