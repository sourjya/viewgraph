# Monorepo Workflows

ViewGraph works naturally with monorepos where frontend and backend live in the same repository. When an AI agent can see both the UI problem (via ViewGraph capture) and the backend code (via the same repo), it can trace issues across the full stack in a single conversation.

---

## Why Monorepos and Agentic AI Are a Natural Fit

Monorepos keep all related code in one place. AI coding agents work best when they can see the full picture. These two ideas reinforce each other:

| Monorepo property | Why it helps agents |
|---|---|
| **Single context window** | The agent can read frontend components, API routes, database schemas, and shared types without switching repositories |
| **Shared types and contracts** | When a TypeScript interface changes, the agent sees both the API response shape and the React component that consumes it |
| **Atomic changes** | The agent can fix a backend validation bug and the frontend error message in one commit |
| **Consistent tooling** | One test runner, one linter, one CI pipeline - the agent doesn't need to learn different setups per repo |

ViewGraph adds the missing piece: **the agent can now see the rendered UI too**, not just the source code. A monorepo gives the agent access to all the code. ViewGraph gives it access to what that code produces in the browser.

---

## Example Monorepo Structure

```
my-app/
├── .viewgraph/              # ViewGraph captures and config
│   ├── captures/            # DOM snapshots from the browser
│   └── config.json          # URL patterns (e.g., localhost:3000)
├── packages/
│   ├── api/                 # Backend - Express/FastAPI/Go/etc.
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── models/
│   │   └── package.json
│   ├── web/                 # Frontend - React/Vue/Svelte/etc.
│   │   ├── src/
│   │   │   ├── features/
│   │   │   ├── shared/
│   │   │   └── services/    # API client layer
│   │   └── package.json
│   └── shared/              # Shared types, constants, validation
│       ├── types/
│       └── validators/
├── package.json             # Workspace root
└── .kiro/
    └── settings/
        └── mcp.json         # ViewGraph MCP server config
```

ViewGraph sits at the repo root. The `.viewgraph/` directory captures DOM snapshots from the running frontend. The agent reads those captures via MCP tools and has direct file access to both `packages/api/` and `packages/web/` to make fixes.

---

## Use Cases: Frontend Problems with Backend Causes

These are real scenarios where the UI symptom and the code fix are in different packages. ViewGraph captures the symptom; the agent traces it to the root cause.

### 1. API returns wrong data - UI shows stale values

**What you see:** A dashboard card shows "0 active users" when there should be hundreds.

**What you do:** Click the card, annotate: "This should show the real count, not zero."

**What the agent does:**
1. Reads the annotation via `get_annotations` - sees the element, its selector, its visible text "0"
2. Calls `find_source` - finds `packages/web/src/features/dashboard/StatsCard.tsx`
3. Reads the component - sees it calls `GET /api/stats/active-users`
4. Reads `packages/api/src/routes/stats.js` - finds the query is filtering by `created_at` instead of `last_active_at`
5. Fixes the backend query and the frontend displays correctly on reload

The annotation was on a frontend element. The fix was in a backend route. One repo, one agent conversation.

### 2. Form validation mismatch - server rejects what the client allows

**What you see:** A form submits successfully on the frontend but shows a generic "Something went wrong" error.

**What you do:** Open the Inspect tab - the **Network** section shows a `422 Unprocessable Entity` on `POST /api/users`. Click the submit button, annotate: "Server rejects this form but no useful error shown."

**What the agent does:**
1. Reads the Network section data (attached to the annotation via the diagnostic `+` button)
2. Finds the API route in `packages/api/src/routes/users.js` - server requires `phone` field
3. Finds the form in `packages/web/src/features/auth/RegisterForm.tsx` - no phone field exists
4. Checks `packages/shared/validators/user.ts` - the shared schema has `phone` as required
5. Adds the phone field to the frontend form, matching the shared validation schema

ViewGraph's Network section in the Inspect tab captured the 422 response. The agent traced it from UI to API to shared schema.

### 3. Missing data in a list - backend pagination bug

**What you see:** A table shows 10 items but the header says "Showing 10 of 247."

**What you do:** Annotate the table: "Only first page loads. Pagination seems broken - next button does nothing."

**What the agent does:**
1. Calls `find_source` on the table element - finds `packages/web/src/features/products/ProductTable.tsx`
2. Reads the component - the "Next" button calls `fetchProducts({ page: currentPage + 1 })`
3. Reads `packages/api/src/routes/products.js` - the `page` query param is parsed but the SQL query ignores it (hardcoded `LIMIT 10 OFFSET 0`)
4. Fixes the backend to use `OFFSET (page - 1) * limit`

### 4. Broken real-time update - WebSocket event not reaching the UI

**What you see:** A notification bell shows "0" but you know there are unread notifications.

**What you do:** Annotate the bell icon: "Notification count stuck at 0. Should update in real-time."

**What the agent does:**
1. Finds the component via `find_source` - `packages/web/src/shared/components/NotificationBell.tsx`
2. Reads it - listens for `ws.on('notification:new')` events
3. Reads `packages/api/src/services/notifications.js` - the event is emitted as `notification:created` (name mismatch)
4. Fixes the event name in either the backend emitter or the frontend listener

### 5. Accessibility issue caused by backend data shape

**What you see:** `@vg-audit` flags "Image missing alt text" on product images.

**What the agent does:**
1. Finds the component - `packages/web/src/features/products/ProductCard.tsx`
2. Reads it - `<img src={product.imageUrl} alt={product.altText} />`
3. The `altText` field is `null` for all products
4. Reads `packages/api/src/routes/products.js` - the query doesn't select `alt_text` from the database
5. Adds `alt_text` to the SELECT query and maps it to the response

The a11y issue was in the HTML. The root cause was a missing database column in the API query.

---

## Use Cases: Pure Frontend Problems in Monorepos

ViewGraph's core workflow - annotate, send, fix - works the same in a monorepo as in a standalone frontend project. The agent just has more context available.

### Design consistency across packages

If your monorepo has multiple frontend packages (e.g., `packages/web` and `packages/admin`):

1. Capture a page from each app
2. Ask the agent: `@vg-diff` or use `check_consistency` across captures
3. The agent finds style differences - button padding is 12px in web but 8px in admin
4. Since both packages are in the same repo, the agent can fix both in one commit

### Shared component bugs

A bug in `packages/shared/components/Button.tsx` affects every app that imports it. Annotate the broken button on any page - the agent traces it via `find_source` to the shared package and fixes it once for all consumers.

---

## Setup

ViewGraph setup for a monorepo is the same as any project:

```bash
# From the monorepo root
npx @viewgraph/core
```

Or add to your MCP config:

```json
{
  "mcpServers": {
    "viewgraph": { "command": "npx", "args": ["-y", "@viewgraph/core"] }
  }
}
```

The server auto-creates `.viewgraph/` at the repo root and learns the URL pattern from the first capture. If your monorepo runs multiple frontends on different ports, see [Multi-Project Setup](../getting-started/multi-project.md) for URL pattern routing.

---

## What ViewGraph Does NOT Do

To be clear about boundaries:

- ViewGraph does **not** capture backend logs, database queries, or server-side state. It captures the DOM - what the browser renders.
- The agent traces backend issues by reading source code in the repo, not by observing the backend at runtime.
- Network errors visible in the Inspect tab come from the browser's Performance API (HTTP status codes, failed fetches) - not from server-side logging.
- ViewGraph works with **any backend language** (Python, Go, Java, Ruby, PHP, Rust) because it only interacts with the HTML the browser receives. The backend technology is irrelevant to the capture.
