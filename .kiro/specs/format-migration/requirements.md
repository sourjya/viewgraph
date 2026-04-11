# Capture Format Migration Tooling - Requirements

## Overview

Tooling to migrate ViewGraph capture files between format versions. As the capture format evolves (v2 -> v3 and beyond), existing captures in `.viewgraph/captures/` need to be upgraded without losing data. The migration tool runs automatically on server startup and can be invoked manually.

## Problem

The ViewGraph capture format will evolve. When we ship v3 (e.g., adding plugin data, changing node schema, restructuring enrichment), existing v2 captures become incompatible. Without migration tooling:
- Old captures fail to parse
- Baselines become useless
- Annotation history is lost
- Users must re-capture everything

## Functional Requirements

### FR-1: Migration Framework

- FR-1.1: Each format version has a migration function: `migrateV2ToV3(capture) -> capture`
- FR-1.2: Migrations are composable: v2 -> v3 -> v4 chains automatically
- FR-1.3: Migration functions are pure (no side effects, no file I/O)
- FR-1.4: Each migration is a separate file in `server/src/migrations/`
- FR-1.5: A registry maps version pairs to migration functions

### FR-2: Automatic Migration

- FR-2.1: On server startup, scan all captures in the captures directory
- FR-2.2: For each capture with a version older than current, run the migration chain
- FR-2.3: Write the migrated capture back to disk (overwrite in place)
- FR-2.4: Create a backup of the original in `.viewgraph/captures/.backup/` before overwriting
- FR-2.5: Log each migration: filename, from-version, to-version, success/failure
- FR-2.6: Skip captures that are already at the current version

### FR-3: Manual Migration

- FR-3.1: CLI command: `node scripts/viewgraph-migrate.js [--dry-run] [--dir path]`
- FR-3.2: `--dry-run` reports what would be migrated without writing
- FR-3.3: `--dir` specifies captures directory (defaults to `.viewgraph/captures/`)
- FR-3.4: MCP tool: `migrate_captures` runs migration on all captures, returns summary

### FR-4: Validation

- FR-4.1: After migration, validate the output against the target version schema
- FR-4.2: If validation fails, keep the original file and log the error
- FR-4.3: Migration summary includes: total files, migrated, skipped, failed

### FR-5: Version Detection

- FR-5.1: Read `metadata.version` field from capture JSON to determine format version
- FR-5.2: Captures without a version field are assumed to be v1 (earliest format)
- FR-5.3: Current format version is defined in a single constant

## Non-Functional Requirements

- NFR-1: Migration of 100 captures completes in under 10 seconds
- NFR-2: Backup directory uses < 2x the original captures disk space
- NFR-3: Migration is idempotent - running twice produces the same result
- NFR-4: Migration preserves all annotation data, enrichment data, and metadata
