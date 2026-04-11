# Capture Format Migration - Tasks

### Task 1: Migration framework
- [ ] Create `server/src/migrations/` directory
- [ ] Create `server/src/migrations/registry.js` - maps version pairs to migration functions
- [ ] `migrate(capture)` - detects version, chains migrations to current version
- [ ] Pure functions: input capture JSON, output migrated capture JSON
- [ ] Tests: chain v2->v3, skip current version, handle missing version field

### Task 2: v2 -> v3 migration (template)
- [ ] Create `server/src/migrations/v2-to-v3.js`
- [ ] Define the v3 schema changes (placeholder until v3 is designed)
- [ ] Add `plugins` section (empty object) if missing
- [ ] Update `metadata.version` from `2.x.x` to `3.0.0`
- [ ] Tests: v2 capture migrates to v3, all data preserved

### Task 3: Automatic migration on startup
- [ ] On server startup, scan captures directory
- [ ] For each outdated capture, backup to `.backup/` and migrate in place
- [ ] Log migrations to stderr (MCP server logging convention)
- [ ] Skip already-current captures
- [ ] Tests: startup migrates outdated files, skips current, creates backups

### Task 4: CLI command
- [ ] Create `scripts/viewgraph-migrate.js`
- [ ] `--dry-run` mode reports without writing
- [ ] `--dir` flag for custom captures directory
- [ ] Summary output: total, migrated, skipped, failed
- [ ] Tests: dry-run doesn't write, normal run migrates

### Task 5: MCP tool
- [ ] Create `server/src/tools/migrate-captures.js`
- [ ] Returns migration summary (total, migrated, skipped, failed)
- [ ] Tests: tool returns correct summary

### Task 6: Validation
- [ ] Schema validation for each format version (JSON Schema or Zod)
- [ ] Post-migration validation - reject invalid output, keep original
- [ ] Tests: invalid migration output detected, original preserved
