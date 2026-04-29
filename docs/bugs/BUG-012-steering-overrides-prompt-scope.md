# BUG-012: Steering Doc Overrides Prompt Scope Constraints

**ID:** BUG-012
**Severity:** High
**Status:** FIXED
**Date:** 2026-04-15

## Description

`@vg-audit` is a report-only prompt that explicitly says "Do NOT edit any files. Do NOT fix any issues." However, Kiro ignores this constraint and fixes all bugs it finds.

## Root Cause

Two issues working together:

1. **Steering doc override:** `power/steering/viewgraph-workflow.md` contained a blanket instruction "Fix the issues based on annotation comments and severity" under "When the user mentions UI issues." This general instruction overrode the specific prompt constraint because steering docs are always active.

2. **Weak prompt constraint:** The original `@vg-audit` prompt said "Do NOT fix any issues" once, but didn't forbid reading source files or calling `find_source`. The agent read the HTML, saw comments like `<!-- BUG 2: type="text" -->`, and treated them as instructions to fix.

## Fix

### Steering doc (viewgraph-workflow.md)
Added new top-level section: "When the user uses a @vg- prompt shortcut" - explicitly states that prompt constraints take priority. Report-only prompts (@vg-audit, @vg-capture, @vg-diff, @vg-help) must NOT modify files regardless of what other steering says.

### Prompt (vg-audit.md)
- Moved "REPORT ONLY" to H2 heading for prominence
- Added "Constraints" section with 6 explicit prohibitions
- Forbids `find_source`, reading source files, and `resolve_annotation`
- Repeated "Do NOT" instructions to overcome LLM tendency to "be helpful"

### All prompts audited
Full audit of all 8 prompts documented in `docs/reviews/prompt-engineering-audit-2026-04-15.md`. Each prompt now has explicit action scope, consistent output format, and error handling.

## Files Changed

- `power/steering/viewgraph-workflow.md` - added prompt scope priority section
- `power/prompts/vg-audit.md` - strengthened report-only constraints
- `power/prompts/vg-a11y.md` - clarified fix scope
- `power/prompts/vg-review.md` - annotations-only scope
- `power/prompts/vg-capture.md` - structured output format
- `power/prompts/vg-diff.md` - structured output format
- `power/prompts/vg-help.md` - updated init command
- `power/prompts/vg-testids.md` - testids-only scope

## Lesson

LLM steering docs act as persistent system instructions. A prompt saying "don't fix" loses to a steering doc saying "fix issues you find." The steering doc must explicitly defer to prompt-level constraints when a specific prompt is active.
