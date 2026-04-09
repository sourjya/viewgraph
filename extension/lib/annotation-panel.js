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

const ATTR = 'data-vg-annotate';
let panelEl = null;
let currentId = null;
let onCommentChange = null;
let outsideClickHandler = null;

/**
 * Show the annotation panel for a given annotation.
 * @param {{ id: number, region: object, comment: string }} annotation
 * @param {{ onChange?: Function }} callbacks
 */
export function show(annotation, callbacks = {}) {
  hide();
  currentId = annotation.id;
  onCommentChange = callbacks.onChange || null;

  panelEl = document.createElement('div');
  panelEl.setAttribute(ATTR, 'panel');
  Object.assign(panelEl.style, {
    position: 'absolute', zIndex: '2147483647',
    background: '#1e1e2e', borderRadius: '8px',
    border: `2px solid ${MARKER_COLORS[(annotation.id - 1) % MARKER_COLORS.length]}`,
    padding: '10px', width: '270px', fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  });

  // Header: annotation number + close button + delete button
  const header = document.createElement('div');
  header.setAttribute(ATTR, 'header');
  Object.assign(header.style, {
    display: 'flex', alignItems: 'center', marginBottom: '8px', gap: '6px',
  });

  const title = document.createElement('span');
  title.textContent = `#${annotation.id}`;
  Object.assign(title.style, { color: '#a5b4fc', fontSize: '13px', fontWeight: '600', flex: '1' });

  const deleteBtn = makeHeaderBtn(
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
    'Delete annotation',
  );
  deleteBtn.addEventListener('click', () => { hide(); removeAnnotation(annotation.id); });

  const closeBtn = makeHeaderBtn(
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    'Close panel',
  );
  closeBtn.addEventListener('click', () => hide());

  header.append(title, deleteBtn, closeBtn);

  /** Chip colors by type. */
  const CHIP_COLORS = {
    critical: '#dc2626', major: '#f59e0b', minor: '#6b7280',
    visual: '#6366f1', functional: '#0ea5e9', content: '#8b5cf6',
    a11y: '#10b981', performance: '#f97316',
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
      wrapper.innerHTML = '';
      const chip = document.createElement('span');
      Object.assign(chip.style, {
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '2px 8px', borderRadius: '12px', fontSize: '11px',
        fontFamily: 'system-ui, sans-serif', color: '#fff', cursor: 'default',
        background: CHIP_COLORS[val] || '#555',
      });
      const text = document.createElement('span');
      text.textContent = options.find((o) => o.value === val)?.label || val;
      const x = document.createElement('span');
      Object.assign(x.style, { cursor: 'pointer', marginLeft: '2px', fontSize: '13px', lineHeight: '1' });
      x.textContent = '\u00d7';
      x.addEventListener('click', (e) => { e.stopPropagation(); onChange(''); renderSelect(); });
      chip.append(text, x);
      wrapper.appendChild(chip);
    }

    function renderSelect() {
      wrapper.innerHTML = '';
      const sel = document.createElement('select');
      Object.assign(sel.style, {
        padding: '2px 6px', background: '#16161e', border: '1px solid #333',
        borderRadius: '4px', color: '#e0e0e0', fontSize: '11px',
        fontFamily: 'system-ui, sans-serif', outline: 'none', cursor: 'pointer',
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

  // Chip row container
  const chipRow = document.createElement('div');
  Object.assign(chipRow.style, { display: 'flex', flexWrap: 'wrap', marginBottom: '2px' });

  const severityChip = createChipSelect('severity', 'Severity',
    [{ value: 'critical', label: 'Critical' }, { value: 'major', label: 'Major' }, { value: 'minor', label: 'Minor' }],
    annotation.severity || '',
    (val) => { updateSeverity(annotation.id, val); if (onCommentChange) onCommentChange(annotation.id); },
  );

  // Multi-select category chips
  const CAT_OPTIONS = [
    { value: 'visual', label: 'Visual' }, { value: 'functional', label: 'Functional' },
    { value: 'content', label: 'Content' }, { value: 'a11y', label: 'A11y' }, { value: 'performance', label: 'Perf' },
  ];
  const categoryWrapper = document.createElement('div');
  categoryWrapper.setAttribute(ATTR, 'category');
  Object.assign(categoryWrapper.style, { display: 'inline-flex', flexWrap: 'wrap', gap: '3px', verticalAlign: 'top' });

  /** Parse stored category - could be string or array. */
  function parseCats() {
    const raw = annotation.category || '';
    if (Array.isArray(raw)) return raw;
    return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
  }

  function renderCategoryChips() {
    categoryWrapper.innerHTML = '';
    const selected = parseCats();

    // Render chips for selected categories
    for (const val of selected) {
      const chip = document.createElement('span');
      Object.assign(chip.style, {
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        padding: '2px 8px', borderRadius: '12px', fontSize: '11px',
        fontFamily: 'system-ui, sans-serif', color: '#fff', cursor: 'default',
        background: CHIP_COLORS[val] || '#555',
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
        padding: '2px 6px', background: '#16161e', border: '1px solid #333',
        borderRadius: '4px', color: '#e0e0e0', fontSize: '11px',
        fontFamily: 'system-ui, sans-serif', outline: 'none', cursor: 'pointer',
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
    background: '#16161e', border: '1px solid #333', borderRadius: '4px',
    color: '#e0e0e0', fontSize: '13px', fontFamily: 'system-ui, sans-serif',
    resize: 'vertical', outline: 'none',
  });
  textarea.addEventListener('input', () => {
    updateComment(annotation.id, textarea.value);
    if (onCommentChange) onCommentChange(annotation.id, textarea.value);
  });
  textarea.addEventListener('focus', () => { textarea.style.borderColor = '#6366f1'; });
  textarea.addEventListener('blur', () => { textarea.style.borderColor = '#333'; });

  panelEl.append(header, chipRow, textarea);

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
  btn.innerHTML = svgHtml;
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
