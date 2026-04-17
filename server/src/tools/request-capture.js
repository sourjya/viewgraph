/**
 * MCP Tool: request_capture
 *
 * Queues a capture request for the browser extension to fulfill.
 * The extension polls GET /requests/pending and submits the result.
 */

import { z } from 'zod';
import { PROJECT_NAME } from '#src/constants.js';

/**
 * Register the request_capture MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/request-queue.js').RequestQueue} queue
 * @see #src/request-queue.js
 */
export function register(server, queue) {
  server.tool(
    'request_capture',
    `Request a fresh ${PROJECT_NAME} capture from the browser extension. ` +
    'The user sees the request in their sidebar and can accept or decline. ' +
    'WHEN TO USE: After fixing issues, request a capture to verify fixes. Provide guidance text. ' +
    'NEXT: Use get_request_status to poll for completion, then compare_captures to diff before/after.',
    {
      url: z.string().describe('URL of the page to capture'),
      guidance: z.string().max(500).optional()
        .describe('Instructions for the user, e.g. "Verify fix: reload and check the header"'),
      purpose: z.enum(['capture', 'inspect', 'verify']).optional()
        .describe('Intent: capture (default), inspect (audit/testids), verify (check a fix)'),
    },
    async ({ url, guidance, purpose }) => {
      try {
        const req = queue.create(url, { guidance, purpose });
        return { content: [{ type: 'text', text: JSON.stringify({ requestId: req.id, status: req.status }) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    },
  );
}
