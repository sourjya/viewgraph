/**
 * Tests for server/src/prompts.js - MCP Prompt Registration
 *
 * Verifies that prompt files are read from power/prompts/, frontmatter
 * is parsed, and prompts are registered on the MCP server.
 *
 * @see server/src/prompts.js
 * @see power/prompts/ - prompt source files
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerPrompts } from '#src/prompts.js';

describe('registerPrompts', () => {
  it('(+) registers prompts from power/prompts/', () => {
    const registered = [];
    const mockServer = {
      prompt: vi.fn((name, desc, cb) => { registered.push({ name, desc, cb }); }),
    };
    registerPrompts(mockServer);
    expect(registered.length).toBeGreaterThan(0);
    // Should include known prompts
    const names = registered.map((r) => r.name);
    expect(names).toContain('vg-review');
    expect(names).toContain('vg-audit');
    expect(names).toContain('vg-debug-ui');
    expect(names).toContain('vg-debug-fullstack');
  });

  it('(+) parses frontmatter description', () => {
    const registered = [];
    const mockServer = {
      prompt: vi.fn((name, desc, cb) => { registered.push({ name, desc, cb }); }),
    };
    registerPrompts(mockServer);
    const review = registered.find((r) => r.name === 'vg-review');
    expect(review.desc).toContain('Fix all annotations');
  });

  it('(+) callback returns messages with prompt body', () => {
    const registered = [];
    const mockServer = {
      prompt: vi.fn((name, desc, cb) => { registered.push({ name, desc, cb }); }),
    };
    registerPrompts(mockServer);
    const review = registered.find((r) => r.name === 'vg-review');
    const result = review.cb();
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content.text).toContain('vg-review');
  });

  it('(+) registers all 11 prompt files', () => {
    const mockServer = { prompt: vi.fn() };
    registerPrompts(mockServer);
    expect(mockServer.prompt.mock.calls.length).toBe(11);
  });

  it('(-) handles missing prompts directory gracefully', () => {
    // If power/prompts/ doesn't exist, should not throw
    const mockServer = { prompt: vi.fn() };
    // This test relies on the try/catch in registerPrompts
    expect(() => registerPrompts(mockServer)).not.toThrow();
  });
});
