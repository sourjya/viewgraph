/**
 * Tests for sw/sync-alarms.js - Alarm-Based Background Sync
 *
 * Verifies alarm creation, polling on alarm fire, storage writes,
 * badge updates, and graceful handling of offline servers.
 *
 * Phase 4 of the service worker communication migration (M19).
 * @see .kiro/specs/sw-communication/tasks.md - Step 15
 * @see extension/lib/sw/sync-alarms.js - implementation under test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ──────────────────────────────────────────────
// Mock transport for polling
// ──────────────────────────────────────────────

const mockTransport = {
  getResolved: vi.fn(() => Promise.resolve({ resolved: [] })),
  getPendingRequests: vi.fn(() => Promise.resolve({ requests: [] })),
};

vi.mock('#lib/transport.js', () => mockTransport);

// ──────────────────────────────────────────────
// Setup
// ──────────────────────────────────────────────

let storageData = {};

beforeEach(() => {
  vi.clearAllMocks();
  storageData = {};
  globalThis.chrome = {
    alarms: {
      create: vi.fn(),
      clear: vi.fn(),
    },
    action: {
      setBadgeText: vi.fn(),
      setBadgeBackgroundColor: vi.fn(),
    },
    storage: {
      local: {
        get: vi.fn((key) => Promise.resolve(storageData[key] !== undefined ? { [key]: storageData[key] } : {})),
        set: vi.fn((obj) => { Object.assign(storageData, obj); return Promise.resolve(); }),
      },
    },
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ──────────────────────────────────────────────
// Alarm Lifecycle
// ──────────────────────────────────────────────

describe('alarm lifecycle', () => {
  it('(+) startSync creates alarm', async () => {
    const { startSync } = await import('#lib/sw/sync-alarms.js');
    startSync();
    expect(globalThis.chrome.alarms.create).toHaveBeenCalledWith(
      'vg-sync', expect.objectContaining({ periodInMinutes: expect.any(Number) }),
    );
  });

  it('(+) stopSync clears alarm', async () => {
    const { stopSync } = await import('#lib/sw/sync-alarms.js');
    stopSync();
    expect(globalThis.chrome.alarms.clear).toHaveBeenCalledWith('vg-sync');
  });
});

// ──────────────────────────────────────────────
// Alarm Handler
// ──────────────────────────────────────────────

describe('onAlarm', () => {
  it('(+) polls resolved and writes to storage', async () => {
    mockTransport.getResolved.mockResolvedValueOnce({
      resolved: [{ uuid: 'a1', resolution: { action: 'fixed' } }],
    });
    // Simulate a page URL with annotations
    storageData['vg-active-urls'] = ['http://localhost:3000/app'];
    const { onAlarm } = await import('#lib/sw/sync-alarms.js');
    await onAlarm({ name: 'vg-sync' });
    expect(mockTransport.getResolved).toHaveBeenCalled();
    expect(globalThis.chrome.storage.local.set).toHaveBeenCalled();
  });

  it('(+) polls pending requests and writes to storage', async () => {
    mockTransport.getPendingRequests.mockResolvedValueOnce({
      requests: [{ id: 'req-1', url: 'http://localhost:3000' }],
    });
    const { onAlarm } = await import('#lib/sw/sync-alarms.js');
    await onAlarm({ name: 'vg-sync' });
    expect(mockTransport.getPendingRequests).toHaveBeenCalled();
  });

  it('(+) sets badge when pending requests exist', async () => {
    mockTransport.getPendingRequests.mockResolvedValueOnce({
      requests: [{ id: 'req-1' }, { id: 'req-2' }],
    });
    const { onAlarm } = await import('#lib/sw/sync-alarms.js');
    await onAlarm({ name: 'vg-sync' });
    expect(globalThis.chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '2' });
  });

  it('(+) clears badge when no pending requests', async () => {
    mockTransport.getPendingRequests.mockResolvedValueOnce({ requests: [] });
    const { onAlarm } = await import('#lib/sw/sync-alarms.js');
    await onAlarm({ name: 'vg-sync' });
    expect(globalThis.chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
  });

  it('(-) ignores non-vg-sync alarms', async () => {
    const { onAlarm } = await import('#lib/sw/sync-alarms.js');
    await onAlarm({ name: 'other-alarm' });
    expect(mockTransport.getPendingRequests).not.toHaveBeenCalled();
  });

  it('(-) handles offline server gracefully', async () => {
    mockTransport.getPendingRequests.mockRejectedValueOnce(new Error('offline'));
    mockTransport.getResolved.mockRejectedValueOnce(new Error('offline'));
    const { onAlarm } = await import('#lib/sw/sync-alarms.js');
    await expect(onAlarm({ name: 'vg-sync' })).resolves.not.toThrow();
  });
});
