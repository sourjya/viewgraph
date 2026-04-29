# Codebase Audit - Post Auth Removal (2026-04-15)

## Scope

8 scans covering dead code, stale references, test coverage, and edge cases after the auth removal (ADR-010).

## Results

### Scans 1-6: Auth Removal Verification

All auth code fully removed. Zero remnants across the codebase:
- No `httpSecret`, `HTTP_SECRET`, `checkAuth`, `authToken` in server source
- No `vg-auth-token`, `Bearer`, `getServerToken`, `authHeaders` in extension source
- No token generation in init script
- Tests updated: auth tests expect success (not 401)

### Scan 7: General Dead Code

**Removed:**
- `getServerToken()` in constants.js - auth remnant returning null
- `authHeaders()` in constants.js - auth remnant returning empty object

**Noted but kept (test-only exports):**
- `resetServerCache` - used in routing tests
- `resetConsoleCollector` - used in collector tests
- `scoreElement`, `classifyTier` - used in salience tests
- `detectFramework` - used in component-collector tests

**Noted but kept (unfinished features):**
- `sendAnnotationCreate/Update/Delete` in ws-client.js - WebSocket annotation sync, not yet wired to sidebar
- `startJourney/stopJourney/isJourneyActive` in journey-recorder.js - journey recording, not yet wired to sidebar
- `startShortcuts/stopShortcuts/isShortcutsActive` in keyboard-shortcuts.js - keyboard nav, not yet wired
- `captureSubtree` in subtree-capture.js - subtree capture, not yet used
- Several annotate.js helpers (`selectorSegment`, `buildBreadcrumb`, `getRole`, `buildMetaLine`, `bestSelector`) - utility functions available for future use

### Scan 8: Edge Case Test Coverage

982 tests total (329 server + 653 extension). Key edge case coverage:

**Routing (46 tests):**
- file:// URLs on Linux, macOS, Windows
- WSL Chrome format (`file://wsl.localhost/Ubuntu/...`)
- WSL Firefox format (`file://///wsl.localhost/...`)
- localhost normalization (127.0.0.1, 0.0.0.0, [::1])
- Port-only fallback matching
- Multiple servers on different ports
- URL pattern matching for localhost and remote URLs

**Security (10 tests):**
- POST without auth succeeds (ADR-010)
- Invalid JSON rejected
- Missing metadata rejected
- Path traversal in URL sanitized
- Path traversal in snapshot filename sanitized
- Oversized payload rejected

**No gaps identified** - all critical paths covered.

## Related Documents

- [ADR-010: Auth Removal](../decisions/ADR-010-remove-http-auth-beta.md)
- [BUG-011: Token Mismatch](../bugs/BUG-011-init-token-mismatch.md)
- [BUG-012: Steering Override](../bugs/BUG-012-steering-overrides-prompt-scope.md)
- [Prompt Engineering Audit](./prompt-engineering-audit-2026-04-15.md)
