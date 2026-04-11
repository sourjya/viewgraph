/**
 * State Machine Visualization
 *
 * Analyzes session captures (multi-step flows) to build a state diagram
 * showing which elements appear, disappear, or change at each transition.
 * Outputs a Mermaid-compatible state diagram.
 *
 * Use case: "Show me the login flow as a state machine - what changes
 * between each step?"
 *
 * @see docs/roadmap/roadmap.md - M15.4
 */

import { flattenNodes } from '#src/analysis/node-queries.js';

/**
 * Build a state machine from session step captures.
 * @param {Array<{ step: number, note: string, parsed: object }>} steps
 * @returns {{ states: Array, transitions: Array, mermaid: string }}
 */
export function buildStateMachine(steps) {
  if (steps.length === 0) return { states: [], transitions: [], mermaid: '' };

  const states = steps.map((step) => {
    const nodes = flattenNodes(step.parsed);
    const interactive = nodes.filter((n) => n.actions?.length > 0);
    const headings = nodes.filter((n) => n.tag?.match(/^h[1-6]$/));
    return {
      step: step.step,
      note: step.note || `Step ${step.step}`,
      elementCount: nodes.length,
      interactiveCount: interactive.length,
      headings: headings.map((h) => h.text?.slice(0, 40)).filter(Boolean),
      testids: interactive.map((n) => n.testid || n.attributes?.['data-testid']).filter(Boolean).slice(0, 10),
    };
  });

  const transitions = [];
  for (let i = 0; i < states.length - 1; i++) {
    const from = states[i];
    const to = states[i + 1];
    const fromIds = new Set(from.testids);
    const toIds = new Set(to.testids);
    const added = to.testids.filter((id) => !fromIds.has(id));
    const removed = from.testids.filter((id) => !toIds.has(id));

    transitions.push({
      from: from.step,
      to: to.step,
      added: added.slice(0, 5),
      removed: removed.slice(0, 5),
      elementDelta: to.elementCount - from.elementCount,
    });
  }

  // Generate Mermaid state diagram
  const lines = ['stateDiagram-v2'];
  for (const state of states) {
    const label = state.note.replace(/"/g, "'");
    lines.push(`    s${state.step}: "${label} (${state.elementCount} elements)"`);
  }
  for (const t of transitions) {
    const changes = [];
    if (t.added.length) changes.push(`+${t.added.length} elements`);
    if (t.removed.length) changes.push(`-${t.removed.length} elements`);
    const label = changes.length ? changes.join(', ') : `${t.elementDelta >= 0 ? '+' : ''}${t.elementDelta} elements`;
    lines.push(`    s${t.from} --> s${t.to}: ${label}`);
  }

  return { states, transitions, mermaid: lines.join('\n') };
}
