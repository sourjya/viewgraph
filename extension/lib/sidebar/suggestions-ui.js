/**
 * Suggestions UI - Collapsed Badge + Expandable Checklist
 *
 * Renders a one-line suggestion indicator that expands into a checklist.
 * Users add suggestions to the annotation timeline (not send directly).
 * Redesigned per design-v2.md: collapsed by default, add-to-review flow.
 *
 * @see .kiro/specs/auto-suggestions/design-v2.md
 */

import { ATTR } from '#lib/selector.js';
import { COLOR, FONT, addHover } from './styles.js';

/** Tier display config: label, background color, text color. */
const TIERS = {
  accessibility: { label: 'A11Y', bg: 'var(--vg-color-caution-bg)', color: 'var(--vg-color-warning)' },
  quality: { label: 'QUAL', bg: 'var(--vg-color-error-bg)', color: 'var(--vg-color-error-muted)' },
  testability: { label: 'TEST', bg: 'var(--vg-color-info-bg)', color: 'var(--vg-color-info-light)' },
};

/** Severity icons. */
const SEV_ICONS = { error: '\ud83d\udd34', warning: '\u26a0\ufe0f', info: '\ud83d\udca1' };

/** Map suggestion severity to annotation severity. */
const SEV_MAP = { error: 'critical', warning: 'major', info: 'minor' };

/** Track expanded state for Esc-to-collapse. */
let _expandedState = null;

/**
 * Collapse the suggestion bar if expanded. Returns true if it was collapsed.
 * Called by the Esc key handler in annotation-sidebar.js.
 */
export function collapseSuggestions() {
  if (!_expandedState) return false;
  const { wrapper, suggestions, callbacks } = _expandedState;
  _expandedState = null;
  renderCollapsed(wrapper, suggestions, callbacks);
  return true;
}

/** Reset module state on sidebar destroy. */
export function resetSuggestions() { _expandedState = null; }

/**
 * Show a reload hint in the suggestions panel when agent resolves issues.
 * @param {HTMLElement} container - The list container
 * @param {number} resolvedCount - Number of newly resolved annotations
 */
export function showReloadHint(container, resolvedCount) {
  const panel = container.querySelector(`[${ATTR}="suggestions-panel"]`);
  if (!panel) return;
  // Don't duplicate
  if (panel.querySelector(`[${ATTR}="reload-hint"]`)) return;
  const hint = document.createElement('div');
  hint.setAttribute(ATTR, 'reload-hint');
  Object.assign(hint.style, {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px',
    background: 'rgba(74, 222, 128, 0.1)', borderBottom: `1px solid ${COLOR.borderLight}`,
    fontSize: '11px', fontFamily: FONT,
  });
  const icon = document.createElement('span');
  icon.textContent = '✅';
  Object.assign(icon.style, { fontSize: '13px', flexShrink: '0' });
  const text = document.createElement('span');
  text.textContent = `${resolvedCount} issue${resolvedCount > 1 ? 's' : ''} resolved. Reload to verify.`;
  Object.assign(text.style, { color: COLOR.success, flex: '1' });
  const btn = document.createElement('button');
  btn.textContent = 'Reload';
  Object.assign(btn.style, {
    border: `1px solid ${COLOR.success}`, borderRadius: '4px', background: 'transparent',
    color: COLOR.success, fontSize: '10px', padding: '2px 8px', cursor: 'pointer', fontFamily: FONT,
  });
  btn.addEventListener('click', () => location.reload());
  hint.append(icon, text, btn);
  panel.style.display = 'block';
  panel.prepend(hint);
}

/**
 * Render the suggestion bar: collapsed badge or expanded checklist.
 * @param {HTMLElement} container - Element to prepend into
 * @param {Array} suggestions - From scanForSuggestions()
 * @param {{ onAdd: function, onAddAll: function, onDismissAll: function, onRefresh: function }} callbacks
 * @returns {{ element: HTMLElement }}
 */
