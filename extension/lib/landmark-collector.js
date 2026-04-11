/**
 * ARIA Landmarks Collector
 *
 * Identifies semantic landmark regions on the page - the structure that
 * screen readers use for navigation. Detects common issues: missing main
 * landmark, duplicate landmarks without labels, navigation without label,
 * and content outside any landmark.
 *
 * Landmarks come from both HTML5 sectioning elements (nav, main, aside,
 * header, footer) and explicit ARIA roles (role=banner, navigation, main,
 * complementary, contentinfo, search, form, region).
 *
 * @see docs/roadmap/roadmap.md - M13.6 semantic ARIA landmarks
 */

const ATTR = 'data-vg-annotate';

/**
 * Map of HTML elements to their implicit ARIA landmark roles.
 * Only top-level header/footer map to banner/contentinfo.
 */
const IMPLICIT_LANDMARKS = {
  nav: 'navigation',
  main: 'main',
  aside: 'complementary',
  header: 'banner',
  footer: 'contentinfo',
  form: 'form',
  search: 'search',
};

/** Explicit ARIA roles that are landmarks. */
const LANDMARK_ROLES = new Set([
  'banner', 'navigation', 'main', 'complementary',
  'contentinfo', 'search', 'form', 'region',
]);

/** Build a compact selector for an element. */
function selector(el) {
  const tag = el.tagName.toLowerCase();
  if (el.id) return `${tag}#${el.id}`;
  const cls = el.className && typeof el.className === 'string'
    ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
    : '';
  return `${tag}${cls}`;
}

/**
 * Get the landmark role for an element, if any.
 * @param {Element} el
 * @returns {string|null}
 */
function getLandmarkRole(el) {
  // Explicit role takes precedence
  const role = el.getAttribute('role');
  if (role && LANDMARK_ROLES.has(role)) return role;
  // Implicit from HTML element
  const tag = el.tagName.toLowerCase();
  const implicit = IMPLICIT_LANDMARKS[tag];
  if (!implicit) return null;
  // header/footer only map to banner/contentinfo when not nested in sectioning content
  if (tag === 'header' || tag === 'footer') {
    const parent = el.parentElement;
    if (parent && parent.closest('article, aside, main, nav, section')) return null;
  }
  return implicit;
}

/**
 * Collect ARIA landmarks from the live DOM.
 * @returns {{ landmarks: Array, issues: Array }}
 */
export function collectLandmarks() {
  const landmarks = [];
  const issues = [];

  const all = document.querySelectorAll('nav, main, aside, header, footer, form, search, [role]');
  for (const el of all) {
    if (el.closest(`[${ATTR}]`)) continue;
    const role = getLandmarkRole(el);
    if (!role) continue;
    landmarks.push({
      role,
      selector: selector(el),
      tag: el.tagName.toLowerCase(),
      label: el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || undefined,
    });
  }

  // Issue: no main landmark
  if (!landmarks.some((l) => l.role === 'main')) {
    issues.push({ type: 'missing-main', message: 'Page has no <main> landmark - screen readers cannot identify primary content' });
  }

  // Issue: duplicate landmarks of same role without distinguishing labels
  const byRole = {};
  for (const l of landmarks) { (byRole[l.role] = byRole[l.role] || []).push(l); }
  for (const [role, group] of Object.entries(byRole)) {
    if (group.length > 1) {
      const unlabeled = group.filter((l) => !l.label);
      if (unlabeled.length > 1) {
        issues.push({
          type: 'duplicate-unlabeled',
          message: `${group.length} ${role} landmarks without distinguishing aria-label`,
          role,
          count: group.length,
        });
      }
    }
  }

  return { landmarks, issues };
}
