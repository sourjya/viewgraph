/**
 * Tests for native messaging host protocol.
 * Covers: length-prefix encoding/decoding, message routing, chunking.
 *
 * @see server/src/native-host.js
 * @see ADR-013 native messaging transport
 */

import { describe, it, expect } from 'vitest';
import { encodeMessage, decodeMessage, chunkMessage, reassembleChunks } from '#src/native-host.js';

describe('native messaging protocol', () => {
  // ──────────────────────────────────────────────
  // Length-prefix encoding/decoding
  // ──────────────────────────────────────────────

  it('(+) encodeMessage returns Buffer with 4-byte length prefix + JSON', () => {
    const buf = encodeMessage({ type: 'health' });
    expect(buf).toBeInstanceOf(Buffer);
    // First 4 bytes = little-endian uint32 length of JSON
    const jsonLen = buf.readUInt32LE(0);
    const json = buf.subarray(4).toString('utf-8');
    expect(json.length).toBe(jsonLen);
    expect(JSON.parse(json)).toEqual({ type: 'health' });
  });

  it('(+) decodeMessage extracts JSON from length-prefixed buffer', () => {
    const original = { type: 'info', data: { version: '0.3.6' } };
    const encoded = encodeMessage(original);
    const decoded = decodeMessage(encoded);
    expect(decoded).toEqual(original);
  });

  it('(-) decodeMessage returns null for buffer too short', () => {
    expect(decodeMessage(Buffer.alloc(2))).toBeNull();
  });

  it('(-) decodeMessage returns null for invalid JSON', () => {
    const buf = Buffer.alloc(8);
    buf.writeUInt32LE(4, 0);
    buf.write('nope', 4);
    expect(decodeMessage(buf)).toBeNull();
  });

  // ──────────────────────────────────────────────
  // Chunking
  // ──────────────────────────────────────────────

  it('(+) chunkMessage returns single chunk for small messages', () => {
    const msg = { type: 'capture', payload: { small: true } };
    const chunks = chunkMessage(msg, 900000);
    expect(chunks.length).toBe(1);
    expect(chunks[0].type).toBe('capture');
  });

  it('(+) chunkMessage splits large messages', () => {
    const bigPayload = 'x'.repeat(2000);
    const msg = { type: 'capture', payload: bigPayload };
    const chunks = chunkMessage(msg, 1000); // low threshold for testing
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].type).toBe('chunk');
    expect(chunks[0].index).toBe(0);
    expect(chunks[0].total).toBe(chunks.length);
  });

  it('(+) reassembleChunks reconstructs original message', () => {
    const msg = { type: 'capture', payload: 'x'.repeat(2000) };
    const chunks = chunkMessage(msg, 1000);
    const reassembled = reassembleChunks(chunks);
    expect(reassembled).toEqual(msg);
  });

  it('(-) reassembleChunks returns null for incomplete chunks', () => {
    const msg = { type: 'capture', payload: 'x'.repeat(2000) };
    const chunks = chunkMessage(msg, 1000);
    chunks.pop(); // remove last chunk
    expect(reassembleChunks(chunks)).toBeNull();
  });

  // ──────────────────────────────────────────────
  // Stdin buffer accumulation (used by server/index.js native host mode)
  // ──────────────────────────────────────────────

  it('(+) multiple messages in one buffer are decoded correctly', () => {
    const msg1 = encodeMessage({ type: 'health' });
    const msg2 = encodeMessage({ type: 'info' });
    const combined = Buffer.concat([msg1, msg2]);

    let buf = combined;
    const decoded = [];
    while (buf.length >= 4) {
      const msgLen = buf.readUInt32LE(0);
      if (buf.length < 4 + msgLen) break;
      const msgBuf = buf.subarray(0, 4 + msgLen);
      buf = buf.subarray(4 + msgLen);
      decoded.push(decodeMessage(msgBuf));
    }
    expect(decoded).toEqual([{ type: 'health' }, { type: 'info' }]);
    expect(buf.length).toBe(0);
  });

  it('(+) partial message waits for more data', () => {
    const full = encodeMessage({ type: 'health' });
    const partial = full.subarray(0, 6);

    let buf = partial;
    const decoded = [];
    while (buf.length >= 4) {
      const msgLen = buf.readUInt32LE(0);
      if (buf.length < 4 + msgLen) break;
      decoded.push(decodeMessage(buf.subarray(0, 4 + msgLen)));
      buf = buf.subarray(4 + msgLen);
    }
    expect(decoded).toEqual([]);
    expect(buf.length).toBe(6);
  });
});
