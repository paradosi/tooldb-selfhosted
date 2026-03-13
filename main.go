package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/paradosi/tooldb-selfhosted/internal/db"
)

func main() {
	if err := db.Init(); err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"ok"}`)
	})

	log.Printf("ToolDB listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
