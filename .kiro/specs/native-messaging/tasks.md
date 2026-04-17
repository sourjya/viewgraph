# F11: Native Messaging Transport - Tasks

## Phase 1: Native messaging host
- [ ] 1. Create `server/native-host.js` with stdin/stdout length-prefixed JSON protocol
- [ ] 2. Implement message routing: info, health, capture, captures:list, config:get, config:put
- [ ] 3. Implement chunking for messages > 900KB
- [ ] 4. Write tests for length-prefix read/write, message routing, chunking
- [ ] 5. Create `com.viewgraph.host.json` manifest template for Chrome and Firefox

## Phase 2: Host registration
- [ ] 6. Add native messaging host registration to `viewgraph-init`
- [ ] 7. Detect browser (Chrome/Firefox) and write manifest to correct directory
- [ ] 8. Include extension ID in manifest (Chrome requires it)
- [ ] 9. Write tests for manifest generation and path detection

## Phase 3: Extension transport abstraction
- [ ] 10. Create `extension/lib/transport.js` with `isNativeAvailable()`, `send()`, `query()`
- [ ] 11. Implement feature detection: try native messaging, cache result, fall back to HTTP
- [ ] 12. Implement `sendCapture()`, `fetchInfo()`, `fetchCaptures()`, `fetchConfig()`, `updateConfig()`
- [ ] 13. Write tests for transport abstraction: native path, HTTP fallback, caching

## Phase 4: Extension migration
- [ ] 14. Migrate `annotation-sidebar.js` server calls to transport.js
- [ ] 15. Migrate `sidebar/captures.js` to transport.js
- [ ] 16. Migrate `sidebar/sync.js` to transport.js
- [ ] 17. Migrate `sidebar/settings.js` to transport.js
- [ ] 18. Migrate `sidebar/inspect.js` to transport.js
- [ ] 19. Migrate `constants.js` discoverServer to use transport.js for health/info checks
- [ ] 20. Write integration tests: full flow through native messaging

## Phase 5: Server dual-transport
- [ ] 21. Add native messaging stdin handler to server alongside HTTP receiver
- [ ] 22. Both transports feed into same capture pipeline and indexer
- [ ] 23. Server broadcasts events to both native messaging and WebSocket clients
- [ ] 24. Write tests for dual-transport message handling

## Phase 6: Documentation and polish
- [ ] 25. Update installation docs with native messaging setup
- [ ] 26. Update security docs with STRIDE threat elimination table
- [ ] 27. Update threat model page
- [ ] 28. Update CHANGELOG
