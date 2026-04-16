# ViewGraph Project Metrics

Rolling stats tracking development velocity and project scope.
Updated manually at milestones. First entry: v0.1.0 beta launch.

---

## v0.1.1 (2026-04-14) - Day 6

**Development timeline:** April 8-14, 2026 (6 days from first commit to published beta)

### Codebase

| Metric | Count |
|---|---|
| Git commits | 595 |
| Files tracked | 488 |
| Lines of source code (JS) | 12,726 |
| Lines of test code | 11,330 |
| Lines of documentation (MD) | 22,233 |
| Test-to-code ratio | 0.89:1 |
| Doc-to-code ratio | 1.75:1 |

### Product

| Metric | Count |
|---|---|
| MCP tools | 34 |
| Extension modules | 42 |
| Enrichment collectors | 14 |
| Prompt templates | 8 |
| Kiro hooks | 3 |
| Steering docs | 13 |
| Demo pages (planted bugs) | 4 (25 bugs) |
| Capture accuracy (composite) | 92.1% |

### Testing

| Metric | Count |
|---|---|
| Total tests | 1056 |
| Server tests | 329 |
| Extension tests | 653 |
| Routing tests | 46 |
| Accuracy experiment sites | 145 |
| Experiment sets | 3 (breadth, depth, real-world) |

### Architecture

| Metric | Count |
|---|---|
| Architecture Decision Records | 10 |
| Bug reports filed | 8 |
| Specs written | 22 |
| npm packages published | 2 |
| Extension store submissions | 2 (Chrome, Firefox) |
| GitBook documentation pages | 18 |

### Distribution

| Channel | Status |
|---|---|
| GitHub | Public (github.com/sourjya/viewgraph) |
| npm (@viewgraph/core) | Published v0.1.1 |
| npm (@viewgraph/playwright) | Published v0.1.1 |
| Chrome Web Store | Submitted, pending review |
| Firefox Add-ons | Live: https://addons.mozilla.org/en-US/firefox/addon/viewgraph-capture/ |
| GitBook docs | Live (chaoslabz.gitbook.io/viewgraph) |
| YouTube channel | Live (Evolving with AI) |

### Development Velocity

| Metric | Value |
|---|---|
| Days from zero to published beta | 6 |
| Average commits per day | ~99 |
| Average tests written per day | ~164 |
| Average lines of docs per day | ~3,700 |
| Features shipped per day | ~5.7 MCP tools/day |
| Bugs found and fixed | 11 (including 3 critical) |

### Key Milestones by Day

| Day | Date | What shipped |
|---|---|---|
| 1 | Apr 8 | Project scaffolding, MCP server core, first 8 tools, capture format v2 |
| 2 | Apr 9 | Extension core, DOM traverser, serializer, salience scorer |
| 3 | Apr 10 | Annotation workflow, sidebar, enrichment collectors, 20+ tools |
| 4 | Apr 11 | Multi-export, session recording, continuous capture, security audit, code quality audit |
| 5 | Apr 12 | Accuracy experiment (92.1%), Playwright bridge, React fiber linking, 8 prompts, demo app, docs reorg |
| 6 | Apr 13-14 | Auth removal (ADR-010), multi-project routing fix, npm publish, GitBook site, extension submissions, 18 doc pages |

---

*To update: run the metrics gathering command in the repo and update the numbers above.*
