# Tool Clustering + Progressive Disclosure - Tasks

## Phase 1: Gateway Infrastructure

### Task 1.1: Cluster config
- [ ] Create `server/src/clusters/cluster-config.json` with 6 clusters
- [ ] Each cluster: name, gateway tool name, description, list of tool names
- [ ] Tests: config loads, all 41 tools assigned to exactly one cluster
- **Deliverable:** Config file + validation test

### Task 1.2: Gateway factory
- [ ] Create `server/src/clusters/gateway.js`
- [ ] `createGateway(config, handlers)` returns an MCP tool definition
- [ ] No-action call returns discovery response (sub-action list)
- [ ] Action call validates required params, dispatches to handler
- [ ] Tests: discovery response, valid dispatch, missing action error, missing params error
- **Deliverable:** Gateway factory + 4 unit tests

### Task 1.3: Mode switching in index.js
- [ ] Read `VG_TOOL_MODE` env var and `.viewgraphrc.json` toolMode
- [ ] `flat` mode: register all 41 tools individually (current behavior)
- [ ] `clustered` mode: register 6 gateway tools via factory
- [ ] Log token accounting at startup
- [ ] Tests: flat mode registers 41, clustered registers 6
- **Deliverable:** Mode switching + 2 integration tests

## Phase 2: Cluster Wiring

### Task 2.1: Wire Capture cluster
- [ ] Map 10 capture tools to `vg_capture` gateway
- [ ] Verify all 10 tools callable via gateway
- [ ] Tests: each sub-action dispatches correctly
- **Deliverable:** Capture cluster working

### Task 2.2: Wire Audit cluster
- [ ] Map 8 audit tools to `vg_audit` gateway
- [ ] Tests: each sub-action dispatches correctly
- **Deliverable:** Audit cluster working

### Task 2.3: Wire Compare cluster
- [ ] Map 7 compare tools to `vg_compare` gateway
- [ ] Tests: each sub-action dispatches correctly
- **Deliverable:** Compare cluster working

### Task 2.4: Wire Annotate cluster
- [ ] Map 9 annotate tools to `vg_annotate` gateway
- [ ] Tests: each sub-action dispatches correctly
- **Deliverable:** Annotate cluster working

### Task 2.5: Wire Session + Source clusters
- [ ] Map 6 session tools to `vg_session` gateway
- [ ] Map 1 source tool to `vg_source` gateway
- [ ] Tests: each sub-action dispatches correctly
- **Deliverable:** All 6 clusters working

## Phase 3: Polish + Migration

### Task 3.1: Update vg-help.md prompt
- [ ] Document gateway tools and discovery pattern
- [ ] Show agents how to use clustered mode
- [ ] Update both power/prompts/vg-help.md and .kiro/prompts/vg-help.md
- **Deliverable:** Updated prompt files

### Task 3.2: Token measurement
- [ ] Measure actual schema tokens in flat vs clustered mode
- [ ] Log comparison at startup
- [ ] Document results in README or changelog
- **Deliverable:** Token accounting verified

### Task 3.3: Switch default to clustered
- [ ] Change default from `flat` to `clustered`
- [ ] Update README, gitbook docs
- [ ] Release as minor version bump
- **Deliverable:** Clustered mode is default

## Checkpoint

- [ ] All 41 tools callable via 6 gateways
- [ ] Flat mode still works for backward compatibility
- [ ] Schema token reduction measured and logged
- [ ] vg-help.md updated
- [ ] All tests pass in both modes
