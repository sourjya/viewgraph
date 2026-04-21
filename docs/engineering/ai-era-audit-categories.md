# Research: Codebase Audit Categories for AI-Assisted Development

## Research Objectives

ViewGraph is built almost entirely with AI coding agents (Kiro CLI). Our existing review system covers security (SRR) and maintainability (MRR), but 2026 research shows AI-generated code has specific, predictable failure patterns that differ from human-written bugs - 1.7x more bugs overall, 75% more logic errors, 8x more I/O performance problems (CodeRabbit, 470 repos). We need to identify which additional audit categories would catch these AI-specific failure patterns before they reach production, and design review prompts that can be run periodically (like our existing tiered security reviews) to maintain code health as the codebase grows. The goal is a comprehensive audit framework that accounts for both traditional human mistakes and the systematic biases of LLM-generated code.

---

## Category 1: AI Hallucination Audit

AI models hallucinate package names, API methods, and function signatures with high confidence. Code compiles and looks correct but references things that don't exist or work differently than assumed.

**What to check:**
- Imports referencing packages not in package.json / package-lock.json
- Function calls with wrong argument count or types vs actual source
- Deprecated API usage (model trained on old docs)
- References to browser APIs that don't exist or have different signatures
- Tautological tests - tests that assert what the code does, not what it should do (AI writes tests that pass by definition)

**ViewGraph-specific risks:**
- MCP SDK API changes between versions
- Chrome extension API differences between MV2/MV3
- WXT framework API assumptions
- Node.js API deprecations (e.g., `url.parse` vs `new URL()`)

---

## Category 2: Correctness Audit

AI produces code that handles the happy path correctly but fails on edge cases. Logic errors are 75% more common in AI-generated code than human-written code.

**What to check:**
- Empty array/object inputs to functions that assume non-empty
- Null/undefined propagation through call chains
- Off-by-one errors in loops, slices, array indexing
- Async race conditions (missing await, uncancelled operations, TOCTOU)
- Type coercion bugs (== vs ===, string vs number comparisons)
- Boolean logic errors (De Morgan's law violations, inverted conditions)
- Boundary values (0, -1, MAX_SAFE_INTEGER, empty string)

**ViewGraph-specific risks:**
- DOM element references that become null after sidebar destroy (async lifecycle guards)
- MutationObserver callbacks firing after disconnect
- Port scan race conditions in discovery.js
- Config file read/write TOCTOU in auto-learn

---

## Category 3: Performance Audit

AI-generated I/O operations have roughly 8x higher performance problems than human-written code. Models optimize for readability, not performance.

**What to check:**
- N+1 patterns (loop with fetch/query inside)
- Unnecessary iterations (filter+map+find where one pass suffices)
- Unbounded data structures (arrays/maps that grow without limit)
- Synchronous operations blocking the event loop (readFileSync in hot paths)
- Missing debounce/throttle on high-frequency event handlers
- Memory leaks (event listeners never removed, closures holding large objects)
- Redundant DOM queries (querySelector in a loop)
- getComputedStyle in MutationObserver callbacks (layout thrashing)

**ViewGraph-specific risks:**
- Transient collector calling getComputedStyle on every mutation
- Enrichment collectors running sequentially instead of parallel
- Large capture JSON serialization blocking the content script
- Port scan timeout accumulation (4 ports x 1s each = 4s worst case)

---

## Category 4: Consistency Audit

AI has no memory of your codebase between prompts. It will reimplement existing utilities, use different patterns for the same operation, and ignore established conventions.

**What to check:**
- Duplicated logic that exists in shared modules (getSelector, addHover, etc.)
- Inconsistent error handling (some functions throw, some return null, some log)
- Inconsistent logging (console.log vs console.error vs structured)
- Naming convention violations (camelCase vs snake_case, verb-first functions)
- Import path inconsistencies (relative vs alias, deep vs barrel)
- Different patterns for the same operation across similar modules
- Inconsistent JSDoc coverage (some functions documented, similar ones not)

**ViewGraph-specific risks:**
- 6 collectors each implementing their own getSelector
- 40 hover listener pairs instead of shared addHover helper
- 5 different _notice wordings across MCP tools
- Mixed use of COLOR constants vs hardcoded hex values

---

## Category 5: Configuration Audit

AI inlines values that should be configurable. Every magic number and string literal is a potential production incident when the environment changes.

**What to check:**
- Hardcoded URLs, ports, hostnames
- Magic numbers without named constants or comments
- Timeout/retry values inline instead of centralized
- Feature flags hardcoded instead of config-driven
- Environment-specific values (paths, URLs) in source code
- Default values that differ between similar functions

**ViewGraph-specific risks:**
- Port range 9876-9879 hardcoded in multiple files
- 30-second retention, 100-entry buffer limits in transient collector
- 5MB payload limit in multiple places
- Toast heuristic thresholds (z-index > 100, lifespan < 500ms)

---

## Category 6: Cleanup Audit

AI starts operations but rarely cleans them up. This is the most consistent AI failure pattern - code that works in isolation but leaks resources in a long-running application.

**What to check:**
- addEventListener without corresponding removeEventListener
- setInterval/setTimeout without clearInterval/clearTimeout
- MutationObserver/ResizeObserver/IntersectionObserver without disconnect
- AbortController signals missing on fetch calls
- DOM elements created but never removed on destroy
- Module-level state not reset on lifecycle transitions
- WebSocket connections not closed on shutdown
- File handles not closed after read/write

**ViewGraph-specific risks:**
- Sidebar modules creating DOM elements in shadow root without cleanup
- Transport polling intervals surviving sidebar destroy
- Transient observer buffer holding references to removed DOM nodes
- Session key file handle leaks on rapid server restart

---

## Next Steps

1. Deep research with specialized GenAI research tools on each category
2. Analyze ViewGraph codebase against each category to quantify current exposure
3. Design review prompts (similar to review-code-security.md) for each category
4. Determine review frequency: per-commit (T1), feature-complete (T2), or sprint-end (T3)
5. Integrate into the existing tiered review system (.kiro/hooks/)

## Sources

- CodeRabbit study (2026): 470 repos, AI code produces 1.7x more bugs
- University of Waterloo (2026): 25% error rate across Copilot, Cursor, Claude Code
- Fordel Studios: 12-point AI code review checklist
- sumvec.ai: AI Coding Protocol - systematic failure patterns
- ViewGraph bug pattern analysis: docs/engineering/bug-pattern-analysis.md
