# ADR-008: Package ViewGraph as a Kiro Power

**Status:** Accepted
**Date:** 2026-04-09
**Deciders:** sourjya
**Relates to:** M8b (Kiro Power Package), Unified Review Panel spec

## Context

ViewGraph's installation requires multiple manual steps: cloning the repo, running
`viewgraph init`, configuring the extension, and understanding the MCP tool catalog.
Meanwhile, Kiro introduced [Powers](https://kiro.dev/blog/introducing-powers/) - a
packaging format that bundles MCP tools, steering docs, and hooks into a single
installable unit with dynamic activation.

The existing landscape of AI agent configuration is fragmented:
- MCP servers require manual JSON config per agent
- Steering docs (`.cursorrules`, Claude Skills, Kiro steering) are agent-specific
- Dynamic tool loading is handled differently by each tool
- Developers stitch together multiple primitives for a complete integration

Powers unify these into one package: `POWER.md` (entry point + activation keywords),
MCP server config, steering files, and hooks.

**Reference:** [Introducing Kiro Powers](https://kiro.dev/blog/introducing-powers/)

## Decision

Package ViewGraph as a Kiro Power for one-click installation and dynamic activation.
The Power includes:

1. **`POWER.md`** - entry point with activation keywords (`ui`, `annotation`,
   `accessibility`, `layout`, `capture`, `review`), onboarding steps, and
   workflow steering references
2. **MCP server config** - `mcp.json` bundled in the Power, no manual config
3. **Steering docs** - `viewgraph-workflow.md` (when/how to use captures) and
   `viewgraph-resolution.md` (resolution format, action enum, summary guidelines)
4. **Hooks** - `post-fix-verify.kiro.hook` (auto-request verification capture
   after HTML/CSS/JSX edits)

### Why Powers over raw MCP config

| Concern | Raw MCP | Kiro Power |
|---|---|---|
| Installation | Clone repo, run init, manual config | One-click install |
| Context overhead | All 15+ tools loaded always | Dynamic - only when UI work active |
| Agent guidance | Tool descriptions only | Steering docs teach workflow + format |
| Post-fix verification | Manual | Hook auto-requests capture |
| Updates | Manual git pull | Power auto-updates (future) |
| Cross-agent (future) | Separate config per agent | Build once, works everywhere |

### Dynamic activation

Powers activate based on keywords in conversation. ViewGraph activates when the
user mentions "UI", "annotation", "layout", "accessibility", "capture", "review",
"CSS", "DOM", or "visual". When the user switches to backend work, ViewGraph
deactivates - zero context overhead.

This solves the [context rot](https://simonwillison.net/2025/Jun/18/context-rot/)
problem: connecting multiple MCP servers consumes context window tokens even when
their tools aren't relevant. Powers load on-demand.

### Interim: viewgraph init

Until the Power is published, `viewgraph init` serves as the setup path. For Kiro
users, it now installs steering docs and hooks from `power/` into the target project.
For non-Kiro agents, it writes the MCP config only.

## Alternatives Considered

### Stay with raw MCP config only

Continue requiring manual `viewgraph init` and MCP JSON configuration.

**Rejected because:** Higher friction for new users. No dynamic activation (all tools
loaded always). No steering guidance (Kiro guesses from tool descriptions). No hooks
for post-fix verification. Powers solve all of these with less code.

### Build a custom VS Code extension for Kiro integration

Create a VS Code extension that manages ViewGraph setup, provides UI panels, etc.

**Rejected because:** Kiro-specific, not portable. Powers are heading toward
cross-agent compatibility (Cursor, Claude Code, Cline). Building a VS Code extension
locks us into one platform. Powers are the emerging standard.

## Consequences

### Positive
- One-click install for Kiro users
- Dynamic activation reduces context overhead
- Steering docs ensure consistent resolution format
- Post-fix hooks create a verification loop
- Future cross-agent compatibility via Powers standard

### Negative
- Kiro-specific initially (cross-agent support is "coming soon")
- Power format may evolve - we'll need to track changes
- Non-Kiro users still need `viewgraph init`

### Risks
- Powers cross-compatibility timeline is uncertain
- Power ecosystem is new - discovery and distribution may change
- If Powers format changes significantly, migration effort needed

## References

- [Introducing Kiro Powers](https://kiro.dev/blog/introducing-powers/) - Powers announcement and architecture
- [Context rot](https://simonwillison.net/2025/Jun/18/context-rot/) - why dynamic tool loading matters
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
- [ADR-001: Universal Agent Integration](./ADR-001-universal-agent-integration.md) - multi-agent strategy
