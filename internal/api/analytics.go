package api

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/paradosi/tooldb-selfhosted/internal/auth"
	"github.com/paradosi/tooldb-selfhosted/internal/db"
)

func AnalyticsRoutes(r chi.Router) {
	r.Get("/analytics", GetAnalytics)
}

func GetAnalytics(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r)
	today := time.Now().UTC().Format("2006-01-02")
	soon := time.Now().UTC().AddDate(0, 0, 30).Format("2006-01-02")

	result := map[string]interface{}{}

	// Tool count
	var toolCount int
	err := db.DB.QueryRow(`SELECT COUNT(*) FROM tools WHERE user_id = ?`, userID).Scan(&toolCount)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}
	result["tool_count"] = toolCount

	// Battery count
	var batteryCount int
	err = db.DB.QueryRow(`SELECT COUNT(*) FROM batteries WHERE user_id = ?`, userID).Scan(&batteryCount)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}
	result["battery_count"] = batteryCount

	// Total value (tools + batteries)
	var totalValue float64
	err = db.DB.QueryRow(`SELECT COALESCE(SUM(purchase_price), 0) FROM tools WHERE user_id = ?`, userID).Scan(&totalValue)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}
	var batteryValue float64
	err = db.DB.QueryRow(`SELECT COALESCE(SUM(purchase_price), 0) FROM batteries WHERE user_id = ?`, userID).Scan(&batteryValue)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}
	result["total_value"] = totalValue + batteryValue

	// Tools by brand
	result["tools_by_brand"], err = queryGroupCount(`SELECT brand, COUNT(*) FROM tools WHERE user_id = ? AND brand IS NOT NULL AND brand != '' GROUP BY brand ORDER BY COUNT(*) DESC`, userID, "brand")
	if err != nil {
		Error(w, 500, err.Error())
		return
	}

	// Tools by type
	result["tools_by_type"], err = queryGroupCount(`SELECT tool_type, COUNT(*) FROM tools WHERE user_id = ? AND tool_type IS NOT NULL AND tool_type != '' GROUP BY tool_type ORDER BY COUNT(*) DESC`, userID, "tool_type")
	if err != nil {
		Error(w, 500, err.Error())
		return
	}

	// Tools by location
	result["tools_by_location"], err = queryGroupCount(`SELECT location, COUNT(*) FROM tools WHERE user_id = ? AND location IS NOT NULL AND location != '' GROUP BY location ORDER BY COUNT(*) DESC`, userID, "location")
	if err != nil {
		Error(w, 500, err.Error())
		return
	}

	// Tools by condition
	result["tools_by_condition"], err = queryGroupCount(`SELECT condition, COUNT(*) FROM tools WHERE user_id = ? AND condition IS NOT NULL AND condition != '' GROUP BY condition ORDER BY COUNT(*) DESC`, userID, "condition")
	if err != nil {
		Error(w, 500, err.Error())
		return
	}

	// Batteries by brand
	result["batteries_by_brand"], err = queryGroupCount(`SELECT brand, COUNT(*) FROM batteries WHERE user_id = ? AND brand IS NOT NULL AND brand != '' GROUP BY brand ORDER BY COUNT(*) DESC`, userID, "brand")
	if err != nil {
		Error(w, 500, err.Error())
		return
	}

	// Batteries by platform
	result["batteries_by_platform"], err = queryGroupCount(`SELECT platform, COUNT(*) FROM batteries WHERE user_id = ? AND platform IS NOT NULL AND platform != '' GROUP BY platform ORDER BY COUNT(*) DESC`, userID, "platform")
	if err != nil {
		Error(w, 500, err.Error())
		return
	}

	// Warranty stats
	var warrantyActive int
	err = db.DB.QueryRow(`SELECT COUNT(*) FROM tools WHERE user_id = ? AND warranty_expiry IS NOT NULL AND warranty_expiry > ?`, userID, today).Scan(&warrantyActive)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}
	result["warranty_active"] = warrantyActive

	var warrantyExpiringSoon int
	err = db.DB.QueryRow(`SELECT COUNT(*) FROM tools WHERE user_id = ? AND warranty_expiry IS NOT NULL AND warranty_expiry > ? AND warranty_expiry <= ?`, userID, today, soon).Scan(&warrantyExpiringSoon)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}
	result["warranty_expiring_soon"] = warrantyExpiringSoon

	var warrantyExpired int
	err = db.DB.QueryRow(`SELECT COUNT(*) FROM tools WHERE user_id = ? AND warranty_expiry IS NOT NULL AND warranty_expiry <= ?`, userID, today).Scan(&warrantyExpired)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}
	result["warranty_expired"] = warrantyExpired

	// Tools lent out
	var toolsLentOut int
	err = db.DB.QueryRow(`SELECT COUNT(*) FROM tools WHERE user_id = ? AND lent_to IS NOT NULL AND lent_to != ''`, userID).Scan(&toolsLentOut)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}
	result["tools_lent_out"] = toolsLentOut

	// Spending by month
	result["spending_by_month"], err = querySpendingByMonth(userID)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}

	// Recent tools (last 10)
	result["recent_tools"], err = queryRecentTools(userID)
	if err != nil {
		Error(w, 500, err.Error())
		return
	}

	JSON(w, 200, result)
}

// queryGroupCount runs a GROUP BY query and returns []map with the given label key and "count".
func queryGroupCount(query string, userID string, labelKey string) ([]map[string]interface{}, error) {
	rows, err := db.DB.Query(query, userID)
	if err != nil {
		return []map[string]interface{}{}, err
	}
	defer rows.Close()

	results := []map[string]interface{}{}
	for rows.Next() {
		var label string
		var count int
		if err := rows.Scan(&label, &count); err != nil {
			continue
		}
		results = append(results, map[string]interface{}{
			labelKey: label,
			"count":  count,
		})
	}
	return results, nil
}

func querySpendingByMonth(userID string) ([]map[string]interface{}, error) {
	rows, err := db.DB.Query(`SELECT substr(purchase_date, 1, 7) AS month, SUM(purchase_price) AS amount
		FROM tools WHERE user_id = ? AND purchase_date IS NOT NULL AND purchase_date != '' AND purchase_price IS NOT NULL
		GROUP BY substr(purchase_date, 1, 7) ORDER BY month`, userID)
	if err != nil {
		return []map[string]interface{}{}, err
	}
	defer rows.Close()

	results := []map[string]interface{}{}
	for rows.Next() {
		var month string
		var amount float64
		if err := rows.Scan(&month, &amount); err != nil {
			continue
		}
		results = append(results, map[string]interface{}{
			"month":  month,
			"amount": amount,
		})
	}
	return results, nil
}

func queryRecentTools(userID string) ([]map[string]interface{}, error) {
	rows, err := db.DB.Query(`SELECT id, name, brand, created_at FROM tools WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`, userID)
	if err != nil {
		return []map[string]interface{}{}, err
	}
	defer rows.Close()

	results := []map[string]interface{}{}
	for rows.Next() {
		var id, name, createdAt string
		var brand sql.NullString
		if err := rows.Scan(&id, &name, &brand, &createdAt); err != nil {
			continue
		}
		results = append(results, map[string]interface{}{
			"id":         id,
			"name":       name,
			"brand":      nullStr(brand),
			"created_at": createdAt,
		})
	}
	return results, nil
}
