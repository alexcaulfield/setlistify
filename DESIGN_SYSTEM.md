# Design System

## Overview

Setlistify uses **Semantic UI React** (`semantic-ui-react` `^0.88.2`) paired with the **Semantic UI 2.4.1** stylesheet loaded via CDN in `public/index.html`, supplemented by lightweight global CSS (`src/index.css`, `src/App.css`) and targeted inline layout styles.

---

## Typography

### Font Stacks
* **Primary UI / Body (`src/index.css` & Semantic UI)**:
  ```css
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  ```
  * Font smoothing: `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;`
* **Headings & UI Controls (Semantic UI 2.4.1 Default)**:
  * `'Lato', 'Helvetica Neue', Arial, Helvetica, sans-serif`
* **Monospace / Code (`src/index.css`)**:
  ```css
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
  ```

### Typographic Scale & Usage
* **Card Headers (`<Card.Header>`)**: `1.28571429em`, bold (`700`), used for displaying the logged-in user's name in `HeaderCard` and the selected artist's name in `ArtistCard`.
* **Card Meta (`<Card.Meta>`)**: `1em`, muted (`rgba(0, 0, 0, 0.4)`), used for artist genre tags.
* **Card Description (`<Card.Description>`)**: `1em`, standard body copy (`rgba(0, 0, 0, 0.68)`), used for artist follower counts with accompanying `<Icon name="user" />`.

---

## Color Palette

Setlistify relies on Semantic UI's default light surface tokens along with brand accents:

| Role | Token / Value | Usage |
| :--- | :--- | :--- |
| **Background (Page)** | `#FFFFFF` | Default page background |
| **Surface (Card / Input)** | `#FFFFFF` | `<Card>`, `<Dropdown>` backgrounds |
| **Button Neutral** | `#E0E1E2` (hover `#CACBCD`) | Default Semantic UI `<Button>` fill |
| **Border / Divider** | `#D4D4D5` / `rgba(34, 36, 38, 0.15)` | Card borders and dropdown input outlines |
| **Text Primary** | `rgba(0, 0, 0, 0.87)` | Headings, input text, active dropdown items |
| **Text Secondary / Muted** | `rgba(0, 0, 0, 0.4)` | `<Card.Meta>`, input placeholders |
| **Dark Header Surface** | `#282C34` | `.App-header` dark surface token (`src/App.css`) |
| **Accent Link** | `#61DAFB` | `.App-link` highlight (`src/App.css`) |
| **Theme Color** | `#000000` | Browser `<meta name="theme-color">` |

---

## Layout, Spacing & Depth Conventions

### Page Structure
* **Root Flex Shell (`src/App.tsx`)**:
  * Full-viewport vertical flex column: `display: flex; min-height: 100vh; flex-direction: column; text-align: center;`.
  * Primary content area expands with `flex: 1` and a top offset of `3vh`.
* **Containers (`<Container>`)**:
  * Content sections (`HeaderCard`, `CreatePlaylistContainer`, `SearchContainer`, `PlaylistBuilderButtons`) are wrapped in Semantic UI `<Container>` for responsive horizontal margins and max-width constraints.

### Spacing Scale
* **Macro Vertical Rhythm**: Viewport-relative units (`3vh` between top header and main route view; `2vh` between search controls, action buttons, artist card, and playlist link button).
* **Micro Control Spacing**: `8px` (`marginTop: '8px'`) between the primary artist search `<Dropdown>` and the secondary concert setlist `<Dropdown>`.

### Cards & Elevation
* **Header Bar (`<Card fluid centered>`)**: Full-width container card at the top of the app showing either a `<Icon name="music" size="big" />` (logged out) or the authenticated Spotify user's display name.
* **Artist Profile (`<Card>`)**: Centered card (`display: flex; justify-content: center`) displaying the artist's Spotify image (`<Image wrapped ui={false} />`), name, primary genre, and follower count.
* **Elevation**: Standard Semantic UI card shadow:
  ```css
  box-shadow: 0 1px 3px 0 #d4d4d5, 0 0 0 1px #d4d4d5;
  border-radius: 0.28571429rem;
  ```

---

## Component & Styling Conventions

1. **Prefer Semantic UI React Primitives**:
   * Use `Container`, `Card`, `Button`, `Dropdown`, `Icon`, `Image`, and `Placeholder` from `semantic-ui-react` before introducing custom CSS classes.
2. **Icons**:
   * Use Semantic UI's built-in FontAwesome icon set via `<Icon name="..." />` (e.g., `name="spotify"`, `name="music"`, `name="user"`).
3. **Interactive Controls**:
   * Search inputs and selectors use `<Dropdown selection ... />` (`fluid`, `search`, `clearable` where appropriate).
   * Action buttons disable cleanly via `disabled={!canCreatePlaylist}` until both an artist and a concert setlist are selected.
4. **External Links**:
   * External Spotify links (`playlistUrl`) wrap a `<Button>` in `<a href={...} target="_blank" rel="noopener noreferrer">`.
