/**
 * Project Constants  -  Single Source of Truth
 *
 * All project-name-derived values live here. To rename the project,
 * change these constants and everything propagates automatically.
 * No other source file should hardcode the project name.
 */

/** Human-readable project name, used in tool descriptions for the LLM. */
export const PROJECT_NAME = 'ViewGraph';

/** Machine-readable prefix for env vars, log output, and identifiers. */
export const PROJECT_PREFIX = 'viewgraph';

/** MCP server identity  -  reported to hosts during initialization. */
export const SERVER_NAME = `${PROJECT_PREFIX}-mcp-server`;
export const SERVER_VERSION = '0.1.0';
export const SERVER_DESCRIPTION = `Exposes ${PROJECT_NAME} DOM capture tools for AI-powered UI auditing, test generation, and visual regression`;

/** Capture format identifier stored in metadata.format field. */
export const FORMAT_VERSION = `${PROJECT_PREFIX}-v2`;

/** Environment variable names. */
export const ENV_CAPTURES_DIR = `${PROJECT_PREFIX.toUpperCase()}_CAPTURES_DIR`;
export const ENV_MAX_CAPTURES = `${PROJECT_PREFIX.toUpperCase()}_MAX_CAPTURES`;
export const ENV_HTTP_PORT = `${PROJECT_PREFIX.toUpperCase()}_HTTP_PORT`;

/** Stderr log prefix. */
export const LOG_PREFIX = `[${PROJECT_PREFIX}]`;

/** Default HTTP receiver port for extension communication. */
export const DEFAULT_HTTP_PORT = 9876;
