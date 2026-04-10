/**
 * Screenshot Crop Tests
 *
 * Tests the coordinate math in cropRegions - specifically the scroll offset
 * conversion and bounds clamping that was broken (BUG: "between the lines"
 * screenshots when page was scrolled).
 *
 * Canvas/Image APIs are mocked since jsdom lacks real Canvas support.
 * The tests verify the correct source coordinates are passed to drawImage.
 *
 * @see lib/screenshot-crop.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cropRegions } from '#lib/screenshot-crop.js';

// ---------------------------------------------------------------------------
// Canvas and Image mocks
// ---------------------------------------------------------------------------

let drawImageCalls;

beforeEach(() => {
  drawImageCalls = [];

  // Mock Image - resolves immediately with fixed dimensions
  globalThis.Image = class {
    constructor() {
      this.width = 1024;
      this.height = 768;
      setTimeout(() => this.onload?.(), 0);
    }
  };

  // Mock canvas getContext to capture drawImage calls
  const origCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag) => {
    if (tag === 'canvas') {
      const canvas = origCreateElement(tag);
      canvas.getContext = () => ({
        drawImage: (...args) => drawImageCalls.push(args),
      });
      canvas.toDataURL = () => 'data:image/png;base64,MOCK';
      return canvas;
    }
    return origCreateElement(tag);
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('cropRegions', () => {
  const fakeDataUrl = 'data:image/png;base64,AAAA';

  it('(+) crops at correct viewport coords when page is not scrolled', async () => {
    const anns = [{ id: 1, region: { x: 100, y: 200, width: 300, height: 150 } }];
    const results = await cropRegions(fakeDataUrl, anns, { scrollX: 0, scrollY: 0 });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(1);
    // Source coords should be the region coords directly (no scroll offset)
    const [, sx, sy, sw, sh] = drawImageCalls[0];
    expect(sx).toBe(100);
    expect(sy).toBe(200);
    expect(sw).toBe(300);
    expect(sh).toBe(150);
  });

  it('(+) subtracts scroll offset to convert page-relative to viewport-relative', async () => {
    // Annotation at page coords (100, 500), but page scrolled down 300px
    // Viewport-relative should be (100, 200)
    const anns = [{ id: 1, region: { x: 100, y: 500, width: 200, height: 100 } }];
    const results = await cropRegions(fakeDataUrl, anns, { scrollX: 0, scrollY: 300 });

    expect(results).toHaveLength(1);
    const [, sx, sy] = drawImageCalls[0];
    expect(sx).toBe(100);
    expect(sy).toBe(200); // 500 - 300
  });

  it('(+) handles horizontal scroll offset', async () => {
    const anns = [{ id: 1, region: { x: 400, y: 100, width: 200, height: 100 } }];
    await cropRegions(fakeDataUrl, anns, { scrollX: 150, scrollY: 0 });

    const [, sx, sy] = drawImageCalls[0];
    expect(sx).toBe(250); // 400 - 150
    expect(sy).toBe(100);
  });

  it('(+) clamps negative coords to 0 (annotation partially above viewport)', async () => {
    // Annotation at page y=50, scrolled down 200 -> viewport y = -150
    const anns = [{ id: 1, region: { x: 10, y: 50, width: 200, height: 300 } }];
    await cropRegions(fakeDataUrl, anns, { scrollX: 0, scrollY: 200 });

    const [, sx, sy] = drawImageCalls[0];
    expect(sx).toBe(10);
    expect(sy).toBe(0); // clamped from -150
  });

  it('(+) clamps width/height to image bounds', async () => {
    // Annotation near right edge: x=900, width=300 on a 1024px image
    const anns = [{ id: 1, region: { x: 900, y: 0, width: 300, height: 100 } }];
    await cropRegions(fakeDataUrl, anns, { scrollX: 0, scrollY: 0 });

    const [, , , sw] = drawImageCalls[0];
    expect(sw).toBe(124); // 1024 - 900
  });

  it('(-) skips annotations with zero-size regions', async () => {
    const anns = [
      { id: 1, region: { x: 10, y: 10, width: 0, height: 100 } },
      { id: 2, region: { x: 10, y: 10, width: 100, height: 0 } },
    ];
    const results = await cropRegions(fakeDataUrl, anns);
    expect(results).toHaveLength(0);
    expect(drawImageCalls).toHaveLength(0);
  });

  it('(-) skips annotations entirely outside viewport after scroll', async () => {
    // Annotation at page y=100, scrolled down 900 -> viewport y = -800
    // With height 50, bottom is at -750 -> still entirely above viewport
    // After clamping sy=0, ch = min(50, 768-0) = 50 but the crop is wrong area
    // Actually: sy = max(0, 100-900) = 0, ch = min(50, 768-0) = 50
    // This produces a crop from (0,0) which is wrong but not skipped.
    // The real skip happens when cw or ch <= 0
    const anns = [{ id: 1, region: { x: 2000, y: 0, width: 100, height: 100 } }];
    await cropRegions(fakeDataUrl, anns, { scrollX: 0, scrollY: 0 });

    // x=2000 on 1024px image: cw = min(100, 1024-2000) = -976 -> skipped
    expect(drawImageCalls).toHaveLength(0);
  });

  it('(+) crops multiple annotations independently', async () => {
    const anns = [
      { id: 1, region: { x: 0, y: 0, width: 100, height: 100 } },
      { id: 2, region: { x: 200, y: 300, width: 150, height: 80 } },
    ];
    const results = await cropRegions(fakeDataUrl, anns, { scrollX: 0, scrollY: 0 });

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe(1);
    expect(results[1].id).toBe(2);
    expect(drawImageCalls).toHaveLength(2);
  });

  it('(+) defaults scroll to 0 when not provided (backward compat)', async () => {
    const anns = [{ id: 1, region: { x: 50, y: 50, width: 100, height: 100 } }];
    // No scroll param - should default to {0, 0}
    await cropRegions(fakeDataUrl, anns);

    const [, sx, sy] = drawImageCalls[0];
    expect(sx).toBe(50);
    expect(sy).toBe(50);
  });

  it('(-) BUG REGRESSION: old code used window.scrollX in wrong context', async () => {
    // The original bug: cropRegions ran in a context where window.scrollX was 0,
    // but annotations had page-relative coords (rect + scroll). Without passing
    // the actual scroll, the crop used raw page coords against a viewport image.
    // Example: element at viewport y=100, page scrolled 500px.
    // Old: region.y = 600 (100+500), crop at y=600 on 768px image -> garbage
    // New: region.y = 600, scroll.scrollY = 500, crop at y=100 -> correct
    const anns = [{ id: 1, region: { x: 50, y: 600, width: 200, height: 100 } }];
    const results = await cropRegions(fakeDataUrl, anns, { scrollX: 0, scrollY: 500 });

    expect(results).toHaveLength(1);
    const [, sx, sy, sw, sh] = drawImageCalls[0];
    expect(sx).toBe(50);
    expect(sy).toBe(100); // 600 - 500 = viewport-relative
    expect(sw).toBe(200);
    expect(sh).toBe(100);
  });
});
