/**
 * MCP Tool: analyze_patterns
 *
 * Analyzes resolved annotations to detect recurring patterns and generate
 * project-specific recommendations. Helps teams understand what types of
 * issues keep appearing and how to prevent them.
 *
 * @see src/analysis/steering-generator.js
 * @see docs/roadmap/roadmap.md - M10.6
 */

import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { wrapComment } from '#src/utils/sanitize.js';
import { analyzePatterns } from '#src/analysis/steering-generator.js';
import { jsonResponse } from '#src/utils/tool-helpers.js';

/**
 * Register the analyze_patterns MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} indexer
 * @param {string} capturesDir
 */
export function register(server, indexer, capturesDir) {
  server.tool(
    'analyze_patterns',
    `Analyze resolved ${PROJECT_NAME} annotations to detect recurring issue patterns. ` +
    'Generates project-specific recommendations for preventing common issues.',
    {},
    async () => {
      const annotations = [];
      for (const entry of indexer.list()) {
        try {
          const filePath = validateCapturePath(entry.filename, capturesDir);
          const raw = JSON.parse(await readFile(filePath, 'utf-8'));
          if (!raw.annotations?.length) continue;
          for (const ann of raw.annotations) {
            annotations.push({
              comment: wrapComment(ann.comment), severity: ann.severity, category: ann.category,
              selector: ann.ancestor, resolution: ann.resolution,
            });
          }
        } catch { continue; }
      }

      if (annotations.length === 0) {
        return { content: [{ type: 'text', text: 'No annotations found in any captures' }] };
      }

      const result = analyzePatterns(annotations);
      return jsonResponse({
        totalAnnotations: annotations.length,
        resolvedAnnotations: annotations.filter((a) => a.resolution).length,
        ...result,
      });
    },
  );
}
