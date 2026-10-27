# Plan: Refactor Backend to Go Serverless Functions and Migrate to Vercel

- **Date:** 2026-10-26
- **Status:** proposed

## 1. Overview

Refactor the Setlistify backend from a monolithic Python/Flask application deployed on AWS Lambda (via Serverless Framework + WSGI) to modular **Go Serverless Functions** (`api/*.go`) hosted alongside the React SPA on **Vercel**.

### Objectives
- **Unify Hosting & Deployment:** Consolidate frontend (currently Netlify) and backend (currently AWS Lambda + API Gateway) into a single Vercel project served from the same origin (`/api/*`), eliminating cross-origin deployment drift and manual Serverless CLI deployments.
- **Stateless OAuth Flow:** Remove Spotipy's ephemeral filesystem cache workaround (`/tmp/.cache` and `cachePath` round-tripping) and Flask filesystem sessions (`/tmp/flask_session`) in favor of a completely stateless Spotify OAuth 2.0 + HS256 JWT flow.
- **Concurrent Track Resolution:** Replace sequential `for` loop Spotify track lookups in `/buildPlaylist` with bounded concurrent goroutines (`errgroup`), reducing playlist generation latency from ~5–15 seconds to under 1 second.
- **Per-Endpoint Polyglot Flexibility:** Structure endpoints as individual `api/*.go` handlers so future endpoints can be written in Go, TypeScript, or Python independently.
- **Future-Ready Domain Models:** Parse and type Setlist.fm concert venue and geolocation (`lat`/`long`) data in Go structs so a Supabase PostgreSQL store can be dropped in later for playlist history and concert map visualizations without changing API contracts.

---

## 2. Architectural Decisions

### Alignment with `ARCHITECTURE.md`
- **Same-Origin API Boundary (`/api/*`):** Replaces the split Netlify + AWS API Gateway boundary (`https://aahxozyk09.execute-api.us-east-1.amazonaws.com/dev`) with same-origin `/api/*` routes. `src/utils/dev_env.ts` will return `'/api'` by default.
- **Preserved Frontend-Backend Contract:** All JSON response shapes consumed by the React components (`{ authUrl }`, `{ user, token }`, `{ artists }`, `{ artistSetlists, artistMbid }`, `{ playlistUri }`) remain backwards-compatible, except for dropping the obsolete `cachePath` field.
- **Omission of Unfinished Stubs:** The non-functional `Producer` and `Songwriter` placeholder stubs from `flask-app/spotify_helpers.py` are omitted to keep the Go codebase focused on concert setlist playlist generation.
- **Staged Deprecation of `flask-app/`:** `flask-app/` and `netlify.toml` will remain untouched during implementation and testing, and will be removed in a final cleanup step once the Vercel deployment is verified in production.

### Go Module & Directory Structure
To prevent Go compiler duplicate symbol errors (`Handler redeclared in this block`) when multiple `.go` files reside in `api/`, each `api/<endpoint>.go` file will belong to `package handler` and export a uniquely named `http.HandlerFunc` (e.g., `func AuthUrl(w http.ResponseWriter, r *http.Request)`), which `@vercel/go` automatically detects via AST inspection. Shared business logic will live in `internal/`:

```text
setlistify-app/
├── api/                           # Vercel Serverless Function entrypoints (package handler)
│   ├── authUrl.go                 # GET  /api/authUrl
│   ├── getUser.go                 # POST /api/getUser
│   ├── artistSearch.go            # POST /api/artistSearch
│   ├── setlistArtists.go          # POST /api/setlistArtists
│   ├── artistSetlists.go          # POST /api/artistSetlists
│   └── buildPlaylist.go           # POST /api/buildPlaylist
├── cmd/
│   └── devserver/
│       └── main.go                # Lightweight local HTTP server (:5000) mounting api/* handlers
├── internal/
│   ├── config/
│   │   └── config.go              # Environment variable loading & validation
│   ├── auth/
│   │   └── jwt.go                 # HS256 JWT encoding/decoding for Spotify token payloads
│   ├── httputil/
│   │   └── httputil.go            # JSON request/response helpers, CORS, and error formatting
│   ├── setlistfm/
│   │   ├── client.go              # HTTP client for https://api.setlist.fm/rest/1.0/
│   │   ├── types.go               # Typed structs (Setlist, Artist, Venue, City, Coords, Sets)
│   │   └── helpers.go             # Disambiguation, song extraction, and fallback matching
│   └── spotify/
│       ├── client.go              # Spotify OAuth2 config & authenticated client builder
│       └── playlist.go            # Concurrent track search (errgroup) & playlist creation
├── go.mod
├── go.sum
└── vercel.json                    # Vercel build config & SPA /callback rewrite rules
```

