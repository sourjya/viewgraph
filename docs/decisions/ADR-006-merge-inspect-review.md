# ADR-006: Merge Inspect and Review into Unified Annotate Mode

**Status:** Accepted
**Date:** 2026-04-08
**Deciders:** sourjya

## Context

The extension currently has two separate interaction modes:

- **Inspect mode** - hover to highlight elements, click to freeze, then capture subtree or copy selector. No comment input. Sends raw DOM data to Kiro without human context.
- **Review mode** - shift+drag to select regions, add comments, send annotated bundle to Kiro.

These modes have separate state machines, separate event handlers, separate popup buttons, and are mutually exclusive (entering one exits the other). Users must choose upfront which mode they want, but the actual workflow is almost always the same: "look at something, say something about it, send it."

### Problems with two modes

1. **Inspect without context is low-value.** Sending a subtree capture to Kiro without explaining why is like pointing at something and walking away. Kiro gets DOM structure but no intent.
2. **Mode confusion.** Users must learn when to use Inspect vs Review. The distinction is not intuitive - both involve selecting things on the page.
3. **Duplicated code.** Two overlay systems, two event handler sets, two cleanup paths, two sets of tests.
4. **Lost workflow.** Inspecting an element and then wanting to comment on it requires exiting inspect, entering review, and re-selecting the same area.

## Decision

Merge Inspect and Review into a single **Annotate** mode.

### Interaction model

- **Click** an element - freezes it with highlight overlay, opens comment panel anchored to the element. The element's subtree is captured as context.
- **Shift+drag** - selects a rectangular region (existing review behavior), opens comment panel. All intersected elements are captured as context.
- Both interactions feed into the **same annotation list** in the sidebar.
- **Copy selector** remains as a utility action on the frozen element toolbar.
- **Send to Kiro** sends all annotations with their element context in one bundle.

### Popup changes

- Three buttons (Capture, Inspect, Review) become two: **Capture** and **Annotate**
- Capture: full-page DOM capture (unchanged)
- Annotate: enters the unified mode

### What stays

- Hover-to-highlight from inspect mode
- Shift+drag region selection from review mode
- Annotation sidebar with resolve toggle, ancestor labels, persistence
- Copy selector utility
- Subtree capture (now attached to annotations as context, not standalone)
- All MCP tools continue to work - the capture format doesn't change

### What changes

- No more standalone subtree captures without comments (camera icon removed or repurposed)
- Click-to-freeze now opens a comment panel instead of a toolbar
- Single state machine instead of two
- One popup button instead of two

## Alternatives Considered

### Keep both modes, add comment to inspect
Add a text input to the inspect toolbar. This preserves the two-mode model but adds the missing comment capability to inspect. Rejected because it doesn't solve the mode confusion problem and keeps the duplicated code.

### Sidebar mode toggle icons
Keep both modes but add inspect/annotate toggle icons on the sidebar edge so users can switch without returning to the popup. Rejected because it makes switching easier but doesn't address the core problem: two modes that do almost the same thing. Inspect without commenting remains pointless, and users still need to understand when to use which mode.

### Three-way merge (Capture + Inspect + Review into one)
Make the full-page capture also part of annotate mode. Rejected because full-page capture is a distinct action (capture everything vs. select specific things) and doesn't benefit from the annotation workflow.

## Consequences

### Positive
- Simpler mental model: one mode for all "select and comment" workflows
- Every piece of feedback sent to Kiro has human context
- Less code to maintain (one state machine, one overlay system)
- Popup is cleaner with two buttons

### Negative
- Breaking change for users familiar with the current two-mode model
- Quick "just capture this subtree" without commenting requires an extra dismiss step
- Significant refactor touching popup, content script, and both mode modules

### Migration
- Inspector module becomes the hover/click engine for annotate mode
- Review module's region selection merges in
- Annotation sidebar, panel, and persistence stay largely unchanged
- Tests need rewriting for the unified state machine

## Implementation Plan

See tasks below. Estimated effort: 2-3 days.
