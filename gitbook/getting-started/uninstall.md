# Uninstall

Remove ViewGraph from a project. This removes the MCP server configuration, steering docs, prompts, and hooks. Optionally removes capture data.

## Remove from a Project

Run from the project folder where ViewGraph is installed:

```bash
npx @viewgraph/core uninstall
```

This removes ViewGraph's configuration, steering docs, prompts, and hooks from the current project. Your other projects are not affected.

If you installed `@viewgraph/core` globally, you can also run:

```bash
viewgraph-uninstall
```

## What It Removes

The uninstall script detects and removes:

| Component | Path | Description |
|---|---|---|
| MCP config entry | `.kiro/settings/mcp.json` (or `.claude/`, `.cursor/`, etc.) | Removes the `viewgraph` server entry. Other MCP servers are preserved. |
| Steering docs | `.kiro/steering/viewgraph-*.md` | Workflow and resolution guides installed by `viewgraph-init` |
| Prompt shortcuts | `.kiro/prompts/vg-*.md` | `@vg-review`, `@vg-audit`, `@vg-verify`, etc. |
| Hooks | `.kiro/hooks/*viewgraph*`, `.kiro/hooks/vg-*` | Post-fix verification and annotation hooks |

## Data Directory (.viewgraph/)

The `.viewgraph/` directory contains your captures, screenshots, annotations, config, and auth tokens. The uninstall script asks **separately** whether to remove it:

```
  .viewgraph/ Data Directory
    Contains: 42 capture(s), config, auth tokens
    Size: 28.5 MB

    This directory holds your DOM captures, screenshots, annotations,
    and project config. Removing it deletes all capture history.

  Remove .viewgraph/ data directory? (y/N)
```

- **Yes** — deletes all captures, config, and tokens. Cannot be undone.
- **No** — keeps the data. You can re-install ViewGraph later and your captures will still be there.

## What It Does NOT Remove

- The browser extension — uninstall from Chrome (`chrome://extensions`) or Firefox (`about:addons`) separately
- The npm package — run `npm uninstall -g @viewgraph/core` to remove globally
- Native messaging host manifests — these are harmless without the extension

## Manual Uninstall

If you prefer to remove ViewGraph manually:

1. **Remove MCP config entry:**
   ```bash
   # Edit your agent's MCP config and delete the "viewgraph" key:
   # Kiro: .kiro/settings/mcp.json
   # Claude Code: .claude/mcp.json
   # Cursor: .cursor/mcp.json
   ```

2. **Remove steering docs and prompts:**
   ```bash
   rm .kiro/steering/viewgraph-*.md
   rm .kiro/prompts/vg-*.md
   rm .kiro/hooks/*vg-*
   ```

3. **Remove data (optional):**
   ```bash
   rm -rf .viewgraph/
   ```

4. **Remove from .gitignore (optional):**
   ```bash
   # Remove the ".viewgraph/" line from .gitignore
   ```

5. **Uninstall browser extension:**
   - Chrome: `chrome://extensions` → find ViewGraph → Remove
   - Firefox: `about:addons` → find ViewGraph → Remove

6. **Uninstall npm package:**
   ```bash
   npm uninstall -g @viewgraph/core
   ```
