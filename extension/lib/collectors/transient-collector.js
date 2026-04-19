/**
 * Transient UI State Collector
 *
 * Captures bugs in motion: toasts, flash content, animation jank, render thrashing.
 * Uses a MutationObserver ring buffer to record DOM additions/removals, then
 * analyzes the buffer on capture to produce agent-actionable issues.
 *
 * Lifecycle: startTransientObserver() on sidebar open, stopTransientObserver() on close,
 * collectTransient() during capture to get enrichment data.
 *
 * @see docs/decisions/ADR-014-transient-ui-state-capture.md
 * @see .kiro/specs/transient-capture/design.md
 */

import { ATTR } from '#lib/selector.js';

/** Max buffer entries before FIFO eviction. */
const MAX_BUFFER = 100;

/** Buffer retention window (ms). Entries older than this are evicted. */
const RETENTION_MS = 30_000;

/** Toast heuristic: minimum z-index to qualify. */
const TOAST_Z_INDEX_MIN = 100;

/** Flash content threshold (ms). Elements shorter than this are flagged. */
const FLASH_THRESHOLD_MS = 500;

/** Rapid reflow: min add/remove cycles to flag. */
const RAPID_REFLOW_MIN = 3;

/** Rapid reflow: time window (ms). */
const RAPID_REFLOW_WINDOW_MS = 5000;

