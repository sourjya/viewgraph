/**
 * Source Linker - Unit Tests
 *
 * Tests source file search by testid, aria-label, selector, and text.
 * Uses a temporary project directory with mock source files.
 *
 * @see src/analysis/source-linker.js
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import path from 'path';
import os from 'os';
import { findSource } from '#src/analysis/source-linker.js';

let projectRoot;

beforeAll(async () => {
  projectRoot = await mkdtemp(path.join(os.tmpdir(), 'vg-source-test-'));
  await mkdir(path.join(projectRoot, 'src', 'components'), { recursive: true });
  await mkdir(path.join(projectRoot, 'node_modules', 'react'), { recursive: true });

  // Mock source files
  await writeFile(path.join(projectRoot, 'src', 'components', 'LoginForm.tsx'), [
    'export function LoginForm() {',
    '  return (',
    '    <form aria-label="Login form">',
    '      <input data-testid="email-input" type="email" />',
    '      <input data-testid="password-input" type="password" />',
    '      <button data-testid="login-btn" aria-label="Sign in">Login</button>',
    '    </form>',
    '  );',
    '}',
  ].join('\n'));

  await writeFile(path.join(projectRoot, 'src', 'components', 'Header.tsx'), [
    'export function Header() {',
    '  return <header id="main-header" className="app-header sticky-top">Logo</header>;',
    '}',
  ].join('\n'));

  await writeFile(path.join(projectRoot, 'src', 'App.tsx'), [
    'import { LoginForm } from "./components/LoginForm";',
    'export default function App() {',
    '  return <div className="app-container"><LoginForm /></div>;',
    '}',
  ].join('\n'));

  // File in node_modules (should be skipped)
  await writeFile(path.join(projectRoot, 'node_modules', 'react', 'index.js'),
    'export const data-testid = "email-input";');
});

afterAll(async () => {
  await rm(projectRoot, { recursive: true, force: true });
});

describe('findSource', () => {
  it('(+) finds source by data-testid', async () => {
    const results = await findSource(projectRoot, { testid: 'email-input' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].file).toContain('LoginForm.tsx');
    expect(results[0].confidence).toBe('high');
    expect(results[0].line).toBe(4);
  });

  it('(+) finds source by aria-label', async () => {
    const results = await findSource(projectRoot, { ariaLabel: 'Login form' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].file).toContain('LoginForm.tsx');
    expect(results[0].confidence).toBe('high');
  });

  it('(+) finds source by id in selector', async () => {
    const results = await findSource(projectRoot, { selector: 'header#main-header' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].file).toContain('Header.tsx');
    expect(results[0].confidence).toBe('medium');
  });

  it('(+) finds source by class in selector', async () => {
    const results = await findSource(projectRoot, { selector: 'header.app-header' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].file).toContain('Header.tsx');
  });

  it('(+) finds source by visible text', async () => {
    const results = await findSource(projectRoot, { text: 'LoginForm' });
    expect(results.length).toBeGreaterThan(0);
  });

  it('(-) skips node_modules', async () => {
    const results = await findSource(projectRoot, { testid: 'email-input' });
    const inNodeModules = results.filter((r) => r.file.includes('node_modules'));
    expect(inNodeModules.length).toBe(0);
  });

  it('(-) returns empty for no matches', async () => {
    const results = await findSource(projectRoot, { testid: 'nonexistent-element' });
    expect(results.length).toBe(0);
  });

  it('(-) returns empty for empty query', async () => {
    const results = await findSource(projectRoot, {});
    expect(results.length).toBe(0);
  });

  it('(-) ignores very short text queries', async () => {
    const results = await findSource(projectRoot, { text: 'OK' });
    expect(results.length).toBe(0);
  });

  it('(+) results sorted by confidence', async () => {
    const results = await findSource(projectRoot, { testid: 'login-btn', selector: 'button.some-class', text: 'Login' });
    if (results.length >= 2) {
      const confidences = results.map((r) => r.confidence);
      const order = { high: 0, medium: 1, low: 2 };
      for (let i = 1; i < confidences.length; i++) {
        expect(order[confidences[i]]).toBeGreaterThanOrEqual(order[confidences[i - 1]]);
      }
    }
  });

  it('(+) includes line context', async () => {
    const results = await findSource(projectRoot, { testid: 'email-input' });
    expect(results[0].context).toContain('data-testid');
  });
});
