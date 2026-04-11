/**
 * MCP Tool: validate_capture
 *
 * Checks a capture for quality issues: empty pages, missing enrichment,
 * oversized payloads. Helps agents decide whether to request a re-capture.
 *
 * @see extension/lib/capture-validator.js - client-side equivalent
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { validateCapturePath } from '#src/utils/validate-path.js';

/** Minimum node count for a useful capture. */
const MIN_NODES = 5;

/**
 * Register the validate_capture MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} _indexer
 * @param {string} capturesDir
 */
export function register(server, _indexer, capturesDir) {
  server.tool(
    'validate_capture',
    `Check a ${PROJECT_NAME} capture for quality issues: empty pages, missing data, oversized payloads. Returns warnings if the capture may not be useful.`,
    { filename: z.string().describe('Capture filename') },
    async ({ filename }) => {
      let filePath;
      try { filePath = validateCapturePath(filename, capturesDir); } catch {
        return { content: [{ type: 'text', text: `Error: Invalid filename - ${filename}` }], isError: true };
      }

      try {
        const raw = JSON.parse(await readFile(filePath, 'utf-8'));
        const warnings = [];
        const nodes = raw.nodes || [];
        const totalNodes = raw.metadata?.stats?.totalNodes ?? nodes.length;

        if (totalNodes === 0) warnings.push('Empty capture - 0 elements. Page may not be loaded.');
        else if (totalNodes < MIN_NODES) warnings.push(`Only ${totalNodes} elements. Page may still be loading.`);

        const enrichment = ['network', 'console', 'breakpoints', 'stacking', 'focus', 'landmarks'];
        const missing = enrichment.filter((k) => !raw[k]);
        if (missing.length > 0) warnings.push(`Missing enrichment: ${missing.join(', ')}`);

        if (raw.console?.errors?.length > 0) {
          warnings.push(`${raw.console.errors.length} console error(s) detected - may indicate page issues`);
        }

        const failedReqs = (raw.network?.requests || []).filter((r) => r.failed);
        if (failedReqs.length > 0) {
          warnings.push(`${failedReqs.length} failed network request(s) - may cause missing content`);
        }

        return { content: [{ type: 'text', text: JSON.stringify({
          ok: warnings.length === 0,
          totalNodes,
          warnings,
          enrichmentPresent: enrichment.filter((k) => raw[k]),
        }, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    },
  );
}
