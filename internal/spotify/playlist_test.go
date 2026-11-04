package spotify

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	spotifyclient "github.com/zmb3/spotify/v2"
)

type roundTripperFunc func(*http.Request) (*http.Response, error)

func (f roundTripperFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return f(r)
}

func TestResolveTrackIDs(t *testing.T) {
	transport := roundTripperFunc(func(r *http.Request) (*http.Response, error) {
		q := r.URL.Query().Get("q")
		var trackID string
		switch {
		case q == "artist:Phish track:Tweezer":
			trackID = "track_tweezer"
		case q == "artist:Phish track:Ghost":
			trackID = "track_ghost"
		// "Unknown" and fallback queries return empty results
		}

		type item struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		}
		type tracks struct {
			Items []item `json:"items"`
		}
		type result struct {
			Tracks tracks `json:"tracks"`
		}

		res := result{}
		if trackID != "" {
			res.Tracks.Items = []item{{ID: trackID, Name: trackID}}
		}

		bodyBytes, err := json.Marshal(res)
		if err != nil {
			return nil, err
		}

		rec := httptest.NewRecorder()
		rec.Header().Set("Content-Type", "application/json")
		rec.Write(bodyBytes)
		return rec.Result(), nil
	})

	client := spotifyclient.New(&http.Client{Transport: transport})
	ctx := context.Background()

	// Golden path: known songs resolve in order, unknown song dropped, whitespace skipped
	ids, err := ResolveTrackIDs(ctx, client, "Phish", []string{"Tweezer", "Ghost", "Unknown", "  "}, 3)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(ids) != 2 {
		t.Fatalf("expected 2 track IDs, got %d: %v", len(ids), ids)
	}
	if ids[0] != "track_tweezer" || ids[1] != "track_ghost" {
		t.Errorf("unexpected track IDs: %v", ids)
	}

	// Edge case: empty input returns empty slice without error
	ids, err = ResolveTrackIDs(ctx, client, "Phish", []string{}, 3)
	if err != nil {
		t.Fatalf("unexpected error on empty input: %v", err)
	}
	if len(ids) != 0 {
		t.Errorf("expected 0 track IDs for empty input, got %d", len(ids))
	}
}
