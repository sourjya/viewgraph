/**
 * Markdown Export
 *
 * Pure function that formats annotations into a structured markdown
 * bug report. No DOM dependency - can be tested in isolation.
 *
 * Handles three annotation types: element, region, and page-note.
 * Resolution details are included for resolved items.
 *
 * @see .kiro/specs/multi-export/design.md
 */

/** Sanitize text for markdown: escape backticks and pipes. */
function sanitize(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\|/g, '\\|')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

/**
 * Format annotations as a markdown bug report.
 * @param {Array} annotations - Annotation objects with optional element details
 * @param {{ title: string, url: string, timestamp: string, viewport?: object, browser?: string }} metadata
 * @param {{ includeScreenshots?: boolean, enrichment?: object }} options
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
  if (metadata.viewport) lines.push(`**Viewport:** ${metadata.viewport.width} x ${metadata.viewport.height}`);
  if (metadata.browser) lines.push(`**Browser:** ${metadata.browser}`);
  lines.push('');

  // Environment section with enrichment data (network, console, breakpoints)
  if (options.enrichment) {
    const env = options.enrichment;
    const envLines = [];
    if (env.breakpoints?.activeRange) {
      envLines.push(`- **Breakpoint:** ${env.breakpoints.activeRange} (${env.breakpoints.viewport?.width || '?'}px)`);
    }
    if (env.network?.summary?.failed > 0) {
      envLines.push(`- **Failed requests:** ${env.network.summary.failed}`);
      for (const req of (env.network.requests || []).filter((r) => r.failed).slice(0, 5)) {
        envLines.push(`  - \`${req.url.slice(0, 100)}\` (${req.transferSize} bytes)`);
      }
    }
    if (env.console?.summary && (env.console.summary.errors > 0 || env.console.summary.warnings > 0)) {
      const parts = [];
      if (env.console.summary.errors) parts.push(`${env.console.summary.errors} error(s)`);
      if (env.console.summary.warnings) parts.push(`${env.console.summary.warnings} warning(s)`);
      envLines.push(`- **Console:** ${parts.join(', ')}`);
      for (const err of (env.console.errors || []).slice(0, 3)) {
        envLines.push(`  - Error: "${sanitize(err.message.slice(0, 120))}"`);
      }
    }
    if (envLines.length > 0) {
      lines.push('### Environment');
      lines.push(...envLines);
      lines.push('');
    }
  }

  if (annotations.length === 0) {
    lines.push('_No annotations._');
    return lines.join('\n');
  }

  // Separate page notes from element/region annotations
  const pageNotes = annotations.filter((a) => a.type === 'page-note');
  const elementAnns = annotations.filter((a) => a.type !== 'page-note');

  // Page notes section
  if (pageNotes.length > 0) {
    lines.push('### Page Notes');
    lines.push('');
    for (const note of pageNotes) {
      const prefix = note.resolved ? '[RESOLVED] ' : '';
      const sevTag = note.severity ? ` [${note.severity.toUpperCase()}]` : '';
      const catTag = note.category ? ` (${note.category})` : '';
      lines.push(`- ${prefix}${sanitize(note.comment) || '(no comment)'}${sevTag}${catTag}`);
      if (note.resolved && note.resolution) {
        const r = note.resolution;
        lines.push(`  - _${r.action || 'fixed'} by ${sanitize(r.by || 'unknown')}${r.summary ? ': ' + sanitize(r.summary) : ''}_`);
      }
    }
    lines.push('');
  }

  for (const ann of elementAnns) {
    const label = ann.ancestor || ann.type || 'element';
    const prefix = ann.resolved ? '[RESOLVED] ' : '';
    const sevTag = ann.severity ? ` [${ann.severity.toUpperCase()}]` : '';
    const catTag = ann.category ? ` (${ann.category})` : '';
    lines.push(`### #${ann.id} - ${label}${sevTag}${catTag}`);
    lines.push(`${prefix}${sanitize(ann.comment) || '(no comment)'}`);
    if (ann.element) {
      const el = ann.element;
      const tag = el.placeholder ? `<${el.tag} placeholder="${el.placeholder}">` : el.type ? `<${el.tag} type="${el.type}">` : `<${el.tag}>`;
      lines.push(`- **Element:** \`${tag}\``);
      if (el.selector) lines.push(`- **Selector:** \`${el.selector}\``);
      if (el.text) lines.push(`- **Text:** "${sanitize(el.text)}"`);
      if (el.fontSize) lines.push(`- **Font:** ${el.fontSize} / ${el.fontFamily || ''}`);
    }
    if (ann.region && ann.region.width) {
      lines.push(`- **Size:** ${ann.region.width} x ${ann.region.height}px`);
    }
    if (ann.resolved && ann.resolution) {
      const r = ann.resolution;
      lines.push(`- **Resolution:** ${r.action || 'fixed'} by ${sanitize(r.by || 'unknown')}${r.summary ? ' - ' + sanitize(r.summary) : ''}`);
      if (r.filesChanged?.length) lines.push(`- **Files:** ${r.filesChanged.map(sanitize).join(', ')}`);
    }
    if (options.includeScreenshots) {
      lines.push(`![screenshot](screenshots/ann-${ann.id}.png)`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
