# Network & Console Capture - Tasks

## Phase 1: Network Collector (TDD)

- [x] 1.1 Write tests for collectNetworkState (mock Performance API)
- [x] 1.2 Implement network-collector.js
- [x] 1.3 Write tests for URL truncation and entry cap

## Phase 2: Console Collector (TDD)

- [x] 2.1 Write tests for installConsoleInterceptor and getConsoleState
- [x] 2.2 Implement console-collector.js
- [x] 2.3 Write tests for message truncation and entry cap

## Phase 3: Integration

- [x] 3.1 Update serializer to accept and include network/console sections
- [x] 3.2 Write serializer tests for new sections
- [x] 3.3 Update server parseCapture to extract network/console
- [x] 3.4 Update server parseSummary to include network/console counts
- [x] 3.5 Write server parser tests for new sections
- [x] 3.6 Wire collectors into content script capture flow

## Phase 4: Finalize

- [ ] 4.1 Run full test suite
- [ ] 4.2 Build extension
- [ ] 4.3 Commit, merge to main
