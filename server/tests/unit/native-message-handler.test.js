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
});
