/**
 * Sidebar Header
 *
 * Creates the top header row of the annotation sidebar containing:
 * - ViewGraph logo + label (clickable to toggle collapse)
 * - Connection status dot (green=connected, red=offline)
 * - Trust shield icon (F17: green=trusted, blue=configured, amber=untrusted)
 * - Notification bell (pulses when agent requests pending)
 * - Help button (opens help card overlay)
 * - Collapse chevron + close button
 *
 * @see sidebar/help.js - help card toggled by the ? button
 * @see lib/constants.js - classifyTrust() for trust level determination
 */

import { ATTR } from '#lib/selector.js';
import { chevronRightIcon, closeIcon, bellIcon, shieldIcon } from '#lib/sidebar/icons.js';
import { classifyTrust } from '#lib/constants.js';
import * as transport from '#lib/transport.js';

/**
 * Create the sidebar header row.
 *
 * @param {Object} opts
 * @param {Function} opts.onToggleCollapse - Called when collapse chevron or logo clicked
 * @param {Function} opts.onClose - Called when close button clicked
 * @param {Function} opts.onHelpToggle - Called when help button clicked
 * @param {Function} opts.onBellClick - Called when notification bell clicked
 * @returns {{ element: HTMLElement, statusDot: HTMLElement, trustShield: HTMLElement, bellBtn: HTMLElement, statusBanner: HTMLElement, setTrustLevel: Function }}
 */
export function createHeader({ onToggleCollapse, onClose, onHelpToggle, onBellClick }) {
  const header = document.createElement('div');
  header.setAttribute(ATTR, 'header');
  Object.assign(header.style, {
    display: 'flex', alignItems: 'center', borderBottom: '1px solid #333',
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
    background: 'transparent', color: '#a5b4fc', fontSize: '13px', fontWeight: '600',
    cursor: 'default', textAlign: 'left', display: 'flex', alignItems: 'center',
  });

  // Connection status dot
  const statusDot = document.createElement('span');
  statusDot.setAttribute(ATTR, 'status-dot');
  Object.assign(statusDot.style, {
    width: '8px', height: '8px', borderRadius: '50%',
    background: '#666', flexShrink: '0', transition: 'background 0.3s',
    marginLeft: '6px', border: '1px solid rgba(255,255,255,0.1)',
  });

  // Trust shield (F17)
  const trustShield = document.createElement('span');
  trustShield.setAttribute(ATTR, 'trust-shield');
  Object.assign(trustShield.style, {
    display: 'none', marginLeft: '4px', flexShrink: '0',
    padding: '2px', borderRadius: '3px', background: 'rgba(255,255,255,0.04)',
  });

  toggle.append(statusDot, trustShield);

  // Notification bell
  const bellBtn = document.createElement('button');
  bellBtn.setAttribute(ATTR, 'bell');
  bellBtn.appendChild(bellIcon(18));
  bellBtn.title = 'Agent requests';
  Object.assign(bellBtn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer',
    padding: '8px', display: 'none', alignItems: 'center', borderRadius: '6px',
    color: '#f59e0b', position: 'relative',
  });
  bellBtn.addEventListener('mouseenter', () => { bellBtn.style.background = 'rgba(255,255,255,0.06)'; });
  bellBtn.addEventListener('mouseleave', () => { bellBtn.style.background = 'transparent'; });
  bellBtn.addEventListener('click', onBellClick);

  // Help button
  const helpBtn = document.createElement('button');
  helpBtn.setAttribute(ATTR, 'help-btn');
  helpBtn.textContent = '?';
  helpBtn.title = 'Help & keyboard shortcuts';
  Object.assign(helpBtn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer',
    padding: '8px', display: 'flex', alignItems: 'center', borderRadius: '6px',
    color: '#666', fontSize: '14px', fontWeight: '700', fontFamily: 'system-ui, sans-serif',
  });
  helpBtn.addEventListener('mouseenter', () => { helpBtn.style.background = 'rgba(255,255,255,0.06)'; });
  helpBtn.addEventListener('mouseleave', () => { helpBtn.style.background = 'transparent'; });
  helpBtn.addEventListener('click', onHelpToggle);

  // Collapse chevron
  const collapseBtn = document.createElement('button');
  collapseBtn.setAttribute(ATTR, 'btn');
  collapseBtn.appendChild(chevronRightIcon(18, '#666'));
  collapseBtn.title = 'Collapse panel';
  Object.assign(collapseBtn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer',
    padding: '8px', display: 'flex', alignItems: 'center', borderRadius: '6px',
  });
  collapseBtn.addEventListener('mouseenter', () => { collapseBtn.style.background = 'rgba(255,255,255,0.06)'; });
  collapseBtn.addEventListener('mouseleave', () => { collapseBtn.style.background = 'transparent'; });
  collapseBtn.addEventListener('click', onToggleCollapse);

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.setAttribute(ATTR, 'close');
  closeBtn.appendChild(closeIcon(18, '#666'));
  Object.assign(closeBtn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer',
    padding: '8px', display: 'flex', alignItems: 'center', borderRadius: '6px',
  });
  closeBtn.title = 'Close review mode';
  closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = 'rgba(255,255,255,0.05)'; });
  closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = 'transparent'; });
  closeBtn.addEventListener('click', onClose);

  header.append(toggle, bellBtn, helpBtn, collapseBtn, closeBtn);

  // Status banner - shown when disconnected or version mismatch
  const statusBanner = document.createElement('div');
  statusBanner.setAttribute(ATTR, 'status-banner');
  Object.assign(statusBanner.style, {
    display: 'none', padding: '6px 12px', fontSize: '11px',
    fontFamily: 'system-ui, sans-serif', color: '#f59e0b',
    background: '#2a2a1a', borderBottom: '1px solid #333',
    flexShrink: '0',
  });

  const TRUST_COLORS = { trusted: '#4ade80', configured: '#60a5fa', untrusted: '#f59e0b' };

  /**
   * Update the trust shield icon based on trust classification.
   * @param {{ level: string, reason: string }} trust - Trust classification result
   */
  function setTrustLevel(trust) {
    trustShield.replaceChildren(shieldIcon(16, TRUST_COLORS[trust.level], trust.level === 'untrusted' ? 'x' : 'check'));
    trustShield.title = `${trust.level}: ${trust.reason}`;
    trustShield.style.display = 'inline-flex';
  }

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

  return { element: header, statusDot, trustShield, bellBtn, statusBanner, setTrustLevel, updateBell };
}
