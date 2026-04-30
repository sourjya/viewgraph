# Documentation Update Checklist

When a feature changes, these documents must be reviewed and updated before commit.
Organized by trigger type.

## When: New MCP Tool Added

| File | What to update |
|---|---|
| `README.md` | Tool count in description + components table |
| `gitbook/README.md` | Tool count in "MCP Tools" section + tool list |
| `gitbook/features/mcp-tools.md` | Title count + tool table entry |
| `gitbook/SUMMARY.md` | Nav title if count is in it |
| `gitbook/reference/roadmap.md` | "MCP Server (N tools)" in Shipped section |
| `gitbook/reference/faq.md` | "N MCP tools" mention |
| `gitbook/reference/license.md` | "Use all N MCP tools" |
| `gitbook/comparison/overview.md` | Comparison table tool count |
| `gitbook/features/kiro-power.md` | "N tools are the same" |
| `gitbook/.gitbook/assets/viewgraph-numbers-speak.svg` | Footer text |
| `docs/roadmap/roadmap.md` | Current totals line + completion table |
| `docs/references/product-analysis.md` | Tool count mentions |
| `docs/runbooks/gitbook-structure.md` | Cross-reference counts |
| `CONTRIBUTING.md` | "N MCP tool handlers" |
| `npm-readme.md` | Tool count |
| `power/prompts/vg-help.md` + `.kiro/prompts/vg-help.md` | "all N tools" |
| `docs/reviews/security-audit-*.md` | Tool count in attack surface |
| `docs/demo/demo-strategy.md` | "all N MCP tools" |
| `.kiro/specs/npx-init/requirements.md` | Package description |
| `.kiro/steering/versioning.md` | Tag example |

## When: New Prompt Shortcut Added

| File | What to update |
|---|---|
| `gitbook/reference/prompt-shortcuts.md` | Count in intro + new section |
| `gitbook/reference/roadmap.md` | Prompt list in Shipped section |
| `gitbook/features/kiro-power.md` | Prompt count |
| `README.md` | Power assets description (hooks, N prompts, steering) |

## When: New Annotation Category Added

| File | What to update |
|---|---|
| `gitbook/features/extension.md` | Category list in Annotation Panel section |
| `gitbook/tutorials/annotate-and-fix.md` | Category options if mentioned |

## When: New Enrichment Collector Added

| File | What to update |
|---|---|
| `gitbook/features/extension.md` | Enrichment collectors table |
| `gitbook/comparison/capture-format.md` | Enrichment collectors table |
| `README.md` | "14 enrichment collectors" count |
| `gitbook/.gitbook/assets/viewgraph-numbers-speak.svg` | Footer text |
| `docs/roadmap/roadmap.md` | Current totals line |

## When: Test Count Changes Significantly

| File | What to update |
|---|---|
| `gitbook/.gitbook/assets/viewgraph-numbers-speak.svg` | Footer text |
| `gitbook/reference/roadmap.md` | "N+ tests" in Distribution |
| `docs/roadmap/roadmap.md` | Current totals line |
| `docs/architecture/project-metrics.md` | Total tests row |

## When: Version Bump / Tag

| File | What to update |
|---|---|
| `package.json` | version field |
| `server/package.json` | version field |
| `packages/playwright/package.json` | version field |
| `extension/package.json` | version field |
| `docs/changelogs/CHANGELOG.md` | Move Unreleased to new version header |

## When: New Keyboard Shortcut Added

| File | What to update |
|---|---|
| `gitbook/reference/keyboard-shortcuts.md` | Shortcuts table |
| `gitbook/features/extension.md` | Shortcuts table |
| `extension/lib/annotation-sidebar.js` | Help card shortcuts array |

## When: UI/UX Change to Sidebar

| File | What to update |
|---|---|
| `gitbook/features/extension.md` | Feature descriptions + screenshots |
| `gitbook/tutorials/annotate-and-fix.md` | Step-by-step instructions |
| `gitbook/tutorials/qa-bug-report.md` | Export workflow |

## When: Problem Count Changes (Why ViewGraph)

| File | What to update |
|---|---|
| `gitbook/why-viewgraph.md` | Count in intro + At a Glance table |
| `gitbook/README.md` | "N problems" link text |
| `README.md` | "N problems" link text |
