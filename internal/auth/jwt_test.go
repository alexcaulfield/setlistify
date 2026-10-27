package auth

import (
	"testing"
	"time"

	"golang.org/x/oauth2"
)

func TestEncodeAndDecodeToken(t *testing.T) {
	secret := "super-secret-key-12345"
	original := &oauth2.Token{
		AccessToken:  "test-access-token",
		TokenType:    "Bearer",
		RefreshToken: "test-refresh-token",
		Expiry:       time.Now().Add(1 * time.Hour).Truncate(time.Second),
	}

	encoded, err := EncodeToken(original, secret)
	if err != nil {
		t.Fatalf("unexpected error encoding token: %v", err)
	}
	if encoded == "" {
		t.Fatal("expected non-empty token string")
	}

	decoded, err := DecodeToken(encoded, secret)
	if err != nil {
		t.Fatalf("unexpected error decoding token: %v", err)
	}

	if decoded.AccessToken != original.AccessToken {
		t.Errorf("expected access token %q, got %q", original.AccessToken, decoded.AccessToken)
	}
	if decoded.TokenType != original.TokenType {
		t.Errorf("expected token type %q, got %q", original.TokenType, decoded.TokenType)
	}
	if decoded.RefreshToken != original.RefreshToken {
		t.Errorf("expected refresh token %q, got %q", original.RefreshToken, decoded.RefreshToken)
	}
	if !decoded.Expiry.Equal(original.Expiry) {
		t.Errorf("expected expiry %v, got %v", original.Expiry, decoded.Expiry)
	}
}

func TestDecodeWithWrongSecret(t *testing.T) {
	token := &oauth2.Token{AccessToken: "token123"}
	encoded, err := EncodeToken(token, "correct-secret")
	if err != nil {
		t.Fatalf("encode error: %v", err)
	}

	_, err = DecodeToken(encoded, "wrong-secret")
	if err == nil {
		t.Fatal("expected error when decoding with wrong secret, got nil")
	}
}

func TestDecodeInvalidToken(t *testing.T) {
	_, err := DecodeToken("not-a-valid-jwt", "secret")
	if err == nil {
		t.Fatal("expected error decoding invalid token string, got nil")
	}
}

