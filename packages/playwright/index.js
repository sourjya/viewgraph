/**
 * @viewgraph/playwright - Core API
 *
 * Creates a ViewGraph instance bound to a Playwright page. Injects the
 * capture bundle on first use and provides methods to capture DOM state,
 * take HTML snapshots, and add programmatic annotations.
 *
 * Can be used standalone (without the fixture) for custom setups:
 *
 *   import { createViewGraph } from '@viewgraph/playwright';
 *   const vg = await createViewGraph(page);
 *   const capture = await vg.capture('after-login');
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { buildBundle } from './bundle.js';

/** Default captures directory relative to cwd. */
const DEFAULT_CAPTURES_DIR = join(process.cwd(), '.viewgraph', 'captures');

/**
 * Create a ViewGraph instance for a Playwright page.
 * @param {import('@playwright/test').Page} page
 * @param {object} [options]
 * @param {string} [options.capturesDir] - Output directory for captures
 * @returns {Promise<ViewGraphPage>}
 */
export async function createViewGraph(page, options = {}) {
  const capturesDir = options.capturesDir || DEFAULT_CAPTURES_DIR;
  await mkdir(capturesDir, { recursive: true });

  let injected = false;

  /**
   * Ensure the VG bundle is injected into the page.
   * Re-injects after navigation since page context resets.
   */
  async function ensureInjected() {
    const hasVg = await page.evaluate(() => typeof window.__vg !== 'undefined');
    if (!hasVg || !injected) {
      const bundle = await buildBundle();
      await page.addScriptTag({ content: bundle });
      injected = true;
    }
  }

  // Re-inject after navigations
  page.on('load', () => { injected = false; });

  return {
    /**
     * Capture the current page state as ViewGraph JSON.
     * @param {string} [label] - Human-readable label for the capture
     * @returns {Promise<object>} The capture JSON object
     */
    async capture(label) {
      await ensureInjected();
      const capture = await page.evaluate(() => {
        const viewport = { width: window.innerWidth, height: window.innerHeight };
        const { elements, relations } = window.__vg.traverseDOM();
        const scored = window.__vg.scoreAll(elements, viewport);
        return window.__vg.serialize(scored, relations);
      });

      // Tag with source and label
      capture.metadata.captureMode = 'playwright';
      if (label) capture.metadata.label = label;

      // Write to captures dir
      const filename = generateFilename(capture.metadata, label);
      await writeFile(join(capturesDir, filename), JSON.stringify(capture));

      return capture;
    },

    /**
     * Capture an HTML snapshot of the current page.
     * @returns {Promise<string>} HTML string
     */
    async snapshot() {
      await ensureInjected();
      return page.evaluate(() => window.__vg.captureSnapshot());
    },

    /**
     * Add a programmatic annotation to the next capture.
     * Useful for marking elements from test assertions.
     * @param {string} selector - CSS selector of the element
     * @param {string} comment - Annotation comment
     * @param {object} [options]
     * @param {string} [options.severity] - critical, major, minor
     * @param {string} [options.category] - visual, functional, a11y, content, perf
     */
    async annotate(selector, comment, options = {}) {
      await ensureInjected();
      const annotation = await page.evaluate(({ sel, cmt, opts }) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          id: `pw-${Date.now()}`,
          uuid: crypto.randomUUID(),
          type: 'element',
          selector: sel,
          comment: cmt,
          severity: opts.severity || '',
          category: opts.category || '',
          region: {
            x: Math.round(rect.left + window.scrollX),
            y: Math.round(rect.top + window.scrollY),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          timestamp: new Date().toISOString(),
        };
      }, { sel: selector, cmt: comment, opts: options });

      if (!annotation) throw new Error(`Element not found: ${selector}`);
      if (!this._annotations) this._annotations = [];
      this._annotations.push(annotation);
      return annotation;
    },

    /**
     * Capture with annotations attached.
     * Combines capture() + any annotations added via annotate().
     * @param {string} [label]
     * @returns {Promise<object>}
     */
    async captureWithAnnotations(label) {
      const capture = await this.capture(label);
      if (this._annotations?.length > 0) {
        capture.annotations = this._annotations;
        capture.metadata.captureMode = 'playwright-review';
        // Re-write with annotations
        const filename = generateFilename(capture.metadata, label);
        await writeFile(join(capturesDir, filename), JSON.stringify(capture));
        this._annotations = [];
      }
      return capture;
    },

    /** Pending annotations from annotate() calls. */
    _annotations: [],
  };
}

/**
 * Generate a capture filename from metadata.
 * @param {object} metadata
 * @param {string} [label]
 * @returns {string}
 */
function generateFilename(metadata, label) {
  let hostname;
  try { hostname = new URL(metadata.url).hostname; } catch { hostname = 'unknown'; }
  const ts = (metadata.timestamp || new Date().toISOString())
    .replace(/[:.]/g, '').replace('T', '-').slice(0, 17);
  const suffix = label ? `-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}` : '';
  return `viewgraph-${hostname}-${ts}${suffix}.json`;
}
