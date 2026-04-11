# Telemetry - Requirements

## Overview

Add opt-out anonymous telemetry to ViewGraph to understand feature adoption, error rates, and usage patterns. Telemetry must never capture page content, URLs, DOM data, annotation text, or any data from the user's project.

## Guiding Principles

1. **Privacy by design** - telemetry captures tool usage patterns only, never user content
2. **Transparent** - every event type is documented, users can inspect what's sent
3. **Opt-out, not opt-in** - enabled by default with clear disclosure at install time
4. **Minimal** - collect only what drives product decisions, nothing speculative
5. **Anonymous** - random install ID, no MAC hash, no IP logging, no fingerprinting

## Functional Requirements

### FR-1: Consent and Control

- FR-1.1: Telemetry is enabled by default on fresh install
- FR-1.2: Extension options page shows a "Usage Analytics" toggle with clear description of what's collected
- FR-1.3: Sidebar settings overlay shows the same toggle for quick access
- FR-1.4: Chrome Web Store listing includes a privacy disclosure section explaining telemetry
- FR-1.5: MCP server README and init script output include a one-line telemetry notice with opt-out instructions
- FR-1.6: When the user disables telemetry, all collection stops immediately - no "one last batch"
- FR-1.7: Disabling telemetry does not degrade any functionality

### FR-2: Extension Telemetry Events

Events captured by the browser extension. All events include `installId`, `extensionVersion`, `browser` (chrome/firefox), and `timestamp`.

- FR-2.1: `session_start` - annotate mode activated. Params: none (no URL, no page data)
- FR-2.2: `session_end` - annotate mode deactivated. Params: `durationSeconds`, `annotationCount`, `exportMethod` (send/copy-md/report/none)
- FR-2.3: `annotation_created` - annotation added. Params: `type` (element/region/page-note), `hasSeverity` (bool), `hasCategory` (bool)
- FR-2.4: `export_used` - export action taken. Params: `method` (send-to-agent/copy-md/download-report)
- FR-2.5: `tab_switched` - sidebar tab changed. Params: `tab` (review/inspect)
- FR-2.6: `mode_switched` - capture mode changed. Params: `mode` (element/region/page)
- FR-2.7: `keyboard_shortcut_used` - shortcut triggered. Params: `shortcut` (esc/ctrl-enter/severity/delete)
- FR-2.8: `auto_capture_triggered` - HMR or continuous capture fired. Params: `source` (hmr/continuous/journey)
- FR-2.9: `collector_error` - enrichment collector failed. Params: `collector` (name), `errorType` (string, no stack trace)
- FR-2.10: `server_connection` - server discovery result. Params: `connected` (bool), `port` (number)

### FR-3: MCP Server Telemetry Events

Events captured by the MCP server. All events include `installId`, `serverVersion`, and `timestamp`.

- FR-3.1: `tool_called` - MCP tool invoked. Params: `tool` (name), `durationMs`, `success` (bool)
- FR-3.2: `tool_error` - MCP tool returned an error. Params: `tool` (name), `errorCategory` (parse-error/not-found/invalid-input/internal)
- FR-3.3: `capture_received` - capture pushed from extension. Params: `nodeCount`, `hasAnnotations` (bool), `enrichmentCount`
- FR-3.4: `server_start` - server process started. Params: `nodeVersion`, `platform` (linux/darwin/win32)

### FR-4: What is Explicitly Excluded (Never Collected)

- FR-4.1: Page URLs, titles, or any content from captured pages
- FR-4.2: Annotation text, comments, severity values, or category values
- FR-4.3: DOM structure, element selectors, CSS properties, or any capture content
- FR-4.4: File paths, project names, directory structures, or source code
- FR-4.5: Network request URLs, response bodies, or headers from captured pages
- FR-4.6: Console error messages or stack traces from captured pages
- FR-4.7: IP addresses (must not be logged server-side)
- FR-4.8: User agent strings (only extract browser name: chrome/firefox)
- FR-4.9: Screen resolution, OS version, or hardware identifiers
- FR-4.10: Any data that could identify a specific user, project, or organization

### FR-5: Transport and Storage

- FR-5.1: Events are batched locally and sent every 5 minutes (or on session end, whichever comes first)
- FR-5.2: Transport is HTTPS POST to a configurable analytics endpoint
- FR-5.3: Batch payload is JSON array of events, max 100 events per batch
- FR-5.4: Failed sends are retried once on next batch cycle, then dropped (no unbounded queue)
- FR-5.5: Local event buffer is stored in `chrome.storage.local` (extension) or in-memory (server)
- FR-5.6: Local buffer is capped at 500 events - oldest dropped when full
- FR-5.7: Analytics endpoint URL is a constant in the codebase, not user-configurable

### FR-5b: Endpoint Authentication (see [auth-spec.md](./auth-spec.md) for full design)

- FR-5.8: All event batches must be signed with HMAC-SHA256 using a per-install signing key
- FR-5.9: Signing keys are obtained via a one-time registration handshake on first telemetry flush
- FR-5.10: Registration includes a build-hash challenge proving the client is a real ViewGraph build
- FR-5.11: Signing keys expire after 90 days; client re-registers automatically on 401 Expired
- FR-5.12: Server rejects events with timestamps more than 5 minutes from server time (replay protection)
- FR-5.13: Server enforces per-install rate limits (1 request per 4 minutes, 50 requests per day)
- FR-5.14: Server validates event names against a known enum; unknown events are rejected
- FR-5.15: Server can revoke install IDs; revoked clients permanently stop sending telemetry
- FR-5.16: Build token is injected at CI build time, not stored in source code; dev builds use a fallback token

### FR-6: Install ID

- FR-6.1: On first run, generate a random UUID v4 and store in `chrome.storage.local` (extension) or `.viewgraph/.telemetry-id` (server)
- FR-6.2: The ID is not derived from hardware, MAC address, or any system identifier
- FR-6.3: The ID persists across sessions but can be reset by the user (delete storage key)
- FR-6.4: Extension and server generate independent IDs (they are separate installs)

### FR-7: Transparency

- FR-7.1: A `TELEMETRY.md` file in the repo root documents every event, every parameter, and every exclusion
- FR-7.2: The options page links to `TELEMETRY.md` so users can see exactly what's collected
- FR-7.3: Extension includes a "View telemetry log" button that shows the last 50 events in a readable format (local only, never sent anywhere)

## Non-Functional Requirements

- NFR-1: Telemetry must not impact capture performance - events are fire-and-forget, never blocking
- NFR-2: Telemetry module must be a single file with no external dependencies (no analytics SDKs)
- NFR-3: Total telemetry code must be under 200 lines per component (extension and server)
- NFR-4: Telemetry endpoint must respond within 2 seconds or the request is abandoned
- NFR-5: No telemetry data is stored on the analytics server for more than 90 days
