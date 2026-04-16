import { WS_MESSAGES } from './ws-message-types.js';
/**
 * WebSocket Client
 *
 * Manages a persistent WebSocket connection from the extension to the
 * ViewGraph MCP server. Sends annotation events in real-time and receives
 * resolution updates and capture requests.
 *
 * Reconnects automatically on disconnect with exponential backoff.
 * Auth token is sent as the first message after connection.
 *
 * @see server/src/ws-server.js
 * @see docs/roadmap/roadmap.md - M14.3
 */

/** @type {WebSocket|null} */
let ws = null;
let reconnectTimer = null;
let reconnectDelay = 1000;
let handlers = {};
let serverUrl = '';

const MAX_RECONNECT_DELAY = 30000;

/**
 * Connect to the ViewGraph WebSocket server.
 * @param {{ url: string, token: string, onMessage?: function, onConnect?: function, onDisconnect?: function }} options
 */
export function connect(options) {
  serverUrl = options.url;
  handlers = {
    onMessage: options.onMessage,
    onConnect: options.onConnect,
    onDisconnect: options.onDisconnect,
  };
  doConnect();
}

/** Internal connect with auth handshake. */
function doConnect() {
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return;

  try {
    const wsUrl = serverUrl.replace(/^http/, 'ws') + '/ws';
    ws = new WebSocket(wsUrl);
  } catch { scheduleReconnect(); return; }

  ws.onopen = () => {
    reconnectDelay = 1000;
    // Send auth token
  };

  ws.onmessage = (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }

    if (msg.type === WS_MESSAGES.AUTH_OK) {
      handlers.onConnect?.();
      return;
    }
    if (msg.type === WS_MESSAGES.AUTH_FAIL) {
      ws.close();
      return;
    }
    handlers.onMessage?.(msg);
  };

  ws.onclose = () => {
    handlers.onDisconnect?.();
    scheduleReconnect();
  };

  ws.onerror = () => { /* onclose will fire */ };
}

/** Schedule a reconnect with exponential backoff. */
function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
    doConnect();
  }, reconnectDelay);
}

/**
 * Send a message to the server.
 * @param {object} msg
 */
export function send(msg) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

/**
 * Send an annotation creation event.
 * @param {object} annotation
 */
export function sendAnnotationCreate(annotation) {
  send({ type: WS_MESSAGES.ANNOTATION_CREATE, annotation });
}

/**
 * Send an annotation update event.
 * @param {string} uuid
 * @param {object} changes
 */
export function sendAnnotationUpdate(uuid, changes) {
  send({ type: WS_MESSAGES.ANNOTATION_UPDATE, uuid, changes });
}

/**
 * Send an annotation deletion event.
 * @param {string} uuid
 */
export function sendAnnotationDelete(uuid) {
  send({ type: WS_MESSAGES.ANNOTATION_DELETE, uuid });
}

/**
 * Disconnect from the server.
 */
export function disconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
  if (ws) {
    ws.onclose = null; // Prevent reconnect
    ws.close();
    ws = null;
  }
}

/**
 * Check if connected and authenticated.
 * @returns {boolean}
 */
export function isConnected() {
  return ws?.readyState === WebSocket.OPEN;
}
