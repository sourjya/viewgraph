/**
 * Traverser Performance Benchmark
 *
 * Benchmarks traverseDOM() against a 500-element mock DOM.
 * Uses vitest bench mode. Run: npx vitest bench tests/bench/traverser.bench.js
 *
 * @see .kiro/specs/extension-perf-pipeline/tasks.md - Task 1.2
 */

import { bench, describe } from 'vitest';
import { traverseDOM } from '#lib/capture/traverser.js';

/**
 * Generate a mock DOM tree with the specified number of elements.
 * Creates a realistic mix of tags, attributes, and nesting depth.
 * @param {number} count - Number of elements to create
 * @returns {HTMLElement} Root element containing the tree
 */
function generateMockDOM(count) {
  const root = document.createElement('div');
  root.setAttribute('id', 'app');

  const tags = ['div', 'span', 'p', 'button', 'input', 'a', 'h1', 'h2', 'img', 'ul', 'li', 'section', 'nav', 'main', 'form', 'label'];
  let current = root;
  let depth = 0;

  for (let i = 0; i < count; i++) {
    const tag = tags[i % tags.length];
    const el = document.createElement(tag);

    // Add realistic attributes
    if (i % 5 === 0) el.setAttribute('data-testid', `el-${i}`);
    if (i % 7 === 0) el.setAttribute('aria-label', `Element ${i}`);
    if (i % 3 === 0) el.setAttribute('class', `cls-${i % 10} cls-${i % 20}`);
    if (tag === 'input') el.setAttribute('type', 'text');
    if (tag === 'a') el.setAttribute('href', `#link-${i}`);
    if (tag === 'img') { el.setAttribute('src', `img-${i}.png`); el.setAttribute('alt', `Image ${i}`); }
    if (i % 10 === 0) el.textContent = `Text content for element ${i}`;

    // Vary nesting depth (max 8 levels)
    if (depth < 8 && i % 4 === 0) {
      current.appendChild(el);
      current = el;
      depth++;
    } else if (depth > 2 && i % 6 === 0) {
      current = current.parentElement || root;
      depth--;
      current.appendChild(el);
    } else {
      current.appendChild(el);
    }
  }

  document.body.appendChild(root);
  return root;
}

describe('traverseDOM performance', () => {
  let root;

  bench('500 elements', () => {
    if (root) root.remove();
    root = generateMockDOM(500);
    traverseDOM(root);
  }, { iterations: 50, warmupIterations: 5 });

  bench('200 elements', () => {
    if (root) root.remove();
    root = generateMockDOM(200);
    traverseDOM(root);
  }, { iterations: 100, warmupIterations: 10 });

  bench('1000 elements', () => {
    if (root) root.remove();
    root = generateMockDOM(1000);
    traverseDOM(root);
  }, { iterations: 20, warmupIterations: 3 });
});
