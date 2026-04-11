/**
 * MCP Tool: find_source
 *
 * Maps a DOM element to its source file by searching the project codebase
 * for matching identifiers (data-testid, aria-label, id, class, text).
 * Returns file paths, line numbers, and confidence levels.
 *
 * The project root is derived from the captures directory (two levels up
 * from .viewgraph/captures/). This works because viewgraph-init.js always
 * creates .viewgraph/ in the project root.
 *
 * @see src/analysis/source-linker.js - search implementation
 * @see docs/roadmap/roadmap.md - M15.1 bidirectional element linking
 */

import { z } from 'zod';
import path from 'path';
import { PROJECT_NAME } from '#src/constants.js';
import { findSource } from '#src/analysis/source-linker.js';

/**
 * Register the find_source MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} _indexer
 * @param {string} capturesDir
 */
export function register(server, _indexer, capturesDir) {
  // Project root is two levels up from .viewgraph/captures/
  const projectRoot = path.resolve(capturesDir, '..', '..');

  server.tool(
    'find_source',
    `Find the source file that renders a DOM element. Searches the project for ` +
    'data-testid, aria-label, id, class, or text matches. Returns file paths and line numbers. ' +
    'Use after identifying an element via other ' + PROJECT_NAME + ' tools.',
    {
      testid: z.string().optional().describe('data-testid attribute value'),
      aria_label: z.string().optional().describe('aria-label attribute value'),
      selector: z.string().optional().describe('CSS selector (e.g., "button#submit", "div.card-header")'),
      text: z.string().optional().describe('Visible text content of the element'),
      component: z.string().optional().describe('Framework component name (e.g., "ProductCard", "LoginForm")'),
    },
    async ({ testid, aria_label, selector, text, component }) => {
      if (!testid && !aria_label && !selector && !text && !component) {
        return { content: [{ type: 'text', text: 'Error: Provide at least one of: testid, aria_label, selector, text, component' }], isError: true };
      }

      const results = await findSource(projectRoot, {
        testid, ariaLabel: aria_label, selector, text, component,
      });

      if (results.length === 0) {
        return { content: [{ type: 'text', text: JSON.stringify({
          summary: 'No source files found matching the element',
          query: { testid, aria_label, selector, text },
          suggestion: 'Try adding a data-testid to the element for reliable source linking',
        }, null, 2) }] };
      }

      return { content: [{ type: 'text', text: JSON.stringify({
        summary: `${results.length} source location(s) found`,
        results,
      }, null, 2) }] };
    },
  );
}
