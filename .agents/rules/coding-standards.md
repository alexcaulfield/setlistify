---
trigger: always_on
description: Core coding standards, architecture boundaries, and workflow conventions for Setlistify.
---

# Setlistify Coding Standards & Agent Rules

## 1. Project Overview & Structure
- **Frontend (`/src`)**: React 16 + TypeScript (`~4.9.5`) + React Router v5 + Semantic UI React (`semantic-ui-react`).
- **Backend (`/flask-app`)**: Python 3.11 + Flask + Spotipy + Repertorio, deployed to AWS Lambda via Serverless Framework (`serverless.yml`).
- **Plans (`/plans`)**: Store approved feature and refactoring plans in `/plans/`.

## 2. Frontend Conventions (React & TypeScript)
- **Component Style**: Write functional React components using Hooks (`useState`, `useEffect`, `useHistory`).
- **File Naming**: Use `snake_case.tsx` for component and utility files under `src/components/` and `src/utils/` (matching existing files like `create_playlist_container.tsx`, `search_container.tsx`, `dev_env.ts`).
- **UI Components**: Use `semantic-ui-react` components (`Container`, `Card`, `Button`, `Dropdown`, `Icon`, `Image`).
- **API Requests**: Always construct backend URLs using `fetchUrl()` from `src/utils/dev_env.ts` so requests automatically use the local dev proxy (`REACT_APP_ENV=dev`) in development and the AWS API Gateway endpoint in production.

## 3. Backend Conventions (Python & Flask)
- **Separation of Concerns**:
  - Keep HTTP route handlers and CORS/JWT wiring in `flask-app/app.py`.
  - Place Setlist.fm data parsing and artist/setlist disambiguation logic in `flask-app/setlist_helpers.py`.
  - Place Spotify Web API track lookups and playlist mutation logic in `flask-app/spotify_helpers.py`.
  - Load environment variables through `flask-app/config.py`.
- **Serverless / Lambda Compatibility**:
  - When `IS_OFFLINE` is false (production Lambda), any filesystem writes (such as `Flask-Session` or Spotipy OAuth cache files) **must** use `/tmp/` (`os.makedirs('/tmp/...', exist_ok=True)`), as the Lambda root filesystem is read-only.
- **CORS**: Ensure all client-facing endpoints in `flask-app/app.py` include `@cross_origin(origins=['https://www.setlistify.app', 'https://setlistify.app', 'http://localhost:3000'])`.
- **Resilience**: Handle external API errors (`spotipy`, `repertorio`) gracefully with logging and fallbacks (e.g., MBID lookup falling back to artist name search) rather than letting unhandled exceptions crash user flows.

## 4. Security & Secrets
- Never hardcode `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SETLIST_FM_API_KEY`, or `APP_SECRET_KEY` in source files.
- Keep `.env` files out of version control.
