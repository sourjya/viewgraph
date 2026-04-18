/**
 * Sidebar Collapsed Strip
 *
 * Vertical strip shown when sidebar is collapsed. Contains VG icon,
 * expand chevron, mode tool icons, and annotation count bubble.
 *
 * @see docs/architecture/modularity-audit.md - F14 sidebar decomposition
 */

import { ATTR } from '#lib/selector.js';
import { getAnnotations } from '#lib/annotate.js';
import { chevronLeftIcon, chatBubbleIcon } from './icons.js';
import { COLOR } from './styles.js';

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
    background: '#252536', border: `1px solid ${COLOR.border}`, borderRight: 'none',
    fontFamily: 'system-ui, sans-serif',
    boxShadow: '-2px 0 8px rgba(0,0,0,0.3)', alignItems: 'center',
  });

  // VG icon
  const stripIcon = document.createElement('img');
  stripIcon.src = chrome.runtime.getURL('icon-16.png');
  stripIcon.width = 28;
  stripIcon.height = 28;
  Object.assign(stripIcon.style, { cursor: 'pointer', padding: '2px' });
  stripIcon.setAttribute('data-tooltip', 'ViewGraph');
  stripIcon.addEventListener('click', onExpand);
  el.appendChild(stripIcon);

  // Expand chevron
  const expandBtn = document.createElement('button');
  expandBtn.appendChild(chevronLeftIcon(22, 'currentColor'));
  Object.assign(expandBtn.style, {
    border: 'none', background: 'transparent', color: COLOR.primaryLight,
    cursor: 'pointer', padding: '2px', borderRadius: '4px', display: 'flex',
  });
  expandBtn.setAttribute('data-tooltip', 'Expand sidebar');
  expandBtn.addEventListener('click', onExpand);
  el.appendChild(expandBtn);

  // Separator 1
  const sep1 = document.createElement('div');
  Object.assign(sep1.style, { height: '1px', width: '100%', background: COLOR.border, margin: '3px 0' });
  el.appendChild(sep1);

  // Mode icons
  const stripButtons = {};
  for (const [key, icon] of Object.entries(modeIcons)) {
    const btn = document.createElement('button');
    btn.innerHTML = icon.replace(/width="16" height="16"/, 'width="28" height="28"');
    btn.setAttribute('data-tooltip', modeHints[key]);
    btn.dataset.mode = key;
    Object.assign(btn.style, {
      border: 'none', background: 'transparent', color: COLOR.secondary,
      cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex',
    });
    btn.addEventListener('mouseenter', () => { if (btn.style.background !== 'rgb(99, 102, 241)') btn.style.background = COLOR.bgHover; });
    btn.addEventListener('mouseleave', () => { if (btn.style.background !== 'rgb(99, 102, 241)') btn.style.background = 'transparent'; });
    btn.addEventListener('click', (e) => { e.stopPropagation(); onModeClick(key); });
    stripButtons[key] = btn;
    el.appendChild(btn);
  }

  // Separator 2
  const sep2 = document.createElement('div');
  Object.assign(sep2.style, { height: '1px', width: '100%', background: COLOR.border, margin: '3px 0' });
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
      const fill = count > 0 ? COLOR.primary : COLOR.border;
      const stroke = count > 0 ? COLOR.primaryHover : COLOR.dim;
      countEl.replaceChildren(chatBubbleIcon(count, fill, stroke));
    },
    /** Sync mode button active states. */
    updateModeButtons(currentMode) {
      for (const [key, btn] of Object.entries(stripButtons)) {
        const isActive = currentMode === key;
        btn.style.background = isActive ? COLOR.primary : 'transparent';
        btn.style.color = isActive ? COLOR.white : COLOR.secondary;
      }
    },
  };
}
