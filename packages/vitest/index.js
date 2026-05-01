/**
 * @viewgraph/vitest - DOM Capture Plugin for Vitest
 *
 * Captures structured DOM snapshots during Vitest component and unit tests.
 * Works with jsdom environment. Produces the same ViewGraph capture format
 * as the browser extension and @viewgraph/playwright.
 *
 * Usage in a test file:
 *
 *   import { captureDOM, captureAndAssert } from '@viewgraph/vitest';
 *
 *   test('login form renders correctly', () => {
 *     render(<LoginForm />);
 *     const capture = captureDOM('login-form');
 *     expect(capture.actionManifest.byAction.fillable.length).toBeGreaterThan(0);
 *   });
 *
 * @see .kiro/specs/viewgraph-vitest/requirements.md
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/** Default output directory for captures. */
const DEFAULT_DIR = join(process.cwd(), '.viewgraph', 'captures');

/** Minimal serializer for jsdom DOM trees. */
function serializeNode(node, depth = 0) {
  if (!node || depth > 20) return null;
  if (node.nodeType === 3) {
    const text = node.textContent?.trim();
    return text ? { type: 'text', text } : null;
  }
  if (node.nodeType !== 1) return null;

  const el = /** @type {Element} */ (node);
  const tag = el.tagName.toLowerCase();

  // Skip script/style/svg internals
  if (['script', 'style', 'noscript'].includes(tag)) return null;

  const entry = {
    tag,
    id: el.id || null,
    testid: el.getAttribute('data-testid') || null,
    role: el.getAttribute('role') || implicitRole(tag, el),
    ariaLabel: el.getAttribute('aria-label') || null,
    text: el.textContent?.trim().slice(0, 100) || '',
    isInteractive: isInteractive(tag, el),
    children: [],
  };

  for (const child of el.childNodes) {
    const serialized = serializeNode(child, depth + 1);
    if (serialized) entry.children.push(serialized);
  }

  return entry;
}

/**
 * Get implicit ARIA role for common HTML elements.
 * @param {string} tag
 * @param {Element} el
 * @returns {string|null}
 */
function implicitRole(tag, el) {
  const roles = {
    button: 'button', a: 'link', input: 'textbox', select: 'combobox',
    textarea: 'textbox', nav: 'navigation', main: 'main', header: 'banner',
    footer: 'contentinfo', form: 'form', img: 'img', table: 'table',
    h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading',
  };
  if (tag === 'input') {
    const type = el.getAttribute('type') || 'text';
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'submit' || type === 'button') return 'button';
  }
  return roles[tag] || null;
}

/**
 * Check if an element is interactive.
 * @param {string} tag
 * @param {Element} el
 * @returns {boolean}
 */
function isInteractive(tag, el) {
  if (['button', 'input', 'select', 'textarea', 'a'].includes(tag)) return true;
  if (el.getAttribute('role') === 'button' || el.getAttribute('tabindex')) return true;
  if (el.getAttribute('onclick') || el.getAttribute('contenteditable') === 'true') return true;
  return false;
}

/**
 * Flatten a serialized DOM tree into a flat array of elements.
 * @param {object} node - Serialized node from serializeNode
 * @param {Array} result - Accumulator
 * @param {number} nid - Node ID counter
 * @returns {Array}
 */
function flatten(node, result = [], nid = { value: 1 }) {
  if (!node || node.type === 'text') return result;
  const id = nid.value++;
  const flat = {
    nid: id,
    tag: node.tag,
    testid: node.testid,
    role: node.role,
    ariaLabel: node.ariaLabel,
    text: node.text,
    isInteractive: node.isInteractive,
  };
  result.push(flat);
  for (const child of node.children || []) {
    flatten(child, result, nid);
  }
  return result;
}

