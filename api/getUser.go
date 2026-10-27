package handler

import (
	"context"
	"errors"
	"net/http"

	"github.com/alexcaulfield/setlistify/internal/auth"
	"github.com/alexcaulfield/setlistify/internal/config"
	"github.com/alexcaulfield/setlistify/internal/httputil"
	"github.com/alexcaulfield/setlistify/internal/spotify"
	spotifyclient "github.com/zmb3/spotify/v2"
	"golang.org/x/oauth2"
)

type getUserRequest struct {
	Code      string `json:"code"`
	CachePath string `json:"cache_path,omitempty"`
}

type getUserResponse struct {
	User  *spotifyclient.PrivateUser `json:"user"`
	Token string                     `json:"token"`
}

// GetUser handles POST /api/getUser
func GetUser(w http.ResponseWriter, r *http.Request) {
	if httputil.SetCORS(w, r) {
		return
	}

	if r.Method != http.MethodPost {
		httputil.WriteError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"), "MethodNotAllowed")
		return
	}

	cfg := config.Load()

	var req getUserRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, err, "BadRequest")
		return
	}

	if req.Code == "" {
		httputil.WriteError(w, http.StatusBadRequest, errors.New("code is required"), "BadRequest")
		return
	}

	ctx := context.Background()
	svc := spotify.NewService(&cfg)
	oauthToken, err := svc.Exchange(ctx, req.Code)
	if err != nil {
		httputil.WriteError(w, http.StatusUnauthorized, err, "AuthError")
		return
	}

	jwtToken, err := auth.EncodeToken(oauthToken, cfg.AppSecretKey)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err, "TokenError")
		return
	}

	client := spotifyclient.New(oauth2.NewClient(ctx, oauth2.StaticTokenSource(oauthToken)))
	user, err := client.CurrentUser(ctx)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err, "SpotifyError")
		return
	}

	_ = httputil.WriteJSON(w, http.StatusOK, getUserResponse{
		User:  user,
		Token: jwtToken,
	})
}

