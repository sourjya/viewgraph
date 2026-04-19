# F20: Transient UI State Capture - Design

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Extension Content Script                                 │
│                                                          │
│  ┌──────────────────┐    ┌─────────────────────────┐   │
│  │ MutationObserver  │───▶│ Ring Buffer (100 entries)│   │
│  │ (childList+attrs) │    │ 30s retention            │   │
│  └──────────────────┘    └─────────────────────────┘   │
│           │                          │                   │
│           │ toast heuristic          │ on capture        │
│           ▼                          ▼                   │
│  ┌──────────────────┐    ┌─────────────────────────┐   │
│  │ Style Snapshot    │    │ Issue Analyzer           │   │
│  │ (position:fixed   │    │ - toast-no-aria-live     │   │
│  │  + z-index > 100) │    │ - flash-content          │   │
│  └──────────────────┘    │ - animation-jank          │   │
│                           │ - rapid-reflow            │   │
│  ┌──────────────────┐    └─────────────────────────┘   │
│  │ Animation Snapshot│               │                   │
│  │ getAnimations()   │               ▼                   │
│  └──────────────────┘    ┌─────────────────────────┐   │
│                           │ transient enrichment     │   │
│                           │ { issues, timeline,      │   │
│                           │   animations, summary }  │   │
│                           └─────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Data Model

### Ring Buffer Entry
```typescript
interface BufferEntry {
  timestamp: number;          // Date.now()
  action: 'added' | 'removed';
  selector: string;           // CSS selector via existing ue() helper
  text: string;               // First 100 chars of textContent
  isToast: boolean;           // Matches toast heuristic
  styles?: {                  // Only captured for toast elements
    position: string;
    zIndex: string;
    opacity: string;
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  ariaLive?: string | null;   // aria-live value on element or ancestor
  role?: string | null;       // role attribute
}
```

### Transient Enrichment Output
```typescript
interface TransientEnrichment {
  issues: TransientIssue[];
  timeline: TimelineEntry[];
  animations: AnimationEntry[];
  summary: { transientElements: number; issues: number; activeAnimations: number };
}

interface TransientIssue {
  type: 'toast-no-aria-live' | 'flash-content' | 'animation-jank' | 'rapid-reflow';
  severity: 'critical' | 'major' | 'minor' | 'warning';
  message: string;            // Human-readable, agent-actionable
  selector: string;
  text?: string;
  lifespan?: number;          // ms
  evidence: Record<string, unknown>;
}

interface TimelineEntry {
  t: number;                  // ms relative to capture (negative = before)
  action: 'added' | 'removed';
  selector: string;
  text?: string;
  lifespan?: number;          // Only on 'removed' entries
}

interface AnimationEntry {
  selector: string;
  name: string;               // CSS animation-name or 'transition'
  duration: number;           // ms
  progress: number;           // 0.0 - 1.0
  properties: string[];       // Animated CSS properties
  isLayoutTrigger: boolean;   // Uses top/left/width/height
}
```

## Component Design

### transient-collector.js

```
extension/lib/collectors/transient-collector.js
```

**Exports:**
- `startTransientObserver()` - begins buffering (called on sidebar open)
- `stopTransientObserver()` - stops buffering, clears state (called on sidebar close)
- `collectTransient()` - analyzes buffer, returns enrichment (called during capture)

**Internal state:**
- `buffer: BufferEntry[]` - ring buffer, max 100 entries
- `observer: MutationObserver | null`
- `elementTimestamps: Map<string, number>` - tracks when elements were added (for lifespan calc)

### Toast Heuristic

An element matches the toast heuristic if ALL of:
1. `position` is `fixed` or `absolute`
2. `z-index` > 100 (above normal content)
3. Not inside `[data-vg-annotate]` (not ViewGraph UI)
4. Has visible text content (not empty/whitespace-only)

When a matching element is added:
- Immediately compute and store its styles (before it can be removed)
- Check for `aria-live` on the element or any ancestor up to `<body>`
- Check for `role="alert"` or `role="status"`

### Animation Analysis

On capture, call `document.getAnimations()` and for each:
1. Get `effect.target` - the animated element
2. Get `effect.getKeyframes()` - the property values
3. Check if any animated property is in the layout-trigger set: `top`, `left`, `right`, `bottom`, `width`, `height`, `margin*`, `padding*`
4. Get `effect.getComputedTiming()` - duration, progress

### Issue Detection Rules

| Rule | Trigger | Severity | Message template |
|---|---|---|---|
| toast-no-aria-live | Toast element without aria-live/role on self or ancestor | major | "{text}" appeared without aria-live - screen readers won't announce it |
| flash-content | Element lifespan < 500ms with text | warning | Element appeared for {lifespan}ms - may be too fast to read |
| animation-jank | Animation uses layout property | minor | Animating {property} causes layout recalc - use transform instead |
| rapid-reflow | Same selector added/removed 3+ times in 5s | major | {selector} added/removed {count} times in {duration}s - possible render loop |

### Inspect Tab Integration

New section in `extension/lib/sidebar/diagnostics.js`:

```
⚡ Transient ({issueCount} issues)
  [severity icon] [message]                    [+] [📋]
  [severity icon] [message]                    [+] [📋]
  
  Timeline (last 30s):
    -{seconds}s  {selector} {action} "{text}"
```

- Copy button copies all issues + timeline as text
- Note button creates annotation with issue summary + timeline as diagnostic data
- Section hidden when no transient elements observed

## Integration Points

1. **enrichment.js** - add `transient: collectTransient()` to `collectAllEnrichment()`
2. **diagnostics.js** - add transient section after existing sections
3. **annotation-sidebar.js** - call `startTransientObserver()` in `create()`, `stopTransientObserver()` in `destroy()`
4. **Capture JSON** - `transient` key at top level (same as network, console, etc.)

## Performance Analysis

| Operation | When | Cost | Frequency |
|---|---|---|---|
| MutationObserver callback | Every DOM change | < 1ms (push to array) | High |
| Toast style capture | Element matches heuristic | < 5ms (getComputedStyle) | Rare (1-5 per session) |
| Buffer eviction | Buffer exceeds 100 | O(1) shift | Rare |
| collectTransient() | On capture | < 50ms (iterate buffer + getAnimations) | On user action |

Total memory: ~50KB worst case (100 entries x ~500 bytes each).
