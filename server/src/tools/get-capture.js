/**
 * MCP Tool: get_capture
 *
 * Returns the full capture JSON for a specific file.
 * Validates the filename against the captures directory to prevent path traversal.
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import path from 'node:path';
import { PROJECT_NAME, PROJECT_PREFIX } from '#src/constants.js';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { errorResponse, NOTICE_CAPTURE } from '#src/utils/tool-helpers.js';
import { readArchiveIndex } from '#src/archive.js';

/**
 * Register the get_capture MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} _indexer
 * @param {string} capturesDir
 * @see #src/utils/validate-path.js
 */
export function register(server, _indexer, capturesDir) {
  server.tool(
    'get_capture',
    `Retrieve the full ${PROJECT_NAME} DOM capture JSON. Includes NODES, SUMMARY, RELATIONS, DETAILS, ANNOTATIONS. ` +
    'WHEN TO USE: After get_page_summary confirms you need full details. Use list_captures to find filenames. ' +
    'NEXT: Use get_annotations for user feedback, audit_accessibility for a11y, find_source to locate code. ' +
    'PERFORMANCE: Can be 50-200KB. Always use get_page_summary first.',
    {
      filename: z.string()
        .describe(`Capture filename (e.g., "${PROJECT_PREFIX}-localhost-2026-04-08T060815.json")`),
      filePath: z.string().optional()
        .describe('If provided, write capture to this file path and return the path instead of inline content'),
      observationDepth: z.enum(['interactive-only', 'ax-plus-content', 'full-detail']).optional()
        .describe('Control how much data to return. interactive-only: ~400 tokens (actionManifest only). ax-plus-content: ~8K tokens (manifest + summary + text). full-detail: everything (default).'),
    },
    async ({ filename, filePath: outputPath, observationDepth }) => {
      // S3-7: Validate outputPath is within the project directory
      if (outputPath) {
        const resolved = path.resolve(outputPath);
        const projectRoot = path.resolve(capturesDir, '..');
        if (!resolved.startsWith(projectRoot + path.sep) && resolved !== projectRoot) {
          return errorResponse('Error: filePath must be within the project directory');
        }
      }
      let filePath;
      try {
        filePath = validateCapturePath(filename, capturesDir);
      } catch {
        return errorResponse(`Error: Invalid filename  -  ${filename}`);
      }

      try {
        const content = await readFile(filePath, 'utf-8');

        // observationDepth: filter response to reduce tokens
        if (observationDepth && observationDepth !== 'full-detail') {
          try {
            const capture = JSON.parse(content);
            let filtered;
            if (observationDepth === 'interactive-only') {
              filtered = {
                metadata: { url: capture.metadata?.url, title: capture.metadata?.title, timestamp: capture.metadata?.timestamp, structuralFingerprint: capture.metadata?.structuralFingerprint },
                actionManifest: capture.actionManifest,
              };
            } else { // ax-plus-content
              filtered = {
                metadata: capture.metadata,
                summary: capture.summary,
                actionManifest: capture.actionManifest,
                provenance: capture.provenance,
                console: capture.console ? { summary: capture.console.summary, errors: capture.console.errors } : null,
                network: capture.network ? { summary: capture.network.summary, failed: capture.network.failed } : null,
              };
            }
            const json = JSON.stringify(filtered, null, 2);
            if (outputPath) {
              const { writeFileSync, mkdirSync } = await import('fs');
              mkdirSync(path.dirname(outputPath), { recursive: true });
              writeFileSync(outputPath, json);
              return { content: [{ type: 'text', text: `Capture (${observationDepth}) written to: ${outputPath}` }] };
            }
            return { content: [{ type: 'text', text: `${NOTICE_CAPTURE}\n\nCapture: ${filename} (${observationDepth})\n\n${json}` }] };
          } catch { /* parse failed, fall through to full */ }
        }

        // Write to file if filePath provided (for large captures)
        if (outputPath) {
          const { writeFileSync, mkdirSync } = await import('fs');
          mkdirSync(path.dirname(outputPath), { recursive: true });
          writeFileSync(outputPath, content);
          // Return a capture receipt instead of just the path
          try {
            const cap = JSON.parse(content);
            const receipt = {
              captureReceipt: {
                filename,
                path: outputPath,
                timestamp: cap.metadata?.timestamp,
                url: cap.metadata?.url,
                title: cap.metadata?.title,
                structuralFingerprint: cap.metadata?.structuralFingerprint,
                stats: cap.actionManifest?.stats || { total: cap.metadata?.stats?.totalNodes || 0 },
                viewportRefs: cap.actionManifest?.viewportRefs?.slice(0, 10) || [],
                consoleErrors: cap.console?.summary?.errors || 0,
                failedRequests: cap.network?.summary?.failed || 0,
              },
            };
            return { content: [{ type: 'text', text: JSON.stringify(receipt, null, 2) }] };
          } catch {
            return { content: [{ type: 'text', text: `Capture written to: ${outputPath} (${(Buffer.byteLength(content) / 1024).toFixed(1)} KB)` }] };
          }
        }
        const size = Buffer.byteLength(content);
        const notice = NOTICE_CAPTURE + '\n\n';
        const header = `Capture: ${filename} (${(size / 1024).toFixed(1)} KB)\n\n`;
        return { content: [{ type: 'text', text: notice + header + content }] };
      } catch (err) {
        if (err.code === 'ENOENT') {
          // Fallback: check archive directory for resolved captures
          try {
            const archiveDir = path.join(path.dirname(capturesDir), 'archive');
            const index = readArchiveIndex(archiveDir);
            const entry = index.captures.find((c) => c.originalPath === filename);
            if (entry) {
              const archivePath = path.resolve(archiveDir, entry.filename);
              if (!archivePath.startsWith(path.resolve(archiveDir) + path.sep)) {
                return errorResponse(`Error: Invalid archive path for: ${filename}`);
              }
              const content = await readFile(archivePath, 'utf-8');
              const size = Buffer.byteLength(content);
              const notice = NOTICE_CAPTURE + '\n\n';
              const header = `Capture: ${filename} (${(size / 1024).toFixed(1)} KB) [archived]\n\n`;
              return { content: [{ type: 'text', text: notice + header + content }] };
            }
          } catch { /* archive not available */ }
          return errorResponse(`Error: Capture not found: ${filename}. Use list_captures to see available files.`);
        }
        return errorResponse(`Error reading capture: ${err.message}`);
      }
    },
  );
}
