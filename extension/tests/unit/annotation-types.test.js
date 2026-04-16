/**
 * Annotation Types - Unit Tests
 *
 * @see lib/annotation-types.js
 */

import { describe, it, expect } from 'vitest';
import { resolveType, getBadgeColor, getBadgeIcon, hasSeverity, getTypeLabel, serializeAnnotation } from '#lib/annotation-types.js';

describe('resolveType', () => {
  it('(+) diagnostic takes highest priority', () => {
    expect(resolveType({ diagnostic: { section: 'Network' }, category: 'idea', type: 'page-note' })).toBe('diagnostic');
  });

  it('(+) idea takes priority over page-note', () => {
    expect(resolveType({ category: 'idea', type: 'page-note' })).toBe('idea');
  });

  it('(+) page-note detected from type field', () => {
    expect(resolveType({ type: 'page-note' })).toBe('page-note');
  });

  it('(+) region detected from multiple nids', () => {
    expect(resolveType({ nids: [1, 2, 3] })).toBe('region');
  });

  it('(+) element is the default', () => {
    expect(resolveType({})).toBe('element');
    expect(resolveType({ category: 'visual' })).toBe('element');
  });

  it('(+) idea detected from category string with other categories', () => {
    expect(resolveType({ category: 'visual,idea' })).toBe('idea');
  });
});

describe('getBadgeColor', () => {
  it('(+) idea returns yellow', () => {
    expect(getBadgeColor({ category: 'idea' })).toBe('#eab308');
  });

  it('(+) diagnostic returns teal', () => {
    expect(getBadgeColor({ diagnostic: { section: 'Network' } })).toBe('#0d9488');
  });

  it('(+) page-note returns blue', () => {
    expect(getBadgeColor({ type: 'page-note' })).toBe('#0ea5e9');
  });

  it('(+) element returns a marker color', () => {
    const color = getBadgeColor({ id: 1 });
    expect(typeof color).toBe('string');
    expect(color.startsWith('#')).toBe(true);
  });
});

describe('getBadgeIcon', () => {
  it('(+) idea has lightbulb icon', () => {
    expect(getBadgeIcon({ category: 'idea' })).toContain('M9 18h6');
  });

  it('(+) diagnostic has terminal icon', () => {
    expect(getBadgeIcon({ diagnostic: {} })).toContain('4 17 10 11 4 5');
  });

  it('(-) element has no icon', () => {
    expect(getBadgeIcon({})).toBeNull();
  });
});

describe('hasSeverity', () => {
  it('(+) element has severity', () => {
    expect(hasSeverity({})).toBe(true);
  });

  it('(-) idea has no severity', () => {
    expect(hasSeverity({ category: 'idea' })).toBe(false);
  });

  it('(-) diagnostic has no severity', () => {
    expect(hasSeverity({ diagnostic: {} })).toBe(false);
  });
});

describe('getTypeLabel', () => {
  it('(+) returns human-readable labels', () => {
    expect(getTypeLabel({})).toBe('Bug');
    expect(getTypeLabel({ category: 'idea' })).toBe('Idea');
    expect(getTypeLabel({ diagnostic: {} })).toBe('Diagnostic');
    expect(getTypeLabel({ type: 'page-note' })).toBe('Note');
  });
});

describe('serializeAnnotation', () => {
  it('(+) includes diagnostic when present', () => {
    const ann = { id: 1, diagnostic: { section: 'Network', data: 'test' } };
    const s = serializeAnnotation(ann);
    expect(s.diagnostic).toEqual({ section: 'Network', data: 'test' });
  });

  it('(+) includes pending when true', () => {
    const s = serializeAnnotation({ id: 1, pending: true });
    expect(s.pending).toBe(true);
  });

  it('(-) omits diagnostic when absent', () => {
    const s = serializeAnnotation({ id: 1 });
    expect(s.diagnostic).toBeUndefined();
  });

  it('(-) omits pending when false', () => {
    const s = serializeAnnotation({ id: 1, pending: false });
    expect(s.pending).toBeUndefined();
  });
});
