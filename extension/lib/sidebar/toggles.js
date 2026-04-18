/**
 * Sidebar Toggles and Session Recording
 *
 * Auto-capture, auto-audit toggles, and session recording controls
 * for the Inspect tab.
 *
 * Extracted from inspect.js (16.11 decomposition).
 *
 * @see extension/lib/sidebar/inspect.js - orchestrator
 */

import { ATTR } from '#lib/selector.js';
import { startWatcher, stopWatcher, isWatcherEnabled } from '#lib/session/continuous-capture.js';
import { isRecording, startSession, stopSession, getState } from '#lib/session/session-manager.js';
import { startJourney, stopJourney } from '#lib/session/journey-recorder.js';
import * as transport from '#lib/transport.js';

/**
 * Render toggles and session recording into the container.
 * @param {HTMLElement} container
 * @param {{ refreshAll: function }} callbacks - refreshAll re-renders the entire inspect tab
 */
export async function renderToggles(container, callbacks = {}) {
  const toggleSep = document.createElement('hr');
  Object.assign(toggleSep.style, { border: 'none', borderTop: '1px solid #333', margin: '8px 0 4px' });
  container.appendChild(toggleSep);

  // Auto-capture toggle
  const autoRow = document.createElement('div');
  Object.assign(autoRow.style, { display: 'flex', alignItems: 'center', gap: '8px' });
  const autoLabel = document.createElement('span');
  autoLabel.textContent = 'AUTO-CAPTURE';
  Object.assign(autoLabel.style, { fontWeight: '600', fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', flex: '1' });
  const autoToggle = document.createElement('button');
  const watcherOn = isWatcherEnabled();
  autoToggle.textContent = watcherOn ? 'ON' : 'OFF';
  Object.assign(autoToggle.style, {
    border: 'none', borderRadius: '10px', padding: '2px 10px', fontSize: '10px',
    fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
    background: watcherOn ? '#166534' : '#333', color: watcherOn ? '#4ade80' : '#666',
  });
  autoToggle.addEventListener('click', () => {
    if (isWatcherEnabled()) {
      stopWatcher();
      autoToggle.textContent = 'OFF';
      autoToggle.style.background = '#333';
      autoToggle.style.color = '#666';
    } else {
      startWatcher(() => { chrome.runtime.sendMessage({ type: 'capture-page' }); });
      autoToggle.textContent = 'ON';
      autoToggle.style.background = '#166534';
      autoToggle.style.color = '#4ade80';
    }
  });
  autoRow.append(autoLabel, autoToggle);
  const autoDesc = document.createElement('div');
  autoDesc.textContent = 'Captures on every DOM change or hot-reload';
  Object.assign(autoDesc.style, { color: '#555', fontSize: '10px', marginBottom: '6px' });
  container.appendChild(autoRow);
  container.appendChild(autoDesc);

  // Auto-audit toggle
  const auditRow = document.createElement('div');
  Object.assign(auditRow.style, { display: 'flex', alignItems: 'center', gap: '8px' });
  const auditLabel = document.createElement('span');
  auditLabel.textContent = 'AUTO-AUDIT';
  Object.assign(auditLabel.style, { fontWeight: '600', fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', flex: '1' });
  const auditToggle = document.createElement('button');
  auditToggle.setAttribute(ATTR, 'audit-toggle');
  let auditEnabled = false;
  try {
    const cached = await chrome.storage.local.get('vg_project_config');
    auditEnabled = cached.vg_project_config?.autoAudit || false;
  } catch { /* no cache */ }
  auditToggle.textContent = auditEnabled ? 'ON' : 'OFF';
  Object.assign(auditToggle.style, {
    border: 'none', borderRadius: '10px', padding: '2px 10px', fontSize: '10px',
    fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
    background: auditEnabled ? '#166534' : '#333', color: auditEnabled ? '#4ade80' : '#666',
  });
  auditToggle.addEventListener('click', async () => {
    auditEnabled = !auditEnabled;
    auditToggle.textContent = auditEnabled ? 'ON' : 'OFF';
    auditToggle.style.background = auditEnabled ? '#166534' : '#333';
    auditToggle.style.color = auditEnabled ? '#4ade80' : '#666';
    try { await transport.updateConfig({ autoAudit: auditEnabled }); } catch { /* offline */ }
  });
  auditRow.append(auditLabel, auditToggle);
  container.appendChild(auditRow);
  const auditDesc = document.createElement('div');
  auditDesc.textContent = 'Runs a11y, layout, and testid audits after each capture';
  Object.assign(auditDesc.style, { color: '#555', fontSize: '10px', marginBottom: '6px' });
  container.appendChild(auditDesc);

  // Audit results badge
  const auditBadge = document.createElement('div');
  auditBadge.setAttribute(ATTR, 'audit-badge');
  Object.assign(auditBadge.style, { display: 'none', fontSize: '11px', color: '#9ca3af', padding: '2px 0' });
  container.appendChild(auditBadge);

  // Divider
  const flowSep = document.createElement('hr');
  Object.assign(flowSep.style, { border: 'none', borderTop: '1px solid #2a2a3a', margin: '4px 0' });
  container.appendChild(flowSep);

  // Session recording
  const sessionRow = document.createElement('div');
  sessionRow.setAttribute(ATTR, 'session-row');
  Object.assign(sessionRow.style, { display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0' });
  const recording = isRecording();
  const sessionState = getState();
  const recDot = document.createElement('span');
  Object.assign(recDot.style, {
    width: '8px', height: '8px', borderRadius: '50%', flexShrink: '0',
    background: recording ? '#dc2626' : '#333',
    animation: recording ? 'vg-pulse 1.5s infinite' : 'none',
  });
  const recLabel = document.createElement('span');
  recLabel.textContent = recording ? 'RECORDING' : 'RECORD FLOW';
  Object.assign(recLabel.style, {
    fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px',
    color: recording ? '#dc2626' : '#9ca3af',
  });
  const recInfo = document.createElement('span');
  recInfo.textContent = recording ? `Step ${sessionState.step}` : '';
  Object.assign(recInfo.style, { color: '#666', fontSize: '11px', flex: '1' });
  const recBtn = document.createElement('button');
  recBtn.setAttribute(ATTR, 'session-toggle');
  recBtn.textContent = recording ? 'Stop' : 'Start';
  Object.assign(recBtn.style, {
    border: 'none', borderRadius: '10px', padding: '2px 10px', fontSize: '10px',
    fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
    background: recording ? '#7f1d1d' : '#333', color: recording ? '#fca5a5' : '#666',
  });
  recBtn.addEventListener('click', () => {
    if (isRecording()) { stopJourney(); stopSession(); }
    else {
      startSession();
      startJourney(({ url, trigger: src }) => {
        chrome.runtime.sendMessage({ type: 'send-review', includeCapture: true, sessionNote: `Auto: ${src} to ${url}` }, () => {});
        if (callbacks.refreshAll) callbacks.refreshAll();
      });
    }
    if (callbacks.refreshAll) callbacks.refreshAll();
  });
  sessionRow.append(recDot, recLabel, recInfo, recBtn);
  container.appendChild(sessionRow);

  if (!recording) {
    const recDesc = document.createElement('div');
    recDesc.textContent = 'Tag captures as steps in a multi-page flow';
    Object.assign(recDesc.style, { color: '#555', fontSize: '10px', marginBottom: '2px' });
    container.appendChild(recDesc);
  }

  if (recording) {
    const noteRow = document.createElement('div');
    Object.assign(noteRow.style, { display: 'flex', gap: '4px', padding: '2px 0' });
    const noteInput = document.createElement('input');
    noteInput.setAttribute(ATTR, 'session-note');
    noteInput.type = 'text';
    noteInput.placeholder = 'Note for next step (optional)';
    Object.assign(noteInput.style, {
      flex: '1', background: '#1a1a2e', border: '1px solid #333', borderRadius: '4px',
      color: '#ccc', fontSize: '10px', padding: '3px 6px', fontFamily: 'system-ui, sans-serif',
      outline: 'none',
    });
    noteInput.addEventListener('focus', () => { noteInput.style.borderColor = '#6366f1'; });
    noteInput.addEventListener('blur', () => { noteInput.style.borderColor = '#333'; });
    noteInput.dataset.vgNoteTarget = 'session';
    noteRow.appendChild(noteInput);
    container.appendChild(noteRow);
  }
}
