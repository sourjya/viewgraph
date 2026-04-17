/**
 * Tests for native messaging host registration.
 * @see server/src/native-host-register.js
 */

import { describe, it, expect } from 'vitest';
import { getHostDir, generateManifest } from '#src/native-host-register.js';
import os from 'os';

describe('native host registration', () => {
  it('(+) getHostDir returns a path containing chrome', () => {
    const dir = getHostDir('chrome');
    expect(dir).toContain(os.homedir());
  });

  it('(+) getHostDir returns different paths for chrome and firefox', () => {
    expect(getHostDir('chrome')).not.toBe(getHostDir('firefox'));
  });

  it('(+) generateManifest for chrome has allowed_origins', () => {
    const m = generateManifest('/path/to/host.js', 'abc123', 'chrome');
    expect(m.name).toBe('com.viewgraph.host');
    expect(m.type).toBe('stdio');
    expect(m.path).toBe('/path/to/host.js');
    expect(m.allowed_origins).toEqual(['chrome-extension://abc123/']);
    expect(m.allowed_extensions).toBeUndefined();
  });

  it('(+) generateManifest for firefox has allowed_extensions', () => {
    const m = generateManifest('/path/to/host.js', 'ext@viewgraph', 'firefox');
    expect(m.allowed_extensions).toEqual(['ext@viewgraph']);
    expect(m.allowed_origins).toBeUndefined();
  });

  it('(+) manifest has correct structure', () => {
    const m = generateManifest('/test', 'id', 'chrome');
    expect(m).toHaveProperty('name');
    expect(m).toHaveProperty('description');
    expect(m).toHaveProperty('path');
    expect(m).toHaveProperty('type');
  });
});
