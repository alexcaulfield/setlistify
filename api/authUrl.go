package handler

import (
	"context"
	"net/http"

	"github.com/alexcaulfield/setlistify/pkg/apitypes"
	"github.com/alexcaulfield/setlistify/pkg/config"
	"github.com/alexcaulfield/setlistify/pkg/httputil"
	"github.com/alexcaulfield/setlistify/pkg/spotify"
)

type authUrlResponse = apitypes.AuthUrlResponse

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

func AuthUrl(w http.ResponseWriter, r *http.Request) {
	httputil.Handle(http.MethodGet, getAuthURL)(w, r)
}
