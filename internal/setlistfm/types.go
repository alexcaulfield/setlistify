package setlistfm

// Artist represents a musical artist in Setlist.fm.
type Artist struct {
	MBID           string `json:"mbid"`
	Name           string `json:"name"`
	SortName       string `json:"sortName,omitempty"`
	Disambiguation string `json:"disambiguation,omitempty"`
	URL            string `json:"url,omitempty"`
}

// City represents a city location.
type City struct {
	ID        string  `json:"id,omitempty"`
	Name      string  `json:"name"`
	State     string  `json:"state,omitempty"`
	StateCode string  `json:"stateCode,omitempty"`
	Country   Country `json:"country"`
	Coords    Coords  `json:"coords,omitempty"`
}

// Country represents a country.
type Country struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

// Coords represents geographical coordinates.
type Coords struct {
	Lat  float64 `json:"lat,omitempty"`
	Long float64 `json:"long,omitempty"`
}

// Venue represents the concert venue.
type Venue struct {
	ID   string `json:"id,omitempty"`
	Name string `json:"name"`
	City City   `json:"city"`
	URL  string `json:"url,omitempty"`
}

// Song represents an individual track in a set.
type Song struct {
	Name  string  `json:"name"`
	With  *Artist `json:"with,omitempty"`
	Cover *Artist `json:"cover,omitempty"`
	Info  string  `json:"info,omitempty"`
	Tape  bool    `json:"tape,omitempty"`
}

// Set represents a main set or encore containing songs.
type Set struct {
	Name   string `json:"name,omitempty"`
	Encore int    `json:"encore,omitempty"`
	Song   []Song `json:"song"`
}

// Sets contains list of sets.
type Sets struct {
	Set []Set `json:"set"`
}

// Setlist represents a concert setlist in Setlist.fm.
type Setlist struct {
	ID          string `json:"id"`
	VersionID   string `json:"versionId,omitempty"`
	EventDate   string `json:"eventDate"`
	LastUpdated string `json:"lastUpdated,omitempty"`
	Artist      Artist `json:"artist"`
	Venue       Venue  `json:"venue"`
	Sets        Sets   `json:"sets"`
	URL         string `json:"url,omitempty"`
}

// SetlistsResponse represents the paginated response for setlists.
type SetlistsResponse struct {
	Type         string    `json:"type,omitempty"`
	ItemsPerPage int       `json:"itemsPerPage"`
	Page         int       `json:"page"`
	Total        int       `json:"total"`
	Setlist      []Setlist `json:"setlist"`
}

// ArtistsResponse represents the paginated response for artist search.
type ArtistsResponse struct {
	Type         string   `json:"type,omitempty"`
	ItemsPerPage int      `json:"itemsPerPage"`
	Page         int      `json:"page"`
	Total        int      `json:"total"`
	Artist       []Artist `json:"artist"`
}

