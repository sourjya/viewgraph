/**
 * Session Tools - MCP Tool Integration Tests
 *
 * Tests list_sessions and get_session tools for grouping captures
 * into multi-step user journeys.
 *
 * @see src/tools/list-sessions.js
 * @see src/tools/get-session.js
 */

import { describe, it, expect, afterEach } from 'vitest';
import path from 'path';
import { createTestClient } from './helpers.js';
import { createIndexer } from '#src/indexer.js';
import { register as registerListSessions } from '#src/tools/list-sessions.js';
import { register as registerGetSession } from '#src/tools/get-session.js';

const FIXTURES_DIR = path.resolve(import.meta.dirname, '../../fixtures');

/** Create a client with both session tools and pre-indexed fixtures. */
async function setup() {
  const indexer = createIndexer({ maxCaptures: 50 });
  indexer.add('session-step-1.json', { url: 'http://localhost:3000/login', timestamp: '2026-04-11T10:00:00.000Z', nodeCount: 5 });
  indexer.add('session-step-2.json', { url: 'http://localhost:3000/dashboard', timestamp: '2026-04-11T10:01:00.000Z', nodeCount: 12 });
  indexer.add('valid-capture.json', { url: 'http://localhost:8040/projects', timestamp: '2026-04-08T06:08:15.214Z', nodeCount: 12 });

  const { client, cleanup } = await createTestClient((s) => {
    registerListSessions(s, indexer, FIXTURES_DIR);
    registerGetSession(s, indexer, FIXTURES_DIR);
  });
  return { client, cleanup };
}

describe('list_sessions', () => {
  let cleanup;
  afterEach(async () => { if (cleanup) await cleanup(); });

  it('(+) returns sessions grouped by ID', async () => {
    const ctx = await setup();
    cleanup = ctx.cleanup;
    const result = await ctx.client.callTool({ name: 'list_sessions', arguments: {} });
    const data = JSON.parse(result.content[0].text);
    expect(data.sessions.length).toBe(1);
    expect(data.sessions[0].id).toBe('ses_1712834400');
    expect(data.sessions[0].totalSteps).toBe(2);
    expect(data.sessions[0].name).toBe('Checkout flow');
  });

  it('(+) includes URL list for session', async () => {
    const ctx = await setup();
    cleanup = ctx.cleanup;
    const result = await ctx.client.callTool({ name: 'list_sessions', arguments: {} });
    const data = JSON.parse(result.content[0].text);
    expect(data.sessions[0].urls).toContain('http://localhost:3000/login');
    expect(data.sessions[0].urls).toContain('http://localhost:3000/dashboard');
  });

  it('(-) captures without session metadata are excluded', async () => {
    const ctx = await setup();
    cleanup = ctx.cleanup;
    const result = await ctx.client.callTool({ name: 'list_sessions', arguments: {} });
    const data = JSON.parse(result.content[0].text);
    // valid-capture.json has no session metadata
    expect(data.sessions.length).toBe(1);
  });
});

describe('get_session', () => {
  let cleanup;
  afterEach(async () => { if (cleanup) await cleanup(); });

  it('(+) returns steps in order', async () => {
    const ctx = await setup();
    cleanup = ctx.cleanup;
    const result = await ctx.client.callTool({ name: 'get_session', arguments: { session_id: 'ses_1712834400' } });
    const data = JSON.parse(result.content[0].text);
    expect(data.totalSteps).toBe(2);
    expect(data.steps[0].step).toBe(1);
    expect(data.steps[1].step).toBe(2);
  });

  it('(+) includes step notes', async () => {
    const ctx = await setup();
    cleanup = ctx.cleanup;
    const result = await ctx.client.callTool({ name: 'get_session', arguments: { session_id: 'ses_1712834400' } });
    const data = JSON.parse(result.content[0].text);
    expect(data.steps[0].note).toBe('Opened login page');
    expect(data.steps[1].note).toBe('Logged in');
  });

  it('(+) computes diffs between consecutive steps', async () => {
    const ctx = await setup();
    cleanup = ctx.cleanup;
    const result = await ctx.client.callTool({ name: 'get_session', arguments: { session_id: 'ses_1712834400' } });
    const data = JSON.parse(result.content[0].text);
    expect(data.diffs.length).toBe(1);
    expect(data.diffs[0].urlChanged).toBe(true);
    expect(data.diffs[0].titleChanged).toBe(true);
    expect(data.diffs[0].nodeCountDelta).toBe(7);
  });

  it('(+) includes prompt injection notice', async () => {
    const ctx = await setup();
    cleanup = ctx.cleanup;
    const result = await ctx.client.callTool({ name: 'get_session', arguments: { session_id: 'ses_1712834400' } });
    const data = JSON.parse(result.content[0].text);
    expect(data._notice).toBeTruthy();
  });

  it('(-) returns error for unknown session', async () => {
    const ctx = await setup();
    cleanup = ctx.cleanup;
    const result = await ctx.client.callTool({ name: 'get_session', arguments: { session_id: 'ses_nonexistent' } });
    expect(result.isError).toBe(true);
  });
});
