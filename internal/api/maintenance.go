package api

import (
	"database/sql"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/paradosi/tooldb-selfhosted/internal/auth"
	"github.com/paradosi/tooldb-selfhosted/internal/db"
)

func MaintenanceRoutes(r chi.Router) {
	r.Post("/tools/{id}/maintenance", CreateMaintenanceLog)
	r.Delete("/maintenance/{id}", DeleteMaintenanceLog)
}

func CreateMaintenanceLog(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r)
	toolID := chi.URLParam(r, "id")

	var body map[string]interface{}
	if err := ParseBody(r, &body); err != nil {
		Error(w, 400, "invalid request body")
		return
	}

	id := NewUUID()
	now := Now()

	date := strVal(body, "date")
	if date == nil {
		date = now[:10] // default to today YYYY-MM-DD
	}

	_, err := db.DB.Exec(`INSERT INTO maintenance_logs (id, tool_id, user_id, date, type, cost, notes, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		id, toolID, userID, date,
		strValDefault(body, "type", "Service"),
		numVal(body, "cost"), strVal(body, "notes"), now)

	if err != nil {
		Error(w, 500, err.Error())
		return
	}

	// Return the created log
	log := getMaintenanceLogByID(id)
	JSON(w, 201, log)
}

func DeleteMaintenanceLog(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := db.DB.Exec("DELETE FROM maintenance_logs WHERE id = ?", id)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}

func getMaintenanceLogByID(id string) map[string]interface{} {
	rows, err := db.DB.Query(`SELECT id, tool_id, user_id, date, type, cost, notes, created_at FROM maintenance_logs WHERE id = ?`, id)
	if err != nil {
		return nil
	}
	defer rows.Close()
	if rows.Next() {
		var logID, toolID, userID, date, mtype, createdAt string
		var cost sql.NullFloat64
		var notes sql.NullString
		rows.Scan(&logID, &toolID, &userID, &date, &mtype, &cost, &notes, &createdAt)
		return map[string]interface{}{
			"id": logID, "tool_id": toolID, "user_id": userID,
			"date": date, "type": mtype,
			"cost": nullFloat(cost), "notes": nullStr(notes),
			"created_at": createdAt,
		}
	}
	return nil
}
