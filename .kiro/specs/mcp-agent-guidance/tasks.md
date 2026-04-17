# F18: MCP Agent Guidance - Tasks

## Phase 1: Server Instructions
- [ ] 1. Write SERVER_INSTRUCTIONS constant in server/src/constants.js with workflow, categories, security, performance guidance
- [ ] 2. Update McpServer constructor in server/index.js to pass instructions as description
- [ ] 3. Write tests verifying instructions are included in server metadata
- [ ] 4. Verify with a real agent session that instructions improve tool selection

## Phase 2: Session Status Tool
- [ ] 5. Create server/src/tools/get-session-status.js with capture/annotation/baseline counts
- [ ] 6. Add actionable suggestions based on current state (unresolved annotations, stale captures, missing baselines)
- [ ] 7. Register tool in server/index.js
- [ ] 8. Write unit tests for status aggregation and suggestion generation

## Phase 3: Workflow-Aware Tool Descriptions
- [ ] 9. Audit all 36 tool descriptions for "when to use" and "what next" guidance
- [ ] 10. Add cross-references between related tools (get_page_summary <-> get_capture, etc.)
- [ ] 11. Add output size expectations to tools that return large responses
- [ ] 12. Update tool description tests to verify cross-references exist

## Phase 4: Input Validation
- [ ] 13. Add suggestCapture() helper to tool-helpers.js for fuzzy filename matching
- [ ] 14. Update all filename-accepting tools to use suggestCapture on not-found errors
- [ ] 15. Add helpful error messages with "did you mean" suggestions
- [ ] 16. Write tests for fuzzy matching and error message formatting

## Phase 5: Documentation
- [ ] 17. Update docs/architecture/security-assessment.md with prompt injection mitigations
- [ ] 18. Update gitbook/features/mcp-tools.md with workflow guidance
- [ ] 19. Update CHANGELOG
