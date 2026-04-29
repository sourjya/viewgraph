/**
 * ViewGraph v2.3 Serializer
 *
 * Assembles a ViewGraph v2.3 JSON capture from scored element data.
 * Produces all required sections: metadata, summary, nodes, relations,
 * provenance, styleTable, details.
 *
 * Runs in the content script context. Returns a plain object (not stringified).
 */

import { extractStyles } from './traverser.js';

/** Default viewport fallback for test environments where window is unavailable. */
const DEFAULT_VIEWPORT = { w: 1920, h: 1080 };

/**
 * Lazily extract styles from an element's _computedRef.
 * Only called for high/med salience nodes to avoid wasted work on low nodes.
 * @param {object} el - Scored element with _computedRef
 * @returns {object|null} Style groups or null
 */
function getStyles(el) {
  if (el.styles) return el.styles;
  if (el._computedRef) {
    el.styles = extractStyles(el._computedRef);
    delete el._computedRef; // Free the CSSStyleDeclaration reference
  }
  return el.styles || null;
}

/**
 * Build the metadata section from page state.
 * @param {Array} elements - Scored elements
 * @returns {object}
 */
function buildMetadata(elements) {
  const salience = { high: 0, med: 0, low: 0 };
  elements.forEach((el) => salience[el.salience]++);

  return {
    format: 'viewgraph-v2',
    version: '2.4.0',
    profile: 'readable',
    timestamp: new Date().toISOString(),
    url: window.location.href,
    title: document.title,
    captureMode: 'viewgraph-capture',
    viewport: { width: window.innerWidth, height: window.innerHeight },
    coordinateFrame: {
      unit: 'css-px',
      origin: 'document-top-left',
      scrollOffset: { x: window.scrollX, y: window.scrollY },
      precision: 'round',
    },
    devicePixelRatio: window.devicePixelRatio,
    stats: {
      totalNodes: elements.length,
      salience,
      inOutput: { ...salience },
      captureSizeBytes: 0, // updated after serialization
      sizeLimitBytes: 409600,
    },
    structuralFingerprint: computeFingerprint(elements),
    compactCodec: {
      actions: { clickable: 'c', fillable: 'f', hoverable: 'h', scrollable: 's', navigable: 'n', draggable: 'd' },
      axStates: { focusable: 'fo', editable: 'ed', required: 'rq', disabled: 'ds', expanded: 'ex', selected: 'sl', checked: 'ck' },
      tiers: { high: 'h', med: 'm', low: 'l' },
      tags: { button: 'btn', input: 'inp', a: 'lnk', select: 'sel', textarea: 'txt', dialog: 'dlg', nav: 'nav', form: 'frm' },
    },
    extension: { name: 'ViewGraph Capture', version: (typeof chrome !== 'undefined' && chrome.runtime?.getManifest?.()?.version) || 'unknown' },
  };
}

/**
 * Build the summary section - page overview for LLM orientation.
 */
function buildSummary(elements, metadata) {
  // Extract style palette from high-salience elements
  const fonts = new Set();
  const fontSizes = new Set();
  const colors = new Set();
  const bgColors = new Set();

  elements.filter((el) => el.salience === 'high' || el.salience === 'med').forEach((el) => {
    const styles = getStyles(el);
    if (styles?.typography?.['font-family']) fonts.add(styles.typography['font-family']);
    if (styles?.typography?.['font-size']) fontSizes.add(styles.typography['font-size']);
    if (styles?.visual?.color) colors.add(styles.visual.color);
    if (styles?.visual?.['background-color']) bgColors.add(styles.visual['background-color']);
  });

  // High-salience interactive elements for quick reference
  const keyElements = elements
    .filter((el) => el.salience === 'high' && el.isInteractive)
    .slice(0, 20)
    .map((el) => ({
      nid: el.nid,
      alias: el.alias,
      tag: el.tag,
      actions: el.isInteractive ? ['clickable'] : [],
      visibleText: el.visibleText.slice(0, 50),
      bbox: el.bbox,
    }));

  return {
    page: {
      title: metadata.title,
      url: metadata.url,
      viewport: metadata.viewport,
      totalNodes: metadata.stats.totalNodes,
      salienceCounts: metadata.stats.salience,
    },
    styles: {
      primaryFontFamily: [...fonts][0] || null,
      fontSizesPx: [...fontSizes].slice(0, 8),
      primaryTextColor: [...colors][0] || null,
      primaryBackgroundColor: [...bgColors][0] || null,
    },
    elements: keyElements,
  };
}

