# Who Benefits?

ViewGraph separates the human skill (seeing what's wrong) from the technical skill (knowing the DOM). Anyone who can see a problem can report it with enough precision for an AI agent or developer to fix it.

---

{% tabs %}

{% tab title="Developers" %}

### Frontend developers (senior, mid, junior)

See a bug, click it, describe it, send to your agent. Works with Kiro, Claude Code, Cursor, Windsurf, Cline, and any MCP-compatible agent.

- Annotate visual bugs and send to agent for instant fixes
- Run `@vg-audit` for automated accessibility + layout + testid audits
- Set baselines and detect structural regressions between deploys
- Generate Playwright tests from captures with `@vg-tests`
- Toggle idea mode to capture feature ideas with full DOM context

### Backend, cloud, and data engineers

You understand distributed systems but not why `z-index: auto` creates a new stacking context. Click what's broken, describe it, let the agent handle the CSS.

- Fix simple UI bugs yourself with agent assistance - no CSS expertise needed
- Report frontend issues to the frontend team with element-level precision
- Fix Streamlit/Gradio/Jupyter dashboard styling by annotating and sending to agent

### New developers and career switchers

Bootcamp graduates, workforce program participants, juniors in their first role. You know something looks wrong but can't articulate the technical cause. You don't have to.

- Report bugs without knowing CSS terminology - just describe what you see
- Use `find_source` to discover which file renders an element
- Learn from the agent's fixes - see which properties it changed and why
- Build a portfolio of real bug fixes without deep frontend knowledge

{% endtab %}

{% tab title="Testing & QA" %}

### QA testers and reviewers

No AI agent needed. Click elements, add comments, export as markdown for Jira or a ZIP report with screenshots.

- Annotate bugs with element-level evidence: selector, styles, viewport, network state
- Export as markdown - paste directly into Jira, Linear, or GitHub Issues
- Download ZIP reports with cropped screenshots per annotation
- Check the Inspect tab for network failures and console errors

### Distributed and offshore QA teams

File bugs that developers can act on without a synchronous call to clarify "what exactly is broken."

- Self-contained bug reports with all context - no follow-up needed
- Capture responsive issues at specific breakpoints with viewport data
- Record multi-step flows as sessions so developers can replay the journey

### Accessibility specialists

WCAG auditors who know the standards but aren't frontend developers.

- Run `@vg-a11y` for a deep audit with automatic source fixes
- Identify missing alt text, form labels, ARIA attributes, contrast failures
- Track accessibility improvements across captures with baseline comparison

{% endtab %}

{% tab title="Product & Design" %}

### Product managers

Entering the world of agentic coding. Click what looks wrong, describe it in plain language, send to the agent.

- File precise bug reports by clicking - not by writing technical descriptions
- Verify design implementation matches the spec using captured computed styles
- Toggle idea mode (lightbulb icon) to capture feature ideas with full UI context
- Run `@vg-ideate` to transform idea annotations into structured specs with requirements and tasks
- Mix bug reports and feature ideas in one session - bugs get fixed, ideas become specs

### Founders and product thinkers

You look at your app and see what it could become. Idea mode captures that vision.

- Walk through your app, click elements, toggle the lightbulb, describe what you want
- Each idea carries the DOM context - the agent knows exactly where and what you're looking at
- `@vg-ideate` generates a buildable spec from your annotations - no blank-document syndrome
- Hand the spec to your team or your AI agent - both have enough context to build without asking "where does this go?"

### Designers

Review implementation against your designs with pixel-level evidence.

- Check cross-page consistency for design-system compliance
- Review UI changes in pull requests with rendered-state evidence
- Compare component behavior across pages to detect drift

{% endtab %}

{% tab title="Platform & Ops" %}

### DevOps and SRE teams

Maintaining dashboards and internal tools you didn't build.

- Capture the state of internal dashboards when something looks off
- File precise issues for the frontend team with element-level context
- Compare dashboard state before and after infrastructure changes

### Frontend onboarding (any team)

New team members who shouldn't need tribal knowledge to find which file renders what.

- Use `find_source` to discover which component renders any element
- Compare your changes against baselines to catch unintended regressions
- Learn the codebase through the agent's source-linking

{% endtab %}

{% endtabs %}
