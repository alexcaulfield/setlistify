package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/oauth2"
)

var (
	ErrInvalidToken = errors.New("invalid or expired token")
	ErrNoSecretKey  = errors.New("secret key is required")
)

// EncodeToken signs an oauth2.Token into an HS256 JWT using the provided secret key.
func EncodeToken(token *oauth2.Token, secretKey string) (string, error) {
	if secretKey == "" {
		return "", ErrNoSecretKey
	}
	if token == nil {
		return "", errors.New("nil token cannot be encoded")
	}

	claims := jwt.MapClaims{
		"access_token":  token.AccessToken,
		"token_type":    token.TokenType,
		"refresh_token": token.RefreshToken,
	}
	if !token.Expiry.IsZero() {
		claims["expires_at"] = token.Expiry.Unix()
		claims["exp"] = token.Expiry.Unix()
	}

	jwtToken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return jwtToken.SignedString([]byte(secretKey))
}

// DecodeToken verifies and parses an HS256 JWT into an oauth2.Token.
func DecodeToken(tokenStr string, secretKey string) (*oauth2.Token, error) {
	if secretKey == "" {
		return nil, ErrNoSecretKey
	}
	if tokenStr == "" {
		return nil, ErrInvalidToken
	}

	parsedToken, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secretKey), nil
	})
	if err != nil || !parsedToken.Valid {
		return nil, ErrInvalidToken
	}

	claims, ok := parsedToken.Claims.(jwt.MapClaims)
	if !ok {
		return nil, ErrInvalidToken
	}

	accessToken, _ := claims["access_token"].(string)
	if accessToken == "" {
		return nil, errors.New("token missing access_token claim")
	}

	tokenType, _ := claims["token_type"].(string)
	if tokenType == "" {
		tokenType = "Bearer"
	}

	refreshToken, _ := claims["refresh_token"].(string)

	tok := &oauth2.Token{
		AccessToken:  accessToken,
		TokenType:    tokenType,
		RefreshToken: refreshToken,
	}

	if expVal, exists := claims["expires_at"]; exists {
		switch v := expVal.(type) {
		case float64:
			tok.Expiry = time.Unix(int64(v), 0)
		case int64:
			tok.Expiry = time.Unix(v, 0)
		}
	} else if expVal, exists := claims["exp"]; exists {
		switch v := expVal.(type) {
		case float64:
			tok.Expiry = time.Unix(int64(v), 0)
		case int64:
			tok.Expiry = time.Unix(v, 0)
		}
	}

	return tok, nil
}

