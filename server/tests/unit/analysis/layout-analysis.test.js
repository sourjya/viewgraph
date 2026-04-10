/**
 * Layout Analysis - Unit Tests
 *
 * Tests overlap/overflow detection logic used by the audit_layout MCP tool.
 * Covers: buildNodeMap, buildChildrenMap, detectOverflows, detectOverlaps,
 * detectViewportOverflows, and the top-level analyzeLayout function.
 *
 * @see server/src/analysis/layout-analysis.js
 * @see .kiro/specs/audit-layout/requirements.md
 */

import { describe, it, expect } from 'vitest';
import {
  buildNodeMap,
  buildChildrenMap,
  detectOverflows,
  detectOverlaps,
  detectViewportOverflows,
  analyzeLayout,
} from '#src/analysis/layout-analysis.js';

// ---------------------------------------------------------------------------
// Helpers: buildNodeMap, buildChildrenMap
// ---------------------------------------------------------------------------

describe('buildNodeMap', () => {
  it('creates a map from node id to node', () => {
    const nodes = [
      { id: 'a', tag: 'div', bbox: { x: 0, y: 0, w: 100, h: 100 } },
      { id: 'b', tag: 'p', bbox: { x: 10, y: 10, w: 50, h: 20 } },
    ];
    const map = buildNodeMap(nodes);
    expect(map.size).toBe(2);
    expect(map.get('a').tag).toBe('div');
    expect(map.get('b').bbox.w).toBe(50);
  });

  it('skips nodes without bbox', () => {
    const nodes = [
      { id: 'a', tag: 'div', bbox: { x: 0, y: 0, w: 100, h: 100 } },
      { id: 'b', tag: 'span' },
    ];
    const map = buildNodeMap(nodes);
    expect(map.size).toBe(1);
  });

  it('returns empty map for empty input', () => {
    expect(buildNodeMap([]).size).toBe(0);
  });
});

