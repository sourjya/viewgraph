# MCP Analysis Tools - Design

## Architecture

All analysis tools follow the same pattern:
1. Validate filename via `validateCapturePath`
2. Read file from disk
3. Parse with `parseCapture` (full parse)
4. Run analysis logic on parsed data
5. Return structured JSON result

```
server/src/tools/
├── list-captures.js          (M1 - existing)
├── get-capture.js            (M1 - existing)
├── get-latest.js             (M1 - existing)
├── get-page-summary.js       (M1 - existing)
├── get-elements-by-role.js   (M2 - new)
├── get-interactive.js        (M2 - new)
├── find-missing-testids.js   (M2 - new)
├── audit-accessibility.js    (M2 - new)
├── compare-captures.js       (M2 - new)
├── get-annotations.js        (M2 - new)
└── get-annotated-capture.js  (M2 - new)

server/src/analysis/
├── node-queries.js           (shared: flatten nodes, filter by role/action)
├── a11y-rules.js             (accessibility audit rules)
└── capture-diff.js           (capture comparison logic)

server/tests/unit/tools/
├── get-elements-by-role.test.js
├── get-interactive.test.js
├── find-missing-testids.test.js
├── audit-accessibility.test.js
├── compare-captures.test.js
├── get-annotations.test.js
└── get-annotated-capture.test.js
```

## Shared Analysis Module: node-queries.js

Extracts and queries nodes from parsed captures. Used by multiple tools.

```javascript
// Flatten all nodes from high/med/low tiers into a single array
flattenNodes(parsedCapture) -> Node[]

// Filter nodes by tag-based role mapping
filterByRole(nodes, role) -> Node[]

// Filter nodes that have actions (interactive)
filterInteractive(nodes) -> Node[]

// Get DETAILS for a node by id
getNodeDetails(parsedCapture, nodeId) -> Details | null
```

### Role mapping

| Role | Tags |
|---|---|
| `button` | button, input[type=submit], input[type=button], [role=button] |
| `link` | a, [role=link] |
| `input` | input, textarea, select |
| `heading` | h1, h2, h3, h4, h5, h6 |
| `image` | img, svg, [role=img] |
| `table` | table |
| `nav` | nav, [role=navigation] |
| `form` | form |

## Accessibility Audit Rules: a11y-rules.js

Each rule is a function: `(node, details) -> Issue | null`

| Rule | Severity | Check |
|---|---|---|
| `missing-aria-label` | error | Interactive element without aria-label or visible text |
| `missing-alt` | error | img tag without alt attribute |
| `missing-form-label` | warning | input without associated label (labelFor relation or aria-label) |
| `button-no-name` | error | button without text content or aria-label |

## Capture Diff: capture-diff.js

Compares two parsed captures by matching elements across them.

**Matching strategy:** Match by `selector` first (most stable), fall back to
`id` if selectors differ. Elements with matching selectors are "same element".

**Diff output:**
- `added`: elements in B with no match in A
- `removed`: elements in A with no match in B
- `moved`: matched elements with different bbox
- `testidChanges`: { added: [], removed: [] }

## Registration in index.js

All M2 tools are registered in `index.js` alongside M1 tools. They receive
the same `(server, indexer, capturesDir)` arguments.
