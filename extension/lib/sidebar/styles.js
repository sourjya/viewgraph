/**
 * Sidebar Shared Styles
 *
 * Centralized inline style constants for sidebar modules. Eliminates
 * duplicated style objects across review.js, inspect.js, strip.js, etc.
 * All sidebar UI lives in shadow DOM so CSS files cannot be used.
 *
 * @see docs/architecture/modularity-audit.md - F14 sidebar decomposition
 */

/** Base font stack used across all sidebar text. */
export const FONT = 'system-ui, sans-serif';

/** Monospace font for code/selector badges. */
export const FONT_MONO = 'SF Mono, Cascadia Code, monospace';

/**
 * Semantic color palette for the sidebar theme.
 * All sidebar modules should use these instead of hardcoded hex values.
 * Enables future theming by changing values in one place.
 */
export const COLOR = {
  muted: 'var(--vg-color-text-muted)',
  secondary: 'var(--vg-color-text-muted)',
  dim: 'var(--vg-color-text-dim)',
  text: 'var(--vg-color-text)',
  white: 'var(--vg-color-white)',
  primary: 'var(--vg-color-pending)',
  primaryLight: 'var(--vg-color-accent)',
  primaryHover: 'var(--vg-color-pending-dim)',
  success: 'var(--vg-color-success)',
  successDark: 'var(--vg-color-success-bg)',
  warning: 'var(--vg-color-warning-dim)',
  warningLight: 'var(--vg-color-warning)',
  error: 'var(--vg-color-danger)',
  errorLight: 'var(--vg-color-error)',
  errorDark: 'var(--vg-color-error-bg)',
  border: 'var(--vg-color-text-dim)',
  borderLight: 'var(--vg-surface-hover)',
  bgDark: 'var(--vg-surface-primary)',
  bgCard: 'var(--vg-surface-deep)',
  bgHover: 'var(--vg-surface-active)',
  bgHoverLight: 'rgba(255,255,255,0.06)',
  bgHoverSubtle: 'rgba(255,255,255,0.08)',
};

/**
 * Add hover background effect to a button element.
 * Consolidates the 40+ mouseenter/mouseleave pairs across sidebar modules.
 * @param {HTMLElement} el - The element to add hover to
 * @param {string} [hoverBg] - Background on hover (default: COLOR.bgHoverLight)
 * @param {string} [restBg] - Background at rest (default: 'transparent')
 */
export function addHover(el, hoverBg = COLOR.bgHoverLight, restBg = 'transparent') {
  el.addEventListener('mouseenter', () => { el.style.background = hoverBg; });
  el.addEventListener('mouseleave', () => { el.style.background = restBg; });
}

/** Common style for section/toggle labels (uppercase, small, muted). */
export const LABEL_STYLE = {
  fontWeight: '600', fontSize: '11px', color: 'var(--vg-color-text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.5px',
  fontFamily: FONT,
};

/** Style for toggle pill buttons (ON/OFF). */
export const TOGGLE_STYLE = {
  border: 'none', borderRadius: '10px', padding: '2px 10px', fontSize: '10px',
  fontWeight: '700', cursor: 'pointer', fontFamily: FONT,
};

/** Toggle ON state colors. */
export const TOGGLE_ON = { background: 'var(--vg-color-success-bg)', color: 'var(--vg-color-success)' };

/** Toggle OFF state colors. */
export const TOGGLE_OFF = { background: 'var(--vg-color-text-dim)', color: 'var(--vg-color-text-muted)' };

/** Style for footer action buttons (Send, Copy MD, Report). */
export const ACTION_BTN_STYLE = {
  display: 'flex', alignItems: 'center', gap: '4px',
  border: 'none', borderRadius: '6px', padding: '6px 10px',
  fontSize: '11px', fontWeight: '600', cursor: 'pointer',
  fontFamily: FONT,
};

/** Style for small icon-only buttons (resolve, delete, copy, note). */
export const ICON_BTN_STYLE = {
  border: 'none', background: 'transparent', cursor: 'pointer',
  padding: '2px', display: 'flex', flexShrink: '0',
};

/** Style for filter tab buttons. */
export const TAB_STYLE = {
  flex: '1', padding: '6px 0', border: 'none', background: 'transparent',
  cursor: 'pointer', fontSize: '11px', fontWeight: '600',
  fontFamily: FONT, textAlign: 'center',
};

/** Style for description text below toggles. */
export const DESC_STYLE = { color: 'var(--vg-color-text-dim)', fontSize: '10px', marginBottom: '6px' };

/** Thin horizontal divider. */
export const DIVIDER_STYLE = { border: 'none', borderTop: '1px solid var(--vg-border-default)', margin: '8px 0 4px' };

/** Thin subtle divider (darker). */
export const DIVIDER_SUBTLE_STYLE = { border: 'none', borderTop: '1px solid var(--vg-surface-hover)', margin: '4px 0' };
