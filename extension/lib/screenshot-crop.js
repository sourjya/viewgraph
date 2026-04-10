/**
 * Screenshot Cropping
 *
 * Crops a full viewport screenshot to individual annotation regions
 * using an offscreen canvas. Called from the background script after
 * captureVisibleTab() provides the full viewport PNG.
 *
 * @see .kiro/specs/multi-export/design.md
 */

/**
 * Crop a viewport screenshot to multiple annotation regions.
 * @param {string} viewportDataUrl - Full viewport PNG as data URL
 * @param {Array<{ id: number, region: { x: number, y: number, width: number, height: number } }>} annotations
 * @param {{ scrollX?: number, scrollY?: number }} scroll - Page scroll at capture time
 * @returns {Promise<Array<{ id: number, dataUrl: string }>>} Cropped screenshots
 */
export async function cropRegions(viewportDataUrl, annotations, scroll = {}) {
  const img = await loadImage(viewportDataUrl);
  const results = [];
  const scrollX = scroll.scrollX || 0;
  const scrollY = scroll.scrollY || 0;

  for (const ann of annotations) {
    const { x, y, width, height } = ann.region;
    if (width <= 0 || height <= 0) continue;

    const canvas = document.createElement('canvas');
    // Region coords are page-relative (include scroll offset).
    // captureVisibleTab is viewport-relative. Convert by subtracting scroll.
    const sx = Math.max(0, x - scrollX);
    const sy = Math.max(0, y - scrollY);
    // Clamp to image bounds
    const cw = Math.min(width, img.width - sx);
    const ch = Math.min(height, img.height - sy);
    if (cw <= 0 || ch <= 0) continue;
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, sx, sy, cw, ch, 0, 0, cw, ch);
    results.push({ id: ann.id, dataUrl: canvas.toDataURL('image/png') });
  }

  return results;
}

/** Load an image from a data URL. */
function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}
