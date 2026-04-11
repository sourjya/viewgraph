/**
 * Event Listener Inventory
 *
 * Detects event handlers on DOM elements using available signals:
 * 1. HTML event attributes (onclick, onchange, etc.)
 * 2. React synthetic events via fiber props (onClick, onChange, etc.)
 * 3. Vue event bindings via __vue__ instance
 * 4. Elements with cursor:pointer but no detectable handler (suspicious)
 *
 * Cannot detect addEventListener() calls (no content script API for that).
 * This is a best-effort heuristic, not a complete inventory.
 *
 * @see docs/roadmap/roadmap.md - M12.4
 */

const ATTR = 'data-vg-annotate';
const MAX_ELEMENTS = 2000;

/** HTML event attributes to check. */
const EVENT_ATTRS = [
  'onclick', 'onchange', 'oninput', 'onsubmit', 'onfocus', 'onblur',
  'onkeydown', 'onkeyup', 'onmousedown', 'onmouseup', 'onmouseover',
];

/** React event prop names to check on fiber. */
const REACT_EVENTS = [
  'onClick', 'onChange', 'onInput', 'onSubmit', 'onFocus', 'onBlur',
  'onKeyDown', 'onKeyUp', 'onMouseDown', 'onMouseUp', 'onMouseOver',
  'onDrag', 'onDrop', 'onScroll', 'onTouchStart', 'onTouchEnd',
];

/**
 * Collect event listener information from the DOM.
 * @returns {{ elements: Array<{ selector: string, tag: string, events: string[], source: string }>, suspicious: Array<{ selector: string, tag: string, reason: string }> }}
 */
export function collectEventListeners() {
  const elements = [];
  const suspicious = [];
  let count = 0;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node && count < MAX_ELEMENTS) {
    count++;
    if (node.closest(`[${ATTR}]`)) { node = walker.nextNode(); continue; }

    const events = [];
    let source = '';

    // Check HTML event attributes
    for (const attr of EVENT_ATTRS) {
      if (node.hasAttribute(attr)) {
        events.push(attr.slice(2)); // 'onclick' -> 'click'
        source = 'html-attr';
      }
    }

    // Check React fiber props
    if (!source) {
      const fiberKey = Object.keys(node).find((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
      if (fiberKey) {
        const fiber = node[fiberKey];
        const props = fiber?.memoizedProps || fiber?.pendingProps || {};
        for (const evt of REACT_EVENTS) {
          if (typeof props[evt] === 'function') {
            events.push(evt.slice(2).toLowerCase()); // 'onClick' -> 'click'
            source = 'react';
          }
        }
      }
    }

    // Check Vue event bindings
    if (!source && node.__vue__) {
      const listeners = node.__vue__.$listeners || {};
      for (const key of Object.keys(listeners)) {
        events.push(key);
        source = 'vue';
      }
    }

    if (events.length > 0) {
      elements.push({
        selector: buildSelector(node),
        tag: node.tagName.toLowerCase(),
        events: [...new Set(events)],
        source,
      });
    } else {
      // Check for suspicious: cursor:pointer but no detected handler
      const style = window.getComputedStyle(node);
      if (style.cursor === 'pointer' && !isNativelyClickable(node)) {
        suspicious.push({
          selector: buildSelector(node),
          tag: node.tagName.toLowerCase(),
          reason: 'cursor:pointer but no detected event handler',
        });
      }
    }

    node = walker.nextNode();
  }

  return { elements: elements.slice(0, 100), suspicious: suspicious.slice(0, 20) };
}

/** Check if an element is natively clickable (button, a, input, etc.). */
function isNativelyClickable(el) {
  const tag = el.tagName.toLowerCase();
  return ['a', 'button', 'input', 'select', 'textarea', 'summary', 'label'].includes(tag)
    || el.hasAttribute('tabindex')
    || el.getAttribute('role') === 'button';
}

/** Build a compact selector for an element. */
function buildSelector(el) {
  const tag = el.tagName.toLowerCase();
  if (el.id) return `${tag}#${el.id}`;
  const testid = el.getAttribute('data-testid');
  if (testid) return `${tag}[data-testid="${testid}"]`;
  const cls = el.className && typeof el.className === 'string'
    ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
    : '';
  return `${tag}${cls}`;
}
