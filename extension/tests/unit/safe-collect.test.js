/**
 * Safe Collect - Unit Tests
 *
 * @see lib/safe-collect.js
 */

import { describe, it, expect, vi } from 'vitest';
import { safeCollect, safeCollectAsync } from '#lib/safe-collect.js';

describe('safeCollect', () => {
  it('(+) returns result on success', () => {
    const result = safeCollect('test', () => ({ data: 42 }));
    expect(result).toEqual({ data: 42 });
  });

  it('(-) returns fallback on throw', () => {
    const result = safeCollect('test', () => { throw new Error('boom'); });
    expect(result).toBeNull();
  });

  it('(-) returns custom fallback on throw', () => {
    const result = safeCollect('test', () => { throw new Error('boom'); }, { empty: true });
    expect(result).toEqual({ empty: true });
  });

  it('(-) logs warning on failure', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    safeCollect('myCollector', () => { throw new Error('oops'); });
    expect(spy).toHaveBeenCalledWith('[ViewGraph] myCollector collector failed:', 'oops');
    spy.mockRestore();
  });
});

describe('safeCollectAsync', () => {
  it('(+) returns result on success', async () => {
    const result = await safeCollectAsync('test', async () => ({ data: 1 }));
    expect(result).toEqual({ data: 1 });
  });

  it('(-) returns fallback on rejection', async () => {
    const result = await safeCollectAsync('test', async () => { throw new Error('fail'); });
    expect(result).toBeNull();
  });

  it('(-) returns custom fallback on rejection', async () => {
    const result = await safeCollectAsync('test', async () => { throw new Error('fail'); }, []);
    expect(result).toEqual([]);
  });
});
