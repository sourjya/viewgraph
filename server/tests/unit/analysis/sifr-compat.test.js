/**
 * SiFR Format Compatibility Tests
 *
 * Verifies that the parser and analysis modules handle real SiFR v2
 * captures from Element to LLM, where NODES and DETAILS use the nested
 * { tier: { tag: { nodeId: data } } } structure instead of arrays.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { parseMetadata, parseCapture, parseSummary } from '../../../src/parsers/viewgraph-v2.js';
import { flattenNodes, filterByRole, filterInteractive, getNodeDetails } from '../../../src/analysis/node-queries.js';

const FIXTURES = path.resolve(import.meta.dirname, '../../fixtures');
const sifrContent = readFileSync(path.join(FIXTURES, 'sifr-real-capture.json'), 'utf-8');

describe('SiFR v2 format compatibility', () => {
  describe('parser', () => {
    it('parseMetadata extracts metadata from real SiFR capture', () => {
      const result = parseMetadata(sifrContent);
      expect(result.ok).toBe(true);
      expect(result.data.format).toBe('sifr-v2');
      expect(result.data.url).toContain('localhost');
      expect(result.data.nodeCount).toBeGreaterThan(0);
    });

    it('parseCapture parses all sections', () => {
      const result = parseCapture(sifrContent);
      expect(result.ok).toBe(true);
      expect(result.data.metadata).toBeDefined();
      expect(result.data.nodes).toBeDefined();
      expect(result.data.details).toBeDefined();
    });

    it('parseSummary extracts summary', () => {
      const result = parseSummary(sifrContent);
      expect(result.ok).toBe(true);
      expect(result.data.url).toContain('localhost');
    });
  });

  describe('node-queries with nested SiFR structure', () => {
    const parsed = parseCapture(sifrContent).data;

    it('flattenNodes handles { tier: { tag: { nodeId: data } } } structure', () => {
      const nodes = flattenNodes(parsed);
      expect(nodes.length).toBeGreaterThan(0);
      // Each node should have id, tag, and salience
      nodes.forEach((n) => {
        expect(n.id).toBeDefined();
        expect(n.tag).toBeDefined();
        expect(n.salience).toMatch(/^(high|med|low)$/);
      });
    });

    it('filterByRole works on SiFR nodes', () => {
      const nodes = flattenNodes(parsed);
      const buttons = filterByRole(nodes, 'button');
      buttons.forEach((n) => expect(n.tag).toBe('button'));
    });

    it('getNodeDetails works with nested SiFR DETAILS', () => {
      const nodes = flattenNodes(parsed);
      // Find a node that should have details
      let foundDetails = false;
      for (const node of nodes) {
        const details = getNodeDetails(parsed, node.id);
        if (details) {
          expect(details.selector).toBeDefined();
          foundDetails = true;
          break;
        }
      }
      expect(foundDetails).toBe(true);
    });
  });
});
