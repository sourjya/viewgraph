# ViewGraph v3 Agentic Enhancements Research

**Purpose:** Targeted improvements to ViewGraph v2 format with the primary goal of
reducing token consumption, accelerating element lookup, and shortening debug cycles
for agentic coding IDEs and CLIs (Claude Code, Kiro, Cursor, Codex, Copilot, etc.).

**Date:** 2026-04-28

**Builds on:** `viewgraph-format-research.md` and `viewgraph-v2-format.md` (v2.3.0)

---

## Executive Summary

ViewGraph v2 is well-structured and ahead of most competing approaches. This document
identifies ten concrete enhancement areas and proposes five new format additions, all
grounded in 2025-2026 production benchmarks: the Playwright CLI/MCP token comparison,
Vercel agent-browser research, D2Snap DOM downsampling, web agent task benchmarks,
and CHI 2025 debugging studies.

The single most important finding from the 2025-2026 research cycle:

> **MCP streaming full captures inline costs 4x more tokens than file-backed CLI
> workflows where agents read only what they need. Playwright MCP burns ~114K tokens
> per 10-step task; Playwright CLI burns ~27K. Vercel's agent-browser burns ~200-400
> tokens per interactive snapshot. The winning architecture is not "better compression
> of a big dump" - it is "smaller, scoped reads on demand."**
> (Sources: TestDino 2026, ytyng.com 2026, Pulumi/agent-browser 2026)

ViewGraph is already designed around this philosophy (salience tiers, progressive
disclosure, MCP tool per-subtree access). The enhancements below sharpen each layer
of that design with specific mechanisms that the research validates.

The ten enhancement areas, ranked by expected impact:

| Rank | Enhancement | Token Impact | Debug Impact | Effort |
|---|---|---|---|---|
| 1 | Action Manifest (pre-joined flat index) | Very High | Medium | Low |
| 2 | Ref-based stable element IDs | Very High | Medium | Low |
| 3 | File-backed capture mode | Very High | Low | Medium |
| 4 | Delta / diff capture mode | Very High | High | Medium |
| 5 | D2Snap-aligned container merging | High | None | Medium |
| 6 | Compact TOON-aligned serialization | High | None | Low |
| 7 | Error-to-node correlation | Low | Very High | Low |
| 8 | Spatial index | Medium | Low | Medium |
| 9 | Set-of-Marks / annotate integration | Medium | Medium | Low |
| 10 | Checkpoint / resume envelope | Medium | High | Medium |

---

## Part 1: Research Findings

### 1.1 The Token Crisis Is Real and Measured

Token consumption from browser automation tools has been empirically benchmarked in
2026 by multiple independent sources:

| Tool | Tokens per 10-step task | Method |
|---|---|---|
| Chrome DevTools MCP | ~132K+ (schema alone: ~17K) | Full CDP inline per step |
| Playwright MCP | ~114K | Full AXTree inline per step |
| Playwright CLI | ~27K | YAML files on disk, agent reads as needed |
| Vercel agent-browser (interactive-only) | ~2K-4K total | 200-400 tokens per snapshot |

Playwright MCP consumes approximately 114,000 tokens for a typical browser automation
task, while the CLI completes the same task in approximately 27,000 tokens - roughly
a 4x reduction. CLI saves snapshots and screenshots to disk as YAML files, and the
agent reads only what it needs.

Playwright MCP's own documentation now describes each interactive element snapshot
as returning 200-400 tokens per page when using structured accessibility data instead
of screenshots, and explicitly recommends CLI over MCP for coding agents because CLI
invocations avoid loading large tool schemas and verbose accessibility trees into the
model context.

The MCP schema overhead itself is significant: Playwright MCP loads an estimated
~13,700 tokens of tool definitions into the agent's context window before a single
page is visited, and Chrome DevTools MCP is reportedly worse at ~17,000 tokens - roughly
9% of a 200K context window consumed before the agent does anything useful.

### 1.2 Fewer Tools Means Better Agent Performance

The Vercel D0 research is the clearest production evidence on tool consolidation:
testing two architectures - 17 specialized tools producing 80% success in 274.8
seconds consuming ~102,000 tokens, versus 2 general-purpose tools producing 100%
success in 77.4 seconds consuming ~61,000 tokens. Every metric improved with fewer
tools. Vercel's takeaway was that fewer tools let the model reason more freely about
how to accomplish tasks, reducing confusion and context waste.

The direct implication for ViewGraph MCP: the tool surface should be 3-5 tools maximum.
Each additional tool definition consumes context budget before any agent reasoning begins.

### 1.3 Interactive-Only Is the Primary Filter

Vercel's agent-browser takes the approach of returning only interactive elements
from snapshots. A successful button click returns the string "Done" - six characters.
Compared to MCP-based tools that return full page state updates running into thousands
of characters, the response minimalism compounds dramatically over long automation
sessions.

The `snapshot -i` flag returns interactive elements only (buttons, inputs, links),
and the `--annotate` flag overlays numbered labels on interactive elements in the
screenshot, where each label `[N]` corresponds to ref `@eN`, so the same refs work
for both visual and text-based workflows.

This validates ViewGraph's existing salience model and the `actionManifest` concept:
the pre-joined interactive-element index is not an optimization - it is the primary
agent entry point that covers 80%+ of interactions.

### 1.4 DOM Hierarchy Is a Signal - Do Not Over-Discard It

D2Snap (arXiv 2508.04412) is the first formal DOM downsampling algorithm for
LLM-based web agents. D2Snap downsamples elements by merging container elements
like `section` and `div` together using a parameter `k` that controls the merge ratio
depending on total DOM tree height. The three redundant node types targeted are
elements, text, and attributes - with procedure-specific parameters controlling the
downsampling ratio for each. Results showed that D2Snap-downsampled snapshots matched
a grounded GUI snapshot baseline in task success rate, and the best configurations
outperformed the baseline by 8%.

