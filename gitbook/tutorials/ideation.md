# Generate Feature Specs from UI

Turn screen-staring into structured feature specs. Instead of writing requirements from memory, annotate the actual UI with your ideas and let your AI agent generate the spec.

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
