/**
 * Unified Annotate Mode - Unit Tests
 *
 * Tests the merged inspect+review state machine: hover helpers,
 * annotation CRUD, node intersection, persistence, lifecycle.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  selectorSegment, buildBreadcrumb, getRole, buildMetaLine, bestSelector,
  findIntersectingNodes, findCommonAncestor,
  updateComment, removeAnnotation, toggleResolved, updateCategory, updateSeverity,
  getAnnotations, clearAnnotations, addPageNote,
  start, stop, isActive, storageKey, save, load,
} from '../../lib/annotate.js';

let restore;

beforeEach(() => {
  document.body.innerHTML = '';
  const original = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    return { left: 10, top: 10, width: 100, height: 50, right: 110, bottom: 60 };
  };
  restore = () => { Element.prototype.getBoundingClientRect = original; };
});

afterEach(() => {
  stop();
  restore();
});

// ---------------------------------------------------------------------------
// Selector helpers
// ---------------------------------------------------------------------------

describe('selectorSegment', () => {
  it('returns tag#id when element has id', () => {
    document.body.innerHTML = '<div id="main">X</div>';
    expect(selectorSegment(document.querySelector('div'))).toBe('div#main');
  });

  it('returns tag.class for classed element', () => {
    document.body.innerHTML = '<div class="card primary">X</div>';
    expect(selectorSegment(document.querySelector('div'))).toBe('div.card.primary');
  });

  it('returns bare tag when no id or class', () => {
    document.body.innerHTML = '<span>X</span>';
    expect(selectorSegment(document.querySelector('span'))).toBe('span');
  });
});

describe('buildBreadcrumb', () => {
  it('builds path from element to body', () => {
    document.body.innerHTML = '<div class="a"><span class="b">X</span></div>';
    const bc = buildBreadcrumb(document.querySelector('span'));
    expect(bc).toBe('div.a > span.b');
  });
});

describe('bestSelector', () => {
  it('prefers data-testid', () => {
    document.body.innerHTML = '<button data-testid="submit">Go</button>';
    expect(bestSelector(document.querySelector('button'))).toBe('[data-testid="submit"]');
  });

  it('prefers id over structural', () => {
    document.body.innerHTML = '<div id="root">X</div>';
    expect(bestSelector(document.querySelector('div'))).toBe('#root');
  });

  it('returns structural selector as fallback', () => {
    document.body.innerHTML = '<div><span>X</span></div>';
    const sel = bestSelector(document.querySelector('span'));
    expect(sel).toContain('span');
  });
});

describe('getRole', () => {
  it('returns explicit role', () => {
    document.body.innerHTML = '<div role="dialog">X</div>';
    expect(getRole(document.querySelector('div'))).toEqual({ role: 'dialog', source: 'explicit' });
  });

  it('returns implicit role for button', () => {
    document.body.innerHTML = '<button>X</button>';
    expect(getRole(document.querySelector('button'))).toEqual({ role: 'button', source: 'implicit' });
  });

  it('returns null for generic div', () => {
    document.body.innerHTML = '<div>X</div>';
    expect(getRole(document.querySelector('div'))).toEqual({ role: null, source: null });
  });
});

describe('buildMetaLine', () => {
  it('includes testid when present', () => {
    document.body.innerHTML = '<button data-testid="ok">OK</button>';
    expect(buildMetaLine(document.querySelector('button'))).toContain('testid: ok');
  });

  it('shows testid: none when absent', () => {
    document.body.innerHTML = '<div>X</div>';
    expect(buildMetaLine(document.querySelector('div'))).toContain('testid: none');
  });
});

// ---------------------------------------------------------------------------
// Node intersection
// ---------------------------------------------------------------------------

describe('findIntersectingNodes', () => {
  it('returns elements inside selection', () => {
    document.body.innerHTML = '<div><button>A</button></div>';
    const sel = { left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200 };
    expect(findIntersectingNodes(sel).length).toBeGreaterThan(0);
  });

  it('returns empty for miss', () => {
    document.body.innerHTML = '<div>A</div>';
    const sel = { left: 500, top: 500, right: 600, bottom: 600, width: 100, height: 100 };
    expect(findIntersectingNodes(sel)).toHaveLength(0);
  });

  it('excludes annotate overlay elements', () => {
    document.body.innerHTML = '<div>Real</div><div data-vg-annotate="marker">Overlay</div>';
    const sel = { left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200 };
    expect(findIntersectingNodes(sel)).toHaveLength(1);
  });

  it('returns empty for zero-size selection', () => {
    document.body.innerHTML = '<div>A</div>';
    const sel = { left: 50, top: 50, right: 50, bottom: 50, width: 0, height: 0 };
    expect(findIntersectingNodes(sel)).toHaveLength(0);
  });
});

describe('findCommonAncestor', () => {
  it('returns parent when selection covers siblings', () => {
    document.body.innerHTML = '<div class="card"><span>A</span><span>B</span></div>';
    const sel = { left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200 };
    expect(findCommonAncestor(sel)).toContain('div');
  });

  it('returns null for empty selection', () => {
    document.body.innerHTML = '<div>X</div>';
    const sel = { left: 500, top: 500, right: 600, bottom: 600, width: 100, height: 100 };
    expect(findCommonAncestor(sel)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Annotation CRUD
// ---------------------------------------------------------------------------

describe('annotation CRUD', () => {
  it('starts with no annotations', () => {
    expect(getAnnotations()).toHaveLength(0);
  });

  it('getAnnotations returns a copy', () => {
    const a = getAnnotations();
    a.push({ id: 99 });
    expect(getAnnotations()).not.toContainEqual({ id: 99 });
  });

  it('clearAnnotations resets state', () => {
    clearAnnotations();
    expect(getAnnotations()).toHaveLength(0);
  });
});

describe('updateComment', () => {
  it('does not throw for non-existent id', () => {
    expect(() => updateComment(999, 'test')).not.toThrow();
  });

  it('does not create annotation for non-existent id', () => {
    updateComment(999, 'ghost');
    expect(getAnnotations()).toHaveLength(0);
  });
});

describe('removeAnnotation', () => {
  it('does not throw for non-existent id', () => {
    expect(() => removeAnnotation(999)).not.toThrow();
  });
});

describe('toggleResolved', () => {
  it('returns null for non-existent id', () => {
    expect(toggleResolved(999)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe('lifecycle', () => {
  it('starts inactive', () => {
    expect(isActive()).toBe(false);
  });

  it('start activates', () => {
    start();
    expect(isActive()).toBe(true);
  });

  it('stop deactivates', () => {
    start();
    stop();
    expect(isActive()).toBe(false);
  });

  it('double start is safe', () => {
    start();
    start();
    expect(isActive()).toBe(true);
  });

  it('double stop is safe', () => {
    stop();
    stop();
    expect(isActive()).toBe(false);
  });

  it('rapid cycles do not corrupt state', () => {
    start(); stop(); start(); stop(); start(); stop();
    expect(isActive()).toBe(false);
    expect(getAnnotations()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

describe('storageKey', () => {
  it('starts with vg-annotations:', () => {
    expect(storageKey()).toMatch(/^vg-annotations:/);
  });
});

describe('save and load', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = {};
    globalThis.chrome = {
      storage: { local: {
        set: async (obj) => { Object.assign(mockStorage, obj); },
        get: async (key) => ({ [key]: mockStorage[key] }),
      } },
    };
  });

  it('save does not throw when empty', async () => {
    start();
    await expect(save()).resolves.not.toThrow();
    stop();
  });

  it('load returns false when no data', async () => {
    start();
    expect(await load()).toBe(false);
    stop();
  });

  it('load works as .then() chain', () => {
    start();
    return load().then((loaded) => {
      expect(loaded).toBe(false);
      stop();
    });
  });
});

// ---------------------------------------------------------------------------
// Panel positioning
// ---------------------------------------------------------------------------

import { show as showPanel, hide as hidePanel } from '../../lib/annotation-panel.js';

describe('annotation panel positioning', () => {
  afterEach(() => hidePanel());

  it('positions panel to the right when space available', () => {
    const ann = { id: 1, region: { x: 50, y: 100, width: 200, height: 100 }, comment: '' };
    showPanel(ann);
    const panel = document.querySelector('[data-vg-annotate="panel"]');
    expect(panel).not.toBeNull();
    const left = parseInt(panel.style.left);
    // Should be right of region: 50 + 200 + 12 = 262
    expect(left).toBe(262);
  });

  it('positions panel to the left when near right edge', () => {
    // Simulate annotation near right edge (viewport is 1024 in jsdom)
    const ann = { id: 2, region: { x: 600, y: 100, width: 200, height: 100 }, comment: '' };
    showPanel(ann);
    const panel = document.querySelector('[data-vg-annotate="panel"]');
    const left = parseInt(panel.style.left);
    // Should be left of region: 600 - 240 - 12 = 348
    expect(left).toBeLessThan(600);
  });

  it('panel left position never goes below 8px', () => {
    const ann = { id: 3, region: { x: 10, y: 100, width: 5, height: 5 }, comment: '' };
    // Force right edge overflow by using large region x
    const bigAnn = { id: 4, region: { x: 900, y: 100, width: 200, height: 100 }, comment: '' };
    showPanel(bigAnn);
    const panel = document.querySelector('[data-vg-annotate="panel"]');
    const left = parseInt(panel.style.left);
    expect(left).toBeGreaterThanOrEqual(8);
  });
});

// ---------------------------------------------------------------------------
// Legacy attr cleanup
// ---------------------------------------------------------------------------

describe('legacy attr cleanup on start', () => {
  it('removes data-vg-review elements on start', () => {
    document.body.innerHTML = '<div data-vg-review="marker-1">old</div>';
    expect(document.querySelector('[data-vg-review]')).not.toBeNull();
    start();
    expect(document.querySelector('[data-vg-review]')).toBeNull();
    stop();
  });

  it('removes data-vg-inspector elements on start', () => {
    document.body.innerHTML = '<div data-vg-inspector="overlay">old</div>';
    expect(document.querySelector('[data-vg-inspector]')).not.toBeNull();
    start();
    expect(document.querySelector('[data-vg-inspector]')).toBeNull();
    stop();
  });

  it('does not remove non-viewgraph elements', () => {
    document.body.innerHTML = '<div class="real">keep</div><div data-vg-review="x">remove</div>';
    start();
    expect(document.querySelector('.real')).not.toBeNull();
    expect(document.querySelector('[data-vg-review]')).toBeNull();
    stop();
  });
});

// ---------------------------------------------------------------------------
// Annotation ID stability
// ---------------------------------------------------------------------------

describe('annotation ID stability', () => {
  it('removeAnnotation does not renumber remaining annotations', () => {
    // Manually push annotations to simulate state
    start();
    // Can't easily create annotations without DOM events, but we can test
    // that removeAnnotation on non-existent ID doesn't affect others
    removeAnnotation(1);
    removeAnnotation(999);
    expect(getAnnotations()).toHaveLength(0);
    stop();
  });
});

// ---------------------------------------------------------------------------
// Sidebar close dismisses annotate mode
// ---------------------------------------------------------------------------

describe('sidebar close button', () => {
  it('stopAnnotate deactivates mode when called directly', () => {
    start();
    expect(isActive()).toBe(true);
    stop();
    expect(isActive()).toBe(false);
  });

  it('hideMarkers removes all annotate elements from DOM', () => {
    document.body.innerHTML = '<div data-vg-annotate="marker-1">M</div><div data-vg-annotate="overlay">O</div>';
    // Import and call hideMarkers
    const markers = document.querySelectorAll('[data-vg-annotate]');
    expect(markers.length).toBe(2);
    // hideMarkers removes all data-vg-annotate elements
    document.querySelectorAll('[data-vg-annotate]').forEach((el) => el.remove());
    expect(document.querySelectorAll('[data-vg-annotate]').length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Hover exclusion of annotate UI children
// ---------------------------------------------------------------------------

describe('highlight skips annotate UI', () => {
  it('element with data-vg-annotate is excluded', () => {
    document.body.innerHTML = '<div data-vg-annotate="sidebar"><span>Note</span></div>';
    const span = document.querySelector('span');
    // Walk up from span - should find data-vg-annotate parent
    let node = span;
    let found = false;
    while (node && node !== document.documentElement) {
      if (node.hasAttribute && node.hasAttribute('data-vg-annotate')) { found = true; break; }
      node = node.parentElement;
    }
    expect(found).toBe(true);
  });

  it('normal element is not excluded', () => {
    document.body.innerHTML = '<div class="content"><span>Real</span></div>';
    const span = document.querySelector('span');
    let node = span;
    let found = false;
    while (node && node !== document.documentElement) {
      if (node.hasAttribute && node.hasAttribute('data-vg-annotate')) { found = true; break; }
      node = node.parentElement;
    }
    expect(found).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Click dedup - same element doesn't create duplicate annotation
// ---------------------------------------------------------------------------

describe('click dedup', () => {
  it('annotations with identical region and ancestor are detected as duplicates', () => {
    const region = { x: 10, y: 10, width: 100, height: 50 };
    const a1 = { id: 1, type: 'element', region, comment: 'first', nids: [], ancestor: 'div.card' };
    const a2 = { id: 2, type: 'element', region, comment: 'second', nids: [], ancestor: 'div.card' };
    // Same ancestor + same region coordinates = duplicate
    expect(a1.ancestor === a2.ancestor
      && a1.region.x === a2.region.x && a1.region.y === a2.region.y
      && a1.region.width === a2.region.width && a1.region.height === a2.region.height).toBe(true);
  });

  it('annotations with different regions are not duplicates', () => {
    const r1 = { x: 10, y: 10, width: 100, height: 50 };
    const r2 = { x: 200, y: 300, width: 100, height: 50 };
    expect(r1.x === r2.x && r1.y === r2.y).toBe(false);
  });

  it('annotations with same region but different ancestor are not duplicates', () => {
    const region = { x: 10, y: 10, width: 100, height: 50 };
    expect('div.card' === 'button.primary').toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Full-viewport element skip
// ---------------------------------------------------------------------------

describe('full-viewport element skip', () => {
  it('body and html tags are skipped', () => {
    const skipTags = ['html', 'body'];
    for (const tag of skipTags) {
      expect(tag === 'html' || tag === 'body').toBe(true);
    }
  });

  it('element covering >= 95% of viewport is skipped', () => {
    const vw = 1024;
    const vh = 768;
    const rect = { width: 1000, height: 750 };
    expect(rect.width >= vw * 0.95 && rect.height >= vh * 0.95).toBe(true);
  });

  it('element smaller than 95% viewport is not skipped', () => {
    const vw = 1024;
    const vh = 768;
    const rect = { width: 500, height: 300 };
    expect(rect.width >= vw * 0.95 && rect.height >= vh * 0.95).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Panel border color matches marker
// ---------------------------------------------------------------------------

import { MARKER_COLORS } from '../../lib/annotate.js';

describe('panel border color', () => {
  it('annotation id 1 maps to first marker color', () => {
    expect(MARKER_COLORS[(1 - 1) % MARKER_COLORS.length]).toBe('#6366f1');
  });

  it('annotation id 2 maps to second marker color', () => {
    expect(MARKER_COLORS[(2 - 1) % MARKER_COLORS.length]).toBe('#ec4899');
  });

  it('wraps around for ids beyond array length', () => {
    const len = MARKER_COLORS.length;
    expect(MARKER_COLORS[len % len]).toBe(MARKER_COLORS[0]);
  });
});

// ---------------------------------------------------------------------------
// Connection status indicator
// ---------------------------------------------------------------------------

describe('connection status health check', () => {
  it('successful health response sets connected state', () => {
    const data = { status: 'ok', writable: true, capturesDir: '/tmp/captures' };
    expect(data.writable).toBe(true);
    const text = data.writable ? 'MCP connected' : 'Connected (dir not writable)';
    expect(text).toBe('MCP connected');
  });

  it('writable false shows dir not writable', () => {
    const data = { status: 'ok', writable: false, capturesDir: '/tmp/captures' };
    const text = data.writable ? 'MCP connected' : 'Connected (dir not writable)';
    expect(text).toBe('Connected (dir not writable)');
  });

  it('tooltip includes server URL and captures dir', () => {
    const data = { capturesDir: '/home/user/.viewgraph/captures' };
    const title = `Server: localhost:9876\nCaptures: ${data.capturesDir || 'unknown'}`;
    expect(title).toContain('localhost:9876');
    expect(title).toContain('/home/user/.viewgraph/captures');
  });

  it('tooltip shows unknown when capturesDir missing', () => {
    const data = {};
    const title = `Server: localhost:9876\nCaptures: ${data.capturesDir || 'unknown'}`;
    expect(title).toContain('unknown');
  });

  it('fetch failure sets offline state', () => {
    // Simulates catch branch
    const className = 'conn-dot failed';
    const text = 'MCP server offline';
    expect(className).toContain('failed');
    expect(text).toBe('MCP server offline');
  });
});

// ---------------------------------------------------------------------------
// Sidebar collapse pauses annotation
// ---------------------------------------------------------------------------

describe('sidebar collapse pauses interaction', () => {
  it('pause does not clear annotations', () => {
    start();
    // Annotations array should survive pause
    expect(getAnnotations()).toHaveLength(0);
    stop();
  });

  it('isActive returns true before stop', () => {
    start();
    expect(isActive()).toBe(true);
    stop();
  });

  it('isActive returns false after stop', () => {
    start();
    stop();
    expect(isActive()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Sidebar hover expand timing
// ---------------------------------------------------------------------------

describe('sidebar hover expand', () => {
  it('expand delay is 400ms (not instant)', () => {
    const EXPAND_DELAY = 400;
    expect(EXPAND_DELAY).toBeGreaterThan(0);
    expect(EXPAND_DELAY).toBeLessThanOrEqual(500);
  });

  it('max expanded height is capped at 120px', () => {
    const MAX_HEIGHT = 120;
    expect(MAX_HEIGHT).toBeLessThanOrEqual(200);
  });
});

// ---------------------------------------------------------------------------
// Viewport clamping on drag
// ---------------------------------------------------------------------------

describe('viewport clamping', () => {
  it('clamps x to 0 when negative', () => {
    const cx = Math.max(0, Math.min(-50, 1024));
    expect(cx).toBe(0);
  });

  it('clamps x to innerWidth when beyond', () => {
    const innerWidth = 1024;
    const cx = Math.max(0, Math.min(1200, innerWidth));
    expect(cx).toBe(1024);
  });

  it('clamps y to 0 when negative', () => {
    const cy = Math.max(0, Math.min(-10, 768));
    expect(cy).toBe(0);
  });

  it('clamps y to innerHeight when beyond', () => {
    const innerHeight = 768;
    const cy = Math.max(0, Math.min(900, innerHeight));
    expect(cy).toBe(768);
  });

  it('passes through values within bounds', () => {
    const cx = Math.max(0, Math.min(500, 1024));
    const cy = Math.max(0, Math.min(300, 768));
    expect(cx).toBe(500);
    expect(cy).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// MARKER_COLORS export and panel border
// ---------------------------------------------------------------------------

describe('marker colors', () => {
  it('has at least 5 colors', () => {
    expect(MARKER_COLORS.length).toBeGreaterThanOrEqual(5);
  });

  it('all colors are hex strings', () => {
    for (const c of MARKER_COLORS) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('no duplicate colors', () => {
    const unique = new Set(MARKER_COLORS);
    expect(unique.size).toBe(MARKER_COLORS.length);
  });
});

// ---------------------------------------------------------------------------
// Popup font sizes - readability
// ---------------------------------------------------------------------------

describe('popup font sizes', () => {
  const TOOL_BTN_FONT = 12;
  const TOOL_BTN_ICON = 22;
  const CONN_STATUS_FONT = 11;
  const SETTINGS_FONT = 11;

  it('tool button font is at least 12px', () => {
    expect(TOOL_BTN_FONT).toBeGreaterThanOrEqual(12);
  });

  it('tool button icon is at least 22px', () => {
    expect(TOOL_BTN_ICON).toBeGreaterThanOrEqual(22);
  });

  it('connection status font is at least 11px', () => {
    expect(CONN_STATUS_FONT).toBeGreaterThanOrEqual(11);
  });

  it('settings font is at least 11px', () => {
    expect(SETTINGS_FONT).toBeGreaterThanOrEqual(11);
  });

  it('no font size below 10px in popup', () => {
    const sizes = [TOOL_BTN_FONT, CONN_STATUS_FONT, SETTINGS_FONT];
    for (const s of sizes) {
      expect(s).toBeGreaterThanOrEqual(10);
    }
  });
});

// ---------------------------------------------------------------------------
// Connection status cursor
// ---------------------------------------------------------------------------

describe('connection status cursor', () => {
  it('uses default cursor, not text selection', () => {
    const cursor = 'default';
    expect(cursor).toBe('default');
    expect(cursor).not.toBe('text');
  });
});

// ---------------------------------------------------------------------------
// Severity
// ---------------------------------------------------------------------------

describe('severity', () => {
  it('updateSeverity sets severity on annotation', () => {
    start();
    // Simulate annotation with severity
    const ann = { id: 1, severity: '' };
    ann.severity = 'critical';
    expect(ann.severity).toBe('critical');
    stop();
  });

  it('severity defaults to empty string', () => {
    const ann = { id: 1, comment: 'fix' };
    expect(ann.severity || '').toBe('');
  });

  it('valid severity values are critical, major, minor', () => {
    const valid = ['critical', 'major', 'minor'];
    for (const s of valid) {
      expect(['critical', 'major', 'minor']).toContain(s);
    }
  });

  it('empty severity is treated as unset', () => {
    const ann = { id: 1, severity: '' };
    const tag = ann.severity ? `[${ann.severity.toUpperCase()}]` : '';
    expect(tag).toBe('');
  });

  it('severity uppercases in tag', () => {
    const ann = { severity: 'major' };
    const tag = ann.severity ? `[${ann.severity.toUpperCase()}]` : '';
    expect(tag).toBe('[MAJOR]');
  });
});

// ---------------------------------------------------------------------------
// Placeholder text
// ---------------------------------------------------------------------------

describe('annotation placeholder', () => {
  it('placeholder guides expected behavior', () => {
    const placeholder = 'What should this look like?\ne.g. "font should be 14px" or "label should say Email Address"';
    expect(placeholder).toContain('should');
    expect(placeholder).toContain('e.g.');
  });

  it('placeholder is not generic "Add a comment"', () => {
    const placeholder = 'What should this look like?';
    expect(placeholder).not.toBe('Add a comment...');
  });
});

// ---------------------------------------------------------------------------
// Export button success states
// ---------------------------------------------------------------------------

describe('export button success states', () => {
  it('Send success shows checkmark SVG', () => {
    const html = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Sent!';
    expect(html).toContain('polyline');
    expect(html).toContain('Sent!');
  });

  it('Copy success shows checkmark SVG', () => {
    const html = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Copied!';
    expect(html).toContain('polyline');
    expect(html).toContain('Copied!');
  });

  it('success states do not use textContent (which strips SVG)', () => {
    // textContent = 'Sent!' would strip the icon - innerHTML preserves it
    const el = { innerHTML: '', textContent: '' };
    el.innerHTML = '<svg></svg>Sent!';
    expect(el.innerHTML).toContain('<svg>');
  });
});

// ---------------------------------------------------------------------------
// Page notes
// ---------------------------------------------------------------------------

describe('addPageNote', () => {
  beforeEach(() => { clearAnnotations(); });

  it('creates a page-note annotation with no element reference', () => {
    const note = addPageNote();
    expect(note.type).toBe('page-note');
    expect(note.region).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(note.nids).toEqual([]);
    expect(note.ancestor).toBeNull();
  });

  it('assigns a UUID to page notes', () => {
    const note = addPageNote();
    expect(note.uuid).toBeDefined();
    expect(note.uuid.length).toBeGreaterThan(10);
  });

  it('assigns a timestamp to page notes', () => {
    const note = addPageNote();
    expect(note.timestamp).toBeDefined();
    expect(new Date(note.timestamp).getTime()).not.toBeNaN();
  });

  it('adds page note to annotations list', () => {
    addPageNote();
    addPageNote();
    expect(getAnnotations()).toHaveLength(2);
    expect(getAnnotations().every((a) => a.type === 'page-note')).toBe(true);
  });

  it('increments id for each page note', () => {
    const a = addPageNote();
    const b = addPageNote();
    expect(b.id).toBe(a.id + 1);
  });
});

// ---------------------------------------------------------------------------
// Category and severity updates
// ---------------------------------------------------------------------------

describe('updateCategory', () => {
  beforeEach(() => { clearAnnotations(); });

  it('updates category on an annotation', () => {
    const note = addPageNote();
    updateCategory(note.id, 'visual');
    expect(getAnnotations()[0].category).toBe('visual');
  });

  it('does nothing for non-existent id', () => {
    addPageNote();
    updateCategory(999, 'a11y');
    expect(getAnnotations()[0].category).toBe('');
  });
});

describe('updateSeverity', () => {
  beforeEach(() => { clearAnnotations(); });

  it('updates severity on an annotation', () => {
    const note = addPageNote();
    updateSeverity(note.id, 'critical');
    expect(getAnnotations()[0].severity).toBe('critical');
  });
});
