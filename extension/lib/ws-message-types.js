/**
 * WebSocket Message Types
 *
 * Shared constants for WS protocol messages between extension and server.
 * Must stay in sync with server/src/ws-message-types.js.
 *
 * @see server/src/ws-server.js
 * @see extension/lib/ws-client.js
 */

export const WS_MESSAGES = Object.freeze({
  // Auth
  AUTH_OK: 'auth:ok',
  AUTH_FAIL: 'auth:fail',

  // Annotation events (extension -> server, server -> other clients)
  ANNOTATION_CREATE: 'annotation:create',
  ANNOTATION_UPDATE: 'annotation:update',
  ANNOTATION_DELETE: 'annotation:delete',

  // Server -> extension
  ANNOTATION_RESOLVED: 'annotation:resolved',
  REQUEST_CAPTURE: 'request:capture',
  AUDIT_RESULTS: 'audit:results',

  // Extension -> server
  CAPTURE_COMPLETE: 'capture:complete',
});
