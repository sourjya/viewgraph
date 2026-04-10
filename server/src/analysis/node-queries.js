/**
 * Node Queries - Shared Analysis Module
 *
 * Extracts, flattens, and queries nodes from parsed ViewGraph captures.
 * Used by multiple M2 analysis tools to avoid duplicating traversal logic.
 *
 * Operates on the output of parseCapture() - the normalized { metadata,
 * nodes, summary, relations, details } object.
 */

/** Maps user-facing role names to HTML tags that fulfill that role. */
const ROLE_MAP = {
  button: ['button'],
  link: ['a'],
  input: ['input', 'textarea', 'select'],
  heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  image: ['img', 'svg'],
  table: ['table'],
  nav: ['nav'],
  form: ['form'],
};

/**
 * Flatten high/med/low node tiers into a single array.
 * Each node gets a `salience` field indicating its original tier.
 *
 * Handles two formats:
 * - Array format (our fixtures): { high: [node, node], med: [...] }
 * - Nested SiFR format (real captures): { high: { tag: { nodeId: nodeData } } }
 */
export function flattenNodes(parsed) {
  const result = [];
  for (const tier of ['high', 'med', 'low']) {
    const tierData = parsed.nodes?.[tier];
    if (!tierData) continue;

    if (Array.isArray(tierData)) {
      // Array format: each element is a node object with id, tag, etc.
      for (const node of tierData) {
        result.push({ ...node, salience: tier });
      }
    } else if (typeof tierData === 'object') {
      // Nested SiFR format: { tag: { nodeId: { parent, cluster, ... } } }
      for (const [tag, nodes] of Object.entries(tierData)) {
        if (typeof nodes !== 'object' || nodes === null) continue;
        for (const [nodeId, nodeData] of Object.entries(nodes)) {
          result.push({ id: nodeId, tag, ...nodeData, salience: tier });
        }
      }
    }
  }
  return result;
}

/**
 * Filter nodes by a role name using the tag-based role mapping.
 * Also checks the `role` attribute in DETAILS for ARIA role overrides.
 */
export function filterByRole(nodes, role) {
  const tags = ROLE_MAP[role];
  if (!tags) return [];
  return nodes.filter((n) => tags.includes(n.tag));
}

/**
 * Filter to only interactive nodes (those with non-empty actions array).
 */
export function filterInteractive(nodes) {
  return nodes.filter((n) => n.actions && n.actions.length > 0);
}

/**
 * Check if an element's bbox is at least partially visible in the viewport.
 * Returns true if >50% of the element's area intersects the viewport.
 * @param {{ x: number, y: number, w: number, h: number }} bbox
 * @param {{ width: number, height: number }} viewport
 */
export function isInViewport(bbox, viewport) {
  if (!bbox || !viewport) return false;
  const ix = Math.max(0, Math.min(bbox.x + bbox.w, viewport.width) - Math.max(bbox.x, 0));
  const iy = Math.max(0, Math.min(bbox.y + bbox.h, viewport.height) - Math.max(bbox.y, 0));
  const visibleArea = ix * iy;
  const totalArea = bbox.w * bbox.h;
  return totalArea > 0 && visibleArea / totalArea > 0.5;
}

/**
 * Get the DETAILS entry for a specific node by id.
 *
 * Handles two formats:
 * - Flat format (our fixtures): details[nodeId] = { selector, attributes, ... }
 * - Nested SiFR format: details[tier][tag][nodeId] = { selector, attributes, ... }
 */
export function getNodeDetails(parsed, nodeId) {
  const details = parsed.details;
  if (!details) return null;

  // Flat format: direct lookup
  if (details[nodeId]) return details[nodeId];

  // Nested SiFR format: search through tiers and tags
  for (const tier of ['high', 'med', 'low']) {
    const tierData = details[tier];
    if (!tierData || typeof tierData !== 'object') continue;
    for (const tagEntries of Object.values(tierData)) {
      if (tagEntries?.[nodeId]) return tagEntries[nodeId];
    }
  }
  return null;
}