### Key Go Dependencies
- **`github.com/zmb3/spotify/v2`** + **`golang.org/x/oauth2`** — Spotify Web API client and OAuth 2.0 authorization code exchange.
- **`github.com/golang-jwt/jwt/v5`** — Stateless HS256 JWT signing and verification compatible with `APP_SECRET_KEY`.
- **`golang.org/x/sync/errgroup`** — Bounded concurrency (`g.SetLimit(5)`) for parallel Spotify track searches while preserving setlist song ordering.
- **`github.com/joho/godotenv`** — Optional `.env` loading for local development via `cmd/devserver`.

---

## 3. Step-by-Step Implementation Details

### Phase 1: Go Foundation & Internal Packages
- [ ] **Task 1.1: Initialize Go Module (`go.mod`)**
  - Initialize `go.mod` in `setlistify-app/` (`module github.com/alexcaulfield/setlistify` or `setlistify`) targeting Go 1.22+.
  - Add dependencies: `github.com/zmb3/spotify/v2`, `golang.org/x/oauth2`, `github.com/golang-jwt/jwt/v5`, `golang.org/x/sync`, and `github.com/joho/godotenv`.
- [ ] **Task 1.2: Implement Configuration & HTTP Utilities (`internal/config`, `internal/httputil`)**
  - Create `internal/config/config.go` to read `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SETLIST_FM_API_KEY`, `APP_SECRET_KEY`, `REDIRECT_URI`, and `SCOPE` (defaulting to `playlist-modify-public`).
  - Create `internal/httputil/httputil.go` for standard JSON serialization, method checking (`GET`/`POST`/`OPTIONS`), and structured error responses (`{"error": "...", "type": "..."}`).
- [ ] **Task 1.3: Implement JWT Token Helper (`internal/auth/jwt.go`)**
  - Implement `EncodeToken(oauthToken *oauth2.Token, secret string) (string, error)` and `DecodeToken(tokenStr string, secret string) (*oauth2.Token, error)` using HS256 so the client `token` workflow matches the existing frontend contract.

### Phase 2: External API Clients (`internal/setlistfm` & `internal/spotify`)
- [ ] **Task 2.1: Build Setlist.fm Client & Helpers (`internal/setlistfm`)**
  - Define typed structs in `types.go` including `Artist`, `Setlist`, `Venue`, `City`, `Coords` (`Lat`, `Long` for future concert map support), `Set`, and `Song`.
  - Implement HTTP methods in `client.go` with `x-api-key` and `Accept: application/json` headers and a 10-second `http.Client` timeout:
    - `SearchArtists(ctx, artistName)` (`GET /search/artists?artistName=...&sort=relevance`)
    - `GetArtistSetlists(ctx, mbid)` (`GET /artist/{mbid}/setlists`)
    - `SearchSetlistsByArtist(ctx, artistName)` (`GET /search/setlists?artistName=...`)
    - `GetSetlist(ctx, setlistID)` (`GET /setlist/{setlistID}`)
  - Port disambiguation and extraction helpers in `helpers.go` (`SetlistHasSongs`, `ExtractSongsFromSetlist`, `PickSetlistByID`, and candidate MBID resolution).
  - Write unit tests (`helpers_test.go`) covering multi-set/encore flattening, empty setlists, and artist name matching.
- [ ] **Task 2.2: Build Spotify OAuth & Concurrent Playlist Engine (`internal/spotify`)**
  - In `client.go`, configure `spotifyauth.New(...)` for generating the authorization URL, exchanging the OAuth `code` for a token, and constructing an authenticated `*spotify.Client`.
  - In `playlist.go`, implement:
    - `ResolveTracksConcurrently(ctx, client, artistName, songNames)`: Uses `errgroup.WithContext(ctx)` with `g.SetLimit(5)` to query `track:<song> artist:<artist>` in parallel, storing results by index to preserve the exact concert setlist order and gracefully skipping unmatched songs.
    - `CreateAndPopulatePlaylist(ctx, client, userID, playlistName, trackURIs)`: Creates the public playlist with description `"A playlist made with the setlistify.app"`, adds matched tracks, and returns `"spotify:playlist:<id>"`.

### Phase 3: Vercel Go Serverless Endpoints (`api/*.go`) & Local Dev Server
- [ ] **Task 3.1: Implement OAuth Endpoints (`api/authUrl.go`, `api/getUser.go`)**
  - `api/authUrl.go` (`GET /api/authUrl`): Returns `{"authUrl": "..."}` statelessly.
  - `api/getUser.go` (`POST /api/getUser`): Parses `{"code": "..."}`, exchanges code with Spotify, fetches `CurrentUser`, signs JWT, and returns `{"user": ..., "token": "..."}`.
- [ ] **Task 3.2: Implement Search & Setlist Endpoints (`api/artistSearch.go`, `api/setlistArtists.go`, `api/artistSetlists.go`)**
  - `api/artistSearch.go` (`POST /api/artistSearch`): Decodes JWT, runs Spotify artist search with `query` and `limit`, and returns `{"artists": [...]}`.
  - `api/setlistArtists.go` (`POST /api/setlistArtists`): Queries Setlist.fm artists by relevance and returns `{"artists": [...]}`.
  - `api/artistSetlists.go` (`POST /api/artistSetlists`): Resolves setlists via explicit `artistMbid`, top-3 exact-match candidate check, or fallback `search/setlists`, returning `{"artistSetlists": [...], "artistMbid": "..."}`.
