# Generate Feature Specs from UI

Turn screen-staring into structured feature specs. Instead of writing requirements from memory, annotate the actual UI with your ideas and let your AI agent generate the spec.

---

## The Idea Behind Idea Mode

Every product improvement starts the same way: someone looks at the app and thinks "this could be better." The problem is what happens next. That thought gets lost in a Slack message, a sticky note, or a mental TODO that never materializes.

ViewGraph's idea mode (the lightbulb icon) captures that moment of inspiration with full context - the element you're looking at, the page layout, the surrounding components, the computed styles. When you're ready, `@vg-ideate` transforms those contextual ideas into a structured spec with requirements and implementation tasks.

**The workflow:**

```
Look at your app → Spot an opportunity → Click the element → Toggle lightbulb
→ Describe the idea → Send to agent → @vg-ideate → Spec files generated
```

This works for anyone - founders brainstorming features, PMs doing product reviews, developers spotting improvements during code review, designers evaluating the live product. You don't need to write a spec from scratch. You annotate what you see, and the agent writes the spec grounded in the actual UI.

---

## When to use this

- You're reviewing a page and think "this needs a chart widget"
- A PM wants to describe a feature but can't write technical specs
- You're onboarding to a codebase and want to propose improvements with context
- You're doing a design review and want to capture enhancement ideas alongside bugs

## Step by step

### 1. Open your app and activate ViewGraph

Click the ViewGraph toolbar icon. The sidebar opens.

### 2. Select elements and toggle idea mode

Click an element where you want the new feature. In the annotation panel:
- Click the **lightbulb icon** in the panel header (or select "Idea" from the category dropdown)
- The panel border turns yellow - you're in idea mode
- Severity hides (ideas don't need severity)

### 3. Describe your idea

Write what you want in the comment box:
- "Add a dark mode toggle in this header"
- "This table needs export to CSV and PDF"
- "Show a revenue chart above these stats cards"
- "Add search/filter to this user list"

You can mix ideas with bug reports in the same session. Ideas get a yellow lightbulb badge, bugs get their normal colored badge.

### 4. Use Page mode for broader ideas

Click "Page" in the mode bar for ideas that aren't tied to a specific element:
- "This page needs a breadcrumb navigation"
- "Add keyboard shortcuts for common actions"
- "The mobile layout needs a hamburger menu"

### 5. Send to Agent

Click "Send to Agent". All annotations (bugs and ideas) are sent together.

### 6. Generate the spec

Tell your agent:

```
@vg-ideate
```

The agent reads your idea annotations with full DOM context and generates:
- **requirements.md** - feature requirements with user stories and acceptance criteria
- **tasks.md** - implementation tasks with element context

The spec is grounded in the actual UI - the agent knows what elements exist, what the layout looks like, and what components are nearby.

## What the agent sees

When you annotate a table and write "Add export to CSV", the agent receives:
- Your comment: "Add export to CSV"
- The table's structure: columns, row count, data types
- Surrounding elements: buttons, headers, filters
- The page URL and viewport
- Component names (if React/Vue detected)

This context makes the generated spec specific, not generic. Instead of "add an export button somewhere", the spec says "add an export button in the toolbar above the 5-column user table at `/admin/users`."

## Tips

- **Be specific about placement**: "Add a toggle *in the header next to the logo*" is better than "Add a toggle"
- **Describe the outcome**: "Users should be able to filter by date range" not just "Add filtering"
- **Mix bugs and ideas**: Fix what's broken AND propose what's missing in one session
- **Use Page mode for layout ideas**: "Add a sidebar navigation" doesn't need a specific element

---

## From Brainstorm to Buildable Spec

The real power of idea mode is the pipeline it creates:

### 1. Brainstorm session (5-10 minutes)

Open your app. Walk through it as a user. Every time you think "this could be better," click the element and toggle the lightbulb. Don't filter yourself - capture every idea, big or small:

- "Add bulk select to this table"
- "This empty state needs an illustration and a CTA"
- "Show a progress bar during file upload"
- "The mobile layout needs a bottom nav"

You'll end up with 5-15 idea annotations in one session.

### 2. Generate the spec

```
@vg-ideate
```

The agent reads all your idea annotations with their DOM context and generates:

- **requirements.md** - each idea becomes a numbered feature requirement with user stories and acceptance criteria, grounded in the actual page structure
- **tasks.md** - implementation tasks with element selectors, file paths (via `find_source`), and component context

### 3. Refine and prioritize

The generated spec is a starting point. Review it with your team, reorder priorities, split large features into phases. The spec already has the technical context baked in - you're editing for scope and priority, not researching DOM structure.

### 4. Build

Each task in the spec references the actual UI element and its source file. Hand it to a developer or an AI agent - either one has enough context to implement without asking "where does this go?"

### Why this works better than a blank document

| Starting from scratch | Starting from idea annotations |
|---|---|
| "We need better tables" | "Add sort, filter, and CSV export to the 5-column user table at `/admin/users`" |
| "Improve the onboarding flow" | "Step 2 needs a progress indicator - currently no visual feedback between steps" |
| "Add dark mode" | "Add a dark mode toggle in the header, next to the existing settings gear icon" |

The annotations carry context that a blank document never has: which element, which page, what's nearby, what already exists.

<!-- Screenshots of idea mode lightbulb toggle and generated spec will be added here -->
