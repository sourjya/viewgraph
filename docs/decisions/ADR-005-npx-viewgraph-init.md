# ADR-005: npx viewgraph init - Project Setup Automation

**Date:** 2026-04-08

**Status:** Accepted

**Deciders:** Project team

---

## Context

When a developer installs ViewGraph as an npm package, they need to:

1. Create capture directories
2. Configure the MCP server for their agent (Kiro, Cursor, Claude Code, etc.)
3. Add capture directories to .gitignore
4. Set up a `.viewgraphrc.json` config file

Doing this manually is error-prone and discourages adoption. The setup
should be a single command.

## Decision

Provide `npx viewgraph init` that auto-detects the project environment
and configures everything in one shot.

### What `init` does

```
$ npx viewgraph init

  ViewGraph v0.1.0

  Detected:
    Project: shanti-home-mgmt (from package.json)
    Dev URL: http://localhost:5173 (from vite config)
    Agent:   Kiro (from .kiro/ directory)

  Created:
    .viewgraph/captures/       capture JSON files
    .viewgraph/snapshots/      HTML snapshots
    .viewgraph/reports/        fidelity reports

  Updated:
    .gitignore                 added .viewgraph/
    .viewgraphrc.json          server config
    .kiro/mcp.json             registered ViewGraph MCP server

  Done. Run: npx viewgraph serve
```

### Directory structure created

```
.viewgraph/
├── captures/      ViewGraph JSON captures
├── snapshots/     HTML snapshots for fidelity comparison
└── reports/       Fidelity reports
```

### .gitignore additions

```gitignore
# ViewGraph captures (local dev artifacts, not committed)
.viewgraph/
```

Captures are local dev artifacts - they contain machine-specific paths,
timestamps, and viewport dimensions. They should not be committed.
The `.viewgraphrc.json` config file IS committed (shared team config).

### .viewgraphrc.json created

```json
{
  "capturesDir": ".viewgraph/captures",
  "snapshotsDir": ".viewgraph/snapshots",
  "reportsDir": ".viewgraph/reports",
  "httpPort": 9876,
  "devUrls": ["http://localhost:5173"]
}
```

### Agent config auto-detection and registration

| Agent | Detection | Config file updated |
|---|---|---|
| Kiro | `.kiro/` directory exists | `.kiro/mcp.json` |
| Cursor | `.cursor/` directory exists | `.cursor/mcp.json` |
| Claude Code | `.claude/` directory exists | `.claude/mcp.json` |
| Windsurf | `.windsurf/` directory exists | `.windsurf/mcp.json` |
| None detected | - | Prints manual config instructions |

MCP server entry added to the agent config:

```json
{
  "mcpServers": {
    "viewgraph": {
      "command": "npx",
      "args": ["viewgraph", "serve"],
      "env": {
        "VIEWGRAPH_CAPTURES_DIR": ".viewgraph/captures"
      }
    }
  }
}
```

### Dev URL detection

Scans for common dev server configs:

| Source | Pattern |
|---|---|
| `vite.config.*` | `server.port` or default 5173 |
| `package.json` | `scripts.dev` or `scripts.start` port |
| `angular.json` | `serve.options.port` |
| `next.config.*` | Default 3000 |

Dev URLs are written to `.viewgraphrc.json` so the extension knows
which URLs belong to this project for capture routing.

### Idempotent

Running `init` again does not overwrite existing config. It merges
new settings and reports what changed.

---

## Implementation

This is a CLI command in the npm package entry point:

```
viewgraph init     Set up project
viewgraph serve    Start MCP server
viewgraph report   Generate fidelity summary
```

Planned for M8 (Universal Integration milestone).

---

## Consequences

### Positive

- One command setup, zero manual config
- Captures excluded from git automatically
- Agent config auto-detected and registered
- Team members get consistent config via committed `.viewgraphrc.json`

### Negative

- Must maintain detection logic for multiple agents and frameworks
- .gitignore modification requires careful append (not overwrite)
