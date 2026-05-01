/**
 * Sidebar Color Token Sheet
 *
 * Centralized color tokens for the extension sidebar, implemented as a
 * Constructable Stylesheet adopted into the shadow root. Parsed once at
 * module load, shared across all sidebar components.
 *
 * Two-tier naming:
 * - Primitive: --vg-color-green-400 (raw palette value)
 * - Semantic: --vg-color-success (purpose-based alias)
 *
 * Call sites use semantic tokens: el.style.color = 'var(--vg-color-success)'
 * Theme switching: tokenSheet.replaceSync(newPalette) - zero DOM traversal.
 *
 * @see docs/references/shadow-dom-css-style-color-management.md
 * @see .kiro/specs/shadow-dom-color-tokens/requirements.md
 */

export const tokenSheet = new CSSStyleSheet();

tokenSheet.replaceSync(`
  :host {
    /* ── Primitive palette ── */
    --vg-color-green-400:   #4ade80;
    --vg-color-green-600:   #22c55e;
    --vg-color-green-700:   #059669;
    --vg-color-green-900:   #166534;
    --vg-color-red-400:     #f87171;
    --vg-color-red-500:     #ef4444;
    --vg-color-red-200:     #fca5a5;
    --vg-color-red-950:     #7f1d1d;
    --vg-color-amber-400:   #fbbf24;
    --vg-color-amber-500:   #f59e0b;
    --vg-color-yellow-500:  #eab308;
    --vg-color-blue-400:    #60a5fa;
    --vg-color-blue-300:    #93c5fd;
    --vg-color-blue-900:    #1e3a5f;
    --vg-color-indigo-300:  #a5b4fc;
    --vg-color-gray-100:    #e0e0e0;
    --vg-color-gray-400:    #9ca3af;
    --vg-color-gray-500:    #6b7280;
    --vg-color-gray-600:    #555;
    --vg-color-gray-700:    #444;
    --vg-color-gray-800:    #333;
    --vg-color-white:       #fff;

    /* ── Surface palette ── */
    --vg-surface-primary:   #1a1a2e;
    --vg-surface-elevated:  #252536;
    --vg-surface-overlay:   #2a2a1a;
    --vg-surface-deep:      #16161e;
    --vg-surface-card:      #1e1e2e;
    --vg-surface-hover:     #2a2a3a;
    --vg-surface-active:    #2a2a4a;
    --vg-border-default:    #334155;
    --vg-border-subtle:     #374151;

    /* ── Extended palette ── */
    --vg-color-teal-600:    #0d9488;
    --vg-color-sky-500:     #0ea5e9;
    --vg-color-indigo-500:  #6366f1;
    --vg-color-indigo-400:  #818cf8;
    --vg-color-indigo-600:  #5558e6;
    --vg-color-purple-500:  #a855f7;
    --vg-color-red-600:     #dc2626;
    --vg-color-amber-800:   #92400e;
    --vg-color-gray-200:    #e2e8f0;
    --vg-color-gray-300:    #c8c8d0;
    --vg-color-gray-350:    #ccc;
    --vg-color-gray-450:    #888;
    --vg-color-black:       #000;

    /* ── Semantic tokens (call sites use these) ── */
    --vg-color-success:     var(--vg-color-green-400);
    --vg-color-success-dim: var(--vg-color-green-600);
    --vg-color-success-bg:  var(--vg-color-green-900);
    --vg-color-error:       var(--vg-color-red-400);
    --vg-color-error-dim:   var(--vg-color-red-500);
    --vg-color-error-muted: var(--vg-color-red-200);
    --vg-color-error-bg:    var(--vg-color-red-950);
    --vg-color-warning:     var(--vg-color-amber-400);
    --vg-color-warning-dim: var(--vg-color-amber-500);
    --vg-color-info:        var(--vg-color-blue-400);
    --vg-color-info-light:  var(--vg-color-blue-300);
    --vg-color-info-bg:     var(--vg-color-blue-900);
    --vg-color-accent:      var(--vg-color-indigo-300);
    --vg-color-text:        var(--vg-color-gray-100);
    --vg-color-text-muted:  var(--vg-color-gray-400);
    --vg-color-text-dim:    var(--vg-color-gray-500);
    --vg-color-link:        var(--vg-color-blue-400);
    --vg-color-highlight:   var(--vg-color-yellow-500);
    --vg-color-diagnostic:  var(--vg-color-teal-600);
    --vg-color-idea:        var(--vg-color-amber-400);
    --vg-color-pending:     var(--vg-color-indigo-500);
    --vg-color-pending-dim: var(--vg-color-indigo-400);
    --vg-color-badge:       var(--vg-color-indigo-600);
    --vg-color-severity:    var(--vg-color-purple-500);
    --vg-color-danger:      var(--vg-color-red-600);
    --vg-color-caution-bg:  var(--vg-color-amber-800);
  }
`);
