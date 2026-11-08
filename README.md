# Setlistify
Live at [setlistify.app](https://www.setlistify.app)!

A platform for you to prep for concerts - find an artist you're seeing soon, and add their most recently played songs live to a Spotify playlist.

### Tech Stack

* **Frontend**: Vite 6, React 19, TanStack Router (code-based), TanStack Query v5, Tailwind CSS v4, Lucide React icons, TypeScript
* **Backend**: Go (Serverless Functions on Vercel), Typed Handler Pattern, Spotify Web API (`zmb3/spotify/v2`), Setlist.fm API, HS256 JWT auth
* **Type Safety**: Go reflection generator (`cmd/gentypes`) auto-generates frontend TypeScript types (`src/api/types.gen.ts`) directly from backend Go DTOs
* **Infrastructure & Hosting**: Vercel (monorepo hosting Vite SPA static build + Go serverless functions in `/api`)

### Current Features
* Autocomplete for artists with custom accessible combobox
* Create Playlists based on an artist's previous concert setlist right on your Spotify account!
* Select artist playlist based on location, date, and concert length

### Future Features
* View upcoming shows in your area for that artist
* songs they've written, or songs they've produced
* Playlists from TV and Movies

---

## Running Locally

This project consists of a React frontend (`src/`) and a Go backend (`api/` + `cmd/devserver`). Both run concurrently during local development.

### Prerequisites

* **Node.js 22** — run `nvm use` in the repo root to switch automatically (uses `.nvmrc`)
* **Yarn 4** (configured via `.yarnrc.yml` and `packageManager`)
* **Go 1.22+**
* A [Spotify Developer](https://developer.spotify.com/dashboard) app (for `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`)
* A [Setlist.fm API](https://api.setlist.fm/docs/1.0/index.html) key

---

### Environment Setup

Create a `.env` file in the repo root:

```bash
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SETLIST_FM_API_KEY=your_setlistfm_api_key
APP_SECRET_KEY=any_random_secret_string_min_32_chars
REDIRECT_URI=http://127.0.0.1:3000/callback
```

> **Note on Spotify Redirect URI:** Spotify strictly requires HTTPS for domains, but allows HTTP for literal loopback IP addresses. In the Spotify Developer Dashboard, register `http://127.0.0.1:3000/callback` (not `localhost`).

---

### 1. Backend (Go Dev Server)

Run the local Go dev server, which serves `/api/*` endpoints on `:5001`:

```bash
go run ./cmd/devserver
```

---

### 2. Frontend (Vite)

In a separate terminal, start the Vite development server:

```bash
nvm use          # switches to Node 22 per .nvmrc
yarn install
yarn start        # runs on http://127.0.0.1:3000
```

> The Vite dev server automatically proxies `/api/*` requests to `http://localhost:5001` via `vite.config.ts`.

---

### 3. Open the App

Navigate to [http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser.

---

### Auto-Generating TypeScript Types

To sync frontend TypeScript types with Go backend DTOs:

```bash
yarn gen:types
```

This reflects over `pkg/apitypes`, `pkg/setlistfm`, and `github.com/zmb3/spotify/v2` structs and emits `src/api/types.gen.ts`. Zero type drift is validated on CI.

---

### Running Tests & Verification

```bash
# Verify Go tests pass
go test -v ./...

# Verify generated types are in sync
go run ./cmd/gentypes && git diff --exit-code src/api/types.gen.ts

# Run frontend Vitest unit tests
yarn test

# Verify TypeScript compilation and production build
yarn build
```

## Production Deployment

Setlistify is deployed on [Vercel](https://vercel.com). Pushing changes to the `master` branch triggers an automated build and deployment of:
- The Vite frontend static assets (`build/`)
- The Go serverless API functions in `/api`

---
