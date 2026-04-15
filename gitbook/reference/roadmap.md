# Roadmap

What's shipped, what's next, and where ViewGraph is heading.

## Shipped (v0.2.0)

### Browser Extension
- Click/drag annotation with severity and category
- Two-tab sidebar: Review (annotations, export) + Inspect (network, console, diagnostics)
- Three export modes: Send to Agent, Copy Markdown, Download ZIP
- 14 enrichment collectors (network, console, a11y, layout, components, and more)
- Multi-project support with automatic URL routing
- Session recording for multi-step user journeys
- Auto-capture on HMR/file changes
- Keyboard shortcuts (Escape, Ctrl+Enter, Ctrl+Shift+C, severity 1/2/3, Delete)
- Help overlay with shortcut cheat sheet and documentation links
- Journey recorder with auto-capture on SPA navigation
- Pending state feedback (amber "Sent to agent" while fixes are in progress)
- Real-time resolution sync (annotations turn green as agent fixes them)
- Settings moved to footer, cleaner header with VG icon

### MCP Server (36 tools)
- Core: list, get, summarize captures
- Analysis: accessibility audit (axe-core), layout audit, missing testids, interactive elements
- Annotations: resolve, track, diff, detect patterns, generate specs
- Comparison: structural diff, baseline regression, screenshot pixel diff, cross-page consistency, CSS style diff
- Coverage: component testid coverage report
- Sessions: journey recording, flow visualization
- Source: find source file with React fiber support
- Bidirectional: agent requests captures, extension delivers
- Config: project-level feature flags via `.viewgraph/config.json`

### Playwright Integration
- `@viewgraph/playwright` npm package (published on npm)
- Capture DOM snapshots during E2E tests
- Programmatic annotations from test assertions
- Generate tests from captures via `@vg-tests`

### Kiro Power
- 3 hooks: capture-and-audit, fix-annotations, check-testids
- 8 prompt shortcuts: @vg-audit, @vg-review, @vg-capture, @vg-diff, @vg-testids, @vg-a11y, @vg-tests, @vg-help
- 3 steering docs for agent behavior

### Distribution
- npm: `@viewgraph/core` and `@viewgraph/playwright` published
- GitHub: public repo with 1056+ tests
- GitBook: 28 pages of documentation
- Chrome Web Store and Firefox Add-ons: submitted, pending review

## Coming Next

### Auto-Audit on Capture (F3)
When enabled, the server automatically runs accessibility, layout, and testid audits after each capture. Results appear in the Inspect tab as a summary badge. Toggle via project config.

### Smart Annotation Suggestions (F5)
Context-aware suggestion chips in the annotation panel. When you select an element, ViewGraph surfaces issues from enrichment data: "Missing aria-label", "Console error: TypeError...", "Low contrast (2.1:1)". One click to populate the annotation.

### Baseline Management UI (F4)
Set, view, and compare baselines from the sidebar. See diff summaries inline: "+3 elements, -1 element, 2 moved." Optional auto-compare on new captures.

### Capture Timeline (F6)
Visual timeline in the Inspect tab showing all captures for the current URL with diff indicators between them.

### Native Messaging Transport
Replace localhost HTTP with Chrome/Firefox native messaging for extension-to-server communication. Eliminates the localhost HTTP attack surface.

### Extension Store Listings
Chrome Web Store and Firefox Add-ons listings are submitted and pending review. Once approved, installation becomes one click.

## Future

### CI Integration
Capture before deploy, capture after, diff automatically. Threshold-based alerts for structural regressions. GitHub Action for automated UI audits in pull requests.

### Live DOM Watcher
Smart alerts during development: "An element lost its aria-label", "New console error appeared", "Z-index conflict detected." Proactive rather than reactive.

### Cross-Page Consistency (Extension Surface)
Surface the existing `check_consistency` tool in the extension sidebar. Compare styling across pages: "Your .btn-primary is blue on /login but purple on /settings."

### Design Token Extraction
Extract reusable design tokens (colors, fonts, spacing, radii) from captures. Useful for design system teams.

### Power Packages for Other Agents
Dedicated hooks, prompts, and steering docs for Claude Code, Cursor, Windsurf, and Cline. The MCP tools already work with all agents - Power packages add agent-specific automation.

## Accuracy

ViewGraph's capture accuracy is measured automatically against 48 diverse real-world websites. Current composite accuracy: **92.1%**. See [Capture Accuracy](../comparison/accuracy.md) for the full methodology and results.
