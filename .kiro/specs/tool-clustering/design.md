# Tool Clustering + Progressive Disclosure - Design

## Architecture

```
Agent                    MCP Server
  |                         |
  |-- tools/list ---------> | Returns 6 gateway tools (~1,200 tokens)
  |                         |
  |-- vg_capture() -------> | No action: returns sub-action list (~300 tokens)
  |                         |
  |-- vg_capture({         |
  |     action: "get_page_summary",
  |     filename: "..."    |
  |   }) -----------------> | Dispatches to get_page_summary handler
  |                         |
  |<-- result ------------- |
```

## Gateway Tool Schema

Each gateway tool has a uniform schema:

```json
{
  "name": "vg_capture",
  "description": "Capture management: list, retrieve, request, and validate ViewGraph DOM captures.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": ["list_captures", "get_capture", "get_latest_capture", "get_page_summary", ...],
        "description": "Sub-action to invoke. Omit to list available actions."
      }
    }
  }
}
```

Additional properties are passed through to the sub-action handler. The gateway validates that required params for the chosen action are present.

## Dispatch Implementation

```
server/src/
  clusters/
    cluster-config.json     # Cluster definitions (name, tools, description)
    gateway.js              # Generic gateway factory: creates a gateway tool from a cluster config
  index.js                  # Reads VG_TOOL_MODE, registers flat or clustered
```

`gateway.js` exports a factory:

```js
function createGateway(clusterConfig, toolHandlers) {
  // Returns an MCP tool that:
  // 1. If no action: returns sub-action list with descriptions
  // 2. If action: validates params, dispatches to the matching handler
  // 3. Returns the handler's result unchanged
}
```

Each existing tool handler stays unchanged. The gateway is a thin dispatch layer.

## Discovery Response Format

When called without an action:

```json
{
  "content": [{
    "type": "text",
    "text": "Available actions for vg_capture:\n\n- list_captures(url_filter?, limit?) - List available captures\n- get_capture(filename) - Retrieve full capture JSON\n- get_page_summary(filename) - Compact summary (~500 tokens)\n..."
  }]
}
```

## Mode Switching

```bash
# Default: clustered (6 gateway tools)
VG_TOOL_MODE=clustered npx @viewgraph/core

# Legacy: flat (41 individual tools)
VG_TOOL_MODE=flat npx @viewgraph/core
```

Also configurable in `.viewgraphrc.json`:

```json
{ "toolMode": "clustered" }
```

## Token Accounting

At startup, log:

```
[viewgraph] Tool mode: clustered (6 tools, ~1,200 schema tokens)
[viewgraph] Flat mode equivalent: 41 tools, ~8,200 schema tokens
[viewgraph] Schema reduction: 85%
```

## Migration Path

1. Ship with `flat` as default (no breaking change)
2. After validation, switch default to `clustered`
3. Existing prompts (vg-help.md) updated to reference gateway tools
4. Flat mode remains available indefinitely

## Implementation Pitfalls (Discovered During Build)

Five critical issues found and fixed in the gateway factory:

### Pitfall 1: Double registration in clustered mode
The proxy must NOT call `target.tool()` in clustered mode. Otherwise all 41 tools register individually AND via gateways, producing 47 tools in context (the opposite of the goal). Fix: `createToolProxy` accepts `{ clustered }` option; when true, captures to registry only.

### Pitfall 2: Zod `.optional()` on transformed types
Calling `.optional()` on a `ZodEffects` (from `.refine()` or `.transform()`) can break the validation chain. Fix: `safeOptional()` checks the type first - already-optional types pass through, ZodEffects are replaced with `z.any().optional()` at the gateway level (the sub-tool handler still validates with the original type).

### Pitfall 3: Stale discovery text
Building discovery text at registration time means conditionally registered tools (slim mode, feature flags) produce stale listings. Fix: `buildDiscoveryText()` is called lazily inside the handler at call time, reading from the live registry.

### Pitfall 4: MCP context stripped
The MCP SDK passes a second argument (request context with session info, client capabilities, auth) to tool handlers. The gateway must forward this. Fix: handler signature is `async (params, context)` and passes `context` to `entry.handler(subParams, context)`.

### Pitfall 5: Single-tool cluster crashes z.enum()
`z.enum()` requires at least 2 values. `vg_source` has exactly 1 tool (`find_source`). Fix: guard falls back to `z.literal(toolNames[0]).optional()` for single-tool clusters.

### Wiring order in index.js
Pass `{ clustered: true }` to `createToolProxy` first, run all `register*()` calls against the proxy, then call `registerGateways(server, registry)` against the real server. Gateways must be registered after the registry is fully populated.
