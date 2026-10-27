# Setlistify

Live at [setlistify.app](https://setlistify.app)!

[![Netlify Status](https://api.netlify.com/api/v1/badges/1ddc4b4f-68b8-410b-93a8-5f10c7fece4c/deploy-status)](https://app.netlify.com/sites/sleepy-roentgen-4c791e/deploys)

A platform for you to prep for concerts — find an artist you're seeing soon, browse their historical concert setlists from Setlist.fm, and automatically generate a Spotify playlist of that show directly on your Spotify account.

## Features

### Current Features
* Autocomplete search for artists via the Spotify Web API
* Browse and select an artist's past concert setlists by date, city/country, and song count
* Automatically disambiguate artists on Setlist.fm via MusicBrainz ID (MBID) matching
* Create playlists based on an artist's concert setlist directly in your Spotify account

### Future Features
* View upcoming shows in your area for a selected artist
* Build playlists from songs an artist has written or produced
* Playlists from TV and Movies

---

## Tech Stack

* **Frontend**: TypeScript, React 16, React Router v5, Semantic UI React (`semantic-ui-react`)
* **Backend**: Python 3.11, Flask, Spotipy (Spotify API wrapper), Repertorio (Setlist.fm API wrapper), PyJWT
* **Infrastructure & Hosting**:
  * Frontend: Netlify (`yarn build` -> `build/`)
  * Backend: AWS Lambda & API Gateway deployed via Serverless Framework (`serverless-wsgi` + `serverless-python-requirements`)

---

## Prerequisites & Local Setup

This project has two parts: a **React frontend** (root directory) and a **Flask backend** (`flask-app/`). Both need to run simultaneously for local development.

### Prerequisites
* **Node.js 22** — run `nvm use` in the repo root to switch automatically (uses `.nvmrc`)
* **Yarn 4** (`yarn@4.17.0` via Corepack) or **npm**
* **Python 3.11+**
* A [Spotify Developer](https://developer.spotify.com/dashboard) app (for `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`, with `http://127.0.0.1:3000/callback` and `http://localhost:3000/callback` registered as Redirect URIs)
* A [Setlist.fm API](https://api.setlist.fm/docs/1.0/index.html) key (`SETLIST_FM_API_KEY`)

### 1. Frontend Setup (React)

```bash
nvm use          # switches to Node 22 per .nvmrc
yarn install     # or npm install
```

Ensure a root `.env` file exists with:

```env
REACT_APP_ENV=dev
```

Start the frontend development server:

```bash
yarn start       # or npm start — runs on http://localhost:3000
```

> When `REACT_APP_ENV=dev`, `fetchUrl()` returns `''` so API requests are proxied to `http://localhost:5000` (the local Flask server) via the `proxy` setting in `package.json`.

### 2. Backend Setup (Flask)

```bash
cd flask-app

# Create a virtual environment and install dependencies
python3 -m venv venv
source venv/bin/activate
pip3 install -r requirements.txt
```

Create a `.env` file inside `flask-app/`:

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SETLIST_FM_API_KEY=your_setlistfm_api_key
APP_SECRET_KEY=any_random_secret_string
```

Start the Flask server in offline/local mode:

```bash
IS_OFFLINE=true python app.py
```

The backend will listen on `http://localhost:5000`.

### 3. Open the App

Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## Development Commands

| Task | Directory | Command |
| :--- | :--- | :--- |
| Start frontend dev server | `/` (root) | `yarn start` |
| Build production frontend | `/` (root) | `yarn build` |
| Run frontend unit tests | `/` (root) | `yarn test` |
| Start Flask backend locally | `/flask-app` | `IS_OFFLINE=true python app.py` |
| Deploy backend to AWS Lambda | `/flask-app` | `export $(cat .env | xargs) && npx serverless deploy` |

---

## Production Deploy

1. **Frontend (Netlify)**: Merging changes to the main branch automatically triggers a Netlify build (`yarn build`) and deploys the `build/` folder to `setlistify.app`.
2. **Backend (AWS Lambda)**: From `flask-app/`, deploy via Serverless Framework:
   ```bash
   cd flask-app
   export $(cat .env | xargs) && npx serverless deploy
   ```

---

## Project Structure

```text
setlistify-app/
├── .agents/                  # Agent rules, skills, and configuration
│   ├── rules/                # Always-on project coding standards
│   └── skills/               # Project-specific agent skills
├── flask-app/                # Python Flask backend & Serverless config
│   ├── app.py                # Flask routes and API entry point
│   ├── config.py             # Environment variable loading & constants
│   ├── setlist_helpers.py    # Setlist.fm data parsing & normalization
│   ├── spotify_helpers.py    # Spotify track resolution & playlist creation
│   ├── requirements.txt      # Python dependencies
│   ├── serverless.yml        # AWS Lambda + WSGI Serverless deployment config
│   └── package.json          # Serverless plugins (wsgi, python-requirements)
├── plans/                    # Approved architectural and feature plans
├── public/                   # Static HTML template, icons, and web manifest
├── src/                      # React + TypeScript frontend source
│   ├── components/           # UI & routing components
│   ├── img/                  # Static image assets
│   ├── utils/                # Environment helpers (dev_env.ts)
│   ├── App.tsx               # Root application layout & state
│   └── index.tsx             # React DOM entry point
├── ARCHITECTURE.md           # System design and architectural patterns
├── DESIGN_SYSTEM.md          # UI tokens, typography, and component patterns
├── netlify.toml              # Netlify build configuration
├── package.json              # Frontend dependencies and scripts
└── tsconfig.json             # TypeScript compiler configuration
```

---

## Resources
* [Serverless Flask Python REST API on AWS Lambda](https://www.serverless.com/blog/flask-python-rest-api-serverless-lambda-dynamodb)