Critically, the evaluation yielded that DOM-inherent hierarchy embodies a strong
UI feature for LLMs. This means wholesale flattening is counterproductive. The
right approach is targeted merging of semantically empty containers while preserving
meaningful hierarchy - which maps directly to ViewGraph's existing salience tier
definition for `low`-tier nodes.

### 1.5 More Context Is Not Always Better for High-Capability Models

The "Read More, Think More" finding (arXiv 2604.01535) is counterintuitive and
critical: for lower-capability (open-source) models, reducing observation from HTML
to accessibility tree improves success rate. For higher-capability (proprietary) models,
the success rate decreases instead.

High-capability models benefit from planning signals present in full HTML/DOM that
are discarded by simplified accessibility trees. This means ViewGraph should expose
observation depth as a runtime parameter, not bake one depth into the format.

### 1.6 Format Selection for Token Efficiency

Research in 2025-2026 has clarified format trade-offs:

TOON ([Token Oriented Object Notation](https://github.com/toon-format/toon)) achieves approximately 40% token reduction
for flat, uniform, table-like data by declaring field names once in a header row.
For nested, irregular, or highly structured data, TOON loses its advantage and JSON
and YAML do a better job preserving structure and clarity.

YAML is 20-30% more efficient than JSON for complex nested data. JSON is hard
to stream because you cannot parse it until the final closing brace is generated.
YAML and Markdown are more stream-friendly - you can begin processing the first item
while the model is still generating the second.

Markdown was the most token-efficient format across all models tested, using
34-38% fewer tokens than JSON and around 10% fewer than YAML.

The practical conclusion for ViewGraph: use TOON-style header-then-rows encoding for
the `actionManifest` (which is flat, uniform, tabular) and keep JSON for hierarchical
sections (node tree, relations, details).

### 1.7 File-Backed vs Inline Streaming: The Architecture Decision

The core difference between Playwright CLI and MCP is that CLI saves accessibility
snapshots to disk and the agent decides what it actually needs to read, rather than
streaming entire accessibility trees and screenshot bytes back into the LLM's context
window. A single browser navigate call can return thousands of tokens worth of
accessibility tree data in MCP mode. The agent never had to process a 10,000-token
accessibility tree or a 50,000-token screenshot.

This is the most structurally significant finding for ViewGraph. The file-backed
capture mode is not a convenience feature - it is the architecture that makes
long-session agents tractable.

### 1.8 Agent Debug Loops: What Actually Helps

The minimum event set for a usable replay artifact is every LLM request with
its full prompt and response, every tool call with its inputs and outputs, every
agent-to-agent message, and the state snapshot at each agent handoff point. Wall-clock
timestamps are insufficient to establish causality in parallel agent systems - causal
tracing propagates a trace context through every agent call, tool invocation, and
sub-agent handoff, producing a causal DAG of execution rather than a time-ordered log.
Storage cost for most agent workflows at this capture level runs roughly 50-200MB of
compressed trace storage per day.

CHI 2025 AGDebugger research found that developers wanted fine-grained control
over agents as they progress through a task - including interrupting agents that seem
stuck, resetting to earlier conversation points, and editing messages to steer toward
the desired goal. Participants described a desire for "breakpoints" for agent
debugging comparable to PDB for traditional Python scripts.

### 1.9 Context Autocompaction and the Role of ViewGraph Checkpoints

Contextual Memory Virtualisation research (arXiv 2602.22402) documents Claude Code's
native autocompaction behavior: a context at 76% capacity (132K tokens) is compressed
to 12% capacity (2.3K tokens) by summarizing 98% of accumulated session state. This
has a direct implication for ViewGraph: captures function as the authoritative visual
truth at each step. A ViewGraph checkpoint embedded in the session should survive
autocompaction because it is structured state, not reconstructable reasoning - the
agent needs to know what was *actually* on screen at step 3, not a summarized
approximation of it.

---

## Part 2: Format Enhancements

### Enhancement 1 - Action Manifest (New Required Section)

#### 1.1 Problem

Finding all interactive elements currently requires two-pass traversal: scan `nodes`
for the `actions` field, then join to `details` for `locators` and `bbox`. For a
375-node capture, this means scanning potentially 600+ lines to assemble ~30 actionable
elements. Every agent interaction loop starts with this expensive join.

#### 1.2 Proposed Section

```json
{
  "actionManifest": {
    "version": 1,
    "generatedAt": "2026-04-28T07:45:00Z",
    "byAction": {
      "clickable": [
        {
          "ref": "e1",
          "nid": 1,
          "alias": "button:create-project",
          "axRole": "button",
          "axName": "Create Project",
          "bbox": [1500, 20, 150, 36],
          "locator": { "strategy": "testId", "value": "create-project" },
          "inViewport": true,
          "cluster": "cluster001",
          "hint": null
        }
      ],
      "fillable": [
        {
          "ref": "e2",
          "nid": 8,
          "alias": "input:project-name",
          "axRole": "textbox",
          "axName": "Project name",
          "bbox": [200, 150, 600, 40],
          "locator": { "strategy": "testId", "value": "project-name-input" },
          "inViewport": true,
          "formValue": "",
          "cluster": "cluster003",
          "hint": null
        }
      ],
      "navigable": [],
      "scrollable": []
    },
    "viewportRefs": ["e1", "e2", "e4", "e5"],
    "stats": {
      "clickable": 18,
      "fillable": 4,
      "navigable": 6,
      "scrollable": 2,
      "inViewport": 12
    }
  }
}
```

#### 1.3 Compact Text Serialization (TOON-Aligned)

For the `compact` profile and file-backed mode, the action manifest uses a
TOON-style header-then-rows format. This is what an agent reads directly from disk:

```
# ViewGraph ActionManifest v1 | cap-20260428-001 | 2026-04-28T07:45:00Z
# fields: ref nid alias axRole axName locator bbox inViewport cluster hint
clickable[18]:
e1 1 button:create-project button "Create Project" testId:create-project [1500,20,150,36] Y cluster001 -
e3 3 button:export-all button "Export All" css:button.export [900,14,100,36] Y cluster001 -
e5 12 a:projects-link link "Projects" testId:nav-projects [20,80,160,32] Y cluster002 -
fillable[4]:
e2 8 input:project-name textbox "Project name" testId:project-name-input [200,150,600,40] Y cluster003 -
e9 22 select:status combobox "Status" testId:status-select [200,210,300,40] Y cluster003 stale-data
```

**Estimated token cost:** 30 interactive elements x ~1.5 lines each = ~180-280 tokens.
This is directly comparable to agent-browser's measured 200-400 token interactive
snapshot range for the same page complexity.

#### 1.4 Design Notes

- `ref` follows agent-browser's `@eN` convention. Stable within a capture session.
- `byAction` groups sorted: in-viewport first, then by salience, then document order.
- `viewportRefs` is a pre-computed list. Agents acting on visible elements do not
  parse `inViewport` per-element.
- `hint` carries a single anomaly string if applicable (e.g., `"stale-data"`,
  `"animation-active"`), `-` (dash) for none. Keeps the flat format scannable.
- **Required** in v3. Replaces the 2-pass join as the primary agent entry point.

#### 1.5 Token Reduction Estimates

| Query | Current (nodes + details scan) | With actionManifest | Reduction |
|---|---|---|---|
| "List all clickable elements" | ~1,600 lines | ~20 lines | ~99% |
| "Find the submit button" | ~300 lines scan | ~3 lines | ~99% |
| "What can I fill in?" | ~600 lines | ~10 lines | ~98% |

---

### Enhancement 2 - Stable Short Refs

#### 2.1 Problem

The current three-layer ID system (`nid`, `alias`, `backendNodeId`) is complete but
verbose in tool calls. Writing `click nid:1 locator:button[data-testid='create-project']`
consumes far more tokens than `click @e1`.

The agent-browser/Playwright CLI ecosystem has converged on short refs as the
de facto standard for agent-to-element addressing.

#### 2.2 Proposed Design

Add a `ref` field to every node in the `actionManifest` and optionally to `nodes`
entries. Refs are:

- **Format:** `e` + sequential integer, e.g., `e1` through `e999`. Assigned in
  document order within each salience tier, interactive nodes first.
- **Stability:** Stable within a capture session. Preserved for unchanged nodes in
  delta captures; re-assigned from scratch only on full page navigation.
- **Scope:** Assigned only to actionable nodes (clickable, fillable, navigable,
  scrollable, hoverable). Non-actionable container nodes do not get refs.
- **Annotated screenshot:** The mark number overlaid on each element IS the ref
  number. `[1]` in the screenshot = `@e1` in text. No separate lookup required.

```json
"refScheme": {
  "type": "sequential-e",
  "assignedTo": "actionable-nodes-only",
  "stableAcrossDeltas": true,
  "lastRef": "e30"
}
```

---

### Enhancement 3 - File-Backed Capture Mode

#### 3.1 Problem

MCP tool responses stream capture data inline into the agent's context window at
every call. For full captures this is extremely expensive. The research is clear:
writing files to disk and letting agents read only what they need is 4x+ more
token-efficient than MCP inline streaming.

#### 3.2 Proposed Design

Add `metadata.captureMode: "file-backed"`. In file-backed mode, the MCP server
writes the capture to disk and returns only a **capture receipt** - a small JSON
object with the path, summary stats, and key refs.

```json
{
  "captureReceipt": {
    "captureId": "cap-20260428-001",
    "captureMode": "file-backed",
    "path": ".viewgraph/cap-20260428-001.viewgraph.json",
    "actionManifestPath": ".viewgraph/cap-20260428-001.actions.txt",
    "screenshotPath": ".viewgraph/cap-20260428-001.png",
    "annotatedPath": ".viewgraph/cap-20260428-001-annotated.png",
    "timestamp": "2026-04-28T07:45:00Z",
    "summary": {
      "title": "Projects - AI Video Editor",
      "url": "http://localhost:8040/projects",
      "activeBreakpoint": "lg",
      "errors": 0,
      "failedRequests": 1,
      "failedRequestNote": "fetch /api/v1/projects - correlates to cluster004"
    },
    "viewportRefs": ["e1", "e2", "e4", "e5"],
    "stats": { "clickable": 18, "fillable": 4, "navigable": 6 },
    "structuralFingerprint": "sha256-e3b0..."
  }
}
```

The agent receives this receipt (~150-200 tokens) instead of a full capture.
It then reads what it needs via targeted reads:

```bash
# Read action manifest (200-400 tokens)
cat .viewgraph/cap-20260428-001.actions.txt

# Read a specific node via MCP tool
viewgraph_read cap-20260428-001 node e7

# Read console errors only
viewgraph_read cap-20260428-001 console
```

#### 3.3 Directory Convention

```
.viewgraph/
  cap-{timestamp}-{seq}.viewgraph.json        Full capture (readable or compact JSON)
  cap-{timestamp}-{seq}.actions.txt           TOON-format action manifest
  cap-{timestamp}-{seq}.png                   Viewport screenshot
  cap-{timestamp}-{seq}-annotated.png         SoM-annotated screenshot
  cap-{timestamp}-{seq}-delta.patch           JSON Patch from previous capture
  session.json                                Active session manifest
```

`session.json` is the agent's fast-access view of the active session:

```json
{
  "sessionId": "sess-20260428",
  "activeCapture": "cap-20260428-001-d1",
  "captures": [
    { "seq": 1, "captureId": "cap-20260428-001", "url": "...", "errors": 0, "fingerprint": "sha256-abc" },
    { "seq": 2, "captureId": "cap-20260428-001-d1", "type": "delta", "baseCaptureId": "cap-20260428-001", "nodesChanged": 5 }
  ]
}
```

#### 3.4 Token Impact

| Scenario | MCP inline | File-backed receipt | Reduction |
|---|---|---|---|
| Initial capture | ~100K tokens | ~200 tokens | ~99.8% |
| Per-step re-capture | ~100K tokens | ~200 tokens receipt | ~99.8% |
| Agent reads action manifest | N/A | ~250 tokens | N/A |
| Agent reads one node detail | ~1,600 tokens scan | ~30 tokens | ~98% |
| 10-step task total | ~1M tokens | ~7K tokens | ~99.3% |

---

### Enhancement 4 - Delta / Diff Capture Mode

#### 4.1 Problem

After each agent action, the page state changes partially. Re-capturing and
transmitting the full structure is the dominant token waste in multi-step agent loops.
Agent-E's "change-detection feedback" is the published proof: providing only what
changed lifted WebVoyager task success by ~16 percentage points over full re-captures.

#### 4.2 Proposed Design

`captureMode: "delta"` signals this capture is a patch against a named base capture.

```json
{
  "metadata": {
    "captureMode": "delta",
    "captureId": "cap-20260428-001-d1",
    "baseCaptureId": "cap-20260428-001",
    "deltaSeq": 1,
    "traceId": "trace-abc123",
    "parentActionId": "action-click-e1",
    "structuralFingerprint": "sha256-xyz...",
    "changeSignal": {
      "layoutShiftScore": 0.02,
      "nodesAdded": 3,
      "nodesRemoved": 1,
      "nodesModified": 5,
      "screenshotSimilarity": 0.97,
      "newErrors": 0,
      "newFailedRequests": 0
    }
  },
  "delta": {
    "format": "json-patch",
    "patch": [
      { "op": "replace", "path": "/nodes/high/button/1/ax/states", "value": ["focusable", "selected"] },
      { "op": "add", "path": "/nodes/high/dialog/42", "value": { "alias": "dialog:create-project", "actions": ["clickable"] } },
      { "op": "remove", "path": "/nodes/med/div/18" }
    ],
    "affectedRefs": ["e1", "e7"],
    "affectedNids": [1, 42, 18],
    "affectedClusters": ["cluster001", "cluster007"],
    "actionManifestPatch": [
      { "op": "add", "action": "clickable", "entry": { "ref": "e7", "nid": 42, "alias": "button:dialog-cancel", "axRole": "button", "axName": "Cancel", "bbox": [750, 400, 80, 36], "locator": { "strategy": "role", "value": "button", "name": "Cancel" }, "inViewport": true } },
      { "op": "remove", "ref": "e3" }
    ]
  }
}
```

#### 4.3 Structural Fingerprint for Cache-Hit Detection

Every capture carries:

```json
"structuralFingerprint": {
  "algorithm": "sha256",
  "scope": "node-topology",
  "inputs": "sorted(nid, tag, parent, children, actions)",
  "value": "e3b0c44298fc1c149afb..."
}
```

If consecutive captures share fingerprints, the agent knows the DOM structure has
not changed and only text, styles, and form values may differ - patchable with
a single field replace.

#### 4.4 Agent Decision Logic

```
IF current.fingerprint == previous.fingerprint:
  READ only: patch for text/style fields; skip node tree re-parse
ELIF nodesAdded == 0 AND nodesRemoved == 0:
  READ only: actionManifestPatch for updated refs; skip full manifest re-read
ELIF screenshotSimilarity > 0.95:
  READ: patch for structural changes to affectedNids only
ELSE:
  TRIGGER: full recapture (page navigation or major DOM change)
```

#### 4.5 Token Impact by Page Transition

| Transition | Full recapture | Delta | Savings |
|---|---|---|---|
| Modal opened | ~100K | ~2K patch + 200 receipt | ~98% |
| Form field filled | ~100K | ~500 byte patch | ~99.5% |
| Dropdown opened | ~100K | ~1K patch | ~99% |
| Page navigation | ~100K | Full capture (not delta-eligible) | 0% |

---

### Enhancement 5 - D2Snap-Aligned Container Merging

#### 5.1 Problem

Low-salience `div` and `section` wrapper nodes inflate the node tree without providing
agent-useful information. The D2Snap research proves they can be merged at capture
time without degrading task success rates.

#### 5.2 Merge Rule

A container node is merged into its parent if all of the following hold:

1. Tag is one of: `div`, `section`, `article`, `span`, `main`, `aside`.
2. No explicit ARIA role, no `data-testid`, no `id` attribute, no accessible name.
3. `visibleText` is empty (all text is in descendants).
4. It has exactly one child, OR all children are themselves merge-candidates.

When merged, the child nids are re-parented to the nearest non-merged ancestor.
The node's bbox is propagated upward.

```json
"coverage": {
  "containerMerge": {
    "enabled": true,
    "mergeRatio": 0.7,
    "mergedCount": 48,
    "eligibleCount": 63,
    "mergedTags": { "div": 41, "section": 5, "span": 2 },
    "policy": "merge-if-no-semantic-role-no-direct-text"
  }
}
```

`mergeRatio` maps to D2Snap's parameter `k`: 0.0 keeps all, 1.0 merges all eligible.
For a typical SPA with 375 nodes, 30-50% of `low` tier nodes are pure layout wrappers.
Merging reduces the node tree to 200-260 meaningful nodes, shrinking the `nodes`
section by ~35% and `details` by ~40%.

---

### Enhancement 6 - Compact Serialization: TOON-Aligned Format

#### 6.1 Problem

JSON repeats field names on every object. For 375 nodes, `"alias"`, `"axRole"`,
`"inViewport"`, `"cluster"` each appear 375 times. This is structural token waste
for sections where the schema is fixed and uniform.

#### 6.2 Proposed Design

The `compact` profile serializes uniform repeated structures as header-then-rows.
This applies to: `actionManifest.byAction` entries, `nodes` within a tier/tag group,
`relations.semantic` edges, and `spatialIndex` lookup.

**Example - compact nodes section:**

```
# ViewGraph Nodes v3 | compact | cap-20260428-001
# fields: nid alias parent children[] actions[] ax.role ax.name ax.states[] inViewport cluster
high.btn:
1 button:create-project 5 [] [c] button "Create Project" [fo] Y cluster001
3 button:export-all 5 [] [c] button "Export All" [fo] Y cluster001
high.inp:
8 input:project-name 22 [] [f] textbox "Project name" [fo,ed,rq] Y cluster003
```

**Enum short-codes** declared in `metadata.compactCodec`:

| Category | Long form | Code |
|---|---|---|
| actions | clickable | c |
| actions | fillable | f |
| actions | hoverable | h |
| actions | scrollable | s |
| actions | navigable | n |
| actions | draggable | d |
| axStates | focusable | fo |
| axStates | editable | ed |
| axStates | required | rq |
| axStates | disabled | ds |
| axStates | expanded | ex |
| axStates | selected | sl |
| axStates | checked | ck |
| axStates | pressed | pr |
| axStates | busy | bz |
| tiers | high | h |
| tiers | med | m |
| tiers | low | l |
| tags | button | btn |
| tags | input | inp |
| tags | a | lnk |
| tags | select | sel |
| tags | textarea | txt |
| tags | dialog | dlg |
| tags | nav | nav |
| tags | form | frm |

#### 6.3 Token Reduction by Section

| Section | JSON readable | TOON compact | Reduction |
|---|---|---|---|
| actionManifest (30 elements) | ~3,000 tokens | ~400 tokens | ~87% |
| nodes (200 post-merge) | ~8,000 tokens | ~2,400 tokens | ~70% |
| relations (34 edges) | ~800 tokens | ~200 tokens | ~75% |
| details (high/med only) | ~12,000 tokens | ~3,600 tokens | ~70% |
| Full compact capture | ~100K tokens | ~25K tokens | ~75% |

---

### Enhancement 7 - Error-to-Node Correlation

#### 7.1 Problem

`console` errors and `network` failures are isolated from the node tree. An agent
reading a React `QueryClientProvider` error must infer which rendered elements are
affected - expensive LLM reasoning work that can consume 200-500 tokens of thinking
and still produce incorrect correlations.

#### 7.2 Proposed Design

Add `correlatedRefs`, `correlatedNids`, and `correlationNote` to console errors and
failed network requests. The capture tool applies heuristics at generation time.

```json
{
  "console": {
    "errors": [
      {
        "message": "No QueryClient set, use QueryClientProvider to set one",
        "stack": "at App.tsx:12",
        "timestamp": "2026-04-28T07:30:00.123Z",
        "correlatedRefs": ["e1", "e2"],
        "correlatedNids": [5, 12],
        "correlationMethod": "component-boundary-heuristic",
        "correlationNote": "Error in render scope of nid:5 (div:app-root); likely affects nid:12 (section:projects-list)"
      }
    ]
  },
  "network": {
    "requests": [
      {
        "url": "https://api.example.com/v1/projects",
        "failed": true,
        "correlatedRefs": ["e2", "e4"],
        "correlatedNids": [12, 14, 15],
        "correlatedCluster": "cluster004",
        "correlationMethod": "cluster-data-dependency",
        "correlationNote": "cluster004 (projects-list) shows empty state; likely depends on this failed fetch"
      }
    ]
  }
}
```

#### 7.3 Correlation Heuristics by Error Type

| Error type | Heuristic |
|---|---|
| React provider missing | Root node + all descendants with matching context attribute |
| Failed API fetch | Clusters whose data fingerprint matches the resource path pattern |
| CSS parse error | Nodes with the affected class names |
| Import / module error | All high-salience nodes (whole-page scope) |
| Uncaught promise | `metadata.lastActionTarget.nid` and its cluster |
| aria-required violation | Specific nid from the error message if parseable |

#### 7.4 `lastActionTarget` Addition to Metadata

```json
"lastActionTarget": {
  "ref": "e1",
  "nid": 1,
  "alias": "button:create-project",
  "actionType": "click",
  "actionTimestamp": "2026-04-28T07:29:59.800Z",
  "parentCaptureId": "cap-20260428-001"
}
```

---

### Enhancement 8 - Spatial Index

#### 8.1 Problem

"What element is at coordinate (x, y)?" or "what is in the header region?" requires
a full bbox scan. Compounded over 20+ tool calls in a session, this is non-trivial.

#### 8.2 Proposed Design

A serialized quadtree using human-readable quadrant labels (`TL`, `TR`, `BL`, `BR`)
rather than raw coordinate strings. A `refIndex` reverse map enables single-dict
lookup for "which cell contains ref e7?" without any traversal.

```json
{
  "spatialIndex": {
    "type": "quadtree",
    "coordinateFrame": "viewport",
    "bounds": [0, 0, 1696, 799],
    "maxDepth": 4,
    "minCellPx": 80,
    "refIndex": {
      "e1": { "cell": "L1:TR", "bbox": [1500, 20, 150, 36] },
      "e2": { "cell": "L2:TL-BL", "bbox": [200, 150, 600, 40] }
    },
    "cells": {
      "L0": { "refs": [], "children": ["L1:TL", "L1:TR", "L1:BL", "L1:BR"] },
      "L1:TR": { "refs": ["e1", "e3", "e7"], "children": null },
      "L1:TL": { "refs": ["e5", "e6"], "children": ["L2:TL-TL", "L2:TL-TR", "L2:TL-BL", "L2:TL-BR"] },
      "L2:TL-BL": { "refs": ["e2", "e4"], "children": null }
    }
  }
}
```

Query pattern for MCP tools (`find_at_point`, `find_in_region`):
1. Start at `L0`, identify which `L1` child contains the point.
2. Walk down to a leaf cell via dictionary key lookups.
3. Check refs in the leaf cell for bbox containment - O(k) where k is small (3-8).

**Optional section.** Recommended for captures with >200 nodes. Generation overhead:
O(n log n), typically <5ms for 375 nodes.

---

### Enhancement 9 - Set-of-Marks and Annotate Integration

#### 9.1 Background

Set-of-Marks (SoM) prompting, validated in WebVoyager and OSCAR (2024-2025), overlays
numbered labels on screenshots so vision-language models can reference elements by
label number rather than guessing coordinates. BrowserGym uses SoM as a first-class
observation modality alongside DOM snapshots and AXTree.

agent-browser implements `--annotate` directly: each `[N]` in the screenshot
corresponds to ref `@eN` in the text snapshot. The equivalence is the key design
choice - it eliminates a separate mark-to-element lookup table.

#### 9.2 Proposed Section

```json
{
  "marks": {
    "screenshotRef": "cap-20260428-001-annotated.png",
    "style": "numbered-box-with-ref",
    "assignments": [
      { "mark": 1, "ref": "e1", "nid": 1, "alias": "button:create-project", "bbox": [1500, 20, 150, 36] },
      { "mark": 2, "ref": "e2", "nid": 8, "alias": "input:project-name", "bbox": [200, 150, 600, 40] }
    ],
    "scope": "actionManifest",
    "stableAcrossDeltas": true,
    "total": 30
  }
}
```

Key design choices:

- **Mark number = ref number.** `[1]` in the screenshot = `@e1` in text. The
  `style: "numbered-box-with-ref"` declaration encodes this equivalence.
- **Scope = actionManifest only.** Non-interactive nodes do not get marks.
- **Stable across deltas.** Mark numbers do not re-assign between delta captures.
- **CLI-first utility.** For non-visual agents, marks serve as a compact numbered
  alias: "click mark 7" is fewer tokens than the full locator string.

---

### Enhancement 10 - Checkpoint / Resume Envelope

#### 10.1 Problem

When a multi-step agent loop fails, recovery requires full re-capture and re-planning.
There is no compact way for the agent to record which steps completed successfully,
exactly where it failed, and why. Replays are expensive and not diagnostic.

The CHI 2025 AGDebugger research and Augment Code (2026) both identify agent
checkpointing as critical infrastructure for reliable multi-step tasks.

#### 10.2 Proposed Section

```json
{
  "checkpoint": {
    "traceId": "trace-abc123",
    "runId": "run-20260428-001",
    "sessionId": "sess-20260428",
    "stepId": 4,
    "agentId": "claude-code",
    "taskDescription": "Create a new project named 'Alpha' and set its status to Active",
    "completedSteps": [
      { "stepId": 1, "action": "click", "ref": "e1", "nid": 1, "outcome": "modal opened", "captureId": "cap-001-d1" },
      { "stepId": 2, "action": "fill",  "ref": "e2", "nid": 8, "value": "Alpha",  "outcome": "filled",          "captureId": "cap-001-d2" },
      { "stepId": 3, "action": "click", "ref": "e9", "nid": 22, "outcome": "dropdown opened", "captureId": "cap-001-d3" }
    ],
    "failedStep": {
      "stepId": 4,
      "intent": "select 'Active' from status dropdown",
      "attemptedRef": null,
      "targetDescription": "option 'Active' in status dropdown",
      "failureReason": "ref not found in actionManifest",
      "failureTimestamp": "2026-04-28T07:46:02.100Z",
      "captureAtFailure": "cap-001-d3"
    },
    "resumeToken": "eyJydW5JZCI6InJ1bi0yMDI2MDQyOC0wMDEifQ=="
  }
}
```

#### 10.3 `captureMode: "breakpoint"`

```json
"captureMode": "breakpoint",
"breakpointReason": "human-review-requested",
"breakpointLabel": "before-destructive-action",
"resumeToken": "eyJ..."
```

The MCP server holds execution and waits for a `viewgraph_resume(token)` call.
This gives developers the "interrupt and inspect" capability universally requested
in the CHI 2025 study - available to any MCP-connected agent, not just IDE users.

---

## Part 3: Additional Targeted Improvements

### 3.1 Observation Depth Parameter

Based on the "Read More, Think More" finding, add `observationDepth` as a runtime
capture parameter:

```json
"observationDepth": "interactive-only" | "ax-plus-content" | "full-detail"
```

| Depth | Content | Tokens (est.) | Best for |
|---|---|---|---|
| `interactive-only` | actionManifest receipt only | ~400 | High-capability models on navigation tasks |
| `ax-plus-content` | actionManifest + visible text + AX for high/med nodes | ~8K | Default - balanced |
| `full-detail` | Full v2 output | ~25K compact | Complex reasoning, debugging, style analysis |

### 3.2 Viewport-First Node Ordering

Within each salience tier, sort `inViewport: true` nodes first, then by document order.
Add `inViewport` (boolean) as a first-class node field computed from bbox intersection
with viewport dimensions, replacing the need for agents to compute
`documentX - scrollOffset.x` per element.

### 3.3 Cluster Dependency Graph

```json
"clusterDependencies": [
  { "source": "cluster004", "target": "cluster008", "type": "dataFlow",
    "note": "projects-list populates project-detail sidebar" },
  { "source": "cluster001", "target": "cluster004", "type": "navigation",
    "note": "nav filter triggers projects-list re-render" }
]
```

Gives agents a page-level dependency map for planning multi-step interactions without
requiring them to infer data flow from element attributes.

### 3.4 Stability Hints Expansion

Extend the existing `hints` on high-salience nodes with agent-relevant signals:

| Hint | Detection | Meaning for Agent |
|---|---|---|
| `dynamic-text` | Text differs between captures | Do not hard-code in assertions |
| `polling-update` | Node modified by timed fetch | Expect async state changes |
| `animation-active` | CSS animation/transition detected | Wait before interacting |
| `focus-trapped` | Element inside modal focus trap | Tab order is constrained |
| `stale-data` | `aria-busy: true` | Element is loading, do not act yet |
| `dynamic-class` | Class list changes between captures | Selector may break on state change |

### 3.5 Consolidated MCP Tool Surface (5 Tools Maximum)

Per the Vercel D0 finding, consolidate to a minimum viable tool surface:

| Tool | Purpose | Replaces |
|---|---|---|
| `viewgraph_capture(url?, depth?, mode?)` | Capture or re-capture current page state | N/A |
| `viewgraph_read(captureId, section?, ref?)` | Read any section or element from a capture | 5+ separate read tools |
| `viewgraph_act(captureId, action, ref)` | Record an action; optionally auto-recapture | N/A |
| `viewgraph_diff(captureId1, captureId2)` | Structural and visual diff between captures | N/A |
| `viewgraph_resume(resumeToken)` | Resume a paused or failed agent run | N/A |

`viewgraph_read` handles all reads. `section` scopes it: `actions`, `node`, `cluster`,
`console`, `network`, `checkpoint`, `spatial`, `full`. `ref` scopes to one element.

### 3.6 `$schema` URI

```json
{
  "$schema": "https://viewgraph.dev/schemas/v3.0.0/viewgraph.schema.json",
  "metadata": { ... }
}
```

Enables IDE autocomplete for any tool consuming ViewGraph captures.

---

## Part 4: Updated Top-Level Structure (v3.0 Draft)

```json
{
  "$schema": "https://viewgraph.dev/schemas/v3.0.0/viewgraph.schema.json",
  "metadata":          { ... },
  "summary":           { ... },
  "nodes":             { ... },
  "relations":         { ... },
  "styleTable":        { ... },
  "details":           { ... },
  "actionManifest":    { ... },
  "spatialIndex":      { ... },
  "marks":             { ... },
  "checkpoint":        { ... },
  "annotations":       [ ... ],
  "accessibility":     { ... },
  "coverage":          { ... },
  "network":           { ... },
  "console":           { ... },
  "breakpoints":       { ... }
}
```

### Section Table

| Order | Key | v3 Status | Key v3 Additions |
|---|---|---|---|
| 1 | `metadata` | Required | `captureId`, `traceId`, `parentCaptureId`, `structuralFingerprint`, `lastActionTarget`, `refScheme`, `observationDepth`, `captureMode: delta/breakpoint/file-backed`, `changeSignal` |
| 2 | `summary` | Required | `clusterDependencies` |
| 3 | `nodes` | Required | `ref`, `inViewport` per node; viewport-first sort order |
| 4 | `relations` | Required | No change |
| 5 | `styleTable` | Optional | No change |
| 6 | `details` | Required | Extended stability hints |
| 7 | `actionManifest` | **Required** (new) | Pre-joined interactive index; TOON compact form |
| 8 | `spatialIndex` | Optional* | Quadtree with `refIndex` reverse map |
| 9 | `marks` | Optional | SoM assignments; mark number = ref number |
| 10 | `checkpoint` | Optional | Step log; `failedStep`; `resumeToken` |
| 11 | `annotations` | Optional | No change |
| 12 | `accessibility` | Optional | No change |
| 13 | `coverage` | Optional | `containerMerge` stats added |
| 14 | `network` | Optional | `correlatedRefs`, `correlatedNids`, `correlationNote` |
| 15 | `console` | Optional | `correlatedRefs`, `correlatedNids`, `correlationNote` |
| 16 | `breakpoints` | Optional | No change |

*Recommended for >200 nodes or `captureMode: viewgraph-capture`.

---

## Part 5: Token Budget Summary

### Per-Step Budget by Mode

| Mode | Capture return | Per-step reads | 10-step task total |
|---|---|---|---|
| v2 MCP inline (current) | ~100K per step | ~100K re-capture | ~1M tokens |
| v3 file-backed receipt | ~200 tokens | ~500 (manifest + 1-2 nodes) | ~7K tokens |
| v3 delta mode | ~200 receipt | ~1K delta patch | ~12K tokens |
| v3 interactive-only depth inline | ~400 tokens | None | ~4K tokens |

**Best case combined (file-backed + delta + interactive-only):**
1 full capture at ~25K compact + 9 delta receipts at ~200 each + targeted reads at
~5K total = **~32K tokens for a 10-step task**, versus ~1M tokens for the current
v2 MCP inline full-capture-per-step pattern. Approximately **97% reduction.**

### Reduction by Enhancement (Independent)

| Enhancement | Independent token reduction |
|---|---|
| Action Manifest pre-join | 80-85% on interactive-element queries |
| File-backed mode | ~99% on capture transmission per step |
| Delta mode | 90-99% on follow-up captures in multi-step loops |
| Container merging (D2Snap) | 35-40% on nodes/details sections |
| TOON compact format | 70-87% on repeated uniform structures |
| observationDepth: interactive-only | ~96% vs full-detail capture |
| Error-to-node correlation | Eliminates 200-500 tokens LLM reasoning per error |
| Viewport-first ordering | 20-30% on scan-to-first-match for visible-element tasks |

---

## Part 6: Implementation Priority

### Phase 1 - High impact, low effort (v2.4, ~2 weeks)

1. `actionManifest` section - re-formats existing nodes+details join, no new capture data.
2. `ref` field on actionable nodes - sequential assignment, no new capture data.
3. `inViewport` boolean on nodes - derivable from existing bboxViewport data.
4. `structuralFingerprint` in metadata - cheap SHA-256 of sorted node topology.
5. Error-to-node `correlatedRefs` and `correlatedNids` - heuristic, best-effort.
6. `lastActionTarget` in metadata - agent writes this on each action.
7. Compact enum short-codes in `compactCodec` - pure serialization change.

### Phase 2 - Medium effort (v2.5 / v3.0, ~4-6 weeks)

8. File-backed capture mode and directory convention.
9. Delta `captureMode` and JSON Patch generation (requires base-capture state tracking).
10. `changeSignal` object computation (requires screenshot SSIM comparison).
11. `observationDepth` parameter and interactive-only capture path.
12. Container merging (D2Snap-aligned) - single O(n) tree pass at capture time.
13. TOON compact serialization of `actionManifest` and `nodes`.
14. `spatialIndex` quadtree generation.

### Phase 3 - Higher effort (v3.1, ~6-8 weeks)

15. `marks` section and annotated screenshot generation.
16. `checkpoint` and `resumeToken` protocol (requires MCP server session state).
17. `captureMode: "breakpoint"` and resume handshake protocol.
18. Cluster dependency graph inference (requires cross-cluster data flow analysis).
19. Stability hint expansion (requires multi-capture comparison).
20. MCP tool surface consolidation to 5 tools.

---

## Part 7: Competitive Positioning

### ViewGraph v3 vs Current Alternatives

| Tool | Tokens per page | Delta | Debug correlation | Spatial query | Layout grounding |
|---|---|---|---|---|---|
| Playwright MCP | ~11K AXTree | None | None | None | AXTree only |
| Playwright CLI | ~200-400 interactive | None | None | None | AXTree YAML on disk |
| Vercel agent-browser | ~200-400 interactive | None | None | None | AXTree + SoM |
| Chrome DevTools MCP | ~17K schema + full AXTree | None | None | None | AXTree + CDP |
| ViewGraph v2 (current) | ~100K full JSON | None | Partial | None | AXTree + DOM + styles |
| **ViewGraph v3 (proposed)** | **~400 interactive / ~25K full** | **JSON Patch + changeSignal** | **Full + refs** | **Quadtree** | **AXTree + DOM + styles + SoM** |

ViewGraph v3's differentiation is depth with scoped access. agent-browser and
Playwright CLI win on raw token efficiency for pure navigation and interaction tasks
but provide no debug correlation, no spatial querying, no delta awareness, and no
style/computed-layout grounding. ViewGraph v3 matches them at the interactive-only
tier while retaining full depth for debug, layout reasoning, and test generation -
and adds the file-backed architecture that makes long-session agent loops tractable.

---

## References

### Token Efficiency Benchmarks

- TestDino 2026. "Playwright CLI: Token-Efficient Alternative to Playwright MCP."
  testcollab.com/blog/playwright-cli. 114K vs 27K tokens per 10-step task; 4x reduction.
- ytyng.com 2026. "Playwright CLI vs agent-browser vs Claude in Chrome."
  Measured: MCP 114K, CLI 27K, agent-browser 200-400 tokens per interactive snapshot.
- Pulumi 2026. "Self-Verifying AI Agents: agent-browser in the Ralph Wiggum Loop."
  D0 data: 17 tools (80% success, 274.8s, 102K tokens) vs 2 tools (100%, 77.4s, 61K tokens).
- isagentready.com 2026. "Vercel agent-browser: Why a CLI Beats MCP."
  13,700 token schema overhead before any page visit for Playwright MCP.
- paddo.dev 2026. "The Context Wars: Why Your Browser Tools Are Bleeding Tokens."
  93% less context vs Playwright MCP from Snapshot + Refs approach.

### Format Efficiency

- jduncan.io 2025. "TOON vs JSON: Why AI Agents Need Token-Optimized Data Formats."
  40% reduction for flat tabular data; nested data still favors JSON/YAML.
- shshell.com 2026. "JSON vs YAML vs Markdown Token Benchmarks."
  YAML 20-30% more efficient than JSON for complex nested data.
- improvingagents.com 2025. "Which Nested Data Format Do LLMs Understand Best?"
  Markdown 34-38% fewer tokens than JSON; YAML ~10% fewer than JSON across models.

### DOM Reduction Research

- arXiv 2508.04412 (D2Snap, Aug/Oct 2025). "Beyond Pixels: Exploring DOM Downsampling
  for LLM-Based Web Agents." Container merging at variable ratio; 67% vs 65% baseline
  success rate; DOM-inherent hierarchy is a strong UI feature for LLMs.
- arXiv 2511.21398 (Prune4Web, 2025). Programmatic DOM pruning; grounding accuracy
  from 46.80% to 88.28%. DOMs typically contain 10,000-100,000 tokens.
- arXiv 2507.00210 (LineRetriever, 2025). Planning-context-aware observation reduction;
  outperforms semantic similarity retrieval for navigation tasks.
- arXiv 2510.03204 (FocusAgent, 2025). AXTrees reduce tokens 10x vs DOM but still
  exceed context limits on modern SPAs; LLM-based targeted retrieval required.

### Model Capability and Observation Format

- arXiv 2604.01535 ("Read More, Think More", 2026). For high-capability models, AXTree-
  only observation *decreases* task success vs full HTML. Planning signals in HTML are
  critical. Observation depth should be a runtime parameter, not a format constant.
- arXiv 2602.22402 (Contextual Memory Virtualisation, 2026). Claude Code autocompaction:
  132K tokens at 76% capacity compressed to 2.3K tokens at 12% capacity (98% reduction).
  ViewGraph checkpoints anchor authoritative visual state through compaction.

### Agent Debugging

- CHI 2025. "Interactive Debugging and Steering of Multi-Agent AI Systems (AGDebugger)."
  Breakpoint semantics; reset-to-previous-point; counterfactual debugging.
  dl.acm.org/doi/10.1145/3706598.3713581
- Augment Code 2026. "How to Debug Parallel AI Agents Without Going Insane."
  Minimum replay artifact set; causal trace IDs over wall-clock timestamps;
  50-200MB/day trace storage baseline. augmentcode.com/guides/debug-parallel-ai-agents
- Maxim AI 2026. "Agent Tracing for Debugging Multi-Agent AI Systems."
  Distributed tracing, visual replay, in-context debugging for agent pipelines.

### Tools and Ecosystem

- vercel-labs/agent-browser (GitHub, 2026). `snapshot -i`, `--annotate`, ref `@eN`
  system, Claude Code skill integration. github.com/vercel-labs/agent-browser
- github.com/microsoft/playwright-mcp (2026). Playwright CLI vs MCP recommendation;
  file-backed YAML snapshots; `snapshot.mode: full | none`.
- BrowserGym (emergentmind.com, 2025). DOM + AXTree + SoM as three complementary
  observation modalities; Set-of-Marks improves element localization.
- RedMonk 2025. "10 Things Developers Want from their Agentic IDEs."
  Memory, parallel agents, error correlation as top developer demands into 2026.
  redmonk.com/kholterhoff/2025/12/22/10-things-developers-want-from-their-agentic-ides-in-2025
- LoPace (arXiv 2602.13266, 2026). 72.2% space reduction on structured prompts via
  Zstandard + BPE hybrid. Applicable to the compact profile wire format.
