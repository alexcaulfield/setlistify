# Setlistify
Live at setlistify.app!

[![Netlify Status](https://api.netlify.com/api/v1/badges/1ddc4b4f-68b8-410b-93a8-5f10c7fece4c/deploy-status)](https://app.netlify.com/sites/sleepy-roentgen-4c791e/deploys)

A platform for you to prep for concerts - find an artist you're seeing soon, and add their most recently played songs live to a Spotify playlist

### Tech Stack

* **Frontend**: TypeScript, React 16, React Router v5, Semantic UI React (`semantic-ui-react`)
* **Backend**: Python 3.11, Flask, Spotipy (Spotify API wrapper), Repertorio (Setlist.fm API wrapper), PyJWT
* **Infrastructure & Hosting**:
  * Frontend: Netlify (`yarn build` -> `build/`)
  * Backend: AWS Lambda & API Gateway deployed via Serverless Framework (`serverless-wsgi` + `serverless-python-requirements`)

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

This project has two parts: a React frontend and a Flask backend. Both need to be running simultaneously.

### Prerequisites

* **Node.js 22** — run `nvm use` in the repo root to switch automatically (uses `.nvmrc`)
* **Yarn 4** (configured via `.yarnrc.yml` and `packageManager`)
* **Python 3.7+**
* A [Spotify Developer](https://developer.spotify.com/dashboard) app (for `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`)
* A [Setlist.fm API](https://api.setlist.fm/docs/1.0/index.html) key

### 1. Frontend (React)

```bash
nvm use          # switches to Node 22 per .nvmrc
yarn install
yarn start        # runs on http://localhost:3000
```

> The React app proxies API requests to `http://localhost:5000` (the Flask backend).

### 2. Backend (Flask)

```bash
cd flask-app

# Create a virtual environment and install dependencies
python3 -m venv venv
source venv/bin/activate # or for fish, set VIRTUAL_ENV "/Users/alexcaulfield/src/setlistify/venv"
pip3 install -r requirements.txt
```

Create a `.env` file inside `flask-app/`:

```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SETLIST_FM_API_KEY=your_setlistfm_api_key
APP_SECRET_KEY=any_random_secret_string
REDIRECT_URI=https://setlistify.app/callback
```

Then start the Flask server:

```bash
IS_OFFLINE=true python app.py
```

The backend will be available at `http://localhost:5000`.

### 3. Open the app

Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

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