/**
 * Build the nodes section - element tree grouped by salience tier.
 */
function buildNodes(elements) {
  const nodes = { high: {}, med: {}, low: {} };
  const viewport = { w: typeof window !== 'undefined' ? window.innerWidth : DEFAULT_VIEWPORT.w, h: typeof window !== 'undefined' ? window.innerHeight : DEFAULT_VIEWPORT.h };

  // Viewport-first ordering: sort inViewport elements first within each tier
  const sorted = [...elements].sort((a, b) => {
    if (a.salience !== b.salience) return 0; // Keep tier grouping
    const aVp = isInViewport(a.bbox, viewport) ? 0 : 1;
    const bVp = isInViewport(b.bbox, viewport) ? 0 : 1;
    return aVp - bVp;
  });

  for (const el of sorted) {
    const tier = nodes[el.salience];
    if (!tier[el.tag]) tier[el.tag] = {};
    tier[el.tag][el.nid] = {
      alias: el.alias,
      parent: el.parentNid,
      children: el.childNids,
      actions: el.isInteractive ? ['clickable'] : undefined,
      isRendered: el.isRendered,
      inViewport: isInViewport(el.bbox, viewport),
      cluster: null,
    };
  }
  return nodes;
}

/**
 * CSS defaults that carry zero information. Omitting these saves ~40% of style tokens.
 * Values validated by experiment: scripts/experiments/token-efficiency/
 * @see docs/ideas/token-efficiency-experiments.md - Experiment 2
 */
const CSS_DEFAULTS = {
  position: 'static',
  visibility: 'visible',
  overflow: 'visible',
  opacity: '1',
  'flex-direction': 'row',
  'text-align': 'start',
  'font-weight': '400',
  'font-style': 'normal',
  'text-decoration': 'none',
  'text-transform': 'none',
  'white-space': 'normal',
  'box-sizing': 'content-box',
  float: 'none',
  clear: 'none',
  'z-index': 'auto',
  'vertical-align': 'baseline',
  cursor: 'auto',
  'pointer-events': 'auto',
};

/** Values that are effectively "no value" for specific properties. */
const ZERO_PATTERNS = {
  margin: /^0px( 0px)*$/,
  padding: /^0px( 0px)*$/,
  'border-radius': /^0px$/,
  gap: /^normal$/,
};

/**
 * Check if a border value is effectively "no border".
 * @param {string} val - CSS border shorthand value
 * @returns {boolean}
 */
function isDefaultBorder(val) {
  return /^0px\s+none\b/.test(val);
}

/**
 * Filter out browser default values from a style group.
 * Returns a new object with only non-default properties, or null if all defaults.
 * @param {object} group - Style group (e.g., { display: 'block', position: 'static' })
 * @returns {object|null}
 */
function filterDefaults(group) {
  if (!group || typeof group !== 'object') return group;
  const filtered = {};
  let hasNonDefault = false;
  for (const [prop, val] of Object.entries(group)) {
    // Skip known defaults
    if (CSS_DEFAULTS[prop] === val) continue;
    // Skip zero-value patterns
    if (ZERO_PATTERNS[prop]?.test(val)) continue;
    // Skip default borders
    if (prop === 'border' && isDefaultBorder(val)) continue;
    // Skip transparent backgrounds
    if (prop === 'background-color' && (val === 'rgba(0, 0, 0, 0)' || val === 'transparent')) continue;
    // Skip none values for optional properties
    if ((prop === 'box-shadow' || prop === 'transform' || prop === 'text-decoration') && val === 'none') continue;
    if (prop === 'text-decoration' && val.startsWith('none ')) continue;

    filtered[prop] = val;
    hasNonDefault = true;
  }
  return hasNonDefault ? filtered : null;
}

/**
 * Filter defaults from all style groups. Returns cleaned styles or null if empty.
 * @param {object} styles - Style object with groups (layout, visual, typography, spacing, flexbox)
 * @returns {object|null}
 */
