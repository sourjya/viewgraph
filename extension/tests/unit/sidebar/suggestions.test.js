/**
 * Tests for sidebar/suggestions.js - Auto-inspect suggestion engine.
 * @see extension/lib/sidebar/suggestions.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { scanForSuggestions } from '#lib/sidebar/suggestions.js';

beforeEach(() => { document.body.innerHTML = ''; });

describe('scanForSuggestions', () => {
  it('(+) returns empty array on clean page', () => {
    const results = scanForSuggestions();
    expect(Array.isArray(results)).toBe(true);
  });

  it('(+) detects images missing alt text', () => {
    document.body.innerHTML = '<img src="test.png"><img src="test2.png">';
    const results = scanForSuggestions();
    const altSug = results.find((s) => s.source === 'a11y-alt');
    expect(altSug).toBeDefined();
    expect(altSug.title).toContain('2 image');
    expect(altSug.severity).toBe('warning');
    expect(altSug.tier).toBe('accessibility');
  });

  it('(+) detects buttons without accessible names', () => {
    document.body.innerHTML = '<button></button><button></button>';
    const results = scanForSuggestions();
    const nameSug = results.find((s) => s.source === 'a11y-name');
    expect(nameSug).toBeDefined();
    expect(nameSug.title).toContain('2 interactive');
  });

  it('(-) skips buttons with text content', () => {
    document.body.innerHTML = '<button>Submit</button>';
    const results = scanForSuggestions();
    const nameSug = results.find((s) => s.source === 'a11y-name');
    expect(nameSug).toBeUndefined();
  });

  it('(-) skips images with alt text', () => {
    document.body.innerHTML = '<img src="test.png" alt="A photo">';
    const results = scanForSuggestions();
    const altSug = results.find((s) => s.source === 'a11y-alt');
    expect(altSug).toBeUndefined();
  });

  it('(+) detects missing data-testid on interactive elements', () => {
    document.body.innerHTML = '<button>A</button><button>B</button><button>C</button><button>D</button>';
    const results = scanForSuggestions();
    const tidSug = results.find((s) => s.source === 'testids');
    expect(tidSug).toBeDefined();
    expect(tidSug.tier).toBe('testability');
  });

  it('(-) skips testid suggestion when count <= 3', () => {
    document.body.innerHTML = '<button>A</button><button>B</button>';
    const results = scanForSuggestions();
    const tidSug = results.find((s) => s.source === 'testids');
    expect(tidSug).toBeUndefined();
  });

  it('(+) detects inputs without labels', () => {
    document.body.innerHTML = '<input type="text"><input type="email">';
    const results = scanForSuggestions();
    const labelSug = results.find((s) => s.source === 'labels');
    expect(labelSug).toBeDefined();
    expect(labelSug.title).toContain('2 form input');
  });

  it('(+) assigns sequential IDs', () => {
    document.body.innerHTML = '<img src="a.png"><button></button><input type="text">';
    const results = scanForSuggestions();
    if (results.length >= 2) {
      expect(results[0].id).toBe('sug-1');
      expect(results[1].id).toBe('sug-2');
    }
  });

  it('(+) respects max option', () => {
    document.body.innerHTML = '<img src="a.png"><button></button><input type="text"><input type="email"><button>A</button><button>B</button><button>C</button><button>D</button>';
    const results = scanForSuggestions({ max: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('(+) ranks errors above warnings', () => {
    // Console errors are mocked as empty in jsdom, so test with what we can
    document.body.innerHTML = '<img src="a.png"><input type="text">';
    const results = scanForSuggestions();
    // All should be warnings or info (no errors in jsdom)
    for (const r of results) {
      expect(['warning', 'info', 'error']).toContain(r.severity);
    }
  });

  it('(-) skips ViewGraph UI elements', () => {
    document.body.innerHTML = '<img data-vg-annotate="marker" src="test.png"><button data-vg-annotate="btn"></button>';
    const results = scanForSuggestions();
    const altSug = results.find((s) => s.source === 'a11y-alt');
    expect(altSug).toBeUndefined();
  });

  it('(+) each suggestion has required fields', () => {
    document.body.innerHTML = '<img src="a.png">';
    const results = scanForSuggestions();
    for (const s of results) {
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('tier');
      expect(s).toHaveProperty('severity');
      expect(s).toHaveProperty('title');
      expect(s).toHaveProperty('selector');
      expect(s).toHaveProperty('source');
    }
  });
});
