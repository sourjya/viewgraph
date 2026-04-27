/**
 * MCP Tool: resolve_annotation
 *
 * Marks an annotation as resolved in a capture file. Updates the capture JSON
 * on disk with resolution details. The capture file is the single source of
 * truth for annotation state (see ADR-007).
 *
 * @see .kiro/specs/unified-review-panel/design.md - Resolution Object format
 * @see docs/decisions/ADR-007-jsonl-history-store.md - single source of truth
 */

import { z } from 'zod';
import { readFile, writeFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { jsonResponse, errorResponse } from '#src/utils/tool-helpers.js';

/** Allowed resolution actions. */
const ACTIONS = ['fixed', 'wontfix', 'duplicate', 'invalid'];

/**
 * Register the resolve_annotation MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} _indexer
 * @param {string} capturesDir
 * @param {{ onResolve?: function }} options - Optional callback when annotation is resolved
 * @see docs/decisions/ADR-007-jsonl-history-store.md
 */
export function register(server, _indexer, capturesDir, options = {}) {
  server.tool(
    'resolve_annotation',
    `Mark a ${PROJECT_NAME} annotation as resolved after fixing the issue. ` +
    'Actions: "fixed" (code changed), "wontfix" (intentional), "duplicate", "invalid". ' +
    'WHEN TO USE: After fixing each issue from get_annotations. Include files_changed and a summary. ' +
    'NEXT: Use request_capture to ask user to verify the fix.',
    {
      filename: z.string().describe('Capture filename'),
      annotation_uuid: z.string().min(1).describe('UUID of the annotation to resolve'),
      action: z.enum(ACTIONS).describe('Resolution type'),
      summary: z.string().max(500).describe('Brief description of what was done'),
      files_changed: z.array(z.string().max(200)).max(10).optional()
        .describe('File paths that were modified to fix this issue'),
      includeCapture: z.boolean().optional()
        .describe('If true, triggers a fresh capture request after resolution and returns the request ID'),
    },
    async ({ filename, annotation_uuid, action, summary, files_changed, includeCapture }) => {
      let filePath;
      try { filePath = validateCapturePath(filename, capturesDir); } catch {
        return errorResponse(`Error: Invalid filename - ${filename}`);
      }

      try {
        const raw = await readFile(filePath, 'utf-8');
        const capture = JSON.parse(raw);
        const annotations = capture.annotations || [];

        const ann = annotations.find((a) => a.uuid === annotation_uuid);
        if (!ann) {
          return errorResponse(`Error: Annotation not found: ${annotation_uuid}`);
        }

        // Set resolved state and resolution details
        ann.resolved = true;
        ann.resolution = {
          by: 'kiro',
          action,
          summary: (() => { let s = summary; while (/<[^>]*?>/g.test(s)) s = s.replace(/<[^>]*?>/g, ''); return s.slice(0, 500); })(),
          filesChanged: files_changed || [],
          at: new Date().toISOString(),
        };

        await writeFile(filePath, JSON.stringify(capture, null, 2) + '\n');

        // Notify WebSocket clients of resolution
        if (options.onResolve) options.onResolve({ uuid: annotation_uuid, resolution: ann.resolution });

        const response = { ...ann };

        // Trigger a fresh capture request if includeCapture is set
        if (includeCapture && options.requestQueue) {
          const url = capture.metadata?.url || '';
          const reqId = options.requestQueue.add({
            url,
            purpose: 'verify',
            guidance: `Verify fix: ${summary}`,
          });
          response.captureRequestId = reqId;
        }

        return jsonResponse(response);
      } catch (err) {
        if (err.code === 'ENOENT') return errorResponse(`Error: Capture not found: ${filename}`);
        return errorResponse(`Error: ${err.message}`);
      }
    },
  );
}
