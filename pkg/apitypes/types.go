package apitypes

import (
	"github.com/alexcaulfield/setlistify/pkg/setlistfm"
	spotifyclient "github.com/zmb3/spotify/v2"
)

// AuthUrlResponse is the response body for GET /api/authUrl
type AuthUrlResponse struct {
	AuthURL   string `json:"authUrl"`
	CachePath string `json:"cachePath"` // backwards compat, always ""
}

// GetUserRequest is the request body for POST /api/getUser
type GetUserRequest struct {
	Code      string `json:"code"`
	CachePath string `json:"cache_path,omitempty"`
}

// GetUserResponse is the response body for POST /api/getUser
type GetUserResponse struct {
	User  *spotifyclient.PrivateUser `json:"user"`
	Token string                     `json:"token"`
}

// ArtistSearchRequest is the request body for POST /api/artistSearch
type ArtistSearchRequest struct {
	Token string `json:"token"`
	Query string `json:"query"`
	Limit int    `json:"limit,omitempty"`
}

// ArtistSearchResponse is the response body for POST /api/artistSearch
type ArtistSearchResponse struct {
	Artists []spotifyclient.FullArtist `json:"artists"`
}

// SetlistArtistsRequest is the request body for POST /api/setlistArtists
type SetlistArtistsRequest struct {
	ArtistName string `json:"artistName"`
}

// SetlistArtistsResponse is the response body for POST /api/setlistArtists
type SetlistArtistsResponse struct {
	Artists []setlistfm.Artist `json:"artists"`
}

// ArtistSetlistsRequest is the request body for POST /api/artistSetlists
type ArtistSetlistsRequest struct {
	ArtistName string `json:"artistName"`
	ArtistMbid string `json:"artistMbid"`
}

// ArtistSetlistsResponse is the response body for POST /api/artistSetlists
type ArtistSetlistsResponse struct {
	ArtistSetlists []setlistfm.Setlist `json:"artistSetlists"`
	ArtistMbid     string              `json:"artistMbid,omitempty"`
}

// BuildPlaylistRequest is the request body for POST /api/buildPlaylist
type BuildPlaylistRequest struct {
	Token        string `json:"token"`
	ArtistName   string `json:"artistName"`
	ArtistID     string `json:"artistId,omitempty"`
	ArtistMBID   string `json:"artistMbid,omitempty"`
	PlaylistType string `json:"playlistType"`
	PlaylistID   string `json:"playlistId"`
}

// BuildPlaylistResponse is the response body for POST /api/buildPlaylist
type BuildPlaylistResponse struct {
	PlaylistURI string `json:"playlistUri,omitempty"`
}
