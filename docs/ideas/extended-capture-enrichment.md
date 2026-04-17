# Idea: Extended Capture Enrichment - LLM Blind Spots

**Created:** 2026-04-17
**Status:** Evaluate
**Category:** Enrichment Collectors

## Context

ViewGraph captures DOM structure, styles, network, console, breakpoints, components, and more.
But several categories of runtime state remain invisible to the coding LLM, limiting its ability
to diagnose root causes.

## Proposed Enrichment Collectors

### Tier 1: Easy, High Impact

| Collector | What it captures | Why it matters |
|---|---|---|
| **Client-side storage** | localStorage, sessionStorage key/value pairs, first-party cookies | App state that drives UI: auth tokens, feature flags, user prefs, consent state, A/B assignments. Agent can't diagnose "why is the UI showing X" without this. |
| **CSS custom properties** | `--` variables from `:root` and component scopes | Agent sees computed `color: #3b82f6` but not `var(--primary)`. Can't fix design tokens, only hardcoded values. |

### Tier 2: Medium Effort, High Impact

| Collector | What it captures | Why it matters |
|---|---|---|
| **Error boundary state** | React components in error fallback mode (fiber tree `didCatch`) | Page looks "fine" but a component tree is in fallback. Agent doesn't know a crash happened. |
| **Service worker state** | Active controller, cache names, offline mode | Agent can't tell if page shows cached vs fresh content. Stale data bugs are invisible. |
| **Build/bundle metadata** | Script src paths, sourcemap presence, dev vs prod detection | Agent doesn't know build context. Helps diagnose "works in dev, broken in prod". |

### Tier 3: Hard, Niche Impact

| Collector | What it captures | Why it matters |
|---|---|---|
| **CSS cascade origin** | Which stylesheet/rule set each computed style (Tailwind, inline, theme) | Agent knows final style but not where it came from. Hard - requires CSSOM walk. |
| **iframe content** | Cross-origin embedded content | Payment forms, auth flows, embedded widgets. Browser security blocks this by design. |
| **Canvas/WebGL content** | What's rendered on canvas elements | Charts, maps, games. Would need library-specific hooks (Chart.js, D3, etc.). |

## Evaluation Criteria

- Does it change the agent's ability to fix a bug without back-and-forth?
- Can it be captured without performance impact (<50ms)?
- Does it work cross-browser (Chrome + Firefox)?
- Privacy implications (storage may contain tokens - need redaction strategy)

## Privacy Considerations

- Storage snapshot must redact values matching token/key patterns
- Cookie capture limited to first-party, names only for sensitive cookies
- Opt-in via capture settings (like existing screenshot toggle)

## Next Steps

Evaluate Tier 1 collectors first. If validated, promote to spec under `.kiro/specs/`.
