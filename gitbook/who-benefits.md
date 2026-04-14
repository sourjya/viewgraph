# Who Benefits?

ViewGraph separates the human skill (seeing what's wrong) from the technical skill (knowing the DOM). Anyone who can see a problem can now report it with enough precision for an AI agent or developer to fix it.

---

## Developers

### Senior and mid-level frontend developers

The primary audience. You see a bug, click it, describe it, send to your agent. The agent receives the element's exact selector, computed styles, accessibility state, and your comment. It finds the source file and fixes the code.

**Use cases:**
- Annotate visual bugs and send to agent for instant fixes
- Run `@vg-audit` for automated accessibility + layout + testid audits
- Set baselines and detect structural regressions between deploys
- Generate Playwright tests from captures with `@vg-tests`
- Compare pages for design-system consistency drift

### Junior developers

You know something looks wrong but can't articulate "the z-index stacking context on the dropdown is lower than the sibling positioned element." You don't have to. Click the dropdown, write "this is behind the other thing," and the agent gets the exact z-index values, stacking contexts, and element hierarchy it needs to fix it.

**Use cases:**
- Report bugs without knowing CSS terminology - just describe what you see
- Learn from the agent's fixes - see which CSS properties it changed and why
- Use `find_source` to discover which file renders an element instead of asking a senior dev
- Build confidence with frontend debugging through structured capture data

### Bootcamp graduates

12-16 week programs produce developers who can build React apps but struggle debugging computed styles, stacking contexts, and layout overflow. ViewGraph bridges the gap between "I can build it" and "I can debug it."

**Use cases:**
- Debug layout issues by capturing the page state instead of guessing in DevTools
- File precise bug reports during your first job without looking inexperienced
- Use the Inspect tab to understand network failures and console errors in context
- Accelerate from "I need help" to "I found the issue" with structured evidence

### Backend and cloud engineers

AWS, Azure, GCP engineers who build APIs and infrastructure but get pulled into full-stack work. You understand distributed systems but not why `z-index: auto` creates a new stacking context.

**Use cases:**
- Report frontend issues to the frontend team with element-level precision
- Fix simple UI bugs yourself with agent assistance - no CSS expertise needed
- Capture the state of internal dashboards and admin tools you maintain but didn't build
- Compare before/after when your API changes affect the frontend

### Career switchers and workforce programs

Adults switching from non-tech backgrounds through programs like AWS re/Start, Google Career Certificates, or Microsoft LEAP. You're learning to code with AI agents from day one.

**Use cases:**
- Contribute to UI work immediately - click what looks wrong, describe it, let the agent fix it
- Build a portfolio of real bug fixes without deep frontend knowledge
- Learn browser concepts gradually through the capture data the agent uses
- Pair with AI agents as a learning tool - see what the agent sees, understand what it changes

### Data scientists and ML engineers

Building Streamlit, Gradio, or Jupyter dashboards. You know Python but not CSS. When the dashboard layout breaks, you need to describe it, not debug it.

**Use cases:**
- Fix dashboard styling issues by annotating and sending to agent
- Capture the state of data visualization pages for comparison across deployments
- Report UI issues in internal tools without learning frontend debugging

---

## Testing and QA

### QA testers and reviewers

No AI agent needed. Click elements, add comments, export as markdown for Jira or a ZIP report with screenshots. The structured output replaces vague "the button looks wrong" tickets.

**Use cases:**
- Annotate bugs with element-level evidence: selector, styles, viewport, network state
- Export as markdown - paste directly into Jira, Linear, or GitHub Issues
- Download ZIP reports with cropped screenshots per annotation
- Check the Inspect tab for network failures and console errors that explain the bug

### Distributed and offshore QA teams

Testers in different time zones who need to file bugs that developers can act on without a synchronous call to clarify "what exactly is broken."

**Use cases:**
- File self-contained bug reports with all context - no follow-up needed
- Capture responsive issues at specific breakpoints with viewport data included
- Record multi-step flows as sessions so developers can replay the journey
- Compare captures across environments (staging vs production) to verify fixes

### Accessibility specialists

WCAG auditors who know the standards but aren't frontend developers. ViewGraph's accessibility audit (powered by axe-core with 100+ rules) identifies violations, and the agent can fix the code.

**Use cases:**
- Run `@vg-a11y` for a deep audit with automatic source fixes
- Identify missing alt text, form labels, ARIA attributes, and contrast failures
- Track accessibility improvements across captures with baseline comparison
- Generate structured a11y reports for compliance documentation

---

## Non-Technical Stakeholders

### Product managers and designers

Entering the world of agentic coding. Click what looks wrong, describe it in plain language, send to the agent or export as a structured report. No CSS selectors, no DevTools, no "inspect element."

**Use cases:**
- File precise bug reports by clicking - not by writing technical descriptions
- Verify design implementation matches the spec using captured computed styles
- Review UI changes in pull requests with rendered-state evidence
- Check cross-page consistency for design-system compliance

### Technical writers

Documenting UI flows and capturing page state for documentation. ViewGraph provides structured page data that writers can reference precisely.

**Use cases:**
- Capture exact element names, selectors, and layout for documentation accuracy
- Record multi-step user journeys as sessions for walkthrough documentation
- Verify documentation screenshots match the current UI state

---

## Platform and Operations

### DevOps and SRE teams

Maintaining monitoring dashboards, internal tools, and status pages you didn't build. When something looks wrong, you need to report it precisely without frontend expertise.

**Use cases:**
- Capture the state of internal dashboards when something looks off
- File precise issues for the frontend team with element-level context
- Compare dashboard state before and after infrastructure changes
- Monitor key pages for structural regressions using baselines

### Frontend onboarding (any team)

New team members who shouldn't need tribal knowledge to understand which piece of UI comes from where.

**Use cases:**
- Use `find_source` to discover which component renders any element
- Capture pages to understand the current UI structure before making changes
- Compare your changes against baselines to catch unintended regressions
- Learn the codebase through the agent's source-linking instead of asking teammates
