/**
 * ViewGraph v2 Parser
 *
 * Parses ViewGraph v2 capture JSON files. Supports both formats:
 * - Plain keys (ViewGraph v2.1+): "metadata", "nodes", "summary", etc.
 * - SiFR markers (legacy/Element to LLM): "====METADATA====", etc.
 *
 * Each function returns a result object { ok, data/error } - never throws.
 *
 * Three parse levels for different use cases:
 * - parseMetadata: fast, for indexing (reads only metadata + checks annotations)
 * - parseSummary: medium, for get_page_summary (metadata + summary)
 * - parseCapture: full, for get_capture (all sections)
 */

/**
 * Resolve a section from a parsed JSON object, checking plain key first,
 * then falling back to SiFR marker key for backward compatibility.
 */
function getSection(raw, plainKey) {
  const sifrKey = `====${plainKey.toUpperCase()}====`;
  return raw[plainKey] ?? raw[sifrKey] ?? undefined;
}

/** Check if a section exists in either key format. */
function hasSection(raw, plainKey) {
  return getSection(raw, plainKey) !== undefined;
}

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
 * Extract metadata from a capture - fast path for indexing.
 * Only reads the metadata section and checks for annotations presence.
 */
export function parseMetadata(jsonString) {
  const parsed = safeParse(jsonString);
  if (!parsed.ok) return parsed;

  const raw = parsed.data;
  const meta = getSection(raw, 'metadata');
  if (!meta) {
    return { ok: false, error: 'Missing metadata section' };
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
      hasAnnotations: hasSection(raw, 'annotations'),
    },
  };
}

/**
 * Full parse of all sections - for get_capture and detailed analysis.
 */
export function parseCapture(jsonString) {
  const parsed = safeParse(jsonString);
  if (!parsed.ok) return parsed;

  const raw = parsed.data;
  if (!getSection(raw, 'metadata')) {
    return { ok: false, error: 'Missing metadata section' };
  }

  return {
    ok: true,
    data: {
      metadata: getSection(raw, 'metadata'),
      nodes: getSection(raw, 'nodes') ?? null,
      summary: getSection(raw, 'summary') ?? null,
      relations: getSection(raw, 'relations') ?? null,
      details: getSection(raw, 'details') ?? null,
      annotations: getSection(raw, 'annotations') ?? null,
    },
  };
}

/**
 * Extract summary data - for get_page_summary tool.
 * Combines metadata and summary into a compact overview.
 */
export function parseSummary(jsonString) {
  const parsed = safeParse(jsonString);
  if (!parsed.ok) return parsed;

  const raw = parsed.data;
  const meta = getSection(raw, 'metadata');
  const summary = getSection(raw, 'summary');

  if (!meta) {
    return { ok: false, error: 'Missing metadata section' };
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
