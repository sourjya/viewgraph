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

import { PROJECT_NAME } from '#src/constants.js';
import { wrapComment } from '#src/utils/sanitize.js';
import { analyzePatterns } from '#src/analysis/steering-generator.js';
import { jsonResponse, textResponse, readAndParseMulti } from '#src/utils/tool-helpers.js';

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
      const filenames = indexer.list().map((e) => e.filename);
      const { results } = await readAndParseMulti(filenames, capturesDir);
      const annotations = [];
      for (const { parsed } of results) {
        if (!parsed.annotations?.length) continue;
        for (const ann of parsed.annotations) {
          annotations.push({
            comment: wrapComment(ann.comment), severity: ann.severity, category: ann.category,
            selector: ann.ancestor, resolution: ann.resolution,
          });
        }
      }

      if (annotations.length === 0) {
        return textResponse('No annotations found in any captures');
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
