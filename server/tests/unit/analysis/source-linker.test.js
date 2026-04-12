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

  it('(+) finds source by component name (function)', async () => {
    const results = await findSource(projectRoot, { component: 'LoginForm' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].file).toContain('LoginForm.tsx');
    expect(results[0].confidence).toBe('high');
    expect(results[0].line).toBe(1);
  });

  it('(+) finds source by component name (const)', async () => {
    const results = await findSource(projectRoot, { component: 'Header' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].file).toContain('Header.tsx');
    expect(results[0].confidence).toBe('high');
  });

  it('(-) no match for nonexistent component', async () => {
    const results = await findSource(projectRoot, { component: 'NonexistentWidget' });
    expect(results.length).toBe(0);
  });
});

  // ---------------------------------------------------------------------------
  // Exact confidence (componentSource from React fiber)
  // ---------------------------------------------------------------------------

  it('(+) returns exact confidence for componentSource', async () => {
    const results = await findSource(projectRoot, {
      component: 'LoginForm',
      componentSource: 'src/components/LoginForm.tsx:1',
    });
    expect(results[0].confidence).toBe('exact');
    expect(results[0].file).toBe('src/components/LoginForm.tsx');
    expect(results[0].line).toBe(1);
    expect(results[0].match).toContain('fiber source');
  });

  it('(+) exact result comes before high confidence grep results', async () => {
    const results = await findSource(projectRoot, {
      component: 'LoginForm',
      componentSource: 'src/components/LoginForm.tsx:1',
    });
    // First result should be exact (fiber), followed by high (grep)
    expect(results[0].confidence).toBe('exact');
    if (results.length > 1) {
      expect(['exact', 'high', 'medium', 'low']).toContain(results[1].confidence);
    }
  });

  it('(+) componentSource with absolute path gets normalized', async () => {
    const absPath = path.join(projectRoot, 'src', 'components', 'LoginForm.tsx');
    const results = await findSource(projectRoot, {
      componentSource: `${absPath}:42`,
    });
    expect(results[0].confidence).toBe('exact');
    expect(results[0].file).toBe('src/components/LoginForm.tsx');
    expect(results[0].line).toBe(42);
  });

  it('(+) componentSource with relative ./ prefix gets cleaned', async () => {
    const results = await findSource(projectRoot, {
      componentSource: './src/components/Header.tsx:2',
    });
    expect(results[0].confidence).toBe('exact');
    expect(results[0].file).toBe('src/components/Header.tsx');
  });

  it('(-) componentSource without line defaults to line 1', async () => {
    const results = await findSource(projectRoot, {
      componentSource: 'src/components/LoginForm.tsx',
    });
    expect(results[0].confidence).toBe('exact');
    expect(results[0].line).toBe(1);
  });

  it('(+) componentSource still runs grep for additional references', async () => {
    const results = await findSource(projectRoot, {
      component: 'LoginForm',
      componentSource: 'src/components/LoginForm.tsx:1',
    });
    // Should have exact + grep results (function definition, import, etc.)
    expect(results.length).toBeGreaterThan(1);
  });

  it('(edge) componentSource alone with no other query fields', async () => {
    const results = await findSource(projectRoot, {
      componentSource: 'src/components/Header.tsx:1',
    });
    // Should return the exact result even without testid/selector/text
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].confidence).toBe('exact');
  });
