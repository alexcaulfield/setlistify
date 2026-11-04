package httputil

import (
	"context"
	"errors"
	"net/http"

	"github.com/alexcaulfield/setlistify/internal/config"
)

// HandlerFunc is a typed handler that returns a response or an error.
// The error, if non-nil, should be an *APIError to control status code and type.
type HandlerFunc[Req any, Res any] func(ctx context.Context, cfg *config.Config, req Req) (Res, error)

// APIError carries HTTP status and error type for the adapter to render.
type APIError struct {
	Status  int
	Type    string
	Message string
	Err     error
}

func (e *APIError) Error() string {
	if e.Message != "" {
		return e.Message
	}
	if e.Err != nil {
		return e.Err.Error()
	}
	return ""
}

func (e *APIError) Unwrap() error {
	return e.Err
}

// NewAPIError creates a new APIError.
func NewAPIError(status int, errType, message string) *APIError {
	return &APIError{
		Status:  status,
		Type:    errType,
		Message: message,
	}
}

// WrapAPIError creates a new APIError wrapping an underlying error.
func WrapAPIError(status int, errType string, err error) *APIError {
	if err == nil {
		return nil
	}
	return &APIError{
		Status:  status,
		Type:    errType,
		Message: err.Error(),
		Err:     err,
	}
}

// Handle wires a typed HandlerFunc into an http.HandlerFunc.
// It handles CORS, method enforcement, config loading, JSON decode, and JSON response.
func Handle[Req any, Res any](method string, fn HandlerFunc[Req, Res]) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if SetCORS(w, r) {
			return
		}
		if r.Method != method {
			WriteError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"), "MethodNotAllowed")
			return
		}
		cfg := config.Load()
		var req Req
		if method != http.MethodGet {
			if err := DecodeJSON(r, &req); err != nil {
				WriteError(w, http.StatusBadRequest, err, "BadRequest")
				return
			}
		}
		res, err := fn(r.Context(), &cfg, req)
		if err != nil {
			var apiErr *APIError
			if errors.As(err, &apiErr) {
				WriteError(w, apiErr.Status, apiErr, apiErr.Type)
			} else {
				WriteError(w, http.StatusInternalServerError, err, "ServerError")
			}
			return
		}
		_ = WriteJSON(w, http.StatusOK, res)
	}
}

