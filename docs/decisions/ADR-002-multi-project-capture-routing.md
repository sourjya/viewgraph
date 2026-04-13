# ADR-002: Multi-Project Capture Routing

**Date:** 2026-04-08

**Status:** Accepted

**Context:** ViewGraph ships as two packages: a browser extension (captures
DOM from any page) and an npm package (MCP server, installed per-project).
A developer may have multiple projects open, each with its own MCP server
and captures folder. The extension needs to know which project folder to
write captures to.

This is the hardest UX problem in the product. Get it wrong and captures
land in the wrong project, or users have to manually switch targets every
time they change context.

## The Problem

```
Browser (one instance)
  ├── Tab: localhost:3000  (project-a)
  ├── Tab: localhost:5173  (project-b)
  ├── Tab: github.com      (neither)
  └── Tab: localhost:8040  (project-c)

Filesystem
  ├── ~/code/project-a/.viewgraph/captures/
  ├── ~/code/project-b/.viewgraph/captures/
  └── ~/code/project-c/.viewgraph/captures/
```

When the user captures `localhost:5173`, the extension must route the
capture file to `project-b/.viewgraph/captures/`, not project-a or project-c.

## Decision: URL-to-Project Routing with Three Strategies

### Strategy 1: Auto-detect via running MCP servers (primary)

Each project's MCP server registers itself with the extension on startup
by calling a local discovery endpoint. The extension maintains a routing
table: `{ url_pattern -> project_folder }`.

**How it works:**

1. User runs `npx viewgraph dev` in project-b (or the MCP host spawns it)
2. The MCP server starts and also opens a tiny HTTP listener on a
   discovery port (default: 9876)
3. The server announces itself: `POST http://localhost:9876/register`
   with `{ projectRoot, capturesDir, urlPatterns: ["localhost:5173"] }`
4. The extension polls `GET http://localhost:9876/projects` to get the
   routing table
5. When capturing `localhost:5173`, the extension matches the URL to
   project-b and writes to its captures folder

**URL pattern matching:**
- Exact origin match: `http://localhost:5173`
- Wildcard: `localhost:5173/*`
- Configured in `.viewgraphrc.json`:

```json
{
  "capturesDir": ".viewgraph/captures",
  "devUrls": ["http://localhost:5173", "http://localhost:5173/**"]
}
```

The `devUrls` field is the key. It tells the system "when I'm developing
this project, the app runs at these URLs." Most projects have a fixed dev
server URL.

### Strategy 2: Extension popup project switcher (manual fallback)

The extension popup shows a project selector dropdown:

```
Active Project: project-b (localhost:5173)
  ├── project-a  (localhost:3000)  ~/code/project-a
  ├── project-b  (localhost:5173)  ~/code/project-b  ✓
  └── project-c  (localhost:8040)  ~/code/project-c
```

Projects are populated from the discovery endpoint. The user can manually
override the auto-detected routing. The override persists until the tab
URL changes.

### Strategy 3: Capture-first, route-later (zero-config)

For users who don't want to configure anything:

1. Extension writes all captures to a shared default folder:
   `~/.viewgraph/captures/`
2. Each project's MCP server watches this shared folder
3. The MCP server filters captures by URL pattern from `.viewgraphrc.json`
4. The server only indexes captures whose URL matches its `devUrls`

This means multiple MCP servers can watch the same folder, each seeing
only the captures relevant to their project. No routing needed.

**Tradeoff:** Captures accumulate in one folder. Works well for solo devs,
gets messy for teams or many projects. But it's the simplest onboarding.

## Recommended Default Flow

```
First time:
  1. npm install @viewgraph/core -D
  2. npx viewgraph init
     -> creates .viewgraphrc.json with devUrls auto-detected from package.json scripts
     -> writes MCP config for detected agent (Kiro, Cursor, Claude Code, etc.)
     -> prints: "Install the ViewGraph browser extension: [link]"
  3. User installs extension from Firefox/Chrome store
  4. Extension auto-discovers projects via discovery endpoint

Ongoing:
  - User opens localhost:5173 in browser
  - Extension sees registered project for that URL
  - User clicks capture -> file lands in project-b/.viewgraph/captures/
  - MCP server in project-b picks it up immediately
  - Agent can query it
```

## The .viewgraphrc.json Contract

This file is the bridge between extension and MCP server. It lives in the
project root (next to package.json).

```json
{
  "capturesDir": ".viewgraph/captures",
  "devUrls": [
    "http://localhost:5173",
    "http://localhost:5173/**"
  ],
  "screenshotsDir": ".viewgraph/screenshots",
  "maxCaptures": 50
}
```

| Field | Required | Description |
|---|---|---|
| `capturesDir` | Yes | Relative path from project root to captures folder |
| `devUrls` | Yes | URL patterns this project serves in development |
| `screenshotsDir` | No | Relative path for screenshots (default: same as capturesDir) |
| `maxCaptures` | No | Max captures to retain (default: 50, oldest evicted) |

The `npx viewgraph init` command auto-detects `devUrls` by:
1. Reading `package.json` scripts for port numbers (`--port 3000`, `:5173`)
2. Checking for framework config files (vite.config.js, next.config.js, etc.)
3. Falling back to asking the user

## Discovery Protocol

The discovery service is a lightweight HTTP server that runs alongside
(or inside) the MCP server. It enables the extension to find all active
ViewGraph projects without manual configuration.

```
GET  /projects          -> [{ projectRoot, capturesDir, devUrls, name }]
POST /register          -> register a project (called by MCP server on startup)
POST /unregister        -> remove a project (called on shutdown)
GET  /health            -> { status: "ok", projects: 3 }
```

**Port selection:** Default 9876. If occupied, try 9877-9886. The extension
tries all ports in range. Alternatively, use a Unix domain socket at
`~/.viewgraph/discovery.sock` (faster, no port conflicts, but Windows
support is weaker).

**Security:** Listens on 127.0.0.1 only. No external access. The extension
connects via `fetch("http://127.0.0.1:9876/projects")`.

## Alternatives Considered

### A: One global captures folder (rejected as sole strategy)

Simple but doesn't scale. Captures from different projects mix together.
MCP servers can't tell which captures are "theirs" without URL matching.
Kept as Strategy 3 (zero-config fallback) but not the primary approach.

### B: Extension config page with manual folder paths (rejected as primary)

Requires users to manually type filesystem paths into the extension.
Error-prone, doesn't adapt when switching projects. Kept as a power-user
option in extension settings but not the default flow.

### C: Agentation model - React component per project (rejected)

Agentation avoids the routing problem by embedding a React component in
each project's source code. The component connects to a local MCP server.
This requires modifying the app's source, only works with React, and
doesn't capture arbitrary pages. ViewGraph's browser extension model is
more powerful but requires solving the routing problem.

### D: Native messaging host (considered for future)

The extension communicates with a native messaging host that knows the
filesystem. This is the most reliable approach but requires a native
binary install, which is a significant onboarding barrier. May be added
later for power users who need guaranteed file routing.

## Consequences

- `.viewgraphrc.json` becomes the central config file for each project
- The discovery protocol adds a small HTTP server to the MCP server process
- Extension needs `fetch` permission to `127.0.0.1:9876-9886`
- Zero-config mode (shared folder) works without discovery for simple setups
- Multi-project routing works automatically for projects with `devUrls` configured
- `npx viewgraph init` is the primary onboarding command
