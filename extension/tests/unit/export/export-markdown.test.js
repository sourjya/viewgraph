/**
 * Markdown Export - Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { formatMarkdown } from '#lib/export/export-markdown.js';

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
    const anns = [{ id: 1, region: { width: 350, height: 40 }, comment: 'fix', ancestor: 'input', element: { tag: 'input', selector: 'input[type="email"]', placeholder: 'Email', fontSize: '16px', fontFamily: 'system-ui' } }];
    const md = formatMarkdown(anns, META);
    expect(md).toContain('`<input placeholder="Email">`');
    expect(md).toContain('`input[type="email"]`');
    expect(md).toContain('**Font:** 16px / system-ui');
  });

  it('includes region size', () => {
    const anns = [{ id: 1, region: { x: 10, y: 10, width: 200, height: 50 }, comment: 'test', ancestor: 'div' }];
    const md = formatMarkdown(anns, META);
    expect(md).toContain('**Size:** 200 x 50px');
  });
});

  it('includes severity tag when set', () => {
    const anns = [{ id: 1, comment: 'fix', ancestor: 'h1', severity: 'critical' }];
    const md = formatMarkdown(anns, META);
    expect(md).toContain('### #1 - h1 [CRITICAL]');
  });

  it('omits severity tag when not set', () => {
    const anns = [{ id: 1, comment: 'fix', ancestor: 'h1' }];
    const md = formatMarkdown(anns, META);
    expect(md).toContain('### #1 - h1');
    expect(md).not.toContain('[');
  });

  it('includes severity tag for minor', () => {
    const anns = [{ id: 2, comment: 'tweak', ancestor: 'div', severity: 'minor' }];
    const md = formatMarkdown(anns, META);
    expect(md).toContain('[MINOR]');
  });

// ---------------------------------------------------------------------------
// Page notes
// ---------------------------------------------------------------------------

describe('page notes in export', () => {
  it('renders page notes in a separate section', () => {
    const anns = [
      { id: 1, type: 'page-note', comment: 'Overall layout looks off', severity: 'major' },
    ];
    const md = formatMarkdown(anns, META);
    expect(md).toContain('### Page Notes');
    expect(md).toContain('Overall layout looks off');
    expect(md).toContain('[MAJOR]');
  });

  it('separates page notes from element annotations', () => {
    const anns = [
      { id: 1, type: 'page-note', comment: 'Page note' },
      { id: 2, type: 'element', comment: 'Element issue', ancestor: 'button' },
    ];
    const md = formatMarkdown(anns, META);
    expect(md).toContain('### Page Notes');
    expect(md).toContain('### #2 - button');
  });
});

// ---------------------------------------------------------------------------
// Category tags
// ---------------------------------------------------------------------------

describe('category in export', () => {
  it('includes category tag in element annotations', () => {
    const anns = [{ id: 1, comment: 'Wrong color', ancestor: 'div', category: 'visual' }];
    const md = formatMarkdown(anns, META);
    expect(md).toContain('(visual)');
  });

  it('includes category tag in page notes', () => {
    const anns = [{ id: 1, type: 'page-note', comment: 'Slow load', category: 'performance' }];
    const md = formatMarkdown(anns, META);
    expect(md).toContain('(performance)');
  });
});

// ---------------------------------------------------------------------------
// Resolution details
// ---------------------------------------------------------------------------

describe('resolution in export', () => {
  it('shows resolution details for resolved element annotations', () => {
    const anns = [{
      id: 1, comment: 'Fix font', ancestor: 'h1', resolved: true,
      resolution: { action: 'fixed', by: 'kiro', summary: 'Changed to 14px', filesChanged: ['src/app.css'] },
    }];
    const md = formatMarkdown(anns, META);
    expect(md).toContain('[RESOLVED]');
    expect(md).toContain('**Resolution:** fixed by kiro - Changed to 14px');
    expect(md).toContain('**Files:** src/app.css');
  });

  it('shows resolution details for resolved page notes', () => {
    const anns = [{
      id: 1, type: 'page-note', comment: 'Layout issue', resolved: true,
      resolution: { action: 'wontfix', by: 'kiro', summary: 'By design' },
    }];
    const md = formatMarkdown(anns, META);
    expect(md).toContain('_wontfix by kiro: By design_');
  });
});

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

describe('sanitization in export', () => {
  it('escapes backticks in comments', () => {
    const anns = [{ id: 1, comment: 'Use `code` here', ancestor: 'div' }];
    const md = formatMarkdown(anns, META);
    expect(md).toContain('Use \\`code\\` here');
  });

  it('escapes pipes in comments', () => {
    const anns = [{ id: 1, comment: 'A | B | C', ancestor: 'div' }];
    const md = formatMarkdown(anns, META);
    expect(md).toContain('A \\| B \\| C');
  });

  it('includes environment section when enrichment provided', () => {
    const enrichment = {
      breakpoints: { activeRange: 'md', viewport: { width: 768 } },
      network: { requests: [{ url: '/api/users', transferSize: 0, failed: true }], summary: { total: 5, failed: 1 } },
      console: { errors: [{ message: 'No QueryClient set' }], warnings: [], summary: { errors: 1, warnings: 0 } },
    };
    const md = formatMarkdown([{ id: 1, comment: 'broken', ancestor: 'div' }], META, { enrichment });
    expect(md).toContain('### Environment');
    expect(md).toContain('**Breakpoint:** md (768px)');
    expect(md).toContain('**Failed requests:** 1');
    expect(md).toContain('/api/users');
    expect(md).toContain('**Console:** 1 error(s)');
    expect(md).toContain('No QueryClient set');
  });

  it('omits environment section when no enrichment issues', () => {
    const enrichment = {
      network: { requests: [], summary: { total: 0, failed: 0 } },
      console: { errors: [], warnings: [], summary: { errors: 0, warnings: 0 } },
    };
    const md = formatMarkdown([{ id: 1, comment: 'test' }], META, { enrichment });
    expect(md).not.toContain('### Environment');
  });

  it('escapes backticks in resolution summary', () => {
    const anns = [{
      id: 1, comment: 'Fix', ancestor: 'div', resolved: true,
      resolution: { action: 'fixed', by: 'kiro', summary: 'Changed `font-size`' },
    }];
    const md = formatMarkdown(anns, META);
    expect(md).toContain('Changed \\`font-size\\`');
  });
});
