/**
 * Markdown Export - Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { formatMarkdown } from '../../lib/export-markdown.js';

const META = { title: 'Login Page', url: 'http://localhost:3000/login', timestamp: '2026-04-09T00:40:00Z' };

describe('formatMarkdown', () => {
  it('returns header with title, url, date', () => {
    const md = formatMarkdown([], META);
    expect(md).toContain('## ViewGraph Review - Login Page');
    expect(md).toContain('**URL:** http://localhost:3000/login');
    expect(md).toContain('**Date:** 2026-04-09 00:40');
  });

  it('shows no annotations message when empty', () => {
    const md = formatMarkdown([], META);
    expect(md).toContain('_No annotations._');
  });

  it('formats single annotation', () => {
    const anns = [{ id: 1, type: 'element', region: {}, comment: 'fix this', ancestor: 'div.card' }];
    const md = formatMarkdown(anns, META);
    expect(md).toContain('### #1 - div.card');
    expect(md).toContain('fix this');
  });

  it('formats multiple annotations', () => {
    const anns = [
      { id: 2, type: 'region', region: {}, comment: 'too wide', ancestor: 'div.container' },
      { id: 3, type: 'element', region: {}, comment: 'wrong color', ancestor: 'button' },
    ];
    const md = formatMarkdown(anns, META);
    expect(md).toContain('### #2 - div.container');
    expect(md).toContain('### #3 - button');
  });

  it('marks resolved annotations', () => {
    const anns = [{ id: 1, region: {}, comment: 'done', ancestor: 'h1', resolved: true }];
    const md = formatMarkdown(anns, META);
    expect(md).toContain('[RESOLVED] done');
  });

  it('shows (no comment) for empty comments', () => {
    const anns = [{ id: 1, region: {}, comment: '', ancestor: 'div' }];
    const md = formatMarkdown(anns, META);
    expect(md).toContain('(no comment)');
  });

  it('includes screenshot references when option enabled', () => {
    const anns = [{ id: 5, region: {}, comment: 'bug', ancestor: 'span' }];
    const md = formatMarkdown(anns, META, { includeScreenshots: true });
    expect(md).toContain('![screenshot](screenshots/ann-5.png)');
  });

  it('excludes screenshot references by default', () => {
    const anns = [{ id: 5, region: {}, comment: 'bug', ancestor: 'span' }];
    const md = formatMarkdown(anns, META);
    expect(md).not.toContain('![screenshot]');
  });

  it('falls back to type when no ancestor', () => {
    const anns = [{ id: 1, type: 'region', region: {}, comment: 'test' }];
    const md = formatMarkdown(anns, META);
    expect(md).toContain('### #1 - region');
  });

  it('handles missing metadata gracefully', () => {
    const md = formatMarkdown([], {});
    expect(md).toContain('Untitled Page');
    expect(md).toContain('(unknown)');
  });

  it('includes viewport when provided', () => {
    const md = formatMarkdown([], { ...META, viewport: { width: 1440, height: 900 } });
    expect(md).toContain('**Viewport:** 1440 x 900');
  });

  it('includes browser when provided', () => {
    const md = formatMarkdown([], { ...META, browser: 'Chrome/126' });
    expect(md).toContain('**Browser:** Chrome/126');
  });

  it('includes element details when present', () => {
    const anns = [{ id: 1, region: { width: 350, height: 40 }, comment: 'fix', ancestor: 'input', element: { tag: 'input', selector: 'input[type="email"]' } }];
    const md = formatMarkdown(anns, META);
    expect(md).toContain('`<input>`');
    expect(md).toContain('`input[type="email"]`');
  });

  it('includes region size', () => {
    const anns = [{ id: 1, region: { x: 10, y: 10, width: 200, height: 50 }, comment: 'test', ancestor: 'div' }];
    const md = formatMarkdown(anns, META);
    expect(md).toContain('**Size:** 200 x 50px');
  });
  });
});
