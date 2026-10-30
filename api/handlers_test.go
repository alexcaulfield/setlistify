package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestAuthUrlHandler(t *testing.T) {
	os.Setenv("SPOTIFY_CLIENT_ID", "dummy_client_id")
	os.Setenv("SPOTIFY_CLIENT_SECRET", "dummy_client_secret")
	os.Setenv("APP_SECRET_KEY", "dummy_app_secret_key_long_enough_123")
	os.Setenv("REDIRECT_URI", "http://localhost:3000/callback")
	os.Setenv("SETLIST_FM_API_KEY", "dummy_setlist_key")

	req := httptest.NewRequest(http.MethodGet, "/api/authUrl", nil)
	rec := httptest.NewRecorder()

	AuthUrl(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body: %s", rec.Code, rec.Body.String())
	}

	var res map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to parse JSON response: %v", err)
	}

	if res["authUrl"] == "" {
		t.Errorf("expected non-empty authUrl")
	}
}

func TestGetUserValidation(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/getUser", nil)
	rec := httptest.NewRecorder()

	GetUser(rec, req)

	// GET not allowed
	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405 Method Not Allowed, got %d", rec.Code)
	}
}

func TestArtistSetlistsMethodNotAllowed(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/artistSetlists", nil)
	rec := httptest.NewRecorder()

	ArtistSetlists(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405 Method Not Allowed, got %d", rec.Code)
	}
}

func TestArtistSetlistsInvalidJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/artistSetlists", strings.NewReader("invalid-json"))
	rec := httptest.NewRecorder()

	ArtistSetlists(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 Bad Request, got %d", rec.Code)
	}
}

