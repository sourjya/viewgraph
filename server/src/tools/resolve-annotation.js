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

/** Allowed resolution actions. */
const ACTIONS = ['fixed', 'wontfix', 'duplicate', 'invalid'];

export function register(server, _indexer, capturesDir) {
  server.tool(
    'resolve_annotation',
    `Mark a ${PROJECT_NAME} annotation as resolved after fixing the issue. ` +
    'Use action "fixed" when code was changed, "wontfix" for intentional behavior, ' +
    '"duplicate" if already reported, "invalid" if not a real issue.',
    {
      filename: z.string().describe('Capture filename'),
      annotation_uuid: z.string().min(1).describe('UUID of the annotation to resolve'),
      action: z.enum(ACTIONS).describe('Resolution type'),
      summary: z.string().max(500).describe('Brief description of what was done'),
      files_changed: z.array(z.string().max(200)).max(10).optional()
        .describe('File paths that were modified to fix this issue'),
    },
    async ({ filename, annotation_uuid, action, summary, files_changed }) => {
      let filePath;
      try { filePath = validateCapturePath(filename, capturesDir); } catch {
        return { content: [{ type: 'text', text: `Error: Invalid filename - ${filename}` }], isError: true };
      }

      try {
        const raw = await readFile(filePath, 'utf-8');
        const capture = JSON.parse(raw);
        const annotations = capture.annotations || [];

        const ann = annotations.find((a) => a.uuid === annotation_uuid);
        if (!ann) {
          return { content: [{ type: 'text', text: `Error: Annotation not found: ${annotation_uuid}` }], isError: true };
        }

        // Set resolved state and resolution details
        ann.resolved = true;
        ann.resolution = {
          by: 'kiro',
          action,
          summary: summary.replace(/<[^>]*>/g, '').slice(0, 500),
          filesChanged: files_changed || [],
          at: new Date().toISOString(),
        };

        await writeFile(filePath, JSON.stringify(capture, null, 2) + '\n');

        return { content: [{ type: 'text', text: JSON.stringify(ann, null, 2) }] };
      } catch (err) {
        if (err.code === 'ENOENT') return { content: [{ type: 'text', text: `Error: Capture not found: ${filename}` }], isError: true };
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    },
  );
}
