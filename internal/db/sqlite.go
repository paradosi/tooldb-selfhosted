package db

import (
	"database/sql"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

func initSQLite() error {
	engine = "sqlite"
	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "./data"
	}
	os.MkdirAll(dataDir, 0755)

	dbPath := filepath.Join(dataDir, "tooldb.db")
	var err error
	// modernc.org/sqlite does NOT understand mattn-style `_journal_mode=` /
	// `_foreign_keys=` DSN parameters; it only honours `_pragma=<name>(<value>)`.
	// With the old syntax none of these were applied: foreign keys stayed OFF,
	// so deleting a tool left its receipts and photos behind as orphaned rows.
	dsn := dbPath + "?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)"
	DB, err = sql.Open("sqlite", dsn)
	if err != nil {
		return err
	}
	DB.SetMaxOpenConns(1)
	return migrate()
}
