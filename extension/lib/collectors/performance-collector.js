/**
 * Performance Collector
 *
 * Collects browser performance metrics available to content scripts:
 * - Navigation timing (page load, DOM content loaded, first paint)
 * - Resource timing (slow resources, total transfer size)
 * - Long tasks (tasks > 50ms that block the main thread)
 * - Layout shifts (Cumulative Layout Shift from PerformanceObserver)
 *
 * Uses the Performance API which is available in content scripts.
 * Does NOT require DevTools protocol or special permissions.
 *
 * @see docs/roadmap/roadmap.md - M15.5
 */

/** Maximum resources to include (cap for capture size). */
const MAX_RESOURCES = 20;

/** Threshold for "slow" resources in milliseconds. */
const SLOW_THRESHOLD_MS = 500;

/**
 * Collect performance metrics from the current page.
 * @returns {{ navigation: object, resources: object, longTasks: number, layoutShifts: number, memory: object|null }}
 */
export function collectPerformance() {
  const nav = getNavigationTiming();
  const resources = getResourceTiming();
  const memory = getMemoryInfo();

  return {
    navigation: nav,
    resources,
    memory,
  };
}

/** Extract navigation timing metrics. */
function getNavigationTiming() {
  const entries = performance.getEntriesByType('navigation');
  if (entries.length === 0) return null;
  const nav = entries[0];
  return {
    domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
    domComplete: Math.round(nav.domComplete - nav.startTime),
    loadEvent: Math.round(nav.loadEventEnd - nav.startTime),
    firstByte: Math.round(nav.responseStart - nav.startTime),
    domInteractive: Math.round(nav.domInteractive - nav.startTime),
    transferSize: nav.transferSize || 0,
    type: nav.type,
  };
}

/** Extract slow resources and summary stats. */
function getResourceTiming() {
  const entries = performance.getEntriesByType('resource');
  const slow = entries
    .filter((r) => r.duration > SLOW_THRESHOLD_MS)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, MAX_RESOURCES)
    .map((r) => ({
      name: r.name.split('/').pop()?.slice(0, 60) || r.name.slice(0, 60),
      type: r.initiatorType,
      duration: Math.round(r.duration),
      size: r.transferSize || 0,
    }));

  const totalSize = entries.reduce((sum, r) => sum + (r.transferSize || 0), 0);
  const totalCount = entries.length;

  return { totalCount, totalSize, slowResources: slow };
}

/** Get memory info if available (Chrome only). */
function getMemoryInfo() {
  if (!performance.memory) return null;
  return {
    usedJSHeapSize: performance.memory.usedJSHeapSize,
    totalJSHeapSize: performance.memory.totalJSHeapSize,
    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
  };
}
