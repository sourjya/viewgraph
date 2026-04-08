/**
 * ViewGraph v2 Parser
 *
 * Parses ViewGraph v2 capture JSON files. The format uses section delimiters
 * like "====METADATA====" as top-level keys. Each function returns a result
 * object { ok, data/error } — never throws.
 *
 * Three parse levels for different use cases:
 * - parseMetadata: fast, for indexing (reads only METADATA + checks ANNOTATIONS)
 * - parseSummary: medium, for get_page_summary (METADATA + SUMMARY)
 * - parseCapture: full, for get_capture (all sections)
 */

import { FORMAT_VERSION } from '../constants.js';

// Section key constants — match the JSON top-level keys
const SECTIONS = {
  METADATA: '====METADATA====',
  NODES: '====NODES====',
  SUMMARY: '====SUMMARY====',
  RELATIONS: '====RELATIONS====',
  DETAILS: '====DETAILS====',
  ANNOTATIONS: '====ANNOTATIONS====',
};

/**
 * Safely parse JSON, returning a result object instead of throwing.
 */
function safeParse(jsonString) {
  try {
    return { ok: true, data: JSON.parse(jsonString) };
  } catch (err) {
    return { ok: false, error: `JSON parse error: ${err.message}` };
  }
}

/**
 * Extract metadata from a capture — fast path for indexing.
 * Only reads the METADATA section and checks for ANNOTATIONS presence.
 */
export function parseMetadata(jsonString) {
  const parsed = safeParse(jsonString);
  if (!parsed.ok) return parsed;

  const raw = parsed.data;
  const meta = raw[SECTIONS.METADATA];
  if (!meta) {
    return { ok: false, error: 'Missing ====METADATA==== section' };
  }

  return {
    ok: true,
    data: {
      format: meta.format,
      url: meta.url,
      title: meta.title,
      timestamp: meta.timestamp,
      viewport: meta.viewport,
      nodeCount: meta.stats?.totalNodes ?? 0,
      captureMode: meta.captureMode ?? 'unknown',
      hasAnnotations: SECTIONS.ANNOTATIONS in raw,
    },
  };
}

/**
 * Full parse of all sections — for get_capture and detailed analysis.
 */
export function parseCapture(jsonString) {
  const parsed = safeParse(jsonString);
  if (!parsed.ok) return parsed;

  const raw = parsed.data;
  if (!raw[SECTIONS.METADATA]) {
    return { ok: false, error: 'Missing ====METADATA==== section' };
  }

  return {
    ok: true,
    data: {
      metadata: raw[SECTIONS.METADATA],
      nodes: raw[SECTIONS.NODES] ?? null,
      summary: raw[SECTIONS.SUMMARY] ?? null,
      relations: raw[SECTIONS.RELATIONS] ?? null,
      details: raw[SECTIONS.DETAILS] ?? null,
      annotations: raw[SECTIONS.ANNOTATIONS] ?? null,
    },
  };
}

/**
 * Extract summary data — for get_page_summary tool.
 * Combines METADATA and SUMMARY into a compact overview.
 */
export function parseSummary(jsonString) {
  const parsed = safeParse(jsonString);
  if (!parsed.ok) return parsed;

  const raw = parsed.data;
  const meta = raw[SECTIONS.METADATA];
  const summary = raw[SECTIONS.SUMMARY];

  if (!meta) {
    return { ok: false, error: 'Missing ====METADATA==== section' };
  }

  const salience = meta.stats?.salience ?? {};

  return {
    ok: true,
    data: {
      url: meta.url,
      title: meta.title,
      viewport: meta.viewport,
      layout: summary?.layout ?? null,
      styles: summary?.styles ?? null,
      elementCounts: {
        high: salience.high ?? 0,
        med: salience.med ?? 0,
        low: salience.low ?? 0,
        total: meta.stats?.totalNodes ?? 0,
      },
      clusterCount: meta.stats?.clusters ?? 0,
      clusters: summary?.clusters ?? [],
    },
  };
}
