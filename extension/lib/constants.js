/**
 * Shared Constants - Extension
 *
 * Single source of truth for values shared between the extension and
 * the MCP server. Keep in sync with server/src/constants.js.
 */

/** Default HTTP receiver port for MCP server communication. */
export const DEFAULT_HTTP_PORT = 9876;

/** Base URL for the MCP server HTTP receiver. */
export const SERVER_BASE_URL = `http://127.0.0.1:${DEFAULT_HTTP_PORT}`;
