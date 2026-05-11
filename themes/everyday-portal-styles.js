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

console.log('[everyday-portal-styles] v11 module loaded, readyState=' + document.readyState);

const FALLBACK_STYLE_ID = 'everyday-portal-styles-fallback';
const POPUP_SHADOW_STYLE_ID = 'everyday-portal-popup-style';
const DROPDOWN_SHADOW_STYLE_ID = 'everyday-portal-dropdown-style';

// Fallback: document.head CSS. Reaches body-portal popups natively.
// v10 2026-05-11: + wa-popover support (ha-generic-picker -> ha-language-picker on /profile/general)
//                + hui-card-options border-radius (BUG-004 sharp top-edges in dashboard edit-mode)
const FALLBACK_CSS = `
  /* HA dropdown menu (body-portal case, rare) */
  div#menu[part="menu"] {
    background-color: rgba(255,255,255,0.20) !important;
    backdrop-filter: blur(20px) saturate(1.4) !important;
    -webkit-backdrop-filter: blur(20px) saturate(1.4) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    border-radius: 14px !important;
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
    border-radius: 14px !important;
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
    border-radius: 14px !important;
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
      const tagged = root.querySelectorAll?.('[data-everyday-styled="true"], [data-everyday-card-opt-styled="true"]') || [];
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

// v10: BUG-004 - hui-card-options has bottom-only border-radius by default
// (only bottom-left/bottom-right rounded, top corners sharp). Find each
// hui-card-options shadowRoot's .options container and apply all-corner radius.
function findCardOptionsContainers(root, found = []) {
  if (!root) return found;
  try {
    const all = root.querySelectorAll?.('hui-card-options') || [];
    for (const el of all) {
      if (el.shadowRoot) {
        // .options is the inner toolbar div with bottom-only radius
        const opt = el.shadowRoot.querySelector('.options, .header, [class*="toolbar"]');
        if (opt) found.push(opt);
        // Also the host itself - sometimes the radius is on the host
        found.push(el);
      }
    }
    const everything = root.querySelectorAll?.('*') || [];
    for (const el of everything) {
      if (el.shadowRoot) findCardOptionsContainers(el.shadowRoot, found);
    }
  } catch (e) {}
  return found;
}

function styleCardOptions(el) {
  if (el.dataset.everydayCardOptStyled === 'true') return false;
  el.style.setProperty('border-radius', '14px', 'important');
  el.style.setProperty('border-top-left-radius', '14px', 'important');
  el.style.setProperty('border-top-right-radius', '14px', 'important');
  el.style.setProperty('border-bottom-left-radius', '14px', 'important');
  el.style.setProperty('border-bottom-right-radius', '14px', 'important');
  el.style.setProperty('overflow', 'hidden', 'important');
  el.dataset.everydayCardOptStyled = 'true';
  return true;
}

// Apply inline styles to a div#menu element. Inline wins over
// adoptedStyleSheets + <style> tags + !important cascade.
function styleMenu(m) {
  if (m.dataset.everydayStyled === 'true') return false;
  // v8: bg alpha 0.20 für Stefan's blur-Beurteilung (vorher var(--card-background-color) = 0.70/0.35)
  m.style.setProperty('background-color', 'rgba(255,255,255,0.20)', 'important');
  m.style.setProperty('backdrop-filter', 'blur(20px) saturate(1.4)', 'important');
  m.style.setProperty('-webkit-backdrop-filter', 'blur(20px) saturate(1.4)', 'important');
  m.style.setProperty('border', '1px solid rgba(255,255,255,0.08)', 'important');
  m.style.setProperty('border-radius', '14px', 'important');
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
  // v10: now also catches div[part="body"] and dialog[part="dialog"] (wa-popover surfaces)
  const menus = findAllMenus(document);
  let inlineApplied = 0;
  for (const m of menus) {
    if (styleMenu(m)) inlineApplied++;
  }
  inlineTotal += inlineApplied;

  // v10: also walk hui-card-options for BUG-004 sharp top-edges
  const cardOptContainers = findCardOptionsContainers(document);
  let cardOptApplied = 0;
  for (const el of cardOptContainers) {
    if (styleCardOptions(el)) cardOptApplied++;
  }

  if (!firstInlineApplied && inlineApplied > 0) {
    firstInlineApplied = true;
    console.log('[everyday-portal-styles] FIRST inline style applied to div#menu, count=' + inlineApplied);
  }

  if (injectedPopups > 0 || injectedDropdowns > 0 || inlineApplied > 0 || cardOptApplied > 0) {
    lastInjected = Date.now();
    console.log('[everyday-portal-styles] sweep: popup-style=' + injectedPopups + ' dropdown-style=' + injectedDropdowns + ' inline-menu=' + inlineApplied + ' card-opts=' + cardOptApplied + ' (found ' + popups.length + ' popups, ' + popovers.length + ' popovers, ' + dropdowns.length + ' dropdowns, ' + menus.length + ' menus, ' + cardOptContainers.length + ' card-opts, inline-total=' + inlineTotal + ')');
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
