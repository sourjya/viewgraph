/**
 * Annotation-to-Spec Generator
 *
 * Converts batched annotations from captures into a structured Kiro spec
 * with requirements and tasks. Groups annotations by page and severity,
 * generates requirements from comments, and creates implementation tasks.
 *
 * Output format matches `.kiro/specs/{feature-name}/` structure:
 * - requirements.md: user-facing requirements derived from annotations
 * - tasks.md: implementation tasks with file references
 *
 * @see docs/roadmap/roadmap.md - M10.7
 */

/**
 * Generate a Kiro spec from annotations.
 * @param {Array<{ comment: string, severity: string, category: string, selector: string, page: string }>} annotations
 * @param {{ specName?: string }} options
 * @returns {{ requirements: string, tasks: string }}
 */
export function generateSpec(annotations, options = {}) {
  const specName = options.specName || 'ui-fixes';
  const open = annotations.filter((a) => !a.resolved);
  if (open.length === 0) return { requirements: '# Requirements\n\nNo open annotations found.\n', tasks: '# Tasks\n\nNo tasks to generate.\n' };

  // Group by severity
  const bySeverity = { critical: [], major: [], minor: [] };
  for (const ann of open) {
    const sev = ann.severity || 'minor';
    if (!bySeverity[sev]) bySeverity[sev] = [];
    bySeverity[sev].push(ann);
  }

  // Group by page
  const byPage = new Map();
  for (const ann of open) {
    const page = ann.page || 'unknown';
    if (!byPage.has(page)) byPage.set(page, []);
    byPage.get(page).push(ann);
  }

  // Generate requirements.md
  const reqLines = [`# Requirements: ${specName}`, '', `Generated from ${open.length} annotations across ${byPage.size} page(s).`, ''];
  let reqNum = 1;
  for (const [page, anns] of byPage) {
    reqLines.push(`## ${page}`, '');
    for (const ann of anns) {
      reqLines.push(`### REQ-${reqNum}: ${ann.comment?.slice(0, 80) || 'Fix UI issue'}`);
      reqLines.push(`- Severity: ${ann.severity || 'minor'}`);
      reqLines.push(`- Category: ${ann.category || 'visual'}`);
      reqLines.push(`- Element: \`${ann.selector || 'unknown'}\``);
      reqLines.push('');
      reqNum++;
    }
  }

  // Generate tasks.md
  const taskLines = [`# Tasks: ${specName}`, '', `${open.length} tasks generated from annotations.`, ''];
  let taskNum = 1;
  const severityOrder = ['critical', 'major', 'minor'];
  for (const sev of severityOrder) {
    const anns = bySeverity[sev] || [];
    if (anns.length === 0) continue;
    taskLines.push(`## ${sev.charAt(0).toUpperCase() + sev.slice(1)} Priority`, '');
    for (const ann of anns) {
      taskLines.push(`- [ ] Task ${taskNum}: ${ann.comment?.slice(0, 80) || 'Fix UI issue'}`);
      taskLines.push(`  - Element: \`${ann.selector || 'unknown'}\``);
      taskLines.push(`  - Page: ${ann.page || 'unknown'}`);
      taskNum++;
    }
    taskLines.push('');
  }

  return { requirements: reqLines.join('\n'), tasks: taskLines.join('\n') };
}
