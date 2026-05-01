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
import { PROJECT_NAME } from '#src/constants.js';
import { wrapComment } from '#src/utils/sanitize.js';
import { generateSpec } from '#src/analysis/spec-generator.js';
import { jsonResponse, textResponse, readAndParseMulti } from '#src/utils/tool-helpers.js';

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
      const results = await readAndParseMulti(sources, capturesDir);
      const annotations = [];
      for (const { parsed } of results) {
        if (!parsed.annotations?.length) continue;
        for (const ann of parsed.annotations) {
          annotations.push({
            comment: wrapComment(ann.comment), severity: ann.severity, category: ann.category,
            selector: ann.ancestor, page: parsed.metadata?.url, resolved: ann.resolved,
          });
        }
      }

      if (annotations.length === 0) {
        return textResponse('No annotations found in the specified captures');
      }

      const spec = generateSpec(annotations, { specName: spec_name });
      return jsonResponse({
        annotationsProcessed: annotations.length,
        requirements: spec.requirements,
        tasks: spec.tasks,
      });
    },
  );
}
