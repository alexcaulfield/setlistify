package spotify

import (
	"context"
	"fmt"
	"strings"

	spotifyclient "github.com/zmb3/spotify/v2"
	"golang.org/x/sync/errgroup"
)

// SongQuery represents a song to resolve on Spotify, with an optional original cover artist.
type SongQuery struct {
	Name        string
	CoverArtist string
}

// TrackMatchesArtist checks if any artist on the track matches expectedArtist
// (case-insensitive, ignoring optional leading "The " or "the ").
func TrackMatchesArtist(track *spotifyclient.FullTrack, expectedArtist string) bool {
	if track == nil {
		return false
	}
	trimmedExpected := strings.TrimSpace(expectedArtist)
	if trimmedExpected == "" {
		return true
	}
	expectedNorm := strings.TrimPrefix(strings.ToLower(trimmedExpected), "the ")
	for _, a := range track.Artists {
		aName := strings.TrimSpace(a.Name)
		if strings.EqualFold(aName, trimmedExpected) {
			return true
		}
		if strings.EqualFold(strings.TrimPrefix(strings.ToLower(aName), "the "), expectedNorm) {
			return true
		}
	}
	return false
}

func searchFirstMatchingTrack(ctx context.Context, client *spotifyclient.Client, query, expectedArtist string) (*spotifyclient.FullTrack, error) {
	result, err := client.Search(ctx, query, spotifyclient.SearchTypeTrack)
	if err != nil {
		return nil, err
	}
	if result.Tracks != nil && len(result.Tracks.Tracks) > 0 {
		for i := range result.Tracks.Tracks {
			track := &result.Tracks.Tracks[i]
			if TrackMatchesArtist(track, expectedArtist) {
				return track, nil
			}
		}
	}
	return nil, nil
}

type queryCandidate struct {
	query          string
	expectedArtist string
}

// SearchTrack searches for a track on Spotify using prioritized queries:
// If CoverArtist is provided and differs from performingArtist:
//  1. "artist:<performingArtist> track:<songName>" (strict performing artist version)
//  2. "artist:<coverArtist> track:<songName>" (strict original cover artist version)
//  3. "<coverArtist> <songName>" (unfiltered original cover artist fallback)
//  4. "<performingArtist> <songName>" (unfiltered performing artist fallback)
//
// Otherwise (non-cover):
//  1. "artist:<performingArtist> track:<songName>" (strict)
//  2. "<performingArtist> <songName>" (unfiltered)
//
// In all cases, candidate tracks returned by Spotify are verified to ensure that
// at least one credited artist on the track matches the expected artist.
func SearchTrack(ctx context.Context, client *spotifyclient.Client, performingArtist string, song SongQuery) (*spotifyclient.FullTrack, error) {
	trimmedSong := strings.TrimSpace(song.Name)
	if trimmedSong == "" {
		return nil, nil
	}
	trimmedPerforming := strings.TrimSpace(performingArtist)
	trimmedCover := strings.TrimSpace(song.CoverArtist)

	isCover := trimmedCover != "" && !strings.EqualFold(trimmedCover, trimmedPerforming)

	var candidates []queryCandidate
	if isCover {
		candidates = []queryCandidate{
			{query: fmt.Sprintf("artist:%s track:%s", trimmedPerforming, trimmedSong), expectedArtist: trimmedPerforming},
			{query: fmt.Sprintf("artist:%s track:%s", trimmedCover, trimmedSong), expectedArtist: trimmedCover},
			{query: fmt.Sprintf("%s %s", trimmedCover, trimmedSong), expectedArtist: trimmedCover},
			{query: fmt.Sprintf("%s %s", trimmedPerforming, trimmedSong), expectedArtist: trimmedPerforming},
		}
	} else {
		candidates = []queryCandidate{
			{query: fmt.Sprintf("artist:%s track:%s", trimmedPerforming, trimmedSong), expectedArtist: trimmedPerforming},
			{query: fmt.Sprintf("%s %s", trimmedPerforming, trimmedSong), expectedArtist: trimmedPerforming},
		}
	}

	for _, c := range candidates {
		track, err := searchFirstMatchingTrack(ctx, client, c.query, c.expectedArtist)
		if err != nil {
			return nil, fmt.Errorf("search track query (%q): %w", c.query, err)
		}
		if track != nil {
			return track, nil
		}
	}

	return nil, nil
}

// SearchSongTrack searches for a track by artist and song title using Spotify Search.
func SearchSongTrack(ctx context.Context, client *spotifyclient.Client, artistName, songName string) (*spotifyclient.FullTrack, error) {
	return SearchTrack(ctx, client, artistName, SongQuery{Name: songName})
}

// ResolveTrackIDs searches Spotify for a slice of song queries concurrently (bounded to concurrencyLimit),
// preserving the input ordering in the returned slice of Spotify track IDs.
func ResolveTrackIDs(ctx context.Context, client *spotifyclient.Client, artistName string, songs []SongQuery, concurrencyLimit int) ([]spotifyclient.ID, error) {
	if concurrencyLimit <= 0 {
		concurrencyLimit = 5
	}

	trackIDs := make([]spotifyclient.ID, len(songs))

	g, ctx := errgroup.WithContext(ctx)
	g.SetLimit(concurrencyLimit)

	for i, song := range songs {
		i, song := i, song
		g.Go(func() error {
			if strings.TrimSpace(song.Name) == "" {
				return nil
			}
			track, err := SearchTrack(ctx, client, artistName, song)
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

