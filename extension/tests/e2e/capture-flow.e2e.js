/**
 * Extension E2E Tests - Placeholder
 *
 * These tests require a real browser with the extension loaded.
 * Implementation planned for M7 (Deployment, Testing, and Automation)
 * using Playwright with extension support.
 *
 * Setup will need:
 * - Playwright with --load-extension flag
 * - A local test page (static HTML fixture)
 * - MCP server running on localhost:9876
 *
 * Run: npx playwright test extension/tests/e2e/
 */

import { describe, it } from 'vitest';

describe.todo('extension capture flow', () => {
  it.todo('captures a page and pushes to MCP server');
  it.todo('capture works on tabs opened before extension was loaded (on-demand injection)');
  it.todo('capture works after page reload without re-clicking extension');
  it.todo('shows element count and filename in popup after capture');
  it.todo('shows error in popup when content script fails');
});

describe.todo('capture consistency', () => {
  it.todo('two captures of the same static page produce identical node counts');
  it.todo('two captures of the same static page produce identical testid sets');
  it.todo('two captures of the same static page produce identical salience tiers');
  it.todo('two captures of the same static page produce identical style palettes');
});

describe.todo('content script injection', () => {
  it.todo('injects content script on demand when not already loaded');
  it.todo('does not double-inject if content script is already loaded');
  it.todo('handles chrome:// and about: pages gracefully (cannot inject)');
  it.todo('handles pages with strict CSP');
});

describe.todo('HTTP push', () => {
  it.todo('pushes capture to MCP server and receives filename');
  it.todo('capture succeeds even when MCP server is not running');
  it.todo('filename includes seconds for sub-minute distinction');
});

describe.todo('DOM traversal fidelity', () => {
  it.todo('skips display:none elements');
  it.todo('skips visibility:hidden elements');
  it.todo('skips zero-size elements');
  it.todo('captures all data-testid attributes');
  it.todo('captures aria-label attributes');
  it.todo('generates document-relative bounding boxes');
  it.todo('extracts computed styles for high-salience elements');
  it.todo('handles same-origin iframes');
  it.todo('skips cross-origin iframes without crashing');
});

describe.todo('salience scoring', () => {
  it.todo('buttons score as high salience');
  it.todo('links score as high salience');
  it.todo('inputs score as high salience');
  it.todo('elements with data-testid get score boost');
  it.todo('elements with aria-label get score boost');
  it.todo('wrapper divs without content score as low salience');
});
