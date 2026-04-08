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
- Test fixtures: valid capture, annotated capture, malformed capture
- 23 unit tests passing (parser: 11, indexer: 11, smoke: 1)