function filterStyleDefaults(styles) {
  if (!styles) return null;
  const cleaned = {};
  let hasContent = false;
  for (const [group, props] of Object.entries(styles)) {
    const filtered = filterDefaults(props);
    if (filtered) { cleaned[group] = filtered; hasContent = true; }
  }
  return hasContent ? cleaned : null;
}

/**
 * Simple hash for style deduplication. Uses JSON.stringify for deterministic output.
 * @param {object} styles - Filtered style object
 * @returns {string} Hash string
 */
function hashStyles(styles) {
  const str = JSON.stringify(styles);
  // Simple djb2 hash - fast, good distribution, no crypto dependency
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0x7fffffff;
  return 's' + hash.toString(36);
}

/**
 * Build the details section - full element details by tier.
 * Applies default omission and style deduplication.
 * @returns {{ details: object, styleTable: object }}
 */
function buildDetails(elements) {
  const details = { high: {}, med: {}, low: {} };
  const styleMap = new Map(); // hash -> styles object
  const styleRefMap = new Map(); // hash -> ref id

  for (const el of elements) {
    const tier = details[el.salience];
    if (!tier[el.tag]) tier[el.tag] = {};

    const entry = {
      locators: buildLocators(el),
      attributes: el.attributes,
      visibleText: el.visibleText,
      layout: { bboxDocument: el.bbox },
    };

    // Progressive style disclosure with default omission + dedup
    let styles = null;
    if (el.salience === 'high') {
      styles = filterStyleDefaults(getStyles(el));
    } else if (el.salience === 'med') {
      const rawStyles = getStyles(el);
      if (rawStyles) {
        const { layout, visual, typography, spacing } = rawStyles;
        const medStyles = {};
        if (layout) medStyles.layout = layout;
        if (visual) medStyles.visual = visual;
        if (typography) medStyles.typography = typography;
        if (spacing) medStyles.spacing = spacing;
        styles = filterStyleDefaults(medStyles);
      }
    }
    // low: no styles

    if (styles) {
      const hash = hashStyles(styles);
      if (!styleMap.has(hash)) {
        styleMap.set(hash, styles);
        styleRefMap.set(hash, hash);
      }
      entry.styleRef = hash;
    }

    tier[el.tag][el.nid] = entry;
  }

  // Build style table from unique styles
  const styleTable = {};
  for (const [hash, styles] of styleMap) {
    styleTable[hash] = styles;
  }

  return { details, styleTable };
}

/**
 * Build ranked locator array for an element.
 */
function buildLocators(el) {
  const locators = [];
  let rank = 1;
  if (el.testid) locators.push({ strategy: 'testId', value: el.testid, rank: rank++ });
  if (el.htmlId) locators.push({ strategy: 'id', value: el.htmlId, rank: rank++ });
  if (el.role && el.ariaLabel) locators.push({ strategy: 'role', value: el.role, name: el.ariaLabel, rank: rank++ });
  locators.push({ strategy: 'css', value: el.selector, rank });
  return locators;
}

/**
 * Build the relations section from extracted relations.
 */
function buildRelations(relations) {
  return {
    semantic: relations.map((r) => ({ source: r.source, target: r.target, type: r.type })),
    groups: [],
  };
}

/**
 * Build the provenance table - declares the source of each field type.
 * Hybrid approach: table covers all fields, per-node overrides only when needed.
 * <2% token overhead validated by experiment (28.3% of fields are non-measured).
 * @see docs/ideas/provenance-metadata.md - Option C (Hybrid)
 * @returns {object}
 */
function buildProvenance() {
  return {
    defaults: {
      'bboxDocument': 'measured',
      'visibleText': 'measured',
      'styles.*': 'measured',
      'attributes.*': 'measured',
      'locators[strategy=testId]': 'measured',
      'locators[strategy=id]': 'measured',
      'locators[strategy=css]': 'derived',
      'locators[strategy=role]': 'measured',
      'alias': 'derived',
      'actions': 'derived',
      'isRendered': 'derived',
      'salience': 'derived',
      'cluster': 'inferred',
      'parent': 'measured',
      'children': 'measured',
      'network': 'measured',
      'console': 'measured',
      'breakpoints': 'derived',
      'stacking': 'derived',
      'focus': 'derived',
      'scroll': 'measured',
      'landmarks': 'measured',
      'components': 'inferred',
      'annotations': 'user',
    },
  };
}

