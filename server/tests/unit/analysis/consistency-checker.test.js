/**
 * Cross-Page Consistency Checker - Unit Tests
 *
 * Tests element matching across captures and style diff detection.
 *
 * @see src/analysis/consistency-checker.js
 */

import { describe, it, expect } from 'vitest';
import { checkConsistency } from '#src/analysis/consistency-checker.js';

/** Build a minimal parsed capture with given elements. */
function makeParsed(elements) {
  const nodes = { high: [], med: [], low: [] };
  const details = { high: {}, med: {}, low: {} };
  for (const el of elements) {
    nodes.high.push({ id: el.id, tag: el.tag, text: el.text || '', selector: el.selector, role: el.role });
    details.high[el.id] = { attributes: el.attributes || {}, styles: el.styles || {}, selector: el.selector };
  }
  return { nodes, details };
}

describe('checkConsistency', () => {
  it('(+) detects style inconsistency by testid match', () => {
    const captures = [
      { url: '/products', title: 'Products', parsed: makeParsed([
        { id: 'h1', tag: 'header', selector: 'header.app-header', attributes: { 'data-testid': 'app-header' }, styles: { padding: '16px', fontSize: '14px' } },
      ]) },
      { url: '/settings', title: 'Settings', parsed: makeParsed([
        { id: 'h1', tag: 'header', selector: 'header.app-header', attributes: { 'data-testid': 'app-header' }, styles: { padding: '24px', fontSize: '14px' } },
      ]) },
    ];
    const result = checkConsistency(captures);
    expect(result.inconsistencies.length).toBe(1);
    expect(result.inconsistencies[0].element).toBe('app-header');
    expect(result.inconsistencies[0].diffs[0].property).toBe('padding');
    expect(result.inconsistencies[0].diffs[0].valueA).toBe('16px');
    expect(result.inconsistencies[0].diffs[0].valueB).toBe('24px');
  });

  it('(+) matches by tag + class when no testid', () => {
    const captures = [
      { url: '/page-a', title: 'A', parsed: makeParsed([
        { id: 'n1', tag: 'nav', selector: 'nav.main-nav', role: 'navigation', styles: { gap: '8px' } },
      ]) },
      { url: '/page-b', title: 'B', parsed: makeParsed([
        { id: 'n1', tag: 'nav', selector: 'nav.main-nav', role: 'navigation', styles: { gap: '16px' } },
      ]) },
    ];
    const result = checkConsistency(captures);
    expect(result.inconsistencies.length).toBe(1);
    expect(result.inconsistencies[0].diffs[0].property).toBe('gap');
  });

  it('(-) no inconsistencies when styles match', () => {
    const captures = [
      { url: '/a', title: 'A', parsed: makeParsed([
        { id: 'b1', tag: 'button', selector: 'button.primary', attributes: { 'data-testid': 'submit' }, styles: { fontSize: '14px', color: '#fff' } },
      ]) },
      { url: '/b', title: 'B', parsed: makeParsed([
        { id: 'b1', tag: 'button', selector: 'button.primary', attributes: { 'data-testid': 'submit' }, styles: { fontSize: '14px', color: '#fff' } },
      ]) },
    ];
    const result = checkConsistency(captures);
    expect(result.inconsistencies.length).toBe(0);
    expect(result.matchedElements).toBe(1);
  });

  it('(-) returns empty for single capture', () => {
    const result = checkConsistency([{ url: '/a', title: 'A', parsed: makeParsed([]) }]);
    expect(result.inconsistencies.length).toBe(0);
    expect(result.comparedPages).toBe(1);
  });

  it('(-) returns empty when no elements match', () => {
    const captures = [
      { url: '/a', title: 'A', parsed: makeParsed([
        { id: 'x', tag: 'div', selector: 'div.unique-a', styles: { padding: '10px' } },
      ]) },
      { url: '/b', title: 'B', parsed: makeParsed([
        { id: 'y', tag: 'span', selector: 'span.unique-b', styles: { padding: '20px' } },
      ]) },
    ];
    const result = checkConsistency(captures);
    expect(result.inconsistencies.length).toBe(0);
    expect(result.matchedElements).toBe(0);
  });

  it('(+) compares 3 captures pairwise', () => {
    const el = (padding) => [{ id: 'h', tag: 'header', selector: 'header.site-header', attributes: { 'data-testid': 'site-header' }, styles: { padding } }];
    const captures = [
      { url: '/a', title: 'A', parsed: makeParsed(el('16px')) },
      { url: '/b', title: 'B', parsed: makeParsed(el('16px')) },
      { url: '/c', title: 'C', parsed: makeParsed(el('24px')) },
    ];
    const result = checkConsistency(captures);
    // A vs C and B vs C should have inconsistencies, A vs B should not
    expect(result.inconsistencies.length).toBe(2);
    expect(result.comparedPages).toBe(3);
  });

  it('(+) reports multiple style diffs on same element', () => {
    const captures = [
      { url: '/a', title: 'A', parsed: makeParsed([
        { id: 'b', tag: 'button', selector: 'button.cta', attributes: { 'data-testid': 'cta' }, styles: { fontSize: '14px', color: '#fff', borderRadius: '4px' } },
      ]) },
      { url: '/b', title: 'B', parsed: makeParsed([
        { id: 'b', tag: 'button', selector: 'button.cta', attributes: { 'data-testid': 'cta' }, styles: { fontSize: '16px', color: '#000', borderRadius: '4px' } },
      ]) },
    ];
    const result = checkConsistency(captures);
    expect(result.inconsistencies.length).toBe(1);
    expect(result.inconsistencies[0].diffs.length).toBe(2);
  });
});
