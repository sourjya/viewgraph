/**
 * Sidebar Header
 *
 * Creates the top header row of the annotation sidebar containing:
 * - ViewGraph logo + label
 * - Notification bell (pulses when agent requests pending)
 * - Help button (opens help card overlay)
 * - Collapse chevron + close button
 *
 * Status indicators (connection dot, trust shield) live in the footer
 * per ADR-012 - header is for navigation/actions only.
 *
 * @see sidebar/help.js - help card toggled by the ? button
 * @see sidebar/footer.js - status dot + trust shield
 */

import { ATTR } from '#lib/selector.js';
import { chevronRightIcon, closeIcon, bellIcon } from '#lib/sidebar/icons.js';
import { COLOR, FONT } from '#lib/sidebar/styles.js';

/**
 * Create the sidebar header row.
 *
 * @param {Object} opts
 * @param {Function} opts.onToggleCollapse - Called when collapse chevron or logo clicked
 * @param {Function} opts.onClose - Called when close button clicked
 * @param {Function} opts.onHelpToggle - Called when help button clicked
 * @param {Function} opts.onBellClick - Called when notification bell clicked
 * @returns {{ element: HTMLElement, bellBtn: HTMLElement, statusBanner: HTMLElement, updateBell: Function }}
 */
export function createHeader({ onToggleCollapse, onClose, onHelpToggle, onBellClick }) {
  const header = document.createElement('div');
  header.setAttribute(ATTR, 'header');
  Object.assign(header.style, {
    display: 'flex', alignItems: 'center', borderBottom: `1px solid ${COLOR.border}`,
    padding: '2px 0',
  });

  // Logo + label
  const toggle = document.createElement('button');
  toggle.setAttribute(ATTR, 'toggle');
  const vgIcon = document.createElement('img');
  vgIcon.src = chrome.runtime.getURL('icon-16.png');
  vgIcon.width = 16;
  vgIcon.height = 16;
  Object.assign(vgIcon.style, { verticalAlign: 'middle', marginRight: '6px' });
  toggle.appendChild(vgIcon);
  toggle.appendChild(document.createTextNode('ViewGraph'));
  Object.assign(toggle.style, {
    flex: '1', padding: '10px', border: 'none',
    background: 'transparent', color: COLOR.primaryLight, fontSize: '13px', fontWeight: '600',
    cursor: 'default', textAlign: 'left', display: 'flex', alignItems: 'center',
  });

  // Notification bell
  const bellBtn = document.createElement('button');
  bellBtn.setAttribute(ATTR, 'bell');
  bellBtn.appendChild(bellIcon(18));
  bellBtn.setAttribute('data-tooltip', 'Agent requests');
  Object.assign(bellBtn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer',
    padding: '8px', display: 'none', alignItems: 'center', borderRadius: '6px',
    color: COLOR.warning, position: 'relative',
  });
  bellBtn.addEventListener('mouseenter', () => { bellBtn.style.background = COLOR.bgHoverLight; });
  bellBtn.addEventListener('mouseleave', () => { bellBtn.style.background = 'transparent'; });
  bellBtn.addEventListener('click', onBellClick);

  // Help button
  const helpBtn = document.createElement('button');
  helpBtn.setAttribute(ATTR, 'help-btn');
  helpBtn.textContent = '?';
  helpBtn.setAttribute('data-tooltip', 'Help & keyboard shortcuts');
  Object.assign(helpBtn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer',
    padding: '8px', display: 'flex', alignItems: 'center', borderRadius: '6px',
    color: COLOR.muted, fontSize: '14px', fontWeight: '700', fontFamily: FONT,
  });
  helpBtn.addEventListener('mouseenter', () => { helpBtn.style.background = COLOR.bgHoverLight; });
  helpBtn.addEventListener('mouseleave', () => { helpBtn.style.background = 'transparent'; });
  helpBtn.addEventListener('click', onHelpToggle);

  // Collapse chevron
  const collapseBtn = document.createElement('button');
  collapseBtn.setAttribute(ATTR, 'btn');
  collapseBtn.appendChild(chevronRightIcon(18, COLOR.muted));
  collapseBtn.setAttribute('data-tooltip', 'Collapse panel');
  Object.assign(collapseBtn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer',
    padding: '8px', display: 'flex', alignItems: 'center', borderRadius: '6px',
  });
  collapseBtn.addEventListener('mouseenter', () => { collapseBtn.style.background = COLOR.bgHoverLight; });
  collapseBtn.addEventListener('mouseleave', () => { collapseBtn.style.background = 'transparent'; });
  collapseBtn.addEventListener('click', onToggleCollapse);

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.setAttribute(ATTR, 'close');
  closeBtn.appendChild(closeIcon(18, COLOR.muted));
  Object.assign(closeBtn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer',
    padding: '8px', display: 'flex', alignItems: 'center', borderRadius: '6px',
  });
  closeBtn.setAttribute('data-tooltip', 'Close review mode');
  closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = 'rgba(255,255,255,0.05)'; });
  closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = 'transparent'; });
  closeBtn.addEventListener('click', onClose);

  header.append(toggle, bellBtn, helpBtn, collapseBtn, closeBtn);

  // Status banner - shown when disconnected or version mismatch
  const statusBanner = document.createElement('div');
  statusBanner.setAttribute(ATTR, 'status-banner');
  Object.assign(statusBanner.style, {
    display: 'none', padding: '6px 12px', fontSize: '11px',
    fontFamily: FONT, color: COLOR.warning,
    background: '#2a2a1a', borderBottom: `1px solid ${COLOR.border}`,
    flexShrink: '0', position: 'relative', zIndex: '11',
  });

  /**
   * Update bell visibility and animation based on pending request count.
   * @param {number} count - Number of pending agent requests
   */
  function updateBell(count) {
    if (count > 0) {
      bellBtn.style.display = 'flex';
      bellBtn.style.animation = 'none';
      void bellBtn.offsetWidth;
      bellBtn.style.animation = 'vg-bell-pulse 1s ease-in-out 3';
    } else {
      bellBtn.style.display = 'none';
    }
  }

  return { element: header, bellBtn, statusBanner, updateBell };
}
