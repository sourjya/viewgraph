/**
 * Sidebar Inspect Tab - Orchestrator
 *
 * Composes the Inspect tab from three modules:
 * - diagnostics.js: network, console, landmarks, visibility, stacking, focus, scroll
 * - toggles.js: auto-capture, auto-audit, session recording
 * - captures.js: capture timeline, baselines, consistency
 *
 * Also exports createSection for use by diagnostics and captures modules.
 *
 * @see docs/roadmap/roadmap.md - 16.11 decomposition
 */

import { ATTR } from '#lib/selector.js';
import { getAnnotations, addPageNote, updateComment } from '#lib/annotate.js';
import { copyIcon, checkIcon, noteIcon } from './icons.js';
import { renderDiagnostics } from './diagnostics.js';
import { renderToggles } from './toggles.js';
import { renderCaptures } from './captures.js';

/**
 * Create the inspect tab content element and its refresh function.
 * @param {{ onRefresh: function }} callbacks
 * @returns {{ element: HTMLElement, refresh: function }}
 */
export function createInspectTab(callbacks = {}) {
  const el = document.createElement('div');
  el.setAttribute(ATTR, 'inspect-content');
  Object.assign(el.style, {
    display: 'none', flexDirection: 'column', flex: '1', minHeight: '0',
    overflowY: 'auto', padding: '8px 12px', gap: '12px',
    fontSize: '12px', fontFamily: 'system-ui, sans-serif', color: '#c8c8d0',
  });

  return {
    element: el,
    refresh: () => refreshInspect(el, callbacks),
  };
}

// Re-export createSection for diagnostics and captures modules
export { createSection };

/**
 * Create a collapsible section with copy and note buttons.
 * Shared by diagnostics.js and captures.js.
 * @param {string} title - Section header text
 * @param {string} badgeText - Badge content (e.g., "3 failed / 12")
 * @param {string} badgeColor - Badge background color
 * @param {function} onRefresh - Called after note button creates an annotation
 * @returns {{ section: HTMLElement, body: HTMLElement }}
 */
function createSection(title, badgeText, badgeColor, onRefresh) {
  const section = document.createElement('div');
  const headerRow = document.createElement('div');
  Object.assign(headerRow.style, {
    display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '6px',
  });
  const arrow = document.createElement('span');
  arrow.textContent = '\u25b6';
  Object.assign(arrow.style, { fontSize: '8px', color: '#666', transition: 'transform 0.15s' });
  const label = document.createElement('span');
  label.textContent = title;
  Object.assign(label.style, { fontWeight: '600', fontSize: '11px', color: '#9ca3af', flex: '1', textTransform: 'uppercase', letterSpacing: '0.5px' });
  headerRow.append(arrow, label);
  if (badgeText) {
    const badge = document.createElement('span');
    badge.textContent = badgeText;
    Object.assign(badge.style, {
      fontSize: '10px', fontWeight: '600', padding: '1px 6px', borderRadius: '8px',
      background: badgeColor || '#333', color: '#fff',
    });
    headerRow.appendChild(badge);
  }

  // Copy button
  const copyBtn = document.createElement('button');
  copyBtn.setAttribute(ATTR, 'section-copy');
  copyBtn.dataset.section = title;
  copyBtn.appendChild(copyIcon(12));
  copyBtn.title = `Copy ${title} data`;
  Object.assign(copyBtn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer', color: '#555',
    padding: '2px', borderRadius: '3px', display: 'flex', flexShrink: '0',
  });
  copyBtn.addEventListener('mouseenter', () => { copyBtn.style.color = '#a5b4fc'; });
  copyBtn.addEventListener('mouseleave', () => { if (copyBtn.dataset.copied !== 'true') copyBtn.style.color = '#555'; });
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const text = `${title}:\n${body.textContent.trim()}`;
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.dataset.copied = 'true';
      copyBtn.replaceChildren(checkIcon(12, '#4ade80'));
      copyBtn.style.color = '#4ade80';
      setTimeout(() => {
        copyBtn.dataset.copied = 'false';
        copyBtn.replaceChildren(copyIcon(12));
        copyBtn.style.color = '#555';
      }, 1500);
    }).catch(() => {});
  });
  headerRow.appendChild(copyBtn);

  // Note button
  const noteBtn = document.createElement('button');
  noteBtn.setAttribute(ATTR, 'section-note');
  noteBtn.dataset.section = title;
  noteBtn.appendChild(noteIcon(14));
  noteBtn.title = 'Add as note for agent';
  const alreadyNoted = getAnnotations().some((a) => a.diagnostic?.section === title);
  Object.assign(noteBtn.style, {
    border: 'none', background: 'transparent', cursor: alreadyNoted ? 'default' : 'pointer',
    color: alreadyNoted ? '#4ade80' : '#6366f1',
    padding: '2px', borderRadius: '3px', display: 'flex', flexShrink: '0',
    opacity: alreadyNoted ? '0.4' : '1', pointerEvents: alreadyNoted ? 'none' : 'auto',
  });
  if (alreadyNoted) {
    noteBtn.replaceChildren(checkIcon(12, '#4ade80'));
    noteBtn.title = 'Note added';
  }
  noteBtn.addEventListener('mouseenter', () => { noteBtn.style.color = '#818cf8'; });
  noteBtn.addEventListener('mouseleave', () => { if (noteBtn.dataset.noted !== 'true') noteBtn.style.color = '#6366f1'; });
  noteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const fullData = body.textContent.trim();
    const ann = addPageNote();
    if (ann) {
      updateComment(ann.id, '');
      ann.diagnostic = { section: title, data: fullData };
      if (onRefresh) onRefresh();
      noteBtn.dataset.noted = 'true';
      noteBtn.replaceChildren(checkIcon(12, '#4ade80'));
      noteBtn.style.color = '#4ade80';
      noteBtn.style.opacity = '0.4';
      noteBtn.style.pointerEvents = 'none';
      noteBtn.title = 'Note added';
    }
  });
  headerRow.appendChild(noteBtn);

  const body = document.createElement('div');
  Object.assign(body.style, { display: 'none', marginTop: '6px', fontSize: '11px' });
  headerRow.addEventListener('click', () => {
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    arrow.style.transform = open ? '' : 'rotate(90deg)';
  });
  section.append(headerRow, body);
  return { section, body };
}

/**
 * Populate the inspect tab with live page data.
 * Orchestrates diagnostics, toggles, and captures modules.
 */
async function refreshInspect(container, callbacks) {
  container.replaceChildren();
  renderDiagnostics(container, callbacks);
  await renderToggles(container, { refreshAll: () => refreshInspect(container, callbacks) });
  renderCaptures(container);
}