/**
 * Build the Action Manifest - pre-joined flat index of all interactive elements.
 * This is the primary agent entry point. Replaces the 2-pass nodes+details join.
 * Each element gets a stable short ref (e1, e2, ...) assigned in document order.
 *
 * @see docs/architecture/viewgraph-v3-agentic-enhancements.md - Enhancement 1 & 2
 * @param {Array} elements - Scored elements
 * @returns {object} Action manifest with byAction groups and stats
 */
function buildActionManifest(elements) {
  const viewport = { w: typeof window !== 'undefined' ? window.innerWidth : DEFAULT_VIEWPORT.w, h: typeof window !== 'undefined' ? window.innerHeight : DEFAULT_VIEWPORT.h };
  let refCounter = 1;
  const byAction = { clickable: [], fillable: [], navigable: [] };

  // Sort: in-viewport first, then by salience (high > med > low), then document order
  const actionable = elements.filter((el) => el.isInteractive || el.tag === 'a' || el.tag === 'select');
  const sorted = actionable.sort((a, b) => {
    const aInVp = isInViewport(a.bbox, viewport) ? 0 : 1;
    const bInVp = isInViewport(b.bbox, viewport) ? 0 : 1;
    if (aInVp !== bInVp) return aInVp - bInVp;
    const salOrder = { high: 0, med: 1, low: 2 };
    return (salOrder[a.salience] || 2) - (salOrder[b.salience] || 2);
  });

  const viewportRefs = [];

  for (const el of sorted) {
    const ref = `e${refCounter++}`;
    const inVp = isInViewport(el.bbox, viewport);
    const entry = {
      ref,
      nid: el.nid,
      alias: el.alias,
      tag: el.tag,
      axName: el.ariaLabel || el.text?.slice(0, 50) || '',
      bbox: el.bbox,
      locator: el.testid ? { strategy: 'testId', value: el.testid }
        : el.htmlId ? { strategy: 'id', value: el.htmlId }
        : { strategy: 'css', value: el.selector },
      inViewport: inVp,
    };

    if (inVp) viewportRefs.push(ref);

    // Classify by action type
    const tag = el.tag;
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      byAction.fillable.push(entry);
    } else if (tag === 'a') {
      byAction.navigable.push(entry);
    } else {
      byAction.clickable.push(entry);
    }
  }

  return {
    version: 1,
    byAction,
    viewportRefs,
    stats: {
      clickable: byAction.clickable.length,
      fillable: byAction.fillable.length,
      navigable: byAction.navigable.length,
      total: refCounter - 1,
      inViewport: viewportRefs.length,
    },
    refScheme: { type: 'sequential-e', lastRef: `e${refCounter - 1}` },
    // TOON compact text: header-then-rows for ~87% token reduction vs JSON
    compact: buildToonManifest(byAction),
  };
}

/**
 * Build TOON-format compact text for the action manifest.
 * Header-then-rows format: ~87% fewer tokens than JSON for tabular data.
 * @see docs/architecture/viewgraph-v3-format-agentic-enhancements.md - Enhancement 6
 * @param {object} byAction - Action groups from buildActionManifest
 * @returns {string} TOON-format text
 */
function buildToonManifest(byAction) {
  const lines = ['# fields: ref tag alias axName locator bbox inViewport'];
  for (const [action, entries] of Object.entries(byAction)) {
    if (!entries.length) continue;
    lines.push(`${action}[${entries.length}]:`);
    for (const e of entries) {
      const loc = e.locator ? `${e.locator.strategy}:${e.locator.value}` : '-';
      const bbox = e.bbox ? `[${e.bbox.join(',')}]` : '-';
      lines.push(`${e.ref} ${e.tag} ${e.alias || '-'} "${(e.axName || '').replace(/"/g, '\\"')}" ${loc} ${bbox} ${e.inViewport ? 'Y' : 'N'}`);
    }
  }
  return lines.join('\n');
}

/** Check if a bbox [x, y, w, h] is within the viewport. */
function isInViewport(bbox, viewport) {
  if (!bbox || bbox.length < 4) return false;
  const [x, y, w, h] = bbox;
  const scrollX = typeof window !== 'undefined' ? window.scrollX : 0;
  const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
  const vx = x - scrollX;
  const vy = y - scrollY;
  return vx + w > 0 && vy + h > 0 && vx < viewport.w && vy < viewport.h;
}

