# npx viewgraph-init - Tasks

### Task 1: Extract server into publishable package
- [ ] Create `@viewgraph/server` package.json with proper exports
- [ ] Ensure server works as a standalone npm package (no relative imports outside server/)
- [ ] Add `#src/` subpath imports to package.json exports map
- [ ] Test: `npm pack` produces valid tarball, `npm install` from tarball works

### Task 2: Create viewgraph-init package
- [ ] Create `packages/viewgraph-init/` directory
- [ ] Move init logic from `scripts/viewgraph-init.js` to `packages/viewgraph-init/index.js`
- [ ] Add `bin` field to package.json
- [ ] Bundle Power assets in `power/` subdirectory
- [ ] Add MCP config template
- [ ] Test: `npx ./packages/viewgraph-init` works from a test project

### Task 3: Server installation logic
- [ ] Init script runs `npm install @viewgraph/server` inside `.viewgraph/`
- [ ] Creates `.viewgraph/package.json` with server dependency
- [ ] MCP config points to `.viewgraph/node_modules/@viewgraph/server/index.js`
- [ ] Test: server starts from installed location

### Task 4: Update and uninstall
- [ ] Re-running init updates server (`npm update` in `.viewgraph/`)
- [ ] `--uninstall` flag removes `.viewgraph/` and cleans MCP config
- [ ] Preserves existing captures, tokens, and Power assets on update
- [ ] Test: update preserves config, uninstall cleans up

### Task 5: Publish
- [ ] Publish `@viewgraph/server` to npm
- [ ] Publish `viewgraph-init` to npm
- [ ] Verify `npx viewgraph-init` works from a fresh project
- [ ] Update README with new setup instructions
