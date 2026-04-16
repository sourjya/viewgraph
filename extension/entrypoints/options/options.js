/**
 * Options Page Script
 *
 * Shows all connected ViewGraph servers with their project roots and
 * URL patterns (read-only). URL patterns are configured via
 * npx viewgraph-init --url or .viewgraph/config.json.
 *
 * Manual override editor removed per BUG-010 - single source of truth
 * is the project-side config.json.
 *
 * @see docs/bugs/BUG-010-extension-settings-stale-overrides.md
 * @see docs/runbooks/multi-project-setup.md
 */

const DEFAULT_PORT = 9876;
const PORT_RANGE = 4;
const serversEl = document.getElementById('servers');

// ──────────────────────────────────────────────
// Server Discovery (read-only display)
// ──────────────────────────────────────────────

/** Scan all ports and display connected servers. */
async function discoverServers() {
  const servers = [];

  const probes = [];
  for (let p = DEFAULT_PORT; p < DEFAULT_PORT + PORT_RANGE; p++) {
    const url = `http://127.0.0.1:${p}`;
    probes.push(
      fetch(`${url}/info`, { signal: AbortSignal.timeout(1000) })
        .then((res) => res.ok ? res.json() : null)
        .then((info) => { if (info) servers.push({ url, ...info }); })
        .catch(() => {}),
    );
  }

  await Promise.all(probes);
  renderServers(servers);
}

/** Render server cards. */
function renderServers(servers) {
  serversEl.innerHTML = '';

  if (servers.length === 0) {
    serversEl.innerHTML = '<div class="no-servers">No servers detected. Run <code>npx viewgraph-init</code> from your project folder.</div>';
    return;
  }

  for (const s of servers) {
    const card = document.createElement('div');
    card.className = 'server-card';

    const rows = [
      { label: 'Server', value: s.url },
      { label: 'Project', value: s.projectRoot || 'unknown' },
      { label: 'Captures', value: s.capturesDir || 'unknown' },
      { label: 'Agent', value: s.agent || 'not detected' },
    ];

    for (const row of rows) {
      const div = document.createElement('div');
      div.className = 'server-row';
      if (row.label === 'Server') {
        div.innerHTML = `<span class="server-dot connected"></span>`;
      }
      const lbl = document.createElement('span');
      lbl.className = 'server-label';
      lbl.textContent = row.label;
      const val = document.createElement('span');
      val.className = 'server-value';
      val.textContent = row.value;
      div.append(lbl, val);
      card.appendChild(div);
    }

    // URL patterns
    const patterns = s.urlPatterns || [];
    if (patterns.length > 0) {
      const patRow = document.createElement('div');
      patRow.className = 'server-row';
      const patLabel = document.createElement('span');
      patLabel.className = 'server-label';
      patLabel.textContent = 'URL patterns';
      patRow.appendChild(patLabel);
      const patValues = document.createElement('span');
      for (const p of patterns) {
        const tag = document.createElement('span');
        tag.className = 'pattern-tag';
        tag.textContent = p;
        patValues.appendChild(tag);
      }
      patRow.appendChild(patValues);
      card.appendChild(patRow);
    }

    serversEl.appendChild(card);
  }
}

// Scan on page load
discoverServers();

// ──────────────────────────────────────────────
// Capture Settings (auto-capture, quality)
// ──────────────────────────────────────────────

const SETTINGS_KEY = 'viewgraph-settings';
const autoCaptureEl = document.getElementById('autoCaptureEnabled');
const debounceEl = document.getElementById('debounceMs');
const captureQualityEl = document.getElementById('captureQuality');
const saveAllBtn = document.getElementById('saveAllBtn');
const statusAllEl = document.getElementById('statusAll');

/** Load settings from storage. */
chrome.storage.sync.get(SETTINGS_KEY, (result) => {
  const s = result[SETTINGS_KEY] || {};
  if (s.autoCaptureEnabled != null) autoCaptureEl.checked = s.autoCaptureEnabled;
  if (s.debounceMs != null) debounceEl.value = s.debounceMs;
  if (s.captureQuality) captureQualityEl.value = s.captureQuality;
});

/** Save settings. */
saveAllBtn.addEventListener('click', () => {
  const settings = {
    autoCaptureEnabled: autoCaptureEl.checked,
    debounceMs: parseInt(debounceEl.value, 10) || 1000,
    captureQuality: captureQualityEl.value,
  };
  chrome.storage.sync.set({ [SETTINGS_KEY]: settings }, () => {
    statusAllEl.style.display = 'inline';
    setTimeout(() => { statusAllEl.style.display = 'none'; }, 2000);
  });
});

// Version info
const versionEl = document.getElementById('versionInfo');
const extVer = chrome.runtime.getManifest?.()?.version || 'unknown';
versionEl.textContent = `Extension: v${extVer} | Server: checking...`;
(async () => {
  for (let port = DEFAULT_PORT; port < DEFAULT_PORT + 4; port++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/info`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const info = await res.json();
        versionEl.textContent = `Extension: v${extVer} | Server: v${info.serverVersion || 'unknown'} (port ${port})`;
        if (info.serverVersion && extVer && extVer < info.serverVersion) {
          versionEl.style.color = '#f59e0b';
          versionEl.style.borderColor = '#92400e';
          versionEl.textContent += ' - rebuild extension';
        }
        return;
      }
    } catch { /* try next port */ }
  }
  versionEl.textContent = `Extension: v${extVer} | Server: not running`;
})();
