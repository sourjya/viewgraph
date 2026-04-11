/**
 * Session State Manager
 *
 * Manages capture session state for multi-step flow recording. A session
 * groups sequential captures into a named flow (e.g., "checkout flow").
 *
 * State is persisted to chrome.storage.session so it survives sidebar
 * rebuilds but not browser restarts (sessions are ephemeral by design).
 *
 * Design decisions:
 * - Session ID is timestamp-based (no UUID dependency, sortable)
 * - Step notes are optional - most steps are self-explanatory from URL
 * - Session name defaults to first page title, can be set later
 * - No limit on steps - the server handles pagination
 *
 * @see docs/roadmap/roadmap.md - Capture Sessions
 */

/** @type {{ id: string, name: string, step: number, startedAt: string, notes: Object<number, string> } | null} */
let current = null;

/**
 * Generate a session ID from current timestamp.
 * Format: ses_<unix-seconds> - sortable, unique enough for single-user.
 * @returns {string}
 */
function generateId() {
  return `ses_${Math.floor(Date.now() / 1000)}`;
}

/**
 * Start a new recording session.
 * @param {string} [name] - Optional session name. Defaults to document title.
 * @returns {{ id: string, name: string, step: number }}
 */
export function startSession(name) {
  current = {
    id: generateId(),
    name: name || '',
    step: 0,
    startedAt: new Date().toISOString(),
    notes: {},
  };
  persist();
  return getState();
}

/**
 * Stop the current session.
 * @returns {{ id: string, name: string, totalSteps: number } | null}
 */
export function stopSession() {
  if (!current) return null;
  const result = { id: current.id, name: current.name, totalSteps: current.step };
  current = null;
  persist();
  return result;
}

/**
 * Record a capture as the next step in the current session.
 * @param {string} [note] - Optional note describing what the user did
 * @returns {{ id: string, step: number, note: string|undefined } | null}
 */
export function addStep(note) {
  if (!current) return null;
  current.step++;
  if (note) current.notes[current.step] = note;
  persist();
  return { id: current.id, step: current.step, note: note || undefined };
}

/**
 * Get the current session state.
 * @returns {{ id: string, name: string, step: number, startedAt: string } | null}
 */
export function getState() {
  if (!current) return null;
  return { id: current.id, name: current.name, step: current.step, startedAt: current.startedAt };
}

/**
 * Check if a session is currently recording.
 * @returns {boolean}
 */
export function isRecording() {
  return current !== null;
}

/**
 * Set or update the session name.
 * @param {string} name
 */
export function setName(name) {
  if (!current) return;
  current.name = name;
  persist();
}

/**
 * Get the session metadata to embed in a capture.
 * Returns null if no session is active.
 * @returns {{ id: string, name: string, step: number, note: string|undefined } | null}
 */
export function getCaptureMetadata() {
  if (!current) return null;
  return {
    id: current.id,
    name: current.name || undefined,
    step: current.step,
    note: current.notes[current.step] || undefined,
  };
}

/**
 * Restore session state from chrome.storage.session.
 * Called on sidebar init to survive rebuilds.
 */
export async function restore() {
  try {
    const data = await chrome.storage.session.get('vg_session');
    if (data.vg_session) current = data.vg_session;
  } catch { /* storage not available (tests) */ }
}

/** Persist current state to chrome.storage.session. */
function persist() {
  try {
    chrome.storage.session.set({ vg_session: current });
  } catch { /* storage not available (tests) */ }
}

/** Reset all state. Used in tests. */
export function reset() {
  current = null;
}
