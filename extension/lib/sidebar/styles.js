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

/** Common style for section/toggle labels (uppercase, small, muted). */
export const LABEL_STYLE = {
  fontWeight: '600', fontSize: '11px', color: '#9ca3af',
  textTransform: 'uppercase', letterSpacing: '0.5px',
  fontFamily: FONT,
};

/** Style for toggle pill buttons (ON/OFF). */
export const TOGGLE_STYLE = {
  border: 'none', borderRadius: '10px', padding: '2px 10px', fontSize: '10px',
  fontWeight: '700', cursor: 'pointer', fontFamily: FONT,
};

/** Toggle ON state colors. */
export const TOGGLE_ON = { background: '#166534', color: '#4ade80' };

/** Toggle OFF state colors. */
export const TOGGLE_OFF = { background: '#333', color: '#666' };

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
export const DESC_STYLE = { color: '#555', fontSize: '10px', marginBottom: '6px' };

/** Thin horizontal divider. */
export const DIVIDER_STYLE = { border: 'none', borderTop: '1px solid #333', margin: '8px 0 4px' };

/** Thin subtle divider (darker). */
export const DIVIDER_SUBTLE_STYLE = { border: 'none', borderTop: '1px solid #2a2a3a', margin: '4px 0' };
