/**
 * Layout Analysis Module
 *
 * Detects overlap and overflow issues from ViewGraph capture data.
 * Uses bounding boxes, parent-child relations, and viewport dimensions
 * to identify layout problems an AI agent can act on.
 *
 * Pure functions - no file I/O. Operates on parsed capture output.
 *
 * @see .kiro/specs/audit-layout/design.md - algorithms and data structures
 * @see server/src/tools/audit-layout.js - MCP tool that calls analyzeLayout
 */

import { flattenNodes, getNodeDetails } from '#src/analysis/node-queries.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a lookup map from node id to node object.
 * Only includes nodes that have a bbox (needed for spatial analysis).
 */
export function buildNodeMap(nodes) {
  const map = new Map();
  for (const n of nodes) {
    if (n.bbox) map.set(n.id, n);
  }
  return map;
}

/**
 * Build a parent -> children[] map from the relations.parentChild array.
 * @param {object} relations - parsed.relations with parentChild array
 */
export function buildChildrenMap(relations) {
  const map = new Map();
  for (const { parent, child } of relations?.parentChild || []) {
    if (!map.has(parent)) map.set(parent, []);
    map.get(parent).push(child);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Overflow detection (FR-1)
// ---------------------------------------------------------------------------

/**
 * Compute how much a child bbox extends beyond its parent bbox per edge.
 * Returns { top, right, bottom, left } in px (0 if no overflow).
 */
function computeOverflow(parent, child) {
  return {
    top: Math.max(0, parent.y - child.y),
    left: Math.max(0, parent.x - child.x),
    bottom: Math.max(0, (child.y + child.h) - (parent.y + parent.h)),
    right: Math.max(0, (child.x + child.w) - (parent.x + parent.w)),
  };
}

/**
 * Detect children whose bbox extends beyond their parent's bbox.
 * @param {Map} nodeMap - id -> node with bbox
 * @param {Map} childrenMap - parentId -> [childId, ...]
 * @param {number} tolerance - ignore overflow <= this many px (default 1)
 */
export function detectOverflows(nodeMap, childrenMap, tolerance = 1) {
  const results = [];
  for (const [parentId, childIds] of childrenMap) {
    const parent = nodeMap.get(parentId);
    if (!parent) continue;
    for (const childId of childIds) {
      const child = nodeMap.get(childId);
      if (!child) continue;
      const ov = computeOverflow(parent.bbox, child.bbox);
      if (ov.top > tolerance || ov.right > tolerance || ov.bottom > tolerance || ov.left > tolerance) {
        results.push({
          childId, childTag: child.tag, childText: child.text || '',
          childSelector: child.selector || '',
          parentId, parentTag: parent.tag,
          overflow: ov,
        });
      }
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Overlap detection (FR-2)
// ---------------------------------------------------------------------------

/**
 * Compute the intersection rectangle of two bboxes.
 * Returns { x, y, w, h } where w/h <= 0 means no intersection.
 */
function intersectionRect(a, b) {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x;
  const h = Math.min(a.y + a.h, b.y + b.h) - y;
  return { x, y, w, h };
}

/**
 * Detect sibling elements whose bounding boxes overlap.
 * Only compares children of the same parent (not all element pairs).
 * @param {Map} nodeMap - id -> node with bbox
 * @param {Map} childrenMap - parentId -> [childId, ...]
 * @param {number} tolerance - ignore overlap <= this many px per axis (default 2)
 */
export function detectOverlaps(nodeMap, childrenMap, tolerance = 2) {
  const results = [];
  for (const [parentId, childIds] of childrenMap) {
    // Resolve children that exist in nodeMap
    const siblings = childIds.map((id) => nodeMap.get(id)).filter(Boolean);
    for (let i = 0; i < siblings.length; i++) {
      for (let j = i + 1; j < siblings.length; j++) {
        const rect = intersectionRect(siblings[i].bbox, siblings[j].bbox);
        if (rect.w > tolerance && rect.h > tolerance) {
          results.push({
            elementA: { id: siblings[i].id, tag: siblings[i].tag, text: siblings[i].text || '', selector: siblings[i].selector || '' },
            elementB: { id: siblings[j].id, tag: siblings[j].tag, text: siblings[j].text || '', selector: siblings[j].selector || '' },
            parentId,
            overlapRect: rect,
            overlapArea: rect.w * rect.h,
          });
        }
      }
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Viewport overflow detection (FR-3)
// ---------------------------------------------------------------------------

/**
 * Detect elements whose bbox extends beyond the viewport bounds.
 * @param {Map} nodeMap - id -> node with bbox
 * @param {{ width: number, height: number }} viewport
 * @param {number} tolerance - ignore overflow <= this many px (default 1)
 */
export function detectViewportOverflows(nodeMap, viewport, tolerance = 1) {
  const results = [];
  const vp = { x: 0, y: 0, w: viewport.width, h: viewport.height };
  for (const [, node] of nodeMap) {
    const ov = computeOverflow(vp, node.bbox);
    if (ov.top > tolerance || ov.right > tolerance || ov.bottom > tolerance || ov.left > tolerance) {
      results.push({
        id: node.id, tag: node.tag, text: node.text || '',
        selector: node.selector || '',
        overflow: ov,
      });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Run all layout analyses on a parsed capture.
 * @param {object} parsed - output of parseCapture()
 * @returns {{ overflows, overlaps, viewportOverflows, summary }}
 */
export function analyzeLayout(parsed) {
  const flatNodes = flattenNodes(parsed);
  const nodeMap = buildNodeMap(flatNodes);
  const childrenMap = buildChildrenMap(parsed.relations);
  const viewport = parsed.metadata?.viewport;

  const overflows = detectOverflows(nodeMap, childrenMap);
  const overlaps = detectOverlaps(nodeMap, childrenMap);
  const viewportOverflows = viewport
    ? detectViewportOverflows(nodeMap, viewport)
    : [];

  return {
    overflows,
    overlaps,
    viewportOverflows,
    summary: {
      overflows: overflows.length,
      overlaps: overlaps.length,
      viewportOverflows: viewportOverflows.length,
    },
  };
}
