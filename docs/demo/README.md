# ViewGraph Demo - Find and Fix UI Bugs

A self-contained demo that walks you through the full ViewGraph workflow:
annotate bugs in the browser, send to Kiro, and watch them get fixed.

**Time:** 5 minutes
**Prerequisites:** ViewGraph extension installed, MCP server running (see [Getting Started](../../README.md#getting-started) if first time)

## Setup

### 1. Start the MCP server

From the ViewGraph project root:

```bash
npm run dev:server
```

You should see:

```
[viewgraph] ViewGraph MCP Server v0.1.0
[viewgraph] Captures dir: /path/to/viewgraph/.viewgraph/captures
[viewgraph] HTTP secret: <token>
```

### 2. Configure the extension

Open the ViewGraph extension options and set:
- **Server URL:** `http://localhost:9876`
- **Secret:** the token from step 1 (or leave blank if `VIEWGRAPH_HTTP_SECRET` is not set)

### 3. Verify connection

Click the ViewGraph icon in Chrome. The footer should show a green dot with "MCP connected".

## The Demo

### Step 1: Open the buggy page

Open `docs/demo/index.html` in Chrome:

```
file:///path/to/viewgraph/docs/demo/index.html
```

You'll see a "TaskFlow" login page. It looks decent at first glance, but has 8 planted bugs.

### Step 2: Run automated audits

In Kiro, ask:

```
Capture the demo page and run an accessibility audit
```

Kiro will use `audit_accessibility` and `find_missing_testids` to find several issues automatically:
- Missing alt text on the logo
- Empty aria-label on the login button
- Missing form label
- Missing data-testid on the email input

### Step 3: Annotate visual issues

Click **Annotate** in the ViewGraph popup. Now find the bugs that automated tools miss:

1. **Click the heading** "Welcome back" - it's too large (42px). Add comment: "Font size too large for a login card - reduce to 28px"

2. **Click the password field** - type something and notice it's visible (type="text"). Add comment: "Password field shows plain text - change to type=password"

3. **Click the card** - notice the top-right corner has no border-radius. Add comment: "Top-right corner missing border-radius - should be 16px"

4. **Click the "Create one" link** in the footer - it's nearly invisible. Add comment: "Link color fails contrast - change to #818cf8"

### Step 4: Send to Kiro

Click **Send** in the sidebar. All annotations bundle with the full DOM capture and push to Kiro via MCP.

### Step 5: Ask Kiro to fix

In Kiro, say:

```
Look at the annotations on the demo page and fix all the issues in docs/demo/index.html
```

Kiro has the full DOM context from the capture plus your comments. It will:
- Read the annotations via `get_annotations`
- Understand each issue from your comments + the element details
- Edit `docs/demo/index.html` to fix all 8 bugs

### Step 6: Verify

Reload the page in Chrome. All issues should be fixed. Run the audit again to confirm.

## The 8 Planted Bugs

| # | Bug | Type | How to find |
|---|---|---|---|
| 1 | Logo `<img>` missing `alt` text | Accessibility | `audit_accessibility` |
| 2 | Password field `type="text"` | Security/UX | Manual annotation |
| 3 | Login button empty `aria-label=""` | Accessibility | `audit_accessibility` |
| 4 | Email input missing `data-testid` | Testing | `find_missing_testids` |
| 5 | Card `border-radius: 16px 0 16px 16px` | Visual | Manual annotation |
| 6 | Footer link color `#475569` fails contrast | Accessibility | Manual annotation |
| 7 | `<form>` missing `aria-label` | Accessibility | `audit_accessibility` |
| 8 | Heading `font-size: 42px` too large | Visual | Manual annotation |

## Alternative: Tester Workflow (No Kiro)

Don't have Kiro set up? You can still use the demo:

1. Open the page, click **Annotate**, find the bugs
2. Click **Copy MD** - paste the markdown report into a GitHub issue
3. Click **Report** - download a ZIP with markdown + screenshots

The extension works standalone for anyone who needs to document UI issues.
