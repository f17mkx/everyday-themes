/**
 * everyday-portal-styles - deep shadow CSS injection for HA Web Components.
 *
 * Loaded via `frontend.extra_module_url` in configuration.yaml so this JS
 * runs on EVERY HA page (incl. /profile/general, /config/*, /lovelace/*).
 *
 * v4 2026-05-11: sweep on click/keydown + periodic safety net.
 *
 * Why v3 failed: ha-dropdown lazy-mounts <wa-popup> into its shadowRoot only
 * on user click. MutationObserver on document.body cannot see mutations
 * inside any shadow root (encapsulation), so observer never fired.
 *
 * v4 strategy: walk all shadow roots periodically and after every click /
 * keydown event - whenever wa-popup spawns somewhere deep, we find it on
 * the next sweep and inject <style> into its shadowRoot.
 *
 * Real DOM path (from Firefox DevTools):
 *   div#menu[part="menu"] ← in wa-popup.shadowRoot
 *   wa-popup              ← in ha-dropdown.shadowRoot
 *   ha-dropdown           ← in ha-select.shadowRoot
 *   ha-select             ← light DOM of ha-settings-row
 *   ha-pick-theme-row.shadowRoot → hass-tabs-subpage.shadowRoot → ...
 *
 * Pattern reference: superpro-light-card-dev/cairo-v1/src/helpers/popup-portal-styles.ts
 * (P14c.2/P15) - same approach for body-portal popups in custom card.
 */

console.log('[everyday-portal-styles] v21 module loaded, readyState=' + document.readyState);

const FALLBACK_STYLE_ID = 'everyday-portal-styles-fallback';
const POPUP_SHADOW_STYLE_ID = 'everyday-portal-popup-style';
const DROPDOWN_SHADOW_STYLE_ID = 'everyday-portal-dropdown-style';

// Fallback: document.head CSS. Reaches body-portal popups natively.
// v10 2026-05-11: + wa-popover support (ha-generic-picker -> ha-language-picker on /profile/general)
//                + hui-card-options border-radius (BUG-004 sharp top-edges in dashboard edit-mode)
// v20 2026-05-12: border-radius `0 0 14px 14px` (flat top, rounded bottom) - Stefan-Wunsch
//                 so dropdowns look like "natural extension" of trigger above them.
const FALLBACK_CSS = `
  /* HA dropdown menu (body-portal case, rare) */
  div#menu[part="menu"] {
    background-color: rgba(255,255,255,0.20) !important;
    backdrop-filter: blur(20px) saturate(1.4) !important;
    -webkit-backdrop-filter: blur(20px) saturate(1.4) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    border-radius: 0 0 14px 14px !important;
  }

  /* everyday-light-card popups (body-portal via .everyday-popup-portal).
     Card defines bg in POPUP_PORTAL_STYLES (popup-portal-styles.ts);
     we override with frosted-glass.
     Exclusions: .inplace-popup.wheel + .topology-popup-card stay transparent. */
  .everyday-popup-portal .parallel-popup .popup-card,
  .everyday-popup-portal .inplace-popup.saved,
  .everyday-popup-portal .inplace-popup.effects {
    background-color: rgba(255,255,255,0.20) !important;
    backdrop-filter: blur(20px) saturate(1.4) !important;
    -webkit-backdrop-filter: blur(20px) saturate(1.4) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    box-shadow: 0 20px 60px rgba(0,0,0,0.30) !important;
  }
`;

// Injected INTO wa-popup.shadowRoot - selector local to that shadow.
const POPUP_SHADOW_CSS = `
  div#menu[part="menu"],
  div#menu {
    background-color: var(--card-background-color, rgba(20,12,32,0.65)) !important;
    backdrop-filter: blur(20px) saturate(1.4) !important;
    -webkit-backdrop-filter: blur(20px) saturate(1.4) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    border-radius: 0 0 14px 14px !important;
  }
`;

