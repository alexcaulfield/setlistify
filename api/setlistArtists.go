package handler

import (
	"context"
	"net/http"

	"github.com/alexcaulfield/setlistify/pkg/apitypes"
	"github.com/alexcaulfield/setlistify/pkg/config"
	"github.com/alexcaulfield/setlistify/pkg/httputil"
	"github.com/alexcaulfield/setlistify/pkg/setlistfm"
)

type setlistArtistsRequest = apitypes.SetlistArtistsRequest
type setlistArtistsResponse = apitypes.SetlistArtistsResponse

func searchSetlistArtists(ctx context.Context, cfg *config.Config, req setlistArtistsRequest) (setlistArtistsResponse, error) {
	if req.ArtistName == "" {
		return setlistArtistsResponse{
			Artists: []setlistfm.Artist{},
		}, nil
	}

	client := setlistfm.NewClient(cfg.SetlistFMAPIKey)
	res, err := client.SearchArtists(ctx, req.ArtistName, 1)
	if err != nil {
		return setlistArtistsResponse{}, httputil.WrapAPIError(http.StatusInternalServerError, "SetlistFmError", err)
	}

	artists := res.Artist
	if artists == nil {
		artists = []setlistfm.Artist{}
	}

	return setlistArtistsResponse{
		Artists: artists,
	}, nil
}

func SetlistArtists(w http.ResponseWriter, r *http.Request) {
	httputil.Handle(http.MethodPost, searchSetlistArtists)(w, r)
}
