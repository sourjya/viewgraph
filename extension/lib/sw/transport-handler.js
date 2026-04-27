/**
 * Service Worker Transport Handler
 *
 * Receives vg-transport messages from content scripts and routes them
 * to the real transport.js module. Single point of entry for all
 * server communication from the content script layer.
 *
 * Operation whitelist prevents content scripts from invoking arbitrary
 * transport methods (security: NFR-4).
 *
 * @see lib/transport-client.js - content script proxy that sends these messages
 * @see lib/transport.js - the real transport this handler delegates to
 * @see .kiro/specs/sw-communication/design.md - handler design
 */

import * as transport from '#lib/transport.js';
import { TRANSPORT_OPS } from '#lib/constants.js';

/**
 * Operation handlers - maps op names to transport function calls.
 * Built from the shared TRANSPORT_OPS list (MRR-005 12.1).
 */
const OPS = {
  getInfo:           ()     => transport.getInfo(),
  getHealth:         ()     => transport.getHealth(),
  getCaptures:       (args) => transport.getCaptures(args.url),
  getResolved:       (args) => transport.getResolved(args.pageUrl),
  getPendingRequests:()     => transport.getPendingRequests(),
  getConfig:         ()     => transport.getConfig(),
  getBaselines:      (args) => transport.getBaselines(args.url),
  compareBaseline:   (args) => transport.compareBaseline(args.url),
  sendCapture:       (args) => transport.sendCapture(args.data, args.headers),
  sendScreenshot:    (args) => transport.sendScreenshot(args.data),
  updateConfig:      (args) => transport.updateConfig(args.data),
  setBaseline:       (args) => transport.setBaseline(args.filename),
  ackRequest:        (args) => transport.ackRequest(args.id),
  declineRequest:    (args) => transport.declineRequest(args.id, args.reason),
};

// Verify OPS covers all TRANSPORT_OPS at module load time
for (const op of TRANSPORT_OPS) {
  if (!OPS[op]) throw new Error(`transport-handler missing op: ${op}`);
}

/**
 * Handle a vg-transport message from a content script.
 * Routes to the appropriate transport method and sends the result
 * back via sendResponse.
 *
 * @param {{ op: string, args: object }} message - The transport message
 * @param {function} sendResponse - Chrome message response callback
 */
export async function handleTransportMessage(message, sendResponse) {
  const handler = OPS[message.op];
  if (!handler) {
    sendResponse({ ok: false, error: `Unknown transport op: ${message.op}` });
    return;
  }
  try {
    const result = await handler(message.args || {});
    sendResponse({ ok: true, result });
  } catch (err) {
    sendResponse({ ok: false, error: err.message });
  }
}
