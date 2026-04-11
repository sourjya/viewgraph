/**
 * Screenshot Diff - Unit Tests
 *
 * Tests pixel comparison between PNG images.
 * Creates test PNGs programmatically using pngjs.
 *
 * @see src/analysis/screenshot-diff.js
 */

import { describe, it, expect } from 'vitest';
import { PNG } from 'pngjs';
import { diffScreenshots } from '#src/analysis/screenshot-diff.js';

/** Create a solid-color PNG buffer. */
function makePng(width, height, r, g, b) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

/** Create a PNG with a colored rectangle region. */
function makePngWithRect(width, height, bg, rect) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const inRect = x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
      const color = inRect ? rect.color : bg;
      png.data[idx] = color[0];
      png.data[idx + 1] = color[1];
      png.data[idx + 2] = color[2];
      png.data[idx + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

describe('diffScreenshots', () => {
  it('(+) identical images have 0% diff', () => {
    const png = makePng(100, 100, 255, 255, 255);
    const result = diffScreenshots(png, png);
    expect(result.diffPercent).toBe(0);
    expect(result.changedPixels).toBe(0);
    expect(result.sizeMatch).toBe(true);
  });

  it('(+) completely different images have high diff', () => {
    const white = makePng(100, 100, 255, 255, 255);
    const black = makePng(100, 100, 0, 0, 0);
    const result = diffScreenshots(white, black);
    expect(result.diffPercent).toBeGreaterThan(90);
    expect(result.changedPixels).toBeGreaterThan(9000);
  });

  it('(+) partial change detected', () => {
    const bg = [255, 255, 255];
    const before = makePngWithRect(200, 200, bg, { x: 50, y: 50, w: 50, h: 50, color: [255, 0, 0] });
    const after = makePngWithRect(200, 200, bg, { x: 50, y: 50, w: 50, h: 50, color: [0, 0, 255] });
    const result = diffScreenshots(before, after);
    expect(result.diffPercent).toBeGreaterThan(0);
    expect(result.diffPercent).toBeLessThan(50);
    expect(result.changedPixels).toBeGreaterThan(0);
  });

  it('(+) handles different-sized images', () => {
    const small = makePng(100, 100, 255, 255, 255);
    const large = makePng(200, 200, 255, 255, 255);
    const result = diffScreenshots(small, large);
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
    expect(result.sizeMatch).toBe(false);
  });

  it('(+) returns diff PNG buffer', () => {
    const white = makePng(50, 50, 255, 255, 255);
    const grey = makePng(50, 50, 128, 128, 128);
    const result = diffScreenshots(white, grey);
    expect(result.diffPng).toBeInstanceOf(Buffer);
    expect(result.diffPng.length).toBeGreaterThan(0);
    // Should be a valid PNG (starts with PNG signature)
    expect(result.diffPng[0]).toBe(0x89);
    expect(result.diffPng[1]).toBe(0x50);
  });

  it('(+) threshold affects sensitivity', () => {
    const a = makePng(100, 100, 100, 100, 100);
    const b = makePng(100, 100, 105, 105, 105);
    const strict = diffScreenshots(a, b, { threshold: 0.01 });
    const loose = diffScreenshots(a, b, { threshold: 0.5 });
    expect(strict.changedPixels).toBeGreaterThanOrEqual(loose.changedPixels);
  });
});
