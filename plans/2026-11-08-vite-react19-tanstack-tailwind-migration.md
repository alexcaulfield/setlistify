# Plan: Migrate Frontend to Vite, React 19, TanStack (Router + Query), and Tailwind CSS v4

- **Date:** 2026-11-08
- **Status:** approved

## 1. Overview

Migrate the Setlistify frontend (`src/`) from its legacy Create React App (`react-scripts` 5, React 16, React Router v5, Semantic UI React) stack to a modern, lightweight SPA architecture powered by **Vite 6**, **React 19**, **TanStack Router** (code-based routes), **TanStack Query v5**, and **Tailwind CSS v4** with native HTML elements and **Lucide React** icons.

### Objectives
- **Eliminate Deprecated Tooling & React 16 Locks:** Replace `react-scripts` and `semantic-ui-react` (which blocks React 18/19 upgrades due to `findDOMNode`) with Vite 6, React 19, and TypeScript 5.
- **Strict 1:1 Functional Parity:** Preserve all existing user flows, route paths (`/`, `/callback`, `/createPlaylist`), in-memory auth state behavior, and Go backend API contracts (`/api/*`) without introducing scope creep during the framework transition.
- **Future-Proof Routing & Data Fetching:** Establish code-based routing with `@tanstack/react-router` and declarative server-state management with `@tanstack/react-query` so future database-backed and shareable multi-page routes can be added without refactoring.
- **Zero-Primitive UI Layer:** Replace Semantic UI React components with pure Tailwind CSS v4 utility styling, native HTML controls (`<select>`, `<button>`, `<input>`), a lightweight custom artist autocomplete combobox, and `lucide-react` icons.
- **Modernize Test Runner & CI:** Replace Create React App's bundled Jest runner with **Vitest** and `@testing-library/react` v16, keeping [`.github/workflows/ci.yml`](file:///Users/alexcaulfield/src/setlistify/.github/workflows/ci.yml) and Vercel builds fast and green.
- **Enable Hands-On Learning:** Clearly separate tedious tooling/config scaffolding (handled by the agent) from high-signal architectural touchpoints where the developer can write code manually to build muscle memory with TanStack Router, TanStack Query, and Tailwind CSS v4.

---

## 2. Architectural Decisions

