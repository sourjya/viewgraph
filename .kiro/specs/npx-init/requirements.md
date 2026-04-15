# npx viewgraph-init - Requirements

## Overview

Publish `viewgraph-init` as a standalone npm package so users can run `npx viewgraph-init` from any project without cloning the ViewGraph repo. The package contains only the init script and its dependencies - not the full server or extension.

## Problem

Today, setting up ViewGraph requires:
1. Clone the ViewGraph repo
2. `npm install` in the repo
3. Run `npx viewgraph-init` from your project

Step 3 requires knowing the absolute path to the ViewGraph repo. This is friction for new users and makes it impossible to recommend ViewGraph in a single command.

## Goal

```bash
npx viewgraph-init
```

One command. No clone. No path. Works from any project directory.

## Functional Requirements

### FR-1: Package Structure

- FR-1.1: Published as `viewgraph-init` on npm
- FR-1.2: Contains only the init script, not the server or extension
- FR-1.3: The init script downloads the server package separately (see FR-3)
- FR-1.4: Package size under 50KB (just the script + templates)
- FR-1.5: `bin` field in package.json maps `viewgraph-init` to the entry script

### FR-2: Init Behavior (same as current, plus)

- FR-2.1: Detect AI agent (Kiro, Claude Code, Cursor, Windsurf, Cline)
- FR-2.2: Write MCP config pointing to the locally-installed server
- FR-2.3: Create `.viewgraph/captures/` directory
- FR-2.4: Generate auth token at `.viewgraph/.token`
- FR-2.5: Install Kiro Power assets if Kiro detected
- FR-2.6: Start the MCP server as a background process
- FR-2.7: Add `.viewgraph/` to `.gitignore` if not already present

### FR-3: Server Installation

- FR-3.1: The init script installs `@viewgraph/server` as a local dependency in `.viewgraph/`
- FR-3.2: Server is installed to `.viewgraph/node_modules/@viewgraph/server/`
- FR-3.3: MCP config points to `.viewgraph/node_modules/@viewgraph/server/index.js`
- FR-3.4: This means the server lives inside the project, not in a global location
- FR-3.5: `npm install` in the user's project does NOT install ViewGraph server (it's in `.viewgraph/`, not in the project's `node_modules/`)

### FR-4: Update Mechanism

- FR-4.1: Running `npx viewgraph-init` again updates the server to the latest version
- FR-4.2: Existing config, captures, and tokens are preserved (not overwritten)
- FR-4.3: Power assets are only copied if they don't exist (no overwrite)

### FR-5: Uninstall

- FR-5.1: `npx viewgraph-init --uninstall` removes `.viewgraph/` directory
- FR-5.2: Removes MCP config entries for ViewGraph from agent config files
- FR-5.3: Does NOT remove Power assets (user may have customized them)

## Non-Functional Requirements

- NFR-1: Init completes in under 10 seconds (including server install)
- NFR-2: Works on Node 18+ (same as ViewGraph server)
- NFR-3: Zero dependencies in the init package itself (uses only Node.js built-ins + npm CLI)
- NFR-4: Works offline if server package is already cached in npm

## Package Layout

```
viewgraph-init/
  package.json          { "name": "viewgraph-init", "bin": { "viewgraph-init": "./index.js" } }
  index.js              Main init script
  templates/
    mcp-config.json     MCP config template
    gitignore-entry      ".viewgraph/" line to append
  power/                Kiro Power assets (hooks, prompts, steering)
  README.md
  LICENSE
```

## Related Packages

| Package | Contents | Published |
|---|---|---|
| `viewgraph-init` | Init script + templates + Power assets | npm |
| `@viewgraph/server` | MCP server (36 tools, analysis, parsers) | npm |
| Extension | Browser extension (Chrome Web Store / AMO) | Store |