export function renderSuggestionBar(container, suggestions, callbacks) {
  const wrapper = document.createElement('div');
  wrapper.setAttribute(ATTR, 'suggestions-panel');
  Object.assign(wrapper.style, { borderBottom: `1px solid ${COLOR.borderLight}`, fontFamily: FONT });

  if (suggestions.length === 0) {
    renderClean(wrapper);
  } else {
    renderCollapsed(wrapper, suggestions, callbacks);
  }

  container.prepend(wrapper);
  return { element: wrapper };
}

/** No issues - hide the panel entirely. */
function renderClean(wrapper) {
  _expandedState = null;
  wrapper.replaceChildren();
  wrapper.style.display = 'none';
}

/** One-line badge with count and Review button. */
function renderCollapsed(wrapper, suggestions, callbacks) {
  _expandedState = null;
  wrapper.replaceChildren();
  Object.assign(wrapper.style, { padding: '6px 12px' });

  const row = document.createElement('div');
  Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '6px' });

  const icon = document.createElement('span');
  icon.textContent = '\ud83d\udca1';
  Object.assign(icon.style, { fontSize: '13px' });

  const label = document.createElement('span');
  label.textContent = `${suggestions.length} suggestion${suggestions.length > 1 ? 's' : ''}`;
  Object.assign(label.style, { fontSize: '11px', fontWeight: '700', color: COLOR.warning, flex: '1' });

  const reviewBtn = document.createElement('button');
  reviewBtn.textContent = 'Review';
  Object.assign(reviewBtn.style, {
    border: `1px solid ${COLOR.warning}`, borderRadius: '4px', background: 'transparent',
    color: COLOR.warning, fontSize: '10px', padding: '2px 8px', cursor: 'pointer', fontFamily: FONT,
  });
  reviewBtn.addEventListener('click', () => renderExpanded(wrapper, suggestions, callbacks));

  row.append(icon, label, reviewBtn);
  wrapper.appendChild(row);
}

