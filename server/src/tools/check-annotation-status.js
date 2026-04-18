/**
 * MCP Tool: check_annotation_status
 *
 * Compares annotations from an older capture against a newer capture to
 * detect which issues are still present and which may have been resolved.
 * Matches annotated elements by selector/testid in the new capture and
 * checks if they still exist and have the same properties.
 *
 * This enables the agent to automatically detect stale annotations after
 * code changes without requiring the user to manually verify each one.
 *
 * @see docs/roadmap/roadmap.md - M10.2
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { jsonResponse, errorResponse } from '#src/utils/tool-helpers.js';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { wrapComment } from '#src/utils/sanitize.js';
import { parseCapture } from '#src/parsers/viewgraph-v2.js';
import { flattenNodes } from '#src/analysis/node-queries.js';

/**
 * Register the check_annotation_status MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} indexer
 * @param {string} capturesDir
 */
export function register(server, indexer, capturesDir) {
  server.tool(
    'check_annotation_status',
    `Check if annotations from an older ${PROJECT_NAME} capture are still relevant ` +
    'by comparing against a newer capture. Detects resolved, changed, and still-present issues.',
    {
      annotated_capture: z.string().describe('Filename of the capture with annotations'),
      latest_capture: z.string().describe('Filename of the newer capture to check against'),
    },
    async ({ annotated_capture, latest_capture }) => {
      let annotatedPath, latestPath;
      try { annotatedPath = validateCapturePath(annotated_capture, capturesDir); } catch (e) {
        return errorResponse(`Error: ${e.message}`);
      }
      try { latestPath = validateCapturePath(latest_capture, capturesDir); } catch (e) {
        return errorResponse(`Error: ${e.message}`);
      }

      let annotatedData, latestData;
      try {
        const rawA = await readFile(annotatedPath, 'utf-8');
        const rawL = await readFile(latestPath, 'utf-8');
        const parsedA = JSON.parse(rawA);
        const parsedL = parseCapture(rawL);
        if (!parsedL.ok) return errorResponse('Error: Could not parse latest capture');
        annotatedData = parsedA;
        latestData = parsedL.data;
      } catch (e) {
        return errorResponse(`Error reading captures: ${e.message}`);
      }

      const annotations = annotatedData.annotations || [];
      if (annotations.length === 0) {
        return { content: [{ type: 'text', text: 'No annotations found in the annotated capture' }] };
      }

      const latestNodes = flattenNodes(latestData);
      const latestSelectors = new Set(latestNodes.map((n) => n.selector).filter(Boolean));
      const latestTestids = new Set(latestNodes.map((n) => n.testid || n.attributes?.['data-testid']).filter(Boolean));

      const results = annotations.map((ann) => {
        if (ann.resolved) return { id: ann.id, uuid: ann.uuid, status: 'already-resolved', comment: wrapComment(ann.comment?.slice(0, 80)) };

        // Check if the annotated element still exists in the new capture
        const ancestor = ann.ancestor || '';
        const stillExists = ancestor && latestSelectors.has(ancestor);
        const testidMatch = ann.element?.testid && latestTestids.has(ann.element.testid);

        if (!stillExists && !testidMatch) {
          return { id: ann.id, uuid: ann.uuid, status: 'element-missing', comment: wrapComment(ann.comment?.slice(0, 80)), hint: 'Element no longer in DOM - may be resolved or page structure changed' };
        }

        return { id: ann.id, uuid: ann.uuid, status: 'still-present', comment: wrapComment(ann.comment?.slice(0, 80)), selector: ancestor };
      });

      const counts = { stillPresent: 0, elementMissing: 0, alreadyResolved: 0 };
      for (const r of results) {
        if (r.status === 'still-present') counts.stillPresent++;
        else if (r.status === 'element-missing') counts.elementMissing++;
        else if (r.status === 'already-resolved') counts.alreadyResolved++;
      }

      return jsonResponse({
        summary: `${counts.stillPresent} still present, ${counts.elementMissing} element(s) missing, ${counts.alreadyResolved} already resolved`,
        counts,
        annotations: results,
      });
    },
  );
}
