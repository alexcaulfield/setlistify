package handler

import (
	"context"
	"errors"
	"net/http"

	"github.com/alexcaulfield/setlistify/internal/auth"
	"github.com/alexcaulfield/setlistify/internal/config"
	"github.com/alexcaulfield/setlistify/internal/httputil"
	spotifyclient "github.com/zmb3/spotify/v2"
	"golang.org/x/oauth2"
)

type artistSearchRequest struct {
	Token string `json:"token"`
	Query string `json:"query"`
	Limit int    `json:"limit,omitempty"`
}

type artistSearchResponse struct {
	Artists []spotifyclient.FullArtist `json:"artists"`
}

// ArtistSearch handles POST /api/artistSearch
func ArtistSearch(w http.ResponseWriter, r *http.Request) {
	if httputil.SetCORS(w, r) {
		return
	}

	if r.Method != http.MethodPost {
		httputil.WriteError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"), "MethodNotAllowed")
		return
	}

	cfg := config.Load()

	var req artistSearchRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, err, "BadRequest")
		return
	}

	oauthToken, err := auth.DecodeToken(req.Token, cfg.AppSecretKey)
	if err != nil {
		httputil.WriteError(w, http.StatusUnauthorized, err, "InvalidToken")
		return
	}

	ctx := context.Background()
	client := spotifyclient.New(oauth2.NewClient(ctx, oauth2.StaticTokenSource(oauthToken)))

	limit := req.Limit
	if limit <= 0 {
		limit = 10
	}

	results, err := client.Search(ctx, "artist:"+req.Query, spotifyclient.SearchTypeArtist, spotifyclient.Limit(limit))
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err, "SpotifyError")
		return
	}

	var artists []spotifyclient.FullArtist
	if results.Artists != nil {
		artists = results.Artists.Artists
	}
	if artists == nil {
		artists = []spotifyclient.FullArtist{}
	}

	_ = httputil.WriteJSON(w, http.StatusOK, artistSearchResponse{
		Artists: artists,
	})
}

