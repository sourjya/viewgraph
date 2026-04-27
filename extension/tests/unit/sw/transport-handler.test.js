/**
 * Tests for sw/transport-handler.js - Service Worker Transport Handler
 *
 * Verifies that the handler routes vg-transport messages to the correct
 * transport.js methods and returns { ok, result } or { ok, error } responses.
 *
 * Phase 0 of the service worker communication migration (M19).
 * @see .kiro/specs/sw-communication/tasks.md - Step 2
 * @see extension/lib/sw/transport-handler.js - implementation under test
 * @see extension/lib/transport.js - the real transport being delegated to
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ──────────────────────────────────────────────
// Mock transport.js - the real transport the handler delegates to
// ──────────────────────────────────────────────

const mockTransport = {
  getInfo: vi.fn(() => Promise.resolve({ projectRoot: '/test' })),
  getHealth: vi.fn(() => Promise.resolve({ status: 'ok' })),
  getCaptures: vi.fn(() => Promise.resolve({ captures: [] })),
  getResolved: vi.fn(() => Promise.resolve({ resolved: [] })),
  getPendingRequests: vi.fn(() => Promise.resolve({ requests: [] })),
  getConfig: vi.fn(() => Promise.resolve({ autoAudit: false })),
  getBaselines: vi.fn(() => Promise.resolve({ baselines: [] })),
  compareBaseline: vi.fn(() => Promise.resolve({ diff: null })),
  sendCapture: vi.fn(() => Promise.resolve({ filename: 'cap.json' })),
  sendScreenshot: vi.fn(() => Promise.resolve({ ok: true })),
  updateConfig: vi.fn(() => Promise.resolve({ autoAudit: true })),
  setBaseline: vi.fn(() => Promise.resolve({ ok: true })),
  ackRequest: vi.fn(() => Promise.resolve({ ok: true })),
  declineRequest: vi.fn(() => Promise.resolve({ ok: true })),
};

vi.mock('#lib/transport.js', () => mockTransport);

beforeEach(() => {
  vi.clearAllMocks();
});

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe('transport-handler', () => {
  it('(+) routes getInfo to transport.getInfo()', async () => {
    const { handleTransportMessage } = await import('#lib/sw/transport-handler.js');
    const sendResponse = vi.fn();
    await handleTransportMessage({ op: 'getInfo', args: {} }, sendResponse);
    expect(mockTransport.getInfo).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({ ok: true, result: { projectRoot: '/test' } });
  });

  it('(+) routes getHealth to transport.getHealth()', async () => {
    const { handleTransportMessage } = await import('#lib/sw/transport-handler.js');
    const sendResponse = vi.fn();
    await handleTransportMessage({ op: 'getHealth', args: {} }, sendResponse);
    expect(mockTransport.getHealth).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({ ok: true, result: { status: 'ok' } });
  });

  it('(+) routes getCaptures with url arg', async () => {
    const { handleTransportMessage } = await import('#lib/sw/transport-handler.js');
    const sendResponse = vi.fn();
    await handleTransportMessage({ op: 'getCaptures', args: { url: 'http://localhost' } }, sendResponse);
    expect(mockTransport.getCaptures).toHaveBeenCalledWith('http://localhost');
  });

  it('(+) routes getResolved with pageUrl arg', async () => {
    const { handleTransportMessage } = await import('#lib/sw/transport-handler.js');
    const sendResponse = vi.fn();
    await handleTransportMessage({ op: 'getResolved', args: { pageUrl: 'http://localhost/app' } }, sendResponse);
    expect(mockTransport.getResolved).toHaveBeenCalledWith('http://localhost/app');
  });

  it('(+) routes sendCapture with data and headers', async () => {
    const { handleTransportMessage } = await import('#lib/sw/transport-handler.js');
    const sendResponse = vi.fn();
    await handleTransportMessage({ op: 'sendCapture', args: { data: { m: 1 }, headers: { h: '1' } } }, sendResponse);
    expect(mockTransport.sendCapture).toHaveBeenCalledWith({ m: 1 }, { h: '1' });
    expect(sendResponse).toHaveBeenCalledWith({ ok: true, result: { filename: 'cap.json' } });
  });

  it('(+) routes updateConfig with data', async () => {
    const { handleTransportMessage } = await import('#lib/sw/transport-handler.js');
    const sendResponse = vi.fn();
    await handleTransportMessage({ op: 'updateConfig', args: { data: { autoAudit: true } } }, sendResponse);
    expect(mockTransport.updateConfig).toHaveBeenCalledWith({ autoAudit: true });
  });

  it('(+) routes setBaseline with filename', async () => {
    const { handleTransportMessage } = await import('#lib/sw/transport-handler.js');
    const sendResponse = vi.fn();
    await handleTransportMessage({ op: 'setBaseline', args: { filename: 'f.json' } }, sendResponse);
    expect(mockTransport.setBaseline).toHaveBeenCalledWith('f.json');
  });

  it('(+) routes ackRequest with id', async () => {
    const { handleTransportMessage } = await import('#lib/sw/transport-handler.js');
    const sendResponse = vi.fn();
    await handleTransportMessage({ op: 'ackRequest', args: { id: 'r1' } }, sendResponse);
    expect(mockTransport.ackRequest).toHaveBeenCalledWith('r1');
  });

  it('(+) routes declineRequest with id and reason', async () => {
    const { handleTransportMessage } = await import('#lib/sw/transport-handler.js');
    const sendResponse = vi.fn();
    await handleTransportMessage({ op: 'declineRequest', args: { id: 'r1', reason: 'no' } }, sendResponse);
    expect(mockTransport.declineRequest).toHaveBeenCalledWith('r1', 'no');
  });

  it('(+) returns { ok: false, error } on transport error', async () => {
    mockTransport.getInfo.mockRejectedValueOnce(new Error('Connection refused'));
    const { handleTransportMessage } = await import('#lib/sw/transport-handler.js');
    const sendResponse = vi.fn();
    await handleTransportMessage({ op: 'getInfo', args: {} }, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ ok: false, error: 'Connection refused' });
  });

  it('(-) rejects unknown operations', async () => {
    const { handleTransportMessage } = await import('#lib/sw/transport-handler.js');
    const sendResponse = vi.fn();
    await handleTransportMessage({ op: 'deleteEverything', args: {} }, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ ok: false, error: expect.stringContaining('Unknown') });
  });

  it('(+) routes sendScreenshot with data', async () => {
    const { handleTransportMessage } = await import('#lib/sw/transport-handler.js');
    const sendResponse = vi.fn();
    await handleTransportMessage({ op: 'sendScreenshot', args: { data: { png: 'x' } } }, sendResponse);
    expect(mockTransport.sendScreenshot).toHaveBeenCalledWith({ png: 'x' });
  });

  it('(+) routes getBaselines with url', async () => {
    const { handleTransportMessage } = await import('#lib/sw/transport-handler.js');
    const sendResponse = vi.fn();
    await handleTransportMessage({ op: 'getBaselines', args: { url: 'http://localhost' } }, sendResponse);
    expect(mockTransport.getBaselines).toHaveBeenCalledWith('http://localhost');
  });

  it('(+) routes compareBaseline with url', async () => {
    const { handleTransportMessage } = await import('#lib/sw/transport-handler.js');
    const sendResponse = vi.fn();
    await handleTransportMessage({ op: 'compareBaseline', args: { url: 'http://localhost' } }, sendResponse);
    expect(mockTransport.compareBaseline).toHaveBeenCalledWith('http://localhost');
  });

  it('(+) routes getPendingRequests with no args', async () => {
    const { handleTransportMessage } = await import('#lib/sw/transport-handler.js');
    const sendResponse = vi.fn();
    await handleTransportMessage({ op: 'getPendingRequests', args: {} }, sendResponse);
    expect(mockTransport.getPendingRequests).toHaveBeenCalled();
  });

  it('(+) routes getConfig with no args', async () => {
    const { handleTransportMessage } = await import('#lib/sw/transport-handler.js');
    const sendResponse = vi.fn();
    await handleTransportMessage({ op: 'getConfig', args: {} }, sendResponse);
    expect(mockTransport.getConfig).toHaveBeenCalled();
  });
});
