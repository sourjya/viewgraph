# Multi-Export Annotations - Requirements

## Problem

Annotations are currently locked to a single export path: "Send to Kiro" via MCP. Testers, designers, and developers who don't use AI agents have no way to extract their review notes. The tool should support multiple export destinations from the same annotation workflow.

## Users

- **Tester** - annotates bugs, exports as markdown for Jira/Linear/GitHub Issues
- **Developer with AI agent** - annotates issues, sends to Kiro/Claude/Cursor for fixing
- **Designer** - annotates UI feedback, copies as markdown for handoff to dev team

## Requirements

### R1: Copy as Markdown
The sidebar must have a "Copy as Markdown" button that copies all annotations as a structured markdown bug report to the clipboard.

**Format:**
```markdown
## ViewGraph Review - {page title}
**URL:** {url}
**Date:** {timestamp}

### #{id} - {ancestor label}
{comment}

### #{id} - {ancestor label}
{comment}
```

- Resolved annotations are marked with `[RESOLVED]` prefix
- Annotations with no comment show `(no comment)`
- Button shows "Copied!" confirmation for 2 seconds

### R2: Per-Annotation Screenshot Cropping
Each annotation can optionally include a cropped screenshot of its region.

- Capture full viewport via `chrome.tabs.captureVisibleTab()`
- Crop to annotation region coordinates using offscreen canvas
- Store crops as data URLs on the annotation object
- One viewport capture shared across all annotations (not one per annotation)

### R3: Download Report
The sidebar must have a "Download Report" button that saves a complete review package.

- Generates markdown file with embedded screenshot references
- Screenshots saved as individual PNGs
- Packaged as a single ZIP file download
- Filename: `viewgraph-review-{hostname}-{timestamp}.zip`

### R4: Export Buttons Layout
The sidebar footer replaces the single "Send to Kiro" button with an export group:

| Button | Action | Icon |
|---|---|---|
| Send to Kiro | Push annotations + capture to MCP server | Paper plane |
| Copy Markdown | Copy markdown report to clipboard | Clipboard |
| Download Report | Save ZIP with markdown + screenshots | Download |

- All three buttons visible, no mode switching
- "Send to Kiro" disabled when no annotations (existing behavior)
- "Copy Markdown" and "Download Report" also disabled when no annotations

### R5: Screenshot Toggle
The settings panel (gear icon in popup) must have a toggle for "Include screenshots in reports". Default: off. When enabled, the Download Report includes cropped PNGs.

## Out of Scope

- Severity tags on annotations (future milestone)
- Session grouping / test run naming (future milestone)
- Direct integration with Jira/Linear/GitHub APIs (future milestone)
- Full-page screenshot in markdown (already available via Capture button)
