# Security

![ViewGraph privacy: all data stays local, no cloud, no tracking](../.gitbook/assets/viewgraph-privacy-trust.svg)

ViewGraph is designed to be safe for developers, testers, and teams working on production applications. Here's how it handles common security concerns.

## No Data Leaves Your Machine

ViewGraph operates entirely on localhost. The architecture:

```
Browser extension --> localhost:9876 --> .viewgraph/captures/ on your disk
```

- The extension communicates **only** with a server running on `127.0.0.1`
- No cloud services, no external APIs, no telemetry, no analytics
- Captures are plain JSON files stored in your project directory
- You control what gets captured and where it goes

## Read-Only Observer

The extension **never modifies** the pages you visit:

- No form submissions
- No network requests on behalf of the site
- No cookie access or manipulation
- No DOM modifications (the sidebar runs in an isolated Shadow DOM)
- No script injection into the page's execution context

It reads the DOM structure, computed styles, and element attributes. That's it.

## Minimal Permissions

The extension requests only what it needs:

| Permission | Why | What it can't do |
|---|---|---|
| `activeTab` | Access the current tab's DOM when you click the icon | Can't access other tabs, can't run in background |
| `storage` | Save your preferences locally | Data stays in browser, not synced externally |
| `scripting` | Inject the capture script on your click | Only runs when you explicitly activate it |

No `<all_urls>` host permission for background access. No `webRequest` for intercepting traffic. No `cookies` permission.

## What Gets Captured

Every capture includes only what's visible in the rendered DOM:

| Captured | NOT captured |
|---|---|
| Element tags, attributes, selectors | Passwords or input values |
| Computed CSS styles | Cookies or session tokens |
| Bounding boxes and layout | Request/response bodies |
| ARIA roles and labels | localStorage or IndexedDB |
| Console errors (messages only) | Source code or server-side data |
| Network request status (pass/fail) | Authentication headers |
| Component names (React/Vue/Svelte) | Environment variables |

## Open Source

The entire codebase is open source under AGPL-3.0. You can inspect every line:

- [Extension source](https://github.com/sourjya/viewgraph/tree/main/extension)
- [Server source](https://github.com/sourjya/viewgraph/tree/main/server)
- [Security assessment](https://github.com/sourjya/viewgraph/blob/main/docs/architecture/security-assessment.md)
- [Security audit](https://github.com/sourjya/viewgraph/blob/main/docs/audits/security-audit-2026-04-12.md)
- [Codebase audit](https://github.com/sourjya/viewgraph/blob/main/docs/audits/codebase-audit-2026-04-15.md)

## Security Audits Performed

The project has undergone two internal security audits:

**[Security Audit (April 2026)](https://github.com/sourjya/viewgraph/blob/main/docs/audits/security-audit-2026-04-12.md):**
- HTTP server endpoint review (15 endpoints)
- Input validation on all POST endpoints
- Path traversal prevention on file writes
- Payload size limits (5MB captures, 10MB snapshots)
- XSS prevention in extension UI (Shadow DOM isolation)
- WebSocket connection handling

**[Code Quality Audit (April 2026)](https://github.com/sourjya/viewgraph/blob/main/docs/audits/code-quality-audit-2026-04-12.md):**
- ESLint clean (0 errors)
- No hardcoded secrets in source
- No eval() or Function constructor in application code
- All user input sanitized before file operations

## Localhost Server Security

The MCP server binds to `127.0.0.1` only - it is not accessible from the network. Additional protections:

- **Capture format validation** - rejects malformed JSON before writing
- **Filename sanitization** - strips `..`, path traversal characters, and non-alphanumeric chars
- **Directory scoping** - only writes to configured `.viewgraph/captures/` directories
- **Payload limits** - 5MB max for captures, 10MB for snapshots

Auth tokens were evaluated and removed for beta (see [ADR-010](https://github.com/sourjya/viewgraph/blob/main/docs/decisions/ADR-010-remove-http-auth-beta.md)). Post-beta, native messaging will replace localhost HTTP entirely, providing cryptographic caller identity.

## Install Method Security Comparison

All current install methods run entirely on your machine. No data leaves localhost.

| | Zero-config (npx) | npm install | Build from source |
|---|---|---|---|
| **Server runs on** | localhost only | localhost only | localhost only |
| **Network exposure** | None | None | None |
| **Data leaves machine** | No | No | No |
| **Package source** | npm registry | npm registry | GitHub (you audit) |
| **Version control** | Always latest from npm | Pinned to installed version | Pinned to your clone |
| **Supply chain risk** | Low - fetches latest on each run | Lower - pinned version | Lowest - you review the code |
| **Auto-updates** | Yes (npx fetches latest) | No (manual `npm update`) | No (manual `git pull`) |
| **Offline capable** | Only if npm-cached | Yes | Yes |
| **Setup effort** | 5 lines of JSON | 2 commands | Clone + build |
| **Best for** | Quick start, single project | Production teams, version pinning | Contributors, auditors |

**Recommendation:** Use zero-config (npx) to get started. Switch to `npm install` if you need version pinning or offline use. Build from source if your security policy requires code review before execution.

> **Note on npx:** The `npx -y @viewgraph/core` command downloads the package from the npm registry on first run and caches it locally. Subsequent runs use the cache unless a newer version is available. This is the same mechanism used by `npx create-react-app`, `npx eslint`, and other standard Node.js tools. The downloaded code runs with the same permissions as any npm package - no elevated access.

## Safe for Production Sites

You can safely use ViewGraph on production, staging, or any environment:

- It only reads the DOM - never writes, submits, or navigates
- It doesn't interfere with the site's JavaScript execution
- It doesn't modify network requests or responses
- The capture happens in a single pass - no persistent monitoring
- Closing the sidebar stops all ViewGraph activity on the page

**Connection-aware export behavior:**

| Scenario | Send to Agent | Copy MD | Download Report |
|---|---|---|---|
| MCP server connected, localhost URL | Enabled | Enabled | Enabled |
| MCP server connected, trusted URL | Enabled | Enabled | Enabled |
| MCP server connected, untrusted URL (planned, F17) | Blocked (override available) | Enabled | Enabled |
| No MCP server connected | Hidden | Enabled (promoted) | Enabled |

When no server is connected, a status banner appears above the export buttons explaining that Copy MD and Report are available. When an untrusted URL is detected (F17, planned), Send to Agent will require the user to explicitly add the URL to their trusted list or use a one-time override. See [Threat Model](threat-model.md) for the security rationale.

## Common Concerns

**"Will it slow down my site?"**
No. The DOM traversal runs once when you click Send. It takes 50-200ms depending on page size. No continuous monitoring.

**"Can it access my other tabs?"**
No. The `activeTab` permission only grants access to the tab you explicitly click the ViewGraph icon on.

**"Does it phone home?"**
No. Zero network requests to external servers. Verify by checking the extension's network activity in DevTools.

**"Is it safe to install on my work machine?"**
Yes. It's a read-only DOM inspector with no external dependencies. The extension is submitted to Chrome Web Store and Firefox Add-ons with full source disclosure.
