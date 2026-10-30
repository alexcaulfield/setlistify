package spotify

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	spotifyclient "github.com/zmb3/spotify/v2"
	"golang.org/x/oauth2"
)

type roundTripperFunc func(*http.Request) (*http.Response, error)

func (f roundTripperFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return f(r)
}

func TestResolveTrackIDs(t *testing.T) {
	// Mock HTTP response for search endpoint
	transport := roundTripperFunc(func(r *http.Request) (*http.Response, error) {
		q := r.URL.Query().Get("q")
		var trackID string
		var artistName string

		switch q {
		// 1. Original song by performing artist
		case "artist:Lawrence track:Don't Lose Sight":
			trackID = "track_dont_lose_sight"
			artistName = "Lawrence"

		// 2. Cover song where performing artist search returns an unrelated artist with same surname (e.g. Tracy Lawrence),
		// which should be rejected, falling back to original artist (The Beatles)
		case "artist:Lawrence track:Get Back":
			trackID = "track_tracy_lawrence_getting_back_up"
			artistName = "Tracy Lawrence"
		case "artist:The Beatles track:Get Back":
			trackID = "track_beatles_get_back"
			artistName = "The Beatles"

		// 3. Cover song where performing artist search returns an unrelated artist with same surname (e.g. Tim Lawrence),
		// which should be rejected, falling back to original artist (Britney Spears)
		case "artist:Lawrence track:Toxic":
			trackID = "track_tim_lawrence_toxic"
			artistName = "Tim Lawrence"
		case "artist:Britney Spears track:Toxic":
			trackID = "track_britney_toxic"
			artistName = "Britney Spears"

		// 4. Cover song that misses strict searches, falls back to loose cover artist query
		case "artist:Lawrence track:Superstition":
			trackID = ""
		case "artist:Stevie Wonder track:Superstition":
			trackID = ""
		case "Stevie Wonder Superstition":
			trackID = "track_stevie_superstition"
			artistName = "Stevie Wonder"

		// 5. Unknown song that never resolves
		case "artist:Lawrence track:Unknown Song", "Lawrence Unknown Song":
			trackID = ""
		}

		res := struct {
			Tracks struct {
				Items []struct {
					ID      string `json:"id"`
					Name    string `json:"name"`
					Artists []struct {
						Name string `json:"name"`
					} `json:"artists"`
				} `json:"items"`
			} `json:"tracks"`
		}{}

		if trackID != "" {
			item := struct {
				ID      string `json:"id"`
				Name    string `json:"name"`
				Artists []struct {
					Name string `json:"name"`
				} `json:"artists"`
			}{
				ID:   trackID,
				Name: trackID,
			}
			if artistName != "" {
				item.Artists = []struct {
					Name string `json:"name"`
				}{
					{Name: artistName},
				}
			}
			res.Tracks.Items = append(res.Tracks.Items, item)
		}

		bodyBytes, _ := json.Marshal(res)
		rec := &http.Response{
			StatusCode: http.StatusOK,
			Header:     make(http.Header),
			Body:       io.NopCloser(bytes.NewReader(bodyBytes)),
		}
		rec.Header.Set("Content-Type", "application/json")
		return rec, nil
	})

	httpClient := &http.Client{Transport: transport}
	client := spotifyclient.New(httpClient)
	ctx := context.Background()

	songs := []SongQuery{
		{Name: "Don't Lose Sight"},
		{Name: "Get Back", CoverArtist: "The Beatles"},
		{Name: "Toxic", CoverArtist: "Britney Spears"},
		{Name: "Superstition", CoverArtist: "Stevie Wonder"},
		{Name: "Unknown Song"},
		{Name: "   "}, // empty song name should be skipped
	}

	trackIDs, err := ResolveTrackIDs(ctx, client, "Lawrence", songs, 2)
	if err != nil {
		t.Fatalf("unexpected error resolving track IDs: %v", err)
	}

	expectedIDs := []spotifyclient.ID{
		"track_dont_lose_sight",
		"track_beatles_get_back",
		"track_britney_toxic",
		"track_stevie_superstition",
	}

	if len(trackIDs) != len(expectedIDs) {
		t.Fatalf("expected %d track IDs, got %d (%+v)", len(expectedIDs), len(trackIDs), trackIDs)
	}

	for i, exp := range expectedIDs {
		if trackIDs[i] != exp {
			t.Errorf("trackID[%d]: expected %q, got %q", i, exp, trackIDs[i])
		}
	}
}

