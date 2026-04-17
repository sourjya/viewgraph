# F19: Prompt Injection Defense - Tasks

## Phase 1: Capture-time sanitization (Extension)
- [ ] 1. Strip HTML comment nodes (nodeType 8) from traverser output
- [ ] 2. Cap data-* attribute values at 100 characters in traverser
- [ ] 3. Clear visibleText for hidden elements (display:none, visibility:hidden, aria-hidden)
- [ ] 4. Write traverser tests: comments stripped, hidden text cleared, data attrs capped, normal text preserved

## Phase 2: Transport-time wrapping (Server)
- [ ] 5. Create server/src/utils/sanitize.js with wrapCapturedText() and wrapComment()
- [ ] 6. Apply wrapping to get_capture, get_page_summary, get_annotations, get_annotation_context, get_elements_by_role, get_interactive_elements, get_unresolved
- [ ] 7. Add _notice field to all tools returning text content (extend existing pattern)
- [ ] 8. Write tests for wrapping functions and verify tool responses include delimiters

## Phase 3: Suspicious content detection (Server)
- [ ] 9. Create server/src/utils/injection-detector.js with detectSuspicious()
- [ ] 10. Define pattern list: ignore above, system:, IMPORTANT:, you are now, disregard, new instructions, override, forget everything, act as, pretend, execute following
- [ ] 11. Integrate detection into tools from Phase 2 - add _warning field when patterns found
- [ ] 12. Write tests: all patterns detected, no false positives on normal UI text ("Submit", "Ignore this field", "System settings")

## Phase 4: Prompt hardening (Steering + Prompts)
- [ ] 13. Add injection defense section to .kiro/steering/viewgraph-workflow.md
- [ ] 14. Add delimiter documentation to SERVER_INSTRUCTIONS (F18)
- [ ] 15. Add one-line untrusted data reminder to all @vg-* prompt shortcuts
- [ ] 16. Create test capture with known injection patterns for manual verification

## Phase 5: Documentation
- [ ] 17. Update GitBook threat model page with prompt injection defense layers
- [ ] 18. Update GitBook security page with defense-in-depth description
- [ ] 19. Update CHANGELOG
