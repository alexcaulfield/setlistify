package handler

import (
	"context"
	"net/http"

	"github.com/alexcaulfield/setlistify/internal/auth"
	"github.com/alexcaulfield/setlistify/internal/config"
	"github.com/alexcaulfield/setlistify/internal/httputil"
	"github.com/alexcaulfield/setlistify/internal/spotify"
	spotifyclient "github.com/zmb3/spotify/v2"
)

type getUserRequest struct {
	Code      string `json:"code"`
	CachePath string `json:"cache_path,omitempty"`
}

type getUserResponse struct {
	User  *spotifyclient.PrivateUser `json:"user"`
	Token string                     `json:"token"`
}

func exchangeCodeForUser(ctx context.Context, cfg *config.Config, req getUserRequest) (getUserResponse, error) {
	if req.Code == "" {
		return getUserResponse{}, httputil.NewAPIError(http.StatusBadRequest, "BadRequest", "code is required")
	}

	svc := spotify.NewService(cfg)
	oauthToken, err := svc.Exchange(ctx, req.Code)
	if err != nil {
		return getUserResponse{}, httputil.WrapAPIError(http.StatusUnauthorized, "AuthError", err)
	}

	jwtToken, err := auth.EncodeToken(oauthToken, cfg.AppSecretKey)
	if err != nil {
		return getUserResponse{}, httputil.WrapAPIError(http.StatusInternalServerError, "TokenError", err)
	}

	client := spotify.NewUserClient(ctx, oauthToken)
	user, err := client.CurrentUser(ctx)
	if err != nil {
		return getUserResponse{}, httputil.WrapAPIError(http.StatusInternalServerError, "SpotifyError", err)
	}

	return getUserResponse{
		User:  user,
		Token: jwtToken,
	}, nil
}

// GetUser handles POST /api/getUser
func GetUser(w http.ResponseWriter, r *http.Request) {
	httputil.Handle(http.MethodPost, exchangeCodeForUser)(w, r)
}
