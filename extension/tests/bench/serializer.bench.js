/**
 * Serializer Performance Benchmark
 *
 * Benchmarks serialize() against traverser output of various sizes.
 * Uses vitest bench mode. Run: npx vitest bench tests/bench/serializer.bench.js
 *
 * @see .kiro/specs/extension-perf-pipeline/tasks.md - Task 1.3
 * @vitest-environment jsdom
 */

import { bench, describe, beforeAll } from 'vitest';
import { serialize } from '#lib/capture/serializer.js';

/**
 * Generate mock traverser output (elements array) for serialization.
 * Matches the exact format expected by serialize() (same as serializer.test.js el() helper).
 * @param {number} count - Number of elements
 * @returns {{ elements: Array, relations: Array }}
 */
function generateMockElements(count) {
  const elements = [];
  const relations = [];
  const tags = ['div', 'button', 'input', 'a', 'p', 'span', 'h1', 'img', 'li', 'section'];
  const saliences = ['high', 'med', 'low'];

  for (let i = 0; i < count; i++) {
    const tag = tags[i % tags.length];
    const isInteractive = ['button', 'input', 'a'].includes(tag);
    const salience = saliences[i % 3];
    elements.push({
      nid: i + 1,
      tag,
      parentNid: i > 0 ? Math.max(1, i - (i % 3)) : null,
      childNids: [],
      alias: `${tag}:el-${i}`,
      selector: i % 5 === 0 ? `[data-testid="el-${i}"]` : `${tag}.cls-${i}`,
      testid: i % 5 === 0 ? `el-${i}` : null,
      htmlId: i % 10 === 0 ? `id-${i}` : null,
      role: isInteractive ? tag : null,
      ariaLabel: i % 8 === 0 ? `Label ${i}` : null,
      text: i % 3 === 0 ? `Text ${i}` : '',
      visibleText: i % 3 === 0 ? `Text ${i}` : '',
      bbox: [Math.random() * 1000, Math.random() * 2000, 100, 30],
      isInteractive,
      isSemantic: ['nav', 'main', 'section', 'h1'].includes(tag),
      styles: { visual: { color: 'rgb(0,0,0)', 'font-size': '14px' } },
      attributes: i % 5 === 0 ? { 'data-testid': `el-${i}` } : {},
      score: Math.round(Math.random() * 100),
      salience,
    });

    if (i > 0 && i % 10 === 0) {
      relations.push({ source: i + 1, target: i, type: 'label-for' });
    }
  }

  return { elements, relations };
}

describe('serialize performance', () => {
  // Pre-generate mock data outside bench loop to measure only serialization
  const data200 = generateMockElements(200);
  const data500 = generateMockElements(500);
  const data1000 = generateMockElements(1000);

  bench('500 elements', () => {
    serialize(data500.elements, data500.relations, {});
  }, { iterations: 50, warmupIterations: 5 });

  bench('200 elements', () => {
    serialize(data200.elements, data200.relations, {});
  }, { iterations: 100, warmupIterations: 10 });

  bench('1000 elements', () => {
    serialize(data1000.elements, data1000.relations, {});
  }, { iterations: 20, warmupIterations: 3 });
});
