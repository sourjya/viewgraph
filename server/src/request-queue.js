/**
 * Request Queue
 *
 * In-memory queue for capture requests from agents. The agent creates a
 * request via MCP tool, the extension polls for pending requests via HTTP,
 * and submits the completed capture back.
 *
 * Expiry is lazy - checked on access, no background timers.
 */

import { randomUUID } from 'crypto';

/** Normalize a URL for matching: strip trailing slash, ignore query/hash. */
function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    return (parsed.origin + parsed.pathname).replace(/\/+$/, '');
  } catch {
    return url.replace(/\/+$/, '');
  }
}

/**
 * Create a request queue with configurable max size and TTL.
 * @param {{ maxSize?: number, ttlMs?: number }} options
 */
export function createRequestQueue({ maxSize = 10, ttlMs = 60000 } = {}) {
  const requests = new Map();

  /** Check and apply expiry to a request. */
  function applyExpiry(req) {
    if (req.status !== 'completed' && req.status !== 'expired' && Date.now() > req.expiresAt) {
      req.status = 'expired';
    }
    return req;
  }

  return {
    /** Create a new pending capture request. */
    create(url, options = {}) {
      // Count non-terminal requests toward capacity
      const active = [...requests.values()].filter(
        (r) => r.status === 'pending' || r.status === 'acknowledged',
      ).length;
      if (active >= maxSize) throw new Error('Queue is full');

      const req = {
        id: randomUUID().slice(0, 8),
        url,
        status: 'pending',
        createdAt: Date.now(),
        expiresAt: Date.now() + ttlMs,
        captureFilename: null,
      };
      if (options.guidance) req.guidance = options.guidance;
      if (options.purpose) req.purpose = options.purpose;
      requests.set(req.id, req);
      return req;
    },

    /** Get a request by ID. Returns null if not found. */
    get(id) {
      const req = requests.get(id);
      if (!req) return null;
      return applyExpiry(req);
    },

    /** Transition a pending request to acknowledged. */
    acknowledge(id) {
      const req = requests.get(id);
      if (!req) return null;
      applyExpiry(req);
      if (req.status === 'pending') req.status = 'acknowledged';
      return req;
    },

    /** Mark a request as completed with the capture filename. */
    complete(id, filename) {
      const req = requests.get(id);
      if (!req) return null;
      req.status = 'completed';
      req.captureFilename = filename;
      return req;
    },

    /**
     * Mark a request as declined by the user.
     * The agent can poll get_request_status and see the decline + reason.
     * @param {string} id - Request ID
     * @param {string} [reason] - Optional reason from the user
     */
    decline(id, reason) {
      const req = requests.get(id);
      if (!req) return null;
      req.status = 'declined';
      if (reason) req.declineReason = reason;
      return req;
    },

    /** Get all pending (non-expired) requests. */
    getPending() {
      return [...requests.values()]
        .map(applyExpiry)
        .filter((r) => r.status === 'pending');
    },

    /** Find the first pending/acknowledged request matching a URL. */
    findByUrl(url) {
      const normalized = normalizeUrl(url);
      for (const req of requests.values()) {
        applyExpiry(req);
        if ((req.status === 'pending' || req.status === 'acknowledged') && normalizeUrl(req.url) === normalized) {
          return req;
        }
      }
      return null;
    },
  };
}
