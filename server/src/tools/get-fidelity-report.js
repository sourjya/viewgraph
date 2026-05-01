/**
 * MCP Tool: get_fidelity_report
 *
 * Compares a ViewGraph JSON capture against its paired HTML snapshot
 * to measure capture fidelity. Returns coverage metrics and missing
 * elements.
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import path from 'path';
import { PROJECT_NAME } from '#src/constants.js';
import { parseSnapshot, compareFidelity } from '#src/analysis/fidelity.js';
import { jsonResponse, errorResponse, withCapture } from '#src/utils/tool-helpers.js';
import { filenameParam } from '#src/utils/shared-params.js';

/**
 * Register the get_fidelity_report MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {string} capturesDir - Absolute path to the captures directory
 * @see .kiro/specs/singlefile-fidelity/ - fidelity measurement spec
 */
export function register(server, _indexer, capturesDir) {
  server.tool(
    'get_fidelity_report',
    `Compare a ${PROJECT_NAME} capture against its HTML snapshot to measure fidelity. ` +
    'Returns element, testid, interactive, and text coverage metrics.',
    {
      filename: filenameParam,
    },
    async ({ filename }) => {
      return withCapture(filename, capturesDir, async (parsed) => {
        const stem = filename.replace(/\.json$/, '');
        const snapshotPath = path.join(capturesDir, '..', 'snapshots', `${stem}.html`);

        let snapshotHtml;
        try {
          snapshotHtml = await readFile(snapshotPath, 'utf-8');
        } catch {
          return errorResponse(`Error: No snapshot found for "${filename}". Expected: snapshots/${stem}.html`);
        }

        const snapshot = parseSnapshot(snapshotHtml);
        const report = compareFidelity(parsed, snapshot);
        report.captureFile = filename;
        report.snapshotFile = `${stem}.html`;

        return jsonResponse(report);
      });
    },
  );
}
