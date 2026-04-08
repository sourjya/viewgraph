/**
 * Capture Diff - Comparison Logic
 *
 * Compares two parsed ViewGraph captures to detect structural and visual
 * changes. Matches elements across captures by selector (most stable),
 * falling back to node id.
 *
 * Used by the compare_captures MCP tool.
 */

import { flattenNodes, getNodeDetails } from './node-queries.js';

/**
 * Get the best matching key for a node - selector from details, or node id.
 */
function getMatchKey(node, parsed) {
  const details = getNodeDetails(parsed, node.id);
  return details?.selector || node.id;
}

/**
 * Check if two bounding boxes differ.
 */
function bboxDiffers(a, b) {
  if (!a || !b) return false;
  return a.x !== b.x || a.y !== b.y || a.w !== b.w || a.h !== b.h;
}

/**
 * Collect all data-testid values from a parsed capture's details.
 */
function collectTestIds(parsed) {
  const ids = new Set();
  if (!parsed.details) return ids;
  for (const detail of Object.values(parsed.details)) {
    const testid = detail.attributes?.['data-testid'];
    if (testid) ids.add(testid);
  }
  return ids;
}

/**
 * Compare two parsed captures and return a structured diff.
 * @param {object} a - parsed capture (from parseCapture)
 * @param {object} b - parsed capture (from parseCapture)
 * @returns {{ added: Node[], removed: Node[], moved: object[], testidChanges: { added: string[], removed: string[] } }}
 */
export function diffCaptures(a, b) {
  const nodesA = flattenNodes(a);
  const nodesB = flattenNodes(b);

  // Build lookup maps keyed by selector/id
  const mapA = new Map();
  for (const node of nodesA) mapA.set(getMatchKey(node, a), node);

  const mapB = new Map();
  for (const node of nodesB) mapB.set(getMatchKey(node, b), node);

  const added = [];
  const removed = [];
  const moved = [];

  // Elements in B not in A = added
  for (const [key, node] of mapB) {
    if (!mapA.has(key)) added.push(node);
  }

  // Elements in A not in B = removed
  for (const [key, node] of mapA) {
    if (!mapB.has(key)) removed.push(node);
  }

  // Elements in both - check for layout changes
  for (const [key, nodeA] of mapA) {
    const nodeB = mapB.get(key);
    if (nodeB && bboxDiffers(nodeA.bbox, nodeB.bbox)) {
      moved.push({ id: nodeA.id, before: nodeA.bbox, after: nodeB.bbox });
    }
  }

  // Testid changes
  const testidsA = collectTestIds(a);
  const testidsB = collectTestIds(b);
  const testidChanges = {
    added: [...testidsB].filter((id) => !testidsA.has(id)),
    removed: [...testidsA].filter((id) => !testidsB.has(id)),
  };

  return { added, removed, moved, testidChanges };
}
