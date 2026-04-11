/**
 * Spec Generator - Unit Tests
 *
 * @see src/analysis/spec-generator.js
 */

import { describe, it, expect } from 'vitest';
import { generateSpec } from '#src/analysis/spec-generator.js';

describe('generateSpec', () => {
  it('(+) generates requirements and tasks from annotations', () => {
    const annotations = [
      { comment: 'Button color is wrong', severity: 'major', category: 'visual', selector: 'button.submit', page: '/login' },
      { comment: 'Missing placeholder', severity: 'minor', category: 'content', selector: 'input#email', page: '/login' },
    ];
    const spec = generateSpec(annotations, { specName: 'login-fixes' });
    expect(spec.requirements).toContain('REQ-1');
    expect(spec.requirements).toContain('Button color is wrong');
    expect(spec.requirements).toContain('login-fixes');
    expect(spec.tasks).toContain('Task 1');
    expect(spec.tasks).toContain('Major Priority');
  });

  it('(+) groups by severity in tasks', () => {
    const annotations = [
      { comment: 'Critical bug', severity: 'critical', selector: 'div.crash', page: '/home' },
      { comment: 'Minor tweak', severity: 'minor', selector: 'p.text', page: '/home' },
    ];
    const spec = generateSpec(annotations);
    const critIdx = spec.tasks.indexOf('Critical Priority');
    const minIdx = spec.tasks.indexOf('Minor Priority');
    expect(critIdx).toBeLessThan(minIdx);
  });

  it('(+) groups by page in requirements', () => {
    const annotations = [
      { comment: 'Issue A', severity: 'major', selector: 'div.a', page: '/page-a' },
      { comment: 'Issue B', severity: 'major', selector: 'div.b', page: '/page-b' },
    ];
    const spec = generateSpec(annotations);
    expect(spec.requirements).toContain('/page-a');
    expect(spec.requirements).toContain('/page-b');
  });

  it('(-) handles empty annotations', () => {
    const spec = generateSpec([]);
    expect(spec.requirements).toContain('No open annotations');
  });

  it('(-) skips resolved annotations', () => {
    const annotations = [
      { comment: 'Fixed', severity: 'minor', selector: 'div.x', page: '/p', resolved: true },
    ];
    const spec = generateSpec(annotations);
    expect(spec.requirements).toContain('No open annotations');
  });
});
