/**
 * Tests for native messaging stdin handler.
 * Validates message routing from native messaging to server internals.
 *
 * @see server/src/native-message-handler.js
 */

import { describe, it, expect, vi } from 'vitest';
import { createMessageHandler } from '#src/native-message-handler.js';

/** Mock dependencies that the handler routes messages to. */
function mockDeps() {
  return {
    capturesDir: '/tmp/test-captures',
    indexer: { list: () => [], add: vi.fn() },
    queue: { findByUrl: () => null, list: () => [], complete: vi.fn() },
    getInfo: vi.fn(() => ({ capturesDir: '/tmp', projectRoot: '/tmp', urlPatterns: [], trustedPatterns: [], serverVersion: '0.3.6' })),
    getConfig: vi.fn(() => ({})),
    updateConfig: vi.fn(),
    writeCapture: vi.fn(() => 'test-capture.json'),
  };
}

describe('native message handler', () => {
  it('(+) handles health message', async () => {
    const handler = createMessageHandler(mockDeps());
    const res = await handler({ type: 'health' });
    expect(res.status).toBe('ok');
  });

  it('(+) handles info message', async () => {
    const handler = createMessageHandler(mockDeps());
    const res = await handler({ type: 'info' });
    expect(res).toHaveProperty('projectRoot');
    expect(res).toHaveProperty('serverVersion');
  });

  it('(+) handles captures:list message', async () => {
    const handler = createMessageHandler(mockDeps());
    const res = await handler({ type: 'captures:list' });
    expect(res).toHaveProperty('captures');
  });

  it('(+) handles capture message', async () => {
    const deps = mockDeps();
    const handler = createMessageHandler(deps);
    const res = await handler({ type: 'capture', payload: { metadata: { url: 'http://localhost:3000' }, nodes: [] } });
    expect(res).toHaveProperty('filename');
    expect(deps.writeCapture).toHaveBeenCalled();
  });

  it('(+) handles config:get message', async () => {
    const handler = createMessageHandler(mockDeps());
    const res = await handler({ type: 'config:get' });
    expect(res).toBeDefined();
  });

  it('(+) handles config:put message', async () => {
    const deps = mockDeps();
    const handler = createMessageHandler(deps);
    await handler({ type: 'config:put', payload: { autoAudit: true } });
    expect(deps.updateConfig).toHaveBeenCalledWith({ autoAudit: true });
  });

  it('(+) handles request:pending message', async () => {
    const handler = createMessageHandler(mockDeps());
    const res = await handler({ type: 'request:pending' });
    expect(res).toHaveProperty('requests');
  });

  it('(-) returns error for unknown message type', async () => {
    const handler = createMessageHandler(mockDeps());
    const res = await handler({ type: 'unknown_type' });
    expect(res.error).toBeDefined();
  });

  it('(-) returns error for null message', async () => {
    const handler = createMessageHandler(mockDeps());
    const res = await handler(null);
    expect(res.error).toBeDefined();
  });

  // New message types for transport parity

  it('(+) handles "captures" as alias for captures:list', async () => {
    const handler = createMessageHandler(mockDeps());
    const res = await handler({ type: 'captures' });
    expect(res).toHaveProperty('captures');
  });

  it('(+) handles "config" as alias for config:get', async () => {
    const handler = createMessageHandler(mockDeps());
    const res = await handler({ type: 'config' });
    expect(res).toBeDefined();
  });

  it('(+) handles "requests:pending" as alias for request:pending', async () => {
    const handler = createMessageHandler(mockDeps());
    const res = await handler({ type: 'requests:pending' });
    expect(res).toHaveProperty('requests');
  });

  it('(+) handles dynamic requests:ID:ack route', async () => {
    const deps = mockDeps();
    deps.queue.acknowledge = vi.fn();
    const handler = createMessageHandler(deps);
    const res = await handler({ type: 'requests:abc123:ack' });
    expect(res.status).toBe('ok');
    expect(deps.queue.acknowledge).toHaveBeenCalledWith('abc123');
  });

  it('(+) handles dynamic requests:ID:decline route', async () => {
    const deps = mockDeps();
    deps.queue.decline = vi.fn();
    const handler = createMessageHandler(deps);
    const res = await handler({ type: 'requests:xyz:decline', payload: { reason: 'Not needed' } });
    expect(res.status).toBe('ok');
    expect(deps.queue.decline).toHaveBeenCalledWith('xyz', 'Not needed');
  });

  it('(+) capture with requestId matches by ID first', async () => {
    const deps = mockDeps();
    deps.queue.findById = vi.fn(() => ({ id: 'req1' }));
    deps.queue.complete = vi.fn();
    const handler = createMessageHandler(deps);
    await handler({ type: 'capture', payload: { metadata: { url: 'http://test', requestId: 'req1' } } });
    expect(deps.queue.findById).toHaveBeenCalledWith('req1');
    expect(deps.queue.complete).toHaveBeenCalledWith('req1', 'test-capture.json');
  });
});
