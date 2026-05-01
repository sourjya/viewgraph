/**
 * Gateway Factory - Unit Tests
 *
 * Tests tool clustering: proxy capture, gateway registration, discovery,
 * dispatch, error handling, and edge cases (single-tool clusters, context forwarding).
 *
 * @see server/src/clusters/gateway.js
 * @see server/src/clusters/cluster-config.json
 */

import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { createToolProxy, registerGateways, loadClusterConfig } from '#src/clusters/gateway.js';

/** Create a mock MCP server that records tool registrations. */
function createMockServer() {
  const tools = new Map();
  return {
    tools,
    tool(name, ...rest) {
      let description, schema, handler;
      if (typeof rest[0] === 'string') {
        [description, schema, handler] = rest;
      } else {
        description = '';
        [schema, handler] = rest;
      }
      tools.set(name, { name, description, schema, handler });
    },
  };
}

describe('loadClusterConfig', () => {
  it('(+) loads config with 6 clusters covering 41 tools', () => {
    const config = loadClusterConfig();
    expect(config.clusters).toHaveLength(6);
    const allTools = config.clusters.flatMap((c) => c.tools);
    expect(allTools).toHaveLength(41);
    expect(new Set(allTools).size).toBe(41); // no duplicates
  });
});

describe('createToolProxy', () => {
  it('(+) flat mode: registers tools on real server AND captures in registry', () => {
    const server = createMockServer();
    const { proxy, registry } = createToolProxy(server, { clustered: false });

    proxy.tool('test_tool', 'A test tool', { name: z.string() }, async () => ({}));

    expect(registry.has('test_tool')).toBe(true);
    expect(server.tools.has('test_tool')).toBe(true); // registered on real server
  });

  it('(+) clustered mode: captures in registry but NOT on real server', () => {
    const server = createMockServer();
    const { proxy, registry } = createToolProxy(server, { clustered: true });

    proxy.tool('test_tool', 'A test tool', { name: z.string() }, async () => ({}));

    expect(registry.has('test_tool')).toBe(true);
    expect(server.tools.has('test_tool')).toBe(false); // NOT on real server
  });

  it('(+) proxy passes through non-tool methods', () => {
    const server = createMockServer();
    server.prompt = vi.fn();
    const { proxy } = createToolProxy(server, { clustered: true });

    proxy.prompt('test');
    expect(server.prompt).toHaveBeenCalledWith('test');
  });
});

