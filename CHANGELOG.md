# Changelog

## 2026-05-13 — v1.0.1 HACS submission prep

- 📚 **README top-section**: aligned with everyday-light-card pattern — added release-tag badge + release-notes link, HACS Pending badge, GitHub Sponsors + Buy Me a Coffee buttons, HA-min badge with logo
- 📚 **Install note**: "pending HACS-Default review" line above install options, mirroring lightcard's transitional copy until the HACS PR merges
- 🔧 **`.github/workflows/validate.yml`**: HACS validation workflow (category: `theme`) — required by hacs/default review process. Repo-guard `if: github.repository == 'f17mkx/everyday-themes'` prevents fork-side false passes
- 🐛 **HACS validator fix**: embedded `wallpapers/everyday-dark.jpg` + `wallpapers/everyday-light.jpg` as hero images under the badge row. The validator's `<Validation images>` check requires repo-internal image references; shields.io badges don't count
- 🔧 **GitHub repo topics**: `home-assistant`, `hacs`, `theme`, `ha-theme`, `lovelace`, `lovelace-theme`, `home-assistant-theme`, `frosted-glass`, `everyday`, `home-assistant-frontend` (required by HACS `<Validation topics>`)

Reason for cutting v1.0.1 immediately after v1.0.0: HACS-Bot validates the repo's LATEST RELEASE, not main HEAD. v1.0.0 was tagged BEFORE the validator-prep commits landed, so the bot saw the old README without wallpaper hero images and failed `<Validation images>`. v1.0.1 captures the current main state so the bot re-validates against the fixed README.

## 2026-05-13 — v1.0.0 single-theme public release

- 📦 **Public release**: repo flipped private → public, ready for HACS Custom Repository install
- 🎨 **Single-theme distribution**: bundle reduced from 5 themes (Domaine Velvet / Glass / everyday / everyday-citrus / Glass Superpro) + Hemma import → just `everyday`. Stefan-decision: ship the polished one, keep the experimental siblings private in `everyday-ha`.
- 📚 **README rewritten** for single-theme positioning
- ⚖️ **Wallpaper attribution** note added — Apple-stock iPadOS source acknowledged

Source `everyday.yaml` mirrors `everyday-ha/themes/everyday-themes.yaml` lines 809-1165 (the `everyday:` block). Companion `everyday-portal-styles.js` unchanged from previous bootstrap (v21 on HA-side, untouched here).

## 2026-05-12 — v0.2 (private, not released)

- 🎨 feat(themes): Hemma full-import + Glass→everyday box-shadow + wallpapers (v19 line of work, full bundle)
- 🎨 feat(themes): dropdown border-radius `0 0 14px 14px` (v20)
- 🐛 fix(themes): white-on-white plain-brand buttons regression (v21)

## 2026-05-11 — v0.1.0 initial private bootstrap

- 5 bundled themes: `everyday` (dark+light), `everyday-citrus` (light), `Glass` (dark+light), `Glass Superpro` (dark+light), `Domaine Velvet` (dark+light)
- `everyday-portal-styles.js` v11 — deep shadow CSS injection for `wa-popup` + `wa-popover`
- M3 + MDC button vars tied to brand tokens
- `hui-card-options` all-four-corners rounding
- Hemma-style sidebar + frosted-glass cards/headers/dialogs
- Wallpaper-backed lovelace (dark + light variants)

Source-of-truth: extracted from `f17mkx/everyday-ha` (private umbrella repo). Sync workflow: edits land in `everyday-ha/themes/`, then mirrored here.
