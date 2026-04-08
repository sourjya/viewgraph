/**
 * Request Queue - Unit Tests
 *
 * Tests the in-memory capture request queue with TTL-based expiry.
 * The queue enables agents to request captures from the extension.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequestQueue } from '#src/request-queue.js';

describe('request queue', () => {
  let queue;

  beforeEach(() => {
    queue = createRequestQueue({ maxSize: 10, ttlMs: 60000 });
  });

  describe('create', () => {
    it('returns a request with id, url, status pending, and expiresAt', () => {
      const req = queue.create('http://localhost:5173/jobs');
      expect(req.id).toBeDefined();
      expect(req.url).toBe('http://localhost:5173/jobs');
      expect(req.status).toBe('pending');
      expect(req.expiresAt).toBeGreaterThan(Date.now());
      expect(req.captureFilename).toBeNull();
    });
  });

  describe('get', () => {
    it('returns the request by id', () => {
      const req = queue.create('http://localhost:5173');
      const found = queue.get(req.id);
      expect(found.id).toBe(req.id);
      expect(found.url).toBe('http://localhost:5173');
    });

    it('returns null for unknown id', () => {
      expect(queue.get('nope')).toBeNull();
    });
  });

  describe('acknowledge', () => {
    it('transitions pending to acknowledged', () => {
      const req = queue.create('http://localhost:5173');
      const acked = queue.acknowledge(req.id);
      expect(acked.status).toBe('acknowledged');
    });

    it('returns null for unknown id', () => {
      expect(queue.acknowledge('nope')).toBeNull();
    });
  });

  describe('complete', () => {
    it('sets status to completed and captureFilename', () => {
      const req = queue.create('http://localhost:5173');
      queue.acknowledge(req.id);
      const done = queue.complete(req.id, 'viewgraph-localhost-20260408.json');
      expect(done.status).toBe('completed');
      expect(done.captureFilename).toBe('viewgraph-localhost-20260408.json');
    });
  });

  describe('expiry', () => {
    it('marks expired requests on access', () => {
      const req = queue.create('http://localhost:5173');
      // Manually expire by setting expiresAt in the past
      vi.spyOn(Date, 'now').mockReturnValue(req.expiresAt + 1);
      const found = queue.get(req.id);
      expect(found.status).toBe('expired');
      vi.restoreAllMocks();
    });
  });

  describe('getPending', () => {
    it('returns only pending requests', () => {
      queue.create('http://localhost:5173');
      queue.create('http://localhost:3000');
      const req3 = queue.create('http://localhost:8040');
      queue.acknowledge(req3.id);

      const pending = queue.getPending();
      expect(pending).toHaveLength(2);
      pending.forEach((r) => expect(r.status).toBe('pending'));
    });
  });

  describe('capacity', () => {
    it('rejects when full', () => {
      for (let i = 0; i < 10; i++) queue.create(`http://localhost:${3000 + i}`);
      expect(() => queue.create('http://localhost:9999')).toThrow(/queue is full/i);
    });
  });

  describe('findByUrl', () => {
    it('matches normalized URLs (strips trailing slash)', () => {
      const req = queue.create('http://localhost:5173/jobs');
      const found = queue.findByUrl('http://localhost:5173/jobs/');
      expect(found.id).toBe(req.id);
    });

    it('returns null when no match', () => {
      queue.create('http://localhost:5173/jobs');
      expect(queue.findByUrl('http://localhost:3000')).toBeNull();
    });
  });
});
