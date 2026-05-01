/**
 * Shared helpers - Unit Tests
 *
 * Tests for textResponse(), log(), and shared Zod params.
 * These are tested indirectly through tool tests but direct tests
 * catch regressions faster.
 *
 * @see server/src/utils/tool-helpers.js
 * @see server/src/utils/shared-params.js
 * @see server/src/constants.js
 */

import { describe, it, expect, vi } from 'vitest';
import { textResponse, jsonResponse, errorResponse } from '#src/utils/tool-helpers.js';
import { filenameParam, urlFilterParam, limitParam } from '#src/utils/shared-params.js';
import { log } from '#src/constants.js';

describe('textResponse', () => {
  it('(+) returns MCP text content format', () => {
    const result = textResponse('hello');
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toBe('hello');
    expect(result.isError).toBeUndefined();
  });

  it('(-) handles empty string', () => {
    const result = textResponse('');
    expect(result.content[0].text).toBe('');
  });
});

describe('jsonResponse', () => {
  it('(+) stringifies data as JSON', () => {
    const result = jsonResponse({ key: 'value' });
    expect(JSON.parse(result.content[0].text)).toEqual({ key: 'value' });
  });
});

describe('errorResponse', () => {
  it('(+) sets isError flag', () => {
    const result = errorResponse('bad');
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('bad');
  });
});

describe('shared params', () => {
  it('(+) filenameParam accepts strings', () => {
    expect(filenameParam.parse('test.json')).toBe('test.json');
  });

  it('(-) filenameParam rejects non-strings', () => {
    expect(() => filenameParam.parse(123)).toThrow();
  });

  it('(+) urlFilterParam is optional', () => {
    expect(urlFilterParam.parse(undefined)).toBeUndefined();
    expect(urlFilterParam.parse('localhost')).toBe('localhost');
  });

  it('(+) limitParam defaults to 20', () => {
    expect(limitParam.parse(undefined)).toBe(20);
    expect(limitParam.parse(50)).toBe(50);
  });
});

describe('log', () => {
  it('(+) writes to stderr with prefix', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    log('test message');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[viewgraph]'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('test message'));
    spy.mockRestore();
  });
});
