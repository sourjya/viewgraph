/**
 * State Machine Visualization - Unit Tests
 *
 * @see src/analysis/state-machine.js
 */

import { describe, it, expect } from 'vitest';
import { buildStateMachine } from '#src/analysis/state-machine.js';

function makeStep(step, note, nodes) {
  return {
    step,
    note,
    parsed: {
      nodes: { high: nodes, med: [], low: [] },
      details: { high: {}, med: {}, low: {} },
    },
  };
}

describe('buildStateMachine', () => {
  it('(+) builds states and transitions from steps', () => {
    const steps = [
      makeStep(1, 'Login Page', [
        { id: 'b1', tag: 'button', text: 'Login', actions: ['click'], attributes: { 'data-testid': 'login-btn' } },
        { id: 'i1', tag: 'input', text: '', actions: ['input'], attributes: { 'data-testid': 'email-input' } },
      ]),
      makeStep(2, 'Dashboard', [
        { id: 'b2', tag: 'button', text: 'Logout', actions: ['click'], attributes: { 'data-testid': 'logout-btn' } },
        { id: 'h1', tag: 'h1', text: 'Welcome' },
      ]),
    ];
    const result = buildStateMachine(steps);
    expect(result.states.length).toBe(2);
    expect(result.transitions.length).toBe(1);
    expect(result.transitions[0].added).toContain('logout-btn');
    expect(result.transitions[0].removed).toContain('login-btn');
  });

  it('(+) generates Mermaid diagram', () => {
    const steps = [
      makeStep(1, 'Step A', [{ id: 'b1', tag: 'button', text: 'Go', actions: ['click'] }]),
      makeStep(2, 'Step B', [{ id: 'b2', tag: 'button', text: 'Back', actions: ['click'] }]),
    ];
    const result = buildStateMachine(steps);
    expect(result.mermaid).toContain('stateDiagram-v2');
    expect(result.mermaid).toContain('s1');
    expect(result.mermaid).toContain('s2');
    expect(result.mermaid).toContain('-->');
  });

  it('(+) handles 3+ steps', () => {
    const steps = [
      makeStep(1, 'Login', []),
      makeStep(2, 'Dashboard', [{ id: 'b1', tag: 'button', text: 'Go', actions: ['click'] }]),
      makeStep(3, 'Settings', [{ id: 'b1', tag: 'button', text: 'Go', actions: ['click'] }, { id: 'b2', tag: 'button', text: 'Save', actions: ['click'] }]),
    ];
    const result = buildStateMachine(steps);
    expect(result.states.length).toBe(3);
    expect(result.transitions.length).toBe(2);
  });

  it('(-) returns empty for no steps', () => {
    const result = buildStateMachine([]);
    expect(result.states.length).toBe(0);
    expect(result.mermaid).toBe('');
  });
});
