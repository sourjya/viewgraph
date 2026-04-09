/**
 * Serializer - Unit Tests
 *
 * Tests ViewGraph v2.1 JSON assembly from scored element data.
 * Uses jsdom for window/document globals needed by buildMetadata.
 */

import { describe, it, expect } from 'vitest';
import { serialize } from '#lib/serializer.js';

/** Helper: scored element record. */
function el(overrides = {}) {
  return {
    nid: 1, tag: 'button', parentNid: null, childNids: [],
    alias: 'button:submit', selector: '[data-testid="submit"]',
    testid: 'submit', htmlId: null, role: 'button',
    ariaLabel: 'Submit', text: 'Submit', visibleText: 'Submit',
    bbox: [100, 200, 120, 40], isInteractive: true, isSemantic: false,
    styles: { visual: { color: 'rgb(0,0,0)' } },
    attributes: { 'data-testid': 'submit' },
    score: 65, salience: 'high',
    ...overrides,
  };
}

describe('serialize', () => {
  it('produces all required top-level sections', () => {
    const capture = serialize([el()], []);
    expect(capture).toHaveProperty('metadata');
    expect(capture).toHaveProperty('summary');
    expect(capture).toHaveProperty('nodes');
    expect(capture).toHaveProperty('relations');
    expect(capture).toHaveProperty('details');
  });

  it('metadata has correct format and version', () => {
    const capture = serialize([el()], []);
    expect(capture.metadata.format).toBe('viewgraph-v2');
    expect(capture.metadata.version).toBe('2.2.0');
  });

  it('metadata includes stats with salience counts', () => {
    const elements = [
      el({ nid: 1, salience: 'high' }),
      el({ nid: 2, tag: 'div', salience: 'med', score: 30 }),
      el({ nid: 3, tag: 'span', salience: 'low', score: 5 }),
    ];
    const capture = serialize(elements, []);
    expect(capture.metadata.stats.salience).toEqual({ high: 1, med: 1, low: 1 });
    expect(capture.metadata.stats.totalNodes).toBe(3);
  });

  it('nodes are grouped by salience tier then tag', () => {
    const elements = [
      el({ nid: 1, tag: 'button', salience: 'high' }),
      el({ nid: 2, tag: 'a', salience: 'high' }),
      el({ nid: 3, tag: 'div', salience: 'low', score: 5 }),
    ];
    const capture = serialize(elements, []);
    expect(capture.nodes.high.button).toBeDefined();
    expect(capture.nodes.high.a).toBeDefined();
    expect(capture.nodes.low.div).toBeDefined();
  });

  it('details include locators with testid ranked first', () => {
    const capture = serialize([el()], []);
    const detail = capture.details.high.button[1];
    expect(detail.locators[0]).toMatchObject({ strategy: 'testId', value: 'submit', rank: 1 });
  });

  it('high-salience details include full styles', () => {
    const capture = serialize([el()], []);
    const detail = capture.details.high.button[1];
    expect(detail.styles).toBeDefined();
    expect(detail.styles.visual).toBeDefined();
  });

  it('low-salience details omit styles', () => {
    const lowEl = el({ nid: 1, tag: 'span', salience: 'low', score: 5 });
    const capture = serialize([lowEl], []);
    const detail = capture.details.low.span[1];
    expect(detail.styles).toBeUndefined();
  });

  it('relations section includes semantic relations', () => {
    const rels = [{ source: 1, target: 2, type: 'labelFor' }];
    const capture = serialize([el()], rels);
    expect(capture.relations.semantic).toHaveLength(1);
    expect(capture.relations.semantic[0].type).toBe('labelFor');
  });

  it('summary includes key interactive elements', () => {
    const capture = serialize([el()], []);
    expect(capture.summary.elements.length).toBeGreaterThan(0);
    expect(capture.summary.elements[0].alias).toBe('button:submit');
  });

  it('captureSizeBytes is populated after serialization', () => {
    const capture = serialize([el()], []);
    expect(capture.metadata.stats.captureSizeBytes).toBeGreaterThan(0);
  });
});
