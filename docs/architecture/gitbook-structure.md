# GitBook Documentation Structure for ViewGraph

## Site Navigation (SUMMARY.md)

```
# ViewGraph

## Getting Started
* [What is ViewGraph?](getting-started/overview.md)
* [Quick Start (5 minutes)](getting-started/quick-start.md)
* [Installation](getting-started/installation.md)
* [Multi-Project Setup](getting-started/multi-project.md)

## Tutorials
* [See Bug, Fix Bug (90 seconds)](tutorials/see-bug-fix-bug.md)
* [Instant Accessibility Audit](tutorials/accessibility-audit.md)
* [Generate Playwright Tests](tutorials/generate-tests.md)
* [QA Handoff Without an Agent](tutorials/qa-handoff.md)
* [Regression Detection](tutorials/regression-detection.md)
* [Multi-Step Journey Recording](tutorials/journey-recording.md)
* [Design System Consistency](tutorials/design-consistency.md)

## Features
* [Browser Extension](features/extension.md)
* [MCP Tools (36)](features/mcp-tools.md)
* [Annotation Workflow](features/annotations.md)
* [Accessibility Auditing](features/accessibility.md)
* [Layout Analysis](features/layout.md)
* [Structural Regression](features/regression.md)
* [Source File Linking](features/source-linking.md)
* [Playwright Integration](features/playwright.md)
* [Kiro Power (Hooks & Prompts)](features/kiro-power.md)

## How It Compares
* [ViewGraph vs Competitors](comparison/overview.md)
* [vs Playwright MCP](comparison/vs-playwright-mcp.md)
* [vs Chromatic / Percy](comparison/vs-visual-regression.md)
* [vs axe / Lighthouse](comparison/vs-accessibility.md)
* [vs Replay.io](comparison/vs-replay.md)
* [Capture Accuracy](comparison/accuracy.md)

## Reference
* [MCP Tools Reference](reference/mcp-tools.md)
* [Capture Format (v2)](reference/capture-format.md)
* [CLI Commands](reference/cli-commands.md)
* [Configuration](reference/configuration.md)
* [Prompt Shortcuts](reference/prompt-shortcuts.md)

## Contributing
* [Development Setup](contributing/development.md)
* [Architecture Overview](contributing/architecture.md)
* [License (AGPL-3.0)](contributing/license.md)
```

## Page-by-Page Content Map

### Getting Started

| Page | Source content | What to write |
|---|---|---|
| **overview.md** | README.md intro + product-positioning.md | What ViewGraph is, who it's for, the "UI context layer" pitch. Include the architecture diagram. |
| **quick-start.md** | README.md "Getting Started" section | Clone, install, build extension, load in Chrome, init, capture, send to agent. 5-minute path. |
| **installation.md** | README.md prerequisites + step 1-3 | Detailed install: Node.js, npm, Chrome/Firefox, build commands, extension loading, init script. |
| **multi-project.md** | docs/runbooks/multi-project-setup.md | Copy directly. URL patterns, 3 modes, config.json, troubleshooting. |

### Tutorials

| Page | Source content | What to write |
|---|---|---|
| **see-bug-fix-bug.md** | docs/demo/README.md Demo 1 | Step-by-step with screenshots. Open demo page, annotate 3 bugs, send, agent fixes, reload. Embed YouTube video. |
| **accessibility-audit.md** | docs/demo/README.md Demo 2 + Walkthrough 5 | @vg-audit workflow. Show the 4 issues found, agent fixing each, re-audit clean. |
| **generate-tests.md** | packages/playwright/README.md | The full Playwright story: capture page, @vg-tests, generated test file, run tests. |
| **qa-handoff.md** | docs/demo/README.md Demo 4 | Annotate, Copy MD, show the markdown output, Download ZIP, show contents. |
| **regression-detection.md** | docs/demo/README.md Walkthrough 2 | Baseline, code change, compare_baseline, agent finds missing element, fixes it. |
| **journey-recording.md** | docs/demo/README.md Walkthrough 3 | Record flow, step notes, analyze_journey, visualize_flow Mermaid diagram. |
| **design-consistency.md** | docs/demo/README.md Walkthrough 4 | Capture 3 pages, check_consistency, agent finds style drift, fixes it. |

