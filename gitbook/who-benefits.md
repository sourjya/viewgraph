# Who Benefits?

ViewGraph lowers the technical barrier for everyone who interacts with UI. You don't need to speak DOM - you point at what's wrong and describe it in plain language. The tool captures the technical details automatically.

## Developers with AI Agents

The primary audience. See a bug, click it, describe it, send to agent, agent fixes it. 30 seconds from spotting a bug to the agent having full context. Works with Kiro, Claude Code, Cursor, Windsurf, Cline, and any MCP-compatible agent.

## Junior Developers

You know something looks wrong but can't articulate "the z-index stacking context on the dropdown is lower than the sibling positioned element." You don't have to. Click the dropdown, write "this is behind the other thing," and the agent gets the exact z-index values, stacking contexts, and element hierarchy it needs to fix it.

## Bootcamp Graduates

12-16 week programs (General Assembly, Flatiron, Le Wagon) produce developers who can build React apps but struggle debugging computed styles, stacking contexts, and layout overflow. ViewGraph bridges the gap between "I can build it" and "I can debug it" by capturing the browser state they can't yet read from DevTools.

## Career Switchers and Workforce Programs

Adults switching from non-tech backgrounds through programs like AWS re/Start, Google Career Certificates, or Microsoft LEAP. They're learning to code with AI agents from day one. ViewGraph lets them contribute to UI work immediately - click what looks wrong, describe it in plain English, let the agent handle the CSS.

## Backend and Cloud Engineers

AWS, Azure, GCP engineers who build APIs and infrastructure but get pulled into full-stack work. They understand distributed systems but not why `z-index: auto` creates a new stacking context. ViewGraph captures the browser-specific details so they can file precise frontend issues without becoming CSS experts.

## Data Scientists and ML Engineers

Building Streamlit, Gradio, or Jupyter dashboards. They know Python but not CSS. When the dashboard layout breaks, they need to describe it, not debug it. ViewGraph captures the layout state so the agent can fix the styling.

## QA Testers and Reviewers

No AI agent needed. Click elements, add comments, export as markdown for Jira or a ZIP report with screenshots. The structured output replaces vague "the button looks wrong" tickets with element-level evidence including computed styles, selectors, and network state.

## Distributed and Offshore QA Teams

Testers in different time zones who need to file bugs that developers can act on without a synchronous call to clarify "what exactly is broken." ViewGraph captures produce self-contained bug reports with all the context a developer needs.

## Product Managers and Designers

Non-technical stakeholders entering the world of agentic coding. Click what looks wrong, describe it in plain language, send to the agent or export as a structured report. No CSS selectors, no DevTools, no "inspect element." The annotation workflow is as simple as pointing and typing.

## DevOps and SRE Teams

Maintaining monitoring dashboards, internal tools, and status pages they didn't build. When something looks wrong, they need to report it precisely without frontend expertise. ViewGraph captures the page state so the right team can fix it.

## Accessibility Specialists

WCAG auditors who know the standards but aren't frontend developers. ViewGraph's accessibility audit (powered by axe-core) identifies violations, and the agent can fix the code. The specialist focuses on what's wrong; the agent handles where and how to fix it.

## Technical Writers

Documenting UI flows and capturing page state for documentation. ViewGraph provides structured page data - element names, selectors, layout - that writers can reference precisely instead of relying on screenshots that go stale.

## Frontend Onboarding

New team members who shouldn't need tribal knowledge to understand which piece of UI comes from where. ViewGraph externalizes the browser-to-component mapping that usually lives only in senior engineers' heads, making source discovery and UI inspection repeatable for new contributors.

---

The common thread: **ViewGraph separates the human skill (seeing what's wrong) from the technical skill (knowing the DOM).** Anyone who can see a problem can now report it with enough precision for an AI agent or developer to fix it.
