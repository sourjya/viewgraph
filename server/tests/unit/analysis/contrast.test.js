/**
 * Contrast Module - Unit Tests
 *
 * Tests color parsing, WCAG luminance computation, contrast ratios,
 * and AA/AAA compliance checking.
 *
 * @see server/src/analysis/contrast.js
 * @see .kiro/specs/contrast-audit/requirements.md
 */

import { describe, it, expect } from 'vitest';
import {
  parseColor,
  relativeLuminance,
  contrastRatio,
  checkContrast,
} from '#src/analysis/contrast.js';

// ---------------------------------------------------------------------------
// parseColor
// ---------------------------------------------------------------------------

describe('parseColor', () => {
  it('parses 6-digit hex', () => {
    expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColor('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('#000000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('parses 3-digit hex', () => {
    expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('parses hex without hash', () => {
    expect(parseColor('ff0000')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('parses rgb()', () => {
    expect(parseColor('rgb(255, 0, 0)')).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColor('rgb(128,128,128)')).toEqual({ r: 128, g: 128, b: 128 });
  });

  it('parses rgba() (ignores alpha)', () => {
    expect(parseColor('rgba(255, 0, 0, 0.5)')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('(-) returns null for transparent', () => {
    expect(parseColor('transparent')).toBeNull();
  });

  it('(-) returns null for empty/undefined', () => {
    expect(parseColor('')).toBeNull();
    expect(parseColor(undefined)).toBeNull();
    expect(parseColor(null)).toBeNull();
  });

  it('(-) returns null for unparseable values', () => {
    expect(parseColor('hsl(0, 100%, 50%)')).toBeNull();
    expect(parseColor('inherit')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// relativeLuminance
// ---------------------------------------------------------------------------

describe('relativeLuminance', () => {
  it('returns 0 for black', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 4);
  });

  it('returns 1 for white', () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 4);
  });

  it('returns ~0.2126 for pure red', () => {
    expect(relativeLuminance({ r: 255, g: 0, b: 0 })).toBeCloseTo(0.2126, 3);
  });

  it('returns ~0.7152 for pure green', () => {
    expect(relativeLuminance({ r: 0, g: 255, b: 0 })).toBeCloseTo(0.7152, 3);
  });
});

// ---------------------------------------------------------------------------
// contrastRatio
// ---------------------------------------------------------------------------

describe('contrastRatio', () => {
  it('returns 21:1 for black on white', () => {
    const black = { r: 0, g: 0, b: 0 };
    const white = { r: 255, g: 255, b: 255 };
    expect(contrastRatio(black, white)).toBeCloseTo(21, 0);
  });

  it('returns 1:1 for same color', () => {
    const c = { r: 128, g: 128, b: 128 };
    expect(contrastRatio(c, c)).toBeCloseTo(1, 1);
  });

  it('is symmetric (order does not matter)', () => {
    const a = { r: 100, g: 50, b: 200 };
    const b = { r: 255, g: 255, b: 255 };
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 4);
  });
});

// ---------------------------------------------------------------------------
// checkContrast
// ---------------------------------------------------------------------------

describe('checkContrast', () => {
  it('black on white passes AA and AAA for normal text', () => {
    const result = checkContrast('#000000', '#ffffff', '14px');
    expect(result.aa).toBe(true);
    expect(result.aaa).toBe(true);
    expect(result.ratio).toBeCloseTo(21, 0);
  });

  it('grey on white fails AA for normal text', () => {
    // #767676 on white is ~4.54:1 - just passes AA
    // #777777 on white is ~4.48:1 - fails AA
    const result = checkContrast('#777777', '#ffffff', '14px');
    expect(result.aa).toBe(false);
  });

  it('large text has lower AA threshold (3:1)', () => {
    // #949494 on white is ~3.03:1 - fails normal AA but passes large text AA
    const result = checkContrast('#949494', '#ffffff', '18px');
    expect(result.aa).toBe(true);
  });

  it('(-) returns null when foreground is unparseable', () => {
    expect(checkContrast('transparent', '#ffffff', '14px')).toBeNull();
  });

  it('(-) returns null when background is unparseable', () => {
    expect(checkContrast('#000000', 'inherit', '14px')).toBeNull();
  });

  it('handles missing fontSize by defaulting to normal text', () => {
    const result = checkContrast('#000000', '#ffffff');
    expect(result.aa).toBe(true);
  });
});
