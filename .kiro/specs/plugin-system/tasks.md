# Plugin System - Tasks

### Task 1: Plugin runner module
- [ ] Create `extension/lib/plugin-runner.js`
- [ ] `runPlugins(enrichment)` - loads and executes all enabled plugins
- [ ] 3-second timeout per plugin via Promise.race
- [ ] Sanitize output: strip functions, DOM refs, cap at 50KB
- [ ] Wrapped in safeCollect pattern
- [ ] Tests: successful plugin, timeout plugin, error plugin, size cap

### Task 2: Plugin registry module
- [ ] Create `extension/lib/plugin-registry.js`
- [ ] CRUD operations on chrome.storage.local
- [ ] Schema: { name, version, url, cachedSource, enabled, addedAt }
- [ ] Max 10 plugins enforced
- [ ] Tests: add/remove/enable/disable/list

### Task 3: Plugin loading
- [ ] Local plugins: load from cached source via blob URL + dynamic import
- [ ] Remote plugins: fetch HTTPS, cache source, load from cache
- [ ] Update mechanism: re-fetch remote source on user action
- [ ] Tests: local load, remote fetch + cache, cache hit

### Task 4: Integration into capture flow
- [ ] Call `runPlugins()` after `collectAllEnrichment()` in content.js
- [ ] Include plugin results in serializer output under `plugins` key
- [ ] Skip entirely when no plugins registered (< 1ms overhead)
- [ ] Tests: capture includes plugin data, empty when no plugins

### Task 5: Options page UI
- [ ] Add "Plugins" section to options page
- [ ] Add plugin form (name + file/URL)
- [ ] Plugin list with enable/disable toggle and remove button
- [ ] Trust warning dialog for remote plugins
- [ ] "Browse Community Plugins" link
- [ ] Tests: add/remove/toggle UI interactions

### Task 6: Server parser support
- [ ] Extract `plugins` section in viewgraph-v2.js parser
- [ ] Include plugin names and durations in `get_page_summary`
- [ ] Tests: parser extracts plugins, summary includes plugin info

### Task 7: Example plugins
- [ ] Create `plugins/examples/` directory
- [ ] `color-audit.js` - hardcoded color detection
- [ ] `spacing-grid.js` - 8px grid compliance
- [ ] `link-checker.js` - href validation
- [ ] `image-audit.js` - oversized image detection
- [ ] Each with JSDoc and inline comments
