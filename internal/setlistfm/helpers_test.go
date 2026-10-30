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
