# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-02-14

Initial release.

### Added

- **Global CSS tab** — a live editor for arbitrary stylesheets, with multi-step undo,
  brace/quote/comment balance checking that reports a broken sheet instead of failing
  silently, and a token inserter that drops `var(--dsw-…)` at the caret.
- **Element picker tab** — click-to-style interaction over the live page. Generates
  stable selectors (semantic ids and `data-*` attributes first, hashed class names
  skipped, ancestor paths as fallback), reports computed values and match counts, and
  auto-appends `px` to bare lengths. The settings modal is hidden for the duration of
  picking and restored exactly afterwards, with a floating bar outside the modal so
  picking is never a trap.
- **Tokens tab** — all 163 `--dsw-*` design tokens extracted from the installed DSH's
  own stylesheets, grouped and searchable, each with independent light and dark values
  and per-token reset.
- **Density tab** — five live sliders (type scale, density, corner radius, content width
  cap, bubble radius), driven by CSS `calc()` so dragging does not recompose the sheet
  per frame.
- **Presets tab** — seven built-in packs, JSON export/import of the full configuration,
  and a one-click clear.
- Host half with a fenced `/custom-style/api` route persisting to
  `$DSH_HOME/custom-style.json`, plus a `localStorage` first-paint mirror so a reload is
  styled immediately.
- 89 behavior tests that run against the built bundle through the real
  `window.__ModuleLoader__.load({ id, factory })` contract.

### Notes

- The plugin registers no theme and never touches `ctx.theme`, so it composes with
  standalone theming plugins instead of competing with them.
- No runtime dependencies: the only module the browser half needs (`react`) comes from
  the DSH shell's frozen platform module table.

[Unreleased]: https://github.com/wupup/dsh-custom-style/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/wupup/dsh-custom-style/releases/tag/v0.1.0
