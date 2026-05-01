# Shadow DOM Color Management: Problem Analysis & Recommendations

**Project:** Extension Sidebar (`extension/lib/sidebar/`)
**Audit trail:** MRR-004 (84 colors) → MRR-009 (102 colors) → MRR-010 (117 colors)
**Files affected:** 19
**Scope:** Color token architecture, theming strategy, migration path

---

## 1. Problem Statement

The sidebar is rendered inside a shadow DOM - a deliberate architectural choice that prevents the host page's CSS from leaking in and breaking the sidebar's layout. That isolation is correct and should be preserved. The problem is not the shadow DOM itself; it is what grew inside it unchecked.

Every sidebar feature added since the first commit has hardcoded hex values directly into `element.style` assignments. There is no palette, no contract, no convention. The same green (`#4ade80`) appears independently in `review.js`, `strip.js`, `mode-bar.js`, `footer.js`, and `diagnostics.js`. MRR-010 found 117 such values across 19 files. The next audit will find more.

This creates three compounding problems:

**No single source of truth.** Changing the brand green requires a grep-and-replace across 19 files, with no guarantee of completeness. A developer who misses one file ships an inconsistent UI.

**No theming path.** Dark mode, high-contrast accessibility mode, or user-customizable themes are structurally impossible without touching every inline style in every file. The architecture forecloses that capability entirely.

**Self-reinforcing growth.** Because there is no shared palette to import from, every new feature author reaches for a hex value. The problem compounds with every PR.

---

## 2. Why the Standard Fix Does Not Apply Here

The typical answer to "hardcoded hex values everywhere" is to define CSS custom properties on `:root` and reference them via `var()`. That works in ordinary DOM trees. It does not work cleanly here.

CSS custom properties are inherited properties - they flow down the cascade. For a shadow root to receive them, they must either be defined on the shadow host element (which sits in the light DOM) or explicitly re-declared inside the shadow root itself. If any ancestor inside the shadow tree resets inheritance (via `all: initial` or similar isolation), the variables from `:root` are cut off. More practically, relying on `:root` variables for a sidebar that is intentionally isolated from the host page is architecturally fragile: it creates an invisible dependency between the sidebar and whatever page it happens to be injected into.

The token definitions need to live *inside* the shadow root, not outside it.

---

## 3. Options Evaluated

### Option A - `colors.js` Constants File

Extract all hex values into a single JS module:

```js
// colors.js
export const GREEN       = '#4ade80';
export const GREEN_DIM   = '#22c55e';
export const RED         = '#f87171';
export const SURFACE     = '#1e1e2e';
```

All 19 files import from it. Every `element.style.color = '#4ade80'` becomes `element.style.color = GREEN`.

**What this solves:** Single source of truth. One file to edit for a rebrand.

**What this does not solve:** Theming. Runtime theme switching. The styling mechanism is unchanged - everything is still inline JS. A dark mode implementation would require conditional logic scattered across all 19 files, importing both a light and dark palette and branching on a preference flag.

**Verdict:** Correct first step. Dead end on its own.

---

### Option B - Inject `<style>` Tag into Shadow Root with CSS Custom Properties

At sidebar initialization, inject a `<style>` block into the shadow root:

```js
const style = document.createElement('style');
style.textContent = `
  :host {
    --vg-green:   #4ade80;
    --vg-red:     #f87171;
    --vg-surface: #1e1e2e;
  }
`;
shadowRoot.prepend(style);
```

Call sites change from:
```js
el.style.color = '#4ade80';       // before
el.style.color = 'var(--vg-green)'; // after
```

Runtime theming then becomes a single `replaceSync`-equivalent call that rewrites the token values.

**What this solves:** Single source of truth. Theming. The CSS custom properties are defined inside the shadow root, so isolation is preserved.

**What this does not solve:** Performance. Each time the shadow root is instantiated, the browser parses that style block fresh. For a single sidebar this is negligible, but it is not the state-of-the-art approach.

