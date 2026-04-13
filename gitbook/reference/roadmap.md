# Roadmap

What's shipped, what's next, and where ViewGraph is heading.

## Shipped (v0.1.0 Beta)

### Browser Extension
- Click/drag annotation with severity and category
- Two-tab sidebar: Review (annotations, export) + Inspect (network, console, diagnostics)
- Three export modes: Send to Agent, Copy Markdown, Download ZIP
- 14 enrichment collectors (network, console, a11y, layout, components, and more)
- Multi-project support with automatic URL routing
- Session recording for multi-step user journeys
- Auto-capture on HMR/file changes

### MCP Server (34 tools)
- Core: list, get, summarize captures
- Analysis: accessibility audit (axe-core), layout audit, missing testids, interactive elements
- Annotations: resolve, track, diff, detect patterns, generate specs
- Comparison: structural diff, baseline regression, screenshot pixel diff, cross-page consistency
- Sessions: journey recording, flow visualization
- Source: find source file with React fiber support
- Bidirectional: agent requests captures, extension delivers

### Playwright Integration
- `@viewgraph/playwright` npm package
- Capture DOM snapshots during E2E tests
- Programmatic annotations from test assertions
- Generate tests from captures via `@vg-tests`

### Kiro Power
- 3 hooks: capture-and-audit, fix-annotations, check-testids
- 8 prompt shortcuts: @vg-audit, @vg-review, @vg-capture, @vg-diff, @vg-testids, @vg-a11y, @vg-tests, @vg-help
- 3 steering docs for agent behavior

## Coming Next

### Native Messaging Transport
Replace localhost HTTP with Chrome/Firefox native messaging for extension-to-server communication. This eliminates the localhost HTTP attack surface and provides cryptographic caller identity - only the ViewGraph extension can talk to the server.

### Sidebar UX Redesign
Split the Inspect tab into diagnostics (read-only) and capture controls (actions). Add a health scorecard, keyboard navigation, and better empty states. The sidebar is functional but dense - this makes it cleaner.

### Extension Store Listings
Chrome Web Store and Firefox Add-ons listings are submitted and pending review. Once approved, installation becomes one click instead of "Load unpacked."

### npm Package for Main Tool
`npm install @viewgraph/core` will install the MCP server and init script directly. No cloning the repo needed.

## Future

### CI Integration
Capture before deploy, capture after, diff automatically. Threshold-based alerts for structural regressions. GitHub Action for automated UI audits in pull requests.

### Design Token Extraction
Extract reusable design tokens (colors, fonts, spacing, radii) from captures. Useful for design system teams.

### Power Packages for Other Agents
Dedicated hooks, prompts, and steering docs for Claude Code, Cursor, Windsurf, and Cline. The MCP tools already work with all agents - Power packages add agent-specific automation.

### Component-Level Capture
Capture individual components in isolation (like Storybook) without requiring a Storybook setup. Useful for component library testing.

## Accuracy

ViewGraph's capture accuracy is measured automatically against 48 diverse real-world websites. Current composite accuracy: **92.1%**. See [Capture Accuracy](../comparison/accuracy.md) for the full methodology and results.
