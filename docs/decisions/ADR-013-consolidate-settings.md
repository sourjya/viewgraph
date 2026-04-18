# ADR-013: Consolidate Settings into Sidebar Panel

- **Status**: Accepted
- **Date**: 2026-04-19

## Context

The current settings experience has two layers:
1. **Sidebar Settings** - a slide-over panel with capture toggles (JSON/HTML/Screenshot), server card, and links
2. **Advanced Settings** (options page) - opened via "All servers" link, shows multi-project server list

The sidebar settings panel has significant blank space. The advanced settings page duplicates some info and requires leaving the sidebar context. The footer (status dot, shield, gear, settings link) disappears when settings is open, losing connection status visibility.

## Decision

### Phase 1: Footer visibility in settings (immediate)
- Footer status row (dot + shield) remains visible when settings panel is open
- Remove gear icon and "Settings" link from footer when settings is showing (redundant)
- Settings panel sits between the tab content and the footer, not replacing the footer

### Phase 2: Consolidate advanced settings (future)
- Move "All servers" list into the sidebar settings panel as a collapsible section
- Remove the separate options page
- Use the sidebar's blank space for server list, URL patterns, and project info

## Design Rules

All settings UI must follow the existing theme:
- **Toggles** (not checkboxes) for on/off settings - match existing capture toggle style
- **Themed dialogs** for destructive actions (clear captures, reset config)
- **Consistent spacing** - 6px/8px padding, 4px gaps, matching existing sidebar modules
- **COLOR constants** from `styles.js` - no hardcoded colors
- **data-tooltip** for icon-only buttons
- **Keyboard accessible** - all controls reachable via Tab, toggleable via Enter/Space

## Consequences

- Phase 1: Modify `annotation-sidebar.js` settings show/hide to preserve footer
- Phase 2: Extend `settings.js` with server list section, remove options page
- Update screenshots after each phase
