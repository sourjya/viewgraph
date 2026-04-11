/**
 * MCP Tool: compare_baseline
 *
 * Compares the latest capture (or a specific file) against the stored
 * baseline for that URL. Returns structural diff: added/removed elements,
 * layout shifts, testid changes, interactive element count delta.
 *
 * @see #src/baselines.js - baseline storage
 * @see #src/analysis/capture-diff.js - structural diff engine
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { parseCapture } from '#src/parsers/viewgraph-v2.js';
import { diffCaptures } from '#src/analysis/capture-diff.js';
import { getBaseline } from '#src/baselines.js';
import { flattenNodes } from '#src/analysis/node-queries.js';

/**
 * Register the compare_baseline MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} indexer
 * @param {string} capturesDir
 * @see #src/baselines.js
 */
export function register(server, indexer, capturesDir) {
  server.tool(
    'compare_baseline',
    `Compare a ${PROJECT_NAME} capture against its stored baseline to detect structural regressions: ` +
    'missing elements, added elements, layout shifts, testid changes.',
    {
      filename: z.string().optional().describe('Capture filename. If omitted, uses latest capture.'),
      url: z.string().optional().describe('Page URL. Used to find baseline when filename omitted.'),
    },
    async ({ filename, url }) => {
      try {
        // Resolve the capture to compare
        let capturePath, captureContent;
        if (filename) {
          capturePath = validateCapturePath(filename, capturesDir);
          captureContent = await readFile(capturePath, 'utf-8');
        } else {
          const latest = indexer.getLatest(url);
          if (!latest) return { content: [{ type: 'text', text: 'No captures found.' }], isError: true };
          capturePath = validateCapturePath(latest.filename, capturesDir);
          captureContent = await readFile(capturePath, 'utf-8');
        }

        const captureResult = parseCapture(captureContent);
        if (!captureResult.ok) return { content: [{ type: 'text', text: `Error parsing capture: ${captureResult.error}` }], isError: true };

        const captureUrl = url || captureResult.data.METADATA?.url;
        if (!captureUrl) return { content: [{ type: 'text', text: 'Cannot determine URL from capture.' }], isError: true };

        // Load baseline
        const baseline = await getBaseline(capturesDir, captureUrl);
        if (!baseline) {
          return { content: [{ type: 'text', text: JSON.stringify({ hasBaseline: false, url: captureUrl }, null, 2) }] };
        }

        // Diff
        const diff = diffCaptures(baseline, captureResult.data);
        const baselineInteractive = flattenNodes(baseline).filter((n) => n.interactive).length;
        const currentInteractive = flattenNodes(captureResult.data).filter((n) => n.interactive).length;

        const result = {
          hasBaseline: true,
          url: captureUrl,
          diff: {
            added: diff.added.map((n) => ({ id: n.id, tag: n.tag, text: n.text, selector: n.selector })),
            removed: diff.removed.map((n) => ({ id: n.id, tag: n.tag, text: n.text, selector: n.selector })),
            moved: diff.moved,
            testidChanges: diff.testidChanges,
            interactiveCount: { baseline: baselineInteractive, current: currentInteractive, delta: currentInteractive - baselineInteractive },
          },
          summary: buildSummary(diff, baselineInteractive, currentInteractive),
        };
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        if (err.code === 'ENOENT') return { content: [{ type: 'text', text: 'Capture file not found.' }], isError: true };
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    },
  );
}

/** Build a human-readable summary string from the diff. */
function buildSummary(diff, baselineInteractive, currentInteractive) {
  const parts = [];
  if (diff.added.length) parts.push(`+${diff.added.length} elements added`);
  if (diff.removed.length) parts.push(`-${diff.removed.length} elements removed`);
  if (diff.moved.length) parts.push(`~${diff.moved.length} layout shifts`);
  if (diff.testidChanges.length) parts.push(`${diff.testidChanges.length} testid changes`);
  const delta = currentInteractive - baselineInteractive;
  if (delta !== 0) parts.push(`Interactive: ${baselineInteractive} -> ${currentInteractive} (${delta > 0 ? '+' : ''}${delta})`);
  return parts.length ? parts.join(', ') : 'No structural changes detected';
}
