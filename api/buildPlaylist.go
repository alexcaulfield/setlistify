package handler

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/alexcaulfield/setlistify/pkg/auth"
	"github.com/alexcaulfield/setlistify/pkg/config"
	"github.com/alexcaulfield/setlistify/pkg/httputil"
	"github.com/alexcaulfield/setlistify/pkg/setlistfm"
	"github.com/alexcaulfield/setlistify/pkg/spotify"
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

func buildPlaylist(ctx context.Context, cfg *config.Config, req buildPlaylistRequest) (buildPlaylistResponse, error) {
	oauthToken, err := auth.DecodeToken(req.Token, cfg.AppSecretKey)
	if err != nil {
		return buildPlaylistResponse{}, httputil.WrapAPIError(http.StatusUnauthorized, "InvalidToken", err)
	}

	spotifyCli := spotify.NewUserClient(ctx, oauthToken)
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
		return buildPlaylistResponse{}, httputil.NewAPIError(http.StatusBadRequest, "NoSongs", "no songs found for setlist")
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
		return buildPlaylistResponse{}, httputil.WrapAPIError(http.StatusInternalServerError, "SpotifyResolutionError", err)
	}

	playlistDesc := "A playlist made with the setlistify.app"
	playlist, err := spotify.CreateAndPopulatePlaylist(ctx, spotifyCli, playlistTitle, playlistDesc, trackIDs)
	if err != nil {
		return buildPlaylistResponse{}, httputil.WrapAPIError(http.StatusInternalServerError, "SpotifyCreatePlaylistError", err)
	}

	return buildPlaylistResponse{
		PlaylistURI: string(playlist.URI),
	}, nil
}

func BuildPlaylist(w http.ResponseWriter, r *http.Request) {
	httputil.Handle(http.MethodPost, buildPlaylist)(w, r)
}
