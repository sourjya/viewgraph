/**
 * Screenshot Diff
 *
 * Compares two PNG screenshots pixel-by-pixel using pixelmatch.
 * Returns diff percentage, changed pixel count, and a diff image (base64 PNG).
 *
 * Screenshots are stored alongside captures as base64 PNGs. This module
 * decodes them, compares, and produces a highlighted diff image where
 * changed pixels are shown in red.
 *
 * @see docs/architecture/strategic-recommendations.md - R5
 */

import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

/**
 * Compare two PNG buffers and return diff metrics + diff image.
 * @param {Buffer} pngA - First screenshot (before)
 * @param {Buffer} pngB - Second screenshot (after)
 * @param {{ threshold?: number }} options - pixelmatch threshold (0-1, default 0.1)
 * @returns {{ diffPercent: number, changedPixels: number, totalPixels: number, width: number, height: number, diffPng: Buffer }}
 */
export function diffScreenshots(pngA, pngB, options = {}) {
  const imgA = PNG.sync.read(pngA);
  const imgB = PNG.sync.read(pngB);

  // Use the smaller dimensions if sizes differ
  const width = Math.min(imgA.width, imgB.width);
  const height = Math.min(imgA.height, imgB.height);
  const diff = new PNG({ width, height });

  // Crop to common dimensions if needed
  const dataA = cropImageData(imgA, width, height);
  const dataB = cropImageData(imgB, width, height);

  const changedPixels = pixelmatch(dataA, dataB, diff.data, width, height, {
    threshold: options.threshold ?? 0.1,
    includeAA: false,
  });

  const totalPixels = width * height;
  const diffPercent = totalPixels > 0 ? Math.round((changedPixels / totalPixels) * 10000) / 100 : 0;

  return {
    diffPercent,
    changedPixels,
    totalPixels,
    width,
    height,
    sizeMatch: imgA.width === imgB.width && imgA.height === imgB.height,
    diffPng: PNG.sync.write(diff),
  };
}

/**
 * Crop image data to target dimensions.
 * Returns raw RGBA pixel data for the cropped region.
 * @param {PNG} img
 * @param {number} w
 * @param {number} h
 * @returns {Buffer}
 */
function cropImageData(img, w, h) {
  if (img.width === w && img.height === h) return img.data;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const srcOff = y * img.width * 4;
    const dstOff = y * w * 4;
    img.data.copy(out, dstOff, srcOff, srcOff + w * 4);
  }
  return out;
}
