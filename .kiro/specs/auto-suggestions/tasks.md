# F15: Auto-Inspect Suggestions - Tasks

## Phase 1: Core suggestion engine
- [ ] 1. Create `lib/sidebar/suggestions.js` with `scanForSuggestions()` function
- [ ] 2. Implement accessibility tier: aggregate axe-collector, landmark-collector, focus-collector results
- [ ] 3. Implement quality tier: aggregate network-collector, console-collector, visibility-collector, stacking-collector results
- [ ] 4. Implement testability tier: aggregate element-diagnostics, component-collector results
- [ ] 5. Implement ranking algorithm (severity > tier > element count)
- [ ] 6. Implement deduplication against existing annotations
- [ ] 7. Write tests for suggestions.js (scan, rank, dedup, cap)

## Phase 2: Sidebar UI
- [ ] 8. Add suggestion checklist section to top of Review tab in `sidebar/review.js`
- [ ] 9. Add suggestion count badge to Review tab header
- [ ] 10. Implement select/deselect checkboxes and "Select All" toggle
- [ ] 11. Implement "Send N to Agent" button that converts selected suggestions to annotations
- [ ] 12. Implement dismiss button (per-suggestion, session-scoped)
- [ ] 13. Implement "Refresh" button to re-run scan
- [ ] 14. Write tests for suggestion UI rendering

## Phase 3: Integration and polish
- [ ] 15. Wire scan to run on sidebar open (in `annotation-sidebar.js` create flow)
- [ ] 16. Add `autoSuggestions` and `maxSuggestions` to config.json schema
- [ ] 17. Cache results until refresh or sidebar reopen
- [ ] 18. Update docs: extension.md, feature-specs.md, CHANGELOG
- [ ] 19. Build, full test suite, lint, commit
