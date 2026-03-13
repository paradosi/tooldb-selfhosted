package api

import (
	"database/sql"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/paradosi/tooldb-selfhosted/internal/auth"
	"github.com/paradosi/tooldb-selfhosted/internal/db"
)

func BatteryRoutes(r chi.Router) {
	r.Get("/batteries", ListBatteries)
	r.Post("/batteries", CreateBattery)
	r.Get("/batteries/{id}", GetBattery)
	r.Put("/batteries/{id}", UpdateBattery)
	r.Delete("/batteries/{id}", DeleteBattery)
}

func ListBatteries(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r)
	search := r.URL.Query().Get("search")
	brand := r.URL.Query().Get("brand")
	location := r.URL.Query().Get("location")
	platform := r.URL.Query().Get("platform")
	limit := QueryInt(r, "limit", 10000)
	offset := QueryInt(r, "offset", 0)

	query := `SELECT id, name, brand, platform, model_number, serial_number, voltage, capacity_ah,
		purchase_date, purchase_price, retailer, warranty_expiry, condition,
		location, notes, lent_to, lent_date,
		custom_field_1_label, custom_field_1_value,
		custom_field_2_label, custom_field_2_value,
		created_at, updated_at
		FROM batteries WHERE user_id = ?`
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
	if platform != "" {
		query += ` AND platform = ?`
		args = append(args, platform)
	}

	query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
	args = append(args, limit, offset)

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}

	// Scan all batteries first, then close rows before making additional queries
	// (SQLite with MaxOpenConns=1 would deadlock otherwise)
	batteries := []map[string]interface{}{}
	for rows.Next() {
		battery := scanBattery(rows)
		if battery != nil {
			batteries = append(batteries, battery)
		}
	}
	rows.Close()

	// Now fetch related data for each battery
	for _, battery := range batteries {
		id := battery["id"].(string)
		battery["user_battery_photos"] = getBatteryPhotos(id)
		battery["user_battery_tags"] = getBatteryTags(id)
	}

	JSON(w, 200, batteries)
}

