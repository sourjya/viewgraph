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

  // Separate ideas from bugs
  const ideas = open.filter((a) => (a.category || '').includes('idea'));
  const bugs = open.filter((a) => !(a.category || '').includes('idea'));

  // If all annotations are ideas, generate a feature spec
  if (bugs.length === 0 && ideas.length > 0) return generateFeatureSpec(ideas, specName);

  // If mixed, generate both sections
  const bugSpec = bugs.length > 0 ? generateBugSpec(bugs, specName) : { requirements: '', tasks: '' };
  const ideaSpec = ideas.length > 0 ? generateFeatureSpec(ideas, specName) : { requirements: '', tasks: '' };

  return {
    requirements: bugSpec.requirements + (ideas.length > 0 ? '\n---\n\n' + ideaSpec.requirements : ''),
    tasks: bugSpec.tasks + (ideas.length > 0 ? '\n---\n\n' + ideaSpec.tasks : ''),
  };
}

/**
 * Generate a feature spec from idea annotations.
 * @param {Array} ideas - Annotations with idea category
 * @param {string} specName
 * @returns {{ requirements: string, tasks: string }}
 */
function generateFeatureSpec(ideas, specName) {
  const byPage = new Map();
  for (const ann of ideas) {
    const page = ann.page || 'unknown';
    if (!byPage.has(page)) byPage.set(page, []);
    byPage.get(page).push(ann);
  }

  const reqLines = [`# Feature Requirements: ${specName}`, '', `Generated from ${ideas.length} idea(s) across ${byPage.size} page(s).`, ''];
  let reqNum = 1;
  for (const [page, anns] of byPage) {
    reqLines.push(`## ${page}`, '');
    for (const ann of anns) {
      reqLines.push(`### FEAT-${reqNum}: ${ann.comment?.slice(0, 80) || 'New feature'}`);
      reqLines.push(`- Element context: \`${ann.selector || 'page-level'}\``);
      reqLines.push(`- User story: As a user, I want ${ann.comment?.toLowerCase() || 'this feature'}`);
      reqLines.push(`- Acceptance criteria: TBD`);
      reqLines.push('');
      reqNum++;
    }
  }

  const taskLines = [`# Feature Tasks: ${specName}`, '', `${ideas.length} feature task(s) to implement.`, ''];
  let taskNum = 1;
  for (const ann of ideas) {
    taskLines.push(`- [ ] Task ${taskNum}: Implement "${ann.comment?.slice(0, 60) || 'new feature'}"`);
    taskLines.push(`  - Context: \`${ann.selector || 'page-level'}\` on ${ann.page || 'unknown'}`);
    taskNum++;
  }
  taskLines.push('');

  return { requirements: reqLines.join('\n'), tasks: taskLines.join('\n') };
}

/**
 * Generate a bug-fix spec from non-idea annotations.
 * @param {Array} bugs - Annotations without idea category
 * @param {string} specName
 * @returns {{ requirements: string, tasks: string }}
 */
function generateBugSpec(bugs, specName) {
  const bySeverity = { critical: [], major: [], minor: [] };
  for (const ann of bugs) {
    const sev = ann.severity || 'minor';
    if (!bySeverity[sev]) bySeverity[sev] = [];
    bySeverity[sev].push(ann);
  }

  const byPage = new Map();
  for (const ann of bugs) {
    const page = ann.page || 'unknown';
    if (!byPage.has(page)) byPage.set(page, []);
    byPage.get(page).push(ann);
  }

  const reqLines = [`# Requirements: ${specName}`, '', `Generated from ${bugs.length} annotations across ${byPage.size} page(s).`, ''];
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
  const taskLines = [`# Tasks: ${specName}`, '', `${bugs.length} tasks generated from annotations.`, ''];
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
