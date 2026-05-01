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

import path from 'path';
import { log } from './constants.js';

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

        case 'captures':
        case 'captures:list': {
          const entries = indexer.list();
          const url = msg.url;
          const filtered = url ? entries.filter((e) => e.url?.includes(url)) : entries;
          return { captures: filtered };
        }

        case 'capture':
        case 'captures:send': {
          const payload = msg.payload || msg;
          if (!payload?.metadata) return { error: 'Missing metadata in capture' };
          const filename = await writeCapture(payload);
          // BUG-022: match by requestId first, fall back to URL
          const matchById = payload.metadata.requestId ? queue.findById?.(payload.metadata.requestId) : null;
          const match = matchById || queue.findByUrl(payload.metadata.url);
          if (match) queue.complete(match.id, filename);
          return { filename, status: 'ok' };
        }

        case 'config':
        case 'config:get':
          return getConfig();

        case 'config:put':
          if (msg.payload) await updateConfig(msg.payload);
          return { status: 'ok' };

        case 'annotations:resolved': {
          // Return resolved annotations for a URL (mirrors GET /annotations/resolved)
          const url = msg.url;
          const entries = indexer.list();
          const resolved = [];
          for (const entry of entries) {
            if (url && !entry.url?.includes(url)) continue;
            // Read capture to get resolved annotations
            try {
              const { readFileSync } = await import('fs');
              const filePath = path.join(deps.capturesDir, path.basename(entry.filename));
              const resolvedPath = path.resolve(filePath);
              if (!resolvedPath.startsWith(path.resolve(deps.capturesDir) + path.sep)) continue;
              const raw = readFileSync(resolvedPath, 'utf-8');
              const capture = JSON.parse(raw);
              for (const ann of (capture.annotations || [])) {
                if (ann.resolved) resolved.push({ filename: entry.filename, ...ann });
              }
            } catch { /* skip unreadable */ }
          }
          return { annotations: resolved };
        }

        case 'requests:pending':
        case 'request:pending':
          return { requests: queue.getPending?.() || [] };

        case 'baselines':
        case 'baselines:list':
          return { error: 'Baselines not available via native messaging. Use HTTP /baselines endpoint.' };

        case 'baselines:compare':
          return { error: 'Baseline comparison not available via native messaging. Use HTTP /baselines/compare endpoint.' };

        default: {
          // Dynamic routes: requests:ID:ack, requests:ID:decline
          const ackMatch = msg.type.match(/^requests:(.+):ack$/);
          if (ackMatch) {
            queue.acknowledge?.(ackMatch[1]);
            return { status: 'ok' };
          }
          const declineMatch = msg.type.match(/^requests:(.+):decline$/);
          if (declineMatch) {
            queue.decline?.(declineMatch[1], msg.payload?.reason || 'declined');
            return { status: 'ok' };
          }
          return { error: `Unknown message type: ${msg.type}` };
        }
      }
    } catch (err) {
      log('Native message handler error:', err.message);
      return { error: err.message };
    }
  };
}
