package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type contextKey string

const UserIDKey contextKey = "user_id"

var (
	jwtSecret []byte
	Enabled   bool
	username  string
	passHash  []byte
)

func Init() {
	Enabled = os.Getenv("AUTH_ENABLED") == "true"
	if !Enabled {
		return
	}

	username = os.Getenv("AUTH_USERNAME")
	password := os.Getenv("AUTH_PASSWORD")
	if username == "" || password == "" {
		panic("AUTH_ENABLED=true requires AUTH_USERNAME and AUTH_PASSWORD")
	}
	passHash, _ = bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		b := make([]byte, 32)
		rand.Read(b)
		secret = hex.EncodeToString(b)
	}
	jwtSecret = []byte(secret)
}

func CheckCredentials(user, pass string) bool {
	if user != username {
		return false
	}
	return bcrypt.CompareHashAndPassword(passHash, []byte(pass)) == nil
}

func GenerateToken(userID string) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(7 * 24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !Enabled {
			ctx := context.WithValue(r.Context(), UserIDKey, "default")
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		header := r.Header.Get("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		tokenStr := strings.TrimPrefix(header, "Bearer ")
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		claims := token.Claims.(jwt.MapClaims)
		userID := claims["sub"].(string)
		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetUserID(r *http.Request) string {
	return r.Context().Value(UserIDKey).(string)
}
