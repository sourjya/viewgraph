/**
 * Native Messaging Host Protocol
 *
 * Implements Chrome/Firefox native messaging protocol: length-prefixed
 * JSON over stdin/stdout. Provides encoding, decoding, and chunking
 * for messages that exceed the 1MB browser limit.
 *
 * @see ADR-013 native messaging transport
 * @see .kiro/specs/native-messaging/design.md
 */

/**
 * Encode a message as a length-prefixed buffer for native messaging.
 * Format: 4-byte little-endian uint32 (JSON length) + JSON bytes.
 * @param {object} msg - Message to encode
 * @returns {Buffer}
 */
export function encodeMessage(msg) {
  const json = JSON.stringify(msg);
  const jsonBuf = Buffer.from(json, 'utf-8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(jsonBuf.length, 0);
  return Buffer.concat([header, jsonBuf]);
}

/**
 * Decode a length-prefixed buffer into a message object.
 * @param {Buffer} buf - Raw buffer from stdin
 * @returns {object|null} Parsed message or null if invalid
 */
export function decodeMessage(buf) {
  if (!buf || buf.length < 4) return null;
  const jsonLen = buf.readUInt32LE(0);
  if (buf.length < 4 + jsonLen) return null;
  try {
    return JSON.parse(buf.subarray(4, 4 + jsonLen).toString('utf-8'));
  } catch {
    return null;
  }
}

/** Default chunk threshold (900KB, under Chrome's 1MB limit). */
const DEFAULT_CHUNK_SIZE = 900000;

/**
 * Split a message into chunks if it exceeds the size threshold.
 * Small messages are returned as-is in a single-element array.
 * @param {object} msg - Message to potentially chunk
 * @param {number} [maxSize] - Max JSON size per chunk in bytes
 * @returns {Array<object>} Array of messages (1 if no chunking needed)
 */
export function chunkMessage(msg, maxSize = DEFAULT_CHUNK_SIZE) {
  const json = JSON.stringify(msg);
  if (json.length <= maxSize) return [msg];

  const id = crypto.randomUUID().slice(0, 8);
  const chunks = [];
  for (let i = 0; i < json.length; i += maxSize) {
    chunks.push({
      type: 'chunk',
      id,
      index: chunks.length,
      total: 0, // filled below
      data: json.slice(i, i + maxSize),
    });
  }
  for (const c of chunks) c.total = chunks.length;
  return chunks;
}

/**
 * Reassemble chunked messages into the original message.
 * @param {Array<object>} chunks - Chunk messages with same id
 * @returns {object|null} Reassembled message or null if incomplete
 */
export function reassembleChunks(chunks) {
  if (!chunks?.length) return null;
  const sorted = [...chunks].sort((a, b) => a.index - b.index);
  if (sorted.length !== sorted[0].total) return null;
  const json = sorted.map((c) => c.data).join('');
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
