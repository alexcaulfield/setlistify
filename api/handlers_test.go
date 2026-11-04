package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/alexcaulfield/setlistify/internal/config"
	"github.com/alexcaulfield/setlistify/internal/httputil"
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



func TestGetAuthURLBusinessLogic(t *testing.T) {
	t.Run("missing client ID returns ConfigError", func(t *testing.T) {
		cfg := &config.Config{SpotifyClientID: ""}
		_, err := getAuthURL(t.Context(), cfg, struct{}{})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var apiErr *httputil.APIError
		if !errors.As(err, &apiErr) || apiErr.Type != "ConfigError" {
			t.Errorf("expected ConfigError, got %v", err)
		}
	})

	t.Run("valid config returns AuthURL", func(t *testing.T) {
		cfg := &config.Config{
			SpotifyClientID: "test-id",
			RedirectURI:     "http://localhost:3000/callback",
		}
		res, err := getAuthURL(t.Context(), cfg, struct{}{})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if res.AuthURL == "" {
			t.Errorf("expected non-empty AuthURL")
		}
	})
}

func TestSearchSetlistArtistsEmptyName(t *testing.T) {
	cfg := &config.Config{SetlistFMAPIKey: "dummy"}
	res, err := searchSetlistArtists(t.Context(), cfg, setlistArtistsRequest{ArtistName: ""})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(res.Artists) != 0 {
		t.Errorf("expected 0 artists for empty query, got %d", len(res.Artists))
	}
}

func TestGetUserEmptyCode(t *testing.T) {
	cfg := &config.Config{AppSecretKey: "secret"}
	_, err := exchangeCodeForUser(t.Context(), cfg, getUserRequest{Code: ""})
	if err == nil {
		t.Fatal("expected error for empty code")
	}
	var apiErr *httputil.APIError
	if !errors.As(err, &apiErr) || apiErr.Type != "BadRequest" {
		t.Errorf("expected BadRequest APIError, got %v", err)
	}
}

func TestBuildPlaylistInvalidToken(t *testing.T) {
	cfg := &config.Config{AppSecretKey: "secret"}
	_, err := buildPlaylist(t.Context(), cfg, buildPlaylistRequest{
		Token: "invalid-token",
	})
	if err == nil {
		t.Fatal("expected error for invalid token")
	}
	var apiErr *httputil.APIError
	if !errors.As(err, &apiErr) || apiErr.Type != "InvalidToken" {
		t.Errorf("expected InvalidToken APIError, got %v", err)
	}
}


