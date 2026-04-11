/**
 * MCP Tool: generate_spec
 *
 * Generates a Kiro spec (requirements.md + tasks.md) from annotations
 * across one or more captures. Groups by page and severity, creates
 * implementation tasks ordered by priority.
 *
 * @see src/analysis/spec-generator.js
 * @see docs/roadmap/roadmap.md - M10.7
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { generateSpec } from '#src/analysis/spec-generator.js';

/**
 * Register the generate_spec MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} indexer
 * @param {string} capturesDir
 */
export function register(server, indexer, capturesDir) {
  server.tool(
    'generate_spec',
    `Generate a Kiro spec (requirements + tasks) from ${PROJECT_NAME} annotations. ` +
    'Converts UI review feedback into structured implementation tasks.',
    {
      filenames: z.array(z.string()).min(1).max(20).optional().describe('Capture filenames (omit to use all annotated captures)'),
      spec_name: z.string().optional().describe('Spec name (default: "ui-fixes")'),
    },
    async ({ filenames, spec_name }) => {
      const sources = filenames || indexer.list().map((e) => e.filename);
      const annotations = [];

      for (const filename of sources) {
        try {
          const filePath = validateCapturePath(filename, capturesDir);
          const raw = JSON.parse(await readFile(filePath, 'utf-8'));
          if (!raw.annotations?.length) continue;
          for (const ann of raw.annotations) {
            annotations.push({
              comment: ann.comment, severity: ann.severity, category: ann.category,
              selector: ann.ancestor, page: raw.metadata?.url, resolved: ann.resolved,
            });
          }
        } catch { continue; }
      }

      if (annotations.length === 0) {
        return { content: [{ type: 'text', text: 'No annotations found in the specified captures' }] };
      }

      const spec = generateSpec(annotations, { specName: spec_name });
      return { content: [{ type: 'text', text: JSON.stringify({
        annotationsProcessed: annotations.length,
        requirements: spec.requirements,
        tasks: spec.tasks,
      }, null, 2) }] };
    },
  );
}
