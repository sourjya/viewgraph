# Unified Review Panel - Tasks

## Phase 1: Data Model + Server (foundation)

- [ ] 1.1 Add UUID generation to annotations (crypto.randomUUID in extension)
- [ ] 1.2 Add `type`, `timestamp`, `resolution`, `resolvedBy`, `resolvedAt` fields to annotation schema
- [ ] 1.3 Implement `resolve_annotation` MCP tool (validate UUID, action enum, max lengths, 409 on collision)
- [ ] 1.4 Implement `get_unresolved` MCP tool (single capture or cross-capture scan via indexer)
- [ ] 1.5 Backward compatibility: old captures without uuid/type get auto-generated values on read
- [ ] 1.6 Tests: resolution, UUID validation, collision handling, backward compat
- [ ] 1.7 Bump format version to 2.2.0 for captures with new fields

## Phase 2: Extension - Sidebar as Primary UI

- [ ] 2.1 Remove popup, extension icon click opens sidebar directly
- [ ] 2.2 Detect non-injectable pages, show fallback popup with specific error messages
- [ ] 2.3 Refactor sidebar to unified timeline (chronological, open items on top)
- [ ] 2.4 Add page-note type: "Note" button in footer, no element reference
- [ ] 2.5 Move Capture button to sidebar footer (explicit user action, no auto-capture)
- [ ] 2.6 Resolved items accordion: collapsed by default, "N resolved" summary
- [ ] 2.7 Add Settings section (collapsible): server URL, project mappings, auth token
- [ ] 2.8 Send behavior: annotations-only when no capture, bundled when capture exists
- [ ] 2.9 Tests for sidebar components, non-injectable detection

## Phase 3: Bidirectional Resolution + Kiro Requests

- [ ] 3.1 Extension reads resolved state from server on sidebar open
- [ ] 3.2 Resolved items show checkmark + resolution summary + "resolved by" label
- [ ] 3.3 Offline state in chrome.storage, last-write-wins sync on reconnect
- [ ] 3.4 Kiro request notification banner (poll /requests/pending)
- [ ] 3.5 "Capture Now" button in banner completes pending request
- [ ] 3.6 Hide banner when no pending requests
- [ ] 3.7 Tests: sync scenarios (server resolved, offline resolve, conflict, reconnect)

## Phase 4: Export Updates

- [ ] 4.1 Send to Kiro bundles all item types (captures + notes + element annotations)
- [ ] 4.2 Markdown export includes page notes section and resolution status
- [ ] 4.3 Resolution note sanitization in markdown (escape backticks, pipes)
- [ ] 4.4 Tests for export with new item types
