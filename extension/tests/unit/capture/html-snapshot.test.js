/**
 * Tests for capture/html-snapshot.js
 * @see extension/lib/capture/html-snapshot.js
 */

import { describe, it, expect } from 'vitest';
import { captureSnapshot } from '#lib/capture/html-snapshot.js';

describe('html-snapshot', () => {
  it('(+) returns valid HTML string', () => {
    const html = captureSnapshot();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
  });

  it('(+) strips script tags', () => {
    const s = document.createElement('script');
    s.textContent = 'alert(1)';
    document.body.appendChild(s);
    const html = captureSnapshot();
    expect(html).not.toContain('alert(1)');
    s.remove();
  });

  it('(+) adds viewgraph-snapshot meta tag', () => {
    const html = captureSnapshot();
    expect(html).toContain('viewgraph-snapshot');
  });

  it('(+) inlines computed styles as data-vg-styles', () => {
    const div = document.createElement('div');
    div.textContent = 'test';
    document.body.appendChild(div);
    const html = captureSnapshot();
    // jsdom getComputedStyle returns empty strings but the attribute should exist
    expect(html).toContain('data-vg-styles');
    div.remove();
  });

  it('(+) serializes shadow DOM content', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<span>shadow content</span>';
    const html = captureSnapshot();
    expect(html).toContain('data-vg-shadow');
    expect(html).toContain('shadow content');
    host.remove();
  });
});
