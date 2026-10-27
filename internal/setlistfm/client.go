package setlistfm

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

const defaultBaseURL = "https://api.setlist.fm/rest/1.0"

// Client interacts with the Setlist.fm REST API v1.0.
type Client struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

// Option configures a Client.
type Option func(*Client)

// WithBaseURL overrides the default Setlist.fm base URL (useful for testing).
func WithBaseURL(u string) Option {
	return func(c *Client) {
		c.baseURL = u
	}
}

// WithHTTPClient overrides the default HTTP client.
func WithHTTPClient(hc *http.Client) Option {
	return func(c *Client) {
		c.httpClient = hc
	}
}

// NewClient creates a new Setlist.fm API client.
func NewClient(apiKey string, opts ...Option) *Client {
	c := &Client{
		apiKey:  apiKey,
		baseURL: defaultBaseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

func (c *Client) doRequest(ctx context.Context, endpoint string, query url.Values, target any) error {
	reqURL := fmt.Sprintf("%s%s", c.baseURL, endpoint)
	if len(query) > 0 {
		reqURL = fmt.Sprintf("%s?%s", reqURL, query.Encode())
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return fmt.Errorf("create setlist.fm request: %w", err)
	}

	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("execute setlist.fm request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return ErrNotFound
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("setlist.fm responded with status %d", resp.StatusCode)
	}

	if target != nil {
		if err := json.NewDecoder(resp.Body).Decode(target); err != nil {
			return fmt.Errorf("decode setlist.fm response: %w", err)
		}
	}
	return nil
}

// ErrNotFound indicates Setlist.fm returned 404 (e.g. no setlists or artist not found).
var ErrNotFound = fmt.Errorf("resource not found")

// SearchArtists searches for artists by name.
func (c *Client) SearchArtists(ctx context.Context, artistName string, page int) (*ArtistsResponse, error) {
	if page < 1 {
		page = 1
	}
	q := url.Values{
		"artistName": {artistName},
		"p":          {fmt.Sprintf("%d", page)},
		"sort":       {"sortName"},
	}

	var res ArtistsResponse
	err := c.doRequest(ctx, "/search/artists", q, &res)
	if err != nil {
		if err == ErrNotFound {
			return &ArtistsResponse{Artist: []Artist{}}, nil
		}
		return nil, err
	}
	return &res, nil
}

// GetArtistSetlists retrieves setlists for an artist by MBID.
func (c *Client) GetArtistSetlists(ctx context.Context, mbid string, page int) (*SetlistsResponse, error) {
	if page < 1 {
		page = 1
	}
	q := url.Values{
		"p": {fmt.Sprintf("%d", page)},
	}

	var res SetlistsResponse
	err := c.doRequest(ctx, fmt.Sprintf("/artist/%s/setlists", url.PathEscape(mbid)), q, &res)
	if err != nil {
		if err == ErrNotFound {
			return &SetlistsResponse{Setlist: []Setlist{}}, nil
		}
		return nil, err
	}
	return &res, nil
}

// SearchSetlistsByArtist searches for setlists by artist name directly.
func (c *Client) SearchSetlistsByArtist(ctx context.Context, artistName string, page int) (*SetlistsResponse, error) {
	if page < 1 {
		page = 1
	}
	q := url.Values{
		"artistName": {artistName},
		"p":          {fmt.Sprintf("%d", page)},
	}

	var res SetlistsResponse
	err := c.doRequest(ctx, "/search/setlists", q, &res)
	if err != nil {
		if err == ErrNotFound {
			return &SetlistsResponse{Setlist: []Setlist{}}, nil
		}
		return nil, err
	}
	return &res, nil
}

// GetSetlist retrieves a specific setlist by ID.
func (c *Client) GetSetlist(ctx context.Context, setlistID string) (*Setlist, error) {
	var res Setlist
	err := c.doRequest(ctx, fmt.Sprintf("/setlist/%s", url.PathEscape(setlistID)), nil, &res)
	if err != nil {
		return nil, err
	}
	return &res, nil
}

