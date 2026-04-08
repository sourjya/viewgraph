# Changelog

All notable changes to the ViewGraph project.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

---

## [Unreleased]

### Milestone 3: MCP Request Bridge
- Request queue: in-memory Map-based queue with TTL, lazy expiry, URL normalization
- HTTP receiver: Node.js built-in http server with /health, /requests/pending, /requests/:id/ack, /captures endpoints
- MCP tool: request_capture - queue a capture request for the browser extension
- MCP tool: get_request_status - poll for capture request completion
- Full lifecycle integration test: request -> poll -> ack -> submit -> completed
- 21 new tests across 4 files (106 total, 24 files)

---

## [0.1.0] - 2026-04-08

### Added
- Project scaffolding: npm workspaces with `server/` and `extension/`
- MCP server stub with `@modelcontextprotocol/sdk`, stdio transport, graceful shutdown
- Firefox extension scaffold with WXT framework, MV3 manifest, popup + background stubs
- ESLint flat config with recommended rules, ES module support
- Vitest configured for server unit tests
- Git scripts (`scripts/git-*.sh`) with output logging to `logs/`
- Kiro steering docs adapted from ai-video-editor (project-agnostic)
- Kiro hooks: comment-standards-check, changelog-check, changelog-rolling
- Code review prompt, TDD tasks template, security reviewer agent
- Technical design document with full architecture spec
- Project roadmap with 8 milestones (docs/roadmap/roadmap.md)

### Changed
- Renamed project from Sifr to ViewGraph across all config, source, and documentation files

### Milestone 1: MCP Server Core Tools
- ViewGraph v2 parser: parseMetadata, parseCapture, parseSummary (never throws, returns result objects)
- In-memory capture indexer with add/remove/list/getLatest and LRU eviction
- File watcher using chokidar (watches directory, filters to .json)
- Path validation utility preventing directory traversal
- MCP tools: list_captures, get_capture, get_latest_capture, get_page_summary
- Config resolution: .viewgraphrc.json file discovery with directory walk-up, env var override
- Test fixtures: valid capture, annotated capture, malformed capture
- 29 unit tests passing (parser: 11, indexer: 11, config: 6, smoke: 1)

### Milestone 2: MCP Analysis Tools
- Shared analysis modules: node-queries.js, a11y-rules.js (3 rules), capture-diff.js
- 7 MCP tools: get_elements_by_role, get_interactive_elements, find_missing_testids, audit_accessibility, compare_captures, get_annotations, get_annotated_capture
- Node queries handle both array and nested SiFR node formats

### Refactoring and Standards
- Parser: removed SiFR `====SECTION====` key fallback, plain keys only
- Imports: converted all relative imports to `#src/` subpath aliases (Node.js native)
- Character encoding: replaced all em/en dashes with hyphens project-wide
- Steering: added character encoding rule, import path rule

### Architecture and Documentation
- ADR-001: Universal agent integration (Kiro, Claude Code, Cursor, Windsurf)
- ADR-002: Multi-project capture routing (URL-to-project routing, discovery protocol)
- ViewGraph v2 format spec updated to v2.1.0 (12 recommendations integrated)
- Scans and recommendations catalog: 22 scans across 6 categories
- Product positioning and GTM strategy
- Problem-to-feature mapping for 7 core USPs
- Extension UX ideas (annotation toolbar, comments) and intelligence/memory features
- Format research doc expanded to 44 references, 20 improvement proposals

### Milestone 1: Integration Tests
### Milestone 1: Integration Tests
- Watcher integration test: file indexing on add, non-JSON filtering
- MCP tool integration tests via InMemoryTransport: list_captures (4), get_capture (3), get_latest_capture (3), get_page_summary (2)
- Test helper: createTestClient() for MCP server+client pair setup
- 43 total tests across 9 files, all passing

### ViewGraph v2 Format Specification
- Formal format spec: docs/architecture/viewgraph-v2-format.md (13 sections)
- Format research doc: docs/architecture/viewgraph-format-research.md (40 references)
- Analyzed Element to LLM v2.8.1 SiFR format  -  identified 8 weaknesses, proposed 12 improvements
- Key design decisions: semantic node IDs, compact bbox arrays, progressive style disclosure,
  semantic-only relations by default, optional ACCESSIBILITY and CONSOLE sections
- Standard format export layer: CDP DOMSnapshot, AX tree, W3C Web Annotation (via MCP tools)
- Competitive landscape analysis: E2LLM, Agentation, Playwright MCP, Chrome DevTools MCP

### Project Documentation
- Root README.md, server/README.md, extension/README.md
- Spec index: .kiro/specs/README.md with M1 linked
- Roadmap: M0 marked complete, M1 marked in-progress with spec link
- Fixed server/package.json description (Sifr → ViewGraph)
- Added docs/artifacts/ to .gitignore (third-party code for analysis)
