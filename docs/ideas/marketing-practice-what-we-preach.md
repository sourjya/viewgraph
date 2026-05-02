# Marketing: "We Practice What We Preach" - Schema Overhead Reduction

## The Narrative

ViewGraph's mission is token efficiency. But our own tool was contributing to the problem: 41 tool schemas at ~1,699 tokens per turn. Over a 25-turn session, that's ~42,000 tokens of overhead just for ViewGraph to exist in the agent's context - before a single tool is called.

So we fixed it. ViewGraph's clustered mode collapses 41 tools into 6 semantic gateways. Schema overhead drops from ~1,699 to ~200 tokens per turn.

**The math (measured, not estimated):**
- Before: 41 tools, ~1,699 tokens/turn (measured via measure-schema-tokens.js)
- After: 6 gateways, ~200 tokens/turn
- Saved: ~1,500 tokens/turn x 25 turns = ~37,500 tokens/session
- Reduction: 88%

## When to Use This

- Blog post announcing clustered mode
- GitBook "Why ViewGraph" page (add a "We Practice What We Preach" section)
- MCP directory listings (mention schema efficiency)
- Conference talks / demos
- README update when clustered becomes default

## The Credibility Angle

"If we're going to tell developers that every wasted token is wasted compute, wasted energy, and avoidable carbon - we have to hold ourselves to the same standard. Our own schema overhead was the first thing we cut."

## Implementation Status

- Tool clustering: all 3 phases done (gateway factory, wiring, prompts)
- Default mode: still `flat` (backward compatible)
- Switch: `VG_TOOL_MODE=clustered` or `.viewgraphrc.json` `{ "toolMode": "clustered" }`
- Measurement script: `node scripts/measure-schema-tokens.js`

## When to Switch Default

Switch default to `clustered` when:
1. At least 10 users have tested it without issues
2. All prompt shortcuts work correctly with gateway tools
3. Blog post is published explaining the change
