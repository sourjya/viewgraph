# Contrast Ratio Audit - Design

## Architecture

New module for contrast computation, integrated into existing a11y audit.

```
server/src/analysis/
  contrast.js              (new - color parsing, luminance, contrast ratio)
  a11y-rules.js            (modified - add contrast check rule)

server/tests/unit/analysis/
  contrast.test.js         (new - unit tests for contrast module)
  a11y-rules.test.js       (existing - add contrast rule tests)
```

## Contrast Module: contrast.js

Pure functions for WCAG contrast ratio computation.

### Color Parsing

```javascript
// Parse any CSS color string to { r, g, b } (0-255)
parseColor(str) -> { r, g, b } | null

// Supported formats:
// - "#RGB"        -> expand to #RRGGBB
// - "#RRGGBB"     -> parse hex
// - "rgb(R,G,B)"  -> parse decimal
// - "rgba(R,G,B,A)" -> parse decimal (ignore alpha)
// - Named colors: "transparent" -> null (skip)
```

### WCAG Luminance and Contrast

```javascript
// Relative luminance per WCAG 2.1 (0 = black, 1 = white)
// Formula: L = 0.2126*R + 0.7152*G + 0.0722*B
// where R/G/B are linearized: if sRGB <= 0.04045 then linear = sRGB/12.92
//                              else linear = ((sRGB+0.055)/1.055)^2.4
relativeLuminance({ r, g, b }) -> number

// Contrast ratio per WCAG 2.1: (L1 + 0.05) / (L2 + 0.05)
// where L1 is the lighter luminance
contrastRatio(color1, color2) -> number  // 1:1 to 21:1

// Check WCAG compliance
checkContrast(fgColor, bgColor, fontSize) -> {
  ratio: number,
  aa: boolean,    // passes AA
  aaa: boolean,   // passes AAA
  level: 'pass' | 'AA-fail' | 'AAA-only'
}
```

### Font Size Thresholds

Per WCAG 2.1:
- Large text: >= 18px (or >= 14px bold)
- Normal text: everything else
- Parse fontSize string: "14px" -> 14, "1.2rem" -> skip (can't resolve)

## Integration with a11y-rules.js

Add a new rule function `contrastRule(node, details)` that:
1. Gets `computedStyles.color` and `computedStyles.backgroundColor` from details
2. Gets `computedStyles.fontSize` from details
3. Parses both colors; skips if either is null/transparent
4. Computes contrast ratio
5. Returns issue if AA fails (error) or AAA fails (warning)

Issue format (matches existing a11y issue structure):
```javascript
{
  nodeId: 'btn001',
  tag: 'button',
  type: 'insufficient-contrast',
  severity: 'error',  // or 'warning' for AAA-only fail
  description: 'Contrast ratio 2.5:1 fails WCAG AA (requires 4.5:1)',
  details: {
    foreground: '#666666',
    background: '#ffffff',
    ratio: 2.5,
    fontSize: '14px',
    aa: false,
    aaa: false,
  }
}
```
