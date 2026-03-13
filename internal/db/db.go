package db

import (
	"database/sql"
	"fmt"
	"os"
)

var DB *sql.DB

func Init() error {
	dbURL := os.Getenv("DATABASE_URL")
	dbType := os.Getenv("DATABASE_TYPE")

	if dbURL != "" {
		return initPostgres(dbURL)
	}

	if dbType == "postgres" {
		return fmt.Errorf("DATABASE_URL required when DATABASE_TYPE=postgres")
	}

	return initSQLite()
}

func Close() {
	if DB != nil {
		DB.Close()
	}
}
