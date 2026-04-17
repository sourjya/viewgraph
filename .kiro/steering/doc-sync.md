---
inclusion: always
description: Mandatory documentation update checklist for feature changes
---

# Documentation Sync Rule

## Mandatory Pre-Commit Documentation Updates

**Before committing any feature change, the agent MUST review and update all affected documentation.**

The full checklist is at `docs/runbooks/doc-update-checklist.md`. Key triggers:

### New MCP Tool
Update tool counts in: README.md, gitbook/README.md, gitbook/features/mcp-tools.md (title + table), gitbook/reference/roadmap.md, gitbook/reference/faq.md, gitbook/.gitbook/assets/viewgraph-numbers-speak.svg, docs/roadmap/roadmap.md, CONTRIBUTING.md, npm-readme.md, power/prompts/vg-help.md, .kiro/prompts/vg-help.md.

### New Prompt Shortcut
Update prompt counts in: gitbook/reference/prompt-shortcuts.md, gitbook/reference/roadmap.md, gitbook/features/kiro-power.md, README.md.

### New Category / Enrichment Collector
Update lists in: gitbook/features/extension.md, gitbook/comparison/capture-format.md, README.md.

### Version Bump
Update version in all 4 package.json files. Update CHANGELOG.md.

### Extension Build
When a new versioned extension ZIP is produced by `scripts/build-extension.sh`:
- The build script auto-copies ZIPs to `downloads/` (removes old versions first)
- Only the latest version exists in `downloads/` - old ZIPs are deleted automatically
- Upload ZIPs to the GitHub Release: `gh release create vX.X.X downloads/*.zip --title "..." --notes "..."`
- GitBook installation page links to `downloads/` folder, not GitHub Releases
- Do NOT keep old extension ZIPs in the repo - they're buggy and waste space

### Significant Test Count Change
Update counts in: gitbook/.gitbook/assets/viewgraph-numbers-speak.svg, docs/roadmap/roadmap.md, docs/architecture/project-metrics.md.

## Rule
- Do NOT commit a feature without updating affected docs
- Do NOT tag a release without verifying all counts match reality
- When in doubt, grep for the old number across all .md and .svg files
- Batch doc updates with the feature commit, not as a separate commit
