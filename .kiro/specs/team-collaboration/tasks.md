# Team Collaboration - Tasks

### Task 1: Server session relay
- [ ] Create `server/src/session-relay.js`
- [ ] Session state: create, join, leave, garbage collect (1hr inactivity)
- [ ] Session code generation (6 alphanumeric chars)
- [ ] Participant tracking with assigned colors
- [ ] Message relay: broadcast to all participants except sender
- [ ] Tests: create/join/leave lifecycle, relay broadcasts, GC after timeout

### Task 2: WebSocket protocol extensions
- [ ] Add session:create, session:join, session:leave message types to ws-server.js
- [ ] Add annotation:create/update/delete/resolve relay through session
- [ ] Add cursor:move relay (throttled server-side to 10Hz per participant)
- [ ] Tests: message routing, participant join/leave notifications

### Task 3: Extension collaboration module
- [ ] Create `extension/lib/collaboration.js`
- [ ] createSession(url) - sends session:create, returns code
- [ ] joinSession(code, name) - sends session:join, receives participant list
- [ ] leaveSession() - sends session:leave, cleans up
- [ ] Message handlers: merge remote annotations into local state
- [ ] Tests: create/join/leave, remote annotation merge, conflict handling

### Task 4: Sidebar UI - share button and session banner
- [ ] Add share/link icon to sidebar header
- [ ] Click creates session, shows copyable code badge
- [ ] Session banner below primary tabs with participant count and leave button
- [ ] Participant colored dots on annotation entries
- [ ] Tests: UI renders session state correctly

### Task 5: Cursor overlay (optional)
- [ ] Create `extension/lib/cursor-overlay.js`
- [ ] Render colored dots for remote participant cursors
- [ ] Throttle outgoing cursor:move to 10Hz
- [ ] Toggle in settings (off by default - can be noisy)
- [ ] Tests: cursor rendering, throttle rate

### Task 6: Export attribution
- [ ] Include author name/color in annotation metadata
- [ ] Markdown export shows author per annotation
- [ ] Capture JSON includes session metadata (code, participants)
