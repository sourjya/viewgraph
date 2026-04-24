# Threat Model

ViewGraph undergoes structured threat modeling using the [STRIDE methodology](https://en.wikipedia.org/wiki/STRIDE_%28security%29). This page summarizes the findings and how our roadmap addresses them.

For the full engineering report, see [GitHub](https://github.com/sourjya/viewgraph/blob/main/docs/architecture/threat-model-stride.md).

{% hint style="info" %}
**Latest threat model** (April 24, 2026): [Full STRIDE report](https://github.com/sourjya/viewgraph/blob/main/docs/architecture/threat-model-2026-04-24.md) | [Threat Composer JSON](https://github.com/sourjya/viewgraph/blob/main/docs/architecture/threat-model-2026-04-24.json) - 9 threats, 9 mitigations, all linked. 6 security reviews passed.
{% endhint %}

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
| Auto-learn config merge (SRR-002) | Preserves existing config keys on auto-learn | Implemented |
| URL hostname matching (SRR-002) | Trust gate matches hostname+port only, not full URL | Implemented |
| classifyTrust hostname matching (SRR-003) | Prevents query param trust gate bypass | Implemented |
| Stdin close fallback (SRR-003) | 60-min fallback prevents orphaned processes | Implemented |
| Native messaging config whitelist (SRR-004) | updateConfig uses shared ALLOWED_CONFIG_KEYS | Implemented |
| Request ID matching (BUG-022) | Captures carry requestId for exact request matching | Implemented |
| Transport centralization | All server communication via transport.js/discovery.js | Implemented |

## Security Review History

| Review | Date | Tier | Findings | Key Fixes |
|---|---|---|---|---|
| [SRR-001](https://github.com/sourjya/viewgraph/blob/main/docs/security/SRR-001-2026-04-18.md) | Apr 18 | T2 | 2H, 5M, 4L | Config whitelist, shadow DOM closed, WS limits |
| [SRR-002](https://github.com/sourjya/viewgraph/blob/main/docs/security/SRR-002-2026-04-19-T2.md) | Apr 19 | T2 | 1H, 3M, 2L | Auto-learn merge, hostname matching |
| [SRR-003](https://github.com/sourjya/viewgraph/blob/main/docs/security/SRR-003-2026-04-19-T2.md) | Apr 19 | T2 | 0H, 2M, 3L | Trust gate bypass, orphan prevention |
| [SRR-004](https://github.com/sourjya/viewgraph/blob/main/docs/security/SRR-004-2026-04-21-T3.md) | Apr 21 | T3 | 2H, 5M, 4L | Native messaging whitelist, full codebase audit |
| [SRR-005](https://github.com/sourjya/viewgraph/blob/main/docs/security/SRR-005-2026-04-24-T2.md) | Apr 24 | T2 | 1H, 2M, 1L | HMAC timing fix, JSON guard, challenge limit |

## Security Indicators

ViewGraph has two security indicators that protect different aspects of the workflow:

| | Trust Shield (F17) | Auth Lock (F21) |
|---|---|---|
| **What it shows** | Is this PAGE trustworthy? | Is the SERVER connection authenticated? |
| **Protects against** | Sending sensitive page data to the agent | Other processes injecting fake captures |
| **States** | 🟢 Trusted (localhost) / 🔵 Configured / 🟠 Untrusted | 🔒 Signed / 🔓 Unsigned |
| **User action** | Blocks "Send to Agent" on untrusted pages | Informational only (auto-detected) |
| **Location** | Footer, next to status dot | Status dot tooltip |

The trust shield answers: "Should I send this page's content to my AI agent?" The auth lock answers: "Is the pipe between extension and server secure?" Both can be active simultaneously.

## Communication Security

Three layers of transport security, from strongest to fallback:

| Layer | How it works | Status |
|---|---|---|
| **Native Messaging** (ADR-016) | Browser-enforced extension identity. No ports, no network. | Code complete, not yet default |
| **HMAC-Signed HTTP** (ADR-015) | File-based secret, replay-proof signatures, 30s timestamp window | **Implemented (F21)** |
| **Unsigned HTTP** (ADR-010) | Any local process can connect. Localhost-only binding. | Default (beta) |

| Concern | Unsigned HTTP | HMAC-Signed HTTP | Native Messaging |
|---|---|---|---|
| Port exposure | 9876-9879 visible | 9876-9879 visible | No ports open |
| Authentication | None | HMAC signature | Browser enforces extension ID |
| Injection by other apps | Possible | Requires session key | Impossible |
| Replay attacks | Possible | 30s timestamp window | N/A |
| Process discovery | Port scan reveals | Port scan reveals | Invisible |

### Known Limitation: HMAC Key in Handshake

The HMAC handshake sends the session key in the `/handshake` response. This means any localhost process that calls `/handshake` can obtain the key and sign requests. HMAC does NOT prevent a determined local attacker - it prevents casual/accidental injection and provides:

- **Replay protection** - 30-second timestamp window, each signature is unique
- **Session tracking** - sessionId ties requests to a specific handshake
- **Tamper detection** - signature covers method + path + timestamp + body hash

What it doesn't prevent: a malicious localhost process that actively performs the handshake first. **Native messaging (ADR-016) is the real fix** - it eliminates HTTP entirely and uses browser-enforced extension identity.

This is documented as accepted risk S4-2 in [SRR-005](https://github.com/sourjya/viewgraph/blob/main/docs/security/SRR-005-2026-04-24-T2.md).

### Native Messaging Status

Native messaging is now auto-configured by `viewgraph-init` (F22). The extension auto-detects the best available security mode:

```
viewgraph-init → registers native messaging host
Extension opens → tries native messaging → falls back to HMAC → falls back to unsigned
```

**Platform compatibility:**

| Platform | Native Messaging | HMAC-Signed HTTP | Notes |
|---|---|---|---|
| **Linux** (native) | ✅ Works | ✅ Fallback | `viewgraph-init` registers host automatically |
| **macOS** | ✅ Works | ✅ Fallback | `viewgraph-init` registers host automatically |
| **Windows** (native Node.js) | ✅ Works | ✅ Fallback | `viewgraph-init` registers host automatically |
| **WSL** (Linux in Windows) | ❌ Not supported | ✅ **Primary** | Chrome runs on Windows, server in WSL - different OS. `viewgraph-init` detects WSL and skips native messaging. |
| **npx only** (no viewgraph-init) | ❌ Not registered | ✅ **Primary** | No host manifest installed. HMAC handshake is automatic. |

{% hint style="warning" %}
**WSL users:** Native messaging requires the browser and server to be on the same OS. Since Chrome runs on Windows but the ViewGraph server runs inside WSL, native messaging cannot work. HMAC-signed HTTP is used instead - this still provides replay protection and session tracking.
{% endhint %}

**What `viewgraph-init` does:**
1. Detects your OS and installed browsers
2. Writes native messaging host manifests for Chrome and Firefox
3. Points to a wrapper script that launches the server with `--native-host`
4. On WSL: skips registration, shows HMAC as the active security mode

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

### Native Messaging (code complete, not yet default - ADR-016)

Replaces localhost HTTP with Chrome/Firefox native messaging for extension-to-server communication. Browser enforces that only the registered ViewGraph extension can communicate - no ports, no auth needed.

**Current state:** Implementation exists (F11 Phase 1-5) but requires `--native-host` flag. Not the default path. ADR-016 plans auto-detection: extension tries native messaging first, falls back to HTTP if unavailable. `viewgraph-init` will register the native host manifest automatically.

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
