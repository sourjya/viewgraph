/**
 * Build Metadata Collector - Unit Tests
 *
 * Tests bundler detection for Vite, Next.js, and plain pages.
 *
 * @see lib/collectors/build-metadata-collector.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { collectBuildMetadata } from '#lib/collectors/build-metadata-collector.js';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('collectBuildMetadata', () => {
  it('(+) detects vite bundler from /@vite/ script', () => {
    document.body.innerHTML = '<script src="/@vite/client" type="module"></script>';
    const result = collectBuildMetadata();
    expect(result.bundler).toBe('vite');
    expect(result.mode).toBe('development');
  });

  it('(-) returns null bundler for plain page', () => {
    document.body.innerHTML = '<p>Hello</p>';
    const result = collectBuildMetadata();
    expect(result.bundler).toBeNull();
  });

  it('(+) detects next.js bundler from /_next/ script', () => {
    document.body.innerHTML = '<script src="/_next/static/chunks/main.js"></script>';
    const result = collectBuildMetadata();
    expect(result.bundler).toBe('next.js');
  });

  it('(+) returns expected shape', () => {
    const result = collectBuildMetadata();
    expect(result).toHaveProperty('mode');
    expect(result).toHaveProperty('bundler');
    expect(result).toHaveProperty('scriptCount');
    expect(result).toHaveProperty('scripts');
    expect(Array.isArray(result.scripts)).toBe(true);
  });
});
