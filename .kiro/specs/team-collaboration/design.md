# Team Collaboration - Design

## Architecture

```
User A (extension)              ViewGraph Server              User B (extension)
  |                                |                              |
  |  ws: join(sessionCode)         |                              |
  |  -----------------------------> |                              |
  |                                |  ws: join(sessionCode)        |
  |                                | <-----------------------------|
  |                                |                              |
  |  ws: annotation:create         |                              |
  |  -----------------------------> |                              |
  |                                |  ws: annotation:create        |
  |                                | ----------------------------->|
  |                                |                              |
  |                                |  ws: annotation:update        |
  |                                | <-----------------------------|
  |  ws: annotation:update         |                              |
  | <------------------------------|                              |
```

The server acts as a relay. It does not interpret annotation content - it broadcasts messages to all participants in the same session.

## WebSocket Protocol Extensions

New message types added to the existing ws-server.js/ws-client.js:

### Client -> Server

| Type | Payload | Description |
|---|---|---|
| `session:create` | `{ url }` | Create a new shared session, returns session code |
| `session:join` | `{ code, name }` | Join an existing session |
| `session:leave` | `{}` | Leave the current session |
| `annotation:create` | `{ annotation }` | Broadcast new annotation to session |
| `annotation:update` | `{ id, changes }` | Broadcast annotation edit |
| `annotation:delete` | `{ id }` | Broadcast annotation deletion |
| `annotation:resolve` | `{ id }` | Broadcast annotation resolution |
| `cursor:move` | `{ x, y }` | Broadcast cursor position (throttled to 10Hz) |

### Server -> Client

| Type | Payload | Description |
|---|---|---|
| `session:created` | `{ code, participants }` | Session created, here's the code |
| `session:joined` | `{ participants }` | You joined, here are current participants |
| `session:participant:joined` | `{ name, color }` | Someone joined |
| `session:participant:left` | `{ name }` | Someone left |
| `annotation:*` | (same as client) | Relayed to all other participants |
| `cursor:move` | `{ name, color, x, y }` | Relayed cursor position |

## Session State (Server-Side, In-Memory)

```javascript
sessions = Map<code, {
  url: string,
  createdAt: Date,
  participants: Map<wsConnection, { name, color }>,
  lastActivity: Date,
}>
```

- Sessions are in-memory only - lost on server restart (acceptable for ephemeral collaboration)
- Garbage collected after 1 hour of inactivity
- Session codes: 6 alphanumeric chars generated with `crypto.randomBytes(4).toString('base36').slice(0, 6)`

## Participant Colors

Assigned from a fixed palette on join order:

```javascript
const PARTICIPANT_COLORS = [
  '#6366f1', // indigo (first joiner)
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#8b5cf6', // violet
  '#0ea5e9', // sky
  '#f97316', // orange
  '#14b8a6', // teal
  '#ec4899', // pink
  '#84cc16', // lime
];
```

## Sidebar UI Changes

### Share Button

Added to the sidebar header (between gear and collapse):
- Icon: link/chain icon
- Click: creates session, shows code in a copyable badge
- If already in session: shows "Leave" option

### Session Banner

When in a shared session, a banner appears below the primary tabs:
```
[Session: ABC123] [2 participants] [Leave]
```

### Participant Indicators

- Each annotation entry shows a small colored dot matching the author's color
- Annotation markers on the page use the author's color instead of the default palette

## File Layout

```
server/
  src/
    session-relay.js         Session state + WebSocket relay logic
extension/
  lib/
    collaboration.js         Session join/create/leave, message handling
    cursor-overlay.js        Remote cursor rendering (colored dots)
```
