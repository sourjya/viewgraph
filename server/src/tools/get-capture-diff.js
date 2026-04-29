/**
 * MCP Tool: get_capture_diff
 *
 * Returns an RFC 6902 JSON Patch between two sequential captures of the
 * same URL. For hot-reload workflows, this is 50-1500x smaller than
 * sending the full capture again.
 *
 * Falls back to full capture if no previous capture exists or if the
 * patch is larger than 50% of the full capture (structural rewrite).
 *
 * @see docs/ideas/json-patch-incremental-diffs.md
 */

import { z } from 'zod';
import jsonpatch from 'fast-json-patch';
const { compare } = jsonpatch;
import { PROJECT_NAME } from '#src/constants.js';
import { readAndParse, errorResponse, jsonResponse } from '#src/utils/tool-helpers.js';

/**
 * Register the get_capture_diff MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {object} indexer
 * @param {string} capturesDir
 */
export function register(server, indexer, capturesDir) {
  server.tool(
    'get_capture_diff',
    `Compare a ${PROJECT_NAME} capture against the previous capture of the same URL. ` +
    `Returns an RFC 6902 JSON Patch with only what changed. ` +
    `50-1500x smaller than full captures for hot-reload workflows.`,
    {
      filename: z.string().optional().describe('Capture to diff. If omitted, uses latest.'),
      url: z.string().optional().describe('URL filter to find latest capture.'),
    },
    async ({ filename, url }) => {
      // Resolve target capture
      let targetFile = filename;
      if (!targetFile) {
        const latest = indexer.getLatest(url);
        if (!latest) return errorResponse('No captures found.');
        targetFile = latest.filename;
      }

      const target = await readAndParse(targetFile, capturesDir);
      if (!target.parsed) return errorResponse(`Cannot read: ${targetFile}`);

      const targetUrl = target.parsed.metadata?.url;

      // Find previous capture of the same URL
      const all = indexer.list({ limit: 50, urlFilter: targetUrl });
      const sorted = all
        .filter((c) => c.filename !== targetFile && c.url === targetUrl)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      if (!sorted.length) {
        return jsonResponse({
          mode: 'full',
          reason: 'No previous capture for this URL',
          capture: targetFile,
          url: targetUrl,
        });
      }

      const prevFile = sorted[0].filename;
      const prev = await readAndParse(prevFile, capturesDir);
      if (!prev.parsed) {
        return jsonResponse({
          mode: 'full',
          reason: `Previous capture unreadable: ${prevFile}`,
          capture: targetFile,
          url: targetUrl,
        });
      }

      // S5-1: Guard against O(n²) diff on very large captures
      const prevSize = JSON.stringify(prev.parsed).length;
      const targetSize = JSON.stringify(target.parsed).length;
      if (prevSize + targetSize > 2_000_000) {
        return jsonResponse({
          mode: 'full',
          reason: `Captures too large for diff (${Math.round((prevSize + targetSize) / 1024)}KB combined)`,
          capture: targetFile,
          previousCapture: prevFile,
          url: targetUrl,
        });
      }

      // Compute JSON Patch (RFC 6902)
      const patch = compare(prev.parsed, target.parsed);

      // Filter out noisy metadata changes (timestamp, stats)
      const meaningfulPatch = patch.filter((op) =>
        !op.path.startsWith('/metadata/timestamp') &&
        !op.path.startsWith('/metadata/stats/captureSizeBytes'),
      );

      const patchSize = JSON.stringify(meaningfulPatch).length;
      const fullSize = JSON.stringify(target.parsed).length;
      const ratio = fullSize > 0 ? Math.round(fullSize / Math.max(patchSize, 1)) : 1;

      // Fall back to full if patch is >50% of full size (structural rewrite)
      if (patchSize > fullSize * 0.5) {
        return jsonResponse({
          mode: 'full',
          reason: `Patch is ${Math.round(patchSize / fullSize * 100)}% of full capture (structural rewrite)`,
          capture: targetFile,
          previousCapture: prevFile,
          url: targetUrl,
        });
      }

      // Summarize changes by category
      const summary = { styles: 0, layout: 0, nodes: 0, text: 0, other: 0 };
      for (const op of meaningfulPatch) {
        if (op.path.includes('/styles') || op.path.includes('/styleTable')) summary.styles++;
        else if (op.path.includes('/bbox') || op.path.includes('/layout')) summary.layout++;
        else if (op.path.includes('/nodes/')) summary.nodes++;
        else if (op.path.includes('/visibleText')) summary.text++;
        else summary.other++;
      }

      return jsonResponse({
        mode: 'patch',
        base: prevFile,
        target: targetFile,
        url: targetUrl,
        hmrDetected: !!target.parsed.metadata?.hmrSource,
        changeSignal: {
          nodesAdded: summary.nodes > 0 ? summary.nodes : 0,
          nodesRemoved: meaningfulPatch.filter((op) => op.op === 'remove' && op.path.includes('/nodes/')).length,
          stylesChanged: summary.styles,
          textChanged: summary.text,
          layoutChanged: summary.layout,
          fingerprintMatch: target.parsed.metadata?.structuralFingerprint === prev.parsed.metadata?.structuralFingerprint,
        },
        patch: meaningfulPatch,
        stats: {
          operations: meaningfulPatch.length,
          patchSizeBytes: patchSize,
          fullCaptureSizeBytes: fullSize,
          compressionRatio: `${ratio}:1`,
          summary,
        },
      });
    },
  );
}
