# Team Collaboration - Shared Annotation Sessions - Requirements

## Overview

Enable multiple team members to annotate the same page simultaneously, seeing each other's annotations in real-time. A reviewer and a developer can look at the same page, add annotations, discuss via comments, and resolve issues together.

## Problem

Today, ViewGraph is single-user. A tester annotates, exports to markdown or sends to an agent. If a developer wants to discuss an annotation, they have to read the markdown, open the page, and try to find the same element. There's no shared context.

## Functional Requirements

### FR-1: Shared Sessions

- FR-1.1: A user can create a shared session from the sidebar ("Share" button)
- FR-1.2: Creating a session generates a short session code (6 alphanumeric chars)
- FR-1.3: Another user joins by entering the session code in their sidebar
- FR-1.4: Both users must be on the same URL (or the joiner is prompted to navigate)
- FR-1.5: Session supports 2-10 concurrent participants
- FR-1.6: Sessions expire after 1 hour of inactivity

### FR-2: Real-Time Sync

- FR-2.1: Annotations created by any participant appear on all participants' sidebars within 1 second
- FR-2.2: Annotation edits (comment, severity, category) sync in real-time
- FR-2.3: Annotation resolution syncs in real-time
- FR-2.4: Each participant's annotations are color-coded by author (distinct marker colors)
- FR-2.5: Cursor position of other participants shown as colored dots on the page (optional, can be disabled)

### FR-3: Participant Awareness

- FR-3.1: Sidebar header shows participant count and avatars (initials in colored circles)
- FR-3.2: Each annotation shows the author's name/initials
- FR-3.3: "Who's here" tooltip on participant count shows names and connection status

### FR-4: Conflict Resolution

- FR-4.1: Last-write-wins for annotation edits (no CRDT complexity needed for this use case)
- FR-4.2: Simultaneous creation of annotations on the same element results in two separate annotations (no merge)
- FR-4.3: Delete by any participant removes for all (with undo option)

### FR-5: Export

- FR-5.1: "Send to Agent" sends all annotations from all participants (attributed)
- FR-5.2: "Copy MD" includes author attribution per annotation
- FR-5.3: Session history preserved in capture metadata

### FR-6: Security

- FR-6.1: Session codes are random, not guessable (6 chars = 2 billion combinations)
- FR-6.2: Session data transits through the ViewGraph server WebSocket (already authenticated)
- FR-6.3: No session data stored on server after session ends
- FR-6.4: Participants must have the ViewGraph extension installed (no web viewer)

## Non-Functional Requirements

- NFR-1: Sync latency under 500ms on localhost, under 2s over internet
- NFR-2: Works with existing WebSocket infrastructure (ws-server.js, ws-client.js)
- NFR-3: No additional server dependencies
- NFR-4: Graceful degradation: if WebSocket disconnects, local annotations are preserved
