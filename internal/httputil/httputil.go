package httputil

import (
	"encoding/json"
	"net/http"
	"strings"
)

var allowedOrigins = map[string]bool{
	"https://www.setlistify.app": true,
	"https://setlistify.app":     true,
	"http://localhost:3000":      true,
	"http://127.0.0.1:3000":      true,
}

// SetCORS configures CORS headers. If the request is an OPTIONS preflight,
// it writes the response headers, returns 204 No Content, and returns true.
func SetCORS(w http.ResponseWriter, r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin != "" && (allowedOrigins[origin] || strings.HasSuffix(origin, ".vercel.app")) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Credentials", "true")
	} else if origin == "" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
	}

	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return true
	}
	return false
}

// DecodeJSON decodes the JSON request body into dst.
func DecodeJSON(r *http.Request, dst any) error {
	return json.NewDecoder(r.Body).Decode(dst)
}

// WriteJSON serializes payload as JSON and writes it with the given status code.
func WriteJSON(w http.ResponseWriter, status int, payload any) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(payload)
}

type ErrorResponse struct {
	Error string `json:"error"`
	Type  string `json:"type"`
}

// WriteError writes a structured JSON error response matching the Flask error format.
func WriteError(w http.ResponseWriter, status int, err error, errType string) {
	if errType == "" {
		errType = "ServerError"
	}
	msg := ""
	if err != nil {
		msg = err.Error()
	}
	_ = WriteJSON(w, status, ErrorResponse{
		Error: msg,
		Type:  errType,
	})
}
