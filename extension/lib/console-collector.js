/**
 * Console Collector
 *
 * Intercepts console.error and console.warn to capture error/warning
 * messages for inclusion in ViewGraph captures. Preserves original
 * console behavior by calling through to the original functions.
 *
 * Must be installed early in the content script lifecycle to catch
 * errors from page scripts.
 *
 * @see .kiro/specs/network-console-capture/design.md
 */

const MAX_ENTRIES = 50;
const MAX_MESSAGE_LENGTH = 500;

let errors = [];
let warnings = [];
let errorCount = 0;
let warningCount = 0;
let installed = false;

/**
 * Install console interceptors. Call once, as early as possible.
 * Wraps console.error and console.warn to capture messages.
 */
export function installConsoleInterceptor() {
  if (installed) return;
  installed = true;

  const origError = console.error;
  const origWarn = console.warn;

  console.error = (...args) => {
    captureEntry(errors, args);
    errorCount++;
    origError.apply(console, args);
  };

  console.warn = (...args) => {
    captureEntry(warnings, args);
    warningCount++;
    origWarn.apply(console, args);
  };

  // Catch uncaught errors and unhandled rejections (fires even for
  // errors that occurred before the interceptor was installed)
  window.addEventListener('error', (e) => {
    if (e.message) {
      captureEntry(errors, [e.message]);
      errorCount++;
    }
  });
  window.addEventListener('unhandledrejection', (e) => {
    const msg = e.reason?.message || String(e.reason || 'Unhandled promise rejection');
    captureEntry(errors, [msg]);
    errorCount++;
  });
}

/** Convert console args to a stored entry. */
function captureEntry(store, args) {
  if (store.length >= MAX_ENTRIES) return;
  const first = args[0];
  const isError = first instanceof Error;
  let message = isError ? first.message : args.map(String).join(' ');
  if (message.length > MAX_MESSAGE_LENGTH) message = message.slice(0, MAX_MESSAGE_LENGTH);
  store.push({
    message,
    stack: isError ? first.stack : null,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get collected console state for capture enrichment.
 * @returns {{ errors: Array, warnings: Array, summary: object }}
 */
export function getConsoleState() {
  return {
    errors: [...errors],
    warnings: [...warnings],
    summary: { errors: errorCount, warnings: warningCount },
  };
}

/** Reset collector state (for testing). */
export function resetConsoleCollector() {
  errors = [];
  warnings = [];
  errorCount = 0;
  warningCount = 0;
  installed = false;
}
