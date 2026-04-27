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
import * as transport from '#lib/transport-client.js';
import { COLOR, FONT, TOGGLE_STYLE, TOGGLE_ON, TOGGLE_OFF, LABEL_STYLE, DESC_STYLE, DIVIDER_STYLE, DIVIDER_SUBTLE_STYLE } from './styles.js';

/**
 * Render toggles and session recording into the container.
 * @param {HTMLElement} container
 * @param {{ refreshAll: function }} callbacks - refreshAll re-renders the entire inspect tab
 */
export async function renderToggles(container, callbacks = {}) {
  const toggleSep = document.createElement('hr');
  Object.assign(toggleSep.style, DIVIDER_STYLE);
  container.appendChild(toggleSep);

  // Auto-capture toggle
  const autoRow = document.createElement('div');
  Object.assign(autoRow.style, { display: 'flex', alignItems: 'center', gap: '8px' });
  const autoLabel = document.createElement('span');
  autoLabel.textContent = 'AUTO-CAPTURE';
  Object.assign(autoLabel.style, { ...LABEL_STYLE, flex: '1' });
  const autoToggle = document.createElement('button');
  autoToggle.setAttribute('data-tooltip', 'Auto-capture on DOM changes and hot-reload');
  let watcherOn = isWatcherEnabled();

  // Restore persisted auto-capture state across page reloads
  try {
    const stored = await chrome.storage.local.get('vg_auto_capture');
    if (stored.vg_auto_capture && !watcherOn) {
      startWatcher(() => { chrome.runtime.sendMessage({ type: 'capture-page' }); });
      watcherOn = true;
    }
  } catch { /* storage unavailable */ }

  autoToggle.textContent = watcherOn ? 'ON' : 'OFF';
  Object.assign(autoToggle.style, { ...TOGGLE_STYLE, ...(watcherOn ? TOGGLE_ON : TOGGLE_OFF) });
  autoToggle.addEventListener('click', () => {
    if (isWatcherEnabled()) {
      stopWatcher();
      autoToggle.textContent = 'OFF';
      Object.assign(autoToggle.style, TOGGLE_OFF);
      chrome.storage.local.set({ vg_auto_capture: false });
    } else {
      startWatcher(() => { chrome.runtime.sendMessage({ type: 'capture-page' }); });
      autoToggle.textContent = 'ON';
      Object.assign(autoToggle.style, TOGGLE_ON);
      chrome.storage.local.set({ vg_auto_capture: true });
    }
  });
  autoRow.append(autoLabel, autoToggle);
  const autoDesc = document.createElement('div');
  autoDesc.textContent = 'Captures on every DOM change or hot-reload';
  Object.assign(autoDesc.style, DESC_STYLE);
  container.appendChild(autoRow);
  container.appendChild(autoDesc);

  // Auto-audit toggle
  const auditRow = document.createElement('div');
  Object.assign(auditRow.style, { display: 'flex', alignItems: 'center', gap: '8px' });
  const auditLabel = document.createElement('span');
  auditLabel.textContent = 'AUTO-AUDIT';
  Object.assign(auditLabel.style, { ...LABEL_STYLE, flex: '1' });
  const auditToggle = document.createElement('button');
  auditToggle.setAttribute(ATTR, 'audit-toggle');
  auditToggle.setAttribute('data-tooltip', 'Run a11y, layout, and testid audits after each capture');
  let auditEnabled = false;
  try {
    const cached = await chrome.storage.local.get('vg_project_config');
    auditEnabled = cached.vg_project_config?.autoAudit || false;
  } catch { /* no cache */ }
  auditToggle.textContent = auditEnabled ? 'ON' : 'OFF';
  Object.assign(auditToggle.style, { ...TOGGLE_STYLE, ...(auditEnabled ? TOGGLE_ON : TOGGLE_OFF) });
  auditToggle.addEventListener('click', async () => {
    auditEnabled = !auditEnabled;
    auditToggle.textContent = auditEnabled ? 'ON' : 'OFF';
    Object.assign(auditToggle.style, auditEnabled ? TOGGLE_ON : TOGGLE_OFF);
    try { await transport.updateConfig({ autoAudit: auditEnabled }); } catch { /* offline */ }
  });
  auditRow.append(auditLabel, auditToggle);
  container.appendChild(auditRow);
  const auditDesc = document.createElement('div');
  auditDesc.textContent = 'Runs a11y, layout, and testid audits after each capture';
  Object.assign(auditDesc.style, DESC_STYLE);
  container.appendChild(auditDesc);

  // Audit results badge
  const auditBadge = document.createElement('div');
  auditBadge.setAttribute(ATTR, 'audit-badge');
  Object.assign(auditBadge.style, { display: 'none', fontSize: '11px', color: COLOR.secondary, padding: '2px 0' });
  container.appendChild(auditBadge);

  // Divider
  const flowSep = document.createElement('hr');
  Object.assign(flowSep.style, DIVIDER_SUBTLE_STYLE);
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
    background: recording ? COLOR.error : COLOR.border,
    animation: recording ? 'vg-pulse 1.5s infinite' : 'none',
  });
  const recLabel = document.createElement('span');
  recLabel.textContent = recording ? 'RECORDING' : 'RECORD FLOW';
  Object.assign(recLabel.style, {
    fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px',
    color: recording ? COLOR.error : COLOR.secondary,
  });
  const recInfo = document.createElement('span');
  recInfo.textContent = recording ? `Step ${sessionState.step}` : '';
  Object.assign(recInfo.style, { color: COLOR.muted, fontSize: '11px', flex: '1' });
  const recBtn = document.createElement('button');
  recBtn.setAttribute(ATTR, 'session-toggle');
  recBtn.setAttribute('data-tooltip', recording ? 'Stop recording flow' : 'Record a multi-page user journey');
  recBtn.textContent = recording ? 'Stop' : 'Start';
  Object.assign(recBtn.style, {
    ...TOGGLE_STYLE,
    background: recording ? COLOR.errorDark : COLOR.border, color: recording ? '#fca5a5' : COLOR.muted,
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
    Object.assign(recDesc.style, { color: COLOR.dim, fontSize: '10px', marginBottom: '2px' });
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
      flex: '1', background: COLOR.bgDark, border: `1px solid ${COLOR.border}`, borderRadius: '4px',
      color: '#ccc', fontSize: '10px', padding: '3px 6px', fontFamily: FONT,
      outline: 'none',
    });
    noteInput.addEventListener('focus', () => { noteInput.style.borderColor = COLOR.primary; });
    noteInput.addEventListener('blur', () => { noteInput.style.borderColor = COLOR.border; });
    noteInput.dataset.vgNoteTarget = 'session';
    noteRow.appendChild(noteInput);
    container.appendChild(noteRow);
  }
}
