/**
 * MCP Tool: get_component_coverage
 *
 * Cross-references data-testid coverage against the component tree from
 * the enrichment components collector. Reports which framework components
 * have interactive elements missing testids.
 *
 * @see docs/roadmap/feature-specs.md - F8
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { parseCapture } from '#src/parsers/viewgraph-v2.js';
import { flattenNodes, filterInteractive, getNodeDetails } from '#src/analysis/node-queries.js';

/**
 * Register the get_component_coverage MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} _indexer
 * @param {string} capturesDir
 */
export function register(server, _indexer, capturesDir) {
  server.tool(
    'get_component_coverage',
    `Report data-testid coverage per framework component in a ${PROJECT_NAME} capture. ` +
    'Shows which components have interactive elements missing testids.',
    {
      filename: z.string().describe('Capture filename'),
    },
    async ({ filename }) => {
      let filePath;
      try { filePath = validateCapturePath(filename, capturesDir); } catch {
        return { content: [{ type: 'text', text: `Error: Invalid filename - ${filename}` }], isError: true };
      }

      let parsed;
      try {
        const raw = await readFile(filePath, 'utf-8');
        parsed = parseCapture(raw);
        if (!parsed.ok) return { content: [{ type: 'text', text: 'Error: Failed to parse capture' }], isError: true };
      } catch (err) {
        if (err.code === 'ENOENT') return { content: [{ type: 'text', text: `Error: Capture not found: ${filename}` }], isError: true };
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }

      const allNodes = flattenNodes(parsed.data);
      const interactive = filterInteractive(allNodes);
      const components = parsed.data.enrichment?.components?.tree || [];

      // Build component -> node mapping from enrichment data
      // Components collector stores: { name, nodeIds, framework }
      const componentMap = new Map();
      for (const comp of components) {
        if (!comp.name) continue;
        componentMap.set(comp.name, {
          name: comp.name,
          framework: comp.framework || 'unknown',
          nodeIds: comp.nodeIds || [],
        });
      }

      // If no component data, fall back to grouping by node attributes
      if (componentMap.size === 0) {
        // Group interactive elements by their closest component-like ancestor
        // Use data-component, data-testid prefix, or tag as fallback grouping
        const groups = new Map();
        for (const node of interactive) {
          const details = getNodeDetails(parsed.data, node.id);
          const group = details?.attributes?.['data-component'] || node.tag || 'unknown';
          if (!groups.has(group)) groups.set(group, []);
          groups.get(group).push({ id: node.id, details });
        }

        const results = [];
        for (const [name, nodes] of groups) {
          const withTestid = nodes.filter((n) => n.details?.attributes?.['data-testid']);
          results.push({
            component: name,
            interactive: nodes.length,
            withTestid: withTestid.length,
            missingTestid: nodes.length - withTestid.length,
            coverage: nodes.length > 0 ? Math.round((withTestid.length / nodes.length) * 100) : 100,
            missingElements: nodes.filter((n) => !n.details?.attributes?.['data-testid']).map((n) => n.id),
          });
        }

        results.sort((a, b) => a.coverage - b.coverage);
        const summary = {
          framework: 'none detected',
          totalComponents: results.length,
          totalInteractive: interactive.length,
          totalWithTestid: results.reduce((s, r) => s + r.withTestid, 0),
          totalMissing: results.reduce((s, r) => s + r.missingTestid, 0),
          overallCoverage: interactive.length > 0
            ? Math.round((results.reduce((s, r) => s + r.withTestid, 0) / interactive.length) * 100)
            : 100,
          components: results,
        };
        return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
      }

      // With component data: cross-reference interactive nodes against components
      const interactiveIds = new Set(interactive.map((n) => n.id));
      const results = [];

      for (const [name, comp] of componentMap) {
        const compInteractive = comp.nodeIds.filter((id) => interactiveIds.has(id));
        const withTestid = compInteractive.filter((id) => {
          const details = getNodeDetails(parsed.data, id);
          return details?.attributes?.['data-testid'];
        });

        results.push({
          component: name,
          framework: comp.framework,
          interactive: compInteractive.length,
          withTestid: withTestid.length,
          missingTestid: compInteractive.length - withTestid.length,
          coverage: compInteractive.length > 0 ? Math.round((withTestid.length / compInteractive.length) * 100) : 100,
          missingElements: compInteractive.filter((id) => {
            const details = getNodeDetails(parsed.data, id);
            return !details?.attributes?.['data-testid'];
          }),
        });
      }

      results.sort((a, b) => a.coverage - b.coverage);
      const totalInteractive = results.reduce((s, r) => s + r.interactive, 0);
      const totalWithTestid = results.reduce((s, r) => s + r.withTestid, 0);

      const summary = {
        framework: components[0]?.framework || 'unknown',
        totalComponents: results.length,
        totalInteractive,
        totalWithTestid,
        totalMissing: totalInteractive - totalWithTestid,
        overallCoverage: totalInteractive > 0 ? Math.round((totalWithTestid / totalInteractive) * 100) : 100,
        components: results,
      };

      return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
    },
  );
}
