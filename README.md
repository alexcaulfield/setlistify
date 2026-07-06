# Setlistify
Live at setlistify.app!

[![Netlify Status](https://api.netlify.com/api/v1/badges/1ddc4b4f-68b8-410b-93a8-5f10c7fece4c/deploy-status)](https://app.netlify.com/sites/sleepy-roentgen-4c791e/deploys)

A platform for you to prep for concerts - find an artist you're seeing soon, and add their most recently played songs live to a Spotify playlist

### Technologies used
* TypeScript
* React
* Python
  * Flask
* Semantic UI
* Spotify API
  * Spotipy - Spotify Python Wrapper
* Setlist FM API
  * Repertorio - Setlist.fm Python Wrapper
* Serverless
* AWS Lambda

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

* **Node.js v18** (required — webpack 4 needs `--openssl-legacy-provider` on Node 17+, which is set in `npm start`/`npm run build`. Use `nvm install 18 && nvm use 18` if needed)
* **npm** (use npm, not yarn — the project's `package-lock.json` is the authoritative lock file)
* **Python 3.7+**
* A [Spotify Developer](https://developer.spotify.com/dashboard) app (for `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`)
* A [Setlist.fm API](https://api.setlist.fm/docs/1.0/index.html) key

> **Netlify**: Node 18 is pinned in `netlify.toml`. No manual configuration needed.

### 1. Frontend (React)

```bash
# Install dependencies
npm install

# Start the dev server (runs on http://localhost:3000)
npm start
```

> The React app proxies API requests to `http://localhost:5000` (the Flask backend).

### 2. Backend (Flask)

```bash
cd flask-app

# Create a virtual environment and install dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file inside `flask-app/`:

```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SETLIST_FM_API_KEY=your_setlistfm_api_key
APP_SECRET_KEY=any_random_secret_string
```

Then start the Flask server:

```bash
IS_OFFLINE=true python app.py
```

The backend will be available at `http://localhost:5000`.

### 3. Open the app

Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

### Resources
https://www.serverless.com/blog/flask-python-rest-api-serverless-lambda-dynamodb