describe('registerGateways', () => {
  /** Helper: register mock tools on a proxy, then create gateways. */
  function setupGateways(toolDefs, config) {
    const server = createMockServer();
    const { proxy, registry } = createToolProxy(server, { clustered: true });

    for (const def of toolDefs) {
      proxy.tool(def.name, def.description || '', def.schema || {}, def.handler || (async () => ({ content: [{ type: 'text', text: `${def.name} result` }] })));
    }

    const count = registerGateways(server, registry, config);
    return { server, registry, count };
  }

  it('(+) registers 6 gateway tools from full config', () => {
    // Register all 41 tools with minimal handlers
    const config = loadClusterConfig();
    const allTools = config.clusters.flatMap((c) => c.tools);
    const toolDefs = allTools.map((name) => ({ name, schema: { filename: z.string() } }));

    const { server, count } = setupGateways(toolDefs, config);

    expect(count).toBe(6);
    expect(server.tools.has('vg_capture')).toBe(true);
    expect(server.tools.has('vg_audit')).toBe(true);
    expect(server.tools.has('vg_compare')).toBe(true);
    expect(server.tools.has('vg_annotate')).toBe(true);
    expect(server.tools.has('vg_session')).toBe(true);
    expect(server.tools.has('vg_source')).toBe(true);
  });

  it('(+) discovery mode: returns sub-action list when no action specified', async () => {
    const config = { clusters: [{ gateway: 'vg_test', description: 'Test', tools: ['tool_a', 'tool_b'] }] };
    const toolDefs = [
      { name: 'tool_a', description: 'Does A things.', schema: { x: z.string() } },
      { name: 'tool_b', description: 'Does B things.', schema: { y: z.number() } },
    ];

    const { server } = setupGateways(toolDefs, config);
    const gateway = server.tools.get('vg_test');
    const result = await gateway.handler({});

    expect(result.content[0].text).toContain('tool_a');
    expect(result.content[0].text).toContain('tool_b');
    expect(result.content[0].text).toContain('Available actions');
  });

  it('(+) dispatch: calls sub-tool handler with correct params', async () => {
    const handler = vi.fn(async ({ filename }) => ({ content: [{ type: 'text', text: `got ${filename}` }] }));
    const config = { clusters: [{ gateway: 'vg_test', description: 'Test', tools: ['my_tool', 'other_tool'] }] };
    const toolDefs = [
      { name: 'my_tool', schema: { filename: z.string() }, handler },
      { name: 'other_tool', schema: {} },
    ];

    const { server } = setupGateways(toolDefs, config);
    const gateway = server.tools.get('vg_test');
    const result = await gateway.handler({ action: 'my_tool', filename: 'test.json' });

    expect(handler).toHaveBeenCalledWith({ filename: 'test.json' }, undefined);
    expect(result.content[0].text).toBe('got test.json');
  });

  it('(+) forwards MCP context to sub-tool handler', async () => {
    const handler = vi.fn(async (params, ctx) => ({ content: [{ type: 'text', text: ctx?.sessionId || 'no-ctx' }] }));
    const config = { clusters: [{ gateway: 'vg_test', description: 'Test', tools: ['ctx_tool', 'other'] }] };
    const toolDefs = [
      { name: 'ctx_tool', schema: {}, handler },
      { name: 'other', schema: {} },
    ];

    const { server } = setupGateways(toolDefs, config);
    const gateway = server.tools.get('vg_test');
    const mockContext = { sessionId: 'sess-123' };
    const result = await gateway.handler({ action: 'ctx_tool' }, mockContext);

    expect(handler).toHaveBeenCalledWith({}, mockContext);
    expect(result.content[0].text).toBe('sess-123');
  });

  it('(-) returns error for unknown action', async () => {
    const config = { clusters: [{ gateway: 'vg_test', description: 'Test', tools: ['real_tool', 'other'] }] };
    const toolDefs = [{ name: 'real_tool', schema: {} }, { name: 'other', schema: {} }];

    const { server } = setupGateways(toolDefs, config);
    const gateway = server.tools.get('vg_test');
    const result = await gateway.handler({ action: 'fake_tool' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown action');
  });

  it('(+) single-tool cluster uses z.literal instead of z.enum', () => {
    const config = { clusters: [{ gateway: 'vg_single', description: 'Single', tools: ['only_tool'] }] };
    const toolDefs = [{ name: 'only_tool', schema: { q: z.string() } }];

    // Should not throw (z.enum with 1 value would throw)
    const { server, count } = setupGateways(toolDefs, config);
    expect(count).toBe(1);
    expect(server.tools.has('vg_single')).toBe(true);
  });

  it('(+) handles already-optional Zod params without double-wrapping', () => {
    const config = { clusters: [{ gateway: 'vg_opt', description: 'Opt', tools: ['opt_tool', 'other'] }] };
    const toolDefs = [
      { name: 'opt_tool', schema: { limit: z.number().optional(), name: z.string() } },
      { name: 'other', schema: {} },
    ];

    // Should not throw
    const { server } = setupGateways(toolDefs, config);
    expect(server.tools.has('vg_opt')).toBe(true);
  });

  it('(-) skips clusters with no registered tools', () => {
    const config = { clusters: [
      { gateway: 'vg_empty', description: 'Empty', tools: ['nonexistent_a', 'nonexistent_b'] },
      { gateway: 'vg_real', description: 'Real', tools: ['real_tool', 'other'] },
    ] };
    const toolDefs = [{ name: 'real_tool', schema: {} }, { name: 'other', schema: {} }];

    const { server, count } = setupGateways(toolDefs, config);
    expect(count).toBe(1); // only vg_real registered
    expect(server.tools.has('vg_empty')).toBe(false);
    expect(server.tools.has('vg_real')).toBe(true);
  });
});
