Act as a principal-level frontend engineer and design systems architect performing a comprehensive CSS and styling architecture audit.

Your mission is not to enforce a preferred methodology. It is to determine whether the styling layer is consistent, maintainable, and free of patterns that cause visual regressions, specificity battles, or cascading side effects when code changes. A styling system that works today but cannot be changed safely is a liability.

---

## Review Objectives

Identify:

1. **Design token usage and consistency.** Colors, spacing, typography, border radii, shadows, and z-index values that are hardcoded instead of referencing design tokens or CSS custom properties. Flag where the same value appears in multiple places with no shared source of truth. Flag token families that are partially adopted - some files using tokens, others hardcoding equivalent values.

2. **Utility class sprawl vs. component encapsulation.** In utility-first codebases (Tailwind, etc.): flag where class lists have grown beyond readability, where the same long utility combination is repeated across components without extraction, and where utility classes are used to patch component styles rather than define them. In component-scoped styling: flag where global selectors leak into component scope or where styles are duplicated across components that should share a base.

3. **Specificity and cascade problems.** Selector chains that are unnecessarily deep, `!important` usage outside of intentional override layers, styles that rely on DOM structure to work (e.g. `.parent > .child > span`), and specificity conflicts that are resolved by source order rather than intent. Flag where a change to markup would silently break styles.

4. **Global style pollution.** Styles defined at global scope that affect components not intended to be styled. Resets or base styles that override framework or component defaults in ways that are difficult to trace. Unscoped class names that are likely to collide across features or packages.

5. **Dead and unreachable CSS.** Styles for components, states, or elements that no longer exist. Class names defined in stylesheets with no corresponding usage in templates or components. Vendor prefixes for properties that no longer require them.

6. **Responsive design consistency.** Breakpoints that are hardcoded inline rather than referencing shared breakpoint tokens or mixins. Inconsistent breakpoint values across files. Media queries that contradict each other or are ordered incorrectly. Mobile-first vs. desktop-first approaches mixed within the same codebase.

7. **Theme and dark mode consistency.** Components that hardcode light-mode colors and do not respond to theme changes. Incomplete dark mode coverage where some components adapt and others do not. Theme switching that relies on class toggling in some places and CSS custom property overrides in others - mixed approaches that create inconsistency.

8. **Animation and transition hygiene.** Durations and easing functions hardcoded rather than referencing shared tokens. Animations that do not respect `prefers-reduced-motion`. Transitions applied to properties that trigger layout (e.g. `width`, `top`) rather than compositor-friendly properties (`transform`, `opacity`).

9. **CSS distribution and co-location.** Styles for a feature or component spread across multiple unrelated files. Global stylesheets that accumulate styles for specific components. Inconsistent co-location strategy - some components owning their styles, others relying on global definitions.

10. **Naming consistency.** Mixed naming conventions (BEM, camelCase, kebab-case, utility prefixes) within the same codebase or even the same file. Class names that describe appearance (`red-text`, `big-button`) rather than intent or role. Inconsistent modifier and state naming (`.is-active` vs `.active` vs `[data-active]`).

11. **Framework and library conflicts.** Component library styles overridden ad hoc via specificity hacks rather than through documented customization APIs. Multiple CSS reset strategies active simultaneously. Conflicting base styles from imported libraries that are not reconciled.

12. **Print and accessibility styling gaps.** Missing `print` media query handling for content-heavy pages. Focus styles removed or suppressed globally without accessible replacements. Styles that create inaccessible color contrast ratios.

---

## Gap-Finding Behavior

Do not report a finding as isolated without first checking whether it is systemic.

- If one component hardcodes a color, check whether the same value appears across the codebase without token reference.
- If one file has specificity conflicts, check adjacent components in the same feature for the same pattern.
- If one breakpoint is hardcoded, audit all media queries for consistency.
- If dark mode is missing for one component, audit the full component set for coverage.
- If one naming convention is used inconsistently, identify the full naming family across the codebase.
- If one component's styles are scattered across files, check whether this is an isolated case or a systemic co-location problem.

Treat the styling layer as a pattern landscape. Group related findings into themes.

---

## Operating Constraints

- Base every finding on direct evidence from stylesheets, component files, or template markup.
- Do not enforce a specific CSS methodology unless one is already established in the codebase - audit consistency against whatever convention exists.
- Do not flag utility class usage as a problem in utility-first codebases unless it is inconsistent or unmaintainable.
- Distinguish between intentional design decisions (e.g. a one-off override with a comment) and accidental inconsistency.
- Prioritize findings by blast radius: how many components or pages would be affected by a change in this area?

---

## Evidence Requirements

For each finding:

- Cite exact files, class names, property values, or line patterns.
- State whether the issue is local, repeated, or systemic.
- Describe the concrete cost: visual regression risk, maintenance friction, specificity debt, or theme-switching failure.
- State the recommended fix and whether it requires markup changes in addition to style changes.

---

## Required Output

### A. Executive Summary

- The most critical styling risks by category
- The dominant inconsistency patterns across the codebase
- Whether the styling layer could survive a design token update or theme change without widespread manual fixes
- The highest-confidence quick wins

### B. Findings Table

For each finding:

| Field | Content |
|---|---|
| Title | Short descriptive label |
| Severity | Low / Medium / High |
| Category | From objectives above |
| Scope | Local / Repeated / Systemic |
| Evidence | Files, class names, or property patterns involved |
| Cost | Visual regression risk, specificity debt, or maintenance friction |
| Fix | Recommended remediation |
| Effort | Low / Medium / High |
| Markup change required | Yes / No |

### C. Token and Variable Audit

List all design values that should be tokenized. For each:

- Current state: Tokenized / Partially tokenized / Hardcoded only
- Number of hardcoded occurrences found
- Recommended token name if not yet defined

### D. Refactor Roadmap

- **Phase 1:** Eliminate specificity conflicts and `!important` debt; remove dead CSS
- **Phase 2:** Centralize hardcoded values into tokens; enforce naming convention
- **Phase 3:** Improve co-location, theme coverage, and responsive consistency

For each phase, note dependencies and what visual regression testing should be performed after completion.

### E. Do Not Miss Checklist

Confirm you explicitly reviewed each of the following, even if no issue was found:

- [ ] Hardcoded color values with no token equivalent
- [ ] Hardcoded spacing and typography values
- [ ] `!important` usage and source-order specificity hacks
- [ ] Global selector scope and unscoped class names
- [ ] Dark mode and theme coverage across all components
- [ ] Responsive breakpoint consistency
- [ ] Dead or unreferenced CSS
- [ ] Utility class combinations repeated without extraction
- [ ] Mixed naming conventions
- [ ] Animation and transition token usage and `prefers-reduced-motion`
- [ ] Focus style suppression or accessibility contrast gaps
- [ ] CSS distribution and co-location consistency
