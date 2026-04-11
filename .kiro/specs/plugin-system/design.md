# Plugin System - Design

## Plugin API

A plugin is a single file that exports three things:

```javascript
// example-plugin.js - checks for hardcoded color values
export const name = 'color-audit';
export const version = '1.0.0';

/**
 * @param {Document} document - the page's document object
 * @param {object} enrichment - data from built-in collectors (network, console, etc.)
 * @returns {object} - plugin output, included in capture JSON under plugins.{name}
 */
export function collect(document, enrichment) {
  const hardcoded = [];
  for (const el of document.querySelectorAll('*')) {
    const style = window.getComputedStyle(el);
    const color = style.color;
    if (color && !color.startsWith('var(')) {
      hardcoded.push({
        selector: el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''),
        property: 'color',
        value: color,
      });
    }
  }
  return { hardcodedColors: hardcoded.length, details: hardcoded.slice(0, 50) };
}
```

## Execution Flow

```
Content script capture flow:
  1. traverseDOM()
  2. scoreAll()
  3. collectAllEnrichment()     <-- built-in collectors
  4. runPlugins(enrichment)     <-- NEW: plugin execution
  5. serialize()                <-- plugins data included
```

### `runPlugins()` implementation:

```javascript
async function runPlugins(enrichment) {
  const plugins = await getRegisteredPlugins(); // from chrome.storage.local
  const results = {};
  for (const plugin of plugins) {
    if (!plugin.enabled) continue;
    const start = performance.now();
    try {
      const mod = await importPlugin(plugin);
      const output = await Promise.race([
        mod.collect(document, enrichment),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);
      results[mod.name] = {
        version: mod.version,
        durationMs: Math.round(performance.now() - start),
        data: sanitize(truncate(output, 50 * 1024)),
      };
    } catch (err) {
      results[plugin.name] = {
        error: err.message,
        durationMs: Math.round(performance.now() - start),
      };
    }
  }
  return results;
}
```

## Plugin Loading

### Local plugins
Loaded via dynamic `import()` from a blob URL created from the stored source code.

### Remote plugins
Fetched once over HTTPS, source cached in `chrome.storage.local`. Re-fetched only when user clicks "Update" in options.

```javascript
async function importPlugin(plugin) {
  let source = plugin.cachedSource;
  if (!source && plugin.url) {
    const res = await fetch(plugin.url);
    source = await res.text();
    // Cache for future use
    await updatePluginCache(plugin.name, source);
  }
  const blob = new Blob([source], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  try {
    return await import(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
```

## Capture JSON Output

```json
{
  "metadata": { ... },
  "nodes": [ ... ],
  "plugins": {
    "color-audit": {
      "version": "1.0.0",
      "durationMs": 45,
      "data": {
        "hardcodedColors": 23,
        "details": [ ... ]
      }
    },
    "i18n-check": {
      "error": "timeout",
      "durationMs": 3000
    }
  }
}
```

## Options Page UI

```
Plugins
  [+ Add Plugin]

  color-audit v1.0.0          [ON]  [Remove]
    Local file - loaded from storage
    Last run: 45ms

  i18n-check v0.2.0           [OFF] [Remove]
    https://example.com/vg-i18n.js
    Cached - [Update]

  [Browse Community Plugins]
```

## Security Considerations

- Plugins run in the content script context - same origin, same permissions as ViewGraph itself
- A malicious plugin could read page content, but so could any content script
- The trust boundary is the same as installing any browser extension
- The warning dialog on remote plugin install makes this explicit
- Plugin output is sanitized: functions stripped, DOM references stripped, size capped

## File Layout

```
extension/
  lib/
    plugin-runner.js         Plugin loading, execution, timeout, sanitization
    plugin-registry.js       CRUD for registered plugins in chrome.storage
  entrypoints/
    options/
      index.html             Add "Plugins" section
      options.js             Plugin management UI logic
server/
  src/
    parsers/
      viewgraph-v2.js        Extract plugins section from capture JSON
```

## Example Plugins (shipped in repo under `plugins/examples/`)

| Plugin | Description |
|---|---|
| `color-audit.js` | Finds hardcoded color values (not using CSS variables) |
| `spacing-grid.js` | Checks if element spacing follows an 8px grid |
| `link-checker.js` | Validates href attributes (no empty, no javascript:, no #) |
| `image-audit.js` | Checks image dimensions vs display size (oversized images) |
