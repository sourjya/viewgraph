/**
 * Enrichment Collector - Shared Entry Point
 *
 * Single function that collects all enrichment data for a capture.
 * Wraps each collector in safeCollect() so one failure never crashes
 * the capture pipeline.
 *
 * Extracted from 4 duplicate blocks per CQ-02 in the code quality
 * audit (2026-04-12).
 *
 * @see docs/architecture/code-quality-audit-2026-04-12.md - CQ-02
 * @see extension/lib/safe-collect.js
 */

import { safeCollect, safeCollectAsync } from './safe-collect.js';
import { collectNetworkState } from './collectors/network-collector.js';
import { getConsoleState } from './collectors/console-collector.js';
import { collectBreakpoints, collectMediaQueries } from './collectors/breakpoint-collector.js';
import { collectStackingContexts } from './collectors/stacking-collector.js';
import { collectFocusChain } from './collectors/focus-collector.js';
import { collectScrollContainers } from './collectors/scroll-collector.js';
import { collectLandmarks } from './collectors/landmark-collector.js';
import { collectComponents } from './collectors/component-collector.js';
import { collectAxeResults } from './collectors/axe-collector.js';
import { collectEventListeners } from './collectors/event-listener-collector.js';
import { collectPerformance } from './collectors/performance-collector.js';
import { collectAnimations } from './collectors/animation-collector.js';
import { collectIntersectionState } from './collectors/intersection-collector.js';
import { collectStorage } from './collectors/storage-collector.js';
import { collectCSSCustomProperties } from './collectors/css-custom-properties-collector.js';
import { collectTransient } from './collectors/transient-collector.js';
import { collectErrorBoundaries } from './collectors/error-boundary-collector.js';
import { collectBuildMetadata } from './collectors/build-metadata-collector.js';
import { collectServiceWorkerState } from './collectors/service-worker-collector.js';

/**
 * Collect all enrichment data for a capture.
 * Each collector is wrapped in safeCollect - failures return null.
 * @returns {Promise<object>} Enrichment object with all collector results
 */
export async function collectAllEnrichment() {
  const e = {
    network: safeCollect('network', collectNetworkState),
    console: safeCollect('console', getConsoleState),
    breakpoints: safeCollect('breakpoints', collectBreakpoints),
    mediaQueries: safeCollect('mediaQueries', collectMediaQueries),
    stacking: safeCollect('stacking', collectStackingContexts),
    focus: safeCollect('focus', collectFocusChain),
    scroll: safeCollect('scroll', collectScrollContainers),
    landmarks: safeCollect('landmarks', collectLandmarks),
    components: safeCollect('components', collectComponents),
    eventListeners: safeCollect('eventListeners', collectEventListeners),
    performance: safeCollect('performance', collectPerformance),
    animations: safeCollect('animations', collectAnimations),
    intersection: safeCollect('intersection', collectIntersectionState),
    storage: safeCollect('storage', collectStorage),
    cssCustomProperties: safeCollect('cssCustomProperties', collectCSSCustomProperties),
    transient: safeCollect('transient', collectTransient),
    errorBoundaries: safeCollect('errorBoundaries', collectErrorBoundaries),
    buildMetadata: safeCollect('buildMetadata', collectBuildMetadata),
  };
  e.axe = await safeCollectAsync('axe', collectAxeResults);
  e.serviceWorker = await safeCollectAsync('serviceWorker', collectServiceWorkerState);
  return e;
}

/**
 * Collect enrichment data synchronously (no axe-core).
 * Used by auto-capture where async is problematic with debounce timers.
 * @returns {object} Enrichment object (axe field will be null)
 */
export function collectEnrichmentSync() {
  return {
    network: safeCollect('network', collectNetworkState),
    console: safeCollect('console', getConsoleState),
    breakpoints: safeCollect('breakpoints', collectBreakpoints),
    mediaQueries: safeCollect('mediaQueries', collectMediaQueries),
    stacking: safeCollect('stacking', collectStackingContexts),
    focus: safeCollect('focus', collectFocusChain),
    scroll: safeCollect('scroll', collectScrollContainers),
    landmarks: safeCollect('landmarks', collectLandmarks),
    components: safeCollect('components', collectComponents),
    eventListeners: safeCollect('eventListeners', collectEventListeners),
    performance: safeCollect('performance', collectPerformance),
    animations: safeCollect('animations', collectAnimations),
    intersection: safeCollect('intersection', collectIntersectionState),
    storage: safeCollect('storage', collectStorage),
    cssCustomProperties: safeCollect('cssCustomProperties', collectCSSCustomProperties),
    transient: safeCollect('transient', collectTransient),
    errorBoundaries: safeCollect('errorBoundaries', collectErrorBoundaries),
    buildMetadata: safeCollect('buildMetadata', collectBuildMetadata),
  };
}
