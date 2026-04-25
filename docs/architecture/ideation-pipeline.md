# Ideation Pipeline - Architecture

How idea-mode annotations flow from the browser to generated specs.

## Data Flow

```
User clicks element → toggles lightbulb → writes idea comment
    ↓
Annotation stored: { type: 'element', category: 'idea', comment, element, region }
    ↓
Send to Agent → capture JSON includes annotations with category 'idea'
    ↓
Agent runs @vg-ideate prompt
    ↓
1. get_latest_capture → finds capture with idea annotations
2. get_annotations → filters for category containing 'idea'
3. For each idea: element context (selector, tag, text, styles, component name)
4. generate_spec → creates .kiro/specs/{name}/requirements.md + tasks.md
```

## Key Design Decisions

### Ideas are annotations, not a separate data type

Ideas use the same annotation data model as bugs - same `{ id, uuid, type, region, comment, category }` structure. The `category` field contains `'idea'` (can be combined with other categories like `'idea,visual'`). This means:

- Ideas flow through the same storage, sync, and export pipelines as bugs
- The Resolved tab shows both fixed bugs and completed ideas
- No separate data model, no separate sync, no separate export format

### Idea mode suppresses severity and diagnostics

When `category` includes `'idea'`, the annotation panel:
- Hides the severity dropdown (ideas don't have severity)
- Suppresses diagnostic suggestion chips (ideas are about what to build, not what's broken)
- Changes the panel border to yellow and background to warm tint
- Shows the lightbulb icon in the timeline entry

This is handled in `annotation-panel.js` and `annotation-types.js`.

### @vg-ideate is a generation prompt, not an action prompt

Unlike `@vg-review` (which modifies source files), `@vg-ideate` only generates spec files. It never touches existing code. This is intentional - ideas need human review before implementation.

## Files

| File | Role |
|---|---|
| `extension/lib/annotation-panel.js` | Lightbulb toggle, idea mode panel styling |
| `extension/lib/annotation-types.js` | Type resolution: `category.includes('idea')` → idea type |
| `power/prompts/vg-ideate.md` | Prompt that generates specs from idea annotations |
| `gitbook/tutorials/ideation.md` | User-facing tutorial |
| `gitbook/who-benefits.md` | Product & Design tab - PM and founder sections |
