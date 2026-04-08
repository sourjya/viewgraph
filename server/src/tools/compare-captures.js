/**
 * MCP Tool: compare_captures
 *
 * Diffs two captures to detect added/removed elements, layout shifts,
 * and testid changes. Core tool for visual regression workflows.
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { parseCapture } from '#src/parsers/viewgraph-v2.js';
import { diffCaptures } from '#src/analysis/capture-diff.js';

export function register(server, _indexer, capturesDir) {
  server.tool(
    'compare_captures',
    `Diff two ${PROJECT_NAME} captures to detect changes: added/removed elements, ` +
    'layout shifts, style changes, and testid changes. Use for visual regression.',
    {
      file_a: z.string().describe('First capture filename (before)'),
      file_b: z.string().describe('Second capture filename (after)'),
    },
    async ({ file_a, file_b }) => {
      let pathA, pathB;
      try { pathA = validateCapturePath(file_a, capturesDir); } catch {
        return { content: [{ type: 'text', text: `Error: Invalid filename - ${file_a}` }], isError: true };
      }
      try { pathB = validateCapturePath(file_b, capturesDir); } catch {
        return { content: [{ type: 'text', text: `Error: Invalid filename - ${file_b}` }], isError: true };
      }
      try {
        const [contentA, contentB] = await Promise.all([
          readFile(pathA, 'utf-8'), readFile(pathB, 'utf-8'),
        ]);
        const resultA = parseCapture(contentA);
        const resultB = parseCapture(contentB);
        if (!resultA.ok) return { content: [{ type: 'text', text: `Error parsing ${file_a}: ${resultA.error}` }], isError: true };
        if (!resultB.ok) return { content: [{ type: 'text', text: `Error parsing ${file_b}: ${resultB.error}` }], isError: true };

        const diff = diffCaptures(resultA.data, resultB.data);
        const summary = {
          added: diff.added.map((n) => ({ id: n.id, tag: n.tag, text: n.text })),
          removed: diff.removed.map((n) => ({ id: n.id, tag: n.tag, text: n.text })),
          moved: diff.moved,
          testidChanges: diff.testidChanges,
        };
        return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
      } catch (err) {
        if (err.code === 'ENOENT') return { content: [{ type: 'text', text: `Error: Capture not found. Use list_captures to see available files.` }], isError: true };
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    },
  );
}
