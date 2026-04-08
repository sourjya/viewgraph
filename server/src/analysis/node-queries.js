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
 */
export function flattenNodes(parsed) {
  const result = [];
  for (const tier of ['high', 'med', 'low']) {
    const tierNodes = parsed.nodes?.[tier];
    if (!Array.isArray(tierNodes)) continue;
    for (const node of tierNodes) {
      result.push({ ...node, salience: tier });
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
 * Get the DETAILS entry for a specific node by id.
 * DETAILS is keyed by node id directly in the current fixture format.
 */
export function getNodeDetails(parsed, nodeId) {
  return parsed.details?.[nodeId] ?? null;
}
