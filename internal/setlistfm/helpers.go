package setlistfm

import (
	"context"
	"strings"
)

// ExtractSongNames returns a flat slice of song names from all sets and encores.
func ExtractSongNames(s *Setlist) []string {
	if s == nil {
		return nil
	}
	var songs []string
	for _, st := range s.Sets.Set {
		for _, sng := range st.Song {
			trimmed := strings.TrimSpace(sng.Name)
			if trimmed != "" {
				songs = append(songs, trimmed)
			}
		}
	}
	return songs
}

// SetlistHasSongs checks whether a setlist contains at least one song.
func SetlistHasSongs(s *Setlist) bool {
	if s == nil {
		return false
	}
	for _, st := range s.Sets.Set {
		if len(st.Song) > 0 {
			for _, sng := range st.Song {
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

// ResolveResult holds the resolved setlists and the chosen artist MBID.
type ResolveResult struct {
	Setlists []Setlist
	MBID     string
}

// ResolveArtistSetlists resolves setlists for an artist.
// If mbid is non-empty, fetches directly.
// Otherwise searches by name with exact-match priority, SetlistHasSongs preference,
// and SearchSetlistsByArtist fallback with partial-name filtering.
func ResolveArtistSetlists(ctx context.Context, client *Client, artistName, mbid string) (*ResolveResult, error) {
	if res := resolveByMBID(ctx, client, mbid); res != nil {
		return res, nil
	}

	if res := resolveByArtistSearch(ctx, client, artistName); res != nil {
		return res, nil
	}

	if res := resolveBySetlistSearch(ctx, client, artistName); res != nil {
		return res, nil
	}

	return &ResolveResult{
		Setlists: []Setlist{},
	}, nil
}

func resolveByMBID(ctx context.Context, client *Client, mbid string) *ResolveResult {
	if mbid == "" {
		return nil
	}

	res, err := client.GetArtistSetlists(ctx, mbid, 1)
	if err != nil || res == nil {
		return nil
	}

	setlists := res.Setlist
	if setlists == nil {
		setlists = []Setlist{}
	}
	return &ResolveResult{
		Setlists: setlists,
		MBID:     mbid,
	}
}

func resolveByArtistSearch(ctx context.Context, client *Client, artistName string) *ResolveResult {
	trimmedName := strings.TrimSpace(artistName)
	if trimmedName == "" {
		return nil
	}

	artistsRes, err := client.SearchArtists(ctx, trimmedName, 1)
	if err != nil || artistsRes == nil || len(artistsRes.Artist) == 0 {
		return nil
	}

	normalizedName := strings.ToLower(trimmedName)
	var exactMatches []Artist
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

	var bestSetlists []Setlist
	var bestMBID string

	for _, candidate := range candidates {
		if candidate.MBID == "" {
			continue
		}
		sRes, err := client.GetArtistSetlists(ctx, candidate.MBID, 1)
		if err != nil || sRes == nil || len(sRes.Setlist) == 0 {
			continue
		}

		hasSongs := false
		for _, s := range sRes.Setlist {
			if SetlistHasSongs(&s) {
				hasSongs = true
				break
			}
		}
		// Prefer candidate with populated song lists
		if hasSongs {
			return &ResolveResult{
				Setlists: sRes.Setlist,
				MBID:     candidate.MBID,
			}
		} else if len(bestSetlists) == 0 {
			bestSetlists = sRes.Setlist
			bestMBID = candidate.MBID
		}
	}

	if len(bestSetlists) > 0 {
		return &ResolveResult{
			Setlists: bestSetlists,
			MBID:     bestMBID,
		}
	}

	return nil
}

func resolveBySetlistSearch(ctx context.Context, client *Client, artistName string) *ResolveResult {
	trimmedName := strings.TrimSpace(artistName)
	if trimmedName == "" {
		return nil
	}

	searchRes, err := client.SearchSetlistsByArtist(ctx, trimmedName, 1)
	if err != nil || searchRes == nil || len(searchRes.Setlist) == 0 {
		return nil
	}

	normalizedName := strings.ToLower(trimmedName)
	var exact []Setlist
	var filtered []Setlist
	for _, s := range searchRes.Setlist {
		artistNameLower := strings.ToLower(strings.TrimSpace(s.Artist.Name))
		if artistNameLower == normalizedName {
			exact = append(exact, s)
		} else if strings.Contains(artistNameLower, normalizedName) {
			filtered = append(filtered, s)
		}
	}

	if len(exact) > 0 {
		return &ResolveResult{
			Setlists: exact,
			MBID:     exact[0].Artist.MBID,
		}
	}
	if len(filtered) > 0 {
		var fallbackMBID string
		if filtered[0].Artist.MBID != "" {
			fallbackMBID = filtered[0].Artist.MBID
		}
		return &ResolveResult{
			Setlists: filtered,
			MBID:     fallbackMBID,
		}
	}

	setlists := searchRes.Setlist
	if setlists == nil {
		setlists = []Setlist{}
	}
	return &ResolveResult{
		Setlists: setlists,
	}
}

