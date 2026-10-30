package handler

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/alexcaulfield/setlistify/internal/auth"
	"github.com/alexcaulfield/setlistify/internal/config"
	"github.com/alexcaulfield/setlistify/internal/httputil"
	"github.com/alexcaulfield/setlistify/internal/setlistfm"
	"github.com/alexcaulfield/setlistify/internal/spotify"
	spotifyclient "github.com/zmb3/spotify/v2"
	"golang.org/x/oauth2"
)

type buildPlaylistRequest struct {
	Token        string `json:"token"`
	ArtistName   string `json:"artistName"`
	ArtistID     string `json:"artistId,omitempty"`
	ArtistMBID   string `json:"artistMbid,omitempty"`
	PlaylistType string `json:"playlistType"`
	PlaylistID   string `json:"playlistId"`
}

type buildPlaylistResponse struct {
	PlaylistURI string `json:"playlistUri,omitempty"`
}

// BuildPlaylist handles POST /api/buildPlaylist
func BuildPlaylist(w http.ResponseWriter, r *http.Request) {
	if httputil.SetCORS(w, r) {
		return
	}

	if r.Method != http.MethodPost {
		httputil.WriteError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"), "MethodNotAllowed")
		return
	}

	cfg := config.Load()

	var req buildPlaylistRequest
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
	spotifyCli := spotifyclient.New(oauth2.NewClient(ctx, oauth2.StaticTokenSource(oauthToken)))
	setlistCli := setlistfm.NewClient(cfg.SetlistFMAPIKey)

	var songs []setlistfm.Song
	playlistTitle := fmt.Sprintf("%s's Setlist", req.ArtistName)

	if req.PlaylistType == "Setlist" || req.PlaylistType == "" {
		// Fetch the setlist directly by ID
		setlist, err := setlistCli.GetSetlist(ctx, req.PlaylistID)
		if err == nil && setlist != nil {
			songs = setlistfm.ExtractSongs(setlist)
			if setlist.EventDate != "" {
				playlistTitle = fmt.Sprintf("%s's Setlist from %s", req.ArtistName, setlist.EventDate)
			}
		} else {
			// Fallback: search via MBID or artistName
			var candidateSetlists []setlistfm.Setlist
			if req.ArtistMBID != "" {
				res, err := setlistCli.GetArtistSetlists(ctx, req.ArtistMBID, 1)
				if err == nil && res != nil {
					candidateSetlists = res.Setlist
				}
			} else {
				res, err := setlistCli.SearchSetlistsByArtist(ctx, req.ArtistName, 1)
				if err == nil && res != nil {
					candidateSetlists = res.Setlist
				}
			}
			picked := setlistfm.PickSetlistByID(candidateSetlists, req.PlaylistID)
			if picked != nil {
				songs = setlistfm.ExtractSongs(picked)
				if picked.EventDate != "" {
					playlistTitle = fmt.Sprintf("%s's Setlist from %s", req.ArtistName, picked.EventDate)
				}
			}
		}
	}

	if len(songs) == 0 {
		httputil.WriteError(w, http.StatusBadRequest, errors.New("no songs found for setlist"), "NoSongs")
		return
	}

	songQueries := make([]spotify.SongQuery, len(songs))
	for i, s := range songs {
		var coverArtist string
		if s.Cover != nil && strings.TrimSpace(s.Cover.Name) != "" {
			coverArtist = strings.TrimSpace(s.Cover.Name)
		}
		songQueries[i] = spotify.SongQuery{
			Name:        s.Name,
			CoverArtist: coverArtist,
		}
	}

	// Resolve Spotify track IDs concurrently (concurrency limit = 5)
	trackIDs, err := spotify.ResolveTrackIDs(ctx, spotifyCli, req.ArtistName, songQueries, 5)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err, "SpotifyResolutionError")
		return
	}

	playlistDesc := "A playlist made with the setlistify.app"
	playlist, err := spotify.CreateAndPopulatePlaylist(ctx, spotifyCli, playlistTitle, playlistDesc, trackIDs)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err, "SpotifyCreatePlaylistError")
		return
	}

	_ = httputil.WriteJSON(w, http.StatusOK, buildPlaylistResponse{
		PlaylistURI: string(playlist.URI),
	})
}
