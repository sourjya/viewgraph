# F18: MCP Agent Guidance - Tasks

## Phase 1: Server Instructions
- [x] 1. Write SERVER_INSTRUCTIONS constant in server/src/constants.js with workflow, categories, security, performance guidance
- [x] 2. Update McpServer constructor in server/index.js to pass instructions as description
- [x] 3. Write tests verifying instructions are included in server metadata
- [x] 4. Verify with a real agent session that instructions improve tool selection

## Phase 2: Session Status Tool
- [x] 5. Create server/src/tools/get-session-status.js with capture/annotation/baseline counts
- [x] 6. Add actionable suggestions based on current state (unresolved annotations, stale captures, missing baselines)
- [x] 7. Register tool in server/index.js
- [x] 8. Write unit tests for status aggregation and suggestion generation

## Phase 3: Workflow-Aware Tool Descriptions
- [x] 9. Audit all 36 tool descriptions for "when to use" and "what next" guidance
- [x] 10. Add cross-references between related tools (get_page_summary <-> get_capture, etc.)
- [x] 11. Add output size expectations to tools that return large responses
- [x] 12. Update tool description tests to verify cross-references exist

## Phase 4: Input Validation
- [x] 13. Add suggestCapture() helper to tool-helpers.js for fuzzy filename matching
- [x] 14. Update all filename-accepting tools to use suggestCapture on not-found errors
- [x] 15. Add helpful error messages with "did you mean" suggestions
- [x] 16. Write tests for fuzzy matching and error message formatting

## Phase 5: Documentation
- [x] 17. Update docs/security/security-assessment.md with prompt injection mitigations
- [x] 18. Update gitbook/features/mcp-tools.md with workflow guidance
- [x] 19. Update CHANGELOG
