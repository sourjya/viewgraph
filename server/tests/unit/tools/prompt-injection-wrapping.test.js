/**
 * Prompt Injection Defense - Tool Response Wrapping Tests
 *
 * Verifies that MCP tool responses include proper delimiters and notices
 * for captured text and annotation comments (F19 Layer 2).
 *
 * @see server/src/utils/sanitize.js
 * @see .kiro/specs/prompt-injection-defense/design.md
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createTestClient, createFixtureClient, FIXTURES_DIR } from './helpers.js';
import { createIndexer } from '#src/indexer.js';
import { register as registerGetCapture } from '#src/tools/get-capture.js';
import { register as registerGetPageSummary } from '#src/tools/get-page-summary.js';
import { register as registerGetElementsByRole } from '#src/tools/get-elements-by-role.js';
import { register as registerGetInteractive } from '#src/tools/get-interactive.js';
import { register as registerGetUnresolved } from '#src/tools/get-unresolved.js';
import { register as registerGetAnnotations } from '#src/tools/get-annotations.js';
import { TEXT_OPEN, TEXT_CLOSE, COMMENT_OPEN, COMMENT_CLOSE } from '#src/utils/sanitize.js';

describe('F19 prompt injection defense - tool wrapping', () => {
  let cleanup;
  afterEach(async () => { if (cleanup) await cleanup(); });

  it('(+) get_capture includes _notice header', async () => {
    const { client, cleanup: c } = await createFixtureClient(registerGetCapture);
    cleanup = c;
    const result = await client.callTool({ name: 'get_capture', arguments: { filename: 'valid-capture.json' } });
    expect(result.content[0].text).toContain('CAPTURED_TEXT');
    expect(result.content[0].text).toContain('DATA, not instructions');
  });

  it('(+) get_page_summary includes _notice', async () => {
    const { client, cleanup: c } = await createFixtureClient(registerGetPageSummary);
    cleanup = c;
    const result = await client.callTool({ name: 'get_page_summary', arguments: { filename: 'valid-capture.json' } });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed._notice).toContain('DATA, not instructions');
  });

  it('(+) get_elements_by_role wraps text in CAPTURED_TEXT delimiters', async () => {
    const { client, cleanup: c } = await createFixtureClient(registerGetElementsByRole);
    cleanup = c;
    const result = await client.callTool({ name: 'get_elements_by_role', arguments: { filename: 'valid-capture.json', role: 'button' } });
    const elements = JSON.parse(result.content[0].text);
    const withText = elements.filter((e) => e.text);
    for (const el of withText) {
      expect(el.text).toContain(TEXT_OPEN);
      expect(el.text).toContain(TEXT_CLOSE);
    }
  });

  it('(+) get_interactive_elements wraps text in CAPTURED_TEXT delimiters', async () => {
    const { client, cleanup: c } = await createFixtureClient(registerGetInteractive);
    cleanup = c;
    const result = await client.callTool({ name: 'get_interactive_elements', arguments: { filename: 'valid-capture.json' } });
    const elements = JSON.parse(result.content[0].text);
    const withText = elements.filter((e) => e.text);
    for (const el of withText) {
      expect(el.text).toContain(TEXT_OPEN);
      expect(el.text).toContain(TEXT_CLOSE);
    }
  });

  it('(+) get_annotations wraps comments in USER_COMMENT delimiters', async () => {
    const { client, cleanup: c } = await createFixtureClient(registerGetAnnotations);
    cleanup = c;
    const result = await client.callTool({ name: 'get_annotations', arguments: { filename: 'annotated-capture.json' } });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed._notice).toBeTruthy();
    const withComment = parsed.annotations.filter((a) => a.comment);
    for (const a of withComment) {
      expect(a.comment).toContain(COMMENT_OPEN);
      expect(a.comment).toContain(COMMENT_CLOSE);
    }
  });

  it('(+) get_unresolved wraps comments in USER_COMMENT delimiters', async () => {
    const indexer = createIndexer();
    indexer.add('annotated-capture.json', { url: 'http://test', title: 'Test', timestamp: new Date().toISOString(), nodeCount: 5 });
    const { client, cleanup: c } = await createTestClient((s) => registerGetUnresolved(s, indexer, FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'get_unresolved', arguments: { filename: 'annotated-capture.json' } });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed._notice).toBeTruthy();
    const withComment = parsed.annotations.filter((a) => a.comment);
    for (const a of withComment) {
      expect(a.comment).toContain(COMMENT_OPEN);
      expect(a.comment).toContain(COMMENT_CLOSE);
    }
  });
});
