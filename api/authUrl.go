package handler

import (
	"context"
	"net/http"

	"github.com/alexcaulfield/setlistify/internal/config"
	"github.com/alexcaulfield/setlistify/internal/httputil"
	"github.com/alexcaulfield/setlistify/internal/spotify"
)

type authUrlResponse struct {
	AuthURL   string `json:"authUrl"`
	CachePath string `json:"cachePath"` // backwards compat, always ""
}

func getAuthURL(_ context.Context, cfg *config.Config, _ struct{}) (authUrlResponse, error) {
	if cfg.SpotifyClientID == "" {
		return authUrlResponse{}, httputil.NewAPIError(http.StatusInternalServerError, "ConfigError", "missing Spotify client configuration")
	}

	svc := spotify.NewService(cfg)
	authURL := svc.AuthURL("setlistify-state")

	return authUrlResponse{
		AuthURL:   authURL,
		CachePath: "", // Backwards compatibility for older clients
	}, nil
}

// AuthUrl handles GET /api/authUrl
func AuthUrl(w http.ResponseWriter, r *http.Request) {
	httputil.Handle(http.MethodGet, getAuthURL)(w, r)
}
