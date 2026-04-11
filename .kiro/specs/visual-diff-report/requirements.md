# Capture Diffing Visual Report - Requirements

## Overview

Generate a standalone HTML report from two ViewGraph captures showing structural differences visually. The report is self-contained (no external dependencies) and can be shared via email, Slack, or stored as a CI artifact.

## Problem

The `compare_captures` MCP tool returns JSON diff data (added/removed elements, layout shifts). This is useful for agents but not for humans. Developers and testers need a visual way to see what changed between two captures - especially for regression testing in CI.

## Functional Requirements

### FR-1: Report Generation

- FR-1.1: New MCP tool `generate_diff_report` takes two capture filenames and returns an HTML file path
- FR-1.2: Report is a single self-contained HTML file (inline CSS/JS, no external deps)
- FR-1.3: Report file saved to `.viewgraph/reports/` directory
- FR-1.4: Report filename includes both capture timestamps: `diff-{timestamp-a}-vs-{timestamp-b}.html`

### FR-2: Report Content

- FR-2.1: Header: page URL, timestamps of both captures, viewport dimensions
- FR-2.2: Summary bar: counts of added, removed, changed, and unchanged elements
- FR-2.3: Side-by-side element tree showing before/after with color-coded diff markers
- FR-2.4: Added elements highlighted green, removed elements highlighted red, changed elements highlighted yellow
- FR-2.5: Click any element in the tree to see its full details (tag, selector, bbox, styles)
- FR-2.6: Layout shift visualization: overlay showing element position changes with arrows
- FR-2.7: Screenshot comparison (if screenshots available in captures): side-by-side with slider

### FR-3: Filtering

- FR-3.1: Filter by change type: show all / added only / removed only / changed only
- FR-3.2: Filter by element role: buttons, links, inputs, headings, images
- FR-3.3: Search by selector or text content

### FR-4: Integration

- FR-4.1: CLI command: `node scripts/viewgraph-diff.js <capture-a> <capture-b>` generates report and opens in browser
- FR-4.2: Kiro prompt: `@vg-diff-report` generates report from two most recent captures
- FR-4.3: CI integration: generate report as artifact on baseline regression

## Non-Functional Requirements

- NFR-1: Report file size under 500KB for typical pages (< 500 elements)
- NFR-2: Report renders correctly in Chrome, Firefox, Safari
- NFR-3: Report works offline (no CDN dependencies)
- NFR-4: Generation time under 2 seconds
