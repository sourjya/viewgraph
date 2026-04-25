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

  // VG icon - doubles as drag handle (BUG-024)
  const stripIcon = document.createElement('img');
  stripIcon.src = chrome.runtime.getURL('icon-16.png');
  stripIcon.width = 28;
  stripIcon.height = 28;
  Object.assign(stripIcon.style, { cursor: 'pointer', padding: '2px', userSelect: 'none' });
  stripIcon.setAttribute('data-tooltip', 'ViewGraph');
  stripIcon.draggable = false; // prevent native img drag

  // Grip indicator - 3 horizontal dots, hidden by default, shown on hover
  const grip = document.createElement('div');
  grip.setAttribute('data-vg-grip', '');
  grip.textContent = '\u22ee'; // vertical ellipsis
  Object.assign(grip.style, {
    fontSize: '10px', color: COLOR.muted, textAlign: 'center', lineHeight: '1',
    opacity: '0', transition: 'opacity 0.15s', pointerEvents: 'none', userSelect: 'none',
  });
  el.appendChild(grip);

  // Hover: show grip + grab cursor
  stripIcon.addEventListener('mouseenter', () => {
    stripIcon.style.cursor = 'grab';
    grip.style.opacity = '1';
  });
  stripIcon.addEventListener('mouseleave', () => {
    stripIcon.style.cursor = 'pointer';
    grip.style.opacity = '0';
  });

  // ── Drag logic (BUG-024) ──
  // Distinguishes click (< 4px movement) from drag (>= 4px).
  // Drag: repositions strip vertically. Click: expands sidebar.
  let dragStartY = 0;
  let dragStartTop = 0;
  let totalDragDist = 0;
  let dragging = false;

  /** Clamp top to viewport bounds. */
  function clampTop(top) {
    const maxTop = Math.max(0, window.innerHeight - (el.offsetHeight || 200));
    return Math.max(0, Math.min(top, maxTop));
  }

  function onDragMove(e) {
    const dy = e.clientY - dragStartY;
    totalDragDist += Math.abs(dy - (totalDragDist ? 0 : 0));
    totalDragDist = Math.abs(e.clientY - dragStartY);
    if (totalDragDist > 4) {
      dragging = true;
      el.style.top = `${clampTop(dragStartTop + (e.clientY - dragStartY))}px`;
    }
  }

  function onDragEnd() {
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    if (dragging) {
      // Persist position
      const top = parseInt(el.style.top, 10) || 60;
      chrome.storage.local.set({ vg_strip_top: top });
    } else {
      // Click - expand sidebar
      onExpand();
    }
    dragging = false;
  }

  stripIcon.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragStartY = e.clientY;
    dragStartTop = parseInt(el.style.top, 10) || 60;
    totalDragDist = 0;
    dragging = false;
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
  });

  // Remove the old click handler - drag/click is handled by mousedown/mouseup
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

  // BUG-024: Restore saved vertical position from storage
  try {
    chrome.storage.local.get('vg_strip_top', (data) => {
      if (data?.vg_strip_top != null) {
        el.style.top = `${clampTop(data.vg_strip_top)}px`;
      }
    });
  } catch { /* storage unavailable */ }

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
