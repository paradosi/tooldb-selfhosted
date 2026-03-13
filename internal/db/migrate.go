package db

import "log"

func migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		username TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS tools (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		name TEXT NOT NULL,
		brand TEXT,
		model_number TEXT,
		serial_number TEXT,
		upc TEXT,
		tool_type TEXT,
		purchase_date TEXT,
		purchase_price REAL,
		retailer TEXT,
		warranty_expiry TEXT,
		condition TEXT DEFAULT 'New',
		location TEXT,
		notes TEXT,
		lent_to TEXT,
		lent_date TEXT,
		custom_field_1_label TEXT,
		custom_field_1_value TEXT,
		custom_field_2_label TEXT,
		custom_field_2_value TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS batteries (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		name TEXT NOT NULL,
		brand TEXT,
		platform TEXT,
		model_number TEXT,
		serial_number TEXT,
		voltage TEXT,
		capacity_ah TEXT,
		purchase_date TEXT,
		purchase_price REAL,
		retailer TEXT,
		warranty_expiry TEXT,
		condition TEXT DEFAULT 'New',
		location TEXT,
		notes TEXT,
		lent_to TEXT,
		lent_date TEXT,
		custom_field_1_label TEXT,
		custom_field_1_value TEXT,
		custom_field_2_label TEXT,
		custom_field_2_value TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS tool_photos (
		id TEXT PRIMARY KEY,
		tool_id TEXT NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
		user_id TEXT NOT NULL,
		url TEXT NOT NULL,
		is_primary INTEGER DEFAULT 0,
		rotation INTEGER DEFAULT 0,
		uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS tool_receipts (
		id TEXT PRIMARY KEY,
		tool_id TEXT NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
		user_id TEXT NOT NULL,
		url TEXT NOT NULL,
		file_type TEXT DEFAULT 'image/jpeg',
		label TEXT DEFAULT 'Purchase receipt',
		uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS battery_photos (
		id TEXT PRIMARY KEY,
		battery_id TEXT NOT NULL REFERENCES batteries(id) ON DELETE CASCADE,
		user_id TEXT NOT NULL,
		url TEXT NOT NULL,
		is_primary INTEGER DEFAULT 0,
		rotation INTEGER DEFAULT 0,
		uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS battery_receipts (
		id TEXT PRIMARY KEY,
		battery_id TEXT NOT NULL REFERENCES batteries(id) ON DELETE CASCADE,
		user_id TEXT NOT NULL,
		url TEXT NOT NULL,
		file_type TEXT DEFAULT 'image/jpeg',
		label TEXT DEFAULT 'Purchase receipt',
		uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS maintenance_logs (
		id TEXT PRIMARY KEY,
		tool_id TEXT NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
		user_id TEXT NOT NULL,
		date TEXT DEFAULT (date('now')),
		type TEXT DEFAULT 'Service',
		cost REAL,
		notes TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS tags (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		name TEXT NOT NULL,
		color TEXT DEFAULT '#4a90e2',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(user_id, name)
	);

	CREATE TABLE IF NOT EXISTS tool_tags (
		tool_id TEXT NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
		tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
		PRIMARY KEY (tool_id, tag_id)
	);

	CREATE TABLE IF NOT EXISTS battery_tags (
		battery_id TEXT NOT NULL REFERENCES batteries(id) ON DELETE CASCADE,
		tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
		PRIMARY KEY (battery_id, tag_id)
	);

	CREATE TABLE IF NOT EXISTS kits (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		name TEXT NOT NULL,
		description TEXT,
		type TEXT DEFAULT 'permanent',
		status TEXT DEFAULT 'active',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS kit_tools (
		id TEXT PRIMARY KEY,
		kit_id TEXT NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
		tool_id TEXT NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
		checked INTEGER DEFAULT 0
	);
	`

	_, err := DB.Exec(schema)
	if err != nil {
		log.Printf("Migration error: %v", err)
		return err
	}
	log.Println("Database migrated successfully")
	return nil
}
