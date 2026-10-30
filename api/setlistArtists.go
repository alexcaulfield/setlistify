package handler

import (
	"context"
	"errors"
	"net/http"

	"github.com/alexcaulfield/setlistify/internal/config"
	"github.com/alexcaulfield/setlistify/internal/httputil"
	"github.com/alexcaulfield/setlistify/internal/setlistfm"
)

type setlistArtistsRequest struct {
	ArtistName string `json:"artistName"`
}

type setlistArtistsResponse struct {
	Artists []setlistfm.Artist `json:"artists"`
}

// SetlistArtists handles POST /api/setlistArtists
func SetlistArtists(w http.ResponseWriter, r *http.Request) {
	if httputil.SetCORS(w, r) {
		return
	}

	if r.Method != http.MethodPost {
		httputil.WriteError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"), "MethodNotAllowed")
		return
	}

	cfg := config.Load()

	var req setlistArtistsRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, err, "BadRequest")
		return
	}

	if req.ArtistName == "" {
		_ = httputil.WriteJSON(w, http.StatusOK, setlistArtistsResponse{
			Artists: []setlistfm.Artist{},
		})
		return
	}

	client := setlistfm.NewClient(cfg.SetlistFMAPIKey)
	res, err := client.SearchArtists(context.Background(), req.ArtistName, 1)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err, "SetlistFmError")
		return
	}

	artists := res.Artist
	if artists == nil {
		artists = []setlistfm.Artist{}
	}

	_ = httputil.WriteJSON(w, http.StatusOK, setlistArtistsResponse{
		Artists: artists,
	})
}

