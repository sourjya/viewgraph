# F17: URL Trust Indicator

## Requirements

### Trust Classification
1. Every page URL must be classified into one of three trust levels:
   - **Trusted** (green shield): `localhost`, `127.0.0.1`, `0.0.0.0`, `[::1]`, `file://` URLs
   - **Configured** (blue shield): URLs matching a pattern in `.viewgraph/config.json` `urlPatterns` or `trustedPatterns` array
   - **Untrusted** (amber shield): All other URLs (remote sites, unknown hosts)

2. Trust classification must use the same URL normalization as `discoverServer` (127.0.0.1 -> localhost, etc.).

3. The classification must be computed client-side in the extension using the current page URL and cached server config. No server round-trip required for classification.

### Visual Indicator
4. A shield icon must appear in the sidebar header, next to the existing connection status dot.
5. The shield must show the trust level with color and tooltip:
   - Green shield + "Trusted - localhost" tooltip
   - Blue shield + "Configured - matches pattern: staging.myapp.com" tooltip
   - Amber shield + "Untrusted - remote URL" tooltip
6. The shield must update when the user navigates to a different page (sidebar stays open across navigations in some SPA scenarios).

### Send Gate
7. The "Send to Agent" button must be disabled (grayed out) when the current URL is untrusted.
8. Clicking a disabled Send button must show an inline message explaining why and offering two actions:
   - **"Add [hostname] to trusted patterns"** - writes the pattern to config.json via `PUT /config` and re-enables Send
   - **"Send anyway"** - one-time override for this capture only, with a visual warning that the capture contains untrusted content
9. The "Send anyway" override must add a `trustOverride: true` flag to the capture metadata so the agent can see the user consciously chose to send untrusted content.

### What Is NOT Blocked
10. "Copy MD" and "Download Report" must always work regardless of trust level. These export to the user's clipboard/disk, not to an AI agent.
11. The Inspect tab must always work. Diagnostics (network, console, landmarks) are useful on any page.
12. Annotations must always work. Users can annotate any page for manual export.
13. "Send to Agent" from the suggestion checklist (F15) must follow the same trust gate.

### Configuration
14. Trusted patterns are stored in `.viewgraph/config.json` under a `trustedPatterns` array, separate from `urlPatterns` (which control server routing, not trust).
15. Localhost URLs are always trusted regardless of config. This cannot be disabled.
16. The "Add to trusted" action must persist across sessions (written to config.json, not just chrome.storage).

### Edge Cases
17. If no MCP server is connected, trust level is irrelevant (Send is already disabled for offline).
18. If the page URL changes while the sidebar is open (SPA navigation), the trust badge must update.
19. WSL file paths (`file://wsl.localhost/...`) must be classified as trusted.
20. Custom hostnames resolving to localhost (e.g., `myapp.local:3000`) are untrusted unless explicitly added to trustedPatterns. Port-only matching from urlPatterns does NOT confer trust.

## Justification

### Threat Model Reference
This feature directly mitigates 3 of the 8 STRIDE threats identified in the ViewGraph threat model:

| Threat | How F17 mitigates it |
|---|---|
| #1 Spoofing (fake captures from malicious page) | Untrusted page captures never reach the agent |
| #2 Prompt injection (malicious DOM content) | Untrusted DOM content blocked from agent pipeline |
| #8 Sensitive data in captures (accidental) | Amber warning alerts user they're capturing a production/remote site |

### Why Not Just Warn?
A warning is ignorable. A disabled button with an explicit override creates a conscious decision point. The user must either add the URL to trusted patterns (permanent, auditable) or click "Send anyway" (one-time, flagged in metadata). Both are deliberate actions, not accidental clicks.

### Why Separate trustedPatterns from urlPatterns?
`urlPatterns` control which server handles a URL (routing). `trustedPatterns` control whether captures can be sent to an agent (security). A URL can be routed to a server (for diagnostics, manual export) without being trusted for agent consumption. Conflating the two would force users to choose between "no server connection" and "full agent access" with no middle ground.
