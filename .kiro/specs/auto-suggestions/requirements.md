# F15: Auto-Inspect Suggestions

## Requirements

1. When the user opens ViewGraph on any page, the extension automatically scans for UI issues using existing collectors (a11y, network, console, landmarks, stacking, focus, testid coverage).
2. Detected issues are aggregated into a ranked list of 5-10 actionable suggestions, displayed in the sidebar.
3. Each suggestion identifies a specific element (with selector), describes the problem, and categorizes it by severity (error, warning, info).
4. The user can select individual suggestions via checkboxes and send only the selected ones to the agent.
5. Selected suggestions become real annotations with the target element pre-selected, diagnostic data attached, and a clear description - so the agent has full DOM context.
6. Suggestions deduplicate against existing annotations - if the user already annotated an element, it does not appear as a suggestion.
7. Suggestions are grouped into three tiers: Accessibility, Quality, and Testability.
8. The scan runs on sidebar open (not on every page load) to respect performance.
9. A "Refresh" button re-runs the scan to pick up changes after fixes.
10. The suggestion count appears as a badge on the Review tab (e.g., "5 suggestions") so the user knows issues were found without switching views.
11. Users can dismiss individual suggestions (marks them as "won't fix" for this session).
12. The feature works standalone (no MCP server required) - suggestions are local to the extension.
