/**
 * MCP Tool Integration Test Helper
 *
 * Creates a connected MCP server+client pair using InMemoryTransport.
 * Tools are registered on the server, then called via the client  - 
 * exercising the full MCP protocol path (schema validation, handler, response).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import path from 'path';
import { createIndexer } from '#src/indexer.js';

/** Shared fixtures directory for all tool tests. */
export const FIXTURES_DIR = path.resolve(import.meta.dirname, '../../fixtures');

/**
 * Create a connected server/client pair for integration testing.
 * @param {(server: McpServer) => void} registerFn - registers tools on the server
 * @returns {{ client: Client, cleanup: () => Promise<void> }}
 */
export async function createTestClient(registerFn) {
  const server = new McpServer({ name: 'test-server', version: '0.0.1' });
  registerFn(server);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '0.0.1' });

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  return {
    client,
    cleanup: async () => {
      await client.close();
      await server.close();
    },
  };
}

/**
 * Create a connected server/client pair with a standard indexer and fixtures dir.
 * Shorthand for the most common tool test pattern.
 * @param {(server: McpServer, indexer: object, fixturesDir: string) => void} registerFn
 * @returns {{ client: Client, cleanup: () => Promise<void> }}
 */
export async function createFixtureClient(registerFn) {
  const indexer = createIndexer({ maxCaptures: 10 });
  return createTestClient((s) => registerFn(s, indexer, FIXTURES_DIR));
}
