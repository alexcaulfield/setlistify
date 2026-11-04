package httputil

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/alexcaulfield/setlistify/internal/config"
)

type dummyReq struct {
	Name string `json:"name"`
}

type dummyRes struct {
	Greeting string `json:"greeting"`
}

func TestHandle(t *testing.T) {
	t.Run("CORS preflight returns 204", func(t *testing.T) {
		fn := func(ctx context.Context, cfg *config.Config, req dummyReq) (dummyRes, error) {
			return dummyRes{Greeting: "hi"}, nil
		}
		handler := Handle(http.MethodPost, fn)

		req := httptest.NewRequest(http.MethodOptions, "/test", nil)
		rec := httptest.NewRecorder()
		handler(rec, req)

		if rec.Code != http.StatusNoContent {
			t.Errorf("expected status 204, got %d", rec.Code)
		}
	})

	t.Run("Method mismatch returns 405", func(t *testing.T) {
		fn := func(ctx context.Context, cfg *config.Config, req dummyReq) (dummyRes, error) {
			return dummyRes{Greeting: "hi"}, nil
		}
		handler := Handle(http.MethodPost, fn)

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		rec := httptest.NewRecorder()
		handler(rec, req)

		if rec.Code != http.StatusMethodNotAllowed {
			t.Errorf("expected status 405, got %d", rec.Code)
		}

		var errRes ErrorResponse
		_ = json.Unmarshal(rec.Body.Bytes(), &errRes)
		if errRes.Type != "MethodNotAllowed" {
			t.Errorf("expected error type MethodNotAllowed, got %q", errRes.Type)
		}
	})

	t.Run("Invalid JSON returns 400", func(t *testing.T) {
		fn := func(ctx context.Context, cfg *config.Config, req dummyReq) (dummyRes, error) {
			return dummyRes{Greeting: "hi"}, nil
		}
		handler := Handle(http.MethodPost, fn)

		req := httptest.NewRequest(http.MethodPost, "/test", strings.NewReader("bad json"))
		rec := httptest.NewRecorder()
		handler(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected status 400, got %d", rec.Code)
		}

		var errRes ErrorResponse
		_ = json.Unmarshal(rec.Body.Bytes(), &errRes)
		if errRes.Type != "BadRequest" {
			t.Errorf("expected error type BadRequest, got %q", errRes.Type)
		}
	})

	t.Run("GET requests skip JSON decoding", func(t *testing.T) {
		fn := func(ctx context.Context, cfg *config.Config, req struct{}) (dummyRes, error) {
			return dummyRes{Greeting: "hello get"}, nil
		}
		handler := Handle(http.MethodGet, fn)

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		rec := httptest.NewRecorder()
		handler(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rec.Code)
		}

		var res dummyRes
		_ = json.Unmarshal(rec.Body.Bytes(), &res)
		if res.Greeting != "hello get" {
			t.Errorf("expected Greeting %q, got %q", "hello get", res.Greeting)
		}
	})

	t.Run("APIError is translated to status and error type", func(t *testing.T) {
		fn := func(ctx context.Context, cfg *config.Config, req dummyReq) (dummyRes, error) {
			return dummyRes{}, NewAPIError(http.StatusUnauthorized, "CustomAuthError", "unauthorized access")
		}
		handler := Handle(http.MethodPost, fn)

		req := httptest.NewRequest(http.MethodPost, "/test", strings.NewReader(`{"name":"test"}`))
		rec := httptest.NewRecorder()
		handler(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected status 401, got %d", rec.Code)
		}

		var errRes ErrorResponse
		_ = json.Unmarshal(rec.Body.Bytes(), &errRes)
		if errRes.Type != "CustomAuthError" || errRes.Error != "unauthorized access" {
			t.Errorf("unexpected error response: %+v", errRes)
		}
	})

	t.Run("Standard error returns 500 ServerError", func(t *testing.T) {
		fn := func(ctx context.Context, cfg *config.Config, req dummyReq) (dummyRes, error) {
			return dummyRes{}, errors.New("database failure")
		}
		handler := Handle(http.MethodPost, fn)

		req := httptest.NewRequest(http.MethodPost, "/test", strings.NewReader(`{"name":"test"}`))
		rec := httptest.NewRecorder()
		handler(rec, req)

		if rec.Code != http.StatusInternalServerError {
			t.Errorf("expected status 500, got %d", rec.Code)
		}

		var errRes ErrorResponse
		_ = json.Unmarshal(rec.Body.Bytes(), &errRes)
		if errRes.Type != "ServerError" || errRes.Error != "database failure" {
			t.Errorf("unexpected error response: %+v", errRes)
		}
	})

	t.Run("Success returns 200 with JSON payload", func(t *testing.T) {
		fn := func(ctx context.Context, cfg *config.Config, req dummyReq) (dummyRes, error) {
			return dummyRes{Greeting: "hello " + req.Name}, nil
		}
		handler := Handle(http.MethodPost, fn)

		req := httptest.NewRequest(http.MethodPost, "/test", strings.NewReader(`{"name":"Alice"}`))
		rec := httptest.NewRecorder()
		handler(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rec.Code)
		}

		var res dummyRes
		_ = json.Unmarshal(rec.Body.Bytes(), &res)
		if res.Greeting != "hello Alice" {
			t.Errorf("expected Greeting 'hello Alice', got %q", res.Greeting)
		}
	})
}

