package config

import (
	"os"
	"strings"
)

type Config struct {
	SpotifyClientID     string
	SpotifyClientSecret string
	SetlistFMAPIKey     string
	AppSecretKey        string
	RedirectURI         string
	Scope               string
	ShowDialog          bool
}

func Load() Config {
	isOffline := strings.EqualFold(os.Getenv("IS_OFFLINE"), "true") || os.Getenv("IS_OFFLINE") == "1"
	redirectURI := os.Getenv("REDIRECT_URI")
	if redirectURI == "" {
		if isOffline {
			redirectURI = "http://127.0.0.1:3000/callback"
		} else {
			redirectURI = "https://setlistify.app/callback"
		}
	}
	scope := os.Getenv("SCOPE")
	if scope == "" {
		scope = "playlist-modify-public"
	}
	return Config{
		SpotifyClientID:     os.Getenv("SPOTIFY_CLIENT_ID"),
		SpotifyClientSecret: os.Getenv("SPOTIFY_CLIENT_SECRET"),
		SetlistFMAPIKey:     os.Getenv("SETLIST_FM_API_KEY"),
		AppSecretKey:        os.Getenv("APP_SECRET_KEY"),
		RedirectURI:         redirectURI,
		Scope:               scope,
		ShowDialog:          true,
	}
}
