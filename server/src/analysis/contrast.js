/**
 * Contrast Module - WCAG Color Contrast Computation
 *
 * Parses CSS color values, computes relative luminance per WCAG 2.1,
 * and checks contrast ratios against AA/AAA thresholds.
 *
 * No external dependencies - implements the WCAG formulas directly.
 *
 * @see https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 * @see .kiro/specs/contrast-audit/design.md
 */

// ---------------------------------------------------------------------------
// Color parsing (FR-1.1, FR-1.2)
// ---------------------------------------------------------------------------

/** Parse a CSS color string to { r, g, b } (0-255). Returns null if unparseable. */
export function parseColor(str) {
  if (!str || str === 'transparent' || str === 'inherit' || str === 'initial') return null;

  // rgb(R, G, B) or rgba(R, G, B, A)
  const rgbMatch = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) return { r: +rgbMatch[1], g: +rgbMatch[2], b: +rgbMatch[3] };

  // Strip optional hash
  let hex = str.startsWith('#') ? str.slice(1) : str;

  // 3-digit hex -> 6-digit
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
  }

  return null;
}

// ---------------------------------------------------------------------------
// WCAG luminance (FR-1.3)
// ---------------------------------------------------------------------------

/**
 * Linearize an sRGB channel value (0-255) to linear light.
 * @see https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function linearize(channel) {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Compute relative luminance (0 = black, 1 = white) per WCAG 2.1. */
export function relativeLuminance({ r, g, b }) {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

// ---------------------------------------------------------------------------
// Contrast ratio (FR-1.4)
// ---------------------------------------------------------------------------

/** Compute WCAG contrast ratio between two RGB colors. Range: 1 to 21. */
export function contrastRatio(color1, color2) {
  const l1 = relativeLuminance(color1);
  const l2 = relativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// WCAG compliance check (FR-2)
// ---------------------------------------------------------------------------

/** Parse a CSS font-size string to a number in px. Handles px, rem, em, pt. Returns null if unresolvable. */
function parseFontSize(str) {
  if (!str) return null;
  const match = str.match(/^([\d.]+)(px|rem|em|pt)$/);
  if (!match) return null;
  const val = parseFloat(match[1]);
  const unit = match[2];
  if (unit === 'px') return val;
  if (unit === 'rem' || unit === 'em') return val * 16; // assume 16px base
  if (unit === 'pt') return val * (4 / 3); // 1pt = 1.333px
  return null;
}

/**
 * Check WCAG contrast compliance between foreground and background colors.
 * @param {string} fg - foreground CSS color
 * @param {string} bg - background CSS color
 * @param {string} [fontSize] - CSS font-size (e.g. "14px")
 * @returns {{ ratio, aa, aaa } | null} null if colors can't be parsed
 */
export function checkContrast(fg, bg, fontSize) {
  const fgColor = parseColor(fg);
  const bgColor = parseColor(bg);
  if (!fgColor || !bgColor) return null;

  const ratio = contrastRatio(fgColor, bgColor);
  const size = parseFontSize(fontSize);
  // Large text: >= 18px (WCAG defines 18pt ~ 24px, but common practice uses 18px)
  const isLarge = size !== null && size >= 18;
  const aaThreshold = isLarge ? 3 : 4.5;
  const aaaThreshold = isLarge ? 4.5 : 7;

  return { ratio, aa: ratio >= aaThreshold, aaa: ratio >= aaaThreshold };
}
