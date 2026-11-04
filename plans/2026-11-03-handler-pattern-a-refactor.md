# Plan: Separate Business Logic from HTTP Transport in Go Vercel Handlers

- **Date:** 2026-11-03
- **Status:** completed

## 1. Overview

Refactor all 6 Go Vercel serverless handlers (`api/*.go`) to follow **Pattern A: Separate Business Logic from HTTP Transport**. Each handler currently mixes HTTP lifecycle concerns (CORS, method checks, JSON decode/encode, error responses) with core business logic inline. This refactoring:

1. **Extracts business logic** into pure, typed functions that accept domain inputs and return `(TypedResponse, error)` — making them independently testable and readable.
2. **DRYs the shared HTTP boilerplate** (CORS, method guard, config load, JSON decode, JSON response) into a single generic handler adapter.
3. **Upgrades `ResolveArtistSetlists`** in `internal/setlistfm/helpers.go` to match the handler's full inline logic, then wires it in.
4. **Creates a global skill** (`go-vercel-handlers`) documenting this pattern for future projects.

---

## 2. Architectural Decisions

### 2.1 Generic Handler Adapter (`internal/httputil/adapter.go`)

A new generic function replaces the repeated boilerplate in every handler:

```go
// HandlerFunc is a typed handler that returns a response or an error.
// The error, if non-nil, should be an *APIError to control status code and type.
type HandlerFunc[Req any, Res any] func(ctx context.Context, cfg *config.Config, req Req) (Res, error)

// APIError carries HTTP status and error type for the adapter to render.
type APIError struct {
    Status  int
    Type    string
    Message string
}

func (e *APIError) Error() string { return e.Message }

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
                WriteError(w, apiErr.Status, err, apiErr.Type)
            } else {
                WriteError(w, http.StatusInternalServerError, err, "ServerError")
            }
            return
        }
        _ = WriteJSON(w, http.StatusOK, res)
    }
}
```

> [!NOTE]
> `AuthUrl` is a GET with no request body. The adapter skips `DecodeJSON` when `method == http.MethodGet`. The `Req` type can be `struct{}` for bodyless endpoints.

### 2.2 Extracted Business Logic Functions

Each handler gets a pure counterpart. These live in the **same `api/` package** (not moved to `internal/`) since they're the service layer for Vercel entry points:

| Handler File | Current Exported Func | New Business Logic Func | Signature |
|---|---|---|---|
| `authUrl.go` | `AuthUrl` | `getAuthURL` | `(ctx, cfg) → (authUrlResponse, error)` |
| `artistSearch.go` | `ArtistSearch` | `searchArtists` | `(ctx, cfg, req) → (artistSearchResponse, error)` |
| `setlistArtists.go` | `SetlistArtists` | `searchSetlistArtists` | `(ctx, cfg, req) → (setlistArtistsResponse, error)` |
| `artistSetlists.go` | `ArtistSetlists` | `resolveArtistSetlists` | `(ctx, cfg, req) → (artistSetlistsResponse, error)` |
| `getUser.go` | `GetUser` | `exchangeCodeForUser` | `(ctx, cfg, req) → (getUserResponse, error)` |
| `buildPlaylist.go` | `BuildPlaylist` | `buildPlaylist` | `(ctx, cfg, req) → (buildPlaylistResponse, error)` |

The exported `HandlerFunc` becomes a one-liner adapter call:

```go
// ArtistSetlists handles POST /api/artistSetlists
func ArtistSetlists(w http.ResponseWriter, r *http.Request) {
    httputil.Handle(http.MethodPost, resolveArtistSetlists)(w, r)
}
```

### 2.3 Upgrade `ResolveArtistSetlists` Helper

