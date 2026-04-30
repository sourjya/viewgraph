# ViewGraph Demo Video Script (v1)

**Target length:** 3:20 (200 seconds)
**Format:** Screen recording with voiceover
**Resolution:** 1920x1080, browser at ~1400px wide

---

## Scene 1: Title Card

**Duration:** 5 seconds
**Visual:** ViewGraph logo centered on dark background (#0f172a). Tagline fades in below.

| Element | Detail |
|---|---|
| Logo | `docs/logos/viewgraph-logo.png`, 420px wide |
| Tagline | "The UI context layer for agentic coding." - white, 20px, Inter |
| Animation | Logo fades in (0.5s), tagline fades in (0.5s delay) |

---

## Scene 2: Problem Statement

**Duration:** 20 seconds
**Visual:** Split screen - left side shows a broken login page (the demo page with oversized heading, sharp corners, low-contrast footer). Right side shows a chat window where someone types a long paragraph trying to describe the visual bugs.

**On-screen actions:**
1. Show the broken demo page full-screen for 3 seconds
2. Cut to a chat window. Someone types: *"The heading is way too big, maybe 56px? And the card corners are wrong - two of them are sharp and two are rounded. Also the footer text is really hard to read, I think it's a contrast issue..."*
3. The typing trails off with "..." - it's tedious

**Voiceover:**
> AI coding agents can write code. But they can't see your UI. When something looks wrong, you're stuck describing it in words - pixel values, color codes, CSS properties. ViewGraph changes that.

**Key visual to capture:** The contrast between the broken UI and the painful text description.

---

## Scene 3: Install

**Duration:** 30 seconds
**Visual:** Two clean steps, each shown for ~12 seconds.

**On-screen actions:**

*Step 1 (12s):*
1. Open Chrome Web Store page for ViewGraph Capture
2. Click "Add to Chrome"
3. Extension icon appears in toolbar
4. Brief flash of the Firefox Add-ons page too (show both badges)

*Step 2 (12s):*
1. Open `~/.kiro/settings/mcp.json` in an editor
2. Type (or paste) the config:
   ```json
   {
     "mcpServers": {
       "viewgraph": { "command": "npx", "args": ["-y", "@viewgraph/core"] }
     }
   }
   ```
3. Save the file

*Closing beat (6s):*
- Show logos: Kiro, Claude Code, Cursor, Windsurf, Cline, Aider

**Voiceover:**
> Two steps. First - install the browser extension from the Chrome Web Store or Firefox Add-ons. Second - add one JSON block to your agent's MCP config. That's it. No install commands, no build step. Works with Kiro, Claude Code, Cursor, and any MCP-compatible agent.

**Key visual to capture:** The JSON config block - clean and minimal.

---

## Scene 4: Annotate

**Duration:** 60 seconds
**Visual:** Browser showing `docs/demo/index.html` - the TaskFlow login page with 8 planted bugs.

**On-screen actions:**

*Open sidebar (5s):*
1. Click the **ViewGraph** icon in the browser toolbar
2. Sidebar slides open on the right
3. Elements highlight on hover with blue outlines

*Annotate the heading (15s):*
1. Hover over the "Welcome back" heading - it's visibly oversized at 56px
2. Click it - annotation panel opens
3. Type in comment field: `heading too large`
4. Click the severity dropdown, select **Major**
5. Click **Save** (checkmark)

*Annotate the form (15s):*
1. Hold **Shift** and drag a rectangle around the login form area
2. Region highlights in blue
3. Type in comment field: `form not centered, card corners broken`
4. Severity: **Major**
5. Click **Save**

*Annotate low-contrast text (10s):*
1. Scroll to footer
2. Click the gray "Forgot your password?" link
3. Type: `can barely read this - contrast too low`
4. Severity: **Minor**
5. Click **Save**

*Show Inspect tab (15s):*
1. Click the **Inspect** tab in the sidebar
2. Show the **Console** section - warnings from the page
3. Show the **Network** section - any failed requests
4. Pause on the summary: element count, viewport size, framework detected
5. Click back to **Review** tab - show the 3 annotations listed with severity badges

**Voiceover:**
> Open the demo page and click the ViewGraph icon. The sidebar opens and elements highlight as you hover. Click the heading - it's way too big. Type "heading too large" and set severity to major. Now shift-drag across the form to select a region. "Form not centered, card corners broken." Click the footer link - "can barely read this." Three annotations in thirty seconds. And check the Inspect tab - ViewGraph also captures console warnings and network errors automatically. No copy-pasting from DevTools.

**Key visual to capture:** The annotation panel with comment + severity dropdown. The Inspect tab showing console/network data.

---

## Scene 5: Send to Agent

**Duration:** 30 seconds
**Visual:** Split between browser sidebar and Kiro terminal/chat.

**On-screen actions:**

*Send (5s):*
1. In the sidebar, click **Send to Agent**
2. Button shows green checkmark - "Sent!"

*Agent reads annotations (10s):*
1. Switch to Kiro
2. Type: `Fix the annotations from the latest ViewGraph capture`
3. Agent calls `get_annotations` - show the tool call in the chat
4. Agent reads: 3 annotations with comments, severity, element selectors, computed styles

*Agent finds source (5s):*
1. Agent calls `find_source` with the heading's selector
2. Result: `docs/demo/index.html, line 72` - the `font-size: 56px` rule

*Agent fixes (10s):*
1. Agent edits `index.html`:
   - Changes `font-size: 56px` to `font-size: 28px`
   - Fixes `border-radius: 16px 0px 0px 16px` to `border-radius: 16px`
   - Changes footer link color from `#475569` to `#94a3b8`
2. Agent calls `resolve_annotation` for each fix - show the green checkmarks

**Voiceover:**
> Click "Send to Agent." Switch to Kiro and say "fix the annotations." The agent reads your annotations - not just the comments, but the full DOM context. Element selectors, computed styles, bounding boxes. It calls find_source to locate the exact file and line. Then it fixes the CSS - heading size, border radius, contrast. Three bugs, three fixes, zero back-and-forth.

**Key visual to capture:** The `get_annotations` tool call showing structured data. The `find_source` result with file path and line number.

---

## Scene 6: Verify

**Duration:** 20 seconds
**Visual:** Kiro chat + browser side by side.

**On-screen actions:**

1. Agent calls `request_capture` - "Verify fixes on the demo page"
2. Browser sidebar shows the capture request notification
3. User clicks **Accept** in the sidebar
4. Page re-captures automatically
5. Agent calls `compare_captures` between the old and new capture
6. Results show:
   - `h1 font-size: 56px → 28px` ✅
   - `border-radius: fixed` ✅
   - `footer link contrast: improved` ✅
7. All three annotations show green resolved checkmarks in the sidebar

**Voiceover:**
> The agent verifies its own work. It requests a fresh capture, compares before and after, and confirms every fix landed. Green checkmarks across the board.

**Key visual to capture:** The compare_captures diff output showing before/after values. Green checkmarks in the sidebar.

---

## Scene 7: For Testers

**Duration:** 20 seconds
**Visual:** Browser sidebar export options.

**On-screen actions:**

1. Show the sidebar with annotations
2. Click **Copy MD** button
3. Switch to a Jira ticket (or text editor) - paste
4. Show the markdown: element details, computed styles, viewport info, network status
5. Quick cut: click **Download Report**
6. Show the ZIP contents: `report.md`, `screenshot.png`, `network.json`, `console.json`

**Voiceover:**
> No AI agent? No problem. Click "Copy Markdown" and paste a structured bug report straight into Jira or GitHub - element details, styles, viewport, network errors, all included. Or download a full report as a ZIP with screenshots and raw data. Same tool, same workflow - you choose where the output goes.

**Key visual to capture:** The markdown pasted into Jira with structured element data. The ZIP file contents.

---

## Scene 8: Closing

**Duration:** 15 seconds
**Visual:** Dark background. ViewGraph logo centered. Badges below.

**On-screen actions:**
1. ViewGraph logo fades in
2. Tagline: "See what your agent can't."
3. Three badges appear in a row:
   - Chrome Web Store (blue)
   - Firefox Add-ons (orange)
   - npm @viewgraph/core (red)
4. Text below: "Install in 5 minutes - chaoslabz.gitbook.io/viewgraph"

**Voiceover:**
> ViewGraph. See what your agent can't. Install the extension, add one line of config, and give your AI agent eyes. Five minutes to set up. Works with any MCP agent. Links in the description.

**Key visual to capture:** The three install badges. The URL.

---

## Production Notes

**Total runtime:** ~3:20

| Scene | Duration | Running total |
|---|---|---|
| Title card | 5s | 0:05 |
| Problem statement | 20s | 0:25 |
| Install | 30s | 0:55 |
| Annotate | 60s | 1:55 |
| Send to Agent | 30s | 2:25 |
| Verify | 20s | 2:45 |
| For testers | 20s | 3:05 |
| Closing | 15s | 3:20 |

**Voiceover tone:** Conversational, direct. Not corporate. Talk like you're showing a colleague something cool, not pitching to investors.

**Music:** Low-key ambient/electronic. Subtle - never competes with voiceover. Rises slightly during the closing.

**Transitions:** Simple cuts between scenes. No flashy transitions. Brief fade-to-black between major sections (problem → install, annotate → send).

**Screen recording tips:**
- Use a clean Chrome profile with minimal extensions visible
- Set browser zoom to 100%, font size default
- Close all other tabs
- Use a dark VS Code / Kiro theme to match the demo page aesthetic
- Record at 60fps, export at 30fps for smooth playback
- Cursor highlight plugin recommended so viewers can follow mouse movements
