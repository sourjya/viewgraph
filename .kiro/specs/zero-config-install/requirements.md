# F16: Zero-Config Install - MCP Config Only

## Requirements

1. Users can start using ViewGraph by adding 5 lines of JSON to their MCP config and installing the browser extension. No `npm install`, no `viewgraph-init`, no config files.
2. The MCP server boots gracefully without `viewgraph-init` having been run first - auto-creates `.viewgraph/captures/` directory, uses sensible defaults for all settings.
3. The server auto-detects the project root from the working directory (cwd) when launched via `npx`.
4. URL pattern matching works without a `config.json` - the server accepts captures from any localhost URL by default, and learns patterns from the first capture received.
5. The install path works with `npx -y @viewgraph/core` (npm) and optionally `npx -y github:sourjya/viewgraph` (direct from repo).
6. The server starts in stdio mode (MCP transport) by default when invoked via the MCP config, and in HTTP+WS mode when invoked via `viewgraph-init` or CLI.
7. First-capture onboarding: when the server receives its first capture and no config.json exists, it auto-generates one with the detected URL pattern and project root.
8. The browser extension connects to the server without any manual configuration - port scanning (9876-9879) already handles this.
9. Power assets (Kiro hooks, prompts, steering docs) are optional - the server works without them. A `viewgraph-init --power` command can install them later.
10. The setup is documented as the primary install path in README, GitBook quick-start, and npm README.
11. Existing `viewgraph-init` workflow continues to work for users who want explicit control over config, power assets, and multi-project setups.
12. The MCP config JSON is published in README, GitBook, and npm package description for easy copy-paste.
