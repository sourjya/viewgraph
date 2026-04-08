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

export function register(server, capturesDir) {
  server.tool(
    'get_fidelity_report',
    `Compare a ${PROJECT_NAME} capture against its HTML snapshot to measure fidelity. ` +
    'Returns element, testid, interactive, and text coverage metrics.',
    {
      filename: z.string().describe('Capture JSON filename (e.g., viewgraph-localhost-20260408-120612.json)'),
    },
    async ({ filename }) => {
      const stem = filename.replace(/\.json$/, '');
      const snapshotPath = path.join(capturesDir, 'snapshots', `${stem}.html`);
      const capturePath = path.join(capturesDir, filename);

      let captureJson, snapshotHtml;
      try {
        captureJson = JSON.parse(await readFile(capturePath, 'utf-8'));
      } catch {
        return { content: [{ type: 'text', text: `Error: Capture "${filename}" not found` }], isError: true };
      }
      try {
        snapshotHtml = await readFile(snapshotPath, 'utf-8');
      } catch {
        return { content: [{ type: 'text', text: `Error: No snapshot found for "${filename}". Expected: snapshots/${stem}.html` }], isError: true };
      }

      const snapshot = parseSnapshot(snapshotHtml);
      const report = compareFidelity(captureJson, snapshot);
      report.captureFile = filename;
      report.snapshotFile = `${stem}.html`;

      return { content: [{ type: 'text', text: JSON.stringify(report, null, 2) }] };
    },
  );
}
