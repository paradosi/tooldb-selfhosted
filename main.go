package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/paradosi/tooldb-selfhosted/internal/api"
	"github.com/paradosi/tooldb-selfhosted/internal/auth"
	"github.com/paradosi/tooldb-selfhosted/internal/db"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	if err := db.Init(); err != nil {
		log.Fatalf("Database init failed: %v", err)
	}
	defer db.Close()

	auth.Init()

	if err := api.InitUploadDirs(); err != nil {
		log.Fatalf("Failed to create upload directories: %v", err)
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Static file serving for uploads
	dataDir := api.DataDir()
	r.Handle("/photos/*", http.StripPrefix("/photos/", http.FileServer(http.Dir(filepath.Join(dataDir, "photos")))))
	r.Handle("/receipts/*", http.StripPrefix("/receipts/", http.FileServer(http.Dir(filepath.Join(dataDir, "receipts")))))

	// Public endpoints
	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"ok"}`)
	})

	// Auth endpoints
	r.Post("/api/auth/login", handleLogin)
	r.Post("/api/auth/logout", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"ok":true}`)
	})

	// Protected API routes
	r.Route("/api", func(r chi.Router) {
		r.Use(auth.Middleware)
		r.Get("/auth/me", handleMe)
		api.ToolRoutes(r)
		api.BatteryRoutes(r)
		api.UploadRoutes(r)
		api.MaintenanceRoutes(r)
		api.TagRoutes(r)
		api.KitRoutes(r)
		api.AnalyticsRoutes(r)
	})

	// Serve React SPA from frontend/dist/
	distDir := "frontend/dist"
	fileServer := http.FileServer(http.Dir(distDir))

	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		// Check if the requested file exists in dist/
		path := filepath.Join(distDir, r.URL.Path)
		if info, err := os.Stat(path); err == nil && !info.IsDir() {
			fileServer.ServeHTTP(w, r)
			return
		}
		// SPA fallback: serve index.html for all other routes
		http.ServeFile(w, r, filepath.Join(distDir, "index.html"))
	})

	log.Printf("ToolDB listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if !auth.Enabled {
		// Auth disabled — return default token
		token, _ := auth.GenerateToken("default")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"token": token,
			"user":  map[string]string{"id": "default", "username": "admin"},
		})
		return
	}

	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}

	if !auth.CheckCredentials(body.Username, body.Password) {
		http.Error(w, `{"error":"invalid credentials"}`, http.StatusUnauthorized)
		return
	}

	token, err := auth.GenerateToken(body.Username)
	if err != nil {
		http.Error(w, `{"error":"token generation failed"}`, http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"token": token,
		"user":  map[string]string{"id": body.Username, "username": body.Username},
	})
}

func handleMe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := auth.GetUserID(r)
	json.NewEncoder(w).Encode(map[string]string{
		"id":       userID,
		"username": userID,
	})
}
