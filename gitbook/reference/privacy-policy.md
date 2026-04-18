# Privacy Policy

**ViewGraph Browser Extension**
Last updated: April 19, 2026

## Summary

ViewGraph does not collect, transmit, or store any personal data. All captured data stays on your local machine.

## What Data the Extension Accesses

When you click the ViewGraph toolbar icon on a page, the extension reads:

- DOM structure (HTML elements, attributes, computed styles)
- Element bounding boxes and layout information
- Accessibility attributes (ARIA roles, labels)
- Network request status (success/failure, not request bodies)
- Console errors and warnings
- Client-side storage keys and non-sensitive values (localStorage, sessionStorage, cookies). Values that look like tokens, passwords, or keys are automatically redacted and never captured.
- CSS custom properties (variables defined on the page)
- Your annotations (comments you type, severity, category)

## Where Data Goes

All captured data is sent **only to a server running on your local machine** (localhost, ports 9876-9879). The extension never contacts external servers, cloud services, or third-party APIs.

The data flow:
```
Browser extension -> localhost MCP server -> .viewgraph/captures/ on your disk
```

## What We Do NOT Collect

- No personal information
- No browsing history
- No cookies or authentication tokens from visited pages (storage keys are captured but sensitive values like tokens, passwords, and API keys are automatically redacted)
- No request or response bodies
- No data sent to external servers
- No analytics or telemetry
- No user accounts or registration

## Data Storage

- User preferences (capture settings, auto-capture toggle) are stored in `chrome.storage.local` and `chrome.storage.sync`, both local to your browser
- DOM captures are stored as JSON files in your project's `.viewgraph/captures/` directory
- Screenshots are stored alongside captures on your local disk

## Third-Party Services

ViewGraph uses no third-party services, analytics, or tracking. The extension is fully self-contained.

## Permissions

| Permission | Why it's needed |
|---|---|
| `activeTab` | Access the current tab's DOM when you click the ViewGraph icon |
| `storage` | Save your preferences locally across browser sessions |
| `scripting` | Inject the capture script into the active tab on your click |

## Open Source

ViewGraph is open source (AGPL-3.0). You can inspect the full source code at [github.com/sourjya/viewgraph](https://github.com/sourjya/viewgraph).

## Contact

For privacy questions, open an issue on [GitHub](https://github.com/sourjya/viewgraph/issues).

## Changes

If this policy changes, the updated version will be posted here with a new "last updated" date.
