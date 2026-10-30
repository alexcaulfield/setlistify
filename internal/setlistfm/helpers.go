package setlistfm

import (
	"context"
	"fmt"
	"strings"
)

// ExtractSongNames returns a flat slice of song names from all sets and encores,
// excluding tape/intro tracks.
func ExtractSongNames(s *Setlist) []string {
	if s == nil {
		return nil
	}
	var songs []string
	for _, st := range s.Sets.Set {
		for _, sng := range st.Song {
			if sng.Tape {
				continue
			}
			trimmed := strings.TrimSpace(sng.Name)
			if trimmed != "" {
				songs = append(songs, trimmed)
			}
		}
	}
	return songs
}

// ExtractSongs returns a flat slice of songs from all sets and encores,
// excluding tape/intro tracks and empty song names. Song names are trimmed,
// and Cover artist information is preserved when present.
func ExtractSongs(s *Setlist) []Song {
	if s == nil {
		return nil
	}
	var songs []Song
	for _, st := range s.Sets.Set {
		for _, sng := range st.Song {
			if sng.Tape {
				continue
			}
			trimmed := strings.TrimSpace(sng.Name)
			if trimmed == "" {
				continue
			}
			sngCopy := sng
			sngCopy.Name = trimmed
			if sngCopy.Cover != nil {
				coverName := strings.TrimSpace(sngCopy.Cover.Name)
				coverMBID := strings.TrimSpace(sngCopy.Cover.MBID)
				if coverName == "" && coverMBID == "" {
					sngCopy.Cover = nil
				} else {
					cCopy := *sngCopy.Cover
					cCopy.Name = coverName
					cCopy.MBID = coverMBID
					sngCopy.Cover = &cCopy
				}
			}
			songs = append(songs, sngCopy)
		}
	}
	return songs
}

// SetlistHasSongs checks whether a setlist contains at least one non-tape song.
func SetlistHasSongs(s *Setlist) bool {
	if s == nil {
		return false
	}
	for _, st := range s.Sets.Set {
		if len(st.Song) > 0 {
			for _, sng := range st.Song {
				if sng.Tape {
					continue
				}
				if strings.TrimSpace(sng.Name) != "" {
					return true
				}
			}
		}
	}
	return false
}

// PickSetlistByID finds a setlist matching id from a slice.
func PickSetlistByID(setlists []Setlist, id string) *Setlist {
	for i := range setlists {
		if setlists[i].ID == id {
			return &setlists[i]
		}
	}
	return nil
}

// ResolveArtistSetlists attempts to find setlists for an artist by trying:
// 1. Searching artists for the query, and trying candidates' MBIDs.
// 2. Falling back to direct SearchSetlistsByArtist if artist search yields nothing or no setlists.
func ResolveArtistSetlists(ctx context.Context, client *Client, artistName string) ([]Setlist, error) {
	trimmedName := strings.TrimSpace(artistName)
	if trimmedName == "" {
		return nil, fmt.Errorf("artist name cannot be empty")
	}

	// 1. Search for matching artists
	artistsResp, err := client.SearchArtists(ctx, trimmedName, 1)
	if err == nil && artistsResp != nil && len(artistsResp.Artist) > 0 {
		// Iterate over top candidate artists (up to 3) to find one with setlists
		maxCandidates := 3
		if len(artistsResp.Artist) < maxCandidates {
			maxCandidates = len(artistsResp.Artist)
		}

		for i := 0; i < maxCandidates; i++ {
			candidate := artistsResp.Artist[i]
			if candidate.MBID == "" {
				continue
			}
			setlistsResp, err := client.GetArtistSetlists(ctx, candidate.MBID, 1)
			if err == nil && setlistsResp != nil && len(setlistsResp.Setlist) > 0 {
				return setlistsResp.Setlist, nil
			}
		}
	}

	// 2. Fallback: Search setlists directly by artist name
	directResp, err := client.SearchSetlistsByArtist(ctx, trimmedName, 1)
	if err == nil && directResp != nil && len(directResp.Setlist) > 0 {
		return directResp.Setlist, nil
	}

	return []Setlist{}, nil
}

