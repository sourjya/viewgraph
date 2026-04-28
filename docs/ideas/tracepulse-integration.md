# Idea: ViewGraph as Background Worker + TracePulse Integration

**Created:** 2026-04-28
**Status:** Evaluate
**Category:** Cross-Tool Integration

## Context

TracePulse (TP) monitors backend errors. ViewGraph (VG) captures frontend DOM state. Chrome DevTools MCP (CDT) controls the live browser. Today these three tools work independently — the agent manually orchestrates them. This doc explores how VG can work as a background worker alongside TP, even when the user isn't actively annotating.

## Agent Pain Points (from TP feedback)

| Pain Point | Current Workaround | Tools Involved |
|---|---|---|
| "3-4 separate calls to verify a fix" | Manual: navigate → console → network → compare | CDT + VG |
| "Can't tell if HMR applied my change" | Manual page reload | CDT |
| "Frontend shows blank, need to check backend" | Separate CDT + TP calls | CDT + TP |
| "No automated regression detection" | Manual before/after comparison | VG |
| "`get_correlated_errors` always empty" | No frontend error source | TP (needs VG/CDT) |
| "Response bodies lost in backend logs" | Check CDT `get_network_request` | CDT |

## What ViewGraph Can Do as a Background Worker

### 1. Feed TP's Frontend Error Buffer (solves request #4)

TP's `get_correlated_errors` is empty because nothing feeds the frontend buffer. VG captures already include `network.failed` and `console.errors`. When VG auto-captures (continuous-capture on HMR), it could push failed requests and console errors to TP's log collector endpoint.

```
┌─────────────┐    auto-capture    ┌──────────────┐    POST /collect    ┌──────────────┐
│  Browser     │──────────────────►│  ViewGraph    │──────────────────►│  TracePulse   │
│  (Vite HMR)  │                   │  Extension    │                   │  Frontend Buf  │
└─────────────┘                    └──────────────┘                    └──────────────┘
                                         │                                    │
                                         │ network.failed                     │
                                         │ console.errors                     ▼
                                         │                            get_correlated_errors
                                         │                            now has frontend data
                                         ▼
                                   VG MCP Server
                                   (verify_fix)
```

**Implementation:** VG server's HTTP receiver already gets captures with enrichment data. Add a hook that, when a capture arrives with `console.errors > 0` or `network.failed > 0`, POSTs them to TP's log collector (localhost:9801). Zero extension changes — server-side only.

**Effort:** Low. ~50 lines in http-receiver.js.

### 2. HMR-Aware Capture Diffing (solves "can't tell if HMR applied")

VG's `continuous-capture.js` already detects Vite HMR events. When it captures after HMR, the server could auto-diff against the previous capture and surface the result without the agent asking.

```
┌─────────────┐    vite:afterUpdate    ┌──────────────┐    auto-diff    ┌──────────────┐
│  Vite HMR    │──────────────────────►│  VG Extension │──────────────►│  VG Server    │
│              │                        │  (auto-cap)   │               │               │
└─────────────┘                        └──────────────┘               └──────┬───────┘
                                                                              │
                                                                    Store diff result
                                                                    in capture metadata
                                                                              │
                                                                              ▼
                                                                    Agent calls verify_fix
                                                                    → sees "HMR detected,
                                                                      3 elements changed"
```

**Implementation:** Already partially built. `continuous-capture.js` detects HMR. `post-capture-audit.js` runs diffs. Just need to tag the capture metadata with `hmrDetected: true` and include the diff summary.

**Effort:** Low. ~20 lines in extension + server.

### 3. Composite Verify Loop (solves "3-4 separate calls")

`verify_fix` (just shipped) handles the VG side. The full loop across all three tools:

```
Agent fixes code
       │
       ▼
┌──────────────┐
│ TP: get_build_errors()     → syntax/type errors?
│ TP: get_errors()           → runtime 500s?
│ VG: verify_fix()           → a11y, layout, console, network, regressions?
└──────────────┘
       │
       ▼
  All pass? → Done
  Any fail? → Read details, fix, repeat
```

This could be a **skill/prompt** rather than a new tool — teach the agent to call these 3 tools in sequence after every fix. Or it could be a meta-tool that orchestrates both MCP servers.

**Implementation as prompt:** Add a `@vg-verify` prompt that calls `verify_fix` + instructs the agent to also call TP's `get_errors` if TP is available.

**Implementation as tool:** A `full_verify` tool in VG that also calls TP's endpoint if configured. Tighter coupling but one call.

**Recommendation:** Prompt first (zero coupling), tool later if adoption proves the pattern.

### 4. Background Error Watcher (new capability)

VG's auto-capture already runs on HMR. Extend it to also watch for console errors between captures. If a console error appears, VG could:
- Flash the strip badge (already built — F10 smart alerts)
- Push the error to TP's frontend buffer
- Tag the next capture with `consoleErrorsSinceLastCapture: N`

This makes VG a passive frontend error monitor even when the sidebar is collapsed.

**Effort:** Medium. Needs a persistent console interceptor that survives between captures.

### 5. Response Body Bridging (solves TP request #2)

TP can't see HTTP response bodies (they go to the browser, not the server log). VG captures include `network` data but not response bodies. CDT's `get_network_request` has full response bodies.

The bridge: when VG captures a page with failed network requests, the server could call CDT's `get_network_request` for each failed request and attach the response body to the VG capture's network section.

**Problem:** VG server doesn't have access to CDT. This would require the agent to orchestrate, or a direct MCP-to-MCP bridge (not standard).

**Recommendation:** Teach the agent the pattern via prompt. Not worth building a tool bridge.

## Priority Matrix

| Integration | Effort | Impact | Coupling | Recommendation |
|---|---|---|---|---|
| Feed TP frontend buffer | Low | HIGH | Low (HTTP POST) | **Do first** |
| HMR-aware capture diff | Low | HIGH | None | **Do second** |
| Composite verify prompt | None | HIGH | None (prompt only) | **Do third** |
| Background error watcher | Medium | Medium | Low | Post-v1.0 |
| Response body bridging | N/A | Medium | High | Prompt only |

## Implementation Plan

### Phase 1: TP Frontend Buffer Bridge (Low effort)

In VG server's `http-receiver.js`, after receiving a capture:
1. Check if `console.errors > 0` or `network.failed > 0`
2. If yes, POST to `http://localhost:9801/collect` (TP's log collector)
3. Format: `{ source: "viewgraph", level: "error", message: "...", timestamp: "..." }`
4. Fail silently if TP isn't running (best effort)

Config: `TRACEPULSE_COLLECTOR_URL` env var or `.viewgraph/config.json` field.

### Phase 2: HMR Tag in Capture Metadata

In extension's `continuous-capture.js`:
1. When HMR event triggers capture, set `metadata.hmrDetected = true`
2. In server's `post-capture-audit.js`, when `hmrDetected`, always diff against previous
3. Include diff summary in `verify_fix` response

### Phase 3: @vg-verify Prompt

New prompt that teaches the composite verify pattern:
```
After fixing code:
1. Call verify_fix() — checks a11y, layout, console, network, regressions
2. If TracePulse is available, call get_errors() — checks backend health
3. If both pass, the fix is verified
4. If either fails, read the details and fix
```
