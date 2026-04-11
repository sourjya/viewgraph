# ViewGraph - Spec Index

Kiro specs for each milestone. Each spec contains `requirements.md`, `design.md`, and `tasks.md`.

| # | Milestone | Spec | Status |
|---|---|---|---|
| M1 | MCP Server Core Tools | [`mcp-server-core/`](./mcp-server-core/) | Complete |
| M2 | MCP Analysis Tools | [`mcp-analysis-tools/`](./mcp-analysis-tools/) | Complete |
| M3 | MCP Request Bridge | [`mcp-request-bridge/`](./mcp-request-bridge/) | Complete |
| M4 | Extension Core Capture | [`extension-core/`](./extension-core/) | Complete |
| M7 | Deployment Automation | [`deployment-automation/`](./deployment-automation/) | Complete |
| M7b | Unified Annotate Mode | [`unified-annotate-mode/`](./unified-annotate-mode/) | Complete |
| M7c | Multi-Export Annotations | [`multi-export/`](./multi-export/) | Complete |
| M8b | Kiro Power Package | [`kiro-power/`](./kiro-power/) | Complete |
| - | Unified Review Panel | [`unified-review-panel/`](./unified-review-panel/) | Complete |
| - | Inspect Tab Redesign | [`inspect-tab-redesign/`](./inspect-tab-redesign/) | Complete |
| - | SingleFile Fidelity | [`singlefile-fidelity/`](./singlefile-fidelity/) | Not Started |
| M17 | Telemetry | [`telemetry/`](./telemetry/) | Specced |

## Architecture Decisions

| # | ADR | Description |
|---|---|---|
| ADR-001 | [`universal-agent-integration`](../../docs/decisions/ADR-001-universal-agent-integration.md) | Multi-tool architecture (Kiro, Claude Code, Cursor, Windsurf) |
| ADR-002 | [`multi-project-capture-routing`](../../docs/decisions/ADR-002-multi-project-capture-routing.md) | How the extension routes captures to the right project |
| ADR-003 | [`singlefile-html-snapshots`](../../docs/decisions/ADR-003-singlefile-html-snapshots.md) | HTML snapshot strategy |
| ADR-004 | [`extension-ui-side-panel`](../../docs/decisions/ADR-004-extension-ui-side-panel.md) | Extension UI architecture |
| ADR-005 | [`npx-viewgraph-init`](../../docs/decisions/ADR-005-npx-viewgraph-init.md) | CLI init command design |
| ADR-006 | [`merge-inspect-review`](../../docs/decisions/ADR-006-merge-inspect-review.md) | Unified annotate mode (merged inspect + review) |
| ADR-007 | [`capture-json-source-of-truth`](../../docs/decisions/ADR-007-jsonl-history-store.md) | Capture JSON as single source of truth (no separate history store) |
| ADR-008 | [`kiro-power-packaging`](../../docs/decisions/ADR-008-kiro-power-packaging.md) | Package ViewGraph as a Kiro Power for one-click install |
| ADR-009 | [`agpl-licensing`](../../docs/decisions/ADR-009-agpl-licensing.md) | AGPL-3.0 licensing rationale |

## Architecture Docs

| Doc | Description |
|---|---|
| [ViewGraph v2 Format Spec](../../docs/architecture/viewgraph-v2-format.md) | Capture format (v2.1.0) |
| [Format Research](../../docs/architecture/viewgraph-format-research.md) | Format analysis, 44 references |
| [Scans and Recommendations](../../docs/architecture/scans-and-recommendations.md) | 22 automated scans across 6 categories |
| [Security Assessment](../../docs/architecture/security-assessment.md) | Threat model and mitigations |
| [UX Design](../../docs/architecture/ux-analysis.md) | Two-tab sidebar model, design decisions, user journeys |

## Ideas (not yet specced)

| Doc | Description |
|---|---|
| [Extension UX and Intelligence](../../docs/ideas/extension-ux-and-intelligence.md) | Annotation UI patterns, memory/intelligence features |
| [Product Positioning](../../docs/roadmap/product-positioning.md) | GTM strategy, messaging, audience |
| [Problem-Feature Mapping](../../docs/roadmap/problem-feature-mapping.md) | 7 core USPs mapped to features and gaps |