**Verdict:** Correct and sufficient. Establishes the right architecture. The `<style>` injection is a minor inefficiency, not a blocking concern.

---

### Option C - Full Stylesheet Injected into Shadow Root, CSS Classes Throughout

Replace all `element.style.x = value` assignments with CSS class names. Inject a complete stylesheet into the shadow root via a `<style>` tag or `adoptedStyleSheets`. Elements get `el.classList.add('status-success')` instead of `el.style.color = 'var(--vg-green)'`.

**What this solves:** Everything. Cleanest long-term architecture. CSS classes are easier to inspect, override, and reason about than inline styles. Enables full pseudo-class styling (`:hover`, `:focus`) without JS event listeners. Allows `@media` and `@layer` usage inside the shadow root.

**What this does not solve:** Nothing architectural - but it is a large refactor. Every DOM construction call across 19 files changes. It is not a mechanical substitution; it requires judgment about which styles should be classes versus dynamic inline values (animations, user-configurable widths, etc.).

**Verdict:** Right end state. Wrong first move. Build toward this incrementally.

---

### Option D - Constructable Stylesheets with `adoptedStyleSheets` (Recommended)

This is the platform-native solution that the browser specification was explicitly designed for, and it is what major component libraries (Lit, Ionic, AgnosticUI) have converged on.

Instead of injecting a `<style>` DOM element, a `CSSStyleSheet` object is created directly in JavaScript and attached to the shadow root via `adoptedStyleSheets`:

```js
// tokens.js - created once at module load time, outside any class or function
export const tokenSheet = new CSSStyleSheet();

tokenSheet.replaceSync(`
  :host {
    --vg-green:        #4ade80;
    --vg-green-dim:    #22c55e;
    --vg-red:          #f87171;
    --vg-red-muted:    #fca5a5;
    --vg-amber:        #fbbf24;
    --vg-blue:         #60a5fa;
    --vg-surface:      #1e1e2e;
    --vg-surface-alt:  #2a2a3e;
    --vg-text:         #e2e8f0;
    --vg-text-muted:   #94a3b8;
    --vg-border:       #334155;
  }
`);
```

```js
// sidebar-root.js - wherever the shadow root is created
import { tokenSheet } from './tokens.js';

const shadow = host.attachShadow({ mode: 'open' });
shadow.adoptedStyleSheets = [tokenSheet];
```

```js
// review.js, strip.js, etc. - call sites
el.style.color = 'var(--vg-green)';   // was: '#4ade80'
```

Runtime theme switching - one call, zero file touches:

```js
import { tokenSheet } from './tokens.js';

function applyTheme(palette) {
  tokenSheet.replaceSync(`
    :host {
      --vg-green:   ${palette.green};
      --vg-surface: ${palette.surface};
      /* ... */
    }
  `);
  // All 19 files update instantly. No DOM traversal. No re-render coordination.
}
```

**Why this is better than Option B's `<style>` tag injection:**

The stylesheet is parsed exactly once when `replaceSync` is called at module load time. Adopting it into a shadow root is a reference assignment - the browser does not re-parse. Mutating the sheet via a subsequent `replaceSync` propagates to every adopter simultaneously. If the sidebar ever gains multiple shadow root instances (e.g. floating panels, detached windows), all of them stay in sync automatically.

**Browser support:** All modern browsers. Chrome 73+, Firefox 101+, Safari 16.4+. Full support as of 2023.

---

## 4. Comparison Matrix

| Criterion | A (constants.js) | B (style injection) | C (classes) | D (adoptedStyleSheets) |
|---|---|---|---|---|
| Single source of truth | Yes | Yes | Yes | Yes |
| Runtime theming | No | Yes | Yes | Yes |
| Parsed once | - | No | No | **Yes** |
| Inline styles remain | Yes | Yes | No | Your choice |
| Refactor scope | Small | Medium | Large | Medium |
| Future-proof | No | Partial | Yes | **Yes** |
| Shadow DOM safe | Yes | Yes | Yes | Yes |