// Injected INTO ha-dropdown.shadowRoot - targets wa-popup's exposed parts.
// (Parts auto-expose one shadow boundary up, so from ha-dropdown's shadow
// we can reach wa-popup's internal div#menu via ::part(menu).)
const DROPDOWN_SHADOW_CSS = `
  wa-popup::part(menu),
  wa-popup::part(popup),
  wa-popup::part(body) {
    background-color: var(--card-background-color, rgba(20,12,32,0.65)) !important;
    backdrop-filter: blur(20px) saturate(1.4) !important;
    -webkit-backdrop-filter: blur(20px) saturate(1.4) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    border-radius: 0 0 14px 14px !important;
  }
`;

let firstFoundPopup = false;
let firstFoundDropdown = false;
let firstInlineApplied = false;
let lastInjected = 0;
let inlineTotal = 0;
let lastThemeState = null; // v11: track theme-state changes for cleanup-on-switch

// v11 BUG-006: Theme-Guard. Only apply frosted-glass when the everyday-family
// theme is active. Detection: --everyday-frosted-portals CSS-var, set to 'true'
// in `everyday` + `everyday-citrus` theme yaml. Other themes (default, Glass,
// Domaine Velvet) don't define it -> empty string -> skip + cleanup.
function isEverydayThemeActive() {
  try {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue('--everyday-frosted-portals').trim();
    return v === 'true' || v === '"true"' || v === "'true'";
  } catch (e) {
    return false;
  }
}

// v11 BUG-006 cleanup: undo all previously-applied inline styles when theme
// switches away from everyday. Walks dataset-tagged elements and resets.
function cleanupAllInlineStyles() {
  // Find all elements we tagged with dataset.everydayStyled
  function walkAndClean(root) {
    if (!root) return;
    try {
      const tagged = root.querySelectorAll?.('[data-everyday-styled="true"], [data-everyday-card-opt-styled="true"], [data-everyday-grid-styled="true"], [data-everyday-button-styled="true"]') || [];
      for (const el of tagged) {
        if (el.dataset.everydayStyled === 'true') {
          el.style.removeProperty('background-color');
          el.style.removeProperty('backdrop-filter');
          el.style.removeProperty('-webkit-backdrop-filter');
          el.style.removeProperty('border');
          el.style.removeProperty('border-radius');
          delete el.dataset.everydayStyled;
        }
        if (el.dataset.everydayCardOptStyled === 'true') {
          el.style.removeProperty('border-radius');
          el.style.removeProperty('border-top-left-radius');
          el.style.removeProperty('border-top-right-radius');
          el.style.removeProperty('border-bottom-left-radius');
          el.style.removeProperty('border-bottom-right-radius');
          el.style.removeProperty('overflow');
          delete el.dataset.everydayCardOptStyled;
        }
        if (el.dataset.everydayGridStyled === 'true') {
          el.style.removeProperty('border-radius');
          delete el.dataset.everydayGridStyled;
        }
        if (el.dataset.everydayButtonStyled === 'true') {
          el.style.removeProperty('--wa-color-brand-fill-loud');
          el.style.removeProperty('--wa-color-brand-fill-normal');
          el.style.removeProperty('--wa-color-brand-fill-quiet');
          el.style.removeProperty('--wa-color-brand-on-loud');
          el.style.removeProperty('--wa-color-brand-on-normal');
          el.style.removeProperty('--wa-color-brand-on-quiet');
          // v18: also remove v15-v17 non-brand vars in case theme switched FROM v15-17 state
          el.style.removeProperty('--wa-color-on-loud');
          el.style.removeProperty('--wa-color-on-normal');
          el.style.removeProperty('--wa-color-on-quiet');
          el.style.removeProperty('--wa-color-fill-loud');
          el.style.removeProperty('--wa-color-fill-normal');
          el.style.removeProperty('--wa-color-fill-quiet');
          if (el.shadowRoot) {
            const hoverFix = el.shadowRoot.querySelector('style#everyday-ha-button-hover-fix');
            if (hoverFix) hoverFix.remove();
          }
          delete el.dataset.everydayButtonStyled;
        }
      }
      const all = root.querySelectorAll?.('*') || [];
      for (const el of all) {
        if (el.shadowRoot) walkAndClean(el.shadowRoot);
      }
    } catch (e) {}
  }
  walkAndClean(document);
  // Reset first-found flags so console-logs re-fire when theme switches back
  firstFoundPopup = false;
  firstFoundDropdown = false;
  firstInlineApplied = false;
  inlineTotal = 0;
}

