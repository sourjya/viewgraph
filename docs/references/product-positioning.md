# ViewGraph - Product Positioning and Go-to-Market Strategy

**Date:** 2026-04-08

**Status:** Draft - to be integrated into project when ready for launch

**Purpose:** Capture product positioning, messaging, audience strategy, and
launch plan for future execution. This is not a technical doc - it's the
commercial strategy.

---

## Category

**The UI context layer for agentic coding**

Not a browser extension. Not a screenshot tool. Not a DOM exporter. Not an
MCP helper. Those are features. The category is the context layer.

---

## Mission

**Fewer wasted tokens. Faster shipping. Lower carbon footprint. Responsible AI in action.**

ViewGraph exists to make AI-assisted development environmentally responsible. AI coding agents spend [60-80% of their token budget on orientation and retrieval](https://arxiv.org/html/2601.14470v1), not problem-solving. Every wasted token is wasted compute, wasted energy, and avoidable carbon emissions.

Global data center electricity demand is projected to [more than double by 2030 to ~945 TWh](https://www.iea.org/news/ai-is-set-to-drive-surging-electricity-demand-from-data-centres-while-offering-the-potential-to-transform-how-the-energy-sector-works) - more than Japan's entire energy consumption. LLM inference (not training) now accounts for [more than 90% of total AI power consumption](https://arxiv.org/html/2512.03024). Every tool that reduces wasted inference directly reduces the carbon intensity of AI development.

ViewGraph's token efficiency is not a feature - it is the product's reason for existing. By giving agents exactly the UI context they need in the smallest possible token footprint, ViewGraph reduces the environmental cost of every AI-assisted coding session.

| What we measure | What it means |
|---|---|
| 97% token reduction per task | 97% less compute, 97% less energy |
| 80-85% reduction on interactive queries | Agents stop re-reading entire pages |
| 50-1500x compression on sequential captures | Near-zero overhead for iterative workflows |
| 99.8% reduction on capture transmission | File-backed receipts instead of inline JSON |

This is not greenwashing. These are measured results from [experiments on 175 real captures](../../scripts/experiments/) across 4 projects and 48 diverse websites.

---

## Core Values

1. **Environmental responsibility** - Every design decision is evaluated against token cost. Less waste = less compute = less carbon.
2. **Radical transparency** - All measurements are reproducible. Experiment scripts, datasets, and results are committed to the repo.
3. **Open source** - AGPL-3.0. Free for the global developer community. Responsible AI should not be paywalled.
4. **Ethical AI usage** - Agents should use the minimum context needed. Progressive disclosure, not context flooding.

---

## Core Problem Statement

Current coding agents can read code, but they still guess the live UI.

That guesswork creates:

- Weak test generation
- Brittle selectors
- Missed regressions
- Vague QA handoffs
- Bad accessibility fixes
- Poor layout reproduction
- Hallucinated UI assumptions

ViewGraph solves that by turning live pages into structured, agent-ready
UI context.

---

## Positioning Lines

**Primary:** Give coding agents real understanding of live web pages.

**Backup lines:**

- Stop making your AI guess the UI
- Capture once, test, audit, and build from the same page context
- The missing context layer between your browser and your coding agent
- From live page to agent-ready context
- Capture the page your agent wishes it understood

**Best for launch:** The UI context layer for agentic coding

---

## Target Audience (in order)

### 1. Primary wedge: Frontend devs using agentic IDEs

Already using Claude Code, Cursor, Windsurf, Kiro, Copilot with agentic
workflows, or any MCP-capable stack. Already frustrated by weak UI context.
Easy to demonstrate value fast.

### 2. Secondary: QA automation engineers and test-heavy frontend teams

Bridge between exploratory testing and automation. Structured artifacts
replace screenshots-with-arrows.

### 3. Third lane: Product engineers and design-system teams

Regression review, component audits, pattern replication.

---

## Six Marketing Pillars

1. **Responsible AI** - Every token saved is compute not burned, energy not
   consumed, carbon not emitted. ViewGraph makes agentic coding sustainable.
2. **Better test generation** - agent sees actual interactive page, not
   guessed JSX or a screenshot
3. **Better regression detection** - before/after captures give structural
   evidence, not eyeballing
4. **Better QA-to-dev handoff** - bug report becomes structured artifact,
   not screenshot plus suffering
5. **Better accessibility remediation** - agents work from rendered UI and
   computed semantics
6. **Better design-to-code context** - agents reproduce and extend real
   layout patterns faster

Pillar 1 is the mission. Pillars 2-6 are how the mission manifests in daily work.

---

## Messaging by Persona

### Frontend developers

**Your AI can read the repo. ViewGraph helps it understand the page.**

- Stop hand-feeding screenshots and selector guesses to your agent
- Generate tests from live UI context
- Refactor without losing track of what actually changed

### QA and test automation

**Turn exploratory findings into machine-usable artifacts.**

- Stop handing devs screenshots with vague arrows
- Find missing test IDs before automation breaks
- Pass real page context into the dev workflow

### Engineering managers

**Reduce UI debugging time and improve agent output quality.**

- Fewer fragile tests
- Faster bug triage
- More grounded AI-assisted development

### Design systems / platform teams

**Standardize how teams capture and reason about live UI.**

- Catch drift
- Audit consistency
- Create reusable page context for automation and documentation

---

## Hero Workflow

**Capture page -> generate tests -> compare regressions**

Why this is the hero:
- Easy to understand
- Obviously useful
- Concrete ROI
- Attractive to developers immediately
- Naturally expands into QA and CI

### One capture, four outcomes

From one live page capture, your team can:
1. Generate tests
2. Find missing test IDs
3. Audit accessibility
4. Compare regressions

---

## Objection Handling

### "Why not just use a screenshot?"

Because screenshots help humans, not agents.

### "Why not just use raw DOM?"

Because raw DOM is noisy, bloated, and often poor at representing live UI
intent.

### "Why not use accessibility trees only?"

Because accessibility trees are valuable, but they miss visual layout and
styling context.

### "Why not just let the agent inspect the page itself?"

Because many workflows happen outside the browser session, across teams,
in IDEs, or asynchronously through artifacts and MCP tools.

---

## Landing Page Structure

1. **Hero:** Stop making coding agents guess your UI. CTA: Watch demo / Try capture workflow
2. **The problem:** AI coding tools understand code well. They still struggle with the rendered page.
3. **The solution:** ViewGraph captures layout, selectors, elements, styles, relationships, screenshots, and metadata, then exposes that context to agentic tools through MCP.
4. **One capture, four outcomes:** Generate tests, find missing test IDs, audit accessibility, compare UI changes.
5. **Use cases by role:** Developer, QA, team lead
6. **Demo proof:** Short clips plus downloadable example files
7. **Compatibility:** Works with MCP-capable agentic tools
8. **CTA:** Try demo / join waitlist / install beta

---

## Content Strategy

### Content type 1: Demo clips (2-4 min)

- Generate tests from capture
- Detect missing test IDs
- Compare captures for regression
- Audit accessibility
- QA handoff workflow

### Content type 2: Before vs after posts

Format: "Agent without ViewGraph" vs "Agent with ViewGraph"

Best for X, LinkedIn, Reddit, dev communities. The contrast sells harder
than ten paragraphs.

### Content type 3: Technical teardown posts

- Why screenshots are not enough for coding agents
- Why raw DOM is too noisy for UI-aware AI workflows
- Why test generation breaks without real page context
- What QA handoff is missing in agentic teams

### Content type 4: Prompt packs

Exact prompts with real outputs:
- Generate Playwright tests
- Compare two captures
- Audit this form for accessibility
- Find missing selectors

Developers love stealing working prompts. Let them.

### Content type 5: Example artifact gallery

Downloadable capture files, screenshots, and resulting outputs. Creates
trust fast.

---

## Channels

### High priority

- GitHub repo (README, examples, docs)
- Landing page
- X / Twitter dev audience
- LinkedIn (engineering leaders, QA)
- Reddit (selective)
- Hacker News (only when demo quality is strong)
- Product communities: Claude Code, Cursor, Kiro, MCP ecosystem

### Community angles

- Playwright
- Frontend testing
- Browser automation
- AI coding tools
- MCP ecosystem
- DX / developer tooling

---

## GTM Sequence

**Day 1:** Sell a painful workflow first - UI test generation and regression
review for agentic IDE users. Focused, demonstrable, believable.

**Then expand into:**
1. QA handoff
2. Accessibility
3. Design system audits
4. CI / preview environment workflows

Do not try to sell a platform on day one.

---

## Short Pitch

ViewGraph turns live web pages into structured context that coding agents
can actually use. Instead of relying on screenshots, raw DOM, or UI
guesswork, agents get page layouts, interactive elements, selectors, styles,
and relationships for better testing, auditing, regression review, and
UI-aware development.

---

## Next Marketing Assets to Build

1. Landing page copy deck
2. Messaging matrix by persona
3. 30-day content launch plan built around the first 5 demos
