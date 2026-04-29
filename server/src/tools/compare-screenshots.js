/**
 * MCP Tool: compare_screenshots
 *
 * Compares two PNG screenshots pixel-by-pixel. Returns diff percentage,
 * changed pixel count, and whether the images are the same size.
 *
 * Accepts PNG files from the captures directory or base64-encoded PNG data.
 * Use after structural comparison (compare_captures) to catch sub-pixel
 * visual regressions that DOM diffing misses.
 *
 * @see src/analysis/screenshot-diff.js
 * @see docs/architecture/strategic-recommendations.md - R5
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import path from 'path';
import { PROJECT_NAME } from '#src/constants.js';
import { jsonResponse, errorResponse } from '#src/utils/tool-helpers.js';
import { diffScreenshots } from '#src/analysis/screenshot-diff.js';

/**
 * Register the compare_screenshots MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} _indexer
 * @param {string} capturesDir
 */
export function register(server, _indexer, capturesDir) {
  server.tool(
    'compare_screenshots',
    `Compare two PNG screenshots pixel-by-pixel. Returns diff percentage and changed pixel count. ` +
    `Catches sub-pixel visual regressions that structural DOM comparison misses. ` +
    `Provide filenames of PNG files in the ${PROJECT_NAME} captures directory.`,
    {
      file_a: z.string().describe('First PNG filename (before)'),
      file_b: z.string().describe('Second PNG filename (after)'),
      threshold: z.number().min(0).max(1).optional().describe('Sensitivity (0-1, default 0.1). Lower = more sensitive'),
      filePath: z.string().optional().describe('If provided, write diff image to this path and return the path'),
    },
    async ({ file_a, file_b, threshold, filePath: outputPath }) => {
      // S3-7: Validate outputPath is within the project directory
      if (outputPath) {
        const resolved = path.resolve(outputPath);
        const projectRoot = path.resolve(capturesDir, '..');
        if (!resolved.startsWith(projectRoot + path.sep) && resolved !== projectRoot) {
          return errorResponse('Error: filePath must be within the project directory');
        }
      }
      try {
        const dir = path.resolve(capturesDir, '..');
        const pathA = path.join(dir, path.basename(file_a));
        const pathB = path.join(dir, path.basename(file_b));

        const [bufA, bufB] = await Promise.all([readFile(pathA), readFile(pathB)]);
        const result = diffScreenshots(bufA, bufB, { threshold });

        // Write diff image to file if path provided
        if (outputPath && result.diffBuffer) {
          const { writeFileSync, mkdirSync } = await import('fs');
          mkdirSync(path.dirname(outputPath), { recursive: true });
          writeFileSync(outputPath, result.diffBuffer);
        }

        const response = {
          diffPercent: result.diffPercent,
          changedPixels: result.changedPixels,
          totalPixels: result.totalPixels,
          dimensions: { width: result.width, height: result.height },
          sizeMatch: result.sizeMatch,
          verdict: result.diffPercent === 0 ? 'identical'
            : result.diffPercent < 1 ? 'minor differences (< 1%)'
              : result.diffPercent < 5 ? 'noticeable changes (1-5%)'
                : 'significant changes (> 5%)',
        };
        if (outputPath) response.diffImagePath = outputPath;
        return jsonResponse(response);
      } catch (err) {
        return errorResponse(`Error: ${err.message}`);
      }
    },
  );
}
