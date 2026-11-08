package handler

import (
	"context"
	"net/http"

	"github.com/alexcaulfield/setlistify/pkg/apitypes"
	"github.com/alexcaulfield/setlistify/pkg/auth"
	"github.com/alexcaulfield/setlistify/pkg/config"
	"github.com/alexcaulfield/setlistify/pkg/httputil"
	"github.com/alexcaulfield/setlistify/pkg/spotify"
)

type getUserRequest = apitypes.GetUserRequest
type getUserResponse = apitypes.GetUserResponse

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

func GetUser(w http.ResponseWriter, r *http.Request) {
	httputil.Handle(http.MethodPost, exchangeCodeForUser)(w, r)
}
