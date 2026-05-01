/**
 * @viewgraph/vitest - Unit Tests
 *
 * Tests the captureDOM and captureAndAssert functions against jsdom.
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { captureDOM, captureAndAssert } from '../index.js';

describe('captureDOM', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('(+) captures a simple form', () => {
    document.body.innerHTML = `
      <form>
        <label for="email">Email</label>
        <input id="email" type="email" data-testid="email-input" aria-label="Email address" />
        <button type="submit" data-testid="submit-btn">Submit</button>
      </form>
    `;

    const capture = captureDOM('simple-form', { write: false });

    expect(capture.metadata.format).toBe('viewgraph-v2');
    expect(capture.metadata.captureMode).toBe('vitest');
    expect(capture.metadata.label).toBe('simple-form');
    expect(capture.metadata.stats.totalNodes).toBeGreaterThan(0);
    expect(capture.metadata.stats.interactive).toBeGreaterThanOrEqual(2);
  });

  it('(+) detects interactive elements in actionManifest', () => {
    document.body.innerHTML = `
      <input type="text" data-testid="name" aria-label="Name" />
      <select data-testid="country"><option>US</option></select>
      <button data-testid="save">Save</button>
      <a href="/home">Home</a>
    `;

    const capture = captureDOM('interactive', { write: false });

    expect(capture.actionManifest.byAction.fillable.length).toBeGreaterThanOrEqual(2);
    expect(capture.actionManifest.byAction.clickable.length).toBeGreaterThanOrEqual(1);
    expect(capture.actionManifest.byAction.navigable.length).toBeGreaterThanOrEqual(1);
  });

  it('(+) detects missing ARIA labels', () => {
    document.body.innerHTML = `
      <button>OK</button>
      <input type="text" />
    `;

    const capture = captureDOM('missing-labels', { write: false });

    // Button has text content but input has neither label nor text
    expect(capture.accessibility.missingLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('(+) detects missing testids', () => {
    document.body.innerHTML = `
      <button>Save</button>
      <input type="text" data-testid="has-testid" />
    `;

    const capture = captureDOM('missing-testids', { write: false });

    expect(capture.accessibility.missingTestids.length).toBeGreaterThanOrEqual(1);
  });

  it('(-) handles empty body', () => {
    const capture = captureDOM('empty', { write: false });
    expect(capture.metadata.stats.totalNodes).toBeLessThanOrEqual(1);
    expect(capture.metadata.stats.interactive).toBe(0);
  });
});

describe('captureAndAssert', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('(+) passes when expectations met', () => {
    document.body.innerHTML = `
      <button data-testid="btn" aria-label="Click me">Click</button>
      <input data-testid="input" aria-label="Name" />
      <div>Some content</div>
    `;

    const capture = captureAndAssert('passing', {
      minNodes: 2,
      minInteractive: 2,
    });

    expect(capture.metadata.label).toBe('passing');
  });

  it('(-) throws when minNodes not met', () => {
    document.body.innerHTML = '<div>One</div>';

    expect(() => captureAndAssert('failing', { minNodes: 100 }))
      .toThrow('Expected at least 100 nodes');
  });

  it('(-) throws when noMissingLabels fails', () => {
    document.body.innerHTML = '<button></button><input type="text" />';

    expect(() => captureAndAssert('no-labels', { noMissingLabels: true }))
      .toThrow('missing ARIA labels');
  });

  it('(-) throws when noMissingTestids fails', () => {
    document.body.innerHTML = '<button>OK</button>';

    expect(() => captureAndAssert('no-testids', { noMissingTestids: true }))
      .toThrow('missing data-testid');
  });
});
