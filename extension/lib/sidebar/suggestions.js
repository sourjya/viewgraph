/**
 * Auto-Inspect Suggestions Engine
 *
 * Aggregates results from existing collectors into a ranked, deduplicated
 * list of actionable suggestions. Each suggestion identifies a specific
 * element, describes the problem, and can be converted to an annotation.
 *
 * Three tiers: Accessibility > Quality > Testability.
 * Runs on sidebar open, not continuously.
 *
 * @see .kiro/specs/auto-suggestions/design.md
 */

import { collectNetworkState } from '#lib/collectors/network-collector.js';
import { getConsoleState } from '#lib/collectors/console-collector.js';
import { collectLandmarks } from '#lib/collectors/landmark-collector.js';
import { collectFocusChain } from '#lib/collectors/focus-collector.js';
import { collectStackingContexts } from '#lib/collectors/stacking-collector.js';
import { diagnoseElement } from '#lib/ui/element-diagnostics.js';
import { buildSelector, ATTR } from '#lib/selector.js';
import { getAnnotations } from '#lib/annotate.js';

/** Default cap on suggestions returned. */
const DEFAULT_MAX = 10;

/** Severity ranking for sort (lower = higher priority). */
const SEV_RANK = { error: 0, warning: 1, info: 2 };

/** Tier ranking for sort within same severity. */
const TIER_RANK = { accessibility: 0, quality: 1, testability: 2 };

/**
 * Scan the page and return ranked suggestions.
 * @param {{ max?: number }} [opts]
 * @returns {Array<{ id: string, tier: string, severity: string, title: string, detail: string, selector: string, elements: string[], source: string }>}
 */
export function scanForSuggestions(opts = {}) {
  const max = opts.max || DEFAULT_MAX;
  const suggestions = [];

  // Collect from all tiers
  suggestions.push(...collectAccessibilitySuggestions());
  suggestions.push(...collectQualitySuggestions());
  suggestions.push(...collectTestabilitySuggestions());

  // Deduplicate against existing annotations
  const annotated = new Set(getAnnotations().map((a) => a.element?.selector).filter(Boolean));
  const deduped = suggestions.filter((s) => !annotated.has(s.selector));

  // Rank: severity > tier > element count
  deduped.sort((a, b) => {
    const sevDiff = (SEV_RANK[a.severity] ?? 2) - (SEV_RANK[b.severity] ?? 2);
    if (sevDiff !== 0) return sevDiff;
    const tierDiff = (TIER_RANK[a.tier] ?? 2) - (TIER_RANK[b.tier] ?? 2);
    if (tierDiff !== 0) return tierDiff;
    return (b.elements?.length || 0) - (a.elements?.length || 0);
  });

  // Assign IDs and cap
  return deduped.slice(0, max).map((s, i) => ({ ...s, id: `sug-${i + 1}` }));
}

// ──────────────────────────────────────────────
// Accessibility tier
// ──────────────────────────────────────────────

/** Scan for accessibility issues using built-in checks. */
function collectAccessibilitySuggestions() {
  const results = [];

  // Missing alt text on images
  const imgs = document.querySelectorAll('img:not([alt])');
  const noAlt = [...imgs].filter((el) => !el.closest(`[${ATTR}]`));
  if (noAlt.length > 0) {
    results.push({
      tier: 'accessibility', severity: 'warning',
      title: `Missing alt text on ${noAlt.length} image${noAlt.length > 1 ? 's' : ''}`,
      detail: noAlt.slice(0, 3).map((el) => buildSelector(el)).join(', '),
      selector: buildSelector(noAlt[0]),
      elements: noAlt.slice(0, 5).map((el) => buildSelector(el)),
      source: 'a11y-alt',
    });
  }

  // Buttons/links without accessible names
  const interactives = document.querySelectorAll('button, a[href], [role="button"]');
  const noName = [...interactives].filter((el) => {
    if (el.closest(`[${ATTR}]`)) return false;
    const name = el.textContent?.trim() || el.getAttribute('aria-label') || el.getAttribute('title') || '';
    return name.length === 0;
  });
  if (noName.length > 0) {
    results.push({
      tier: 'accessibility', severity: 'warning',
      title: `${noName.length} interactive element${noName.length > 1 ? 's' : ''} without accessible name`,
      detail: noName.slice(0, 3).map((el) => `<${el.tagName.toLowerCase()}>`).join(', '),
      selector: buildSelector(noName[0]),
      elements: noName.slice(0, 5).map((el) => buildSelector(el)),
      source: 'a11y-name',
    });
  }

  // Landmark issues
  const lm = collectLandmarks();
  if (lm.issues?.length > 0) {
    results.push({
      tier: 'accessibility', severity: 'warning',
      title: `${lm.issues.length} landmark issue${lm.issues.length > 1 ? 's' : ''}`,
      detail: lm.issues.slice(0, 2).map((i) => i.message || i).join('; '),
      selector: 'body',
      elements: [],
      source: 'landmarks',
    });
  }

  // Focus issues
  const focus = collectFocusChain();
  if (focus.issues?.length > 0) {
    results.push({
      tier: 'accessibility', severity: 'warning',
      title: `${focus.issues.length} focus issue${focus.issues.length > 1 ? 's' : ''}`,
      detail: focus.issues.slice(0, 2).map((i) => i.description || i.type).join('; '),
      selector: focus.issues[0]?.selector || 'body',
      elements: focus.issues.slice(0, 5).map((i) => i.selector).filter(Boolean),
      source: 'focus',
    });
  }

  return results;
}

