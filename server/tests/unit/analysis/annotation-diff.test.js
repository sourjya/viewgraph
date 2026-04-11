/**
 * Annotation Diff + Recurring Issues - Unit Tests
 *
 * @see src/analysis/annotation-diff.js
 * @see src/analysis/recurring-issues.js
 */

import { describe, it, expect } from 'vitest';
import { diffAnnotations } from '#src/analysis/annotation-diff.js';
import { detectRecurringIssues } from '#src/analysis/recurring-issues.js';

function makeCapture(filename, timestamp, annotations) {
  return { filename, url: 'http://localhost:3000/page', timestamp, annotations };
}

describe('diffAnnotations', () => {
  it('(+) detects persistent issues across captures', () => {
    const captures = [
      makeCapture('cap1.json', '2026-04-10T10:00:00Z', [
        { id: 1, uuid: 'a1', comment: 'Button color wrong', ancestor: 'button.submit', severity: 'major' },
      ]),
      makeCapture('cap2.json', '2026-04-11T10:00:00Z', [
        { id: 1, uuid: 'a2', comment: 'Button color wrong', ancestor: 'button.submit', severity: 'major' },
      ]),
    ];
    const result = diffAnnotations(captures);
    expect(result.persistent.length).toBe(1);
    expect(result.persistent[0].occurrences).toBe(2);
    expect(result.newInLatest.length).toBe(0);
  });

  it('(+) detects new issues in latest capture', () => {
    const captures = [
      makeCapture('cap1.json', '2026-04-10T10:00:00Z', [
        { id: 1, uuid: 'a1', comment: 'Old issue', ancestor: 'div.old', severity: 'minor' },
      ]),
      makeCapture('cap2.json', '2026-04-11T10:00:00Z', [
        { id: 1, uuid: 'a2', comment: 'New issue', ancestor: 'div.new', severity: 'major' },
      ]),
    ];
    const result = diffAnnotations(captures);
    expect(result.newInLatest.length).toBe(1);
    expect(result.newInLatest[0].selector).toBe('div.new');
  });

  it('(+) detects resolved issues', () => {
    const captures = [
      makeCapture('cap1.json', '2026-04-10T10:00:00Z', [
        { id: 1, uuid: 'a1', comment: 'Fixed now', ancestor: 'div.fixed', severity: 'minor' },
      ]),
      makeCapture('cap2.json', '2026-04-11T10:00:00Z', []),
    ];
    const result = diffAnnotations(captures);
    expect(result.resolvedSince.length).toBe(1);
  });

  it('(+) builds timeline', () => {
    const captures = [
      makeCapture('cap1.json', '2026-04-10T10:00:00Z', [{ id: 1, comment: 'A', ancestor: 'x' }]),
      makeCapture('cap2.json', '2026-04-11T10:00:00Z', [{ id: 1, comment: 'A', ancestor: 'x' }, { id: 2, comment: 'B', ancestor: 'y' }]),
    ];
    const result = diffAnnotations(captures);
    expect(result.timeline.length).toBe(2);
    expect(result.timeline[0].total).toBe(1);
    expect(result.timeline[1].total).toBe(2);
  });

  it('(-) returns empty for single capture', () => {
    const result = diffAnnotations([makeCapture('cap1.json', '2026-04-10T10:00:00Z', [])]);
    expect(result.persistent.length).toBe(0);
  });
});

describe('detectRecurringIssues', () => {
  it('(+) finds hotspots flagged in multiple captures', () => {
    const captures = [
      makeCapture('cap1.json', '2026-04-10T10:00:00Z', [
        { id: 1, comment: 'Bad color', ancestor: 'button.submit', severity: 'major' },
      ]),
      makeCapture('cap2.json', '2026-04-11T10:00:00Z', [
        { id: 1, comment: 'Still bad color', ancestor: 'button.submit', severity: 'major' },
      ]),
      makeCapture('cap3.json', '2026-04-12T10:00:00Z', [
        { id: 1, comment: 'Color issue again', ancestor: 'button.submit', severity: 'critical' },
      ]),
    ];
    const result = detectRecurringIssues(captures);
    expect(result.hotspots.length).toBe(1);
    expect(result.hotspots[0].occurrences).toBe(3);
    expect(result.hotspots[0].selector).toBe('button.submit');
  });

  it('(-) ignores resolved annotations', () => {
    const captures = [
      makeCapture('cap1.json', '2026-04-10T10:00:00Z', [
        { id: 1, comment: 'Fixed', ancestor: 'button.submit', resolved: true },
      ]),
      makeCapture('cap2.json', '2026-04-11T10:00:00Z', [
        { id: 1, comment: 'Fixed', ancestor: 'button.submit', resolved: true },
      ]),
    ];
    const result = detectRecurringIssues(captures);
    expect(result.hotspots.length).toBe(0);
  });

  it('(-) respects minOccurrences threshold', () => {
    const captures = [
      makeCapture('cap1.json', '2026-04-10T10:00:00Z', [
        { id: 1, comment: 'Issue', ancestor: 'div.once', severity: 'minor' },
      ]),
    ];
    const result = detectRecurringIssues(captures, { minOccurrences: 2 });
    expect(result.hotspots.length).toBe(0);
  });

  it('(+) sorts by occurrences descending', () => {
    const captures = [
      makeCapture('cap1.json', '2026-04-10T10:00:00Z', [
        { id: 1, comment: 'A', ancestor: 'div.a' },
        { id: 2, comment: 'B', ancestor: 'div.b' },
      ]),
      makeCapture('cap2.json', '2026-04-11T10:00:00Z', [
        { id: 1, comment: 'A', ancestor: 'div.a' },
        { id: 2, comment: 'B', ancestor: 'div.b' },
      ]),
      makeCapture('cap3.json', '2026-04-12T10:00:00Z', [
        { id: 1, comment: 'A', ancestor: 'div.a' },
      ]),
    ];
    const result = detectRecurringIssues(captures);
    expect(result.hotspots[0].selector).toBe('div.a');
    expect(result.hotspots[0].occurrences).toBe(3);
  });
});
