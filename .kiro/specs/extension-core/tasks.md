# Extension Core - Tasks

## Tasks

### Phase 1: DOM Traversal + Serialization

- [ ] 1.1 Build `lib/traverser.js` - DOM walker that extracts element data
- [ ] 1.2 Build `lib/salience.js` - scoring and tier classification
- [ ] 1.3 Build `lib/serializer.js` - assemble ViewGraph v2.1 JSON from traversal data
- [ ] 1.4 Build `entrypoints/content.js` - content script that runs traverser + serializer

### Phase 2: Popup UI

- [ ] 2.1 Build popup HTML with Capture Page button and status area
- [ ] 2.2 Build popup.js - send capture message, show progress/result

### Phase 3: Background Orchestration

- [ ] 3.1 Build background.js - inject content script, receive data, take screenshot
- [ ] 3.2 Add HTTP push to localhost:9876/captures
- [ ] 3.3 Add screenshot capture via captureVisibleTab

### Phase 4: Test + Ship

- [ ] 4.1 Manual test in Chrome with WXT dev server
- [ ] 4.2 Verify capture appears in MCP server and is queryable
- [ ] 4.3 Update changelog, docs, merge to main
