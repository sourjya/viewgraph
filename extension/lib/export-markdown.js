/**
 * Markdown Export
 *
 * Pure function that formats annotations into a structured markdown
 * bug report. No DOM dependency - can be tested in isolation.
 *
 * @see .kiro/specs/multi-export/design.md
 */

/**
 * Format annotations as a markdown bug report.
 * @param {Array} annotations - Array of { id, type, region, comment, ancestor, resolved }
 * @param {{ title: string, url: string, timestamp: string }} metadata - Page metadata
 * @param {{ includeScreenshots?: boolean }} options
 * @returns {string} Markdown string
 */
export function formatMarkdown(annotations, metadata, options = {}) {
  const lines = [];
  const title = metadata.title || 'Untitled Page';
  const date = metadata.timestamp
    ? new Date(metadata.timestamp).toISOString().replace('T', ' ').slice(0, 16)
    : new Date().toISOString().replace('T', ' ').slice(0, 16);

  lines.push(`## ViewGraph Review - ${title}`);
  lines.push(`**URL:** ${metadata.url || '(unknown)'}`);
  lines.push(`**Date:** ${date}`);
  lines.push('');

  if (annotations.length === 0) {
    lines.push('_No annotations._');
    return lines.join('\n');
  }

  for (const ann of annotations) {
    const label = ann.ancestor || ann.type || 'element';
    const prefix = ann.resolved ? '[RESOLVED] ' : '';
    lines.push(`### #${ann.id} - ${label}`);
    lines.push(`${prefix}${ann.comment || '(no comment)'}`);
    if (options.includeScreenshots) {
      lines.push(`![screenshot](screenshots/ann-${ann.id}.png)`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
