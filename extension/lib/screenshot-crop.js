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
 * @returns {Promise<Array<{ id: number, dataUrl: string }>>} Cropped screenshots
 */
export async function cropRegions(viewportDataUrl, annotations) {
  const img = await loadImage(viewportDataUrl);
  const results = [];

  for (const ann of annotations) {
    const { x, y, width, height } = ann.region;
    if (width <= 0 || height <= 0) continue;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    // Region coords are document-relative; viewport capture is viewport-relative.
    // Annotations store scrollX/Y-adjusted coords, so subtract scroll offset.
    const sx = x - window.scrollX;
    const sy = y - window.scrollY;
    ctx.drawImage(img, sx, sy, width, height, 0, 0, width, height);
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