### 2.1 Alignment with [`ARCHITECTURE.md`](file:///Users/alexcaulfield/src/setlistify/ARCHITECTURE.md)
- **Unchanged Backend & Deployment Boundary:** All 6 Go serverless functions in `api/*.go` and domain packages in `pkg/*` remain untouched. [`src/utils/dev_env.ts`](file:///Users/alexcaulfield/src/setlistify/src/utils/dev_env.ts) (`fetchUrl() => '/api'`) continues to provide the same-origin `/api` prefix.
- **Vite Dev Server Proxy & Build Output:**
  - `vite.config.ts` proxies `/api` requests to `http://localhost:5001` (matching [`cmd/devserver/main.go`](file:///Users/alexcaulfield/src/setlistify/cmd/devserver/main.go)) and binds port `3000` (`host: '127.0.0.1'`) so the local Spotify OAuth redirect URI (`http://127.0.0.1:3000/callback`) works without changes.
  - `vite.config.ts` outputs production bundles to `build/` (`build.outDir: 'build'`), preserving compatibility with [`vercel.json`](file:///Users/alexcaulfield/src/setlistify/vercel.json) (`"outputDirectory": "build"`).

### 2.2 Code-Based Routing with `@tanstack/react-router`
- Routes are defined explicitly in code inside [`src/components/app_routing.tsx`](file:///Users/alexcaulfield/src/setlistify/src/components/app_routing.tsx) (no file-codegen watcher required):
  - **Root Route (`createRootRoute`):** Renders the shared page shell and `notFoundComponent: NotFound`.
  - **Index Route (`path: '/'`):** Renders [`LoadingPlaceholder`](file:///Users/alexcaulfield/src/setlistify/src/components/loading_placeholder.tsx) while `GET /api/authUrl` loads, or [`Login`](file:///Users/alexcaulfield/src/setlistify/src/components/login.tsx) when unauthenticated (and empty fragment when `isLoggedIn` is true, matching current 1:1 behavior).
  - **Callback Route (`path: '/callback'`):** Uses `validateSearch` to type-safely parse `?code=...` from the query string (replacing the manual regex `getUrlParams` in [`src/components/login_handler.tsx`](file:///Users/alexcaulfield/src/setlistify/src/components/login_handler.tsx#L11-L18)). Renders [`LoginHandler`](file:///Users/alexcaulfield/src/setlistify/src/components/login_handler.tsx) when `!isLoggedIn`, or `<Navigate to="/createPlaylist" />` once logged in.
  - **Create Playlist Route (`path: '/createPlaylist'`):** Renders [`CreatePlaylistContainer`](file:///Users/alexcaulfield/src/setlistify/src/components/create_playlist_container.tsx) when `isLoggedIn`, or `<Navigate to="/" />` when unauthenticated.

### 2.3 Server State with `@tanstack/react-query` v5 & Auto-Synced Backend Types (`cmd/gentypes`)
- Export all Go API request/response DTO structs from `api/*.go` into a shared `pkg/apitypes` package (`AuthUrlResponse`, `GetUserRequest`, `GetUserResponse`, `ArtistSearchRequest`, `ArtistSearchResponse`, `ArtistSetlistsRequest`, `ArtistSetlistsResponse`, `BuildPlaylistRequest`, `BuildPlaylistResponse`) and add a lightweight Go reflection generator at `cmd/gentypes/main.go` that emits `src/api/types.gen.ts` (including nested [`setlistfm.Setlist`](file:///Users/alexcaulfield/src/setlistify/pkg/setlistfm/types.go#L64-L73) and `github.com/zmb3/spotify/v2` structs).
- Wire `"gen:types": "go run ./cmd/gentypes"` into [`package.json`](file:///Users/alexcaulfield/src/setlistify/package.json) and enforce zero type drift in [`.github/workflows/ci.yml`](file:///Users/alexcaulfield/src/setlistify/.github/workflows/ci.yml) (`go run ./cmd/gentypes && git diff --exit-code src/api/types.gen.ts`).
- Wrap the application in `QueryClientProvider` in [`src/App.tsx`](file:///Users/alexcaulfield/src/setlistify/src/App.tsx).
- Centralize typed fetch functions in `src/api/setlistify.ts` (consuming the generated types from `src/api/types.gen.ts`) and consume them through TanStack Query's two core primitives:
  - **Reads (`useQuery`):**
    - `GET /api/authUrl` (`queryKey: ['authUrl']`) in [`AppRouting`](file:///Users/alexcaulfield/src/setlistify/src/components/app_routing.tsx).
    - `POST /api/getUser` (`queryKey: ['getUser', code]`, `enabled: Boolean(code)`, `staleTime: Infinity`, `retry: false`) in [`LoginHandler`](file:///Users/alexcaulfield/src/setlistify/src/components/login_handler.tsx).
    - `POST /api/artistSearch` & `POST /api/artistSetlists` in [`SearchContainer`](file:///Users/alexcaulfield/src/setlistify/src/components/search_container.tsx).
  - **Writes (`useMutation`):**
    - `POST /api/buildPlaylist` (`useMutation({ mutationFn: buildPlaylist })`) in [`CreatePlaylistContainer`](file:///Users/alexcaulfield/src/setlistify/src/components/create_playlist_container.tsx).

### 2.4 Styling & UI Components with Tailwind CSS v4 + Lucide Icons
- Remove the Semantic UI 2.4.1 CDN `<link>` from `index.html` and uninstall `semantic-ui-react`.
- Configure Tailwind CSS v4 via `@tailwindcss/vite` in `vite.config.ts` and `@import "tailwindcss";` in [`src/index.css`](file:///Users/alexcaulfield/src/setlistify/src/index.css).
- Replace all Semantic UI React components with native HTML elements styled with Tailwind CSS and icons from `lucide-react`.

---

## 3. Step-by-Step Implementation Details

> **Collaboration Legend:**
> - 🤖 **[Agent Scaffolding]**: Config, build plumbing, and repetitive boilerplate best handled automatically by the agent.
> - 🧑‍💻 **[Manual Contribution Opportunity]**: Self-contained, high-learning-value tasks ideal for writing manually to get hands-on experience with TanStack Query, TanStack Router, and Tailwind CSS v4.

### Phase 1: Build Tooling, Dependencies & Vite Configuration
- [x] 🤖 **Task 1.1: Update [`package.json`](file:///Users/alexcaulfield/src/setlistify/package.json) Dependencies & Scripts**
  - Remove `react-scripts`, `semantic-ui-react`, `react-router-dom`, `@types/react-router`, `@types/react-router-dom`, `@types/jest`, and the React 16 `resolutions` block.
  - Upgrade `react` and `react-dom` to `^19.0.0` (with `@types/react` and `@types/react-dom` `^19.0.0`) and `typescript` to `^5.7.0`.
  - Add runtime dependencies: `@tanstack/react-query`, `@tanstack/react-router`, `lucide-react`.
  - Add dev/build dependencies: `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, `vitest`, `jsdom`, `@testing-library/react` (`^16.2.0`), `@testing-library/jest-dom` (`^6.6.3`), `@testing-library/user-event`.
  - Update scripts: `"gen:types": "go run ./cmd/gentypes"`, `"start": "vite"`, `"build": "tsc -b && vite build"`, `"test": "vitest run"`.
- [x] 🤖 **Task 1.2: Move & Update `index.html` and Create `vite.config.ts`**
  - Move [`public/index.html`](file:///Users/alexcaulfield/src/setlistify/public/index.html) to root `index.html`, remove the Semantic UI CDN stylesheet `<link>`, replace `%PUBLIC_URL%` with `/`, and add `<script type="module" src="/src/index.tsx"></script>`.
  - Create `vite.config.ts` configuring `@vitejs/plugin-react`, `@tailwindcss/vite`, `server: { host: '127.0.0.1', port: 3000, proxy: { '/api': 'http://localhost:5001' } }`, `build: { outDir: 'build' }`, and `test: { environment: 'jsdom', globals: true, setupFiles: './src/setupTests.ts' }`.
- [x] 🤖 **Task 1.3: Update [`tsconfig.json`](file:///Users/alexcaulfield/src/setlistify/tsconfig.json) & Entry Point ([`src/index.tsx`](file:///Users/alexcaulfield/src/setlistify/src/index.tsx))**
  - Update [`tsconfig.json`](file:///Users/alexcaulfield/src/setlistify/tsconfig.json) to use `"moduleResolution": "bundler"`, `"jsx": "react-jsx"`, and `"types": ["vite/client", "vitest/globals"]`.
  - Update [`src/index.tsx`](file:///Users/alexcaulfield/src/setlistify/src/index.tsx) to use `createRoot` from `react-dom/client` and delete obsolete CRA files (`src/serviceWorker.ts`, `src/react-app-env.d.ts`).
  - Replace [`src/index.css`](file:///Users/alexcaulfield/src/setlistify/src/index.css) and [`src/App.css`](file:///Users/alexcaulfield/src/setlistify/src/App.css) with `@import "tailwindcss";` and base layout styles.

---

### Phase 2: API Client, TanStack Query & TanStack Router
- [x] 🤖 / 🧑‍💻 **Task 2.1: Auto-Generate Backend Types (`pkg/apitypes` + `cmd/gentypes`) & Create Typed API Client (`src/api/setlistify.ts`)**
  - **Agent part:**
    1. Extract the Go request/response DTO structs from `api/*.go` into `pkg/apitypes/types.go` so they can be imported by both `api/*.go` and the generator.
    2. Build `cmd/gentypes/main.go` using Go `reflect` to walk the `pkg/apitypes`, [`pkg/setlistfm`](file:///Users/alexcaulfield/src/setlistify/pkg/setlistfm/types.go), and `github.com/zmb3/spotify/v2` structs and auto-generate `src/api/types.gen.ts`.
    3. Scaffold `src/api/setlistify.ts` importing the generated DTOs from `src/api/types.gen.ts` and implementing the initial fetch helpers (`fetchAuthUrl`, `exchangeCodeForUser`, `searchArtists`).
  - **🧑‍💻 Manual Contribution Opportunity:** Write `fetchArtistSetlists` (`POST /api/artistSetlists`) and `buildPlaylist` (`POST /api/buildPlaylist`) in `src/api/setlistify.ts` using the generated `ArtistSetlistsRequest`/`ArtistSetlistsResponse` and `BuildPlaylistRequest`/`BuildPlaylistResponse` types from `src/api/types.gen.ts`.
- [x] 🤖 / 🧑‍💻 **Task 2.2: Migrate [`src/App.tsx`](file:///Users/alexcaulfield/src/setlistify/src/App.tsx) and [`src/components/app_routing.tsx`](file:///Users/alexcaulfield/src/setlistify/src/components/app_routing.tsx) to TanStack Router & Query**
  - **Agent part:** Set up `QueryClientProvider` in [`src/App.tsx`](file:///Users/alexcaulfield/src/setlistify/src/App.tsx), and scaffold the `rootRoute`, `indexRoute` (`/`), and `createRouter` wiring in [`src/components/app_routing.tsx`](file:///Users/alexcaulfield/src/setlistify/src/components/app_routing.tsx) with `useQuery({ queryKey: ['authUrl'], queryFn: fetchAuthUrl })` as a complete working reference example.
  - **🧑‍💻 Manual Contribution Opportunity:** Add the `callbackRoute` (`/callback`, including `validateSearch: (search: Record<string, unknown>) => ({ code: typeof search.code === 'string' ? search.code : '' })`) and `createPlaylistRoute` (`/createPlaylist`) to the `routeTree` in [`src/components/app_routing.tsx`](file:///Users/alexcaulfield/src/setlistify/src/components/app_routing.tsx).
    - *Why this is valuable:* Adding routes to `routeTree` and validating URL search params is the exact pattern you will use when adding future shareable concert/playlist pages.
- [x] 🧑‍💻 **Task 2.3: Migrate [`src/components/login_handler.tsx`](file:///Users/alexcaulfield/src/setlistify/src/components/login_handler.tsx) to TanStack Query**
  - **🧑‍💻 Manual Contribution Opportunity:** Replace the raw `getUrlParams()` regex and `useEffect` fetch in [`src/components/login_handler.tsx`](file:///Users/alexcaulfield/src/setlistify/src/components/login_handler.tsx) with:
    1. Reading `code` from the route search params (or `new URLSearchParams(window.location.search).get('code')`).
    2. Using `useQuery({ queryKey: ['getUser', code], queryFn: () => exchangeCodeForUser(code), enabled: Boolean(code), staleTime: Infinity, retry: false })` and syncing `data` (`{ user, token }`) to `setToken`, `setUser`, and `handleLogin`.
    - *Why this is valuable:* Demonstrates how TanStack Query's `queryKey` + `enabled` + `staleTime: Infinity` replaces manual `useEffect` fetching and automatically prevents double-firing in React 19 `<StrictMode>`.

---

### Phase 3: Component Migration to Tailwind CSS v4 & TanStack Query
- [x] 🤖 **Task 3.1: Migrate Shared Layout, Auth & Utility Components**
  - Agent migrates the static/utility components so you have clean Tailwind CSS v4 + `lucide-react` patterns in the repo to reference:
    - [`src/components/header_card.tsx`](file:///Users/alexcaulfield/src/setlistify/src/components/header_card.tsx)
    - [`src/components/login.tsx`](file:///Users/alexcaulfield/src/setlistify/src/components/login.tsx)
    - [`src/components/loading_placeholder.tsx`](file:///Users/alexcaulfield/src/setlistify/src/components/loading_placeholder.tsx)
    - [`src/components/error_message.tsx`](file:///Users/alexcaulfield/src/setlistify/src/components/error_message.tsx) & [`src/components/not_found.tsx`](file:///Users/alexcaulfield/src/setlistify/src/components/not_found.tsx)
    - [`src/components/basic_header.tsx`](file:///Users/alexcaulfield/src/setlistify/src/components/basic_header.tsx) & [`src/components/footer.tsx`](file:///Users/alexcaulfield/src/setlistify/src/components/footer.tsx)
- [x] 🧑‍💻 **Task 3.2: Migrate [`src/components/artist_card.tsx`](file:///Users/alexcaulfield/src/setlistify/src/components/artist_card.tsx) & [`src/components/playlist_builder_buttons.tsx`](file:///Users/alexcaulfield/src/setlistify/src/components/playlist_builder_buttons.tsx) to Tailwind CSS v4**
  - **🧑‍💻 Manual Contribution Opportunity:**
    - In [`src/components/artist_card.tsx`](file:///Users/alexcaulfield/src/setlistify/src/components/artist_card.tsx) (37 lines): Replace Semantic UI `<Card>`, `<Image>`, and `<Icon name="user" />` with a Tailwind card (`max-w-xs rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden`) and `<User className="inline h-4 w-4 mr-1" />` from `lucide-react`.
    - In [`src/components/playlist_builder_buttons.tsx`](file:///Users/alexcaulfield/src/setlistify/src/components/playlist_builder_buttons.tsx) (57 lines): Replace Semantic UI `<Dropdown>` and `<Button>` with a styled native `<select>` and `<button disabled={!canCreatePlaylist}>`.
    - *Why this is valuable:* Small, visual, self-contained components that let you practice Tailwind CSS v4 utility classes, responsive spacing, and `disabled:` state modifiers without complex state logic.
- [x] 🧑‍💻 **Task 3.3: Wire `useMutation` in [`src/components/create_playlist_container.tsx`](file:///Users/alexcaulfield/src/setlistify/src/components/create_playlist_container.tsx)**
  - **🧑‍💻 Manual Contribution Opportunity:** Replace the raw `fetch('/api/buildPlaylist')` inside `handleCreatePlaylist` with TanStack Query's `useMutation`:
    ```tsx
    const buildPlaylistMutation = useMutation({
      mutationFn: buildPlaylist,
      onSuccess: (data) => {
        if (data?.playlistUri) {
          setPlaylistUrl(data.playlistUri);
        }
      },
    });
    ```
    And update the container markup from Semantic UI `<Container>`, `<Button>`, `<Icon>` to Tailwind CSS.
    - *Why this is valuable:* Teaches the standard TanStack Query mutation lifecycle (`mutate`, `onSuccess`, `isPending`, `error`) used for any POST/PUT/DELETE action.
- [x] 🤖 / 🧑‍💻 **Task 3.4: Migrate [`src/components/search_container.tsx`](file:///Users/alexcaulfield/src/setlistify/src/components/search_container.tsx) (Combobox UI + Dependent Queries)**
  - **Agent part:** Build the custom Tailwind searchable artist combobox UI (`<input>` + clear button + positioned `<ul>` dropdown list with `onMouseDown` selection handling) and concert `<select>` markup.
  - **🧑‍💻 Manual Contribution Opportunity:** Wire the TanStack Query hooks inside [`src/components/search_container.tsx`](file:///Users/alexcaulfield/src/setlistify/src/components/search_container.tsx) for:
    1. Autocomplete artist search (`useQuery` keyed on `['artistSearch', searchQuery, token]`, `enabled: searchQuery.trim().length > 0`).
    2. Fetching setlists when an artist is selected (`useQuery` keyed on `['artistSetlists', selectedArtistName]`, `enabled: Boolean(selectedArtistName)`), formatting options with `formatSetlists`.
    - *Why this is valuable:* Reactive, dependent queries driven by state (`searchQuery` → artists → `selectedArtistName` → setlists) are where TanStack Query shines brightest compared to manual event-handler `fetch` chains.

---

### Phase 4: Testing, CI/CD & Documentation Updates
- [x] 🤖 **Task 4.1: Migrate Frontend Tests to Vitest**
  - Update `src/setupTests.ts` to import `@testing-library/jest-dom/vitest`.
  - Update [`src/App.test.tsx`](file:///Users/alexcaulfield/src/setlistify/src/App.test.tsx) to work with Vitest, React 19, and mocked `/api/authUrl` fetch.
- [x] 🤖 **Task 4.2: Update CI & Vercel Config**
  - Update [`.github/workflows/ci.yml`](file:///Users/alexcaulfield/src/setlistify/.github/workflows/ci.yml) to verify generated TypeScript types are in sync (`go run ./cmd/gentypes && git diff --exit-code src/api/types.gen.ts`) and update line 48 from `yarn test --watchAll=false` to `yarn test`.
  - Update [`vercel.json`](file:///Users/alexcaulfield/src/setlistify/vercel.json) `buildCommand` to `yarn build`.
- [x] 🤖 **Task 4.3: Update [`ARCHITECTURE.md`](file:///Users/alexcaulfield/src/setlistify/ARCHITECTURE.md) and [`README.md`](file:///Users/alexcaulfield/src/setlistify/README.md)**
  - Update the Frontend Technology Stack, Mermaid diagram, and test instructions in [`ARCHITECTURE.md`](file:///Users/alexcaulfield/src/setlistify/ARCHITECTURE.md) and [`README.md`](file:///Users/alexcaulfield/src/setlistify/README.md) to reflect Vite, React 19, TanStack Router, TanStack Query, Tailwind CSS v4, and Vitest.

---

## 4. Verification Plan

- **Automated Tests:**
  ```bash
  # Regenerate TypeScript types from Go structs and verify no drift
  yarn gen:types && git diff --exit-code src/api/types.gen.ts

  # Run Go backend tests
  go test -v ./...

  # Run frontend Vitest unit tests
  yarn test

  # Verify TypeScript compilation and Vite production bundle build
  yarn build
  ```
- **Manual Verification:**
  1. Start the Go dev server: `go run ./cmd/devserver` (listens on `:5001`).
  2. Start the Vite dev server: `yarn start` (listens on `http://127.0.0.1:3000` and proxies `/api/*` to `:5001`).
  3. Open `http://127.0.0.1:3000`:
     - Verify `GET /api/authUrl` loads via TanStack Query and renders the `"Login with Spotify"` button.
     - Click `"Login with Spotify"`, complete OAuth redirect to `/callback?code=...`, and verify `POST /api/getUser` exchanges the code and navigates to `/createPlaylist`.
     - Search for an artist in the autocomplete combobox, verify `POST /api/artistSearch` populates dropdown options, and select an artist.
     - Verify `ArtistCard` renders and `POST /api/artistSetlists` populates the concert `<select>` dropdown.
     - Select a concert, click `"Create Playlist"`, verify `POST /api/buildPlaylist` creates the Spotify playlist, and verify the `"Check out your playlist"` button appears and links to the generated playlist.

---

## 5. Potential Risks & Maintenance Concerns

- **StrictMode Double-Invocation on `/callback` OAuth Code Exchange:**
  - React 19 `<StrictMode>` runs effects twice in development, and Spotify OAuth authorization codes are single-use. Using TanStack Query (`useQuery` with `queryKey: ['getUser', code]` and `staleTime: Infinity` / `retry: false`) deduplicates the in-flight `POST /api/getUser` request automatically, preventing a duplicate code exchange failure in dev mode.
- **Custom Combobox Click-Outside & Blur Handling:**
  - Because we are replacing Semantic UI's `<Dropdown search selection />` with a native `<input>` + custom `<ul>` dropdown list rather than a headless UI primitive library, clicking an option in the dropdown list must use `onMouseDown` (with `e.preventDefault()`) so input blur does not unmount the list before selection fires.
- **Local Dev Loopback Host (`127.0.0.1` vs `localhost`):**
  - Vite defaults to binding `localhost`. Setting `server: { host: '127.0.0.1', port: 3000 }` in `vite.config.ts` ensures `http://127.0.0.1:3000/callback` matches the registered Spotify Redirect URI.
