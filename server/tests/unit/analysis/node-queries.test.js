/**
 * Node Queries - Unit Tests
 *
 * Tests the shared analysis module that flattens, filters, and queries
 * nodes from parsed ViewGraph captures.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { flattenNodes, filterByRole, filterInteractive, getNodeDetails } from '../../../src/analysis/node-queries.js';
import { parseCapture } from '../../../src/parsers/viewgraph-v2.js';

const FIXTURES = path.resolve(import.meta.dirname, '../../fixtures');
const validCapture = parseCapture(readFileSync(path.join(FIXTURES, 'valid-capture.json'), 'utf-8'));
const parsed = validCapture.data;

describe('flattenNodes', () => {
  it('flattens high/med/low tiers into a single array', () => {
    const nodes = flattenNodes(parsed);
    // valid-capture has 2 high + 7 med + 3 low = 12
    expect(nodes).toHaveLength(12);
  });

  it('preserves node properties', () => {
    const nodes = flattenNodes(parsed);
    const btn = nodes.find((n) => n.id === 'btn001');
    expect(btn).toBeDefined();
    expect(btn.tag).toBe('button');
    expect(btn.text).toBe('Create Project');
  });

  it('tags each node with its salience tier', () => {
    const nodes = flattenNodes(parsed);
    const btn = nodes.find((n) => n.id === 'btn001');
    expect(btn.salience).toBe('high');
    const low = nodes.find((n) => n.id === 'div002');
    expect(low.salience).toBe('low');
  });
});

describe('filterByRole', () => {
  const nodes = flattenNodes(parsed);

  it('filters buttons', () => {
    const buttons = filterByRole(nodes, 'button');
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((n) => expect(n.tag).toBe('button'));
  });

  it('filters links', () => {
    const links = filterByRole(nodes, 'link');
    expect(links.length).toBeGreaterThan(0);
    links.forEach((n) => expect(n.tag).toBe('a'));
  });

  it('filters inputs', () => {
    const inputs = filterByRole(nodes, 'input');
    expect(inputs.length).toBeGreaterThan(0);
    inputs.forEach((n) => expect(['input', 'textarea', 'select']).toContain(n.tag));
  });

  it('filters headings', () => {
    const headings = filterByRole(nodes, 'heading');
    expect(headings.length).toBeGreaterThan(0);
    headings.forEach((n) => expect(n.tag).toMatch(/^h[1-6]$/));
  });

  it('returns empty array for role with no matches', () => {
    const forms = filterByRole(nodes, 'form');
    expect(forms).toEqual([]);
  });
});

describe('filterInteractive', () => {
  it('returns only nodes with actions', () => {
    const nodes = flattenNodes(parsed);
    const interactive = filterInteractive(nodes);
    expect(interactive.length).toBeGreaterThan(0);
    interactive.forEach((n) => expect(n.actions.length).toBeGreaterThan(0));
  });
});

describe('getNodeDetails', () => {
  it('retrieves DETAILS for a node by id', () => {
    const details = getNodeDetails(parsed, 'btn001');
    expect(details).toBeDefined();
    expect(details.selector).toContain('create-project');
    expect(details.attributes['data-testid']).toBe('create-project');
  });

  it('returns null for node without details', () => {
    const details = getNodeDetails(parsed, 'div002');
    expect(details).toBeNull();
  });
});