- [ ] **Task 3.3: Implement Playlist Builder Endpoint (`api/buildPlaylist.go`)**
  - `api/buildPlaylist.go` (`POST /api/buildPlaylist`): Decodes JWT, fetches Setlist.fm setlist by `playlistId` (with fallback to `artistMbid`/`artistName`), runs concurrent track lookups, creates the Spotify playlist, and returns `{"playlistUri": "spotify:playlist:..."}`.
- [ ] **Task 3.4: Add Local Go Development Server (`cmd/devserver/main.go`)**
  - Create a lightweight entrypoint that loads `.env` and mounts all 6 `api/*` handlers under `/api/*` on `http://localhost:5000` so local development works either via `vercel dev` or standard `go run ./cmd/devserver` + `yarn start`.

### Phase 4: Frontend Updates & Vercel Configuration
- [ ] **Task 4.1: Update API Base URL & Stateless OAuth in Frontend (`src/`)**
  - Update `src/utils/dev_env.ts` so `fetchUrl()` returns `'/api'` across both local development and production on Vercel.
  - Update `src/components/app_routing.tsx` and `src/components/login_handler.tsx` to remove `cachePath` state/props and send `{ code: params.code }` to `POST /api/getUser`.
- [ ] **Task 4.2: Add `vercel.json` & Update Documentation**
  - Create `setlistify-app/vercel.json` with:
    - Build command `yarn build` and output directory `build`.
    - Rewrite rules preserving `/api/(.*)` for serverless functions and routing all other paths (`/callback`, `/createPlaylist`, etc.) to `/index.html` for React Router v5.
  - Update `ARCHITECTURE.md` and `README.md` to document the Go + Vercel architecture and local development workflows.

### Phase 5: Post-Verification Cleanup
- [ ] **Task 5.1: Remove Legacy Flask & Netlify Files (After Production Verification)**
  - Once Vercel deployment is verified in production, delete `flask-app/` and `netlify.toml`.

---

## 4. Verification Plan

### Automated Tests
- **Go Unit & Handler Tests:**
  ```bash
  cd setlistify-app
  go vet ./...
  go test -v ./...
  ```
  - Unit tests in `internal/setlistfm/helpers_test.go` verifying song extraction across multiple sets/encores and candidate MBID filtering.
  - Unit tests in `internal/auth/jwt_test.go` verifying JWT round-trip encoding/decoding.
  - HTTP handler tests using `httptest.NewRequest` and `httptest.NewRecorder` for `api/*.go`.
- **Frontend Build & Tests:**
  ```bash
  cd setlistify-app
  yarn test --watchAll=false
  yarn build
  ```

### Manual Verification
1. **Local End-to-End Flow:**
   - Start the Go server (`go run ./cmd/devserver` on `:5000`) and React frontend (`yarn start` on `:3000`), or run `vercel dev`.
   - Load `http://localhost:3000`, verify `GET /api/authUrl` returns a valid Spotify OAuth URL, and click **Log in with Spotify**.
   - Complete Spotify login and verify `/callback` exchanges the code via `POST /api/getUser` without `cachePath` and redirects to `/createPlaylist`.
   - Search for an artist (verifying `POST /api/artistSearch` and `POST /api/artistSetlists`), select a concert setlist, and click **Setlist**.
   - Verify `POST /api/buildPlaylist` resolves tracks concurrently, creates the playlist on Spotify, and renders the **"Check out your playlist"** button.
2. **Vercel Preview Deployment:**
   - Deploy to a Vercel preview URL, configure environment variables (`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SETLIST_FM_API_KEY`, `APP_SECRET_KEY`, `REDIRECT_URI`), and verify `/callback` SPA routing and `/api/*` execution.

---

## 5. Potential Risks & Maintenance Concerns

- **Setlist.fm Rate Limits (2 req/sec):** During `/api/artistSetlists`, checking up to 3 candidate MBIDs issues up to 4 requests to Setlist.fm. We should enforce a brief rate limiter or context timeout in `internal/setlistfm` and can cache artist MBID mappings when Supabase is introduced later.
- **Spotify OAuth Redirect URI Whitelisting:** The Spotify Developer Dashboard strictly validates `REDIRECT_URI`. Both `http://localhost:3000/callback` (or `http://127.0.0.1:3000/callback`) and `https://setlistify.app/callback` must be registered in the Spotify app settings.
- **Spotify Token Expiry (1 Hour):** The current frontend holds the JWT in memory (`useState`). Because `oauth2.Token` includes the `refresh_token` and `expiry`, encoding the full token struct in the JWT allows the Go backend to transparently refresh expired tokens in future iterations without forcing the user to log in again.
- **Vercel Go Package Scope:** Because all files in `api/*.go` share `package handler`, helper functions internal to `api/` should live in `internal/` packages so `api/*.go` remains thin and free of naming collisions.

