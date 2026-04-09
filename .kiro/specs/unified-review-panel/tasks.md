# Unified Review Panel - Tasks

## Phase 1: Data Model + Server (foundation)

- [ ] 1.1 Add UUID generation to annotations (crypto.randomUUID in extension)
- [ ] 1.2 Add `type`, `timestamp`, `resolution`, `resolvedBy`, `resolvedAt` fields to annotation schema
- [ ] 1.3 Implement `resolve_annotation` MCP tool with path validation
- [ ] 1.4 Implement JSONL history store with in-memory index
- [ ] 1.5 Implement `get_review_history` MCP tool
- [ ] 1.6 Add history append on capture push and annotation resolve
- [ ] 1.7 Tests for all new server functionality
- [ ] 1.8 Backward compatibility tests (old captures without uuid/type)

## Phase 2: Extension Sidebar Redesign

- [ ] 2.1 Refactor sidebar to unified timeline layout (chronological list)
- [ ] 2.2 Add page-note type: "Note" button in footer, no element reference
- [ ] 2.3 Move Capture button from popup to sidebar footer
- [ ] 2.4 Add capture items to timeline (auto-capture on start + manual)
- [ ] 2.5 Add Kiro request notification banner (poll /requests/pending)
- [ ] 2.6 "Capture Now" button in banner completes pending request
- [ ] 2.7 Hide banner when no pending requests
- [ ] 2.8 Tests for sidebar components

## Phase 3: Bidirectional Resolution

- [ ] 3.1 Extension reads back resolved state from server on sidebar open
- [ ] 3.2 Resolved items show green checkmark + resolution note + "resolved by Kiro"
- [ ] 3.3 Auto-refresh sidebar when capture file changes (poll or timestamp check)
- [ ] 3.4 Tests for resolution display and refresh

## Phase 4: Popup Simplification + Export Updates

- [ ] 4.1 Simplify popup to single "Review" button + connection status
- [ ] 4.2 Review button opens sidebar + auto-captures DOM
- [ ] 4.3 Update markdown export to include page notes section
- [ ] 4.4 Update Send to include all item types (captures + notes + annotations)
- [ ] 4.5 Tests for popup and export changes

## Phase 5: History Management

- [ ] 5.1 JSONL compaction when exceeding 1000 lines
- [ ] 5.2 Auto-prune oldest captures when maxCaptures exceeded
- [ ] 5.3 History survives extension reload (chrome.storage sync)
- [ ] 5.4 Tests for compaction and pruning
