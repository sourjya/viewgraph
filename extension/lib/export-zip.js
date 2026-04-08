/**
 * ZIP Export
 *
 * Assembles a markdown report + optional cropped screenshots into a
 * downloadable ZIP file. Uses JSZip for archive creation.
 *
 * @see .kiro/specs/multi-export/design.md
 */

import JSZip from 'jszip';
import { formatMarkdown } from './export-markdown.js';

/**
 * Build a ZIP blob containing the review report.
 * @param {Array} annotations - Annotation objects
 * @param {{ title: string, url: string, timestamp: string }} metadata
 * @param {Array<{ id: number, dataUrl: string }>} [screenshots] - Cropped screenshots
 * @returns {Promise<Blob>} ZIP blob ready for download
 */
export async function buildReportZip(annotations, metadata, screenshots = []) {
  const zip = new JSZip();
  const hasScreenshots = screenshots.length > 0;

  // Add markdown report
  const md = formatMarkdown(annotations, metadata, { includeScreenshots: hasScreenshots });
  zip.file('report.md', md);

  // Add cropped screenshots
  if (hasScreenshots) {
    const folder = zip.folder('screenshots');
    for (const { id, dataUrl } of screenshots) {
      // Strip data URL prefix to get raw base64
      const base64 = dataUrl.split(',')[1];
      folder.file(`ann-${id}.png`, base64, { base64: true });
    }
  }

  return zip.generateAsync({ type: 'blob' });
}
