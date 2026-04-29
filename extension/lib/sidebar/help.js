/**
 * Sidebar Help Card
 *
 * Slide-down help card showing keyboard shortcuts and documentation links.
 * Rendered inside the sidebar shadow DOM between header and primary tabs.
 *
 * @see docs/architecture/modularity-audit.md - F14 sidebar decomposition
 */

import { ATTR } from '#lib/selector.js';
import { COLOR, FONT } from './styles.js';
import { svgFromString } from './icons.js';

/**
 * Create the help card element with shortcuts and links.
 * @returns {{ element: HTMLElement, show: function, hide: function, isVisible: function }}
 */
export function createHelpCard() {
  const helpCard = document.createElement('div');
  helpCard.setAttribute(ATTR, 'help-card');
  Object.assign(helpCard.style, {
    display: 'none', background: COLOR.bgDark, borderBottom: `1px solid ${COLOR.border}`,
    padding: '14px 12px', fontSize: '12px', fontFamily: FONT,
    color: COLOR.text, flexShrink: '0', overflow: 'hidden',
    transition: 'max-height 0.2s ease', maxHeight: '0',
  });

  // Title row with collapse button
  const title = document.createElement('div');
  Object.assign(title.style, { display: 'flex', alignItems: 'center', marginBottom: '10px' });
  const titleText = document.createElement('span');
  titleText.textContent = 'Keyboard Shortcuts';
  Object.assign(titleText.style, { fontWeight: '700', fontSize: '13px', color: COLOR.primaryLight, flex: '1' });
  const collapseBtn = document.createElement('button');
  collapseBtn.replaceChildren(svgFromString('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>'));
  Object.assign(collapseBtn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer',
    padding: '2px', display: 'flex', alignItems: 'center', borderRadius: '4px',
    color: COLOR.muted,
  });
  collapseBtn.addEventListener('mouseenter', () => { collapseBtn.style.color = COLOR.secondary; });
  collapseBtn.addEventListener('mouseleave', () => { collapseBtn.style.color = COLOR.muted; });
  let _onCollapse = null;
  collapseBtn.addEventListener('click', () => { if (_onCollapse) _onCollapse(); });
  title.append(titleText, collapseBtn);
  helpCard.appendChild(title);

  // Shortcuts with keycap styling
  const shortcuts = [
    ['Esc', 'Close current panel or exit'],
    ['Ctrl', 'Enter', 'Send to Agent'],
    ['Ctrl', 'Shift', 'C', 'Copy Markdown'],
    ['1', '2', '3', 'Severity: critical / major / minor'],
    ['Del', 'Delete selected annotation'],
    ['Ctrl', 'Shift', 'B', 'Toggle collapse sidebar'],
    ['Ctrl', 'Shift', 'X', 'Close panel entirely'],
  ];

  /** Render a single keycap-styled span. */
  function keycap(text) {
    const k = document.createElement('span');
    k.textContent = text;
    Object.assign(k.style, {
      display: 'inline-block', padding: '2px 6px', borderRadius: '4px',
      border: `1px solid ${COLOR.dim}`, background: COLOR.borderLight, color: '#e2e8f0',
      fontFamily: 'monospace', fontSize: '11px', fontWeight: '600',
      lineHeight: '1.4', minWidth: '20px', textAlign: 'center',
    });
    return k;
  }

  const table = document.createElement('div');
  Object.assign(table.style, { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px', marginBottom: '12px', alignItems: 'center' });
  for (const row of shortcuts) {
    const desc = row[row.length - 1];
    const keys = row.slice(0, -1);
    const keyCell = document.createElement('span');
    Object.assign(keyCell.style, { display: 'flex', gap: '3px', alignItems: 'center' });
    for (let i = 0; i < keys.length; i++) {
      keyCell.appendChild(keycap(keys[i]));
      if (i < keys.length - 1) {
        const plus = document.createElement('span');
        plus.textContent = '+';
        Object.assign(plus.style, { color: COLOR.muted, fontSize: '10px' });
        keyCell.appendChild(plus);
      }
    }
    const d = document.createElement('span');
    d.textContent = desc;
    Object.assign(d.style, { color: COLOR.secondary, fontSize: '12px' });
    table.append(keyCell, d);
  }
  helpCard.appendChild(table);

  // Links with SVG icons
  const links = [
    ['<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
      'Documentation', 'https://chaoslabz.gitbook.io/viewgraph'],
    ['<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 3a3 3 0 00-3 3v12a3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3H6a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3V6a3 3 0 00-3-3"/></svg>',
      'All Shortcuts', 'https://chaoslabz.gitbook.io/viewgraph/reference/keyboard-shortcuts'],
    ['<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      'Report a Bug', 'https://github.com/sourjya/viewgraph/issues'],
  ];
  const linkRow = document.createElement('div');
  Object.assign(linkRow.style, { display: 'flex', gap: '12px', flexWrap: 'wrap' });
  for (const [iconSvg, label, url] of links) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    Object.assign(a.style, { color: COLOR.primary, fontSize: '11px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' });
    const ico = document.createElement('span');
    ico.replaceChildren(svgFromString(iconSvg));
    Object.assign(ico.style, { display: 'inline-flex', flexShrink: '0' });
    const txt = document.createElement('span');
    txt.textContent = label;
    a.append(ico, txt);
    a.addEventListener('mouseenter', () => { txt.style.textDecoration = 'underline'; });
    a.addEventListener('mouseleave', () => { txt.style.textDecoration = 'none'; });
    linkRow.appendChild(a);
  }
  Object.assign(linkRow.style, { display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${COLOR.border}` });
  helpCard.appendChild(linkRow);

  let visible = false;

  const api = {
    element: helpCard,
    toggle() { visible ? this.hide() : this.show(); },
    show() {
      visible = true;
      helpCard.style.display = 'block';
      requestAnimationFrame(() => { helpCard.style.maxHeight = '400px'; });
    },
    hide() {
      visible = false;
      helpCard.style.maxHeight = '0';
      setTimeout(() => { if (!visible) helpCard.style.display = 'none'; }, 200);
    },
    isVisible() { return visible; },
  };
  _onCollapse = () => api.hide();
  return api;
}
