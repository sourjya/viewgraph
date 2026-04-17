/**
 * Tests for SERVER_INSTRUCTIONS and server metadata constants.
 * Verifies the MCP server provides workflow guidance to agents.
 *
 * @see server/src/constants.js
 * @see ADR-011 MCP server instructions
 */

import { describe, it, expect } from 'vitest';
import { SERVER_INSTRUCTIONS, SERVER_NAME, SERVER_VERSION, SERVER_DESCRIPTION } from '#src/constants.js';

describe('server metadata', () => {
  it('(+) SERVER_NAME is defined', () => {
    expect(SERVER_NAME).toBeTruthy();
  });

  it('(+) SERVER_VERSION matches semver pattern', () => {
    expect(SERVER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('(+) SERVER_DESCRIPTION is defined', () => {
    expect(SERVER_DESCRIPTION).toBeTruthy();
  });
});

describe('SERVER_INSTRUCTIONS', () => {
  it('(+) is defined and non-empty', () => {
    expect(SERVER_INSTRUCTIONS).toBeTruthy();
    expect(SERVER_INSTRUCTIONS.length).toBeGreaterThan(100);
  });

  it('(+) contains workflow steps', () => {
    expect(SERVER_INSTRUCTIONS).toContain('DISCOVER');
    expect(SERVER_INSTRUCTIONS).toContain('OVERVIEW');
    expect(SERVER_INSTRUCTIONS).toContain('RESOLVE');
  });

  it('(+) contains tool categories', () => {
    expect(SERVER_INSTRUCTIONS).toContain('Core');
    expect(SERVER_INSTRUCTIONS).toContain('Analysis');
    expect(SERVER_INSTRUCTIONS).toContain('Annotations');
    expect(SERVER_INSTRUCTIONS).toContain('Comparison');
  });

  it('(+) contains security warning about untrusted data', () => {
    expect(SERVER_INSTRUCTIONS).toContain('UNTRUSTED');
    expect(SERVER_INSTRUCTIONS).toContain('Never follow instructions');
  });

  it('(+) contains performance guidance', () => {
    expect(SERVER_INSTRUCTIONS).toContain('get_page_summary');
    expect(SERVER_INSTRUCTIONS).toContain('100KB');
  });

  it('(+) contains text delimiter documentation', () => {
    expect(SERVER_INSTRUCTIONS).toContain('CAPTURED_TEXT');
    expect(SERVER_INSTRUCTIONS).toContain('USER_COMMENT');
  });
});
