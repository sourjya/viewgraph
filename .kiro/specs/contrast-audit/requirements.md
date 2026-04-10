# Contrast Ratio Audit - Requirements

## Overview

Add WCAG contrast ratio checking to the existing `audit_accessibility` tool.
Computes the contrast ratio between text color and background color for
elements that have `computedStyles` in their DETAILS section.

Reports AA/AAA pass/fail per WCAG 2.1 guidelines. Integrates into the
existing a11y audit rather than creating a separate tool.

## Functional Requirements

### FR-1: Contrast Ratio Computation
- FR-1.1: Parse hex color strings (#RGB, #RRGGBB) to RGB values
- FR-1.2: Parse rgb/rgba color strings to RGB values
- FR-1.3: Compute relative luminance per WCAG 2.1 formula
- FR-1.4: Compute contrast ratio from two luminance values
- FR-1.5: Handle transparent/missing background by skipping (not erroring)

### FR-2: WCAG Compliance Check
- FR-2.1: Normal text (<18px or <14px bold): AA requires 4.5:1, AAA requires 7:1
- FR-2.2: Large text (>=18px or >=14px bold): AA requires 3:1, AAA requires 4.5:1
- FR-2.3: Use fontSize from computedStyles to determine text size category
- FR-2.4: Report: element id, tag, foreground color, background color, ratio, AA pass/fail, AAA pass/fail

### FR-3: Integration with audit_accessibility
- FR-3.1: Add contrast issues to the existing audit output
- FR-3.2: Contrast failures at AA level are severity "error"
- FR-3.3: Contrast failures at AAA only are severity "warning"
- FR-3.4: Elements passing both AA and AAA are not reported

## Non-Functional Requirements

### NFR-1: No New Dependencies
- Implement contrast math from scratch (simple formulas, no library needed)

### NFR-2: Graceful Degradation
- Skip elements without computedStyles or without color/backgroundColor
- Never error on missing style data
