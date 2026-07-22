# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, no-build website for **Bhascraft**, a Minecraft server. It's plain HTML/CSS/vanilla JS with no package manager, bundler, or test suite — there is nothing to install or compile. Preview changes by opening the HTML files directly in a browser or serving the directory with any static file server (e.g. `python3 -m http.server`).

The site has two parts:
- `index.html` (repo root) — the landing page: parallax hero, logo, and a "Play" button that copies the server IP (`51.148.188.225`) to the clipboard.
- `wiki/` — the docs site, linked from the landing page's "Docs" button.

## Architecture: the `wiki/` docs system

The docs site is a single-page app (`wiki/index.html`) that renders Markdown pages client-side. There is no server-side routing or static site generator — everything happens in the browser at request time.

**Page loading (`wiki/js/main.js`)**: On boot, `probe(1)` fetches `wiki/pages/1.md`, `2.md`, `3.md`, … sequentially via `fetch`, stopping at the first missing file. This means:
- Pages are added by creating the next sequential numbered file in `wiki/pages/` (currently `1.md` through `7.md`) — there's no manifest/index file to update.
- A page's nav title and URL slug are both derived from its content, not the filename: the first `# H1` heading in the Markdown becomes the page title, and the title is slugified (lowercased, non-alphanumeric → `-`) to become the routing id used in the URL hash (`#slug`) and nav links.
- Renumbering or deleting a page file shifts every later page's fetch order but not its slug/identity, since identity comes from the heading text.
- All page text is cached in memory (`cache` for rendered HTML, `rawCache` for plain text used by search) after the initial probe — there's no re-fetching per navigation.

**Rendering**: Markdown is parsed with `marked` (loaded from a CDN in `wiki/index.html`, not vendored). Rendered HTML supports raw HTML passthrough, which pages use for custom components: `.gm-grid`/`.gm-card` (gamemode link cards), `.callout.callout-info` (info boxes), `.table-wrap` (auto-added around any `<table>` for horizontal scroll), and `.rank rank-*` spans for colored rank badges. See `wiki/pages/1.md` for examples of all of these.

**Search**: Client-side substring match over `pages[].title` and `rawCache[id]` (the plain-text content of each rendered page), debounced and re-rendered as animated result cards. No server or index file involved — it re-scans the in-memory page list on every keystroke.

**Theming (`wiki/js/config.js` + `wiki/config.json` + `wiki/themes/*.json`)**: Visual config is data-driven, not hardcoded in CSS/HTML:
- `wiki/config.json` sets site metadata (title, logo, home link), font choices (must be one of the keys in `FONT_MAP` in `config.js` to get a Google Fonts `<link>` injected), sidebar width, and button styling — plus `"theme": "<name>"` pointing at a file in `wiki/themes/`.
- Each `wiki/themes/*.json` file is a flat map of color tokens (`bg`, `sidebar-bg`, `accent`, `text`, etc.) applied as CSS custom properties (`--bg`, `--accent`, …) on `:root`. `wiki/css/style.css` consumes these variables — it defines no colors of its own.
- To add a theme: drop a new JSON file in `wiki/themes/` following the same key set as an existing one (e.g. `ocean.json`), then set `"theme"` in `config.json` to its filename (without `.json`).
- To change the active theme or fonts, edit `wiki/config.json` — don't hand-edit CSS variables in `style.css`.
- If `config.json` is unreachable (e.g. opening the file directly via `file://` in some browsers), `config.js` fails open and reveals the page with CSS defaults rather than blocking render.

## Adding or editing a docs page

1. Edit or create `wiki/pages/N.md` (next sequential integer if adding a new page).
2. Start the file with a single `# Title` — this becomes both the nav label and the URL slug.
3. Use `##` for in-page sections (the existing pages follow this convention consistently).
4. Reference images via `images/<filename>` (relative to `wiki/index.html`); place the actual file in `wiki/images/`.

## Content notes

- Server IP (`51.148.188.225`) and Bedrock port (`19132`) are duplicated in the landing page script (`index.html`) and in `wiki/pages/1.md` — update both if the server address changes.
- `Anytype_space/` is an unrelated Anytype app data export living in the repo root; it is not part of the site and should not be treated as source content.
