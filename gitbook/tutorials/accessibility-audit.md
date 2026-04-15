# Run an Accessibility Audit

Find and fix WCAG accessibility violations automatically.

**Watch the walkthrough** - Accessibility Audit with ViewGraph:

{% embed url="https://www.youtube.com/watch?v=ybYn-71Iut8" %}

## Prerequisites

* ViewGraph extension installed and connected
* A page captured (click ViewGraph icon, then Send to Agent)

## Step 1: Run the audit

Tell your agent:

```
@vg-audit
```

Or the longer version: "Run an accessibility audit on the latest capture."

The agent calls `audit_accessibility` which runs ViewGraph's built-in rules plus axe-core (100+ WCAG rules).

## Step 2: Review the findings

The agent reports issues grouped by severity:

| Severity | Example issues                                                                           |
| -------- | ---------------------------------------------------------------------------------------- |
| Error    | Missing alt text on images, buttons without accessible names, form inputs without labels |
| Warning  | Insufficient color contrast, empty aria-label attributes, missing form validation        |

Each issue includes the element's selector, the WCAG rule violated, and a suggested fix.

## Step 3: Auto-fix

Tell your agent:

```
@vg-a11y
```

This runs the deep audit AND automatically fixes error-level issues:

* Adds `alt` text to images based on context
* Adds `aria-label` to buttons and inputs
* Adds `<label>` elements to form fields
* Adjusts colors to meet WCAG AA contrast ratios (4.5:1)

Warning-level issues are listed but not auto-fixed - they need human judgment.

## Step 4: Verify

Capture the page again and re-run the audit:

```
Capture this page and run another accessibility audit
```

The agent compares before and after: "Fixed 4 issues, 0 new issues introduced."

## What gets checked

ViewGraph's built-in rules:

* `button-no-name` - buttons without text or aria-label
* `missing-alt` - images without alt attributes
* `missing-form-label` - inputs without associated labels
* `insufficient-contrast` - text that fails WCAG AA/AAA contrast
* `form-validation-error` - invalid form states

Plus axe-core's 100+ rules when available in the capture (covers landmarks, heading hierarchy, ARIA attribute validity, focus management, and more).