/**
 * Compute a structural fingerprint for cache-hit detection.
 * SHA-256 of sorted node topology (nid, tag, parent, children, actions).
 * If consecutive captures share fingerprints, only text/styles changed.
 * @param {Array} elements
 * @returns {string} Hex fingerprint
 */
function computeFingerprint(elements) {
  // Simple djb2 hash of topology string (no crypto dependency in content script)
  const topo = elements.map((el) => `${el.nid}:${el.tag}:${el.parentNid}:${el.isInteractive ? 1 : 0}`).sort().join('|');
  let hash = 5381;
  for (let i = 0; i < topo.length; i++) hash = ((hash << 5) + hash + topo.charCodeAt(i)) & 0x7fffffff;
  return hash.toString(16).padStart(8, '0');
}

/**
 * Build a spatial index (quadtree) for O(log n) point/region queries.
 * Uses human-readable quadrant labels (TL, TR, BL, BR) with a refIndex
 * reverse map for single-lookup "which cell contains ref eN?".
 *
 * @see docs/architecture/viewgraph-v3-format-agentic-enhancements.md - Enhancement 8
 * @param {object} actionManifest - Action manifest with byAction groups
 * @param {{ w: number, h: number }} viewport - Viewport dimensions
 * @returns {object|null} Spatial index or null if too few elements
 */
function buildSpatialIndex(actionManifest, viewport) {
  const allEntries = [
    ...(actionManifest.byAction.clickable || []),
    ...(actionManifest.byAction.fillable || []),
    ...(actionManifest.byAction.navigable || []),
  ];
  if (allEntries.length < 5) return null; // Not worth indexing

  const MAX_DEPTH = 4;
  const MIN_CELL_PX = 80;
  const refIndex = {};
  const cells = {};

  function buildCell(entries, x, y, w, h, label, depth) {
    const contained = entries.filter((e) => {
      if (!e.bbox || e.bbox.length < 4) return false;
      const [ex, ey, ew, eh] = e.bbox;
      const cx = ex + ew / 2;
      const cy = ey + eh / 2;
      return cx >= x && cx < x + w && cy >= y && cy < y + h;
    });

    if (contained.length === 0) return;

    if (depth >= MAX_DEPTH || w / 2 < MIN_CELL_PX || h / 2 < MIN_CELL_PX || contained.length <= 3) {
      cells[label] = { refs: contained.map((e) => e.ref), children: null };
      for (const e of contained) refIndex[e.ref] = { cell: label, bbox: e.bbox };
      return;
    }

    const hw = w / 2;
    const hh = h / 2;
    const childLabels = [`${label}-TL`, `${label}-TR`, `${label}-BL`, `${label}-BR`];
    cells[label] = { refs: [], children: childLabels };

    buildCell(contained, x, y, hw, hh, childLabels[0], depth + 1);
    buildCell(contained, x + hw, y, hw, hh, childLabels[1], depth + 1);
    buildCell(contained, x, y + hh, hw, hh, childLabels[2], depth + 1);
    buildCell(contained, x + hw, y + hh, hw, hh, childLabels[3], depth + 1);
  }

  const scrollX = typeof window !== 'undefined' ? window.scrollX : 0;
  const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
  buildCell(allEntries, scrollX, scrollY, viewport.w, viewport.h, 'L0', 0);

  return {
    type: 'quadtree',
    coordinateFrame: 'viewport',
    bounds: [scrollX, scrollY, viewport.w, viewport.h],
    maxDepth: MAX_DEPTH,
    minCellPx: MIN_CELL_PX,
    refIndex,
    cells,
  };
}

/**
 * Build the Set-of-Marks section linking mark numbers to element refs.
 * Mark number = ref number. [1] in screenshot = @e1 in text.
 *
 * @see docs/architecture/viewgraph-v3-format-agentic-enhancements.md - Enhancement 9
 * @param {object} actionManifest - Action manifest with byAction groups
 * @returns {object} Marks section
 */
