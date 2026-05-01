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
  muted: 'var(--vg-color-text-muted, #666)',
  secondary: 'var(--vg-color-text-muted, #9ca3af)',
  dim: 'var(--vg-color-text-dim, #555)',
  text: 'var(--vg-color-text, #c8c8d0)',
  white: 'var(--vg-color-white, #fff)',
  primary: 'var(--vg-color-pending, #6366f1)',
  primaryLight: 'var(--vg-color-accent, #a5b4fc)',
  primaryHover: 'var(--vg-color-pending-dim, #818cf8)',
  success: 'var(--vg-color-success, #4ade80)',
  successDark: 'var(--vg-color-success-bg, #166534)',
  warning: 'var(--vg-color-warning-dim, #f59e0b)',
  warningLight: 'var(--vg-color-warning, #fbbf24)',
  error: 'var(--vg-color-danger, #dc2626)',
  errorLight: 'var(--vg-color-error, #f87171)',
  errorDark: 'var(--vg-color-error-bg, #7f1d1d)',
  border: 'var(--vg-color-text-dim, #333)',
  borderLight: 'var(--vg-surface-hover, #2a2a3a)',
  bgDark: 'var(--vg-surface-primary, #1a1a2e)',
  bgCard: 'var(--vg-surface-deep, #16161e)',
  bgHover: 'var(--vg-surface-active, #2a2a4a)',
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
  fontWeight: '600', fontSize: '11px', color: 'var(--vg-color-text-muted, #9ca3af)',
  textTransform: 'uppercase', letterSpacing: '0.5px',
  fontFamily: FONT,
};

/** Style for toggle pill buttons (ON/OFF). */
export const TOGGLE_STYLE = {
  border: 'none', borderRadius: '10px', padding: '2px 10px', fontSize: '10px',
  fontWeight: '700', cursor: 'pointer', fontFamily: FONT,
};

/** Toggle ON state colors. */
export const TOGGLE_ON = { background: 'var(--vg-color-success-bg, #166534)', color: 'var(--vg-color-success, #4ade80)' };

/** Toggle OFF state colors. */
export const TOGGLE_OFF = { background: 'var(--vg-color-text-dim, #333)', color: 'var(--vg-color-text-muted, #666)' };

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
export const DESC_STYLE = { color: 'var(--vg-color-text-dim, #555)', fontSize: '10px', marginBottom: '6px' };

/** Thin horizontal divider. */
export const DIVIDER_STYLE = { border: 'none', borderTop: '1px solid var(--vg-border-default, #333)', margin: '8px 0 4px' };

/** Thin subtle divider (darker). */
export const DIVIDER_SUBTLE_STYLE = { border: 'none', borderTop: '1px solid var(--vg-surface-hover, #2a2a3a)', margin: '4px 0' };
