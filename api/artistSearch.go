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

type artistSearchRequest struct {
	Token string `json:"token"`
	Query string `json:"query"`
	Limit int    `json:"limit,omitempty"`
}

type artistSearchResponse struct {
	Artists []spotifyclient.FullArtist `json:"artists"`
}

func searchArtists(ctx context.Context, cfg *config.Config, req artistSearchRequest) (artistSearchResponse, error) {
	oauthToken, err := auth.DecodeToken(req.Token, cfg.AppSecretKey)
	if err != nil {
		return artistSearchResponse{}, httputil.WrapAPIError(http.StatusUnauthorized, "InvalidToken", err)
	}

	client := spotify.NewUserClient(ctx, oauthToken)

	limit := req.Limit
	if limit <= 0 {
		limit = 10
	}

	results, err := client.Search(ctx, "artist:"+req.Query, spotifyclient.SearchTypeArtist, spotifyclient.Limit(limit))
	if err != nil {
		return artistSearchResponse{}, httputil.WrapAPIError(http.StatusInternalServerError, "SpotifyError", err)
	}

	var artists []spotifyclient.FullArtist
	if results.Artists != nil {
		artists = results.Artists.Artists
	}
	if artists == nil {
		artists = []spotifyclient.FullArtist{}
	}

	return artistSearchResponse{
		Artists: artists,
	}, nil
}

// ArtistSearch handles POST /api/artistSearch
func ArtistSearch(w http.ResponseWriter, r *http.Request) {
	httputil.Handle(http.MethodPost, searchArtists)(w, r)
}
