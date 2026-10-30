package spotify

import (
	"context"
	"fmt"

	"github.com/alexcaulfield/setlistify/internal/config"
	spotifyauth "github.com/zmb3/spotify/v2/auth"
	"golang.org/x/oauth2"
)

// Scopes required by Setlistify for creating playlists and reading user info.
var DefaultScopes = []string{
	spotifyauth.ScopeUserReadPrivate,
	spotifyauth.ScopePlaylistModifyPublic,
	spotifyauth.ScopePlaylistModifyPrivate,
}

// Service provides methods to authenticate and interact with Spotify.
type Service struct {
	cfg  *config.Config
	auth *spotifyauth.Authenticator
}

// NewService creates a new Spotify Service from configuration.
func NewService(cfg *config.Config) *Service {
	auth := spotifyauth.New(
		spotifyauth.WithClientID(cfg.SpotifyClientID),
		spotifyauth.WithClientSecret(cfg.SpotifyClientSecret),
		spotifyauth.WithRedirectURL(cfg.RedirectURI),
		spotifyauth.WithScopes(DefaultScopes...),
	)
	return &Service{
		cfg:  cfg,
		auth: auth,
	}
}

// AuthURL returns the Spotify OAuth authorization URL.
func (s *Service) AuthURL(state string) string {
	return s.auth.AuthURL(state)
}

// Exchange converts an authorization code to an oauth2.Token.
func (s *Service) Exchange(ctx context.Context, code string) (*oauth2.Token, error) {
	tok, err := s.auth.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("exchange spotify auth code: %w", err)
	}
	return tok, nil
}

// Authenticator returns the underlying spotifyauth.Authenticator.
func (s *Service) Authenticator() *spotifyauth.Authenticator {
	return s.auth
}

