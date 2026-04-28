# Idea: JSON Patch Incremental Diffs for Sequential Captures

**Created:** 2026-04-28
**Status:** Evaluate
**Category:** Token Efficiency

## Problem Statement

In hot-reload development workflows, ViewGraph captures the full DOM on every change. When a developer edits a CSS property and Vite hot-reloads, the next capture is 95%+ identical to the previous one. But the agent receives the entire capture again - 50-300KB of JSON, 12,000-75,000 tokens - to learn about a 1-line change.

**Real data from existing captures:**

| Capture pair | Nodes | Size | Likely diff |
|---|---|---|---|
| Shanti dashboard (2 captures, same URL) | 208 | 299KB each | Near-identical (same session) |
| Shanti login (2 captures, same URL) | 30 | 72-74KB each | Minor (different timestamps) |

The `compare_captures` tool already computes structural diffs, but it returns a human-readable summary, not a machine-applicable patch. The agent reads the diff, then reads the full capture to understand context. Two full reads for one small change.

## Proposed Design

### RFC 6902 JSON Patch Format

Use the standard JSON Patch format (RFC 6902) to represent changes between sequential captures:

```json
[
  { "op": "replace", "path": "/details/high/button/17/styles/typography/font-size", "value": "28px" },
  { "op": "add", "path": "/details/high/input/13/attributes/data-testid", "value": "email-input" },
  { "op": "remove", "path": "/nodes/high/div/42" },
  { "op": "replace", "path": "/metadata/timestamp", "value": "2026-04-28T12:00:00Z" }
]
```

### How It Works

1. Extension captures full DOM (as today)
2. Server receives capture, compares against previous capture for same URL
3. Server stores both the full capture AND the patch from previous
4. MCP tool `get_capture_diff` returns the patch instead of the full capture
5. Agent applies patch mentally to understand what changed

### New MCP Tool: `get_capture_diff`

```
get_capture_diff(filename)
  -> Returns JSON Patch from the previous capture of the same URL
  -> Includes: patch operations, summary stats, base capture filename
  -> Falls back to full capture if no previous exists
```

Response:

```json
{
  "base": "viewgraph-localhost-2026-04-28-120000.json",
  "target": "viewgraph-localhost-2026-04-28-120500.json",
  "patch": [
    { "op": "replace", "path": "/details/med/h1/8/styles/typography/font-size", "value": "28px" },
    { "op": "replace", "path": "/metadata/timestamp", "value": "2026-04-28T12:05:00Z" },
    { "op": "replace", "path": "/metadata/stats/captureSizeBytes", "value": 47200 }
  ],
  "stats": {
    "operations": 3,
    "nodesAdded": 0,
    "nodesRemoved": 0,
    "stylesChanged": 1,
    "patchSizeBytes": 412,
    "fullCaptureSizeBytes": 47740,
    "compressionRatio": "115:1"
  }
}
```

### Delivery Modes

| Mode | When to use | What agent receives |
|---|---|---|
| `full` | First capture of a URL, or agent requests full context | Complete capture JSON |
| `patch` | Sequential capture of same URL | JSON Patch + summary stats |
| `summary+patch` | Agent needs orientation + changes | Page summary (500 tokens) + JSON Patch |

The agent can request any mode. Default for `get_latest_capture` stays `full`. The new `get_capture_diff` tool defaults to `patch`.

## Token Impact Analysis

### Theoretical Compression

For a hot-reload cycle where only one CSS property changes:

| Component | Full capture | Patch only | Summary + Patch |
|---|---|---|---|
| Metadata | ~500 tokens | ~20 tokens (timestamp) | ~20 tokens |
| Summary | ~200 tokens | 0 | ~200 tokens |
| Nodes | ~2,000 tokens | 0 (unchanged) | 0 |
| Details | ~8,000 tokens | ~30 tokens (1 style change) | ~30 tokens |
| Enrichment | ~1,500 tokens | 0 (unchanged) | 0 |
| **Total** | **~12,200 tokens** | **~50 tokens** | **~250 tokens** |
| **Savings** | baseline | **99.6%** | **98.0%** |

### Realistic Compression (Multiple Changes)

For a component refactor that changes 5 elements:

| Scenario | Full capture tokens | Patch tokens | Ratio |
|---|---|---|---|
| 1 CSS property change | 12,200 | 50 | 244:1 |
| 5 style changes | 12,200 | 250 | 49:1 |
| 1 element added + 3 styles | 12,200 | 400 | 31:1 |
| 10 elements restructured | 12,200 | 2,000 | 6:1 |
| Full page redesign | 12,200 | 10,000 | 1.2:1 |

**Breakeven:** Patch mode saves tokens when <80% of the page changes. For typical hot-reload cycles, savings are 30:1 to 200:1.

### Large Page Impact

For the 208-node Shanti dashboard (299KB, ~75,000 tokens):

| Scenario | Full tokens | Patch tokens | Savings |
|---|---|---|---|
| 1 CSS change | 75,000 | 50 | 1500:1 |
| Add 1 table row | 75,000 | 800 | 94:1 |
| Restyle sidebar | 75,000 | 3,000 | 25:1 |

## Before/After Example

### Before: Agent Workflow for Hot-Reload Fix

