# Setlistify
Live at setlistify.app!

[![Netlify Status](https://api.netlify.com/api/v1/badges/1ddc4b4f-68b8-410b-93a8-5f10c7fece4c/deploy-status)](https://app.netlify.com/sites/sleepy-roentgen-4c791e/deploys)

A platform for you to prep for concerts - find an artist you're seeing soon, and add their most recently played songs live to a Spotify playlist

### Tech Stack

* **Frontend**: TypeScript, React 16, React Router v5, Semantic UI React (`semantic-ui-react`)
* **Backend**: Go (Serverless Functions on Vercel), Spotify Web API (`zmb3/spotify/v2`), Setlist.fm API, HS256 JWT auth
* **Infrastructure & Hosting**: Vercel (monorepo hosting React static build + Go serverless functions in `/api`)
* **Legacy Backend (Archived)**: Python 3.11, Flask, AWS Lambda + API Gateway (Serverless Framework)

### Current Features
* Autocomplete for artists
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

Create a `.env` file in the repo root (or inside `flask-app/`):

```bash
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SETLIST_FM_API_KEY=your_setlistfm_api_key
APP_SECRET_KEY=any_random_secret_string_min_32_chars
REDIRECT_URI=http://localhost:3000/callback
```

---

### 1. Backend (Go Dev Server)

Run the local Go dev server, which serves `/api/*` endpoints on `:5000`:

```bash
go run ./cmd/devserver
```

> **Note on macOS AirPlay receiver:** macOS Monterey+ binds AirPlay Receiver to port 5000 by default. If port 5000 is taken, either turn off *System Settings > General > AirDrop & Handoff > AirPlay Receiver*, or run the dev server on another port: `PORT=5001 go run ./cmd/devserver`.

---

### 2. Frontend (React)

In a separate terminal, start the Create React App development server:

```bash
nvm use          # switches to Node 22 per .nvmrc
yarn install
yarn start        # runs on http://localhost:3000
```

> The React dev server automatically proxies `/api/*` requests to `http://localhost:5000` via `"proxy": "http://localhost:5000"` in `package.json`.

---

### 3. Open the App

Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

### Running Tests

```bash
# Run Go backend tests
go test -v ./...

# Run frontend tests
yarn test --watchAll=false
```

## Production deploy

1. Merge changes triggers a Netlify deploy of the UI
2. Deploy the backend methods (fish shell)
```
for line in (cat .env | string match -v '^#*' | string match -v '^$')
    set -gx (string split -m 1 = $line)
end
npx serverless deploy
```

---

## Project Structure

```text
setlistify-app/
├── .agents/                  # Agent skills
│   └── skills -> ~/Documents/develop/.agents/skills
├── flask-app/                # Python Flask backend & Serverless config
│   ├── app.py                # Flask routes and API entry point
│   ├── config.py             # Environment variable loading & constants
│   ├── setlist_helpers.py    # Setlist.fm data parsing & normalization
│   ├── spotify_helpers.py    # Spotify track resolution & playlist creation
│   ├── requirements.txt      # Python dependencies
│   ├── serverless.yml        # AWS Lambda + WSGI Serverless deployment config
│   └── package.json          # Serverless plugins
├── plans/                    # Approved architectural and feature plans
├── public/                   # Static HTML template, icons, and web manifest
├── src/                      # React + TypeScript frontend source
│   ├── components/           # UI & routing components
│   ├── img/                  # Static image assets
│   ├── utils/                # Environment helpers (dev_env.ts)
│   ├── App.tsx               # Root application layout & state
│   └── index.tsx             # React DOM entry point
├── ARCHITECTURE.md           # System design and architectural patterns
├── netlify.toml              # Netlify build configuration
├── package.json              # Frontend dependencies and scripts
└── tsconfig.json             # TypeScript compiler configuration
```

---

### Resources
https://www.serverless.com/blog/flask-python-rest-api-serverless-lambda-dynamodb