func TestTrackMatchesArtist(t *testing.T) {
	tests := []struct {
		name           string
		trackArtists   []string
		expectedArtist string
		want           bool
	}{
		{
			name:           "exact match",
			trackArtists:   []string{"Lawrence"},
			expectedArtist: "Lawrence",
			want:           true,
		},
		{
			name:           "case insensitive match",
			trackArtists:   []string{"lawrence"},
			expectedArtist: "Lawrence",
			want:           true,
		},
		{
			name:           "reject different artist containing name",
			trackArtists:   []string{"Tim Lawrence"},
			expectedArtist: "Lawrence",
			want:           false,
		},
		{
			name:           "reject another different artist containing name",
			trackArtists:   []string{"Tracy Lawrence"},
			expectedArtist: "Lawrence",
			want:           false,
		},
		{
			name:           "the prefix match",
			trackArtists:   []string{"The Beatles"},
			expectedArtist: "Beatles",
			want:           true,
		},
		{
			name:           "the prefix reverse match",
			trackArtists:   []string{"Beatles"},
			expectedArtist: "The Beatles",
			want:           true,
		},
		{
			name:           "collaboration contains expected artist",
			trackArtists:   []string{"Lawrence", "Brasstracks"},
			expectedArtist: "Lawrence",
			want:           true,
		},
		{
			name:           "collaboration does not contain expected artist",
			trackArtists:   []string{"Tracy Lawrence", "Friends"},
			expectedArtist: "Lawrence",
			want:           false,
		},
		{
			name:           "nil track",
			trackArtists:   nil,
			expectedArtist: "Lawrence",
			want:           false,
		},
		{
			name:           "empty expected artist",
			trackArtists:   []string{"Lawrence"},
			expectedArtist: "",
			want:           true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			var track *spotifyclient.FullTrack
			if tc.trackArtists != nil {
				track = &spotifyclient.FullTrack{}
				for _, a := range tc.trackArtists {
					track.Artists = append(track.Artists, spotifyclient.SimpleArtist{Name: a})
				}
			}
			got := TrackMatchesArtist(track, tc.expectedArtist)
			if got != tc.want {
				t.Errorf("TrackMatchesArtist() = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestSearchTrackQueriesOrder(t *testing.T) {
	var capturedQueries []string
	transport := roundTripperFunc(func(r *http.Request) (*http.Response, error) {
		q := r.URL.Query().Get("q")
		capturedQueries = append(capturedQueries, q)

		// Always return empty to observe full query fallback chain
		res := struct {
			Tracks struct {
				Items []struct {
					ID string `json:"id"`
				} `json:"items"`
			} `json:"tracks"`
		}{}
		bodyBytes, _ := json.Marshal(res)
		rec := &http.Response{
			StatusCode: http.StatusOK,
			Header:     make(http.Header),
			Body:       io.NopCloser(bytes.NewReader(bodyBytes)),
		}
		rec.Header.Set("Content-Type", "application/json")
		return rec, nil
	})

	httpClient := &http.Client{Transport: transport}
	client := spotifyclient.New(httpClient)
	ctx := context.Background()

	// Test cover song query order
	capturedQueries = nil
	_, _ = SearchTrack(ctx, client, "Lawrence", SongQuery{Name: "Toxic", CoverArtist: "Britney Spears"})
	expectedCoverOrder := []string{
		"artist:Lawrence track:Toxic",
		"artist:Britney Spears track:Toxic",
		"Britney Spears Toxic",
		"Lawrence Toxic",
	}
	if len(capturedQueries) != len(expectedCoverOrder) {
		t.Fatalf("expected %d queries for cover, got %d: %v", len(expectedCoverOrder), len(capturedQueries), capturedQueries)
	}
	for i, q := range expectedCoverOrder {
		if capturedQueries[i] != q {
			t.Errorf("cover query[%d]: expected %q, got %q", i, q, capturedQueries[i])
		}
	}

	// Test non-cover song query order
	capturedQueries = nil
	_, _ = SearchTrack(ctx, client, "Lawrence", SongQuery{Name: "Do", CoverArtist: ""})
	expectedNonCoverOrder := []string{
		"artist:Lawrence track:Do",
		"Lawrence Do",
	}
	if len(capturedQueries) != len(expectedNonCoverOrder) {
		t.Fatalf("expected %d queries for non-cover, got %d: %v", len(expectedNonCoverOrder), len(capturedQueries), capturedQueries)
	}
	for i, q := range expectedNonCoverOrder {
		if capturedQueries[i] != q {
			t.Errorf("non-cover query[%d]: expected %q, got %q", i, q, capturedQueries[i])
		}
	}
}

func TestPlaylistClientCreation(t *testing.T) {
	tok := &oauth2.Token{
		AccessToken: "mock-token",
		TokenType:   "Bearer",
	}
	ctx := context.Background()
	client := spotifyclient.New(oauth2.NewClient(ctx, oauth2.StaticTokenSource(tok)))
	if client == nil {
		t.Fatal("expected spotify client to not be nil")
	}
}

