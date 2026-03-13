package db

import (
	"database/sql"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func initPostgres(url string) error {
	var err error
	DB, err = sql.Open("pgx", url)
	if err != nil {
		return err
	}
	DB.SetMaxOpenConns(20)
	return migrate()
}
