# Plan: Support Cover Songs in Go Setlist Playlist Generation

- **Date:** 2026-10-29
- **Status:** approved

## 1. Overview

When artists perform live concerts, their setlists on Setlist.fm frequently include cover songs credited to the original artist via a `cover` object (containing `mbid`, `name`, `sortName`, etc.), as well as pre-recorded walk-on/intro songs marked with `"tape": true`.

Currently, [`ExtractSongNames`](file:///Users/alexcaulfield/src/setlistify/internal/setlistfm/helpers.go#L9-L24) in the Go backend flattens setlists into a slice of bare song title strings (`[]string`), discarding the `cover` metadata and including `tape` tracks. Downstream, [`ResolveTrackIDs`](file:///Users/alexcaulfield/src/setlistify/internal/spotify/playlist.go#L41-L80) only queries Spotify using the performing artist's name (`artist:<performingArtist> track:<song>`). If the performing artist has not released a studio/live recording of that cover on Spotify, the track either fails to resolve or matches an unrelated track during loose fallback search.

### Objectives
- **Branch off `go-poc`**: Implement cover song support in the Go backend on a dedicated feature branch off `go-poc`.
- **Preserve Cover Metadata**: Extend Setlist.fm song extraction in [`internal/setlistfm/helpers.go`](file:///Users/alexcaulfield/src/setlistify/internal/setlistfm/helpers.go) to retain original artist info (`cover.mbid` / `cover.name`) for cover songs.
- **Filter Out Tape Tracks**: Exclude pre-recorded PA/walk-on tracks (`tape: true`) when checking for and extracting setlist songs.
- **Smart Spotify Cover Resolution**: When resolving a cover song on Spotify, search for the performing artist's version first (`artist:<performingArtist> track:<song>`), and if not found, fall back to the original artist (`artist:<coverArtist> track:<song>`, then loose `<coverArtist> <song>`).

---

## 2. Architectural Decisions

### Alignment with `ARCHITECTURE.md`
- **Package Decoupling (`internal/setlistfm` vs. `internal/spotify`)**:
  - `internal/setlistfm` remains responsible for parsing and normalizing Setlist.fm domain models ([`Setlist`](file:///Users/alexcaulfield/src/setlistify/internal/setlistfm/types.go#L64-L73), [`Song`](file:///Users/alexcaulfield/src/setlistify/internal/setlistfm/types.go#L43-L49), [`Artist`](file:///Users/alexcaulfield/src/setlistify/internal/setlistfm/types.go#L4-L10)).
  - `internal/spotify` remains decoupled from `internal/setlistfm` by accepting a lightweight `spotify.SongQuery` struct (`Name`, `CoverArtist`) rather than importing Setlist.fm types directly.
- **No Frontend Changes Required**:
  - Playlist creation is triggered via `POST /api/buildPlaylist` with `playlistId` (the Setlist.fm setlist ID). Because `api/buildPlaylist.go` fetches the full setlist directly from Setlist.fm, cover resolution happens transparently on the Go backend without altering frontend request/response contracts.
- **Two-Stage Cover Search Without False-Positive Shadowing**:
  - Currently, [`SearchSongTrack`](file:///Users/alexcaulfield/src/setlistify/internal/spotify/playlist.go#L13-L37) immediately falls back from `artist:<artist> track:<song>` to an unfiltered query `<artist> <song>`. For a cover song like Lawrence covering Britney Spears's `"Toxic"`, an unfiltered query `"Lawrence Toxic"` can return unrelated tracks on Spotify and prevent the fallback from ever reaching Britney Spears.
  - To prevent false positives, cover resolution will execute in strict priority order:
    1. `artist:<performingArtist> track:<songName>` (strict match in case the performing artist released the cover on Spotify)
    2. `artist:<coverArtist> track:<songName>` (strict match for the original artist from `cover`)
    3. `<coverArtist> <songName>` (unfiltered fallback for the original artist)
    4. `<performingArtist> <songName>` (last-resort unfiltered fallback)

---

## 3. Step-by-Step Implementation Details

- [x] **Task 1: Create Feature Branch off `go-poc`**
  - Create and switch to a new branch off `go-poc` (e.g., `git checkout -b feat/cover-songs go-poc`).

- [x] **Task 2: Extend Song Extraction & Tape Filtering in [`internal/setlistfm/helpers.go`](file:///Users/alexcaulfield/src/setlistify/internal/setlistfm/helpers.go)**
  - Update [`SetlistHasSongs(s *Setlist) bool`](file:///Users/alexcaulfield/src/setlistify/internal/setlistfm/helpers.go#L27-L41) to skip songs where `sng.Tape == true`.
  - Update [`ExtractSongNames(s *Setlist) []string`](file:///Users/alexcaulfield/src/setlistify/internal/setlistfm/helpers.go#L9-L24) to skip `sng.Tape == true`.
  - Add `ExtractSongs(s *Setlist) []Song` in [`internal/setlistfm/helpers.go`](file:///Users/alexcaulfield/src/setlistify/internal/setlistfm/helpers.go):
    - Iterates through all `s.Sets.Set` and `st.Song`.
    - Skips any song where `sng.Tape == true` or `strings.TrimSpace(sng.Name) == ""`.
    - Normalizes `sng.Name` (trimmed) and preserves `sng.Cover` when a valid cover artist is present (`sng.Cover != nil` with non-empty `Name` / `MBID`).

- [x] **Task 3: Support Cover Fallback in [`internal/spotify/playlist.go`](file:///Users/alexcaulfield/src/setlistify/internal/spotify/playlist.go)**
  - Define `SongQuery`:
    ```go
    // SongQuery represents a song to resolve on Spotify, with an optional original cover artist.
    type SongQuery struct {
        Name        string
        CoverArtist string
    }
    ```
  - Refactor [`SearchSongTrack`](file:///Users/alexcaulfield/src/setlistify/internal/spotify/playlist.go#L13-L37) / add `SearchTrack(ctx context.Context, client *spotifyclient.Client, performingArtist string, song SongQuery) (*spotifyclient.FullTrack, error)`:
    - Helper `searchFirstTrack(ctx, client, query)` executes `client.Search(ctx, query, spotifyclient.SearchTypeTrack)` and returns the first track if `len > 0`.
    - If `song.CoverArtist != ""` and `!strings.EqualFold(song.CoverArtist, performingArtist)`:
      1. Query `artist:<performingArtist> track:<song.Name>`
      2. If no match, query `artist:<song.CoverArtist> track:<song.Name>`
      3. If no match, query `<song.CoverArtist> <song.Name>`
      4. If no match, query `<performingArtist> <song.Name>`
    - Otherwise (not a cover):
      1. Query `artist:<performingArtist> track:<song.Name>`
      2. If no match, query `<performingArtist> <song.Name>`
  - Update [`ResolveTrackIDs`](file:///Users/alexcaulfield/src/setlistify/internal/spotify/playlist.go#L41-L80) to accept `songs []SongQuery` while keeping the bounded `errgroup` concurrency (`concurrencyLimit = 5`) and preserving setlist order.

- [x] **Task 4: Wire Cover Songs in [`api/buildPlaylist.go`](file:///Users/alexcaulfield/src/setlistify/api/buildPlaylist.go)**
  - Replace `setlistfm.ExtractSongNames(...)` calls with `setlistfm.ExtractSongs(...)`.
  - Map the extracted `[]setlistfm.Song` slice into `[]spotify.SongQuery`, populating `CoverArtist` when `sng.Cover != nil && strings.TrimSpace(sng.Cover.Name) != ""` (identifying covers via `sng.Cover` / `sng.Cover.MBID`).
  - Pass `[]spotify.SongQuery` to `spotify.ResolveTrackIDs`.

- [x] **Task 5: Unit Tests in [`internal/setlistfm/helpers_test.go`](file:///Users/alexcaulfield/src/setlistify/internal/setlistfm/helpers_test.go) & [`internal/spotify/playlist_test.go`](file:///Users/alexcaulfield/src/setlistify/internal/spotify/playlist_test.go)**
  - In [`internal/setlistfm/helpers_test.go`](file:///Users/alexcaulfield/src/setlistify/internal/setlistfm/helpers_test.go):
    - Test `ExtractSongs` with the sample payload (`"Toxic"` with Britney Spears `cover` object + `"Don't Lose Sight"` without `cover`).
    - Test `tape: true` filtering in both `ExtractSongs` and `SetlistHasSongs` (including a setlist that only has `tape: true` songs returning `false`).
  - In [`internal/spotify/playlist_test.go`](file:///Users/alexcaulfield/src/setlistify/internal/spotify/playlist_test.go):
    - Wire the mock HTTP `roundTripperFunc` into an actual `*spotifyclient.Client` and assert `ResolveTrackIDs` behavior for:
      1. Original song by performing artist.
      2. Cover song where performing artist has their own recording on Spotify (resolves performing artist's track).
      3. Cover song where performing artist does not have a recording on Spotify (falls back to `artist:Britney Spears track:Toxic`).
      4. Cover song that falls back to loose `<coverArtist> <songName>` search.

---

## 4. Verification Plan

- **Automated Tests:**
  ```bash
  go test -v ./...
  ```
- **Manual Verification:**
  1. Start the Go dev server: `go run ./cmd/devserver`
  2. Start the React frontend: `yarn start`
  3. Search for an artist whose setlists include covers (e.g., Lawrence performing `"Toxic"` originally by Britney Spears), build the playlist, and verify that `"Toxic"` (either by Lawrence if available or Britney Spears) and non-cover tracks (`"Don't Lose Sight"`) are added in setlist order while `tape: true` intro tracks are excluded.

---

## 5. Potential Risks & Maintenance Concerns

- **Missing `cover.name` on Setlist.fm**: Setlist.fm's API schema requires `name` and `mbid` on `Artist` objects (including `cover`), so `cover.name` is consistently populated whenever `cover` is present. Checking `strings.TrimSpace(sng.Cover.Name) != ""` guards against malformed entries and safely falls back to the performing artist.
- **Spotify Rate Limiting on Fallback Searches**: Cover songs that miss on the performing artist require a second Spotify Search API call (`artist:<coverArtist> track:<song>`). Because `ResolveTrackIDs` bounds concurrency to 5 goroutines (`g.SetLimit(5)`) and typical concert setlists have 1–3 covers out of ~15–20 songs, the additional requests remain well within Spotify's rate limits.
