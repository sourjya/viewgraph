/**
 * Vitest Global Setup - Extension Tests
 *
 * Mocks browser APIs not available in jsdom.
 */

// jsdom doesn't implement matchMedia - mock it for breakpoint-collector tests
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
