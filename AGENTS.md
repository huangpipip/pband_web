# Repository Guidelines

## Project Structure & Module Organization
This repository is a static web app for reading `vasprun.xml` and plotting projected band structures.

- `index.html`: single-page app entrypoint and UI layout.
- `assets/app.js`: UI state, filtering, Plotly rendering, theme logic.
- `assets/vasprun-parser.js`: browser-side XML parsing and k-path handling.
- `assets/app.css`: page layout and visual styling.
- `vendor/plotly.min.js`: local Plotly bundle for offline use.
- `README.md`: end-user usage notes.

Keep new runtime code in `assets/`. Do not hand-edit `vendor/plotly.min.js` unless intentionally updating the bundled Plotly release.

## Build, Test, and Development Commands
There is no build step.

- `open index.html`
  Opens the app directly in a browser on macOS.
- `python3 -m http.server 8123`
  Serves the app locally for browser testing at `http://127.0.0.1:8123/`.
- `node --check assets/app.js`
  Syntax-checks the main UI script.
- `node --check assets/vasprun-parser.js`
  Syntax-checks the XML parser.

## Coding Style & Naming Conventions
- Use plain JavaScript, CSS, and HTML only; keep the app static and browser-run.
- Use 2-space indentation in HTML, CSS, and JS.
- Prefer small, named functions over deeply nested inline logic.
- Use `camelCase` for JS variables/functions, `UPPER_SNAKE_CASE` for constant palettes, and kebab-case for DOM ids only when already established in HTML.
- Keep parsing logic in `assets/vasprun-parser.js` and rendering/UI logic in `assets/app.js`.

## Testing Guidelines
No automated test framework is configured. Use:

- syntax checks with `node --check`
- manual browser verification with representative non-spin, spin-polarized, and SOC `vasprun.xml` files
- UI checks for orbital filters, theme switching, X-axis jumps, and Plotly export

If you add nontrivial parsing behavior, include at least one reproducible sample file path or test scenario in your change notes.

## Commit & Pull Request Guidelines
The workspace currently does not include Git history, so no repository-specific commit convention can be inferred. Use short imperative commit messages, preferably Conventional Commit style, for example:

- `feat: add orbital family view`
- `fix: handle k-path jump segmentation`

For pull requests, include:

- a brief summary of the user-visible change
- affected sample inputs (`ISPIN`, `SOC`, file size)
- screenshots for UI changes
- verification notes listing commands run and browser scenarios checked

## Security & Configuration Tips
All parsing happens client-side. Do not introduce server-side upload logic unless explicitly required. Keep external dependencies vendored or optional so the app remains usable offline.
