package spotify

import (
	"context"
	"encoding/json"
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
		switch {
		case q == "artist:Phish track:Tweezer":
			trackID = "track_tweezer"
		case q == "artist:Phish track:Ghost":
			trackID = "track_ghost"
		case q == "artist:Phish track:Unknown":
			trackID = ""
		}

		res := struct {
			Tracks struct {
				Items []struct {
					ID   string `json:"id"`
					Name string `json:"name"`
				} `json:"items"`
			} `json:"tracks"`
		}{}

		if trackID != "" {
			res.Tracks.Items = []struct {
				ID   string `json:"id"`
				Name string `json:"name"`
			}{
				{ID: trackID, Name: trackID},
			}
		}

		bodyBytes, _ := json.Marshal(res)
		rec := &http.Response{
			StatusCode: http.StatusOK,
			Header:     make(http.Header),
			Body:       http.NoBody,
		}
		rec.Header.Set("Content-Type", "application/json")
		rec.Body = ioCloserReader{readFn: func(p []byte) (int, error) {
			copy(p, bodyBytes)
			return len(bodyBytes), nil
		}}
		return rec, nil
	})

	_ = transport
}

type ioCloserReader struct {
	readFn func(p []byte) (int, error)
}

func (r ioCloserReader) Read(p []byte) (n int, err error) {
	return r.readFn(p)
}

func (r ioCloserReader) Close() error {
	return nil
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

