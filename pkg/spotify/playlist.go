package spotify

import (
	"context"
	"fmt"
	"strings"

	spotifyclient "github.com/zmb3/spotify/v2"
	"golang.org/x/sync/errgroup"
)

// SearchSongTrack searches for a track by artist and song title using Spotify Search.
func SearchSongTrack(ctx context.Context, client *spotifyclient.Client, artistName, songName string) (*spotifyclient.FullTrack, error) {
	// Query Spotify with "artist:<name> track:<song>"
	query := fmt.Sprintf("artist:%s track:%s", artistName, songName)
	result, err := client.Search(ctx, query, spotifyclient.SearchTypeTrack)
	if err != nil {
		return nil, fmt.Errorf("search track (%s - %s): %w", artistName, songName, err)
	}

	if result.Tracks != nil && len(result.Tracks.Tracks) > 0 {
		return &result.Tracks.Tracks[0], nil
	}

	// Fallback: search with bare track and artist names if specific query yielded no results
	fallbackQuery := fmt.Sprintf("%s %s", artistName, songName)
	fallbackResult, err := client.Search(ctx, fallbackQuery, spotifyclient.SearchTypeTrack)
	if err != nil {
		return nil, fmt.Errorf("fallback search track (%s - %s): %w", artistName, songName, err)
	}

	if fallbackResult.Tracks != nil && len(fallbackResult.Tracks.Tracks) > 0 {
		return &fallbackResult.Tracks.Tracks[0], nil
	}

	return nil, nil
}

// ResolveTrackIDs searches Spotify for a slice of song names concurrently (bounded to concurrencyLimit),
// preserving the input ordering in the returned slice of Spotify track IDs.
func ResolveTrackIDs(ctx context.Context, client *spotifyclient.Client, artistName string, songs []string, concurrencyLimit int) ([]spotifyclient.ID, error) {
	if concurrencyLimit <= 0 {
		concurrencyLimit = 5
	}

	trackIDs := make([]spotifyclient.ID, len(songs))

	g, ctx := errgroup.WithContext(ctx)
	g.SetLimit(concurrencyLimit)

	for i, song := range songs {
		i, song := i, song
		g.Go(func() error {
			if strings.TrimSpace(song) == "" {
				return nil
			}
			track, err := SearchSongTrack(ctx, client, artistName, song)
			if err != nil {
				// Don't fail the whole playlist build if one song fails search; log / continue
				return nil
			}
			if track != nil {
				trackIDs[i] = track.ID
			}
			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

	var filteredIDs []spotifyclient.ID
	for _, id := range trackIDs {
		if id != "" {
			filteredIDs = append(filteredIDs, id)
		}
	}
	return filteredIDs, nil
}

// CreateAndPopulatePlaylist creates a new playlist on the current user's profile and adds tracks to it.
func CreateAndPopulatePlaylist(ctx context.Context, client *spotifyclient.Client, playlistTitle, playlistDesc string, trackIDs []spotifyclient.ID) (*spotifyclient.FullPlaylist, error) {
	user, err := client.CurrentUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("get current user for playlist creation: %w", err)
	}

	playlist, err := client.CreatePlaylistForUser(ctx, user.ID, playlistTitle, playlistDesc, false, false)
	if err != nil {
		return nil, fmt.Errorf("create playlist: %w", err)
	}

	if len(trackIDs) > 0 {
		// Spotify API allows adding up to 100 tracks per batch
		const batchSize = 100
		for i := 0; i < len(trackIDs); i += batchSize {
			end := i + batchSize
			if end > len(trackIDs) {
				end = len(trackIDs)
			}
			batch := trackIDs[i:end]
			if _, err := client.AddTracksToPlaylist(ctx, playlist.ID, batch...); err != nil {
				return nil, fmt.Errorf("add tracks to playlist: %w", err)
			}
		}
	}

	return playlist, nil
}

