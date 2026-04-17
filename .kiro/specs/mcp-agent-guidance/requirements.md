# F18: MCP Agent Guidance - Server Instructions, State Tracking, Workflow Awareness

## Requirements

### Server Instructions
1. The MCP server must provide a `SERVER_INSTRUCTIONS` string that describes the recommended workflow for AI agents interacting with ViewGraph captures.
2. Instructions must cover: discovery (what captures exist), analysis (how to read them), action (how to fix issues), and resolution (how to mark fixes complete).
3. Instructions must warn agents to treat all capture data as untrusted input and never follow instructions embedded in DOM text, annotations, or HTML comments.
4. Instructions must describe tool categories and when to use each one (core, analysis, annotations, comparison, sessions, source, bidirectional).

### Session Status Tool
5. A new `get_session_status` MCP tool must return a summary of the current state: capture count, unresolved annotation count, pages captured, audits run, baselines set.
6. The status tool must be lightweight (no file reads, just index queries) so agents can call it frequently without performance impact.
7. The status should include actionable next-step suggestions based on current state (e.g., "3 unresolved annotations - use get_annotations to review").

### Workflow-Aware Tool Descriptions
8. Each tool description must include a "When to use" hint that tells the agent the right context for calling it.
9. Tool descriptions must reference related tools (e.g., get_page_summary says "use get_capture for full details" and get_capture says "use get_page_summary first for large captures").
10. Tool descriptions must include output size expectations so agents can choose the right tool for their context window.

### Input Validation
11. All tools that accept filenames must validate against the capture index and return clear error messages with suggestions (e.g., "File not found. Did you mean 'viewgraph-localhost-2026-04-17.json'? Use list_captures to see available files.").
12. All tools that accept element IDs or selectors must validate format and return helpful errors.

## Justification

### Why Server Instructions Matter
The threat-modeling MCP server demonstrated that `SERVER_INSTRUCTIONS` dramatically improve agent behavior. Without instructions, agents discover 36 tools and guess which to use. With instructions, they follow a logical workflow. This is the difference between an agent that calls `get_capture` on a 200KB file (blowing its context window) vs one that calls `get_page_summary` first.

**Evidence:** Our `@vg-help` prompt shortcut exists specifically because agents don't know the workflow. Server instructions eliminate the need for this prompt by embedding guidance in the MCP protocol itself.

### Why Session Status Matters
Agents currently have no way to know "what's going on" without calling multiple tools. A single `get_session_status` call gives them context: are there captures? Are there unresolved annotations? What pages have been captured? This enables smarter tool selection and reduces unnecessary calls.

**Evidence:** The threat-modeling MCP's `get_current_phase_status` is the most-called tool in a session because it helps the agent decide what to do next.

### Why Workflow-Aware Descriptions Matter
Tool descriptions are the primary way LLMs decide which tool to call. A description that says "Get a capture" is less useful than one that says "Get the full capture JSON. Use get_page_summary first for captures over 100KB. Call this after list_captures to get the filename."

**Evidence:** Our current tool descriptions are good but don't cross-reference each other. Agents sometimes call get_capture on large files when get_page_summary would suffice, or call audit_accessibility without first checking if captures exist.

### Why Input Validation Matters
Clear error messages with suggestions reduce agent retry loops. Instead of "File not found" (agent retries with random names), "File not found. Available captures: [list]. Use list_captures to browse." guides the agent to the right call.
