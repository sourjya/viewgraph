/**
 * Options Page Script
 *
 * Manages project mappings: URL pattern -> capturesDir.
 * Stored in chrome.storage.sync so they persist across devices.
 */

const STORAGE_KEY = 'vg-project-mappings';
const mappingsEl = document.getElementById('mappings');
const addBtn = document.getElementById('addBtn');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');

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
