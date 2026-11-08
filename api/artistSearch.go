package handler

import (
	"context"
	"net/http"

	"github.com/alexcaulfield/setlistify/pkg/apitypes"
	"github.com/alexcaulfield/setlistify/pkg/auth"
	"github.com/alexcaulfield/setlistify/pkg/config"
	"github.com/alexcaulfield/setlistify/pkg/httputil"
	"github.com/alexcaulfield/setlistify/pkg/spotify"
	spotifyclient "github.com/zmb3/spotify/v2"
)

type artistSearchRequest = apitypes.ArtistSearchRequest
type artistSearchResponse = apitypes.ArtistSearchResponse

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

func ArtistSearch(w http.ResponseWriter, r *http.Request) {
	httputil.Handle(http.MethodPost, searchArtists)(w, r)
}
