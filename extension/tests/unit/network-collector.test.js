/**
 * Network Collector - Unit Tests
 *
 * Tests collection of network request state from the Performance API.
 * Mocks performance.getEntriesByType since it's not available in test env.
 *
 * @see extension/lib/network-collector.js
 * @see .kiro/specs/network-console-capture/requirements.md FR-1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { collectNetworkState } from '../../lib/collectors/network-collector.js';

describe('collectNetworkState', () => {
  let originalPerformance;

  beforeEach(() => {
    originalPerformance = globalThis.performance;
  });

  afterEach(() => {
    globalThis.performance = originalPerformance;
  });

  /** Helper to mock performance.getEntriesByType */
  function mockPerformance(entries) {
    globalThis.performance = { getEntriesByType: vi.fn(() => entries) };
  }

  it('collects fetch and XHR entries', () => {
    mockPerformance([
      { name: 'https://api.example.com/data', initiatorType: 'fetch', duration: 200, transferSize: 1500, decodedBodySize: 3000, startTime: 100 },
      { name: 'https://api.example.com/users', initiatorType: 'xmlhttprequest', duration: 150, transferSize: 800, decodedBodySize: 1600, startTime: 200 },
    ]);
    const result = collectNetworkState();
    expect(result.requests).toHaveLength(2);
    expect(result.requests[0].url).toBe('https://api.example.com/users');
    expect(result.requests[0].initiatorType).toBe('xmlhttprequest');
    expect(result.summary.total).toBe(2);
  });

  it('includes all resource types', () => {
    mockPerformance([
      { name: '/app.js', initiatorType: 'script', duration: 50, transferSize: 5000, decodedBodySize: 15000, startTime: 10 },
      { name: '/style.css', initiatorType: 'css', duration: 30, transferSize: 2000, decodedBodySize: 8000, startTime: 5 },
      { name: '/api/data', initiatorType: 'fetch', duration: 200, transferSize: 500, decodedBodySize: 1000, startTime: 100 },
    ]);
    const result = collectNetworkState();
    expect(result.requests).toHaveLength(3);
    expect(result.summary.byType.script).toBe(1);
    expect(result.summary.byType.fetch).toBe(1);
  });

  it('detects failed requests (transferSize 0 with duration > 0)', () => {
    mockPerformance([
      { name: '/api/fail', initiatorType: 'fetch', duration: 100, transferSize: 0, decodedBodySize: 0, startTime: 50 },
    ]);
    const result = collectNetworkState();
    expect(result.requests[0].failed).toBe(true);
    expect(result.summary.failed).toBe(1);
  });

  it('truncates URLs to 200 chars', () => {
    const longUrl = 'https://api.example.com/data?' + 'x='.repeat(200);
    mockPerformance([
      { name: longUrl, initiatorType: 'fetch', duration: 100, transferSize: 500, decodedBodySize: 1000, startTime: 50 },
    ]);
    const result = collectNetworkState();
    expect(result.requests[0].url.length).toBeLessThanOrEqual(200);
  });

  it('caps at 100 entries', () => {
    const entries = Array.from({ length: 150 }, (_, i) => ({
      name: `/api/${i}`, initiatorType: 'fetch', duration: 10, transferSize: 100, decodedBodySize: 200, startTime: i,
    }));
    mockPerformance(entries);
    const result = collectNetworkState();
    expect(result.requests).toHaveLength(100);
    expect(result.summary.total).toBe(150);
  });

  it('returns empty state when Performance API unavailable', () => {
    globalThis.performance = undefined;
    const result = collectNetworkState();
    expect(result.requests).toHaveLength(0);
    expect(result.summary.total).toBe(0);
  });

  it('sorts by startTime descending (most recent first)', () => {
    mockPerformance([
      { name: '/early', initiatorType: 'fetch', duration: 10, transferSize: 100, decodedBodySize: 200, startTime: 10 },
      { name: '/late', initiatorType: 'fetch', duration: 10, transferSize: 100, decodedBodySize: 200, startTime: 500 },
    ]);
    const result = collectNetworkState();
    expect(result.requests[0].url).toBe('/late');
  });
});
