# Keyboard Shortcuts

ViewGraph supports keyboard shortcuts when the sidebar is open in annotate mode. All shortcuts work in both Chrome and Firefox.

## Shortcuts

| Shortcut | Action | Context |
|---|---|---|
| `Esc` | Dismiss help card, or deselect element, or collapse sidebar | Always active |
| `Ctrl+Enter` (`Cmd+Enter` on Mac) | Send annotations to AI agent via MCP | When annotations exist |
| `Ctrl+Shift+C` (`Cmd+Shift+C` on Mac) | Copy markdown report to clipboard | When annotations exist |
| `1` | Set severity to Critical on selected annotation | When annotation is selected |
| `2` | Set severity to Major on selected annotation | When annotation is selected |
| `3` | Set severity to Minor on selected annotation | When annotation is selected |
| `Delete` / `Backspace` | Delete selected annotation | When annotation is selected |
| `Ctrl+Shift+B` (`Cmd+Shift+B` on Mac) | Toggle collapse/expand sidebar | Always active |
| `Ctrl+Shift+X` (`Cmd+Shift+X` on Mac) | Close panel entirely (exit annotation mode) | Always active |

## Mouse Controls

| Action | What it does |
|---|---|
| Click element | Select element and open annotation panel |
| Shift+drag | Select a region (multiple elements) |
| Scroll wheel (while hovering) | Navigate up/down the DOM tree |

## When Shortcuts Are Active

Shortcuts are active whenever the ViewGraph sidebar is open. They are disabled when:

- You are typing in a text input or textarea on the page
- You are typing in the ViewGraph annotation comment box
- The sidebar is collapsed to the strip

## Escape Key Behavior

The Escape key has layered behavior:

1. If the help card is open, Escape closes the help card
2. If an annotation panel is open, Escape closes the panel
3. Otherwise, Escape collapses the sidebar to the strip

## Accessing Help

Click the `?` button in the sidebar header to see the shortcuts cheat sheet. The help card also links to this page and the full documentation.
