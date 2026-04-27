# Idea: Chrome DevTools MCP for Extension Development Testing

**Created:** 2026-04-28
**Status:** Active
**Category:** Development Workflow

## Context

The Chrome DevTools MCP server gives the agent direct control over a Chrome browser - navigation, DOM inspection, screenshots, console, network, input simulation. Combined with ViewGraph's MCP tools, this creates a self-serve QA loop where the agent can test extension behavior without the user manually describing what they see.

## Capability Inventory

### Page Control

| Tool | What it does | Testing use |
|---|---|---|
| `navigate_page` | Go to URL, back, forward, reload | Load test pages, trigger SPA navigation, test extension on different origins |
| `new_page` | Open new tab | Test multi-tab behavior, isolated contexts |
| `close_page` | Close a tab | Test cleanup, teardown, memory leaks |
| `list_pages` / `select_page` | Switch between tabs | Verify extension state across tabs |
| `resize_page` | Change viewport dimensions | Test responsive sidebar, breakpoint detection |
| `emulate` | Dark mode, viewport, CPU throttle, network throttle | Test extension under constrained conditions |

### DOM Inspection

| Tool | What it does | Testing use |
|---|---|---|
| `take_snapshot` | A11y tree snapshot with UIDs | Read sidebar DOM, verify element structure, find interactive elements |
| `take_screenshot` | PNG of page or element | Visual inspection of sidebar, tooltips, overlays, annotation highlights |
| `evaluate_script` | Run JS in page context | Query extension-injected DOM, check CSS variables, read shadow DOM |

### Interaction

| Tool | What it does | Testing use |
|---|---|---|
| `click` | Click an element by UID | Click sidebar buttons, annotation pins, export actions |
| `fill` | Type into input/select | Fill annotation comments, search fields |
| `fill_form` | Batch fill multiple inputs | Test forms with multiple fields |
| `hover` | Hover over element | Test tooltip display, hover states |
| `press_key` | Keyboard input | Test shortcuts (Escape to close, Tab navigation) |
| `type_text` | Type into focused element | Free-form text input |
| `drag` | Drag element onto another | Test drag interactions if any |
| `upload_file` | File upload via input | Test screenshot/file import if applicable |

### Diagnostics

| Tool | What it does | Testing use |
|---|---|---|
| `list_console_messages` | All console output | Catch extension errors, warnings, debug logs |
| `get_console_message` | Single message detail | Inspect stack traces from extension errors |
| `list_network_requests` | All network activity | Verify WebSocket connections, server discovery, capture uploads |
| `get_network_request` | Request/response detail | Inspect WebSocket frames, API payloads, HMAC headers |

### Performance

| Tool | What it does | Testing use |
|---|---|---|
| `performance_start_trace` | Record performance trace | Measure extension impact on page load, capture time |
| `performance_stop_trace` | Stop and analyze trace | Find extension-caused jank, long tasks |
| `performance_analyze_insight` | Deep dive on specific insight | Diagnose LCP/CLS impact from sidebar injection |
| `lighthouse_audit` | A11y, SEO, best practices | Verify extension doesn't degrade page scores |
| `take_memory_snapshot` | Heap snapshot | Detect memory leaks from sidebar lifecycle |

### Dialog Handling

| Tool | What it does | Testing use |
|---|---|---|
| `handle_dialog` | Accept/dismiss browser dialogs | Handle any dialogs triggered during testing |
| `wait_for` | Wait for text to appear | Wait for sidebar to load, status messages to appear |

## Limitations

Things the agent CANNOT do via DevTools MCP:

- **Click browser toolbar icons** - the extension's toolbar button is in browser chrome, outside page scope. User must click it to activate the sidebar.
- **Access extension popup** - the popup is a separate extension page, not part of the tab's DOM.
- **Read extension storage directly** - `chrome.storage` is not accessible from page context. Use `evaluate_script` to read DOM state instead.
- **Trigger extension keyboard shortcuts** - global extension shortcuts (e.g., Alt+V) are handled by the browser, not the page.
- **Access service worker logs** - the background script's console is separate from the page console.
- **Cross-origin iframe content** - same limitation as ViewGraph captures.

## Use Cases

### 1. Post-Fix Verification Loop

```
Agent fixes code -> User reloads extension -> User clicks toolbar icon ->
Agent takes screenshot -> Agent reads console -> Agent confirms fix or iterates
```

### 2. Sidebar UI Inspection

Once the sidebar is injected (user clicks toolbar icon), the agent can:
- `take_snapshot` to read the full sidebar DOM tree
- `take_screenshot` of specific sidebar elements
- `click` buttons, `fill` inputs, verify state changes
- Check console for errors after each interaction

### 3. Capture Quality Validation

After user triggers a capture:
- Read the capture via ViewGraph MCP tools
- Compare against live page via DevTools snapshot
- Verify enrichment data (network, console, breakpoints) matches reality

### 4. Responsive Testing

- `resize_page` to various breakpoints
- `take_screenshot` at each size
- Verify sidebar adapts, doesn't overflow, doesn't break page layout

### 5. Performance Regression Detection

- `performance_start_trace` before activating extension
- User activates extension
- `performance_stop_trace` and analyze
- Check for long tasks, layout shifts, excessive DOM mutations

### 6. Network Connectivity Testing

- `list_network_requests` filtered to WebSocket/fetch
- Verify server discovery requests go to correct ports
- Check HMAC auth headers are present
- Monitor WebSocket frame exchange

### 7. Console Error Monitoring

- `list_console_messages` with `types: ["error", "warn"]` after each action
- Catch null reference errors from async lifecycle issues
- Detect deprecation warnings, CSP violations

## Integration with ViewGraph MCP

The two tool sets complement each other:

| Need | DevTools MCP | ViewGraph MCP |
|---|---|---|
| See what's on screen now | `take_snapshot`, `take_screenshot` | - |
| See structured DOM data | - | `get_capture`, `get_page_summary` |
| Interact with the page | `click`, `fill`, `press_key` | - |
| Read annotations | - | `get_annotations`, `get_unresolved` |
| Check a11y | `lighthouse_audit` | `audit_accessibility` |
| Compare before/after | - | `compare_captures`, `compare_screenshots` |
| Monitor errors | `list_console_messages` | Console data in captures |
| Monitor network | `list_network_requests` | Network data in captures |

## Next Steps

- Use this workflow during active extension development
- Document recurring test patterns as they emerge
- Consider automating common checks into a pre-release checklist
