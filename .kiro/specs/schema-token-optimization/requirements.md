# Schema Token Optimization - Requirements

Based on [MCP Tooling Research](../../../docs/references/mcp-tooling-research--the-case-for-rearchitecting-tracepulse-and-viewgraph.md), arXiv 2602.14878 (tool smell remediation), and MCP SEP-1576 (JSON $ref dedup).

## Problem

ViewGraph tool descriptions are verbose. Many include multi-line WHEN TO USE / NEXT / PERFORMANCE guidance that's useful for agents but inflates schema tokens. Additionally, 20+ tools share identical parameter definitions (filename, url_filter, limit) that are repeated in every schema.

## User Stories

### US-1: Compressed tool descriptions
As an MCP server, I want tool descriptions compressed to essential information, so that schema overhead is reduced 25-35% without losing agent accuracy.

**Acceptance criteria:**
- Each tool description reduced to 1-2 sentences max
- WHEN TO USE / NEXT / PERFORMANCE guidance moved to vg-help.md prompt (already exists there)
- No reduction in agent tool selection accuracy (verify with manual testing)
- Descriptions still contain: what the tool does, key params, return type

### US-2: Shared parameter definitions
As an MCP server, I want common parameters (filename, url_filter, limit) defined once and referenced across tools, so that schema tokens are reduced.

**Acceptance criteria:**
- Common params extracted to a shared definitions object
- Tools reference shared params instead of duplicating definitions
- Works within current MCP SDK (may require custom schema construction)
- If MCP spec doesn't support $ref yet, use code-level dedup (shared Zod schemas)

### US-3: Token measurement
As a developer, I want to measure the before/after token count of tool schemas, so I can quantify the optimization.

**Acceptance criteria:**
- Script that counts tokens in all tool schemas (tiktoken or approximation)
- Run before and after optimization
- Results documented

## Non-Functional Requirements

- No change to tool behavior or return values
- No new dependencies for token counting (use word-count approximation: tokens ~ words * 1.3)
- Backward compatible -- agents that reference old description text still work

## Out of Scope

- MCP protocol-level $ref support (SEP-1576 -- depends on spec adoption)
- Dynamic description loading (future)
- Per-agent description customization
