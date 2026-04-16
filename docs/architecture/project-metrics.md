# ViewGraph Project Metrics

Rolling stats tracking development velocity and project scope.
Updated manually at milestones. First entry: v0.1.0 beta launch.

---

## v0.3.3 (2026-04-16)

### Product

| Metric | Count |
|---|---|
| MCP tools | 36 |
| Extension modules | 54 (12 root + 42 in 7 subdirectories) |
| Enrichment collectors | 14 |
| Prompt shortcuts | 9 |
| Kiro hooks | 3 |
| Steering docs | 4 |
| Demo pages (planted bugs) | 4 (25 bugs) |
| Capture accuracy (composite) | 92.1% |

### Testing

| Metric | Count |
|---|---|
| Total tests | 1279 |
| Server tests | 384 |
| Extension tests | 895 |
| Test files | 103 (55 extension + 48 server) |
| Accuracy experiment sites | 145 |

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
| npm (@viewgraph/core) | Published v0.3.0 |
| npm (@viewgraph/playwright) | Published v0.3.0 |
| Chrome Web Store | Live: chromewebstore.google.com |
| Firefox Add-ons | Live, v0.3.3 submitted |
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
