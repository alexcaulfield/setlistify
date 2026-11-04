package config_test

import (
	"os"
	"testing"

	"github.com/alexcaulfield/setlistify/internal/config"
)

func TestConfigLoadDefaults(t *testing.T) {
	os.Clearenv()

	// Default offline behavior
	os.Setenv("IS_OFFLINE", "true")
	cfg := config.Load()
	if cfg.RedirectURI != "http://127.0.0.1:3000/callback" {
		t.Errorf("expected local redirect URI, got %q", cfg.RedirectURI)
	}

	// Production default when IS_OFFLINE is false
	os.Setenv("IS_OFFLINE", "false")
	cfg = config.Load()
	if cfg.RedirectURI != "https://setlistify.app/callback" {
		t.Errorf("expected prod redirect URI, got %q", cfg.RedirectURI)
	}

	// Guards against accidental production REDIRECT_URI in local development
	os.Setenv("IS_OFFLINE", "true")
	os.Setenv("REDIRECT_URI", "https://setlistify.app/callback")
	cfg = config.Load()
	if cfg.RedirectURI != "http://127.0.0.1:3000/callback" {
		t.Errorf("expected override to local redirect URI, got %q", cfg.RedirectURI)
	}

	// Allows explicit custom local redirect URI
	os.Setenv("REDIRECT_URI", "http://localhost:3000/callback")
	cfg = config.Load()
	if cfg.RedirectURI != "http://localhost:3000/callback" {
		t.Errorf("expected custom local redirect URI, got %q", cfg.RedirectURI)
	}
}

