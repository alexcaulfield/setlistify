package handler

import (
	"errors"
	"net/http"

	"github.com/alexcaulfield/setlistify/internal/config"
	"github.com/alexcaulfield/setlistify/internal/httputil"
	"github.com/alexcaulfield/setlistify/internal/spotify"
)

// AuthUrl handles GET /api/authUrl
func AuthUrl(w http.ResponseWriter, r *http.Request) {
	if httputil.SetCORS(w, r) {
		return
	}

	cfg := config.Load()
	if cfg.SpotifyClientID == "" {
		httputil.WriteError(w, http.StatusInternalServerError, errors.New("missing Spotify client configuration"), "ConfigError")
		return
	}

	svc := spotify.NewService(&cfg)
	authURL := svc.AuthURL("setlistify-state")

	_ = httputil.WriteJSON(w, http.StatusOK, map[string]string{
		"authUrl":   authURL,
		"cachePath": "", // Backwards compatibility for older clients
	})
}

