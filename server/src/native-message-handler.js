/**
 * Native Message Handler
 *
 * Routes native messaging requests to server internals. Maps message
 * types to the same operations as the HTTP receiver, but without HTTP.
 * Used by the native messaging stdin handler.
 *
 * @see server/src/native-host.js - protocol encoding
 * @see ADR-013 native messaging transport
 */

import { LOG_PREFIX } from './constants.js';

/**
 * Create a message handler that routes native messaging requests.
 * @param {object} deps - Server dependencies
 * @param {string} deps.capturesDir
 * @param {object} deps.indexer
 * @param {object} deps.queue - Request queue
 * @param {function} deps.getInfo - Returns server info object
 * @param {function} deps.getConfig - Returns project config
 * @param {function} deps.updateConfig - Merges config updates
 * @param {function} deps.writeCapture - Writes capture to disk, returns filename
 * @returns {function(object): Promise<object>} Message handler
 */
export function createMessageHandler(deps) {
  const { indexer, queue, getInfo, getConfig, updateConfig, writeCapture } = deps;

  /**
   * Handle a single native messaging request.
   * @param {object} msg - Decoded message from extension
   * @returns {Promise<object>} Response to send back
   */
  return async function handleMessage(msg) {
    if (!msg || !msg.type) return { error: 'Invalid message: missing type' };

    try {
      switch (msg.type) {
        case 'health':
          return { status: 'ok' };

        case 'info':
          return getInfo();

        case 'captures:list': {
          const entries = indexer.list();
          const url = msg.url;
          const filtered = url ? entries.filter((e) => e.url?.includes(url)) : entries;
          return { captures: filtered };
        }

        case 'capture': {
          if (!msg.payload?.metadata) return { error: 'Missing metadata in capture' };
          const filename = await writeCapture(msg.payload);
          const match = queue.findByUrl(msg.payload.metadata.url);
          if (match) queue.complete(match.id, filename);
          return { filename, status: 'ok' };
        }

        case 'config:get':
          return getConfig();

        case 'config:put':
          if (msg.payload) await updateConfig(msg.payload);
          return { status: 'ok' };

        case 'request:pending':
          return { requests: queue.list?.() || [] };

        case 'request:ack':
          if (msg.id) queue.complete?.(msg.id, null);
          return { status: 'ok' };

        case 'request:decline':
          if (msg.id) queue.decline?.(msg.id, msg.reason || 'declined');
          return { status: 'ok' };

        default:
          return { error: `Unknown message type: ${msg.type}` };
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} Native message handler error:`, err.message);
      return { error: err.message };
    }
  };
}