// ──────────────────────────────────────────────
// Quality tier
// ──────────────────────────────────────────────

/** Scan for quality issues: network failures, console errors, stacking conflicts. */
function collectQualitySuggestions() {
  const results = [];

  // Failed network requests
  const net = collectNetworkState();
  const failed = (net.requests || []).filter((r) => r.failed);
  if (failed.length > 0) {
    results.push({
      tier: 'quality', severity: 'error',
      title: `${failed.length} failed network request${failed.length > 1 ? 's' : ''}`,
      detail: failed.slice(0, 3).map((r) => r.url?.split('/').pop() || r.url).join(', '),
      selector: 'body',
      elements: [],
      source: 'network',
    });
  }

  // Console errors
  const cs = getConsoleState();
  const errCount = cs.summary?.errors || 0;
  if (errCount > 0) {
    const firstErr = (cs.entries || []).find((e) => e.level === 'error');
    results.push({
      tier: 'quality', severity: 'error',
      title: `${errCount} console error${errCount > 1 ? 's' : ''}`,
      detail: firstErr?.message?.slice(0, 80) || 'JavaScript errors detected',
      selector: 'body',
      elements: [],
      source: 'console',
    });
  }

  // Stacking/z-index conflicts
  const stacking = collectStackingContexts();
  if (stacking.issues?.length > 0) {
    results.push({
      tier: 'quality', severity: 'warning',
      title: `${stacking.issues.length} z-index conflict${stacking.issues.length > 1 ? 's' : ''}`,
      detail: stacking.issues[0]?.description || 'Overlapping elements detected',
      selector: stacking.issues[0]?.element || 'body',
      elements: stacking.issues.slice(0, 5).map((i) => i.element).filter(Boolean),
      source: 'stacking',
    });
  }

  return results;
}

// ──────────────────────────────────────────────
// Testability tier
// ──────────────────────────────────────────────

/** Scan for testability issues: missing testids, unlabeled inputs. */
function collectTestabilitySuggestions() {
  const results = [];

  // Interactive elements missing data-testid
  const interactives = document.querySelectorAll('button, a[href], input, select, textarea, [role="button"]');
  const noTestid = [...interactives].filter((el) => !el.closest(`[${ATTR}]`) && !el.getAttribute('data-testid'));
  if (noTestid.length > 3) {
    results.push({
      tier: 'testability', severity: 'info',
      title: `${noTestid.length} interactive elements missing data-testid`,
      detail: noTestid.slice(0, 3).map((el) => `<${el.tagName.toLowerCase()}>`).join(', '),
      selector: buildSelector(noTestid[0]),
      elements: noTestid.slice(0, 5).map((el) => buildSelector(el)),
      source: 'testids',
    });
  }

  // Inputs without labels
  const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
  const noLabel = [...inputs].filter((el) => {
    if (el.closest(`[${ATTR}]`)) return false;
    const hasLabel = el.id && document.querySelector(`label[for="${el.id}"]`);
    const hasAria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
    return !hasLabel && !hasAria;
  });
  if (noLabel.length > 0) {
    results.push({
      tier: 'testability', severity: 'warning',
      title: `${noLabel.length} form input${noLabel.length > 1 ? 's' : ''} without labels`,
      detail: noLabel.slice(0, 3).map((el) => `<${el.tagName.toLowerCase()}${el.type ? ' type="' + el.type + '"' : ''}>`).join(', '),
      selector: buildSelector(noLabel[0]),
      elements: noLabel.slice(0, 5).map((el) => buildSelector(el)),
      source: 'labels',
    });
  }

  return results;
}
