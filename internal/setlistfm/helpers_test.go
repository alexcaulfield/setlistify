package setlistfm

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestExtractSongNamesAndHasSongs(t *testing.T) {
	setlist := &Setlist{
		ID: "123",
		Sets: Sets{
			Set: []Set{
				{
					Name: "Set 1",
					Song: []Song{
						{Name: "Song A"},
						{Name: "Song B"},
						{Name: "   "},
					},
				},
				{
					Name:   "Encore",
					Encore: 1,
					Song: []Song{
						{Name: "Song C"},
					},
				},
			},
		},
	}

	if !SetlistHasSongs(setlist) {
		t.Fatalf("expected setlist to have songs")
	}

	songs := ExtractSongNames(setlist)
	expected := []string{"Song A", "Song B", "Song C"}
	if len(songs) != len(expected) {
		t.Fatalf("expected %d songs, got %d", len(expected), len(songs))
	}
	for i, s := range expected {
		if songs[i] != s {
			t.Errorf("song[%d]: expected %q, got %q", i, s, songs[i])
		}
	}

	emptySetlist := &Setlist{}
	if SetlistHasSongs(emptySetlist) {
		t.Errorf("empty setlist should not have songs")
	}
	if len(ExtractSongNames(emptySetlist)) != 0 {
		t.Errorf("empty setlist songs should be empty")
	}
}

func TestExtractSongsAndTapeFiltering(t *testing.T) {
	setlist := &Setlist{
		ID: "set-tape-cover",
		Sets: Sets{
			Set: []Set{
				{
					Name: "Set 1",
					Song: []Song{
						{Name: "Walk-on Tape", Tape: true},
						{Name: "Song A"},
						{
							Name: "Toxic",
							Cover: &Artist{
								Name: "Britney Spears",
								MBID: "45a663b5-b1cb-4a91-bff6-2bef7bbfdd76",
							},
						},
						{
							Name: "Song B",
							Cover: &Artist{
								Name: "   ",
								MBID: "",
							},
						},
						{Name: "   "},
					},
				},
				{
					Name:   "Encore",
					Encore: 1,
					Song: []Song{
						{Name: "Don't Lose Sight"},
						{Name: "Exit Music", Tape: true},
					},
				},
			},
		},
	}

	if !SetlistHasSongs(setlist) {
		t.Fatalf("expected setlist to have songs")
	}

	songs := ExtractSongs(setlist)
	if len(songs) != 4 {
		t.Fatalf("expected 4 songs, got %d", len(songs))
	}

	if songs[0].Name != "Song A" || songs[0].Cover != nil {
		t.Errorf("expected Song A without cover, got %+v", songs[0])
	}
	if songs[1].Name != "Toxic" || songs[1].Cover == nil || songs[1].Cover.Name != "Britney Spears" {
		t.Errorf("expected Toxic with Britney Spears cover, got %+v", songs[1])
	}
	if songs[2].Name != "Song B" || songs[2].Cover != nil {
		t.Errorf("expected Song B with nil cover, got %+v", songs[2])
	}
	if songs[3].Name != "Don't Lose Sight" || songs[3].Cover != nil {
		t.Errorf("expected Don't Lose Sight without cover, got %+v", songs[3])
	}

	names := ExtractSongNames(setlist)
	expectedNames := []string{"Song A", "Toxic", "Song B", "Don't Lose Sight"}
	if len(names) != len(expectedNames) {
		t.Fatalf("expected %d names, got %d", len(expectedNames), len(names))
	}
	for i, n := range expectedNames {
		if names[i] != n {
			t.Errorf("names[%d]: expected %q, got %q", i, n, names[i])
		}
	}

	tapeOnlySetlist := &Setlist{
		ID: "tape-only",
		Sets: Sets{
			Set: []Set{
				{
					Song: []Song{
						{Name: "Intro", Tape: true},
						{Name: "Outro", Tape: true},
					},
				},
			},
		},
	}
	if SetlistHasSongs(tapeOnlySetlist) {
		t.Errorf("tape-only setlist should not have playable songs")
	}
	if len(ExtractSongs(tapeOnlySetlist)) != 0 {
		t.Errorf("tape-only setlist should yield 0 songs from ExtractSongs")
	}
	if len(ExtractSongNames(tapeOnlySetlist)) != 0 {
		t.Errorf("tape-only setlist should yield 0 names from ExtractSongNames")
	}
}

func TestPickSetlistByID(t *testing.T) {
	setlists := []Setlist{
		{ID: "abc"},
		{ID: "def"},
	}

	found := PickSetlistByID(setlists, "def")
	if found == nil || found.ID != "def" {
		t.Fatalf("expected to find setlist with ID def")
	}

	notFound := PickSetlistByID(setlists, "xyz")
	if notFound != nil {
		t.Fatalf("expected nil when ID not found")
	}
}

// roundTripperFunc wraps a function to implement http.RoundTripper without binding to sockets.
type roundTripperFunc func(*http.Request) (*http.Response, error)

func (f roundTripperFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return f(r)
}

func TestResolveArtistSetlists(t *testing.T) {
	transport := roundTripperFunc(func(r *http.Request) (*http.Response, error) {
		rec := httptest.NewRecorder()
		rec.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/search/artists":
			resp := ArtistsResponse{
				Artist: []Artist{
					{MBID: "mbid-1", Name: "Radiohead"},
				},
			}
			json.NewEncoder(rec).Encode(resp)
		case "/artist/mbid-1/setlists":
			resp := SetlistsResponse{
				Setlist: []Setlist{
					{ID: "set-1"},
				},
			}
			json.NewEncoder(rec).Encode(resp)
		default:
			rec.WriteHeader(http.StatusNotFound)
		}
		return rec.Result(), nil
	})

	httpClient := &http.Client{Transport: transport}
	client := NewClient("dummy-key", WithBaseURL("http://setlistfm.mock"), WithHTTPClient(httpClient))
	setlists, err := ResolveArtistSetlists(context.Background(), client, "Radiohead")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(setlists) != 1 || setlists[0].ID != "set-1" {
		t.Fatalf("expected 1 setlist with ID set-1, got %+v", setlists)
	}
}

func TestSearchArtistsSortRelevance(t *testing.T) {
	var capturedSort string
	transport := roundTripperFunc(func(r *http.Request) (*http.Response, error) {
		rec := httptest.NewRecorder()
		rec.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/search/artists" {
			capturedSort = r.URL.Query().Get("sort")
			resp := ArtistsResponse{
				Artist: []Artist{
					{MBID: "mbid-lawrence", Name: "Lawrence"},
				},
			}
			json.NewEncoder(rec).Encode(resp)
		} else {
			rec.WriteHeader(http.StatusNotFound)
		}
		return rec.Result(), nil
	})

	httpClient := &http.Client{Transport: transport}
	client := NewClient("dummy-key", WithBaseURL("http://setlistfm.mock"), WithHTTPClient(httpClient))
	res, err := client.SearchArtists(context.Background(), "Lawrence", 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedSort != "relevance" {
		t.Errorf("expected sort to be 'relevance', got %q", capturedSort)
	}
	if len(res.Artist) != 1 || res.Artist[0].MBID != "mbid-lawrence" {
		t.Errorf("unexpected artists response: %+v", res)
	}
}
