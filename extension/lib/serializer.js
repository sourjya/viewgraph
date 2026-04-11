/**
 * ViewGraph v2.1 Serializer
 *
 * Assembles a ViewGraph v2.1 JSON capture from scored element data.
 * Produces all required sections: metadata, summary, nodes, relations, details.
 *
 * Runs in the content script context. Returns a plain object (not stringified).
 */

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
    version: '2.2.0',
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
    extension: { name: 'ViewGraph Capture', version: '0.1.0' },
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
    if (el.styles.typography?.['font-family']) fonts.add(el.styles.typography['font-family']);
    if (el.styles.typography?.['font-size']) fontSizes.add(el.styles.typography['font-size']);
    if (el.styles.visual?.color) colors.add(el.styles.visual.color);
    if (el.styles.visual?.['background-color']) bgColors.add(el.styles.visual['background-color']);
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

  for (const el of elements) {
    const tier = nodes[el.salience];
    if (!tier[el.tag]) tier[el.tag] = {};
    tier[el.tag][el.nid] = {
      alias: el.alias,
      parent: el.parentNid,
      children: el.childNids,
      actions: el.isInteractive ? ['clickable'] : undefined,
      isRendered: el.isRendered,
      cluster: null,
    };
  }
  return nodes;
}

/**
 * Build the details section - full element details by tier.
 */
function buildDetails(elements) {
  const details = { high: {}, med: {}, low: {} };

  for (const el of elements) {
    const tier = details[el.salience];
    if (!tier[el.tag]) tier[el.tag] = {};

    const entry = {
      locators: buildLocators(el),
      attributes: el.attributes,
      visibleText: el.visibleText,
      layout: { bboxDocument: el.bbox },
    };

    // Progressive style disclosure: full for high, reduced for med, none for low
    if (el.salience === 'high') {
      entry.styles = el.styles;
    } else if (el.salience === 'med') {
      const { layout, visual, typography, spacing } = el.styles;
      entry.styles = {};
      if (layout) entry.styles.layout = layout;
      if (visual) entry.styles.visual = visual;
      if (typography) entry.styles.typography = typography;
      if (spacing) entry.styles.spacing = spacing;
    }
    // low: no styles

    tier[el.tag][el.nid] = entry;
  }
  return details;
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
  locators.push({ strategy: 'css', value: el.selector, rank: rank++ });
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
 * Serialize scored elements into a complete ViewGraph v2.1 capture.
 * @param {Array} elements - Scored elements from salience.scoreAll()
 * @param {Array} relations - Relations from traverser
 * @param {object} [enrichment] - Optional enrichment data (network, console)
 * @returns {object} Complete ViewGraph v2.1 JSON object
 */
export function serialize(elements, relations, enrichment = {}) {
  const metadata = buildMetadata(elements);
  const capture = {
    metadata,
    summary: buildSummary(elements, metadata),
    nodes: buildNodes(elements),
    relations: buildRelations(relations),
    details: buildDetails(elements),
  };

  // Optional enrichment sections (M12.1, M12.2, M12.6, M13.1)
  if (enrichment.network) capture.network = enrichment.network;
  if (enrichment.console) capture.console = enrichment.console;
  if (enrichment.breakpoints) capture.breakpoints = enrichment.breakpoints;
  if (enrichment.stacking) capture.stacking = enrichment.stacking;
  if (enrichment.focus) capture.focus = enrichment.focus;

  // Update capture size estimate
  const jsonStr = JSON.stringify(capture);
  capture.metadata.stats.captureSizeBytes = jsonStr.length;

  return capture;
}