### Features

| Page | Source content | What to write |
|---|---|---|
| **extension.md** | docs/architecture/ux-analysis.md | Two-tab model, hover/click/drag, sidebar, annotation panel, export options. Screenshots. |
| **mcp-tools.md** | README.md "MCP Tools (36)" section | All 36 tools grouped by category with descriptions. |
| **annotations.md** | product-analysis.md Journey 1 | Full annotation lifecycle: create, severity, category, send, resolve, sync. |
| **accessibility.md** | product-analysis.md Pain Point 3 | Built-in rules + axe-core, contrast checking, audit_accessibility tool. |
| **layout.md** | product-analysis.md Pain Point 6 | audit_layout: overflow, overlap, viewport. Stacking context analysis. |
| **regression.md** | product-analysis.md Journey 5 | Baselines, compare_baseline, compare_captures, structural diff. |
| **source-linking.md** | strategic-recommendations.md R1+R6 | find_source: testid grep, component detection, React fiber _debugSource. |
| **playwright.md** | packages/playwright/README.md | Full copy. Install, fixture, API, two workflows, generated test example. |
| **kiro-power.md** | README.md Kiro Power section + power/README.md | 3 hooks, 8 prompts, steering docs. What each does. |

### How It Compares

| Page | Source content | What to write |
|---|---|---|
| **overview.md** | README.md "How ViewGraph Compares" + product-analysis.md Part 3 | The 10-row comparison table, positioning diagram, "eyes vs hands" framing. |
| **vs-playwright-mcp.md** | competitive-analysis-browser-mcp.md | Detailed comparison. VG = understand, Playwright = act. Interop story. |
| **vs-visual-regression.md** | product-analysis.md "Where ViewGraph Wins/Weaker" | Structural vs pixel comparison. When to use which. |
| **vs-accessibility.md** | product-analysis.md Pain Point 3 | VG + axe-core vs standalone axe. Closed-loop advantage. |
| **vs-replay.md** | product-analysis.md comparison | Point-in-time vs runtime recording. Different use cases. |
| **accuracy.md** | README.md "Capture Accuracy" + scripts/experiments/bulk-capture/README.md | 92.1% composite, 7 dimensions, methodology, experiment sets. |

### Reference

| Page | Source content | What to write |
|---|---|---|
| **mcp-tools.md** | docs/runbooks/mcp-tools-reference.md | Every tool with parameters, return format, example usage. |
| **capture-format.md** | docs/architecture/viewgraph-v2-format.md | Format spec: metadata, nodes, details, relations, enrichment sections. |
| **cli-commands.md** | New | viewgraph-init, viewgraph-status, viewgraph-doctor. Flags and options. |
| **configuration.md** | docs/runbooks/multi-project-setup.md + server config | .viewgraph/config.json, env vars, MCP config files per agent. |
| **prompt-shortcuts.md** | power/prompts/*.md | All 8 @vg- shortcuts with what each does. |

## GitBook Setup Steps

1. Connect GitBook to your GitHub repo (Settings > Git Sync)
2. Point it to a `docs-site/` directory (don't mix with project docs)
3. Create `docs-site/SUMMARY.md` with the navigation above
4. Create each .md file, pulling content from the source map
5. Add screenshots to each tutorial page
6. Embed YouTube videos where noted
7. Set custom domain later (e.g., docs.viewgraph.dev)

## Priority Order

1. **Getting Started** (4 pages) - first thing visitors need
2. **Tutorials: see-bug-fix-bug + accessibility-audit** - the hook
3. **How It Compares: overview** - the "why us" page
4. **Features: mcp-tools + extension** - the depth
5. Everything else fills in over time
