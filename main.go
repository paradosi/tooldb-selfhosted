package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

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

	// Uploaded media is protected too. The SPA renders these with <img>/<a> tags
	// that cannot send an Authorization header, so they authenticate via the
	// auth cookie set at login.
	dataDir := api.DataDir()
	r.Group(func(r chi.Router) {
		r.Use(auth.Middleware)
		r.Handle("/photos/*", http.StripPrefix("/photos/", mediaHandler(filepath.Join(dataDir, "photos"))))
		r.Handle("/receipts/*", http.StripPrefix("/receipts/", mediaHandler(filepath.Join(dataDir, "receipts"))))
	})

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
		setAuthCookie(w, r, token)
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

	setAuthCookie(w, r, token)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token": token,
		"user":  map[string]string{"id": body.Username, "username": body.Username},
	})
}

// setAuthCookie stores the JWT in a cookie so media <img>/<a> requests, which
// cannot set an Authorization header, are authenticated. MaxAge matches the
// 7-day token expiry; Secure is only set when the request is already TLS.
func setAuthCookie(w http.ResponseWriter, r *http.Request, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     auth.CookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
		Secure:   r.TLS != nil,
	})
}

// mediaHandler serves uploaded files with hardened headers: sniffing is always
// disabled so a stored file can't be reinterpreted as HTML/SVG, and non-image
// types (pdf) are forced to download rather than render inline.
func mediaHandler(dir string) http.Handler {
	fs := http.FileServer(http.Dir(dir))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		switch strings.ToLower(filepath.Ext(r.URL.Path)) {
		case ".jpg", ".jpeg", ".png", ".gif", ".webp":
			// images stay inline
		default:
			w.Header().Set("Content-Disposition", "attachment")
		}
		fs.ServeHTTP(w, r)
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
