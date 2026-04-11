/**
 * ViewGraph v2 Parser
 *
 * Parses ViewGraph v2 capture JSON files using plain keys:
 * "metadata", "nodes", "summary", "relations", "details", "annotations".
 *
 * Each function returns a result object { ok, data/error } - never throws.
 *
 * Three parse levels for different use cases:
 * - parseMetadata: fast, for indexing (reads only metadata + checks annotations)
 * - parseSummary: medium, for get_page_summary (metadata + summary)
 * - parseCapture: full, for get_capture (all sections)
 */

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
  if (!raw.metadata) {
    return { ok: false, error: 'Missing metadata section' };
  }

  const meta = raw.metadata;
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
      session: meta.session ?? null,
      hasAnnotations: 'annotations' in raw,
    },
  };
}

/**
 * Normalize annotations for backward compatibility.
 * Old captures may lack uuid, severity, timestamp, resolved fields.
 * Generates stable UUIDs from filename context when missing.
 */
function normalizeAnnotations(annotations) {
  if (!annotations) return null;
  return annotations.map((a, i) => ({
    uuid: a.uuid || `legacy-${i}-${(a.id || i)}`,
    type: a.type || 'element',
    severity: a.severity || '',
    timestamp: a.timestamp || null,
    resolved: a.resolved || false,
    resolution: a.resolution || null,
    ...a,
  }));
}

/**
 * Full parse of all sections - for get_capture and detailed analysis.
 */
export function parseCapture(jsonString) {
  const parsed = safeParse(jsonString);
  if (!parsed.ok) return parsed;

  const raw = parsed.data;
  if (!raw.metadata) {
    return { ok: false, error: 'Missing metadata section' };
  }

  return {
    ok: true,
    data: {
      metadata: raw.metadata,
      nodes: raw.nodes ?? null,
      summary: raw.summary ?? null,
      relations: raw.relations ?? null,
      details: raw.details ?? null,
      annotations: normalizeAnnotations(raw.annotations),
      network: raw.network ?? null,
      console: raw.console ?? null,
      breakpoints: raw.breakpoints ?? null,
      stacking: raw.stacking ?? null,
      focus: raw.focus ?? null,
      scroll: raw.scroll ?? null,
      landmarks: raw.landmarks ?? null,
      components: raw.components ?? null,
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
  if (!raw.metadata) {
    return { ok: false, error: 'Missing metadata section' };
  }

  const meta = raw.metadata;
  const summary = raw.summary;
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
      networkSummary: raw.network?.summary ?? null,
      consoleSummary: raw.console?.summary ?? null,
      breakpoints: raw.breakpoints ?? null,
      stackingIssues: raw.stacking?.issues?.length ?? 0,
      focusIssues: raw.focus?.issues?.length ?? 0,
      scrollContainers: raw.scroll?.containers?.length ?? 0,
      landmarkIssues: raw.landmarks?.issues?.length ?? 0,
      framework: raw.components?.framework ?? 'unknown',
      componentCount: raw.components?.components?.length ?? 0,
    },
  };
}
