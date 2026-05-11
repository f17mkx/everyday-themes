# Changelog

## 2026-05-11 — v0.1.0 initial bootstrap

- 5 bundled themes: `everyday` (dark+light), `everyday-citrus` (light), `Glass` (dark+light), `Glass Superpro` (dark+light), `Domaine Velvet` (dark+light)
- `everyday-portal-styles.js` v11 — deep shadow CSS injection for `wa-popup` (HA dropdowns) + `wa-popover` (HA generic-picker / language-picker); theme-gated via `--everyday-frosted-portals` CSS-var so other themes stay unaffected
- M3 + MDC button vars tied to brand tokens (fixes dark-on-dark "Add card" + HA-cyan "Done" button in HA dashboards)
- `hui-card-options` all-four-corners rounding (no more sharp-top-edges on edit-mode toolbar)
- Hemma-style sidebar + frosted-glass cards/headers/dialogs
- Wallpaper-backed lovelace (dark + light variants)

Source-of-truth: extracted from `f17mkx/everyday-ha` (private umbrella repo). Sync workflow: edits land in `everyday-ha/themes/`, then mirrored here.