describe('buildChildrenMap', () => {
  it('groups children by parent', () => {
    const relations = {
      parentChild: [
        { parent: 'div1', child: 'p1' },
        { parent: 'div1', child: 'p2' },
        { parent: 'div2', child: 'span1' },
      ],
    };
    const map = buildChildrenMap(relations);
    expect(map.get('div1')).toEqual(['p1', 'p2']);
    expect(map.get('div2')).toEqual(['span1']);
  });

  it('returns empty map when no parentChild relations', () => {
    expect(buildChildrenMap({}).size).toBe(0);
    expect(buildChildrenMap({ parentChild: [] }).size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// detectOverflows
// ---------------------------------------------------------------------------

describe('detectOverflows', () => {
  it('detects child overflowing parent on the right', () => {
    const nodeMap = buildNodeMap([
      { id: 'parent', tag: 'div', bbox: { x: 0, y: 0, w: 100, h: 100 } },
      { id: 'child', tag: 'span', bbox: { x: 50, y: 0, w: 80, h: 20 } },
    ]);
    const childrenMap = new Map([['parent', ['child']]]);
    const results = detectOverflows(nodeMap, childrenMap);
    expect(results).toHaveLength(1);
    expect(results[0].childId).toBe('child');
    expect(results[0].parentId).toBe('parent');
    expect(results[0].overflow.right).toBe(30);
    expect(results[0].overflow.left).toBe(0);
  });

  it('detects child overflowing parent on multiple edges', () => {
    const nodeMap = buildNodeMap([
      { id: 'p', tag: 'div', bbox: { x: 50, y: 50, w: 100, h: 100 } },
      { id: 'c', tag: 'div', bbox: { x: 40, y: 40, w: 120, h: 120 } },
    ]);
    const childrenMap = new Map([['p', ['c']]]);
    const results = detectOverflows(nodeMap, childrenMap);
    expect(results).toHaveLength(1);
    expect(results[0].overflow.top).toBe(10);
    expect(results[0].overflow.left).toBe(10);
    expect(results[0].overflow.bottom).toBe(10);
    expect(results[0].overflow.right).toBe(10);
  });

  it('(-) no overflow when child fits inside parent', () => {
    const nodeMap = buildNodeMap([
      { id: 'p', tag: 'div', bbox: { x: 0, y: 0, w: 200, h: 200 } },
      { id: 'c', tag: 'p', bbox: { x: 10, y: 10, w: 50, h: 30 } },
    ]);
    const childrenMap = new Map([['p', ['c']]]);
    expect(detectOverflows(nodeMap, childrenMap)).toHaveLength(0);
  });

  it('(-) ignores overflow within tolerance (1px)', () => {
    const nodeMap = buildNodeMap([
      { id: 'p', tag: 'div', bbox: { x: 0, y: 0, w: 100, h: 100 } },
      { id: 'c', tag: 'span', bbox: { x: 0, y: 0, w: 101, h: 100 } },
    ]);
    const childrenMap = new Map([['p', ['c']]]);
    expect(detectOverflows(nodeMap, childrenMap)).toHaveLength(0);
  });

  it('(-) skips parent not in nodeMap', () => {
    const nodeMap = buildNodeMap([
      { id: 'c', tag: 'span', bbox: { x: 0, y: 0, w: 200, h: 200 } },
    ]);
    const childrenMap = new Map([['missing', ['c']]]);
    expect(detectOverflows(nodeMap, childrenMap)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// detectOverlaps
// ---------------------------------------------------------------------------

describe('detectOverlaps', () => {
  it('detects overlapping siblings', () => {
    const nodeMap = buildNodeMap([
      { id: 'p', tag: 'div', bbox: { x: 0, y: 0, w: 300, h: 100 } },
      { id: 'a', tag: 'button', text: 'Save', bbox: { x: 0, y: 0, w: 100, h: 40 } },
      { id: 'b', tag: 'button', text: 'Cancel', bbox: { x: 80, y: 0, w: 100, h: 40 } },
    ]);
    const childrenMap = new Map([['p', ['a', 'b']]]);
    const results = detectOverlaps(nodeMap, childrenMap);
    expect(results).toHaveLength(1);
    expect(results[0].elementA.id).toBe('a');
    expect(results[0].elementB.id).toBe('b');
    expect(results[0].overlapArea).toBe(20 * 40); // 20px wide, 40px tall
  });

  it('(-) no overlap when siblings are apart', () => {
    const nodeMap = buildNodeMap([
      { id: 'p', tag: 'div', bbox: { x: 0, y: 0, w: 300, h: 100 } },
      { id: 'a', tag: 'button', bbox: { x: 0, y: 0, w: 100, h: 40 } },
      { id: 'b', tag: 'button', bbox: { x: 110, y: 0, w: 100, h: 40 } },
    ]);
    const childrenMap = new Map([['p', ['a', 'b']]]);
    expect(detectOverlaps(nodeMap, childrenMap)).toHaveLength(0);
  });

  it('(-) ignores overlap within tolerance (2px)', () => {
    const nodeMap = buildNodeMap([
      { id: 'p', tag: 'div', bbox: { x: 0, y: 0, w: 300, h: 100 } },
      { id: 'a', tag: 'div', bbox: { x: 0, y: 0, w: 100, h: 40 } },
      { id: 'b', tag: 'div', bbox: { x: 99, y: 0, w: 100, h: 40 } },
    ]);
    const childrenMap = new Map([['p', ['a', 'b']]]);
    expect(detectOverlaps(nodeMap, childrenMap)).toHaveLength(0);
  });

  it('does not compare elements across different parents', () => {
    const nodeMap = buildNodeMap([
      { id: 'p1', tag: 'div', bbox: { x: 0, y: 0, w: 200, h: 100 } },
      { id: 'p2', tag: 'div', bbox: { x: 0, y: 0, w: 200, h: 100 } },
      { id: 'a', tag: 'span', bbox: { x: 0, y: 0, w: 100, h: 40 } },
      { id: 'b', tag: 'span', bbox: { x: 50, y: 0, w: 100, h: 40 } },
    ]);
    // a under p1, b under p2 - different parents, should not compare
    const childrenMap = new Map([['p1', ['a']], ['p2', ['b']]]);
    expect(detectOverlaps(nodeMap, childrenMap)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// detectViewportOverflows
// ---------------------------------------------------------------------------

describe('detectViewportOverflows', () => {
  it('detects element extending past right edge', () => {
    const nodeMap = buildNodeMap([
      { id: 'wide', tag: 'div', bbox: { x: 1400, y: 0, w: 200, h: 50 } },
    ]);
    const viewport = { width: 1440, height: 900 };
    const results = detectViewportOverflows(nodeMap, viewport);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('wide');
    expect(results[0].overflow.right).toBe(160);
  });

  it('detects element extending past bottom edge', () => {
    const nodeMap = buildNodeMap([
      { id: 'tall', tag: 'div', bbox: { x: 0, y: 850, w: 100, h: 100 } },
    ]);
    const viewport = { width: 1440, height: 900 };
    const results = detectViewportOverflows(nodeMap, viewport);
    expect(results).toHaveLength(1);
    expect(results[0].overflow.bottom).toBe(50);
  });

  it('(-) no overflow when element fits in viewport', () => {
    const nodeMap = buildNodeMap([
      { id: 'ok', tag: 'div', bbox: { x: 10, y: 10, w: 100, h: 100 } },
    ]);
    const viewport = { width: 1440, height: 900 };
    expect(detectViewportOverflows(nodeMap, viewport)).toHaveLength(0);
  });

  it('(-) ignores overflow within tolerance', () => {
    const nodeMap = buildNodeMap([
      { id: 'edge', tag: 'div', bbox: { x: 0, y: 0, w: 1441, h: 100 } },
    ]);
    const viewport = { width: 1440, height: 900 };
    expect(detectViewportOverflows(nodeMap, viewport)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// analyzeLayout (integration)
// ---------------------------------------------------------------------------

describe('analyzeLayout', () => {
  it('returns all issue types from a parsed capture', () => {
    const parsed = {
      metadata: { viewport: { width: 400, height: 300 } },
      nodes: {
        high: [
          { id: 'root', tag: 'div', bbox: { x: 0, y: 0, w: 400, h: 300 }, actions: [] },
        ],
        med: [
          { id: 'a', tag: 'div', bbox: { x: 0, y: 0, w: 200, h: 50 }, actions: [] },
          { id: 'b', tag: 'div', bbox: { x: 180, y: 0, w: 200, h: 50 }, actions: [] },
          { id: 'c', tag: 'div', bbox: { x: 350, y: 0, w: 100, h: 50 }, actions: [] },
        ],
        low: [],
      },
      relations: {
        parentChild: [
          { parent: 'root', child: 'a' },
          { parent: 'root', child: 'b' },
          { parent: 'root', child: 'c' },
        ],
      },
      details: {},
    };
    const result = analyzeLayout(parsed);
    // c overflows root (350+100=450 > 400)
    expect(result.overflows.length).toBeGreaterThanOrEqual(1);
    // a and b overlap (180 < 200)
    expect(result.overlaps.length).toBeGreaterThanOrEqual(1);
    // c extends past viewport (450 > 400)
    expect(result.viewportOverflows.length).toBeGreaterThanOrEqual(1);
    // summary counts match
    expect(result.summary.overflows).toBe(result.overflows.length);
    expect(result.summary.overlaps).toBe(result.overlaps.length);
    expect(result.summary.viewportOverflows).toBe(result.viewportOverflows.length);
  });

  it('returns empty arrays for a clean layout', () => {
    const parsed = {
      metadata: { viewport: { width: 1000, height: 800 } },
      nodes: {
        high: [{ id: 'root', tag: 'div', bbox: { x: 0, y: 0, w: 1000, h: 800 }, actions: [] }],
        med: [{ id: 'child', tag: 'p', bbox: { x: 10, y: 10, w: 100, h: 30 }, actions: [] }],
        low: [],
      },
      relations: { parentChild: [{ parent: 'root', child: 'child' }] },
      details: {},
    };
    const result = analyzeLayout(parsed);
    expect(result.overflows).toHaveLength(0);
    expect(result.overlaps).toHaveLength(0);
    expect(result.viewportOverflows).toHaveLength(0);
  });
});
