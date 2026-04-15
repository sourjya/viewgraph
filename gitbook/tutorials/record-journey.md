# Record a User Journey

Capture multi-step flows as annotated sessions for journey analysis.

<!-- TODO: Embed video V7 when recorded -->

## Prerequisites

- ViewGraph extension installed and connected
- MCP server running

## Step 1: Start recording

Open the first page of the flow. Click the ViewGraph icon to open the sidebar. In the Inspect tab, click **Record Flow**.

## Step 2: Navigate and capture each step

At each step in the journey:
1. Add a **step note** describing where you are (e.g., "Cart page", "Shipping form", "Payment")
2. Click **Send to Agent** to capture the current state
3. Navigate to the next page

Each capture becomes a step in the session with:
- The page URL and title
- Full DOM capture
- Your step note
- Timestamp

## Step 3: Stop recording

Click **Stop** in the Inspect tab when the journey is complete.

## Step 4: Analyze the journey

Tell your agent:

```
Analyze the recorded journey for issues
```

The agent calls `analyze_journey` which checks:
- **Accessibility regressions** between steps (e.g., step 2 lost focus management)
- **Missing elements** that were present in earlier steps (e.g., order total disappeared)
- **Structural changes** between pages that might indicate bugs
- **Network failures** at any step

## Step 5: Visualize the flow

```
Visualize the user journey as a flow diagram
```

The agent calls `visualize_flow` and generates a Mermaid state machine diagram showing:
- Each page as a state
- Navigation between pages as transitions
- Element count changes between steps
- Issues flagged at each step

## Use cases

### Checkout flow testing
Record: cart -> shipping -> payment -> confirmation. Detect if the order total disappears between steps or if the step indicator breaks.

### Onboarding flow review
Record: signup -> email verification -> profile setup -> dashboard. Check that each step is accessible and no elements are missing.

### Multi-page regression
Record the same journey before and after a deploy. Compare the sessions to catch regressions across the flow, not just on individual pages.

## Session data

Each session stores:
- Session ID and name
- Step sequence with timestamps
- Per-step captures (full DOM + enrichment)
- Step notes
- URL changes between steps

The agent can query sessions via `list_sessions` and `get_session` to inspect any recorded journey.
