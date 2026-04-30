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
| - | CI Test Matrix | [`ci-test-matrix/`](./ci-test-matrix/) | Specced |
| - | Visual Diff Report | [`visual-diff-report/`](./visual-diff-report/) | Specced |
| - | Team Collaboration | [`team-collaboration/`](./team-collaboration/) | Specced |
| - | Plugin System | [`plugin-system/`](./plugin-system/) | Specced |
| - | npx viewgraph-init | [`npx-init/`](./npx-init/) | Specced |
| - | Format Migration | [`format-migration/`](./format-migration/) | Specced |
| M19 | SW Communication Migration | [`sw-communication/`](./sw-communication/) | Specced |

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
| ADR-010 | [`remove-http-auth-beta`](../../docs/decisions/ADR-010-remove-http-auth-beta.md) | Remove HTTP auth for beta (localhost-only accepted risk) |
| ADR-011 | [`mcp-server-instructions`](../../docs/decisions/ADR-011-mcp-server-instructions.md) | Server instructions for agent guidance |
| ADR-012 | [`prompt-injection-defense`](../../docs/decisions/ADR-012-prompt-injection-defense.md) | 5-layer prompt injection defense strategy |
| ADR-013 | [`native-messaging-transport`](../../docs/decisions/ADR-013-native-messaging-transport.md) | Layered transport: native messaging > HMAC > unsigned |
| ADR-014 | [`transient-ui-state-capture`](../../docs/decisions/ADR-014-transient-ui-state-capture.md) | Transient DOM mutation capture (toasts, flash, reflow) |
| ADR-015 | [`hmac-signed-localhost`](../../docs/decisions/ADR-015-hmac-signed-localhost.md) | HMAC-signed HTTP for localhost auth |
| ADR-016 | [`native-messaging-default`](../../docs/decisions/ADR-016-native-messaging-default.md) | Native messaging as default transport |
| ADR-017 | [`sw-communication-migration`](../../docs/decisions/ADR-017-sw-communication-migration.md) | Service worker owns all server communication |

## Architecture Docs

| Doc | Description |
|---|---|
| [ViewGraph v2 Format Spec](../../docs/architecture/viewgraph-v2-format.md) | Capture format (v2.1.0) |
| [Format Research](../../docs/references/viewgraph-format-research.md) | Format analysis, 44 references |
| [Scans and Recommendations](../../docs/references/scans-and-recommendations.md) | 22 automated scans across 6 categories |
| [Security Assessment](../../docs/security/security-assessment.md) | Threat model and mitigations |
| [UX Design](../../docs/references/ux-analysis.md) | Two-tab sidebar model, design decisions, user journeys |
| [Ideation Pipeline](../../docs/architecture/ideation-pipeline.md) | Idea mode data flow, annotation-to-spec pipeline |
| [SW Migration Research](../../docs/references/service-worker-migration-research.md) | Service worker communication migration analysis |

## Ideas (not yet specced)

| Doc | Description |
|---|---|
| [Extension UX and Intelligence](../../docs/references/extension-ux-and-intelligence.md) | Annotation UI patterns, memory/intelligence features |
| [Product Positioning](../../docs/references/product-positioning.md) | GTM strategy, messaging, audience |
| [Problem-Feature Mapping](../../docs/references/problem-feature-mapping.md) | 7 core USPs mapped to features and gaps |
| [Live Annotation Status](../../docs/ideas/live-annotation-status.md) | Real-time lifecycle updates (draft > sent > fixing > resolved) |
| [Rolling Archive](../../docs/ideas/rolling-archive.md) | Auto-archive resolved captures with index.json (implemented v0.4.7) |