```
1. Developer changes h1 font-size from 56px to 28px
2. Vite hot-reloads
3. ViewGraph auto-captures (47KB)
4. Agent: get_latest_capture -> reads 12,200 tokens
5. Agent: compare_captures(old, new) -> reads diff summary
6. Agent confirms: "font-size changed from 56px to 28px"
Total: ~15,000 tokens consumed
```

### After: Agent Workflow with Patch Mode

```
1. Developer changes h1 font-size from 56px to 28px
2. Vite hot-reloads
3. ViewGraph auto-captures (47KB)
4. Agent: get_capture_diff -> reads 50 tokens
   { "op": "replace", "path": "/details/med/h1/8/styles/typography/font-size", "value": "28px" }
5. Agent confirms: "font-size changed to 28px"
Total: ~50 tokens consumed (300x reduction)
```

## Experiment Design

### Experiment 1: Compression Ratio Measurement

**Goal:** Measure actual compression ratios on real sequential captures.

**Method:**
1. Set up a dev environment with Vite + the demo pages
2. Enable auto-capture (continuous-capture.js)
3. Make 20 incremental changes of varying scope:
   - 5 single-property CSS changes
   - 5 multi-property changes (restyle a component)
   - 5 structural changes (add/remove elements)
   - 5 mixed changes (style + structure)
4. For each pair of sequential captures, compute:
   - Full capture size (bytes and tokens)
   - JSON Patch size (bytes and tokens)
   - Compression ratio
   - Number of patch operations

**Script:** `scripts/experiments/json-patch-compression/run.js`
- Uses `fast-json-patch` npm package for RFC 6902 diff
- Input: pairs of sequential captures
- Output: CSV with compression metrics per pair

**Success criteria:** Median compression ratio >10:1 for single-property changes, >3:1 for multi-element changes.

### Experiment 2: Patch-Only Agent Comprehension

**Goal:** Can the agent correctly understand and act on a JSON Patch without the full capture?

**Method:**
1. Take 10 sequential capture pairs with known changes
2. Control: agent receives full second capture
3. Treatment A: agent receives patch only
4. Treatment B: agent receives summary + patch
5. For each, ask the agent: "What changed? What should be fixed?"
6. Measure: accuracy of change detection, accuracy of fix recommendation

**Success criteria:**
- Treatment B (summary + patch) matches control accuracy >90%
- Treatment A (patch only) matches control accuracy >70%
- If Treatment A is <70%, patch-only mode is not viable - always include summary

### Experiment 3: End-to-End Token Savings in Fix Workflow

**Goal:** Measure total token consumption for a complete fix cycle with and without patches.

**Method:**
1. Plant 5 bugs in the demo page
2. Control workflow: capture -> get_latest_capture -> fix -> capture -> get_latest_capture -> verify
3. Treatment workflow: capture -> get_latest_capture -> fix -> capture -> get_capture_diff -> verify
4. Measure: total tokens consumed across all tool calls in each workflow

**Success criteria:** Treatment workflow uses >30% fewer tokens for the verification step.

### Experiment 4: Patch Correctness Validation

**Goal:** Verify that JSON Patch accurately represents all changes between captures.

**Method:**
1. Take 50 sequential capture pairs from bulk capture experiment
2. Compute JSON Patch from pair
3. Apply patch to first capture
4. Compare result against second capture (byte-for-byte)
5. Report: exact match rate, fields that differ, root causes of mismatches

**Why this matters:** If patches lose information (e.g., floating point rounding in bbox coordinates), the agent gets wrong data.

**Success criteria:** >95% exact match rate. Mismatches are limited to metadata fields (timestamp, stats).

## Implementation Plan (if experiments pass)

### Phase 1: Server-Side Patch Generation
1. Add `fast-json-patch` dependency to server
2. In `http-receiver.js`, after storing a capture, compute patch from previous capture of same URL
3. Store patch alongside capture: `viewgraph-localhost-*.patch.json`
4. New MCP tool: `get_capture_diff` returns patch + stats

### Phase 2: Delivery Mode Selection
1. `get_latest_capture` gains `mode` parameter: `full` (default), `patch`, `summary+patch`
2. Auto-capture workflow defaults to `summary+patch` for sequential captures
3. First capture of a URL always returns `full`

### Phase 3: Extension-Side Delta (Optional)
1. Extension computes diff client-side before sending
2. Sends only the patch to server (saves upload bandwidth)
3. Server reconstructs full capture from base + patch
4. Reduces capture push time from ~200ms to ~20ms

## Risks

- **Patch-only confusion** - agent may lack context to understand a patch without the full capture. Mitigation: default to `summary+patch`, not `patch` alone.
- **Patch size explosion** - for large structural changes, the patch can be larger than the full capture (many add/remove operations). Mitigation: fall back to full capture when patch size >50% of full size.
- **Floating point drift** - bbox coordinates may differ by sub-pixel amounts between captures, generating noise patches. Mitigation: round coordinates before diffing.
- **Dependency on capture ordering** - patches are relative to a base. If the base is corrupted or missing, the patch is useless. Mitigation: always store full captures; patches are an optimization layer, not a replacement.
- **Library dependency** - `fast-json-patch` is a new dependency. Mitigation: it's well-maintained (2M weekly downloads), small (12KB), and implements a standard (RFC 6902).
