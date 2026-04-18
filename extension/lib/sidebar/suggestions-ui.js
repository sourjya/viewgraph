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
import { COLOR, FONT } from './styles.js';

/** Tier display config: label, background color, text color. */
const TIERS = {
  accessibility: { label: 'A11Y', bg: '#92400e', color: '#fbbf24' },
  quality: { label: 'QUAL', bg: '#7f1d1d', color: '#fca5a5' },
  testability: { label: 'TEST', bg: '#1e3a5f', color: '#93c5fd' },
};

/** Severity icons. */
const SEV_ICONS = { error: '\ud83d\udd34', warning: '\u26a0\ufe0f', info: '\ud83d\udca1' };

/** Map suggestion severity to annotation severity. */
const SEV_MAP = { error: 'critical', warning: 'major', info: 'minor' };

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
  wrapper.replaceChildren();
  wrapper.style.display = 'none';
}

/** One-line badge with count and Review button. */
function renderCollapsed(wrapper, suggestions, callbacks) {
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
    row.addEventListener('mouseenter', () => { row.style.background = COLOR.bgDark; });
    row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; });

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

    // Title
    const title = document.createElement('span');
    title.textContent = sug.title;
    Object.assign(title.style, {
      fontSize: '11px', color: COLOR.text, flex: '1',
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    });

    // Add button - text style to distinguish from annotation action icons
    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add';
    addBtn.setAttribute('data-tooltip', 'Add to review list');
    Object.assign(addBtn.style, {
      border: 'none', background: 'transparent',
      color: COLOR.primary, fontSize: '10px', fontWeight: '600', cursor: 'pointer',
      padding: '2px 6px', flexShrink: '0', fontFamily: FONT,
      transition: 'color 0.15s',
    });
    addBtn.addEventListener('mouseenter', () => { addBtn.style.color = COLOR.primaryHover; });
    addBtn.addEventListener('mouseleave', () => { addBtn.style.color = COLOR.primary; });
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
