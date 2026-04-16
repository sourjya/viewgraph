/**
 * Sidebar Collapsed Strip
 *
 * Vertical strip shown when sidebar is collapsed. Contains VG icon,
 * expand chevron, mode tool icons, and annotation count bubble.
 *
 * @see docs/architecture/modularity-audit.md - F14 sidebar decomposition
 */

import { ATTR } from '../selector.js';
import { getAnnotations } from '../annotate.js';

/**
 * Create the collapsed strip element.
 * @param {{ onExpand: function, modeIcons: Object, modeHints: Object, onModeClick: function }} opts
 * @returns {{ element: HTMLElement, updateCount: function, updateModeButtons: function }}
 */
export function createStrip(opts) {
  const { onExpand, modeIcons, modeHints, onModeClick } = opts;

  const el = document.createElement('div');
  el.setAttribute(ATTR, 'collapse-badge');
  Object.assign(el.style, {
    position: 'fixed', top: '60px', right: '0', zIndex: '2147483646',
    display: 'none', flexDirection: 'column', gap: '2px',
    padding: '6px 5px', borderRadius: '10px 0 0 10px',
    background: '#252536', border: '1px solid #333', borderRight: 'none',
    fontFamily: 'system-ui, sans-serif',
    boxShadow: '-2px 0 8px rgba(0,0,0,0.3)', alignItems: 'center',
  });

  // VG icon
  const stripIcon = document.createElement('img');
  stripIcon.src = chrome.runtime.getURL('icon-16.png');
  stripIcon.width = 28;
  stripIcon.height = 28;
  Object.assign(stripIcon.style, { cursor: 'pointer', padding: '2px' });
  stripIcon.title = 'ViewGraph';
  stripIcon.addEventListener('click', onExpand);
  el.appendChild(stripIcon);

  // Expand chevron
  const expandBtn = document.createElement('button');
  expandBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
  Object.assign(expandBtn.style, {
    border: 'none', background: 'transparent', color: '#a5b4fc',
    cursor: 'pointer', padding: '2px', borderRadius: '4px', display: 'flex',
  });
  expandBtn.title = 'Expand sidebar';
  expandBtn.addEventListener('click', onExpand);
  el.appendChild(expandBtn);

  // Separator 1
  const sep1 = document.createElement('div');
  Object.assign(sep1.style, { height: '1px', width: '100%', background: '#333', margin: '3px 0' });
  el.appendChild(sep1);

  // Mode icons
  const stripButtons = {};
  for (const [key, icon] of Object.entries(modeIcons)) {
    const btn = document.createElement('button');
    btn.innerHTML = icon.replace(/width="16" height="16"/, 'width="28" height="28"');
    btn.title = modeHints[key];
    btn.dataset.mode = key;
    Object.assign(btn.style, {
      border: 'none', background: 'transparent', color: '#9ca3af',
      cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex',
    });
    btn.addEventListener('mouseenter', () => { btn.style.background = '#2a2a4a'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });
    btn.addEventListener('click', (e) => { e.stopPropagation(); onModeClick(key); });
    stripButtons[key] = btn;
    el.appendChild(btn);
  }

  // Separator 2
  const sep2 = document.createElement('div');
  Object.assign(sep2.style, { height: '1px', width: '100%', background: '#333', margin: '3px 0' });
  el.appendChild(sep2);

  return {
    element: el,
    /** Update annotation count bubble. Always visible, dimmed when 0. */
    updateCount() {
      const count = getAnnotations().filter((a) => !a.resolved).length;
      let countEl = el.querySelector('[data-vg-badge-count]');
      if (!countEl) {
        countEl = document.createElement('div');
        countEl.setAttribute('data-vg-badge-count', '');
        Object.assign(countEl.style, { alignSelf: 'center', marginTop: '2px', position: 'relative', width: '32px', height: '32px' });
        el.appendChild(countEl);
      }
      const fill = count > 0 ? '#6366f1' : '#333';
      const stroke = count > 0 ? '#818cf8' : '#555';
      countEl.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/><text x="12" y="14" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif" font-size="10" font-weight="700">${count}</text></svg>`;
    },
    /** Sync mode button active states. */
    updateModeButtons(currentMode) {
      for (const [key, btn] of Object.entries(stripButtons)) {
        const isActive = currentMode === key;
        btn.style.background = isActive ? '#6366f1' : 'transparent';
        btn.style.color = isActive ? '#fff' : '#9ca3af';
      }
    },
  };
}
