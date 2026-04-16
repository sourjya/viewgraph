/**
 * Journey Recorder
 *
 * Automatically records captures as the user navigates through the app.
 * Tracks navigation events (pushState, popstate, hashchange) and click
 * events on links/buttons to auto-capture at each step.
 *
 * Builds on the session manager for step tracking. Each navigation
 * triggers a capture that gets pushed to the server as part of the session.
 *
 * @see lib/session-manager.js
 * @see docs/roadmap/roadmap.md - M14.2
 */

/** Debounce delay after navigation before capturing. */
const NAV_DEBOUNCE_MS = 500;

let active = false;
let timer = null;
let lastUrl = '';
const cleanups = [];

/**
 * Start journey recording. Auto-captures on each navigation.
 * @param {function} onNavigate - Called with { url, trigger } when navigation detected.
 */
export function startJourney(onNavigate) {
  if (active) return;
  active = true;
  lastUrl = location.href;

  function trigger(source) {
    const url = location.href;
    if (url === lastUrl) return; // Same URL, skip
    lastUrl = url;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (active) onNavigate({ url, trigger: source, timestamp: new Date().toISOString() });
    }, NAV_DEBOUNCE_MS);
  }

  // SPA navigation: pushState/replaceState
  const origPush = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function (...args) {
    origPush.apply(this, args);
    trigger('pushState');
  };
  history.replaceState = function (...args) {
    origReplace.apply(this, args);
    trigger('replaceState');
  };
  cleanups.push(() => {
    history.pushState = origPush;
    history.replaceState = origReplace;
  });

  // Back/forward navigation
  const popHandler = () => trigger('popstate');
  window.addEventListener('popstate', popHandler);
  cleanups.push(() => window.removeEventListener('popstate', popHandler));

  // Hash changes
  const hashHandler = () => trigger('hashchange');
  window.addEventListener('hashchange', hashHandler);
  cleanups.push(() => window.removeEventListener('hashchange', hashHandler));

  // Click on links (for MPA navigation detection before unload)
  const clickHandler = (e) => {
    const link = e.target.closest('a[href]');
    if (link && link.href && !link.href.startsWith('javascript:')) {
      // Capture before navigation (MPA will unload the page)
      const isExternal = link.hostname !== location.hostname;
      if (!isExternal) trigger('link-click');
    }
  };
  document.addEventListener('click', clickHandler, true);
  cleanups.push(() => document.removeEventListener('click', clickHandler, true));
}

/**
 * Stop journey recording.
 */
export function stopJourney() {
  active = false;
  clearTimeout(timer);
  for (const fn of cleanups) fn();
  cleanups.length = 0;
}

/**
 * Check if journey recording is active.
 * @returns {boolean}
 */
export function isJourneyActive() {
  return active;
}
