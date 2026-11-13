package apitypes

// SpotifyFollowers represents follower information for a Spotify entity.
type SpotifyFollowers struct {
	Total int    `json:"total"`
	Href  string `json:"href"`
}

// SpotifyImage represents an image associated with a Spotify entity.
type SpotifyImage struct {
	Height int    `json:"height"`
	Width  int    `json:"width"`
	URL    string `json:"url"`
}

// SpotifySimpleArtist represents the basic Spotify artist information.
type SpotifySimpleArtist struct {
	Name         string            `json:"name"`
	ID           string            `json:"id"`
	URI          string            `json:"uri"`
	Href         string            `json:"href"`
	ExternalURLs map[string]string `json:"external_urls"`
}

// SpotifyFullArtist represents full artist information from Spotify.
type SpotifyFullArtist struct {
	SpotifySimpleArtist `tstype:",extends"`
	Popularity          int              `json:"popularity"`
	Genres              []string         `json:"genres"`
	Followers           SpotifyFollowers `json:"followers"`
	Images              []SpotifyImage   `json:"images"`
}

// SpotifyUser represents a Spotify user profile.
type SpotifyUser struct {
	DisplayName  string            `json:"display_name"`
	ExternalURLs map[string]string `json:"external_urls"`
	Followers    SpotifyFollowers  `json:"followers"`
	Href         string            `json:"href"`
	ID           string            `json:"id"`
	Images       []SpotifyImage    `json:"images"`
	URI          string            `json:"uri"`
}

// SpotifyPrivateUser represents the current authenticated Spotify user profile.
type SpotifyPrivateUser struct {
	SpotifyUser `tstype:",extends"`
	Country     string `json:"country"`
	Email       string `json:"email"`
	Product     string `json:"product"`
	Birthdate   string `json:"birthdate"`
}
