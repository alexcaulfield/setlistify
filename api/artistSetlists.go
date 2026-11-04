package handler

import (
	"context"
	"net/http"

	"github.com/alexcaulfield/setlistify/internal/config"
	"github.com/alexcaulfield/setlistify/internal/httputil"
	"github.com/alexcaulfield/setlistify/internal/setlistfm"
)

type artistSetlistsRequest struct {
	ArtistName string `json:"artistName"`
	ArtistMbid string `json:"artistMbid"`
}

type artistSetlistsResponse struct {
	ArtistSetlists []setlistfm.Setlist `json:"artistSetlists"`
	ArtistMbid     string              `json:"artistMbid,omitempty"`
}

func resolveArtistSetlists(ctx context.Context, cfg *config.Config, req artistSetlistsRequest) (artistSetlistsResponse, error) {
	client := setlistfm.NewClient(cfg.SetlistFMAPIKey)
	res, err := setlistfm.ResolveArtistSetlists(ctx, client, req.ArtistName, req.ArtistMbid)
	if err != nil {
		return artistSetlistsResponse{}, httputil.WrapAPIError(http.StatusInternalServerError, "SetlistFmError", err)
	}

	setlists := res.Setlists
	if setlists == nil {
		setlists = []setlistfm.Setlist{}
	}

	return artistSetlistsResponse{
		ArtistSetlists: setlists,
		ArtistMbid:     res.MBID,
	}, nil
}

// ArtistSetlists handles POST /api/artistSetlists
func ArtistSetlists(w http.ResponseWriter, r *http.Request) {
	httputil.Handle(http.MethodPost, resolveArtistSetlists)(w, r)
}
