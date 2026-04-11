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
import { collectNetworkState } from './network-collector.js';
import { getConsoleState } from './console-collector.js';
import { collectBreakpoints, collectMediaQueries } from './breakpoint-collector.js';
import { collectStackingContexts } from './stacking-collector.js';
import { collectFocusChain } from './focus-collector.js';
import { collectScrollContainers } from './scroll-collector.js';
import { collectLandmarks } from './landmark-collector.js';
import { collectComponents } from './component-collector.js';
import { collectAxeResults } from './axe-collector.js';
import { collectEventListeners } from './event-listener-collector.js';
import { collectPerformance } from './performance-collector.js';
import { collectAnimations } from './animation-collector.js';
import { collectIntersectionState } from './intersection-collector.js';

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
  };
  e.axe = await safeCollectAsync('axe', collectAxeResults);
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
  };
}
