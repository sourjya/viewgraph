/**
 * Options Page Script
 *
 * Shows auto-detected project mapping (read-only) from the server /info
 * endpoint. Provides manual override toggle for multi-project setups.
 *
 * @see entrypoints/background.js - fetchServerInfo stores auto-mapping
 * @see server/src/http-receiver.js - GET /info endpoint
 */

const STORAGE_KEY = 'vg-project-mappings';
const AUTO_MAPPING_KEY = 'vg-auto-mapping';
const OVERRIDE_KEY = 'vg-override-enabled';
const mappingsEl = document.getElementById('mappings');
const addBtn = document.getElementById('addBtn');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');
const autoMappingEl = document.getElementById('autoMapping');
const overrideToggle = document.getElementById('overrideToggle');
const manualSection = document.getElementById('manualSection');

// ---------------------------------------------------------------------------
// Auto-detected mapping display
// ---------------------------------------------------------------------------

/** Render the auto-detected mapping from server /info. */
function renderAutoMapping(data) {
  if (!data) {
    autoMappingEl.innerHTML = '<span class="auto-dot disconnected"></span><span class="auto-status">No server connected - start the MCP server to auto-detect</span>';
    return;
  }
  const age = Date.now() - (data.detectedAt || 0);
  const fresh = age < 120000; // 2 min
  autoMappingEl.textContent = '';
  const rows = [
    { label: 'Server:', value: data.serverUrl || 'unknown', dot: true, fresh },
    { label: 'Project:', value: data.projectRoot || 'unknown' },
    { label: 'Captures:', value: data.capturesDir || 'unknown' },
  ];
  for (const row of rows) {
    const div = document.createElement('div');
    div.className = 'auto-row';
    if (row.dot) {
      const dot = document.createElement('span');
      dot.className = `auto-dot ${row.fresh ? 'connected' : 'disconnected'}`;
      div.appendChild(dot);
    }
    const lbl = document.createElement('span');
    lbl.className = 'auto-label';
    lbl.textContent = row.label;
    const val = document.createElement('span');
    val.className = 'auto-value';
    val.textContent = row.value;
    div.append(lbl, ' ', val);
    autoMappingEl.appendChild(div);
  }
}

// Load auto-mapping on page open
chrome.storage.local.get(AUTO_MAPPING_KEY, (result) => {
  renderAutoMapping(result[AUTO_MAPPING_KEY] || null);
});

// ---------------------------------------------------------------------------
// Manual override toggle
// ---------------------------------------------------------------------------

chrome.storage.local.get(OVERRIDE_KEY, (result) => {
  overrideToggle.checked = !!result[OVERRIDE_KEY];
  manualSection.style.display = overrideToggle.checked ? 'block' : 'none';
});

overrideToggle.addEventListener('change', () => {
  manualSection.style.display = overrideToggle.checked ? 'block' : 'none';
  chrome.storage.local.set({ [OVERRIDE_KEY]: overrideToggle.checked });
});

/** Create a mapping row in the UI. */
function createRow(pattern = '', dir = '') {
  const row = document.createElement('div');
  row.className = 'mapping';

  const patternInput = document.createElement('input');
  patternInput.placeholder = 'localhost:5173';
  patternInput.value = pattern;
  patternInput.title = 'URL pattern (substring match)';

  const dirInput = document.createElement('input');
  dirInput.placeholder = '/home/user/project/.viewgraph/captures';
  dirInput.value = dir;
  dirInput.title = 'Absolute path to captures directory';

  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-btn';
  removeBtn.textContent = '\u00d7';
  removeBtn.title = 'Remove mapping';
  removeBtn.addEventListener('click', () => row.remove());

  row.append(patternInput, dirInput, removeBtn);
  mappingsEl.appendChild(row);
}

/** Read all mappings from the UI. */
function readMappings() {
  const rows = mappingsEl.querySelectorAll('.mapping');
  const mappings = [];
  for (const row of rows) {
    const inputs = row.querySelectorAll('input');
    const pattern = inputs[0].value.trim();
    const dir = inputs[1].value.trim();
    if (pattern && dir) mappings.push({ pattern, dir });
  }
  return mappings;
}

/** Save mappings to chrome.storage. */
saveBtn.addEventListener('click', () => {
  const mappings = readMappings();
  chrome.storage.sync.set({ [STORAGE_KEY]: mappings }, () => {
    statusEl.style.display = 'inline';
    setTimeout(() => { statusEl.style.display = 'none'; }, 2000);
  });
});

addBtn.addEventListener('click', () => createRow());

// Load saved mappings on page open
chrome.storage.sync.get(STORAGE_KEY, (result) => {
  const mappings = result[STORAGE_KEY] || [];
  if (mappings.length === 0) {
    // Start with one empty row as a hint
    createRow();
  } else {
    for (const m of mappings) createRow(m.pattern, m.dir);
  }
});

// ──────────────────────────────────────────────
// Auto-Capture, Server, and Quality Settings
// ──────────────────────────────────────────────

const SETTINGS_KEY = 'viewgraph-settings';

const autoCaptureEl = document.getElementById('autoCaptureEnabled');
const debounceEl = document.getElementById('debounceMs');
const serverUrlEl = document.getElementById('serverUrl');
const captureQualityEl = document.getElementById('captureQuality');
const saveAllBtn = document.getElementById('saveAllBtn');
const statusAllEl = document.getElementById('statusAll');

/** Load settings from storage. */
chrome.storage.sync.get(SETTINGS_KEY, (result) => {
  const s = result[SETTINGS_KEY] || {};
  if (s.autoCaptureEnabled != null) autoCaptureEl.checked = s.autoCaptureEnabled;
  if (s.debounceMs != null) debounceEl.value = s.debounceMs;
  if (s.serverUrl) serverUrlEl.value = s.serverUrl;
  if (s.captureQuality) captureQualityEl.value = s.captureQuality;
});

/** Save all settings. */
saveAllBtn.addEventListener('click', () => {
  const settings = {
    autoCaptureEnabled: autoCaptureEl.checked,
    debounceMs: parseInt(debounceEl.value, 10) || 1000,
    serverUrl: serverUrlEl.value.trim() || '',
    captureQuality: captureQualityEl.value,
  };
  chrome.storage.sync.set({ [SETTINGS_KEY]: settings }, () => {
    statusAllEl.style.display = 'inline';
    setTimeout(() => { statusAllEl.style.display = 'none'; }, 2000);
  });
});
