package handler

import (
	"context"
	"errors"
	"net/http"
	"strings"

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

// ArtistSetlists handles POST /api/artistSetlists
func ArtistSetlists(w http.ResponseWriter, r *http.Request) {
	if httputil.SetCORS(w, r) {
		return
	}

	if r.Method != http.MethodPost {
		httputil.WriteError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"), "MethodNotAllowed")
		return
	}

	cfg := config.Load()

	var req artistSetlistsRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, err, "BadRequest")
		return
	}

	client := setlistfm.NewClient(cfg.SetlistFMAPIKey)
	ctx := context.Background()

	// 1. If artistMbid is provided, fetch directly for that MBID
	if req.ArtistMbid != "" {
		res, err := client.GetArtistSetlists(ctx, req.ArtistMbid, 1)
		if err == nil && res != nil {
			setlists := res.Setlist
			if setlists == nil {
				setlists = []setlistfm.Setlist{}
			}
			_ = httputil.WriteJSON(w, http.StatusOK, artistSetlistsResponse{
				ArtistSetlists: setlists,
				ArtistMbid:     req.ArtistMbid,
			})
			return
		}
	}

	// 2. If artistName is provided, search matching artists and pick candidate with setlists
	if req.ArtistName != "" {
		normalizedName := strings.ToLower(strings.TrimSpace(req.ArtistName))
		artistsRes, err := client.SearchArtists(ctx, req.ArtistName, 1)
		if err == nil && artistsRes != nil && len(artistsRes.Artist) > 0 {
			var exactMatches []setlistfm.Artist
			for _, a := range artistsRes.Artist {
				if strings.ToLower(strings.TrimSpace(a.Name)) == normalizedName {
					exactMatches = append(exactMatches, a)
				}
			}

			candidates := exactMatches
			if len(candidates) == 0 {
				candidates = artistsRes.Artist
			}
			if len(candidates) > 3 {
				candidates = candidates[:3]
			}

			var bestSetlists []setlistfm.Setlist
			var bestMBID string

			for _, candidate := range candidates {
				if candidate.MBID == "" {
					continue
				}
				sRes, err := client.GetArtistSetlists(ctx, candidate.MBID, 1)
				if err == nil && sRes != nil && len(sRes.Setlist) > 0 {
					hasSongs := false
					for _, s := range sRes.Setlist {
						if setlistfm.SetlistHasSongs(&s) {
							hasSongs = true
							break
						}
					}
					if hasSongs {
						_ = httputil.WriteJSON(w, http.StatusOK, artistSetlistsResponse{
							ArtistSetlists: sRes.Setlist,
							ArtistMbid:     candidate.MBID,
						})
						return
					} else if len(bestSetlists) == 0 {
						bestSetlists = sRes.Setlist
						bestMBID = candidate.MBID
					}
				}
			}

			if len(bestSetlists) > 0 {
				_ = httputil.WriteJSON(w, http.StatusOK, artistSetlistsResponse{
					ArtistSetlists: bestSetlists,
					ArtistMbid:     bestMBID,
				})
				return
			}
		}

		// Fallback: search setlists directly by artist name
		searchRes, err := client.SearchSetlistsByArtist(ctx, req.ArtistName, 1)
		if err == nil && searchRes != nil && len(searchRes.Setlist) > 0 {
			var filtered []setlistfm.Setlist
			for _, s := range searchRes.Setlist {
				if strings.Contains(strings.ToLower(s.Artist.Name), normalizedName) {
					filtered = append(filtered, s)
				}
			}
			if len(filtered) > 0 {
				_ = httputil.WriteJSON(w, http.StatusOK, artistSetlistsResponse{
					ArtistSetlists: filtered,
				})
				return
			}
			_ = httputil.WriteJSON(w, http.StatusOK, artistSetlistsResponse{
				ArtistSetlists: searchRes.Setlist,
			})
			return
		}
	}

	_ = httputil.WriteJSON(w, http.StatusOK, artistSetlistsResponse{
		ArtistSetlists: []setlistfm.Setlist{},
	})
}

