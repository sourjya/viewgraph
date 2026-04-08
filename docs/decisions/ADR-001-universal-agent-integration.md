# ADR-001: Universal Agent Integration Architecture

**Date:** 2026-04-08

**Status:** Accepted

**Context:** ViewGraph should work with any agentic coding tool that supports
MCP and/or file-based workflows - not just Kiro. Claude Code, Windsurf,
Cursor, Cline, Aider, and future tools should all be first-class consumers.

## Decision

ViewGraph exposes three integration surfaces, each targeting a different
class of tool:

```
                    ┌─────────────────────────────────┐
                    │     ViewGraph MCP Server         │
                    │  (11 tools, stdio transport)     │
                    └──────────┬──────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
     ┌────────▼──────┐ ┌──────▼──────┐ ┌───────▼───────┐
     │  Surface 1:   │ │ Surface 2:  │ │  Surface 3:   │
     │  MCP (stdio)  │ │ MCP (HTTP)  │ │  Disk (files) │
     │               │ │             │ │               │
     │ Kiro CLI/IDE  │ │ Claude Code │ │ Any tool that  │
     │ Cursor        │ │ Windsurf    │ │ reads JSON     │
     │ Cline         │ │ Remote IDEs │ │ from a folder  │
     │ Aider         │ │ Web UIs     │ │               │
     └───────────────┘ └─────────────┘ └───────────────┘
```

### Surface 1: MCP over stdio (primary)

The server is spawned as a child process by the MCP host. This is how
Kiro, Cursor, Cline, and most local IDE tools connect.

**Config for each tool:**

Kiro (`.kiro/settings/mcp.json`):
```json
{
  "mcpServers": {
    "viewgraph": {
      "command": "node",
      "args": ["/path/to/viewgraph/server/index.js"],
      "env": { "VIEWGRAPH_CAPTURES_DIR": "/path/to/captures" }
    }
  }
}
```

Claude Code (`~/.claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "viewgraph": {
      "command": "node",
      "args": ["/path/to/viewgraph/server/index.js"],
      "env": { "VIEWGRAPH_CAPTURES_DIR": "/path/to/captures" }
    }
  }
}
```

Cursor (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "viewgraph": {
      "command": "node",
      "args": ["/path/to/viewgraph/server/index.js"],
      "env": { "VIEWGRAPH_CAPTURES_DIR": "/path/to/captures" }
    }
  }
}
```

Windsurf (`.windsurf/mcp.json`):
```json
{
  "mcpServers": {
    "viewgraph": {
      "command": "node",
      "args": ["/path/to/viewgraph/server/index.js"],
      "env": { "VIEWGRAPH_CAPTURES_DIR": "/path/to/captures" }
    }
  }
}
```

The config is identical across tools - only the file path differs. This
is by design: MCP stdio transport is the universal interface.

### Surface 2: MCP over Streamable HTTP (future)

For remote/team scenarios where the server runs on a shared machine or
container. The agent connects via HTTP instead of spawning a process.

This enables:
- Shared capture libraries across a team
- CI/CD integration (capture in pipeline, query from IDE)
- Web-based agent UIs that can't spawn local processes

**Implementation:** Add `--transport http --port 9091` flag to server.
Use `@modelcontextprotocol/sdk`'s `StreamableHTTPServerTransport`.

### Surface 3: Disk-based (zero-dependency)

For tools that don't support MCP at all, or for simple scripting:
- Extension writes `.viewgraph.json` files to a known directory
- Any tool can read these files directly
- The format spec (`docs/architecture/viewgraph-v2-format.md`) is the contract
- No server needed - just the extension + filesystem

This works with:
- Shell scripts that grep/jq capture files
- Custom Python/Ruby/Go tools
- CI pipelines that process captures as artifacts
- Tools like Aider that can read files from context

## Registration CLI

To make setup trivial across all tools, we provide a single command:

```bash
npx viewgraph init              # auto-detect tool, write config
npx viewgraph init --tool kiro  # explicit tool
npx viewgraph init --tool cursor
npx viewgraph init --tool claude-code
npx viewgraph init --tool windsurf
```

This command:
1. Detects which tools are installed (checks for config directories)
2. Writes the MCP server config to the correct location
3. Sets `VIEWGRAPH_CAPTURES_DIR` to a sensible default
4. Verifies the server starts correctly

## Architectural Constraints

To maintain universal compatibility:

1. **No tool-specific code in the server.** The MCP server must not import
   or reference Kiro, Cursor, Claude, or any specific host. It speaks pure
   MCP protocol.

2. **No tool-specific output formats.** Tool descriptions are written for
   "an LLM" not "Kiro" or "Claude". Any model should understand them.

3. **Captures are self-contained.** A `.viewgraph.json` file contains
   everything needed to understand the page. No external dependencies,
   no server state required to interpret it.

4. **Config is env-var-driven.** `VIEWGRAPH_CAPTURES_DIR` and
   `VIEWGRAPH_HTTP_PORT` are the only configuration. No tool-specific
   config files inside the server.

5. **npm package distribution.** The server should be installable via
   `npm install -g viewgraph-mcp-server` so any tool can reference it
   without cloning the repo.

## Consequences

- The server remains a pure MCP server with no host-specific coupling
- The extension remains a pure capture tool with no agent-specific coupling
- The format spec is the stable contract between producer and consumer
- New tools get support automatically if they speak MCP stdio
- Tools that don't speak MCP can still consume captures via disk
- The `npx viewgraph init` command is the only tool-aware code
