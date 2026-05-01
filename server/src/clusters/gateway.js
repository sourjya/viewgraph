/**
 * Gateway Factory for Tool Clustering
 *
 * Creates gateway tools from cluster config. In clustered mode, 41 individual
 * tools are grouped into 6 gateway tools. Each gateway accepts an `action`
 * parameter to select the sub-tool, plus all sub-tool parameters as optional.
 *
 * Fixes vs v1:
 * 1. Proxy no longer double-registers tools in clustered mode.
 * 2. Zod `.optional()` wrapping is guarded against already-optional and
 *    transformed types via a safe wrapper.
 * 3. Discovery text is built lazily inside the handler, not at registration.
 * 4. MCP request context is forwarded to sub-tool handlers.
 * 5. `z.enum()` guard handles single-tool clusters without throwing.
 *
 * @see .kiro/specs/tool-clustering/design.md
 * @see server/src/clusters/cluster-config.json
 */

import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CONFIG_PATH = resolve(import.meta.dirname, 'cluster-config.json');

/**
 * Load cluster config from disk.
 * @returns {{ clusters: Array<{ gateway: string, description: string, tools: string[] }> }}
 */
export function loadClusterConfig() {
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
}

/**
 * Safely wrap a Zod type as optional.
 * Guards against double-wrapping already-optional types and types with
 * refinements/transforms that break when blindly chained.
 * Uses Zod's internal _def.typeName for reliable type checking (instanceof
 * fails across module boundaries in some bundler configurations).
 *
 * @param {import('zod').ZodTypeAny} zodType
 * @returns {import('zod').ZodTypeAny}
 */
function safeOptional(zodType) {
  const typeName = zodType?._def?.typeName;
  // Already optional or nullable - don't double-wrap
  if (typeName === 'ZodOptional' || typeName === 'ZodNullable') {
    return zodType;
  }
  // Transformed or refined types - wrap in z.any().optional() to avoid
  // breaking the transform chain. The original type is still used when
  // the sub-tool handler validates its own params.
  if (typeName === 'ZodEffects') {
    return z.any().optional();
  }
  return zodType.optional();
}

/**
 * Create a proxy server that captures tool registrations into a registry
 * WITHOUT registering them on the real server in clustered mode.
 *
 * In flat mode (default), tools are registered normally on the real server
 * and the registry is populated as a side-effect only.
 *
 * @param {object} server - The real MCP server instance
 * @param {object} [options]
 * @param {boolean} [options.clustered=false] - If true, suppress individual
 *   tool registration on the real server. registerGateways() does it instead.
 * @returns {{ proxy: object, registry: Map<string, object> }}
 */
export function createToolProxy(server, { clustered = false } = {}) {
  const registry = new Map();

  const proxy = new Proxy(server, {
    get(target, prop) {
      if (prop === 'tool') {
        return (name, ...rest) => {
          // Parse the overloaded server.tool() signature:
          // tool(name, description, schema, handler)
          // tool(name, schema, handler)
          let description, schema, handler;
          if (typeof rest[0] === 'string') {
            [description, schema, handler] = rest;
          } else {
            description = '';
            [schema, handler] = rest;
          }

          // Always capture into registry for gateway dispatch
          registry.set(name, { name, description, schema, handler });

          // Fix 1: In clustered mode, do NOT register on the real server.
          // registerGateways() will handle server registration via gateway tools.
          // In flat mode, register normally.
          if (!clustered) {
            return target.tool(name, ...rest);
          }
        };
      }

      const val = target[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    },
  });

  return { proxy, registry };
}

/**
 * Build the discovery text for a cluster on demand (lazily).
 * Called inside the gateway handler so it reflects the registry state
 * at call time, not at registration time.
 *
 * @param {string} gatewayName - Gateway tool name (e.g., "vg_capture")
 * @param {string[]} toolNames - Sub-tool names in this cluster
 * @param {Map<string, object>} registry - Tool registry
 * @returns {string}
 */
function buildDiscoveryText(gatewayName, toolNames, registry) {
  const lines = toolNames.map((name) => {
    const entry = registry.get(name);
    if (!entry) return `- ${name} (not registered)`;
    const schemaKeys = entry.schema ? Object.keys(entry.schema) : [];
    const params = schemaKeys.length > 0 ? `(${schemaKeys.join(', ')})` : '()';
    const desc = (entry.description || '').split('.')[0] || name;
    return `- ${name}${params}: ${desc}`;
  });
  return `Available actions in ${gatewayName}:\n\n${lines.join('\n')}`;
}

/**
 * Register gateway tools on the server from the cluster config and tool registry.
 *
 * Each gateway tool:
 * - Accepts an `action` param (enum of registered sub-tool names)
 * - Accepts all sub-tool params as optional pass-through
 * - Returns a discovery listing when called without an action
 * - Dispatches to the sub-tool handler (with full MCP context) when action is set
 *
 * @param {object} server - The real MCP server instance
 * @param {Map<string, object>} registry - Tool registry from createToolProxy
 * @param {object} [config] - Cluster config (loaded from disk if not provided)
 * @returns {number} Number of gateway tools registered
 */
export function registerGateways(server, registry, config) {
  if (!config) config = loadClusterConfig();

  let registered = 0;

  for (const cluster of config.clusters) {
    // Only include tools that actually made it into the registry.
    // Handles conditional registration (feature flags, slim mode, etc.)
    const toolNames = cluster.tools.filter((t) => registry.has(t));
    if (toolNames.length === 0) continue;

    // Fix 5: z.enum() requires at least 2 values. With a single tool,
    // fall back to z.literal() to avoid a Zod construction error.
    // vg_source has exactly 1 tool (find_source).
    const actionSchema =
      toolNames.length === 1
        ? z.literal(toolNames[0]).optional()
        : z.enum(toolNames).optional();

    // Fix 2: Build merged schema using safeOptional() to handle
    // already-optional, nullable, and transformed Zod types safely.
    const allParams = {};
    for (const name of toolNames) {
      const entry = registry.get(name);
      if (!entry?.schema) continue;
      for (const [key, zodType] of Object.entries(entry.schema)) {
        if (!allParams[key]) {
          allParams[key] = safeOptional(zodType);
        }
      }
    }

    const gatewaySchema = {
      action: actionSchema.describe(
        'Sub-action to invoke. Omit to list available actions.',
      ),
      ...allParams,
    };

    // Capture for closure - toolNames is stable at this point
    const clusterGateway = cluster.gateway;
    const clusterToolNames = toolNames;

    server.tool(
      clusterGateway,
      cluster.description,
      gatewaySchema,

      // Fix 4: Accept and forward the MCP request context (second argument).
      // Sub-tool handlers may use context for session info, auth, client caps.
      async (params, context) => {
        // Discovery mode: no action specified
        if (!params.action) {
          // Fix 3: Build lazily so conditional tools are reflected at call time
          const text = buildDiscoveryText(clusterGateway, clusterToolNames, registry);
          return { content: [{ type: 'text', text }] };
        }

        const entry = registry.get(params.action);
        if (!entry) {
          const text = buildDiscoveryText(clusterGateway, clusterToolNames, registry);
          return {
            content: [{ type: 'text', text: `Unknown action "${params.action}". ${text}` }],
            isError: true,
          };
        }

        // Strip `action` from params before passing to the sub-tool handler.
        // Fix 4: Forward context as the second argument.
        const { action, ...subParams } = params;
        return entry.handler(subParams, context);
      },
    );

    registered++;
  }

  return registered;
}
