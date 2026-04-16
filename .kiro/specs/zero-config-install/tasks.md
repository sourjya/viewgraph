# F16: Zero-Config Install - Tasks

## Phase 1: Server self-configuration
- [ ] 1. Add auto-create `.viewgraph/captures/` on server boot if directory missing
- [ ] 2. Add default config fallback when no `config.json` exists (localhost pattern, cwd as root)
- [ ] 3. Add transport auto-detection (stdio vs HTTP+WS based on stdin.isTTY)
- [ ] 4. Add `--root` CLI flag to override project root
- [ ] 5. Write tests for boot without config, boot without .viewgraph/, transport detection

## Phase 2: Auto-learn and first-capture onboarding
- [ ] 6. On first capture received with no config.json, auto-generate config with learned URL pattern
- [ ] 7. Log informational message when auto-configuring
- [ ] 8. Ensure server accepts captures from any localhost URL when no patterns configured
- [ ] 9. Write tests for auto-learn flow

## Phase 3: Documentation and distribution
- [ ] 10. Update README.md: zero-config as primary install path, viewgraph-init as advanced
- [ ] 11. Update GitBook quick-start: 3-step setup (MCP config + extension + done)
- [ ] 12. Update npm README with copy-paste MCP config JSON
- [ ] 13. Add MCP config examples for Kiro, Claude Code, Cursor, Cline, Windsurf
- [ ] 14. Update CHANGELOG

## Phase 4: Validation
- [ ] 15. Test full flow: fresh project, no viewgraph-init, just MCP config + extension
- [ ] 16. Test backward compat: existing viewgraph-init projects still work
- [ ] 17. Test multi-project: config.json with explicit patterns still takes precedence
- [ ] 18. npm publish with updated package
