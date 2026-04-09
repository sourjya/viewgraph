/**
 * MCP Tool: request_capture
 *
 * Queues a capture request for the browser extension to fulfill.
 * The extension polls GET /requests/pending and submits the result.
 */

import { z } from 'zod';
import { PROJECT_NAME } from '#src/constants.js';

export function register(server, queue) {
  server.tool(
    'request_capture',
    `Request a fresh ${PROJECT_NAME} capture from the browser extension. ` +
    'The extension will capture the specified URL and submit the result. ' +
    'Use get_request_status to poll for completion. ' +
    'Provide guidance to tell the user what to look for when capturing.',
    {
      url: z.string().describe('URL of the page to capture'),
      guidance: z.string().max(500).optional()
        .describe('Instructions for the user, e.g. "Verify fix: reload and check the header"'),
    },
    async ({ url, guidance }) => {
      try {
        const req = queue.create(url, { guidance });
        return { content: [{ type: 'text', text: JSON.stringify({ requestId: req.id, status: req.status }) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    },
  );
}
