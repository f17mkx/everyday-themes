# Everyday Themes for Home Assistant

> Premium HA themes with frosted-glass aesthetic — built for the modern Lovelace ecosystem.

A curated bundle of Home Assistant themes designed to look and feel like one cohesive product. Made by [@f17mkx](https://github.com/f17mkx).

## Included Themes

| Theme | Mode | Aesthetic |
|---|---|---|
| **everyday** | dark + light | Brand-purple (dark) / brand-navy (light), frosted-glass cards, wallpaper-backed |
| **everyday-citrus** | light only | Warm cream + brand-purple accent, frosted-glass cards |
| **Glass** | dark + light | Pure-glass minimalist, default neutral palette |
| **Glass Superpro** | dark + light | Glass + Superpro-brand color tokens (semantic state-icons) |
| **Domaine Velvet** | dark + light | Editorial luxury — champagne (light) + velvet (dark), serif headlines |

## Features

- **Frosted-glass cards** via `ha-card-backdrop-filter`
- **Frosted-glass dropdowns + popovers** via companion JS module (`everyday-portal-styles.js`) — reaches deep into shadow DOM where pure CSS-vars can't
- **Hemma-style sidebar drawer** with backdrop-filter
- **Theme-tied buttons** — Material 3 + MDC button vars hooked to brand tokens (no more dark-on-dark "Add card", no more HA-cyan "Done" buttons)
- **Card-options toolbar** — all-four-corners rounded edit-mode toolbar (BUG-004 fix)
- **Wallpaper-backed lovelace** — gentle blur, hero-friendly compositions
- **Mushroom + speaker-row compat** — semantic state-tokens for popular card ecosystems

## Installation

### Option A: HACS Custom Repo (recommended pre-default-listing)

1. HACS → ⋮ → Custom repositories
2. URL: `https://github.com/f17mkx/everyday-themes`
3. Category: `Theme`
4. Add → install **Everyday Themes**
5. Restart HA (themes file needs to be picked up on boot)
6. Profile → Theme → pick `everyday`
7. For frosted-glass dropdowns + popovers: in `configuration.yaml`:
   ```yaml
   frontend:
     extra_module_url:
       - /local/everyday-portal-styles.js?v=11
   ```
   Copy `themes/everyday-portal-styles.js` to `/config/www/` (HACS doesn't auto-deploy JS for theme-category installs). Restart HA core.

### Option B: Manual

1. Copy `themes/everyday-themes.yaml` → `/config/themes/` (or your themes dir)
2. Copy `themes/everyday-portal-styles.js` → `/config/www/`
3. Copy `wallpapers/everyday-dark.jpg` + `wallpapers/everyday-light.jpg` → `/config/www/wallpapers/`
4. In `configuration.yaml`:
   ```yaml
   frontend:
     themes: !include_dir_merge_named themes
     extra_module_url:
       - /local/everyday-portal-styles.js?v=11
   ```
5. Restart HA
6. Profile → Theme → pick `everyday`

## Companion Cards

These themes pair best with the [Superpro / Everyday card ecosystem](https://github.com/f17mkx?tab=repositories):

- [`superpro-light-card`](https://github.com/f17mkx/superpro-light-card) — group-aware light card with frosted-glass color/saved-color picker popups
- [`superpro-shutter-card`](https://github.com/f17mkx/superpro-shutter-card) — visual shutter/blinds card with theme-token styling

All Everyday/Superpro cards use the same `--brand-color`, `--active-color`, `--ha-card-background` tokens defined here.

## Architecture

- `themes/everyday-themes.yaml` — bundled 5 themes, all variable-rich (`everyday` + `everyday-citrus` use ~80+ Pareto-50 vars + M3/MDC button vars + Hemma frosted-glass tokens + Mushroom/speaker semantic state-tokens)
- `themes/everyday-portal-styles.js` — `frontend.extra_module_url`-loaded JS that deep-walks shadow DOM, frosts `wa-popup` (HA dropdowns) and `wa-popover` (HA generic-picker/language-picker). Theme-gated via `--everyday-frosted-portals` CSS-var, so other themes are unaffected.
- `wallpapers/everyday-dark.jpg` + `everyday-light.jpg` — hero wallpapers for `--lovelace-background`

## License

MIT — see [LICENSE](./LICENSE).

## Credits

- Hemma upstream theme (frosted-glass inspiration)
- Mushroom card team (variable conventions)
- Domaine Display Narrow (Klim Type Foundry — license-restricted, replaceable in yaml for non-commercial use)
