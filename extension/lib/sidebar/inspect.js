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
import { copyIcon, checkIcon } from './icons.js';
import { renderDiagnostics } from './diagnostics.js';
import { renderToggles } from './toggles.js';
import { renderCaptures } from './captures.js';
import { COLOR, FONT, LABEL_STYLE } from './styles.js';

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
    fontSize: '12px', fontFamily: FONT, color: COLOR.text,
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
  Object.assign(arrow.style, { fontSize: '8px', color: COLOR.muted, transition: 'transform 0.15s' });
  const label = document.createElement('span');
  label.textContent = title;
  Object.assign(label.style, { ...LABEL_STYLE, flex: '1' });
  headerRow.append(arrow, label);
  if (badgeText) {
    const badge = document.createElement('span');
    badge.textContent = badgeText;
    Object.assign(badge.style, {
      fontSize: '10px', fontWeight: '600', padding: '1px 6px', borderRadius: '8px',
      background: badgeColor || COLOR.border, color: COLOR.white,
    });
    headerRow.appendChild(badge);
  }

  // Copy button
  const copyBtn = document.createElement('button');
  copyBtn.setAttribute(ATTR, 'section-copy');
  copyBtn.dataset.section = title;
  copyBtn.appendChild(copyIcon(12));
  copyBtn.setAttribute('data-tooltip', `Copy ${title} data`);
  Object.assign(copyBtn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer', color: COLOR.dim,
    padding: '2px', borderRadius: '3px', display: 'flex', flexShrink: '0',
  });
  copyBtn.addEventListener('mouseenter', () => { copyBtn.style.color = COLOR.primaryLight; });
  copyBtn.addEventListener('mouseleave', () => { if (copyBtn.dataset.copied !== 'true') copyBtn.style.color = COLOR.dim; });
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const text = `${title}:\n${body.textContent.trim()}`;
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.dataset.copied = 'true';
      copyBtn.replaceChildren(checkIcon(12, COLOR.success));
      copyBtn.style.color = COLOR.success;
      setTimeout(() => {
        copyBtn.dataset.copied = 'false';
        copyBtn.replaceChildren(copyIcon(12));
        copyBtn.style.color = COLOR.dim;
      }, 1500);
    }).catch(() => {});
  });
  headerRow.appendChild(copyBtn);

  // Note button - + style matching suggestions panel (ADR-012 consistency)
  const noteBtn = document.createElement('button');
  noteBtn.setAttribute(ATTR, 'section-note');
  noteBtn.dataset.section = title;
  noteBtn.textContent = '+';
  noteBtn.setAttribute('data-tooltip', 'Add as note for agent');
  const alreadyNoted = getAnnotations().some((a) => a.diagnostic?.section === title);
  Object.assign(noteBtn.style, {
    border: 'none', background: alreadyNoted ? 'transparent' : 'rgba(99,102,241,0.15)',
    cursor: alreadyNoted ? 'default' : 'pointer',
    color: alreadyNoted ? COLOR.success : COLOR.primary,
    padding: '0 5px', borderRadius: '4px', display: 'flex', flexShrink: '0',
    fontSize: '14px', fontWeight: '700', lineHeight: '20px',
    opacity: alreadyNoted ? '0.4' : '1', pointerEvents: alreadyNoted ? 'none' : 'auto',
  });
  if (alreadyNoted) {
    noteBtn.textContent = '✓';
    noteBtn.setAttribute('data-tooltip', 'Note added');
  }
  noteBtn.addEventListener('mouseenter', () => { if (!alreadyNoted) noteBtn.style.background = 'rgba(99,102,241,0.3)'; });
  noteBtn.addEventListener('mouseleave', () => { if (!alreadyNoted) noteBtn.style.background = 'rgba(99,102,241,0.15)'; });
  noteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const fullData = body.textContent.trim();
    const ann = addPageNote();
    if (ann) {
      updateComment(ann.id, '');
      ann.diagnostic = { section: title, data: fullData };
      if (onRefresh) onRefresh();
      noteBtn.dataset.noted = 'true';
      noteBtn.textContent = '✓';
      noteBtn.style.color = COLOR.success;
      noteBtn.style.background = 'transparent';
      noteBtn.style.opacity = '0.4';
      noteBtn.style.pointerEvents = 'none';
      noteBtn.setAttribute('data-tooltip', 'Note added');
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
