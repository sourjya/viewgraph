# Plugin System for Custom Collectors - Requirements

## Overview

Allow third-party developers to write custom enrichment collectors that run during ViewGraph captures. A plugin is a single JavaScript file that exports a `collect()` function. Plugins extend what ViewGraph captures without modifying the core extension.

## Problem

ViewGraph ships with 14 enrichment collectors covering common diagnostics (network, console, a11y, performance, etc.). But teams have domain-specific needs:
- E-commerce: product data validation, price format checking
- Design systems: component token compliance, spacing grid adherence
- i18n: missing translations, hardcoded strings, RTL layout issues
- Analytics: tracking pixel verification, event firing validation

Building these into core ViewGraph doesn't scale. A plugin system lets teams extend captures for their specific domain.

## Functional Requirements

### FR-1: Plugin Format

- FR-1.1: A plugin is a single `.js` file exporting `{ name, version, collect }` 
- FR-1.2: `collect()` receives the document object and returns a plain object (sync or async)
- FR-1.3: `collect()` has a 3-second timeout - if it doesn't return, it's killed and returns null
- FR-1.4: Plugin return value is included in the capture JSON under `plugins.{name}`
- FR-1.5: Plugins run after all built-in collectors (they can read enrichment data)

### FR-2: Plugin Registration

- FR-2.1: Plugins are registered in extension options page under "Plugins" section
- FR-2.2: Registration accepts a file path (local) or URL (remote, HTTPS only)
- FR-2.3: Registered plugins are stored in `chrome.storage.local`
- FR-2.4: Each plugin can be individually enabled/disabled
- FR-2.5: Maximum 10 plugins registered at once

### FR-3: Plugin Execution

- FR-3.1: Plugins run in the content script context (same as built-in collectors)
- FR-3.2: Each plugin is wrapped in `safeCollect()` - one failure never crashes the capture
- FR-3.3: Plugin execution time is tracked and included in capture metadata
- FR-3.4: Plugins cannot access `chrome.*` APIs (content script restriction, not a new limitation)
- FR-3.5: Plugin output is size-capped at 50KB per plugin (truncated if exceeded)

### FR-4: Plugin Discovery

- FR-4.1: ViewGraph maintains a plugin registry (JSON file in the repo) listing community plugins
- FR-4.2: Options page shows "Browse Plugins" linking to the registry
- FR-4.3: Registry entries include: name, description, author, URL, version, category

### FR-5: Security

- FR-5.1: Plugins run with the same permissions as the content script (no elevation)
- FR-5.2: Remote plugins are fetched over HTTPS only
- FR-5.3: Plugin code is cached locally after first fetch (not re-fetched on every capture)
- FR-5.4: Options page shows a warning when adding a remote plugin: "This plugin runs on every page you capture. Only install plugins you trust."
- FR-5.5: Plugin output is sanitized before inclusion in capture JSON (no functions, no DOM references)

### FR-6: MCP Server Integration

- FR-6.1: Server parser extracts `plugins` section from capture JSON
- FR-6.2: `get_page_summary` includes plugin names and execution times
- FR-6.3: Plugin data is available to all existing analysis tools (no special handling needed)

## Non-Functional Requirements

- NFR-1: Plugin system adds < 10ms overhead when no plugins are registered
- NFR-2: Plugin API is stable - breaking changes require a major version bump
- NFR-3: Plugin format is simple enough that a developer can write one in 15 minutes
