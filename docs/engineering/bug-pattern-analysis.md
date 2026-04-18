# Bug Pattern Analysis

Recurring patterns from bug fixes to inform steering rules.

## Pattern 1: Full Re-render on Partial State Change

**Bugs:** BUG-019 (suggestions panel closes on add), trash button stale closure

**Pattern:** A callback modifies one piece of state then calls `refresh()` which re-renders the entire sidebar. Components that should preserve their visual state (expanded/collapsed, scroll position) get reset.

**Steering rule candidate:** Callbacks that modify state should refresh only the affected section. Use skip flags or targeted re-renders instead of full `refresh()` calls. When adding a new callback to `refresh()`, ask: "will this reset any component that should stay open?"

## Pattern 2: Async Lifecycle Race Conditions

**Bugs:** CI statusDot null ref crash, various async guard additions

**Pattern:** Async operations (server discovery, fetch, timers) resolve after `destroy()` runs, accessing nulled module-level state.

**Steering rule:** Already documented in `project-conventions.md` as "Async Lifecycle Guards - MANDATORY."

## Pattern 3: DOM Elements Removed by Host Page

**Bugs:** BUG-017 (sidebar vanishes on Element click)

**Pattern:** Elements appended to `document.documentElement` can be removed by host page frameworks during DOM reconciliation.

**Steering rule candidate:** Any element appended outside the shadow DOM should be re-appended on access if its `parentElement` is null.

## Pattern 4: String.includes() for Security Matching

**Bugs:** S5-4 (URL pattern trust gate bypass)

**Pattern:** Using `String.includes()` for security-sensitive matching (URL patterns, trust gates) allows substring attacks.

**Steering rule candidate:** Security-sensitive URL matching must parse the URL and compare hostname+port only. Never match against the full URL string.

## Action

Review these patterns quarterly. Promote confirmed patterns to steering rules in `.kiro/steering/project-conventions.md`.
