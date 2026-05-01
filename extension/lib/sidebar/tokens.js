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
    --vg-border-default:    #334155;

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
  }
`);
