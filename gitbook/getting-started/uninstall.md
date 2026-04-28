# Uninstall

## Remove from a Project

`viewgraph-uninstall` is the reverse of `viewgraph-init`. It removes everything that init installed in a single project.

Run from the project folder:

```bash
npx @viewgraph/core uninstall
```

This is the same as running `viewgraph-uninstall` directly if you have the package installed globally. Either way, it only affects the current project. Your other projects are not touched.

### What the script does

1. **Lists what it found** - MCP config entries, steering docs, prompts, hooks
2. **Asks about your capture data** - the `.viewgraph/` directory contains your DOM captures, screenshots, annotations, and config. You choose whether to keep or delete it.
3. **Asks about config files** - removes the `viewgraph` entry from your MCP config, deletes steering docs, prompts, and hooks
4. **Shows confirmation** for each step before acting

### What it removes

| Component | Path | Description |
|---|---|---|
| MCP config entry | `.kiro/settings/mcp.json` (or `.claude/`, `.cursor/`, etc.) | Removes the `viewgraph` server entry. Other MCP servers are preserved. |
| Steering docs | `.kiro/steering/viewgraph-*.md` | Workflow and resolution guides |
| Prompt shortcuts | `.kiro/prompts/vg-*.md` | `@vg-review`, `@vg-audit`, `@vg-verify`, etc. |
| Hooks | `.kiro/hooks/*vg-*` | Post-fix verification and annotation hooks |
| Data directory (optional) | `.viewgraph/` | Captures, screenshots, annotations, config, auth tokens |

### Keeping your data

If you choose **No** when asked about `.viewgraph/`, your captures and config are preserved. You can re-install ViewGraph later with `npx viewgraph-init` and pick up where you left off.

## Remove from Your System Entirely

The project uninstaller only removes project-level configuration. To fully remove ViewGraph from your system, also do these steps:

**1. Uninstall the npm package:**
```bash
npm uninstall -g @viewgraph/core
```

**2. Remove the browser extension:**
- Chrome: go to `chrome://extensions` → find ViewGraph → Remove
- Firefox: go to `about:addons` → find ViewGraph → Remove

**3. Remove from each project** (if you haven't already):
```bash
cd your-project && npx @viewgraph/core uninstall
```

Native messaging host manifests are left behind but are harmless without the extension.

## Manual Uninstall

If you prefer to remove ViewGraph by hand instead of using the script:

1. Edit your agent's MCP config and delete the `"viewgraph"` key:
   - Kiro: `.kiro/settings/mcp.json`
   - Claude Code: `.claude/mcp.json`
   - Cursor: `.cursor/mcp.json`

2. Remove installed files:
   ```bash
   rm .kiro/steering/viewgraph-*.md
   rm .kiro/prompts/vg-*.md
   rm .kiro/hooks/*vg-*
   ```

3. Remove data (optional):
   ```bash
   rm -rf .viewgraph/
   ```