/** CSS properties that trigger layout recalculation. */
const LAYOUT_TRIGGERS = new Set(['top', 'left', 'right', 'bottom', 'width', 'height', 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left']);

// ──────────────────────────────────────────────
// Module state
// ──────────────────────────────────────────────

let buffer = [];
let observer = null;
let elementTimestamps = new Map();

/**
 * Get a simple CSS selector for an element.
 * Uses the shared pattern from collector-utils but inlined to avoid circular deps.
 */
function getSelector(el) {
  const tag = el.tagName?.toLowerCase() || 'unknown';
  const testid = el.getAttribute?.('data-testid');
  if (testid) return `${tag}[data-testid="${testid}"]`;
  if (el.id) return `${tag}#${el.id}`;
  const cls = el.className && typeof el.className === 'string'
    ? '.' + el.className.trim().split(/\s+/).filter((c) => c.length < 25 && !c.startsWith('_')).slice(0, 2).join('.')
    : '';
  return cls ? `${tag}${cls}` : tag;
}

/**
 * Check if an element matches the toast heuristic:
 * position:fixed/absolute + z-index > 100 + has text + not ViewGraph UI.
 */
function isToastElement(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.closest?.(`[${ATTR}]`)) return false;
  const style = window.getComputedStyle(el);
  const pos = style.position;
  if (pos !== 'fixed' && pos !== 'absolute') return false;
  const z = parseInt(style.zIndex, 10);
  if (isNaN(z) || z <= TOAST_Z_INDEX_MIN) return false;
  const text = (el.textContent || '').trim();
  if (!text) return false;
  return true;
}

/**
 * Check if an element or any ancestor has aria-live or role="alert"/"status".
 */
function hasAriaLiveAncestor(el) {
  let node = el;
  while (node && node !== document.body) {
    if (node.getAttribute?.('aria-live')) return node.getAttribute('aria-live');
    const role = node.getAttribute?.('role');
    if (role === 'alert' || role === 'status') return role;
    node = node.parentElement;
  }
  return null;
}

/**
 * Capture key styles from a toast element before it can be removed.
 */
function captureToastStyles(el) {
  const style = window.getComputedStyle(el);
  return {
    position: style.position,
    zIndex: style.zIndex,
    opacity: style.opacity,
    top: style.top,
    right: style.right,
    bottom: style.bottom,
    left: style.left,
  };
}

/**
 * Evict entries older than RETENTION_MS and enforce MAX_BUFFER.
 */
function evict() {
  const cutoff = Date.now() - RETENTION_MS;
  while (buffer.length > 0 && buffer[0].timestamp < cutoff) buffer.shift();
  while (buffer.length > MAX_BUFFER) buffer.shift();
}

/**
 * MutationObserver callback. Records additions and removals.
 */
function onMutation(mutations) {
  for (const m of mutations) {
    if (m.target.closest?.(`[${ATTR}]`)) continue;

    for (const node of m.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (node.closest?.(`[${ATTR}]`)) continue;
      const selector = getSelector(node);
      const text = (node.textContent || '').trim().slice(0, 100);
      const now = Date.now();
      const entry = { timestamp: now, action: 'added', selector, text, isToast: false };

      if (isToastElement(node)) {
        entry.isToast = true;
        entry.styles = captureToastStyles(node);
        entry.ariaLive = hasAriaLiveAncestor(node);
        entry.role = node.getAttribute('role') || null;
      }

      elementTimestamps.set(selector, now);
      buffer.push(entry);
    }

    for (const node of m.removedNodes) {
      if (node.nodeType !== 1) continue;
      if (node.getAttribute?.(ATTR)) continue;
      const selector = getSelector(node);
      const text = (node.textContent || '').trim().slice(0, 100);
      const addedAt = elementTimestamps.get(selector);
      const lifespan = addedAt ? Date.now() - addedAt : null;
      buffer.push({ timestamp: Date.now(), action: 'removed', selector, text, lifespan });
      elementTimestamps.delete(selector);
    }
  }
  evict();
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

/**
 * Start observing DOM mutations. Call when sidebar opens.
 */
export function startTransientObserver() {
  if (observer) return;
  buffer = [];
  elementTimestamps = new Map();
  observer = new MutationObserver(onMutation);
  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Stop observing. Call when sidebar closes.
 */
export function stopTransientObserver() {
  if (observer) { observer.disconnect(); observer = null; }
  buffer = [];
  elementTimestamps = new Map();
}

/**
 * Reset all state. Used in tests.
 */
export function resetTransient() {
  stopTransientObserver();
}

/**
 * Analyze the buffer and return transient enrichment data.
 * Called during capture.
 */
export function collectTransient() {
  evict();
  const now = Date.now();
  const issues = [];

  // ── Toast accessibility issues ──
  for (const entry of buffer) {
    if (entry.isToast && !entry.ariaLive) {
      issues.push({
        type: 'toast-no-aria-live',
        severity: 'major',
        message: `"${entry.text.slice(0, 50)}" appeared without aria-live - screen readers won't announce it`,
        selector: entry.selector,
        text: entry.text,
        evidence: { hasAriaLive: false, hasRole: !!entry.role, position: entry.styles?.position, zIndex: entry.styles?.zIndex },
      });
    }
  }

  // ── Flash content ──
  for (const entry of buffer) {
    if (entry.action === 'removed' && entry.lifespan != null && entry.lifespan < FLASH_THRESHOLD_MS && entry.text) {
      issues.push({
        type: 'flash-content',
        severity: 'warning',
        message: `Element appeared for ${entry.lifespan}ms - may be too fast to read`,
        selector: entry.selector,
        text: entry.text,
        lifespan: entry.lifespan,
        evidence: { lifespan: entry.lifespan },
      });
    }
  }

  // ── Rapid reflow ──
  const selectorCounts = {};
  for (const entry of buffer) {
    if (entry.action === 'added') {
      if (!selectorCounts[entry.selector]) selectorCounts[entry.selector] = [];
      selectorCounts[entry.selector].push(entry.timestamp);
    }
  }
  for (const [selector, timestamps] of Object.entries(selectorCounts)) {
    if (timestamps.length >= RAPID_REFLOW_MIN) {
      const window = timestamps[timestamps.length - 1] - timestamps[0];
      if (window <= RAPID_REFLOW_WINDOW_MS) {
        issues.push({
          type: 'rapid-reflow',
          severity: 'major',
          message: `${selector} added/removed ${timestamps.length} times in ${Math.round(window / 1000)}s - possible render loop`,
          selector,
          evidence: { count: timestamps.length, windowMs: window },
        });
      }
    }
  }

  // ── Animation analysis ──
  const animations = [];
  if (typeof document.getAnimations === 'function') {
    for (const anim of document.getAnimations()) {
      const target = anim.effect?.target;
      if (!target || target.closest?.(`[${ATTR}]`)) continue;
      const timing = anim.effect.getComputedTiming?.() || {};
      const keyframes = anim.effect.getKeyframes?.() || [];
      const properties = [...new Set(keyframes.flatMap((kf) => Object.keys(kf).filter((k) => k !== 'offset' && k !== 'easing' && k !== 'composite')))];
      const isLayoutTrigger = properties.some((p) => LAYOUT_TRIGGERS.has(p));
      animations.push({
        selector: getSelector(target),
        name: anim.animationName || 'transition',
        duration: timing.duration || 0,
        progress: timing.progress ?? 0,
        properties,
        isLayoutTrigger,
      });
      if (isLayoutTrigger) {
        const prop = properties.find((p) => LAYOUT_TRIGGERS.has(p));
        issues.push({
          type: 'animation-jank',
          severity: 'minor',
          message: `Animating ${prop} causes layout recalc - use transform instead`,
          selector: getSelector(target),
          evidence: { property: prop, suggestion: 'Use transform: translate() instead' },
        });
      }
    }
  }

  // ── Build timeline ──
  const timeline = buffer.map((entry) => ({
    t: entry.timestamp - now,
    action: entry.action,
    selector: entry.selector,
    text: entry.text || undefined,
    lifespan: entry.lifespan || undefined,
  }));

  return {
    issues,
    timeline,
    animations,
    summary: { transientElements: buffer.length, issues: issues.length, activeAnimations: animations.length },
  };
}