func CreateBattery(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r)
	var body map[string]interface{}
	if err := ParseBody(r, &body); err != nil {
		Error(w, 400, "invalid request body")
		return
	}

	id := NewUUID()
	now := Now()

	_, err := db.DB.Exec(`INSERT INTO batteries (id, user_id, name, brand, platform, model_number, serial_number, voltage, capacity_ah,
		purchase_date, purchase_price, retailer, warranty_expiry, condition, location, notes, lent_to, lent_date,
		custom_field_1_label, custom_field_1_value, custom_field_2_label, custom_field_2_value,
		created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		id, userID,
		strVal(body, "name"), strVal(body, "brand"), strVal(body, "platform"),
		strVal(body, "model_number"), strVal(body, "serial_number"),
		strVal(body, "voltage"), strVal(body, "capacity_ah"),
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

	// Return the created battery
	battery := getBatteryByID(id)
	JSON(w, 201, battery)
}

func GetBattery(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	battery := getBatteryByID(id)
	if battery == nil {
		Error(w, 404, "battery not found")
		return
	}
	JSON(w, 200, battery)
}

func UpdateBattery(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body map[string]interface{}
	if err := ParseBody(r, &body); err != nil {
		Error(w, 400, "invalid request body")
		return
	}

	now := Now()
	_, err := db.DB.Exec(`UPDATE batteries SET
		name = ?, brand = ?, platform = ?, model_number = ?, serial_number = ?, voltage = ?, capacity_ah = ?,
		purchase_date = ?, purchase_price = ?, retailer = ?, warranty_expiry = ?,
		condition = ?, location = ?, notes = ?, lent_to = ?, lent_date = ?,
		custom_field_1_label = ?, custom_field_1_value = ?,
		custom_field_2_label = ?, custom_field_2_value = ?,
		updated_at = ?
		WHERE id = ?`,
		strVal(body, "name"), strVal(body, "brand"), strVal(body, "platform"),
		strVal(body, "model_number"), strVal(body, "serial_number"),
		strVal(body, "voltage"), strVal(body, "capacity_ah"),
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

	battery := getBatteryByID(id)
	JSON(w, 200, battery)
}

func DeleteBattery(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := db.DB.Exec("DELETE FROM batteries WHERE id = ?", id)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}

// --- Helper functions ---

func scanBattery(rows *sql.Rows) map[string]interface{} {
	var id, name string
	var brand, platform, modelNumber, serialNumber, voltage, capacityAh sql.NullString
	var purchaseDate, retailer, warrantyExpiry, condition, location, notes sql.NullString
	var lentTo, lentDate sql.NullString
	var cf1Label, cf1Value, cf2Label, cf2Value sql.NullString
	var purchasePrice sql.NullFloat64
	var createdAt, updatedAt string

	err := rows.Scan(&id, &name, &brand, &platform, &modelNumber, &serialNumber, &voltage, &capacityAh,
		&purchaseDate, &purchasePrice, &retailer, &warrantyExpiry, &condition,
		&location, &notes, &lentTo, &lentDate,
		&cf1Label, &cf1Value, &cf2Label, &cf2Value,
		&createdAt, &updatedAt)
	if err != nil {
		return nil
	}

	return map[string]interface{}{
		"id": id, "name": name,
		"brand": nullStr(brand), "platform": nullStr(platform),
		"model_number": nullStr(modelNumber), "serial_number": nullStr(serialNumber),
		"voltage": nullStr(voltage), "capacity_ah": nullStr(capacityAh),
		"purchase_date": nullStr(purchaseDate),
		"purchase_price": nullFloat(purchasePrice), "retailer": nullStr(retailer),
		"warranty_expiry": nullStr(warrantyExpiry), "condition": nullStr(condition),
		"location": nullStr(location), "notes": nullStr(notes),
		"lent_to": nullStr(lentTo), "lent_date": nullStr(lentDate),
		"custom_field_1_label": nullStr(cf1Label), "custom_field_1_value": nullStr(cf1Value),
		"custom_field_2_label": nullStr(cf2Label), "custom_field_2_value": nullStr(cf2Value),
		"created_at": createdAt, "updated_at": updatedAt,
	}
}

func getBatteryByID(id string) map[string]interface{} {
	rows, err := db.DB.Query(`SELECT id, name, brand, platform, model_number, serial_number, voltage, capacity_ah,
		purchase_date, purchase_price, retailer, warranty_expiry, condition,
		location, notes, lent_to, lent_date,
		custom_field_1_label, custom_field_1_value,
		custom_field_2_label, custom_field_2_value,
		created_at, updated_at
		FROM batteries WHERE id = ?`, id)
	if err != nil {
		return nil
	}
	var battery map[string]interface{}
	if rows.Next() {
		battery = scanBattery(rows)
	}
	rows.Close() // Close before making additional queries (SQLite MaxOpenConns=1)
	if battery == nil {
		return nil
	}

	// Add related data
	battery["user_battery_photos"] = getBatteryPhotos(id)
	battery["user_battery_receipts"] = getBatteryReceipts(id)
	battery["user_battery_tags"] = getBatteryTags(id)
	return battery
}

func getBatteryPhotos(batteryID string) []map[string]interface{} {
	rows, err := db.DB.Query(`SELECT id, url, is_primary, rotation, uploaded_at FROM battery_photos WHERE battery_id = ? ORDER BY is_primary DESC, uploaded_at ASC`, batteryID)
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

func getBatteryReceipts(batteryID string) []map[string]interface{} {
	rows, err := db.DB.Query(`SELECT id, url, file_type, label, uploaded_at FROM battery_receipts WHERE battery_id = ? ORDER BY uploaded_at ASC`, batteryID)
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

func getBatteryTags(batteryID string) []map[string]interface{} {
	rows, err := db.DB.Query(`SELECT bt.tag_id, t.id, t.name, t.color FROM battery_tags bt JOIN tags t ON t.id = bt.tag_id WHERE bt.battery_id = ?`, batteryID)
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
