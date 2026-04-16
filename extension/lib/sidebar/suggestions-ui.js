/**
 * Suggestions UI - Checklist Rendering
 *
 * Renders the auto-inspect suggestion checklist at the top of the
 * Review tab. Users select suggestions and send them to the agent
 * as annotations.
 *
 * @see lib/sidebar/suggestions.js - scan engine
 * @see .kiro/specs/auto-suggestions/design.md
 */

import { ATTR } from '../selector.js';
import { FONT } from './styles.js';

/** Severity icons for display. */
const SEV_ICONS = { error: '\ud83d\udd34', warning: '\u26a0\ufe0f', info: '\ud83d\udca1' };

/**
 * Render the suggestion checklist into a container element.
 * @param {HTMLElement} container - Element to render into
 * @param {Array} suggestions - From scanForSuggestions()
 * @param {{ onSend: function(Array), onDismiss: function(string), onRefresh: function }} callbacks
 * @returns {{ element: HTMLElement, getSelected: function }}
 */
export function renderSuggestionList(container, suggestions, callbacks) {
  const wrapper = document.createElement('div');
  wrapper.setAttribute(ATTR, 'suggestions-panel');

  if (suggestions.length === 0) {
    wrapper.style.display = 'none';
    container.prepend(wrapper);
    return { element: wrapper, getSelected: () => [] };
  }

  Object.assign(wrapper.style, {
    borderBottom: '2px solid #2a2a3a', paddingBottom: '8px', marginBottom: '4px',
  });

  // Header row: count + refresh + select all
  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '6px 12px', fontFamily: FONT,
  });

  const countBadge = document.createElement('span');
  countBadge.textContent = `${suggestions.length} Suggestion${suggestions.length > 1 ? 's' : ''}`;
  Object.assign(countBadge.style, {
    fontSize: '11px', fontWeight: '700', color: '#f59e0b',
    flex: '1',
  });

  const refreshBtn = document.createElement('button');
  refreshBtn.textContent = '\u21bb';
  refreshBtn.title = 'Refresh suggestions';
  Object.assign(refreshBtn.style, {
    border: 'none', background: 'transparent', color: '#666',
    cursor: 'pointer', fontSize: '14px', padding: '2px',
  });
  refreshBtn.addEventListener('click', () => { if (callbacks.onRefresh) callbacks.onRefresh(); });

  const selectAllBtn = document.createElement('button');
  selectAllBtn.textContent = 'Select All';
  Object.assign(selectAllBtn.style, {
    border: '1px solid #333', borderRadius: '4px', background: 'transparent',
    color: '#9ca3af', fontSize: '10px', padding: '2px 6px', cursor: 'pointer',
    fontFamily: FONT,
  });

  header.append(countBadge, refreshBtn, selectAllBtn);
  wrapper.appendChild(header);

  // Suggestion items
  const selected = new Set();
  const items = [];

  for (const sug of suggestions) {
    const row = document.createElement('div');
    row.setAttribute(ATTR, 'suggestion-item');
    Object.assign(row.style, {
      display: 'flex', alignItems: 'flex-start', gap: '6px',
      padding: '4px 12px', cursor: 'pointer', fontFamily: FONT,
      transition: 'background 0.1s',
    });
    row.addEventListener('mouseenter', () => { row.style.background = '#1a1a2e'; });
    row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; });

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.style.marginTop = '2px';
    checkbox.style.cursor = 'pointer';
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selected.add(sug.id);
      else selected.delete(sug.id);
      updateSendBtn();
    });

    const content = document.createElement('div');
    Object.assign(content.style, { flex: '1', minWidth: '0' });

    const titleRow = document.createElement('div');
    Object.assign(titleRow.style, { fontSize: '11px', color: '#e0e0e0', lineHeight: '1.3' });
    titleRow.textContent = `${SEV_ICONS[sug.severity] || ''} ${sug.title}`;

    const detailRow = document.createElement('div');
    Object.assign(detailRow.style, { fontSize: '10px', color: '#666', marginTop: '1px' });
    detailRow.textContent = sug.detail;

    content.append(titleRow, detailRow);

    const dismissBtn = document.createElement('button');
    dismissBtn.textContent = '\u00d7';
    dismissBtn.title = 'Dismiss';
    Object.assign(dismissBtn.style, {
      border: 'none', background: 'transparent', color: '#555',
      cursor: 'pointer', fontSize: '14px', padding: '0 2px', flexShrink: '0',
    });
    dismissBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      row.style.opacity = '0';
      row.style.transition = 'opacity 0.2s';
      setTimeout(() => {
        row.remove();
        selected.delete(sug.id);
        updateSendBtn();
        if (callbacks.onDismiss) callbacks.onDismiss(sug.id);
      }, 200);
    });

    row.addEventListener('click', (e) => {
      if (e.target !== checkbox && e.target !== dismissBtn) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      }
    });

    row.append(checkbox, content, dismissBtn);
    wrapper.appendChild(row);
    items.push({ sug, checkbox, row });
  }

  // Select All toggle
  let allSelected = false;
  selectAllBtn.addEventListener('click', () => {
    allSelected = !allSelected;
    for (const item of items) {
      if (item.row.parentNode) {
        item.checkbox.checked = allSelected;
        if (allSelected) selected.add(item.sug.id);
        else selected.delete(item.sug.id);
      }
    }
    selectAllBtn.textContent = allSelected ? 'Deselect All' : 'Select All';
    updateSendBtn();
  });

  // Send button
  const sendBtn = document.createElement('button');
  sendBtn.setAttribute(ATTR, 'send-suggestions');
  Object.assign(sendBtn.style, {
    display: 'block', width: 'calc(100% - 24px)', margin: '6px 12px',
    padding: '6px', border: 'none', borderRadius: '6px',
    background: '#333', color: '#666', fontSize: '11px', fontWeight: '600',
    cursor: 'default', fontFamily: FONT, textAlign: 'center',
  });
  sendBtn.textContent = 'Send 0 to Agent';

  /** Update send button state based on selection count. */
  function updateSendBtn() {
    const count = selected.size;
    sendBtn.textContent = `Send ${count} to Agent`;
    sendBtn.style.background = count > 0 ? '#6366f1' : '#333';
    sendBtn.style.color = count > 0 ? '#fff' : '#666';
    sendBtn.style.cursor = count > 0 ? 'pointer' : 'default';
  }

  sendBtn.addEventListener('click', () => {
    if (selected.size === 0) return;
    const selectedSugs = suggestions.filter((s) => selected.has(s.id));
    if (callbacks.onSend) callbacks.onSend(selectedSugs);
  });

  wrapper.appendChild(sendBtn);
  container.prepend(wrapper);

  return { element: wrapper, getSelected: () => suggestions.filter((s) => selected.has(s.id)) };
}
