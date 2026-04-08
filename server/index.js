/**
 * Sifr MCP Server — Entry Point
 *
 * Starts the MCP server over stdio transport, exposing tools for querying,
 * analyzing, and comparing Sifr DOM captures. Kiro (or any MCP host) spawns
 * this process and communicates via JSON-RPC over stdin/stdout.
 *
 * Architecture: index.js wires together the watcher, indexer, HTTP receiver,
 * and tool handlers. Each tool is registered in its own module under src/tools/.
 *
 * CRITICAL: All logging goes to stderr — stdout is reserved for JSON-RPC.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({
  name: 'sifr-mcp-server',
  version: '0.1.0',
  description: 'Exposes Sifr DOM capture tools for AI-powered UI auditing, test generation, and visual regression',
});

// ---------------------------------------------------------------------------
// Server startup
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[sifr] MCP server running on stdio');
}

// Graceful shutdown — close watchers, HTTP server, etc. when Kiro terminates us
process.on('SIGINT', () => {
  console.error('[sifr] Shutting down (SIGINT)');
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.error('[sifr] Shutting down (SIGTERM)');
  process.exit(0);
});

main().catch((err) => {
  console.error('[sifr] Fatal error:', err);
  process.exit(1);
});
