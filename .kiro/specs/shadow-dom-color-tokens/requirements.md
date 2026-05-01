# Shadow DOM Color Token Architecture - Requirements

Based on [Shadow DOM CSS Style Color Management](../../../docs/references/shadow-dom-css-style-color-management.md).

## Problem

117 hardcoded hex colors across 19 extension sidebar files. Growing trend: 84 (MRR-004) -> 102 (MRR-009) -> 117 (MRR-010). No single source of truth, no theming path, self-reinforcing growth.

## Approach

**Option D: Constructable Stylesheets via `adoptedStyleSheets`** with `var()` call-site migration.

- `CSSStyleSheet` created once at module load, adopted into shadow root
- Parsed once, shared across instances, theme-switchable via `replaceSync()`
- Call sites use `var(--vg-color-success, #4ade80)` with fallbacks during migration
- Semantic token naming: `--vg-color-success` not `--vg-green`

## User Stories

### US-1: Token infrastructure
As a developer, I want all sidebar colors defined in a single `tokens.js` file using `adoptedStyleSheets`, so that I have one place to change any color.

**Acceptance criteria:**
- `extension/lib/sidebar/tokens.js` exports a `CSSStyleSheet` with all color tokens
- Shadow root initialization adopts the token sheet
- DevTools inspector shows the constructable stylesheet
- All 19 files continue to work identically (no visual change)
- Token naming follows semantic convention: `--vg-color-{purpose}` not `--vg-{color-name}`

### US-2: Call site migration
As a developer, I want all 117 hex color references replaced with `var()` references, so that colors are controlled by the token sheet.

**Acceptance criteria:**
- Zero hardcoded hex colors in sidebar JS files (except in tokens.js)
- All `var()` references include fallback values during migration: `var(--vg-color-success, #4ade80)`
- Visual output is pixel-identical to pre-migration
- Changing a token value in tokens.js propagates to all 19 files
- ESLint rule or grep check added to CI to prevent new hex colors

### US-3: Fallback cleanup
As a developer, I want fallback values stripped after migration is verified, so that the token sheet is the sole source of truth.

**Acceptance criteria:**
- All `var(--vg-color-success, #4ade80)` simplified to `var(--vg-color-success)`
- CI check: zero `#[0-9a-fA-F]{3,8}` in sidebar JS files (except tokens.js)

### US-4: Theme switching (future)
As a user, I want to switch between dark and light themes, so that the sidebar matches my preference.

**Acceptance criteria:**
- `tokenSheet.replaceSync()` with alternate palette switches all colors instantly
- No DOM traversal or re-render required
- Theme preference persisted in `chrome.storage.local`

## Non-Functional Requirements

- Zero performance regression from token sheet adoption (parsed once at module load)
- Browser support: Chrome 73+, Firefox 101+, Safari 16.4+ (all supported by extension targets)
- Token sheet must be inside the shadow root (not on `:root`) to preserve isolation
- Semantic naming: two-tier system (primitive `--vg-color-green-400` + semantic `--vg-color-success`)

## Out of Scope

- Full CSS class migration (Option C) - incremental, done opportunistically in future features
- Light theme implementation - US-4 is infrastructure only, actual theme is a product decision
- Host page theme detection - future enhancement

## Pitfalls (from research)

1. **`replaceSync` blocks main thread** - fine for 20-30 tokens, use `replace()` if sheet grows to hundreds of rules
2. **`all: initial` cuts inheritance** - tokens on `:host` inside shadow root sidestep this
3. **`var()` fallback as migration aid** - use during migration, strip after verification
4. **Don't name colors after colors** - `--vg-color-success` not `--vg-green`
5. **Frozen array trap** - `adoptedStyleSheets.push()` works in modern browsers, no spread needed

## Research Citations

- Lit (Google): `adoptedStyleSheets` under the hood, parsed-once advantage
- Ionic: 23 custom properties per component, `--ion-` prefix convention
- Nord Design System: `{prefix}-{category}-{subcategory}-{name}` naming
- GitHub Primer: three-tier token system (base, functional, component)
- W3C (Sep 2024): `adoptedStyleSheets` is current best answer for shadow DOM styling