/**
 * Capture the current jsdom DOM state as a ViewGraph-compatible snapshot.
 * Call this after rendering your component in a test.
 *
 * @param {string} [label] - Human-readable label for the capture
 * @param {object} [options]
 * @param {string} [options.capturesDir] - Output directory (default: .viewgraph/captures/)
 * @param {boolean} [options.write] - Write to disk (default: false)
 * @returns {object} Capture object with metadata, nodes, and actionManifest
 */
export function captureDOM(label, options = {}) {
  const root = document.body;
  if (!root) throw new Error('No document.body - are you running in jsdom environment?');

  const tree = serializeNode(root);
  const nodes = flatten(tree);
  const interactive = nodes.filter((n) => n.isInteractive);

  const capture = {
    metadata: {
      format: 'viewgraph-v2',
      version: '2.4.0',
      url: globalThis.location?.href || 'jsdom://localhost',
      title: document.title || '',
      timestamp: new Date().toISOString(),
      captureMode: 'vitest',
      label: label || null,
      stats: {
        totalNodes: nodes.length,
        interactive: interactive.length,
      },
    },
    nodes: nodes.map((n) => ({
      nid: n.nid,
      tag: n.tag,
      role: n.role,
      text: n.text,
    })),
    actionManifest: {
      byAction: {
        clickable: interactive.filter((n) => ['button', 'link'].includes(n.role) || n.tag === 'button' || n.tag === 'a'),
        fillable: interactive.filter((n) => ['textbox', 'combobox'].includes(n.role) || ['input', 'textarea', 'select'].includes(n.tag)),
        navigable: interactive.filter((n) => n.tag === 'a'),
      },
    },
    accessibility: {
      missingLabels: interactive.filter((n) => !n.ariaLabel && !n.text),
      missingTestids: interactive.filter((n) => !n.testid),
    },
  };

  // 15.1: Default to NOT writing (JSDoc says false, code must match)
  if (options.write === true) {
    const dir = options.capturesDir || DEFAULT_DIR;
    mkdirSync(dir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '').replace('T', '-').slice(0, 17);
    // S16-3: Cap label length to prevent filesystem filename limit issues
    const suffix = label ? `-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 50)}` : '';
    const filename = `viewgraph-vitest-${ts}${suffix}.json`;
    writeFileSync(join(dir, filename), JSON.stringify(capture, null, 2));
    capture._filename = filename;
  }

  return capture;
}

/**
 * Capture DOM and run common assertions in one call.
 * Returns the capture for further assertions.
 *
 * @param {string} label - Capture label
 * @param {object} [expectations]
 * @param {number} [expectations.minNodes] - Minimum total nodes
 * @param {number} [expectations.minInteractive] - Minimum interactive elements
 * @param {boolean} [expectations.noMissingLabels] - Assert no missing ARIA labels
 * @param {boolean} [expectations.noMissingTestids] - Assert no missing testids
 * @param {object} [options] - captureDOM options
 * @returns {object} The capture object
 */
export function captureAndAssert(label, expectations = {}, options = {}) {
  const capture = captureDOM(label, { write: false, ...options });

  const errors = [];
  if (expectations.minNodes && capture.metadata.stats.totalNodes < expectations.minNodes) {
    errors.push(`Expected at least ${expectations.minNodes} nodes, got ${capture.metadata.stats.totalNodes}`);
  }
  if (expectations.minInteractive && capture.metadata.stats.interactive < expectations.minInteractive) {
    errors.push(`Expected at least ${expectations.minInteractive} interactive elements, got ${capture.metadata.stats.interactive}`);
  }
  if (expectations.noMissingLabels && capture.accessibility.missingLabels.length > 0) {
    errors.push(`${capture.accessibility.missingLabels.length} interactive elements missing ARIA labels`);
  }
  if (expectations.noMissingTestids && capture.accessibility.missingTestids.length > 0) {
    errors.push(`${capture.accessibility.missingTestids.length} interactive elements missing data-testid`);
  }

  if (errors.length > 0) {
    throw new Error(`ViewGraph capture "${label}" failed assertions:\n  ${errors.join('\n  ')}`);
  }

  return capture;
}