Option A is a patch on a wound that will keep reopening. MRR-015 will find 135 colors. Option C is the right long-term destination but the wrong immediate move. **Option D is the recommended primary mechanism**, with Option B's `var()` call-site refactor as the migration pattern.

---

## 5. What the Industry Is Doing

This problem is not unique. Every component library that targets shadow DOM has had to solve it.

**Lit** (Google's web component base library) uses `adoptedStyleSheets` under the hood via its `static styles` property. Developers write CSS tagged template literals; Lit handles deduplication, sheet creation, and adoption. The key insight from the Lit team: every `<style>` tag injected per shadow root triggers a full CSS parse per instance. At scale with 55+ components, the difference is measurable.

**Ionic Framework** defines its entire design token surface as CSS custom properties referenced inside shadow roots. Their `ion-button` component alone exposes 23 custom properties as its public theming API. The lesson from Ionic: naming discipline matters more than the mechanism. They use a `--ion-` prefix on everything to prevent collisions with host page styles.

**Nord Design System** (Nordhealth) follows a strict naming structure: `{prefix}-{category}-{subcategory}-{name}`. Their rationale is explicit: *"Prefixing is critical to ensure that our naming does not conflict with other systems."* In an extension context - where the sidebar shares a document with arbitrary host pages - that prefix is not optional.

**GitHub's Primer** separates tokens into tiers: base tokens (raw values), functional tokens (global UI patterns), and component tokens (specific to a single component). Only functional and component tokens get CSS custom properties. Raw palette values are JS constants.

**The broader community consensus** from W3C working group discussions (September 2024): style sharing in shadow DOM is a known unsolved problem at the declarative level. `adoptedStyleSheets` is the current best answer for the imperative/JS case. A declarative equivalent for SSR and script-disabled contexts remains an open proposal.

---

## 6. Tips, Gotchas, and Field Notes

### `replaceSync` vs `replace` (async)

`replaceSync` is synchronous and cannot handle `@import` rules - it will throw if the CSS string contains them. `replace` returns a Promise and does support `@import`. For a token sheet containing only custom property declarations, `replaceSync` is correct and simpler. Use `replace` only if the token sheet needs to load an external resource.

### The frozen array trap (historical)

In an earlier version of the `adoptedStyleSheets` spec, the array was immutable. Adding a new sheet required full reassignment:
```js
// Old pattern - still seen in tutorials written before 2022
shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, newSheet];

// Current spec - push works fine
shadow.adoptedStyleSheets.push(newSheet);
```

Any tutorial or Stack Overflow answer predating mid-2022 may show the spread pattern. It still works, but it is no longer necessary. Watch for it in copy-pasted code.

### `replaceSync` blocks the main thread

Constructable Stylesheets are marketed as performant, and they are - but `replaceSync` parses CSS synchronously on the main thread. For a token sheet with 20-30 custom property declarations, this is imperceptible. If the sheet grows to hundreds of rules (i.e. if Option C is adopted later and the full component stylesheet is moved into the token sheet), consider whether `replace` with a Promise is more appropriate to avoid jank during theme switches.

### DevTools visibility

Constructable stylesheets are inspectable in Chrome DevTools (since Chrome 85) and Firefox. They appear in the Styles pane without a file URL - instead showing a "constructed stylesheet" label. They are editable live in DevTools just like any other stylesheet. This is not a debugging regression relative to `<style>` tag injection.

### Token naming: don't name colors after colors

Naming a token `--vg-green` is slightly better than `#4ade80`, but it is still a visual description rather than a semantic one. The industry pattern is two tiers:

```
Tier 1 (primitive):   --vg-color-green-400: #4ade80;
Tier 2 (semantic):    --vg-color-success:    var(--vg-color-green-400);
                      --vg-color-active:     var(--vg-color-green-400);
```

Call sites reference only tier-2 tokens. When the brand green changes to teal, only the tier-1 mapping changes. When "success" is redesigned to be blue, only the tier-2 alias changes. The sidebar is not large enough yet to require strict two-tier discipline, but the naming should at least lean semantic: `--vg-color-success` over `--vg-green`.

### The `all: initial` inheritance cut-off

The problem statement notes that CSS custom properties from `:root` do not reach inside the shadow root. The reason is almost certainly that something in the sidebar initialization chain applies `all: initial` to reset inheritance from the host page - a completely reasonable thing to do in an extension context. Defining tokens on `:host` inside the shadow root (as the `tokenSheet` above does) sidesteps this entirely. The variables are defined inside the boundary, so inheritance is not in play.

### Tokens defined on `:host` vs inside rules

```css
/* On :host - available everywhere inside the shadow root */
:host { --vg-green: #4ade80; }

/* On a specific element - only available to that element and its descendants */
.sidebar-footer { --vg-green: #4ade80; }
```

For a global token sheet, `:host` is correct. Scoped overrides (e.g. a component that uses a different shade of green in its local context) can re-declare on a more specific selector inside the component's own logic.

### Watch for the `var()` fallback as a migration aid

CSS `var()` accepts a fallback value as its second argument:

```js
el.style.color = 'var(--vg-green, #4ade80)';
```

During the migration, before `tokenSheet` is guaranteed to be adopted on every shadow root, the fallback ensures visual correctness. Once the token sheet is reliably in place across the codebase, the fallbacks can be stripped in a follow-up pass. This makes the migration safely incremental.

---

## 7. Recommended Migration Path

Do not attempt this as a single PR. Three sequential PRs keep risk contained and diffs reviewable.

### PR 1 - Token infrastructure (low risk, no visual change)

Create `tokens.js` with the `CSSStyleSheet` and the full token map. Wire `adoptedStyleSheets` into the shadow root initialization. No call sites change. The token sheet is adopted but nothing references it yet. This PR is purely additive and cannot break anything.

Acceptance criteria: shadow root DevTools inspector shows the token sheet. All 19 files continue to work identically.

### PR 2 - Call site migration (medium risk, per-file scope)

Go file by file. Replace `'#4ade80'` with `'var(--vg-green, #4ade80)'`. Use fallback values throughout. Each file is an isolated, reviewable, revertible diff. This work is largely mechanical and can be scripted as a starting point:

```bash
# Generate a candidate diff - human review required before applying
grep -rn "'#4ade80'" extension/lib/sidebar/ | \
  sed "s/'#4ade80'/'var(--vg-green, #4ade80)'/g"
```

After all 19 files are migrated and verified, strip the fallback values in a final commit.

Acceptance criteria: visual output is pixel-identical to pre-migration. Changing a token value in `tokens.js` propagates correctly across all files.

### PR 3 - Theme implementation (product decision required)

Implement the first non-default theme (dark mode, high contrast, or a user preference). This PR proves that the infrastructure works end-to-end and should be treated as a product feature, not a refactor. Its scope and timing are a product decision.

### Future - Class migration (optional, incremental)

As new sidebar features are built, prefer CSS classes over inline styles where the style is not dynamically computed. Existing components can be migrated to classes opportunistically during feature work. This moves the codebase toward Option C without requiring a dedicated large refactor.

---

## 8. Summary

The sidebar's color problem is an architecture problem, not a hygiene problem. Grep-and-replace fixes it for one day; the right mechanism prevents it from recurring.

The recommended approach is **Option D** (Constructable Stylesheets via `adoptedStyleSheets`) combined with **Option B's** `var()` call-site pattern. This gives a single source of truth today, unlocks runtime theming, and is what the web platform was explicitly designed to provide for this exact scenario. The migration is three PRs: infrastructure, call sites, and first theme. None of them require a full rewrite.

Option A alone is a patch. Option C is the right destination, reachable incrementally. Start with D.
