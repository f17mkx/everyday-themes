# Changelog

## 2026-05-12 — v19 Hemma full-import + box-shadow + wallpapers

- 🎨 feat(themes): NEW `Hemma` theme - canonical upstream willsanderson/Hemma imported verbatim (1338 lines), only modification: `lovelace-background` per-mode using everyday-light/dark wallpapers. Theme count: 5→6.
- 🎨 feat(themes): `everyday` now gets the full Hemma box-shadow stack (8 top-level shadow base vars + 7 per-mode binding vars in dark+light). Cards now render with the same inset rim+specular 'glass-pane' edge highlight as Hemma upstream.
- 🎨 feat(themes): `Glass` theme gets everyday-light wallpaper (light) + everyday-dark wallpaper (dark). Previously Hemma upstream lacked a `lovelace-background` and rendered against a generated radial-gradient fallback.
- 🎨 feat(themes): `Glass Superpro` gets everyday-dark wallpaper for BOTH modes (Synthwave palette wants the dark backdrop either way).

## 2026-05-11 — v0.1.0 initial bootstrap

- 5 bundled themes: `everyday` (dark+light), `everyday-citrus` (light), `Glass` (dark+light), `Glass Superpro` (dark+light), `Domaine Velvet` (dark+light)
- `everyday-portal-styles.js` v11 — deep shadow CSS injection for `wa-popup` (HA dropdowns) + `wa-popover` (HA generic-picker / language-picker); theme-gated via `--everyday-frosted-portals` CSS-var so other themes stay unaffected
- M3 + MDC button vars tied to brand tokens (fixes dark-on-dark "Add card" + HA-cyan "Done" button in HA dashboards)
- `hui-card-options` all-four-corners rounding (no more sharp-top-edges on edit-mode toolbar)
- Hemma-style sidebar + frosted-glass cards/headers/dialogs
- Wallpaper-backed lovelace (dark + light variants)

Source-of-truth: extracted from `f17mkx/everyday-ha` (private umbrella repo). Sync workflow: edits land in `everyday-ha/themes/`, then mirrored here.