The existing [`ResolveArtistSetlists`](file:///Users/alexcaulfield/src/setlistify/internal/setlistfm/helpers.go#L56-L90) returns `([]Setlist, error)` — it lacks the MBID, exact-name matching, `SetlistHasSongs` preference, and partial-name fallback that the handler does inline.

**Changes to `internal/setlistfm/helpers.go`:**

```go
// ResolveResult holds the resolved setlists and the chosen artist MBID.
type ResolveResult struct {
    Setlists []Setlist
    MBID     string
}

// ResolveArtistSetlists resolves setlists for an artist.
// If mbid is non-empty, fetches directly.
// Otherwise searches by name with exact-match priority, SetlistHasSongs preference,
// and SearchSetlistsByArtist fallback with partial-name filtering.
func ResolveArtistSetlists(ctx context.Context, client *Client, artistName, mbid string) (*ResolveResult, error)
```

The function absorbs the full logic currently inline in [`artistSetlists.go` L46–160](file:///Users/alexcaulfield/src/setlistify/api/artistSetlists.go#L46-L160):
- **Path 1:** MBID provided → `GetArtistSetlists` direct lookup
- **Path 2:** Name provided → `SearchArtists` → exact-match filter → cap candidates at 3 → iterate with `SetlistHasSongs` preference → keep best fallback
- **Path 3:** `SearchSetlistsByArtist` → exact/partial name filter
- **Path 4:** Return empty setlists

This is a **breaking change** to the helper's signature (adds `mbid` param, returns `*ResolveResult` instead of `[]Setlist`). The existing tests in `helpers_test.go` will be updated accordingly.

### 2.4 Spotify Client Construction Helper

Three handlers duplicate:
```go
spotifyclient.New(oauth2.NewClient(ctx, oauth2.StaticTokenSource(oauthToken)))
```

Add a helper to `internal/spotify/client.go`:
```go
// NewUserClient creates a Spotify client authenticated with the given OAuth token.
func NewUserClient(ctx context.Context, token *oauth2.Token) *spotifyclient.Client {
    return spotifyclient.New(oauth2.NewClient(ctx, oauth2.StaticTokenSource(token)))
}
```

### 2.5 `authUrl.go` Response Type

Currently returns an untyped `map[string]string`. Replace with a proper struct:
```go
type authUrlResponse struct {
    AuthURL   string `json:"authUrl"`
    CachePath string `json:"cachePath"` // backwards compat, always ""
}
```

---

## 3. Step-by-Step Implementation Details

### Phase 1: Infrastructure (no behavior change)

- [x] **Task 1.1:** Create `internal/httputil/adapter.go` — define `HandlerFunc[Req, Res]`, `APIError`, and `Handle[Req, Res]()`.
- [x] **Task 1.2:** Add `NewUserClient` helper to `internal/spotify/client.go`.
- [x] **Task 1.3:** Create `authUrlResponse` struct in `api/authUrl.go`.

### Phase 2: Upgrade `ResolveArtistSetlists`

- [x] **Task 2.1:** Add `ResolveResult` struct to `internal/setlistfm/helpers.go`.
- [x] **Task 2.2:** Rewrite `ResolveArtistSetlists` to accept `(ctx, client, artistName, mbid)` and return `(*ResolveResult, error)` with full logic from the handler (exact-match, `SetlistHasSongs`, partial-name fallback).
- [x] **Task 2.3:** Update `helpers_test.go` — adapt existing `TestResolveArtistSetlists` to the new signature and add test cases for: MBID direct lookup, exact-match preference, `SetlistHasSongs` preference, partial-name fallback, empty result.

### Phase 3: Refactor handlers (one at a time, simplest → most complex)

- [x] **Task 3.1:** Refactor `authUrl.go` — extract `getAuthURL`, wire through `Handle`.
- [x] **Task 3.2:** Refactor `setlistArtists.go` — extract `searchSetlistArtists`, wire through `Handle`.
- [x] **Task 3.3:** Refactor `artistSearch.go` — extract `searchArtists`, wire through `Handle`. Use `NewUserClient`.
- [x] **Task 3.4:** Refactor `getUser.go` — extract `exchangeCodeForUser`, wire through `Handle`. Use `NewUserClient`.
- [x] **Task 3.5:** Refactor `artistSetlists.go` — extract `resolveArtistSetlists` which delegates to the upgraded `setlistfm.ResolveArtistSetlists`. Wire through `Handle`.
- [x] **Task 3.6:** Refactor `buildPlaylist.go` — extract `buildPlaylist` (lowercase, unexported). Use `NewUserClient`. Wire through `Handle`.

### Phase 4: Update tests and dev server

- [x] **Task 4.1:** Verify existing `handlers_test.go` tests still pass (they test the exported `HandlerFunc` which hasn't changed signature).
- [x] **Task 4.2:** Add unit tests for extracted business logic functions (at least `resolveArtistSetlists` and `buildPlaylist` using mock clients).
- [x] **Task 4.3:** Verify `cmd/devserver/main.go` registration still works (exported handler names unchanged).

### Phase 5: Global skill

- [x] **Task 5.1:** Create `~/src/.agents/skills/go-vercel-handlers/SKILL.md` documenting the Pattern A convention for Go Vercel serverless handlers.

### Phase 6: Documentation

- [x] **Task 6.1:** Update `ARCHITECTURE.md` to document the handler adapter pattern and business logic separation convention.

---

## 4. Verification Plan

### Automated Tests
```bash
# Run all Go tests (existing + new)
go test -v ./...
```

### Manual Verification
1. Start the dev server: `go run ./cmd/devserver`
2. Start the React frontend: `yarn start`
3. Walk through the full flow:
   - Load app → verify `/api/authUrl` returns auth URL
   - Log in via Spotify → verify `/api/getUser` returns user + token
   - Search for an artist → verify `/api/artistSearch` returns results
   - Select an artist → verify `/api/artistSetlists` returns setlists (test both MBID path and name-search path)
   - Build a playlist → verify `/api/buildPlaylist` creates it on Spotify
4. Verify Vercel deployment builds successfully (Go functions must compile).

---

## 5. Potential Risks & Maintenance Concerns

### Low Risk
- **Signature stability:** The exported handler functions (`ArtistSetlists`, `BuildPlaylist`, etc.) keep the same `func(w, r)` signature. Vercel and `cmd/devserver` call sites are unaffected.
- **`ResolveArtistSetlists` breaking change:** The function is currently unused by any handler, so the signature change only affects its own tests (which we update in Task 2.3).

### Medium Risk
- **Generic adapter and Go version:** `Handle[Req, Res]` uses Go generics (1.18+). The project uses Go 1.22+, so this is fine. However, Vercel's Go builder must also support 1.18+ (it does — [Vercel supports Go 1.21+](https://vercel.com/docs/functions/runtimes/go)).
- **`config.Load()` called per-request:** The adapter calls `config.Load()` on every request (same as today). This reads env vars each time. This is idiomatic for serverless (cold starts), but could be optimized later with a sync.Once if needed.

### Future Consideration
- **Dependency injection for testing:** The extracted business logic functions still construct clients internally (`setlistfm.NewClient(cfg.SetlistFMAPIKey)`). A future iteration could accept client interfaces for full mock-based unit testing. For now, the separation already enables testing the logic without an `http.ResponseWriter`.
