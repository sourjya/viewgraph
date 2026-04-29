/**
 * Annotation Panel
 *
 * Floating comment input that appears when a new region is selected
 * or when an existing annotation is clicked in the sidebar. Anchored
 * near the annotation's region.
 *
 * @see lib/review.js - annotation state management
 */

import { updateComment, updateSeverity, updateCategory, removeAnnotation, MARKER_COLORS } from './annotate.js';
import { diagnoseElement } from './ui/element-diagnostics.js';

import { ATTR } from './selector.js';
import { COLOR, FONT } from './sidebar/styles.js';
import { svgFromString } from './sidebar/icons.js';
let panelEl = null;
let currentId = null;
let onCommentChange = null;
let outsideClickHandler = null;

/**
 * Show the annotation panel for a given annotation.
 * @param {{ id: number, region: object, comment: string }} annotation
 * @param {{ onChange?: Function }} callbacks
 */
export async function show(annotation, callbacks = {}) {
  hide();
  currentId = annotation.id;
  onCommentChange = callbacks.onChange || null;

  panelEl = document.createElement('div');
  panelEl.setAttribute(ATTR, 'panel');
  Object.assign(panelEl.style, {
    all: 'initial', position: 'absolute', zIndex: '2147483647',
    background: '#1e1e2e', borderRadius: '8px',
    border: `2px solid ${MARKER_COLORS[(annotation.id - 1) % MARKER_COLORS.length]}`,
    padding: '10px', width: '270px', fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)', boxSizing: 'border-box',
  });

  // Header: annotation number + close button + delete button
  const header = document.createElement('div');
  header.setAttribute(ATTR, 'header');
  Object.assign(header.style, {
    display: 'flex', alignItems: 'center', marginBottom: '8px', gap: '6px',
  });

  const title = document.createElement('span');
  title.textContent = `#${annotation.id}`;
  Object.assign(title.style, { color: COLOR.primaryLight, fontSize: '13px', fontWeight: '600', flex: '1' });

  const deleteBtn = makeHeaderBtn(
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
    'Delete annotation',
  );
  deleteBtn.addEventListener('click', () => { hide(); removeAnnotation(annotation.id); });

  // Idea toggle - one-click switch to/from idea mode
  const ideaBtn = makeHeaderBtn(
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/></svg>',
    'Toggle idea mode',
  );
  const isIdeaInit = (annotation.category || '').includes('idea');
  if (isIdeaInit) {
    ideaBtn.querySelector('svg').setAttribute('stroke', '#eab308');
    ideaBtn.style.background = 'rgba(234,179,8,0.15)';
  }
  ideaBtn.addEventListener('click', () => {
    const cats = (annotation.category || '').split(',').map((s) => s.trim()).filter(Boolean);
    const hasIdea = cats.includes('idea');
    const updated = hasIdea ? cats.filter((c) => c !== 'idea') : [...cats, 'idea'];
    annotation.category = updated.join(',');
    updateCategory(annotation.id, annotation.category);
    // Update button visual
    ideaBtn.querySelector('svg').setAttribute('stroke', updated.includes('idea') ? '#eab308' : COLOR.secondary);
    ideaBtn.style.background = updated.includes('idea') ? 'rgba(234,179,8,0.15)' : 'transparent';
    // Re-render category chips and panel tint
    renderCategoryChips();
    if (onCommentChange) onCommentChange(annotation.id);
  });

  const closeBtn = makeHeaderBtn(
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    'Close panel',
  );
  closeBtn.addEventListener('click', () => hide());

  header.append(title, ideaBtn, deleteBtn, closeBtn);

  /** Chip colors by type. */
  const CHIP_COLORS = {
    critical: COLOR.error, major: COLOR.warning, minor: '#6b7280',
    visual: COLOR.primary, functional: '#0ea5e9', content: '#8b5cf6',
    a11y: '#10b981', performance: '#f97316', idea: '#eab308',
  };

  /**
   * Create a chip-or-select widget. Shows a dropdown when empty, a dismissable
   * chip when a value is selected. Dismissing the chip resets to dropdown.
   */
  function createChipSelect(attr, label, options, currentValue, onChange) {
    const wrapper = document.createElement('div');
    wrapper.setAttribute(ATTR, attr);
    Object.assign(wrapper.style, { display: 'inline-block', marginRight: '4px', marginBottom: '6px', verticalAlign: 'top' });

    function renderChip(val) {
      wrapper.replaceChildren();
      const chip = document.createElement('span');
      const chipColor = CHIP_COLORS[val] || COLOR.dim;
      Object.assign(chip.style, {
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '2px 8px', borderRadius: '12px', fontSize: '11px',
        fontFamily: 'system-ui, sans-serif', cursor: 'default',
        background: 'transparent', color: chipColor, border: `1.5px solid ${chipColor}`,
      });
      const text = document.createElement('span');
      text.textContent = '\u26a0 ' + (options.find((o) => o.value === val)?.label || val);
      const x = document.createElement('span');
      Object.assign(x.style, { cursor: 'pointer', marginLeft: '2px', fontSize: '13px', lineHeight: '1' });
      x.textContent = '\u00d7';
      x.addEventListener('click', (e) => { e.stopPropagation(); onChange(''); renderSelect(); });
      chip.append(text, x);
      wrapper.appendChild(chip);
    }

    function renderSelect() {
      wrapper.replaceChildren();
      const sel = document.createElement('select');
      Object.assign(sel.style, {
        padding: '2px 6px', background: COLOR.bgCard, border: `1px solid ${COLOR.border}`,
        borderRadius: '4px', color: '#e0e0e0', fontSize: '11px', height: '24px',
        fontFamily: FONT, outline: 'none', cursor: 'pointer',
        boxSizing: 'border-box',
      });
      for (const { value, label: optLabel } of [{ value: '', label: `${label}...` }, ...options]) {
        const o = document.createElement('option');
        o.value = value; o.textContent = optLabel;
        sel.appendChild(o);
      }
      sel.addEventListener('change', () => {
        if (sel.value) { onChange(sel.value); renderChip(sel.value); }
      });
      wrapper.appendChild(sel);
    }

    if (currentValue) renderChip(currentValue); else renderSelect();
    return wrapper;
  }

  // Chip row: severity on left, category chips + dropdown stacked on right
  const chipRow = document.createElement('div');
  Object.assign(chipRow.style, { display: 'flex', gap: '4px', alignItems: 'flex-start', marginBottom: '2px', flexWrap: 'nowrap' });

  const severityChip = createChipSelect('severity', 'Severity',
    [{ value: 'critical', label: 'Critical' }, { value: 'major', label: 'Major' }, { value: 'minor', label: 'Minor' }],
    annotation.severity || '',
    (val) => { updateSeverity(annotation.id, val); if (onCommentChange) onCommentChange(annotation.id); },
  );

  // Multi-select category chips
  const CAT_OPTIONS = [
    { value: 'visual', label: 'Visual' }, { value: 'functional', label: 'Functional' },
    { value: 'content', label: 'Content' }, { value: 'a11y', label: 'A11y' }, { value: 'performance', label: 'Perf' },
    { value: 'idea', label: 'Idea' },
  ];
  const categoryWrapper = document.createElement('div');
  categoryWrapper.setAttribute(ATTR, 'category');
  Object.assign(categoryWrapper.style, { display: 'flex', flexWrap: 'wrap', gap: '3px', flex: '1', alignItems: 'center' });

  /** Parse stored category - could be string or array. */
  function parseCats() {
    const raw = annotation.category || '';
    if (Array.isArray(raw)) return raw;
    return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
  }

  function renderCategoryChips() {
    categoryWrapper.replaceChildren();
    const selected = parseCats();

    // Restyle panel when idea category is active
    const isIdea = selected.includes('idea');
    const defaultBorder = MARKER_COLORS[(annotation.id - 1) % MARKER_COLORS.length];
    panelEl.style.border = `2px solid ${isIdea ? '#eab308' : defaultBorder}`;
    panelEl.style.background = isIdea ? '#1a1a0e' : '#1e1e2e';

    // Hide severity for ideas (not applicable), clear stale severity on mode switch
    severityChip.style.display = isIdea ? 'none' : 'inline-block';
    if (isIdea && annotation.severity) {
      annotation.severity = '';
      updateSeverity(annotation.id, '');
    }

    // Render chips for selected categories
    for (const val of selected) {
      const chip = document.createElement('span');
      Object.assign(chip.style, {
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        padding: '2px 8px', borderRadius: '12px', fontSize: '11px',
        fontFamily: FONT, color: COLOR.white, cursor: 'default',
        background: CHIP_COLORS[val] || COLOR.dim,
      });
      const text = document.createElement('span');
      text.textContent = CAT_OPTIONS.find((o) => o.value === val)?.label || val;
      const x = document.createElement('span');
      Object.assign(x.style, { cursor: 'pointer', fontSize: '13px', lineHeight: '1' });
      x.textContent = '\u00d7';
      x.addEventListener('click', (e) => {
        e.stopPropagation();
        const updated = selected.filter((v) => v !== val);
        annotation.category = updated.join(',');
        updateCategory(annotation.id, annotation.category);
        if (onCommentChange) onCommentChange(annotation.id);
        renderCategoryChips();
      });
      chip.append(text, x);
      categoryWrapper.appendChild(chip);
    }

    // Show dropdown for remaining options
    const remaining = CAT_OPTIONS.filter((o) => !selected.includes(o.value));
    if (remaining.length > 0) {
      const sel = document.createElement('select');
      Object.assign(sel.style, {
        padding: '2px 6px', background: COLOR.bgCard, border: `1px solid ${COLOR.border}`,
        borderRadius: '4px', color: '#e0e0e0', fontSize: '11px', height: '24px',
        fontFamily: FONT, outline: 'none', cursor: 'pointer',
        boxSizing: 'border-box',
      });
      const placeholder = document.createElement('option');
      placeholder.value = ''; placeholder.textContent = 'Category...';
      sel.appendChild(placeholder);
      for (const { value, label } of remaining) {
        const o = document.createElement('option');
        o.value = value; o.textContent = label;
        sel.appendChild(o);
      }
      sel.addEventListener('change', () => {
        if (!sel.value) return;
        const updated = [...selected, sel.value];
        annotation.category = updated.join(',');
        updateCategory(annotation.id, annotation.category);
        if (onCommentChange) onCommentChange(annotation.id);
        renderCategoryChips();
      });
      categoryWrapper.appendChild(sel);
    }
  }

  renderCategoryChips();

  chipRow.append(severityChip, categoryWrapper);

  // Textarea for comment
  const textarea = document.createElement('textarea');
  textarea.setAttribute(ATTR, 'input');
  textarea.value = annotation.comment;
  textarea.placeholder = 'What should this look like?\ne.g. "font should be 14px" or "label should say Email Address"';
  Object.assign(textarea.style, {
    width: '100%', minHeight: '90px', padding: '6px 8px',
    background: COLOR.bgCard, border: `1px solid ${COLOR.border}`, borderRadius: '4px',
    color: '#e0e0e0', fontSize: '13px', fontFamily: FONT,
    resize: 'vertical', outline: 'none', boxSizing: 'border-box',
    scrollbarWidth: 'thin', scrollbarColor: `${COLOR.borderLight} transparent`,
  });
  textarea.addEventListener('input', () => {
    updateComment(annotation.id, textarea.value);
    if (onCommentChange) onCommentChange(annotation.id, textarea.value);
  });
  textarea.addEventListener('focus', () => { textarea.style.borderColor = COLOR.primary; });
  textarea.addEventListener('blur', () => { textarea.style.borderColor = COLOR.border; });

  panelEl.append(header, chipRow, textarea);

  // Diagnostic attachment preview - collapsible detail below textarea
  if (annotation.diagnostic?.data) {
    const attachRow = document.createElement('div');
    attachRow.setAttribute(ATTR, 'diagnostic-attach');
    Object.assign(attachRow.style, { marginTop: '4px', borderTop: `1px solid ${COLOR.border}`, paddingTop: '4px' });

    const attachHeader = document.createElement('div');
    Object.assign(attachHeader.style, { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' });
    const arrow = document.createElement('span');
    arrow.textContent = '\u25b8';
    Object.assign(arrow.style, { color: '#0d9488', fontSize: '12px', transition: 'transform 0.15s' });
    const attachLabel = document.createElement('span');
    attachLabel.textContent = `${annotation.diagnostic.section} data attached`;
    Object.assign(attachLabel.style, { color: '#0d9488', fontSize: '11px', fontWeight: '600' });
    attachHeader.append(arrow, attachLabel);

    const attachBody = document.createElement('div');
    Object.assign(attachBody.style, {
      display: 'none', marginTop: '4px', padding: '4px 6px',
      background: '#0d1117', borderRadius: '4px', fontSize: '10px',
      color: '#8b949e', fontFamily: 'monospace', maxHeight: '80px',
      overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
      scrollbarWidth: 'thin', scrollbarColor: `${COLOR.borderLight} transparent`,
    });
    attachBody.textContent = annotation.diagnostic.data;

    attachHeader.addEventListener('click', () => {
      const open = attachBody.style.display !== 'none';
      attachBody.style.display = open ? 'none' : 'block';
      arrow.style.transform = open ? '' : 'rotate(90deg)';
    });

    attachRow.append(attachHeader, attachBody);
    panelEl.appendChild(attachRow);
  }

  // Element diagnostics - clickable suggestion chips for the selected element
  let suggestionsEnabled = true; // default on; config can disable
  try {
    const cached = await chrome.storage.local.get('vg_project_config');
    if (cached.vg_project_config?.smartSuggestions === false) suggestionsEnabled = false;
  } catch { /* no cache - show suggestions by default */ }

  // Suppress diagnostic suggestions in idea mode - ideas are about what to build, not what's broken
  const isIdeaMode = (annotation.category || '').includes('idea');
  if (suggestionsEnabled && !isIdeaMode && annotation.element?.selector) {
    try {
      const domEl = document.querySelector(annotation.element.selector);
      if (domEl) {
        const hints = diagnoseElement(domEl);
        if (hints.length > 0) {
          const hintsDiv = document.createElement('div');
          hintsDiv.setAttribute(ATTR, 'suggestions');
          Object.assign(hintsDiv.style, { marginTop: '6px', borderTop: `1px solid ${COLOR.border}`, paddingTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' });
          const label = document.createElement('div');
          label.textContent = 'Suggestions';
          Object.assign(label.style, { width: '100%', fontSize: '10px', color: COLOR.muted, marginBottom: '2px', fontFamily: FONT });
          hintsDiv.appendChild(label);
          for (const hint of hints) {
            const chip = document.createElement('button');
            chip.setAttribute(ATTR, 'suggestion-chip');
            const isWarning = hint.icon === '\u26a0';
            chip.textContent = `${hint.icon} ${hint.text}`;
            Object.assign(chip.style, {
              fontSize: '10px', padding: '3px 8px', borderRadius: '12px',
              border: `1px solid ${isWarning ? '#92400e' : '#374151'}`,
              background: isWarning ? '#451a03' : '#1f2937',
              color: isWarning ? COLOR.warningLight : COLOR.secondary,
              cursor: 'pointer', fontFamily: FONT,
              transition: 'background 0.1s',
            });
            chip.addEventListener('mouseenter', () => { chip.style.background = isWarning ? '#78350f' : '#374151'; });
            chip.addEventListener('mouseleave', () => { chip.style.background = isWarning ? '#451a03' : '#1f2937'; });
            chip.addEventListener('click', () => {
              const current = textarea.value.trim();
              const sep = current ? '\n' : '';
              textarea.value = current + sep + hint.text;
              updateComment(annotation.id, textarea.value);
              if (onCommentChange) onCommentChange(annotation.id, textarea.value);
              chip.style.opacity = '0.4';
              chip.style.pointerEvents = 'none';
            });
            hintsDiv.appendChild(chip);
          }
          panelEl.appendChild(hintsDiv);
        }
      }
    } catch { /* selector may not match */ }
  }

  // Position near the annotation region, avoiding sidebar and screen edges
  const panelWidth = 270;
  const sidebarWidth = 320;
  const vw = window.innerWidth;
  const rightEdge = annotation.region.x + annotation.region.width + 12 + panelWidth;
  let x, y;
  if (rightEdge > vw - sidebarWidth) {
    // Place to the left of the marker
    x = Math.max(8, annotation.region.x - panelWidth - 12);
  } else {
    x = annotation.region.x + annotation.region.width + 12;
  }
  y = annotation.region.y;
  Object.assign(panelEl.style, { left: `${x}px`, top: `${y}px` });

  // Prevent wheel events from bubbling to annotate.js DOM tree cycling
  panelEl.addEventListener('wheel', (e) => { e.stopPropagation(); }, { passive: true });

  document.documentElement.appendChild(panelEl);
  textarea.focus();

  // Click outside to dismiss (delayed to avoid immediate trigger)
  setTimeout(() => {
    outsideClickHandler = (e) => {
      if (panelEl && !panelEl.contains(e.target)) hide();
    };
    document.addEventListener('mousedown', outsideClickHandler);
  }, 100);
}

/** Small header icon button. */
function makeHeaderBtn(svgHtml, title) {
  const btn = document.createElement('button');
  btn.setAttribute(ATTR, 'btn');
  btn.replaceChildren(svgFromString(svgHtml));
  btn.title = title;
  Object.assign(btn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer',
    padding: '2px', borderRadius: '3px', display: 'flex',
  });
  btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(255,255,255,0.1)'; });
  btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });
  return btn;
}

/** Hide the annotation panel. */
export function hide() {
  if (panelEl) { panelEl.remove(); panelEl = null; }
  if (outsideClickHandler) {
    document.removeEventListener('mousedown', outsideClickHandler);
    outsideClickHandler = null;
  }
  currentId = null;
  onCommentChange = null;
}

/** Get the currently shown annotation id, or null. */
export function currentAnnotationId() {
  return currentId;
}
