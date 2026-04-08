# Changelog

All notable changes to the ViewGraph project.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

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

### Milestone 1: Integration Tests
- Watcher integration test: file indexing on add, non-JSON filtering
- MCP tool integration tests via InMemoryTransport: list_captures (4), get_capture (3), get_latest_capture (3), get_page_summary (2)
- Test helper: createTestClient() for MCP server+client pair setup
- 43 total tests across 9 files, all passing

### ViewGraph v2 Format Specification
- Formal format spec: docs/architecture/viewgraph-v2-format.md (13 sections)
- Format research doc: docs/architecture/viewgraph-format-research.md (40 references)
- Analyzed Element to LLM v2.8.1 SiFR format — identified 8 weaknesses, proposed 12 improvements
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
