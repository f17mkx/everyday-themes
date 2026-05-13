# Everyday — premium Home Assistant theme

> Frosted-glass aesthetic, dark + light modes, wallpaper-backed Lovelace.
> Built for the modern HA frontend — brand-tied buttons, theme-token-only styling, Mushroom + speaker-row compatible.

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![HA min](https://img.shields.io/badge/Home%20Assistant-2024.6.0+-41BDF5)

## What you get

- **`everyday`** — single coherent theme with dark + light modes
  - Dark: Vegas Lila brand (`#6b2d8f`) + Sunset Orange active (`#FF7E3A`) on deep purple wallpaper
  - Light: Navy brand (`#001848`) + Mint Teal active (`#58bcb4`) on soft mint wallpaper
- **Frosted-glass cards** via native `ha-card-backdrop-filter`
- **Frosted-glass dropdowns + popovers** via companion JS module — reaches deep into the HA shadow DOM where pure CSS can't
- **Brand-tied buttons** — Material 3 + MDC vars hooked to theme tokens (no more dark-on-dark "Add card", no more HA-cyan "Done" buttons)
- **Hemma-style box-shadow stack** — inset rim + specular edge highlight for that "glass-pane" look
- **Wallpaper-backed Lovelace** with gentle blur for hero-friendly compositions
- **Mushroom + speaker-row compat** — semantic state-tokens for popular card ecosystems
- **`hui-card-options` all-four-corners rounding** — no more sharp-top-edges on edit-mode toolbar

## Installation

### Option A: HACS Custom Repository (recommended)

1. HACS → ⋮ → Custom repositories
2. URL: `https://github.com/f17mkx/everyday-themes`
3. Category: `Theme`
4. Add → install **Everyday**
5. Restart Home Assistant (themes file needs picking up on boot)
6. Profile → Theme → pick `everyday`
7. For frosted-glass dropdowns + popovers (companion JS module):
   - Copy `themes/everyday-portal-styles.js` to your HA config's `/config/www/` directory
   - In `configuration.yaml`:
     ```yaml
     frontend:
       extra_module_url:
         - /local/everyday-portal-styles.js?v=21
     ```
   - Restart HA core

### Option B: Manual install

1. Copy `themes/everyday.yaml` → `/config/themes/` (or your themes directory)
2. Copy `themes/everyday-portal-styles.js` → `/config/www/`
3. Copy `wallpapers/everyday-dark.jpg` + `wallpapers/everyday-light.jpg` → `/config/www/wallpapers/`
4. In `configuration.yaml`:
   ```yaml
   frontend:
     themes: !include_dir_merge_named themes
     extra_module_url:
       - /local/everyday-portal-styles.js?v=21
   ```
5. Restart HA
6. Profile → Theme → pick `everyday`

## Companion cards

This theme pairs best with the [Everyday card ecosystem](https://github.com/f17mkx?tab=repositories&q=everyday):

- [`everyday-light-card`](https://github.com/f17mkx/everyday-light-card) — group-aware light card with frosted-glass color/saved-color picker popups
- [`everyday-shutter-card`](https://github.com/f17mkx/everyday-shutter-card) — visual shutter/blinds card with theme-token styling

All Everyday cards consume the same `--brand-color`, `--active-color`, `--ha-card-background` tokens this theme defines.

## Architecture

- `themes/everyday.yaml` — single bundled theme. ~80+ Pareto-50 CSS-variables including:
  - M3 + MDC button-color vars
  - Hemma-style frosted-glass tokens (`ha-card-backdrop-filter`, `ha-dialog-surface-backdrop-filter`)
  - Mushroom + speaker-row semantic state-tokens
  - Card-mod root + sidebar YAML blocks (requires HACS `lovelace-card-mod` for the sidebar frost)
- `themes/everyday-portal-styles.js` — `frontend.extra_module_url`-loaded JS that walks shadow DOM, frosts `wa-popup` (HA dropdowns) and `wa-popover` (HA generic-picker / language-picker). Theme-gated via `--everyday-frosted-portals` so other themes stay unaffected.
- `wallpapers/everyday-dark.jpg` + `everyday-light.jpg` — hero wallpapers for `--lovelace-background`.

## Wallpaper attribution

Default wallpapers are derived from Apple-stock iPadOS backgrounds (WWDC 2019 series), resized + JPG-converted. The dark variant has been manually recolored. For personal use this is generally non-controversial; **replace with your own via `themes/wallpapers/` override if redistributing commercially**. Any compatible JPG / PNG works — update `lovelace-background` in `everyday.yaml` to point at a different path.

## License

MIT — see [LICENSE](./LICENSE).

## Credits

- Hemma upstream theme (frosted-glass inspiration, `ha-shadow-*` recipe)
- Mushroom card team (variable conventions)
- Apple (default wallpapers — see attribution above)