/** Expanded checklist with tier tags and add buttons. */
function renderExpanded(wrapper, suggestions, callbacks) {
  _expandedState = { wrapper, suggestions, callbacks };
  wrapper.replaceChildren();
  Object.assign(wrapper.style, { padding: '6px 12px' });

  // Header
  const header = document.createElement('div');
  Object.assign(header.style, { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' });
  const icon = document.createElement('span');
  icon.textContent = '\ud83d\udca1';
  Object.assign(icon.style, { fontSize: '13px' });
  const label = document.createElement('span');
  label.textContent = `${suggestions.length} suggestion${suggestions.length > 1 ? 's' : ''}`;
  Object.assign(label.style, { fontSize: '11px', fontWeight: '700', color: COLOR.warning, flex: '1' });
  const collapseBtn = document.createElement('button');
  collapseBtn.textContent = 'Collapse';
  Object.assign(collapseBtn.style, {
    border: `1px solid ${COLOR.border}`, borderRadius: '4px', background: 'transparent',
    color: COLOR.muted, fontSize: '10px', padding: '2px 8px', cursor: 'pointer', fontFamily: FONT,
  });
  collapseBtn.addEventListener('click', () => renderCollapsed(wrapper, suggestions, callbacks));
  header.append(icon, label, collapseBtn);
  wrapper.appendChild(header);

  // Suggestion rows
  const remaining = [...suggestions];

  for (const sug of suggestions) {
    const row = document.createElement('div');
    row.setAttribute(ATTR, 'suggestion-row');
    Object.assign(row.style, {
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '4px 0', cursor: 'pointer', transition: 'background 0.1s', borderRadius: '4px',
    });
    addHover(row, COLOR.bgDark);

    // Severity icon
    const sevEl = document.createElement('span');
    sevEl.textContent = SEV_ICONS[sug.severity] || '\ud83d\udca1';
    Object.assign(sevEl.style, { fontSize: '11px', flexShrink: '0' });

    // Tier pill
    const tier = TIERS[sug.tier] || TIERS.quality;
    const pill = document.createElement('span');
    pill.textContent = tier.label;
    Object.assign(pill.style, {
      fontSize: '9px', fontWeight: '700', textTransform: 'uppercase',
      padding: '1px 5px', borderRadius: '3px', flexShrink: '0',
      background: tier.bg, color: tier.color,
    });

    // Title (clickable to expand/collapse detail)
    const title = document.createElement('span');
    title.textContent = sug.title;
    Object.assign(title.style, {
      fontSize: '11px', color: COLOR.text, flex: '1',
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    });

    // Detail panel (hidden by default, shown on click)
    const detail = document.createElement('div');
    detail.textContent = sug.detail || sug.title;
    Object.assign(detail.style, {
      display: 'none', fontSize: '10px', color: COLOR.muted,
      padding: '4px 0 4px 24px', lineHeight: '1.4',
      whiteSpace: 'normal', wordBreak: 'break-word',
    });

    // Click row to toggle detail (accordion - one at a time)
    row.addEventListener('click', (e) => {
      if (e.target.closest('button')) return; // don't toggle when clicking +
      const isOpen = detail.style.display !== 'none';
      // Close all other details first
      wrapper.querySelectorAll(`[${ATTR}="suggestion-detail"]`).forEach((d) => {
        d.style.display = 'none';
      });
      if (!isOpen) {
        detail.style.display = 'block';
        title.style.whiteSpace = 'normal';
        title.style.overflow = 'visible';
      } else {
        title.style.whiteSpace = 'nowrap';
        title.style.overflow = 'hidden';
      }
    });
    detail.setAttribute(ATTR, 'suggestion-detail');

    // Add button - plus icon with shaded background
    const addBtn = document.createElement('button');
    addBtn.textContent = '+';
    addBtn.setAttribute('data-tooltip', 'Add to review list');
    Object.assign(addBtn.style, {
      border: 'none', background: 'rgba(99,102,241,0.15)',
      color: COLOR.primary, fontSize: '14px', fontWeight: '700', cursor: 'pointer',
      padding: '0 6px', flexShrink: '0', fontFamily: FONT, borderRadius: '4px',
      lineHeight: '22px', transition: 'background 0.15s',
    });
    addHover(addBtn, 'rgba(99,102,241,0.3)', 'rgba(99,102,241,0.15)');
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      row.style.opacity = '0';
      row.style.transition = 'opacity 0.2s';
      setTimeout(() => {
        row.remove();
        const idx = remaining.indexOf(sug);
        if (idx >= 0) remaining.splice(idx, 1);
        if (callbacks.onAdd) callbacks.onAdd({ ...sug, severity: SEV_MAP[sug.severity] || 'minor' });
        if (remaining.length === 0) renderClean(wrapper);
        else label.textContent = `${remaining.length} suggestion${remaining.length > 1 ? 's' : ''}`;
      }, 200);
    });

    row.append(sevEl, pill, title, addBtn);
    wrapper.appendChild(row);
    wrapper.appendChild(detail);
  }

  // Bottom actions
  const actions = document.createElement('div');
  Object.assign(actions.style, { display: 'flex', gap: '6px', marginTop: '6px' });

  const addAllBtn = document.createElement('button');
  addAllBtn.textContent = 'Add All to Review';
  Object.assign(addAllBtn.style, {
    flex: '1', padding: '5px', border: 'none', borderRadius: '4px',
    background: COLOR.primary, color: COLOR.white, fontSize: '10px', fontWeight: '600',
    cursor: 'pointer', fontFamily: FONT,
  });
  addAllBtn.addEventListener('click', () => {
    if (callbacks.onAddAll) callbacks.onAddAll(remaining.map((s) => ({ ...s, severity: SEV_MAP[s.severity] || 'minor' })));
    renderClean(wrapper);
  });

  const dismissBtn = document.createElement('button');
  dismissBtn.textContent = 'Dismiss All';
  Object.assign(dismissBtn.style, {
    padding: '5px 10px', border: `1px solid ${COLOR.border}`, borderRadius: '4px',
    background: 'transparent', color: COLOR.muted, fontSize: '10px',
    cursor: 'pointer', fontFamily: FONT,
  });
  dismissBtn.addEventListener('click', () => {
    if (callbacks.onDismissAll) callbacks.onDismissAll();
    renderClean(wrapper);
  });

  actions.append(addAllBtn, dismissBtn);
  wrapper.appendChild(actions);
}
