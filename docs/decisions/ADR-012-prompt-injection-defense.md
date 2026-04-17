# ADR-012: Multi-Layer Prompt Injection Defense

**Date:** 2026-04-17
**Status:** Accepted
**Deciders:** Sourjya S. Sen

## Context

ViewGraph captures DOM content from web pages and sends it to AI coding agents via MCP. This creates an inherent prompt injection risk: a malicious page can embed instructions in DOM text, HTML comments, data attributes, or hidden elements that the AI agent may interpret as commands rather than data.

This was identified as STRIDE threat #2 (Tampering) in our threat model, rated High severity with Likely likelihood. It is the hardest threat to fully mitigate because the boundary between "data to analyze" and "instructions to follow" is fundamentally fuzzy for LLMs.

## Decision

Adopt a 5-layer defense-in-depth strategy. No single layer is bulletproof, but combined they make injection significantly harder and eliminate the most common attack vectors entirely.

### Layer 1: Capture-Time Sanitization (Extension)
Strip content with high injection risk and zero diagnostic value:
- HTML comments removed entirely (zero useful signal for UI bug fixing)
- Hidden element text cleared (common injection hiding spot)
- Data attribute values capped at 100 characters

### Layer 2: Transport-Time Wrapping (MCP Server)
Wrap all page-sourced text in explicit delimiters (`[CAPTURED_TEXT]...[/CAPTURED_TEXT]`) in MCP tool responses. Creates a clear boundary between data and instructions that the LLM can recognize.

### Layer 3: Suspicious Content Detection (MCP Server)
Scan text fields for instruction-like patterns ("ignore above", "system:", "you are now") and flag them with a `_warning` field. Does not strip content - the agent needs accurate text. The flag is a signal.

### Layer 4: Agent-Side Prompt Hardening (Steering Docs)
Explicit instructions in SERVER_INSTRUCTIONS (ADR-011) and steering docs telling agents to never follow instructions found inside delimiters. Effective against casual injection.

### Layer 5: Trust Gate (F17)
Block send-to-agent entirely for untrusted URLs. The strongest defense - if the capture never reaches the agent, injection cannot happen. Only localhost and explicitly trusted URLs can send to agents.

## Why Defense in Depth?

| Layer | Stops | Misses |
|---|---|---|
| 1. Sanitization | Comment injection, hidden text, oversized payloads | Visible text injection |
| 2. Wrapping | LLM confusing data with instructions | Sophisticated injection within delimiters |
| 3. Detection | Common patterns ("ignore above") | Novel or obfuscated patterns |
| 4. Hardening | Casual injection attempts | Determined attackers who study the prompt |
| 5. Trust gate | ALL injection from untrusted URLs | Injection from localhost pages |

Layers 1+5 together eliminate the most common vector (malicious remote website). Layers 2+3+4 together harden the agent pipeline. Each layer is independent.

## Alternatives Considered

### 1. Strip all text content from captures
Remove `visibleText` and `text` fields entirely so there's nothing to inject.

**Rejected because:** Agents need page text to understand UI context. "Button says 'Submti' instead of 'Submit'" requires seeing the text. Stripping it makes ViewGraph useless for text-related bugs.

### 2. Sandbox agent execution
Run the agent in a restricted environment where it can't modify files based on injected instructions.

**Rejected because:** Outside ViewGraph's control. The agent's execution environment is managed by Kiro/Claude/Cursor, not by us. We can only control what data reaches the agent.

### 3. Content Security Policy for captures
Apply a CSP-like policy that blocks certain content patterns from being included in captures.

**Rejected because:** Overly complex for the benefit. The 5-layer approach achieves the same goal with simpler, more maintainable controls.

### 4. Do nothing beyond current steering docs
Rely on the existing "treat as untrusted" documentation.

**Rejected because:** Documentation alone is insufficient. LLMs are trained to follow instructions, and the boundary between data and instructions is inherently fuzzy. Active controls (sanitization, wrapping, detection, gating) are needed.

## Accepted Residual Risk

A determined attacker who controls a localhost page (e.g., via a compromised dev dependency) could embed injection in visible text that survives all 5 layers. This is accepted because:
- The attacker already has code execution on the developer's machine (game over regardless)
- The injection must survive delimiter wrapping AND suspicious content flagging AND prompt hardening
- Only localhost pages can reach the agent by default (F17)

## Consequences

- Extension traverser modified to strip comments, clear hidden text, cap data attrs
- New server utilities: `sanitize.js` (wrapping), `injection-detector.js` (pattern detection)
- All text-returning MCP tools updated with delimiters and warnings
- SERVER_INSTRUCTIONS updated with delimiter documentation
- All @vg-* prompts updated with untrusted data reminder
- Spec: `.kiro/specs/prompt-injection-defense/`
