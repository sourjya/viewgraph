/**
 * Element Diagnostics - Unit Tests
 *
 * Tests per-element diagnostic analysis: a11y issues, missing testids,
 * focus problems, stacking context warnings, and contrast checks.
 *
 * @see lib/element-diagnostics.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { diagnoseElement } from '#lib/element-diagnostics.js';

beforeEach(() => {
  document.body.innerHTML = '';
});

function el(html) {
  document.body.innerHTML = html;
  return document.body.firstElementChild;
}

describe('accessibility checks', () => {
  it('(+) flags img without alt', () => {
    const hints = diagnoseElement(el('<img src="logo.png">'));
    expect(hints.some((h) => h.text === 'Missing alt text')).toBe(true);
  });

  it('(-) no flag for img with alt', () => {
    const hints = diagnoseElement(el('<img src="logo.png" alt="Logo">'));
    expect(hints.some((h) => h.text === 'Missing alt text')).toBe(false);
  });

  it('(+) flags button with no text or aria-label', () => {
    const hints = diagnoseElement(el('<button></button>'));
    expect(hints.some((h) => h.text === 'Button has no accessible name')).toBe(true);
  });

  it('(-) no flag for button with text', () => {
    const hints = diagnoseElement(el('<button>Submit</button>'));
    expect(hints.some((h) => h.text === 'Button has no accessible name')).toBe(false);
  });

  it('(-) no flag for button with aria-label', () => {
    const hints = diagnoseElement(el('<button aria-label="Close"></button>'));
    expect(hints.some((h) => h.text === 'Button has no accessible name')).toBe(false);
  });

  it('(+) flags input without label', () => {
    const _hints = diagnoseElement(el('<form><input type="text"></form>'));
    const input = document.querySelector('input');
    expect(diagnoseElement(input).some((h) => h.text === 'Form input has no label')).toBe(true);
  });

  it('(-) no flag for input with aria-label', () => {
    const input = el('<input type="text" aria-label="Email">');
    expect(diagnoseElement(input).some((h) => h.text === 'Form input has no label')).toBe(false);
  });

  it('(-) no flag for input wrapped in label', () => {
    document.body.innerHTML = '<label>Email <input type="text"></label>';
    const input = document.querySelector('input');
    expect(diagnoseElement(input).some((h) => h.text === 'Form input has no label')).toBe(false);
  });

  it('(+) flags empty aria-label', () => {
    const hints = diagnoseElement(el('<button aria-label="">Click</button>'));
    expect(hints.some((h) => h.text.includes('Empty aria-label'))).toBe(true);
  });
});

describe('testid checks', () => {
  it('(+) flags interactive element without data-testid', () => {
    const hints = diagnoseElement(el('<button>OK</button>'));
    expect(hints.some((h) => h.text === 'No data-testid')).toBe(true);
  });

  it('(-) no flag for element with data-testid', () => {
    const hints = diagnoseElement(el('<button data-testid="ok-btn">OK</button>'));
    expect(hints.some((h) => h.text === 'No data-testid')).toBe(false);
  });

  it('(-) no flag for non-interactive element', () => {
    const hints = diagnoseElement(el('<div>Text</div>'));
    expect(hints.some((h) => h.text === 'No data-testid')).toBe(false);
  });
});

describe('focus checks', () => {
  it('(+) flags interactive element with tabIndex=-1', () => {
    const hints = diagnoseElement(el('<button tabindex="-1">Hidden</button>'));
    expect(hints.some((h) => h.text.includes('tabIndex=-1'))).toBe(true);
  });

  it('(-) no flag for normal button', () => {
    const hints = diagnoseElement(el('<button>OK</button>'));
    expect(hints.some((h) => h.text.includes('tabIndex=-1'))).toBe(false);
  });
});

describe('edge cases', () => {
  it('(-) returns empty array for null', () => {
    expect(diagnoseElement(null)).toEqual([]);
  });

  it('(-) returns empty array for non-element', () => {
    expect(diagnoseElement({})).toEqual([]);
  });

  it('(+) all hints have category', () => {
    const hints = diagnoseElement(el('<button tabindex="-1"></button>'));
    hints.forEach((h) => expect(h.category).toBeTruthy());
  });
});
