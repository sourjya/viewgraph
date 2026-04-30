# Schema Token Optimization - Design

## Description Compression Strategy

Current pattern (verbose):
```
"Retrieve the full ViewGraph DOM capture JSON. Includes NODES, SUMMARY, RELATIONS, DETAILS, ANNOTATIONS. WHEN TO USE: After get_page_summary confirms you need full details. Use list_captures to find filenames. NEXT: Use get_annotations for user feedback, audit_accessibility for a11y, find_source to locate code. PERFORMANCE: Can be 50-200KB. Always use get_page_summary first."
```

Compressed pattern:
```
"Retrieve full DOM capture JSON (nodes, summary, relations, annotations). Can be 50-200KB; use get_page_summary first for lightweight overview."
```

Rules:
1. Remove WHEN TO USE / NEXT sections (already in vg-help.md)
2. Keep what the tool returns and key constraints
3. One sentence for simple tools, two for complex ones
4. Parameter descriptions stay unchanged (agents need these)

## Shared Parameter Schemas

Extract common Zod schemas to `server/src/utils/shared-params.js`:

```js
export const filenameParam = z.string().describe('Capture filename');
export const urlFilterParam = z.string().optional().describe('Filter by URL substring');
export const limitParam = z.number().optional().default(20).describe('Max results');
```

Tools import and spread:

```js
import { filenameParam } from '#src/utils/shared-params.js';

// In tool registration:
{ filename: filenameParam, ...otherParams }
```

This is code-level dedup (not protocol-level $ref). Reduces maintenance burden and ensures consistency. Token savings come from shorter descriptions, not from $ref (which MCP doesn't support yet).

## Token Measurement

Approximate formula: `tokens ~ JSON.stringify(schema).split(/\s+/).length * 1.3`

Script: `scripts/measure-schema-tokens.js`
- Starts server in flat mode
- Calls `tools/list`
- Counts tokens per tool and total
- Outputs comparison table

## Tasks

### Phase 1: Measure baseline
- [ ] Create `scripts/measure-schema-tokens.js`
- [ ] Run and record current token counts per tool and total

### Phase 2: Compress descriptions
- [ ] Compress all 41 tool descriptions following the rules above
- [ ] Re-measure tokens
- [ ] Verify agent accuracy with manual testing (5 common workflows)

### Phase 3: Shared params
- [ ] Create `server/src/utils/shared-params.js` with common Zod schemas
- [ ] Migrate tools to use shared params (start with the 20+ that use filename)
- [ ] Re-measure tokens
- [ ] Verify all tests pass
