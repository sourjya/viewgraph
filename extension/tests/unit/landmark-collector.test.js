/**
 * ARIA Landmarks Collector - Unit Tests
 *
 * Tests landmark detection from HTML5 elements and explicit ARIA roles,
 * header/footer scoping rules, and issue detection.
 *
 * @see lib/landmark-collector.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { collectLandmarks } from '#lib/landmark-collector.js';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('landmark detection', () => {
  it('(+) detects nav as navigation landmark', () => {
    document.body.innerHTML = '<nav>Menu</nav><main>Content</main>';
    const { landmarks } = collectLandmarks();
    expect(landmarks.some((l) => l.role === 'navigation')).toBe(true);
  });

  it('(+) detects main element', () => {
    document.body.innerHTML = '<main>Content</main>';
    const { landmarks } = collectLandmarks();
    expect(landmarks.some((l) => l.role === 'main')).toBe(true);
  });

  it('(+) detects aside as complementary', () => {
    document.body.innerHTML = '<main>Content</main><aside>Sidebar</aside>';
    const { landmarks } = collectLandmarks();
    expect(landmarks.some((l) => l.role === 'complementary')).toBe(true);
  });

  it('(+) detects explicit role=search', () => {
    document.body.innerHTML = '<main>Content</main><div role="search">Search</div>';
    const { landmarks } = collectLandmarks();
    expect(landmarks.some((l) => l.role === 'search')).toBe(true);
  });

  it('(+) detects explicit role=region', () => {
    document.body.innerHTML = '<main>Content</main><div role="region" aria-label="Filters">Filters</div>';
    const { landmarks } = collectLandmarks();
    expect(landmarks.some((l) => l.role === 'region')).toBe(true);
  });

  it('(+) captures aria-label', () => {
    document.body.innerHTML = '<nav aria-label="Primary">Menu</nav><main>Content</main>';
    const { landmarks } = collectLandmarks();
    const nav = landmarks.find((l) => l.role === 'navigation');
    expect(nav.label).toBe('Primary');
  });

  it('(+) top-level header maps to banner', () => {
    document.body.innerHTML = '<header>Logo</header><main>Content</main>';
    const { landmarks } = collectLandmarks();
    expect(landmarks.some((l) => l.role === 'banner')).toBe(true);
  });

  it('(+) top-level footer maps to contentinfo', () => {
    document.body.innerHTML = '<main>Content</main><footer>Copyright</footer>';
    const { landmarks } = collectLandmarks();
    expect(landmarks.some((l) => l.role === 'contentinfo')).toBe(true);
  });

  it('(-) header inside article is NOT a banner', () => {
    document.body.innerHTML = '<main><article><header>Article Header</header></article></main>';
    const { landmarks } = collectLandmarks();
    expect(landmarks.some((l) => l.role === 'banner')).toBe(false);
  });

  it('(-) footer inside section is NOT contentinfo', () => {
    document.body.innerHTML = '<main><section><footer>Section Footer</footer></section></main>';
    const { landmarks } = collectLandmarks();
    expect(landmarks.some((l) => l.role === 'contentinfo')).toBe(false);
  });

  it('(-) div without role is not a landmark', () => {
    document.body.innerHTML = '<main>Content</main><div>Not a landmark</div>';
    const { landmarks } = collectLandmarks();
    expect(landmarks.length).toBe(1);
  });
});

describe('landmark issues', () => {
  it('(+) missing main landmark raises issue', () => {
    document.body.innerHTML = '<nav>Menu</nav><div>Content</div>';
    const { issues } = collectLandmarks();
    expect(issues.some((i) => i.type === 'missing-main')).toBe(true);
  });

  it('(-) no missing-main issue when main exists', () => {
    document.body.innerHTML = '<main>Content</main>';
    const { issues } = collectLandmarks();
    expect(issues.some((i) => i.type === 'missing-main')).toBe(false);
  });

  it('(+) duplicate unlabeled navigation raises issue', () => {
    document.body.innerHTML = '<nav>Primary</nav><nav>Secondary</nav><main>Content</main>';
    const { issues } = collectLandmarks();
    const dup = issues.find((i) => i.type === 'duplicate-unlabeled');
    expect(dup).toBeTruthy();
    expect(dup.role).toBe('navigation');
  });

  it('(-) duplicate navigation with labels is fine', () => {
    document.body.innerHTML = '<nav aria-label="Primary">A</nav><nav aria-label="Secondary">B</nav><main>Content</main>';
    const { issues } = collectLandmarks();
    expect(issues.some((i) => i.type === 'duplicate-unlabeled')).toBe(false);
  });

  it('(-) single navigation needs no label', () => {
    document.body.innerHTML = '<nav>Menu</nav><main>Content</main>';
    const { issues } = collectLandmarks();
    expect(issues.some((i) => i.type === 'duplicate-unlabeled')).toBe(false);
  });
});
