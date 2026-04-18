# Threat Model

ViewGraph undergoes structured threat modeling using the [STRIDE methodology](https://en.wikipedia.org/wiki/STRIDE_%28security%29). This page summarizes the findings and how our roadmap addresses them.

For the full engineering report, see [GitHub](https://github.com/sourjya/viewgraph/blob/main/docs/architecture/threat-model-stride.md).

## Scope

ViewGraph is a localhost-only developer tool. The threat model assumes a trusted developer on their own machine. The primary risks come from other software on the same machine - specifically malicious websites and browser extensions - interacting with the localhost server.

## Relevant Threat Actors

| Actor | Priority | Why relevant |
|---|---|---|
| Malicious Website | #1 | Any page the developer visits can make requests to localhost. Can inject content into DOM that gets captured. |
| Supply Chain (npm) | #2 | Compromised npm package runs with full Node.js permissions via `npx`. |
| Rogue Browser Extension | #3 | Another extension with broad permissions can read DOM, access chrome.storage, and reach localhost. |
| Local Malware | #4 | Already on the machine - can read capture files and interact with the server. Outside our threat boundary. |

Nation-state actors, organized crime, hacktivists, and insider threats were evaluated and marked not relevant for a localhost developer tool.

## Identified Threats

| # | STRIDE | Threat | Severity | Current Status |
|---|---|---|---|---|
| 1 | Spoofing | Malicious page POSTs fake captures to localhost | High | Mitigated (format validation) |
| 2 | Tampering | Prompt injection via captured DOM content | High | Mitigated (untrusted data docs, Shadow DOM) |
| 3 | Info Disclosure | Page JavaScript reads /info and /captures endpoints | Medium | Open (localhost accessible) |
| 4 | Denial of Service | Flood POST /captures to exhaust disk | Low | Mitigated (5MB payload limit) |
| 5 | Tampering | Path traversal on capture file writes | High | Mitigated (path validation, directory scoping) |
| 6 | Elevation of Privilege | npm supply chain compromise | Critical | Mitigated (2FA, package-lock) |
| 7 | Repudiation | No audit trail for capture submissions | Low | Open (no caller identity) |
| 8 | Info Disclosure | Sensitive page content persisted in captures | Medium | Mitigated (.gitignore, user controls capture) |

## Existing Mitigations

| Control | What it protects | Status |
|---|---|---|
| Localhost-only binding (127.0.0.1) | Prevents remote network access | Implemented |
| Payload size limits (5MB/10MB) | Prevents disk exhaustion | Implemented |
| Path traversal prevention | Prevents arbitrary file writes | Implemented |
| Shadow DOM isolation | Prevents page CSS/JS from affecting extension UI | Implemented |
| innerHTML elimination | Reduces XSS surface in extension | Implemented (45 -> 6 usages) |
| Untrusted data documentation | Warns agents not to follow instructions in captures | Implemented |
| URL trust indicator (F17) | Blocks send-to-agent for untrusted URLs, shield icon | Implemented |
| Prompt injection defense (F19) | 5-layer: sanitize, wrap, detect, harden, gate | Implemented |
| Server instructions (F18) | Agents receive workflow + security guidance on connection | Implemented |
| Session status tool (F18) | Agents get context-aware next-step suggestions | Implemented |
| npm 2FA + package-lock | Reduces supply chain risk | Implemented |
| .gitignore for .viewgraph/ | Prevents accidental commit of captures | Implemented |
| Config schema validation (SRR-001) | PUT /config only accepts whitelisted keys | Implemented |
| Auto-learn localhost-only (SRR-001) | URL patterns only auto-learned from localhost/file:// | Implemented |
| Security response headers (SRR-001) | nosniff + no-store on all responses | Implemented |
| WebSocket limits (SRR-001) | 1MB max payload, 10 concurrent connections | Implemented |
| Error sanitization (SRR-001) | Error responses never leak filesystem paths | Implemented |
| Closed shadow DOM (SRR-001) | Host page JS cannot access sidebar content | Implemented |
| 16 CodeQL fixes | Path validation, URL parsing, crypto.randomUUID, CI permissions | Implemented |

## Roadmap: How We're Addressing Remaining Risks

### F17: URL Trust Indicator (implemented)

Blocks send-to-agent for untrusted URLs. A shield icon in the sidebar header shows the trust level:

| URL type | Shield | Send to Agent |
|---|---|---|
| localhost, 127.0.0.1, file:// | Green (trusted) | Enabled |
| Matches `trustedPatterns` in config | Blue (configured) | Enabled |
| Remote/unknown URL | Amber (untrusted) | Blocked - "Add to trusted" or "Send anyway" |
| No server connected | Green/Amber (based on URL) | Hidden (no server) |

The shield is always visible regardless of server connection. "Add to trusted" writes the hostname to `config.json` permanently. "Send anyway" is a one-time override flagged in capture metadata.

**Mitigates:** Threats #1 (spoofing), #2 (prompt injection), #8 (sensitive data)

### Native Messaging (in progress - Phase 1-5 complete)

Replaces localhost HTTP with Chrome native messaging for extension-to-server communication. Provides cryptographic caller identity - only the registered ViewGraph extension can talk to the server.

| # | Threat | Before (localhost HTTP) | After (native messaging) |
|---|---|---|---|
| 1 | Spoofing | Open - any page JS can POST | Eliminated - Chrome verifies extension ID |
| 3 | Info Disclosure | Open - any page JS can GET | Eliminated - no HTTP endpoints to probe |
| 4 | DoS | Mitigated - payload limits | Eliminated - no network listener |
| 7 | Repudiation | Open - any process can submit | Eliminated - cryptographic caller identity |

**Result:** 5 of 8 threats eliminated. The 3 that remain (prompt injection, supply chain, sensitive data) are inherent to the product, not the transport.

### F18: MCP Agent Guidance (partially implemented)

Server instructions (Phase 1) and session status tool (Phase 2) are shipped. Agents receive workflow guidance, security warnings, and performance tips on connection. The `get_session_status` tool gives agents a quick overview of available captures, annotations, and baselines with actionable suggestions.

**Mitigates:** Threat #2 (prompt injection) - agents are warned at the protocol level to treat capture data as untrusted.

## Prompt Injection Defense (Implemented)

ViewGraph uses a 5-layer defense-in-depth strategy against prompt injection (threat #2). See [ADR-012](https://github.com/sourjya/viewgraph/blob/main/docs/decisions/ADR-012-prompt-injection-defense.md) for the full rationale.

| Layer | What it does | Status |
|---|---|---|
| 1. Capture sanitization | Strips HTML comments, clears hidden element text, caps data attribute values | Implemented |
| 2. Transport wrapping | Wraps text in `[CAPTURED_TEXT]` delimiters in MCP tool responses | Implemented |
| 3. Suspicious detection | Flags text containing "ignore above", "system:", etc. with `_warning` field | Implemented |
| 4. Prompt hardening | Steering docs + server instructions warn agents to never follow delimited text | Implemented |
| 5. Trust gate (F17) | Blocks send-to-agent for untrusted URLs entirely | Implemented |

## What You Can Do Today

1. **Use ViewGraph on localhost only** - the default configuration. All threats from malicious websites are limited to what localhost JavaScript can do.
2. **Don't commit .viewgraph/** - already in .gitignore by default. Captures may contain visible page text.
3. **Pin your npm version** - use `npm install -g @viewgraph/core` instead of `npx` if your security policy requires version pinning. See [Security - Install Method Comparison](security.md#install-method-security-comparison).
4. **Review captures before sharing** - if you export captures (Copy MD, Download Report), review them for sensitive content before pasting into tickets or sharing with others.