function buildMarks(actionManifest) {
  const allEntries = [
    ...(actionManifest.byAction.clickable || []),
    ...(actionManifest.byAction.fillable || []),
    ...(actionManifest.byAction.navigable || []),
  ];
  return {
    style: 'numbered-box-with-ref',
    scope: 'actionManifest',
    stableAcrossDeltas: true,
    total: allEntries.length,
    assignments: allEntries.map((e) => ({
      mark: parseInt(e.ref.slice(1), 10),
      ref: e.ref,
      nid: e.nid,
      alias: e.alias,
      bbox: e.bbox,
    })),
  };
}

/**
 * Build an empty checkpoint envelope for multi-step agent workflows.
 * The agent populates completedSteps and failedStep as it progresses.
 *
 * @see docs/architecture/viewgraph-v3-format-agentic-enhancements.md - Enhancement 10
 * @returns {object} Empty checkpoint structure
 */
function buildCheckpoint() {
  return {
    traceId: null,
    runId: null,
    stepId: 0,
    completedSteps: [],
    failedStep: null,
    resumeToken: null,
  };
}

/**
 * Serialize scored elements into a complete ViewGraph v2.4 capture.
 * @param {Array} elements - Scored elements from salience.scoreAll()
 * @param {Array} relations - Relations from traverser
 * @param {object} [enrichment] - Optional enrichment data (network, console)
 * @param {object} [options] - Optional: containerMerge stats from traverser
 * @returns {object} Complete ViewGraph v2.4 JSON object
 */
export function serialize(elements, relations, enrichment = {}, options = {}) {
  const metadata = buildMetadata(elements);
  const { details, styleTable } = buildDetails(elements);
  const actionManifest = buildActionManifest(elements);
  const viewport = { w: typeof window !== 'undefined' ? window.innerWidth : DEFAULT_VIEWPORT.w, h: typeof window !== 'undefined' ? window.innerHeight : DEFAULT_VIEWPORT.h };
  const spatialIndex = buildSpatialIndex(actionManifest, viewport);
  const marks = buildMarks(actionManifest);
  const capture = {
    metadata,
    summary: buildSummary(elements, metadata),
    nodes: buildNodes(elements),
    relations: buildRelations(relations),
    provenance: buildProvenance(),
    styleTable,
    details,
    actionManifest,
    ...(spatialIndex ? { spatialIndex } : {}),
    marks,
    checkpoint: buildCheckpoint(),
  };

  // Enrichment sections - each key maps directly to a top-level capture field
  const ENRICHMENT_KEYS = [
    'network', 'console', 'breakpoints', 'stacking', 'focus', 'scroll',
    'landmarks', 'components', 'axe', 'eventListeners', 'performance',
    'animations', 'intersection', 'mediaQueries',
    'storage', 'cssCustomProperties', 'transient',
    'errorBoundaries', 'serviceWorker', 'buildMetadata', 'accessibleNames',
  ];
  for (const key of ENRICHMENT_KEYS) {
    if (enrichment[key]) capture[key] = enrichment[key];
  }
  if (enrichment.session) capture.metadata.session = enrichment.session;

  // v3 Enhancement 7: Error-to-node correlation
  // Correlate console errors and failed network requests with actionManifest refs
  if (capture.console?.errors?.length && capture.actionManifest) {
    for (const err of capture.console.errors) {
      // Heuristic: if error mentions a component/element name, find matching refs
      const allRefs = [...(capture.actionManifest.byAction.clickable || []), ...(capture.actionManifest.byAction.fillable || []), ...(capture.actionManifest.byAction.navigable || [])];
      const correlated = allRefs.filter((r) => err.message && (err.message.includes(r.alias?.split(':')[1] || '') || err.message.includes(r.tag)));
      if (correlated.length > 0 && correlated.length <= 5) {
        err.correlatedRefs = correlated.map((r) => r.ref);
      }
    }
  }
  if (capture.network?.failed?.length && capture.actionManifest) {
    for (const req of (capture.network.failed || [])) {
      // Heuristic: correlate failed API requests with data-dependent clusters
      req.correlatedRefs = capture.actionManifest.viewportRefs?.slice(0, 3) || [];
    }
  }

  // Update capture size estimate
  const jsonStr = JSON.stringify(capture);
  capture.metadata.stats.captureSizeBytes = jsonStr.length;
  if (options.containerMerge) {
    capture.coverage = { containerMerge: options.containerMerge };
  }

  return capture;
}
