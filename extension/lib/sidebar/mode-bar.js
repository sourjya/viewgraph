/**
 * Sidebar Mode Bar
 *
 * Capture mode selector with three buttons: Element, Region, Page.
 * Each button shows an SVG icon, label, and hint text.
 * Element/Region toggle capture mode; Page adds a page note directly.
 *
 * @see lib/annotate.js - setCaptureMode, getCaptureMode, CAPTURE_MODES
 */

import { ATTR } from '#lib/selector.js';
import { COLOR, FONT } from './styles.js';
import { setSvg } from './icons.js';

/** SVG icons for each capture mode (trusted internal strings). */
export const MODE_ICONS = {
  element: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/></svg>',
  region: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="4 2"/></svg>',
  page: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
};

export const MODE_HINTS = {
  element: 'Click to select',
  region: 'Shift+drag area',
  page: 'Add a page note',
};

/**
 * Create the capture mode bar.
 *
 * @param {Object} opts
 * @param {Function} opts.onModeClick - Called with mode key ('element'|'region'|'page')
 * @returns {{ element: HTMLElement, buttons: Object, updateActive: Function }}
 */
export function createModeBar({ onModeClick }) {
  const modeBar = document.createElement('div');
  modeBar.setAttribute(ATTR, 'mode-bar');
  Object.assign(modeBar.style, {
    display: 'flex', gap: '4px', padding: '6px 8px',
    borderBottom: `1px solid ${COLOR.borderLight}`, flexShrink: '0',
  });

  const buttons = {};
  for (const [key, icon] of Object.entries(MODE_ICONS)) {
    const btn = document.createElement('button');
    btn.setAttribute(ATTR, `mode-${key}`);
    setSvg(btn, icon);
    const labelSpan = document.createElement('span');
    Object.assign(labelSpan.style, { fontSize: '10px', marginTop: '2px' });
    labelSpan.textContent = key.charAt(0).toUpperCase() + key.slice(1);
    const hintSpan = document.createElement('span');
    Object.assign(hintSpan.style, { fontSize: '9px', color: COLOR.muted, marginTop: '1px' });
    hintSpan.textContent = MODE_HINTS[key];
    btn.append(labelSpan, hintSpan);
    Object.assign(btn.style, {
      flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '2px', padding: '6px 4px', border: `1px solid ${COLOR.border}`, borderRadius: '6px',
      background: 'transparent', color: COLOR.secondary, cursor: 'pointer',
      fontSize: '11px', fontFamily: FONT, transition: 'all 0.15s',
    });
    btn.addEventListener('click', () => onModeClick(key));
    buttons[key] = btn;
    modeBar.appendChild(btn);
  }

  /**
   * Update button active states based on current capture mode.
   * @param {string|null} currentMode - Active mode key or null
   */
  function updateActive(currentMode) {
    for (const [key, btn] of Object.entries(buttons)) {
      const isActive = currentMode === key;
      btn.style.background = isActive ? COLOR.primary : 'transparent';
      btn.style.color = isActive ? COLOR.white : COLOR.secondary;
      btn.style.borderColor = isActive ? COLOR.primary : COLOR.border;
    }
  }

  return { element: modeBar, buttons, updateActive };
}
