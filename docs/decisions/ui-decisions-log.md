# UI Decisions Log

Lightweight record of UX decisions that don't warrant a full ADR but need to be documented so they're not revisited without context.

---

## UID-001: Sidebar opens full panel after Esc quit (2026-04-30)

**Decision:** When the user presses Esc to close the sidebar, then clicks the extension icon again, the sidebar opens in full panel mode (not collapsed strip).

**Rationale:**
- Esc = quit. The sidebar is destroyed, all state cleared. This is an intentional exit.
- Clicking the icon again = starting a new session. Full panel gives the user the complete UI to orient (annotations, inspect tab, mode selection).
- Collapsed strip is for **mid-workflow** - when actively annotating and wanting the sidebar out of the way while clicking elements.
- Reopening collapsed would add an extra click to expand every time with no benefit.

**Mental model:**
- Icon click = open the tool
- Collapse = minimize while working
- Esc = close the tool

**Status:** Current behavior. No change needed.
