/**
 * MCP Tool: get_request_status
 *
 * Poll for the status of a capture request. Returns the filename
 * when the capture is completed.
 */

import { z } from 'zod';
import { PROJECT_NAME } from '#src/constants.js';

export function register(server, queue) {
  server.tool(
    'get_request_status',
    `Check the status of a ${PROJECT_NAME} capture request. ` +
    'Returns status (pending, acknowledged, completed, expired) and ' +
    'the capture filename when completed.',
    {
      request_id: z.string().describe('Request ID from request_capture'),
    },
    async ({ request_id }) => {
      const req = queue.get(request_id);
      if (!req) {
        return { content: [{ type: 'text', text: `Error: Request "${request_id}" not found` }], isError: true };
      }
      const result = { requestId: req.id, status: req.status, url: req.url };
      if (req.status === 'completed') result.filename = req.captureFilename;
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    },
  );
}
