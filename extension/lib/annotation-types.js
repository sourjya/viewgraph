/**
 * Annotation Type Registry
 *
 * Single source of truth for annotation type detection, badge rendering,
 * and serialization. Replaces scattered if/else type checks across
 * sidebar, panel, and content script.
 *
 * @see docs/architecture/modularity-audit.md - Annotation Type Architecture
 */

import { MARKER_COLORS } from './annotate.js';

// ──────────────────────────────────────────────
// SVG Icons (10x10, stroke only)
// ──────────────────────────────────────────────

const ICONS = {
  lightbulb: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/></svg>',
  terminal: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
  page: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  bug: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>',
};

// ──────────────────────────────────────────────
// Type Registry
// ──────────────────────────────────────────────

/** @type {Object<string, { badge: function, icon: string|null, hasSeverity: boolean, label: string, filterIcon: string }>} */
const TYPES = {
  element:      { badge: (ann) => MARKER_COLORS[(ann.id - 1) % MARKER_COLORS.length], icon: null, hasSeverity: true, label: 'Bug', filterIcon: ICONS.bug },
  region:       { badge: (ann) => MARKER_COLORS[(ann.id - 1) % MARKER_COLORS.length], icon: null, hasSeverity: true, label: 'Region', filterIcon: ICONS.bug },
  'page-note':  { badge: () => '#0ea5e9', icon: ICONS.page, hasSeverity: true, label: 'Note', filterIcon: ICONS.page },
  idea:         { badge: () => '#eab308', icon: ICONS.lightbulb, hasSeverity: false, label: 'Idea', filterIcon: ICONS.lightbulb },
  diagnostic:   { badge: () => '#0d9488', icon: ICONS.terminal, hasSeverity: false, label: 'Diagnostic', filterIcon: ICONS.terminal },
};

// ──────────────────────────────────────────────
// Type Resolution
// ──────────────────────────────────────────────

/**
 * Resolve annotation type from its properties. Priority order matters:
 * diagnostic > idea > page-note > region > element.
 * @param {Object} ann - Annotation object
 * @returns {string} Type key from TYPES registry
 */
export function resolveType(ann) {
  if (ann.diagnostic) return 'diagnostic';
  if ((ann.category || '').includes('idea')) return 'idea';
  if (ann.type === 'page-note') return 'page-note';
  if (ann.nids?.length > 1) return 'region';
  return 'element';
}

// ──────────────────────────────────────────────
// Badge Helpers
// ──────────────────────────────────────────────

/** Get badge background color for an annotation. */
export function getBadgeColor(ann) { return TYPES[resolveType(ann)].badge(ann); }

/** Get badge SVG icon (or null for plain bugs). */
export function getBadgeIcon(ann) { return TYPES[resolveType(ann)].icon; }

/** Whether this annotation type supports severity. */
export function hasSeverity(ann) { return TYPES[resolveType(ann)].hasSeverity; }

/** Human-readable type label. */
export function getTypeLabel(ann) { return TYPES[resolveType(ann)].label; }

/** Get the filter icon SVG for a type key. */
export function getFilterIcon(typeKey) { return TYPES[typeKey]?.filterIcon || ICONS.bug; }

/** Get all distinct type keys (for filter toggles). */
export function getTypeKeys() { return Object.keys(TYPES); }

/** Get type config by key. */
export function getTypeConfig(typeKey) { return TYPES[typeKey]; }

// ──────────────────────────────────────────────
// Serialization
// ──────────────────────────────────────────────

/**
 * Serialize an annotation for storage or capture JSON.
 * Each type declares its extra fields - prevents missing-field bugs.
 * @param {Object} ann
 * @returns {Object} Plain JSON-safe object
 */
export function serializeAnnotation(ann) {
  const base = {
    id: ann.id, uuid: ann.uuid, type: ann.type, region: ann.region,
    comment: ann.comment, severity: ann.severity || '', category: ann.category || '',
    nids: ann.nids, ancestor: ann.ancestor, element: ann.element,
    timestamp: ann.timestamp || new Date().toISOString(),
    resolved: ann.resolved || false, resolution: ann.resolution || null,
  };
  if (ann.diagnostic) base.diagnostic = ann.diagnostic;
  if (ann.pending) base.pending = true;
  return base;
}
