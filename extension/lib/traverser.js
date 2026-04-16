/**
 * DOM Traverser
 *
 * Walks the DOM tree depth-first, extracting element data for each visible
 * node. Returns a flat array of element records with nid references for
 * parent-child relationships.
 *
 * Runs in the content script context (has access to document, window).
 */

import { checkRendered } from './collectors/visibility-collector.js';

/** Tags that are inherently interactive. */
const INTERACTIVE_TAGS = new Set(['a', 'button', 'input', 'select', 'textarea', 'details', 'summary']);

/** Tags with semantic meaning for page structure. */
const SEMANTIC_TAGS = new Set(['nav', 'main', 'header', 'footer', 'aside', 'form', 'table', 'section', 'article', 'dialog']);

/** Style properties to extract, grouped by category. */
const STYLE_PROPS = {
  layout: ['display', 'position', 'visibility', 'overflow', 'width', 'height'],
  spacing: ['margin', 'padding', 'border', 'border-radius'],
  visual: ['color', 'background-color', 'opacity', 'box-shadow'],
  typography: ['font-family', 'font-size', 'font-weight', 'line-height', 'text-align'],
  flexbox: ['flex-direction', 'justify-content', 'align-items', 'gap'],
};

/**
 * Check if an element is visible (not display:none, not zero-size).
 * @param {Element} el
 * @param {CSSStyleDeclaration} computed
 * @returns {boolean}
 */
function isVisible(el, computed) {
  if (computed.display === 'none' || computed.visibility === 'hidden') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Generate a human-readable alias for an element.
 * Priority: data-testid > id > role+name > tag+nid
 */
function generateAlias(el, tag, nid) {
  const testid = el.getAttribute('data-testid');
  if (testid) return `${tag}:${testid}`;
  if (el.id) return `${tag}:${el.id}`;
  const name = el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 30);
  if (name) return `${tag}:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}`;
  return `${tag}:n${nid}`;
}

/**
 * Build a CSS selector for an element.
 * Prefers data-testid, then id, then structural selector.
 */
function buildSelector(el) {
  const testid = el.getAttribute('data-testid');
  if (testid) return `[data-testid="${testid}"]`;
  if (el.id) return `#${el.id}`;
  // Structural fallback: tag + nth-child
  const tag = el.tagName.toLowerCase();
  const parent = el.parentElement;
  if (!parent) return tag;
  const siblings = [...parent.children].filter((c) => c.tagName === el.tagName);
  if (siblings.length === 1) return `${parent.tagName.toLowerCase()} > ${tag}`;
  const idx = siblings.indexOf(el) + 1;
  return `${tag}:nth-child(${idx})`;
}

/**
 * Extract computed styles for an element, grouped by category.
 * Only includes non-default values.
 */
function extractStyles(computed) {
  const styles = {};
  for (const [category, props] of Object.entries(STYLE_PROPS)) {
    const values = {};
    for (const prop of props) {
      const val = computed.getPropertyValue(prop);
      if (val && val !== 'none' && val !== 'normal' && val !== 'auto' && val !== '0px') {
        values[prop] = val;
      }
    }
    if (Object.keys(values).length > 0) styles[category] = values;
  }
  return styles;
}

/**
 * Extract ARIA relations from an element.
 * Returns array of { source, target, type } objects.
 */
function extractRelations(el, nid, nidMap) {
  const relations = [];
  const ariaMap = {
    'aria-labelledby': 'labelFor',
    'aria-describedby': 'describedBy',
    'aria-controls': 'controls',
    'aria-owns': 'owns',
  };
  for (const [attr, type] of Object.entries(ariaMap)) {
    const targetId = el.getAttribute(attr);
    if (targetId) {
      const targetEl = document.getElementById(targetId);
      if (targetEl && nidMap.has(targetEl)) {
        relations.push({ source: nid, target: nidMap.get(targetEl), type });
      }
    }
  }
  // label[for] -> input
  if (el.tagName === 'LABEL' && el.htmlFor) {
    const targetEl = document.getElementById(el.htmlFor);
    if (targetEl && nidMap.has(targetEl)) {
      relations.push({ source: nid, target: nidMap.get(targetEl), type: 'labelFor' });
    }
  }
  return relations;
}

/**
 * Traverse the DOM tree and return structured element data.
 * @param {Element} [root=document.body] - Root element to start traversal from
 * @returns {{ elements: Array, relations: Array }}
 */
export function traverseDOM(root = document.body) {
  const elements = [];
  const nidMap = new WeakMap(); // Element -> nid
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  let nextNid = 1;

  /**
   * Recursively walk the DOM tree.
   * @param {Element} el
   * @param {number|null} parentNid
   */
  function walk(el, parentNid) {
    if (!(el instanceof Element)) return;
    const computed = window.getComputedStyle(el);
    if (!isVisible(el, computed)) return;

    const nid = nextNid++;
    nidMap.set(el, nid);
    const tag = el.tagName.toLowerCase();
    const rect = el.getBoundingClientRect();

    // Document-relative bounding box (canonical coordinates per v2.1 spec)
    const bbox = [
      Math.round(rect.left + scrollX),
      Math.round(rect.top + scrollY),
      Math.round(rect.width),
      Math.round(rect.height),
    ];

    const childNids = [];
    // Walk regular children
    for (const child of el.children) {
      walk(child, nid);
      if (nidMap.has(child)) childNids.push(nidMap.get(child));
    }
    // Walk shadow DOM children if present
    if (el.shadowRoot) {
      for (const child of el.shadowRoot.children) {
        walk(child, nid);
        if (nidMap.has(child)) childNids.push(nidMap.get(child));
      }
    }

    const record = {
      nid,
      tag,
      parentNid: parentNid,
      childNids,
      alias: generateAlias(el, tag, nid),
      selector: buildSelector(el),
      testid: el.getAttribute('data-testid') || null,
      htmlId: el.id || null,
      role: el.getAttribute('role') || null,
      ariaLabel: el.getAttribute('aria-label') || null,
      text: el.textContent?.trim().slice(0, 200) || '',
      visibleText: el.innerText?.trim().slice(0, 200) || '',
      bbox,
      isInteractive: INTERACTIVE_TAGS.has(tag) || el.getAttribute('role') === 'button' || el.onclick != null,
      isSemantic: SEMANTIC_TAGS.has(tag),
      isRendered: checkRendered(el),
      styles: extractStyles(computed),
      attributes: {},
    };

    // Collect relevant attributes
    for (const attr of el.attributes) {
      if (attr.name.startsWith('data-') || attr.name.startsWith('aria-')) {
        record.attributes[attr.name] = attr.value;
      }
    }

    elements.push(record);
  }

  walk(root, null);

  // Extract relations in a second pass (all nids assigned)
  const relations = [];
  for (const el of root.querySelectorAll('*')) {
    if (nidMap.has(el)) {
      relations.push(...extractRelations(el, nidMap.get(el), nidMap));
    }
  }

  return { elements, relations };
}
