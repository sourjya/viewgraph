/**
 * Tests for the in-memory request queue.
 *
 * Covers create, get, acknowledge, complete, expiry, getPending,
 * capacity limits, and URL matching. The queue is the coordination
 * layer between MCP tools (request_capture / get_request_status)
 * and the HTTP receiver that the browser extension polls.
 *
 * @see server/src/request-queue.js
 * @see .kiro/specs/mcp-request-bridge/design.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequestQueue } from '#src/request-queue.js';

describe('request-queue', () => {
  let queue;

  beforeEach(() => {
    queue = createRequestQueue({ maxSize: 10, ttlMs: 60_000 });
  });

  it('create returns { id, url, status: "pending", expiresAt }', () => {
    const req = queue.create('http://localhost:5173/jobs');
    expect(req).toMatchObject({
      url: 'http://localhost:5173/jobs',
      status: 'pending',
    });
    expect(req.id).toBeDefined();
    expect(req.expiresAt).toBeGreaterThan(Date.now());
  });

  it('get returns the request by id', () => {
    const req = queue.create('http://localhost:5173/jobs');
    const found = queue.get(req.id);
    expect(found.id).toBe(req.id);
    expect(found.url).toBe('http://localhost:5173/jobs');
  });

  it('acknowledge transitions pending to acknowledged', () => {
    const req = queue.create('http://localhost:5173/jobs');
    const acked = queue.acknowledge(req.id);
    expect(acked.status).toBe('acknowledged');
    expect(queue.get(req.id).status).toBe('acknowledged');
  });

  it('complete sets status and captureFilename', () => {
    const req = queue.create('http://localhost:5173/jobs');
    queue.acknowledge(req.id);
    const completed = queue.complete(req.id, 'viewgraph-localhost-20260408.json');
    expect(completed.status).toBe('completed');
    expect(completed.captureFilename).toBe('viewgraph-localhost-20260408.json');
  });

  it('expired requests return status "expired"', () => {
    // Create queue with 1ms TTL so it expires immediately
    const shortQueue = createRequestQueue({ maxRequests: 10, ttlMs: 1 });
    const req = shortQueue.create('http://localhost:5173/jobs');

    // Advance time past TTL
    vi.useFakeTimers();
    vi.advanceTimersByTime(10);
    const found = shortQueue.get(req.id);
    expect(found.status).toBe('expired');
    vi.useRealTimers();
  });

  it('getPending returns only pending requests', () => {
    queue.create('http://localhost:5173/a');
    const reqB = queue.create('http://localhost:5173/b');
    queue.create('http://localhost:5173/c');
    queue.acknowledge(reqB.id);

    const pending = queue.getPending();
    expect(pending).toHaveLength(2);
    expect(pending.every(r => r.status === 'pending')).toBe(true);
  });

  it('rejects when queue is full', () => {
    const tinyQueue = createRequestQueue({ maxSize: 2, ttlMs: 60_000 });
    tinyQueue.create('http://localhost/a');
    tinyQueue.create('http://localhost/b');
    expect(() => tinyQueue.create('http://localhost/c')).toThrow(/full/i);
  });

  it('findByUrl matches normalized URLs', () => {
    // Trailing slash should not matter
    const req = queue.create('http://localhost:5173/jobs/');
    const found = queue.findByUrl('http://localhost:5173/jobs');
    expect(found).toBeDefined();
    expect(found.id).toBe(req.id);
  });
});