// Inject fallback in document.head once.
function injectFallback() {
  if (document.getElementById(FALLBACK_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = FALLBACK_STYLE_ID;
  style.textContent = FALLBACK_CSS;
  document.head.appendChild(style);
  console.log('[everyday-portal-styles] fallback CSS in document.head');
}

// Recursively walk all shadow roots, collect elements matching tagName.
function deepCollect(root, tagName, found = []) {
  if (!root) return found;
  try {
    const direct = root.querySelectorAll?.(tagName) || [];
    for (const el of direct) found.push(el);
    const all = root.querySelectorAll?.('*') || [];
    for (const el of all) {
      if (el.shadowRoot) deepCollect(el.shadowRoot, tagName, found);
    }
  } catch (e) {
    // some shadow roots may throw on querySelectorAll - skip
  }
  return found;
}

// Inject style into element.shadowRoot if not already present.
function injectIntoShadow(host, styleId, css) {
  if (!host || !host.shadowRoot) return false;
  if (host.shadowRoot.querySelector('style#' + styleId)) return false;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = css;
  host.shadowRoot.appendChild(style);
  return true;
}

// v7: Deep-walk all shadow roots to find both div[part="menu"] AND
// div[part="popup"]. div[part="popup"] is the OUTER popup chrome
// (popover="manual", top-layer rendered) - that's the actual visible
// surface that needs backdrop-filter. div[part="menu"] is the INNER
// content projected via slot. Both get styled to be safe.
// v10: + div[part="body"] (wa-popover inner, used by ha-language-picker)
//      + dialog[part="dialog"] (wa-popover top-level <dialog>, top-layer)
// v11: REMOVED dialog[part="dialog"] - top-layer <dialog> backdrop-filter
//      blurred entire viewport behind popup, not just popup surface (Stefan-report 2026-05-11).
//      Only the inner content surface (div[part="body"]) needs frosted-glass.
function findAllMenus(root, found = []) {
  if (!root) return found;
  try {
    const direct = root.querySelectorAll?.('div[part="menu"], div#menu, div[part="popup"], div[part="body"]') || [];
    for (const el of direct) found.push(el);
    const all = root.querySelectorAll?.('*') || [];
    for (const el of all) {
      if (el.shadowRoot) findAllMenus(el.shadowRoot, found);
    }
  } catch (e) {}
  return found;
}

// v12: BUG-004 inline-style approach REVERTED (Stefan-Befund: didn't work visually).
// Replacement lives in everyday-themes.yaml card-mod-root-yaml:
//   ha-card.type-custom-grid-layout { border-radius: unset !important }
// Functions findCardOptionsContainers + styleCardOptions removed.

// v13: BUG-004 fix-v3 - Stefan-Verify revealed v12 card-mod yaml-block ALSO didn't reach
// the cascade depth needed. Back to inline-style approach, but this time targeting
// Stefan's specific selector `ha-card.type-custom-grid-layout` (not the hui-card-options
// inner toolbar). Inline border-radius: 0 forces flat corners, letting the edit-mode
// toolbar geometry sit flush with the card body.
function findGridLayoutCards(root, found = []) {
  if (!root) return found;
  try {
    const direct = root.querySelectorAll?.('ha-card.type-custom-grid-layout') || [];
    for (const el of direct) found.push(el);
    const all = root.querySelectorAll?.('*') || [];
    for (const el of all) {
      if (el.shadowRoot) findGridLayoutCards(el.shadowRoot, found);
    }
  } catch (e) {}
  return found;
}

function styleGridLayoutCard(el) {
  if (el.dataset.everydayGridStyled === 'true') return false;
  // v16: Stefan-Refinement - statt 0 (flach) verwenden wir die same border-radius
  // wie standard HA-Karten via --ha-border-radius-lg. Wert wird im theme yaml auf 30px
  // gesetzt, sodass standard cards + grid-layout cards visually konsistent rendern.
  el.style.setProperty('border-radius', 'var(--ha-border-radius-lg)', 'important');
  el.dataset.everydayGridStyled = 'true';
  return true;
}

// v14: BUG-003 fix-v3 - yaml-vars with !important DID NOT win against :host cascade
// in wa-button's shadow scope (recon 2026-05-11 19:36: --wa-color-brand-fill-loud stayed
// at HA-default #009ac7 even after `'var(--primary-color) !important'` in :root via yaml).
// Solution: set the wa-vars inline on each ha-button host element. Inline-style wins
// over :host{} declarations in any shadow tree (same pattern as dropdown frosted-glass).
//
// The 4 vars cover both "brand" variant (Done button: appearance="filled" variant="brand")
// and "normal/default" variant. Other variants (warning, success, etc.) fall back to HA defaults
// which is fine.
function findAllHaButtons(root, found = []) {
  if (!root) return found;
  try {
    const direct = root.querySelectorAll?.('ha-button') || [];
    for (const el of direct) found.push(el);
    const all = root.querySelectorAll?.('*') || [];
    for (const el of all) {
      if (el.shadowRoot) findAllHaButtons(el.shadowRoot, found);
    }
  } catch (e) {}
  return found;
}

function styleHaButton(el) {
  // v21 Stefan-Bug: white-on-white plain-brand buttons on /developer-tools/yaml.
  // Root cause: v17 set 12 wa-vars inline (including --wa-color-on-quiet: white in everyday-light).
  // v18 removed those vars from the SETTER, but already-styled buttons (dataset=true) skipped re-style,
  // so the v17 inline-vars persisted. My v18 shadow-rule then resolved `color: var(--wa-color-on-quiet)`
  // to the lingering white = invisible on white card-bg.
  // Fix: bump version-marker so v21 re-applies fresh, and force-clean any old non-brand vars.
  if (el.dataset.everydayButtonStyledV === '21') return false;

  // Force-clean v17-era stale non-brand wa-vars from this element (the dataset flag from
  // any earlier version remains, but we explicitly wipe the offending inline keys)
  el.style.removeProperty('--wa-color-on-loud');
  el.style.removeProperty('--wa-color-on-normal');
  el.style.removeProperty('--wa-color-on-quiet');
  el.style.removeProperty('--wa-color-fill-loud');
  el.style.removeProperty('--wa-color-fill-normal');
  el.style.removeProperty('--wa-color-fill-quiet');

  // Remove old shadow-injected styles too (they referenced the now-wiped vars)
  if (el.shadowRoot) {
    const oldHover = el.shadowRoot.querySelector('style#everyday-ha-button-hover-fix');
    if (oldHover) oldHover.remove();
  }

  const cs = getComputedStyle(document.documentElement);
  const primaryColor = cs.getPropertyValue('--primary-color').trim() || '#001848';
  const textPrimaryColor = cs.getPropertyValue('--text-primary-color').trim() || '#ffffff';

  // Brand-variant vars (only): Done-button + other variant="brand" elements.
  // Non-brand vars stay at HA-defaults (Stefan likes that look).
  el.style.setProperty('--wa-color-brand-fill-loud', primaryColor, 'important');
  el.style.setProperty('--wa-color-brand-fill-normal', primaryColor, 'important');
  el.style.setProperty('--wa-color-brand-fill-quiet', primaryColor, 'important');
  el.style.setProperty('--wa-color-brand-on-loud', textPrimaryColor, 'important');
  el.style.setProperty('--wa-color-brand-on-normal', textPrimaryColor, 'important');
  el.style.setProperty('--wa-color-brand-on-quiet', textPrimaryColor, 'important');

  // v21 shadow-inject: surgical plain-appearance text fix.
  // Non-hover plain text → use --primary-color (theme-tied, visible on transparent card bg).
  //   Previous v18 used --wa-color-on-quiet which on brand-plain buttons cascaded to white via
  //   :host([variant="brand"]) cascade rule = white-on-white bug.
  // Hover plain → white text (readable on WA's blue hover-bg).
  if (el.shadowRoot && !el.shadowRoot.querySelector('style#everyday-ha-button-hover-fix')) {
    const s = document.createElement('style');
    s.id = 'everyday-ha-button-hover-fix';
    s.textContent = `
      :host([appearance~="plain"]) .button:not(.disabled):not(.loading) {
        color: var(--primary-color, ${primaryColor}) !important;
      }
      @media (hover: hover) {
        :host([appearance~="plain"]) .button:not(.disabled):not(.loading):hover {
          color: var(--text-primary-color, ${textPrimaryColor}) !important;
        }
      }
    `;
    el.shadowRoot.appendChild(s);
  }

  el.dataset.everydayButtonStyled = 'true';
  el.dataset.everydayButtonStyledV = '21';
  return true;
}

// Apply inline styles to a div#menu element. Inline wins over
// adoptedStyleSheets + <style> tags + !important cascade.
function styleMenu(m) {
  if (m.dataset.everydayStyled === 'true') return false;
  // v8: bg alpha 0.20 für Stefan's blur-Beurteilung (vorher var(--card-background-color) = 0.70/0.35)
  // v20: border-radius `0 0 14px 14px` (flat top, rounded bottom) - Stefan-Wunsch:
  //      dropdowns sollen wie "natural extension" des Triggers oberhalb wirken.
  m.style.setProperty('background-color', 'rgba(255,255,255,0.20)', 'important');
  m.style.setProperty('backdrop-filter', 'blur(20px) saturate(1.4)', 'important');
  m.style.setProperty('-webkit-backdrop-filter', 'blur(20px) saturate(1.4)', 'important');
  m.style.setProperty('border', '1px solid rgba(255,255,255,0.08)', 'important');
  m.style.setProperty('border-radius', '0 0 14px 14px', 'important');
  m.dataset.everydayStyled = 'true';
  return true;
}

function sweep() {
  // v11 BUG-006: theme-guard - only run when everyday-family theme is active.
  // Detects theme-switch by tracking state; cleans up old inline styles on
  // every transition (everyday -> other OR other -> everyday-back).
  const themeActive = isEverydayThemeActive();
  if (lastThemeState !== themeActive) {
    if (lastThemeState !== null) {
      console.log('[everyday-portal-styles] theme-state change: everyday-active=' + themeActive + ' (was=' + lastThemeState + '), cleaning up inline styles');
      cleanupAllInlineStyles();
    }
    lastThemeState = themeActive;
  }
  if (!themeActive) {
    // Non-everyday theme is active. Skip all injection.
    return;
  }

  const popups = deepCollect(document, 'wa-popup');
  // v10: + wa-popover (used by ha-generic-picker -> ha-language-picker)
  const popovers = deepCollect(document, 'wa-popover');
  const dropdowns = deepCollect(document, 'ha-dropdown');

  let injectedPopups = 0;
  let injectedDropdowns = 0;

  if (!firstFoundPopup && popups.length > 0) {
    firstFoundPopup = true;
    console.log('[everyday-portal-styles] FIRST wa-popup detected: ' + popups.length + ' instance(s)');
  }
  if (!firstFoundDropdown && dropdowns.length > 0) {
    firstFoundDropdown = true;
    console.log('[everyday-portal-styles] FIRST ha-dropdown detected: ' + dropdowns.length + ' instance(s)');
  }

  for (const p of popups) {
    if (injectIntoShadow(p, POPUP_SHADOW_STYLE_ID, POPUP_SHADOW_CSS)) injectedPopups++;
  }
  // v10: also inject into wa-popover shadowRoot (uses div[part="body"] instead of div#menu)
  for (const p of popovers) {
    if (injectIntoShadow(p, POPUP_SHADOW_STYLE_ID, POPUP_SHADOW_CSS)) injectedPopups++;
  }
  for (const d of dropdowns) {
    if (injectIntoShadow(d, DROPDOWN_SHADOW_STYLE_ID, DROPDOWN_SHADOW_CSS)) injectedDropdowns++;
  }

  // v6: deep-walk for div[part="menu"] anywhere, regardless of which shadow contains it
  // v10: now also catches div[part="body"] (wa-popover surface for ha-language-picker)
  // v11: removed dialog[part="dialog"] (was leaking backdrop-blur to whole viewport)
  // v12: hui-card-options walk removed (Stefan-Befund: didn't work, moved to card-mod yaml)
  const menus = findAllMenus(document);
  let inlineApplied = 0;
  for (const m of menus) {
    if (styleMenu(m)) inlineApplied++;
  }
  inlineTotal += inlineApplied;

  // v13: BUG-004 - inline border-radius:0 on ha-card.type-custom-grid-layout
  // (Stefan-Befund: card-mod yaml-block from v12 ALSO didn't reach cascade depth)
  const gridCards = findGridLayoutCards(document);
  let gridApplied = 0;
  for (const c of gridCards) {
    if (styleGridLayoutCard(c)) gridApplied++;
  }

  // v14: BUG-003 - inline wa-vars on ha-button host (yaml-vars with !important failed
  // against wa-button's :host cascade)
  const haButtons = findAllHaButtons(document);
  let btnApplied = 0;
  for (const b of haButtons) {
    if (styleHaButton(b)) btnApplied++;
  }

  if (!firstInlineApplied && inlineApplied > 0) {
    firstInlineApplied = true;
    console.log('[everyday-portal-styles] FIRST inline style applied to div#menu, count=' + inlineApplied);
  }

  if (injectedPopups > 0 || injectedDropdowns > 0 || inlineApplied > 0 || gridApplied > 0 || btnApplied > 0) {
    lastInjected = Date.now();
    console.log('[everyday-portal-styles] sweep: popup-style=' + injectedPopups + ' dropdown-style=' + injectedDropdowns + ' inline-menu=' + inlineApplied + ' grid-cards=' + gridApplied + ' ha-buttons=' + btnApplied + ' (found ' + popups.length + ' popups, ' + popovers.length + ' popovers, ' + dropdowns.length + ' dropdowns, ' + menus.length + ' menus, ' + gridCards.length + ' grid-cards, ' + haButtons.length + ' ha-buttons, inline-total=' + inlineTotal + ')');
  }
}

// Expose for manual debug from console
window.__everydaySweep = sweep;

// Debounced sweep trigger.
let sweepTimer = null;
function scheduleSweep(delay = 50) {
  if (sweepTimer) clearTimeout(sweepTimer);
  sweepTimer = setTimeout(() => {
    sweepTimer = null;
    sweep();
  }, delay);
}

function bootstrap() {
  console.log('[everyday-portal-styles] bootstrap, readyState=' + document.readyState);
  injectFallback();
  sweep();

  // Initial multi-timeout sweeps for HA hydration
  setTimeout(sweep, 500);
  setTimeout(sweep, 1500);
  setTimeout(sweep, 3000);
  setTimeout(sweep, 5000);

  // Sweep on any user interaction - lazy-mounted dropdowns spawn on click
  document.addEventListener('click', () => {
    scheduleSweep(50);
    scheduleSweep(200);
  }, { capture: true, passive: true });

  document.addEventListener('keydown', () => {
    scheduleSweep(50);
  }, { capture: true, passive: true });

  // Periodic safety net - idempotent, cheap if nothing changed
  setInterval(sweep, 2000);

  console.log('[everyday-portal-styles] sweepers + listeners + interval armed');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
