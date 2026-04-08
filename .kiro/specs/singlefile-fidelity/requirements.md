# SingleFile Fidelity Measurement - Requirements

## Overview

Integrate HTML snapshot capture alongside ViewGraph JSON captures to
measure and track capture fidelity over time. Every capture produces
a paired JSON + HTML output. A server-side comparison tool generates
fidelity reports.

## License Constraint

`single-file-core` is **AGPL-3.0**, not MIT. Bundling it into our
extension would require our extension to also be AGPL. Two approaches:

**Option A (chosen): Use SingleFile as a companion, not a dependency.**
The user installs SingleFile separately (they probably already have it).
Our extension triggers SingleFile via messaging or the user captures
manually. We match files by timestamp.

**Option B: Build a lightweight HTML serializer ourselves.**
We don't need SingleFile's full power (font subsetting, CSS @import
chains, canvas serialization). For fidelity measurement, a simpler
`document.documentElement.outerHTML` + inline styles approach is
sufficient. No license issues.

We go with **Option B for dev/internal use** (simple serializer for
fidelity measurement) and **Option A for production** (recommend
SingleFile as companion for full-fidelity snapshots).

## Functional Requirements

### FR-1: HTML Snapshot Capture (Extension)
- FR-1.1: Add "Include HTML Snapshot" toggle in popup (off by default)
- FR-1.2: When enabled, capture serialized HTML alongside ViewGraph JSON
- FR-1.3: HTML serializer captures: full DOM, inline computed styles for
  visible elements, image src attributes (not inlined as data URIs)
- FR-1.4: Strip scripts from HTML output (static snapshot)
- FR-1.5: POST HTML snapshot to MCP server alongside JSON capture

### FR-2: Snapshot Storage (Server)
- FR-2.1: Accept HTML snapshots at `POST /snapshots`
- FR-2.2: Store in `snapshots/` subdirectory alongside `captures/`
- FR-2.3: Matching filenames: same timestamp stem, different extension
  - `captures/viewgraph-localhost-2026-04-08-120612.json`
  - `snapshots/viewgraph-localhost-2026-04-08-120612.html`
- FR-2.4: Link snapshot filename in JSON capture metadata

### FR-3: Fidelity Comparison (Server)
- FR-3.1: Parse HTML snapshot to extract element inventory
- FR-3.2: Compare against ViewGraph JSON capture
- FR-3.3: Compute metrics:
  - Element coverage: % of HTML elements present in capture
  - TestID coverage: % of data-testid elements captured
  - Text coverage: % of visible text content captured
  - Interactive coverage: % of buttons/links/inputs captured
- FR-3.4: Identify missing elements with reasons (hidden, decorative, etc.)
- FR-3.5: Generate per-capture fidelity report JSON

### FR-4: Fidelity Tracking (Server)
- FR-4.1: Rolling fidelity summary across all paired captures
- FR-4.2: Track metrics over time to detect regressions
- FR-4.3: MCP tool: `get_fidelity_report({ filename })` returns report
  for a specific capture pair

### FR-5: Manual SingleFile Pairing
- FR-5.1: Accept manually saved SingleFile HTML files dropped into
  `snapshots/` directory
- FR-5.2: Match to captures by URL + closest timestamp
- FR-5.3: Generate fidelity report for manually paired files

## Non-Functional Requirements

### NFR-1: No AGPL dependencies
- HTML serializer is our own code, not single-file-core
- SingleFile integration is optional companion, not bundled

### NFR-2: Performance
- HTML serialization should complete in <2 seconds
- Fidelity comparison should complete in <500ms

### NFR-3: Storage
- HTML snapshots stored in separate `snapshots/` directory
- Snapshots are not indexed by the capture indexer (separate concern)
