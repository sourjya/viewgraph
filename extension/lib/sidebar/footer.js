/**
 * Sidebar Footer
 *
 * Creates the bottom action bar with export buttons:
 * - Send to Agent (primary CTA, full width)
 * - Copy MD + Download Report (secondary row)
 * - Settings link (centered below)
 *
 * Handles flash states (Sent!/Copied!/Saved!) and disabled state
 * when no annotations exist.
 *
 * @see lib/export/export-markdown.js - formatMarkdown for Copy MD
 * @see lib/transport.js - send-review message for Send to Agent
 */

import { ATTR } from '#lib/selector.js';
import { sendIcon, checkIcon, docIcon, downloadIcon, gearIcon } from '#lib/sidebar/icons.js';
import { COLOR, FONT } from './styles.js';
import { formatMarkdown } from '#lib/export/export-markdown.js';
import { getAnnotations } from '#lib/annotate.js';
import { collectNetworkState } from '#lib/collectors/network-collector.js';
import { getConsoleState } from '#lib/collectors/console-collector.js';
import { collectBreakpoints } from '#lib/collectors/breakpoint-collector.js';
import { collectStackingContexts } from '#lib/collectors/stacking-collector.js';
import { collectFocusChain } from '#lib/collectors/focus-collector.js';
import { collectScrollContainers } from '#lib/collectors/scroll-collector.js';
import { collectLandmarks } from '#lib/collectors/landmark-collector.js';
import { collectComponents } from '#lib/collectors/component-collector.js';

const BTN_STYLE = {
  padding: '7px 4px', border: 'none', borderRadius: '6px',
  color: COLOR.white, fontSize: '11px', fontWeight: '600', cursor: 'pointer',
  fontFamily: FONT, transition: 'background 0.12s',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
};

/**
 * Create the sidebar footer with export actions.
 *
 * @param {Object} opts
 * @param {Function} opts.onSend - Called when Send to Agent clicked (after trust check)
 * @param {Function} opts.onShowSettings - Called when Settings link clicked
 * @returns {{ element: HTMLElement, sendBtn: HTMLElement, copyBtn: HTMLElement, dlBtn: HTMLElement, setOfflineMode: Function, updateDisabledState: Function }}
 */
export function createFooter({ onSend, onShowSettings }) {
  const footer = document.createElement('div');
  footer.setAttribute(ATTR, 'footer');
  Object.assign(footer.style, { borderTop: `1px solid ${COLOR.borderLight}`, padding: '6px 8px', flexShrink: '0' });

  // Send to Agent (primary)
  const sendBtn = document.createElement('button');
  sendBtn.setAttribute(ATTR, 'send');
  sendBtn.setAttribute('data-tooltip', 'Send annotations to your AI agent');
  sendBtn.replaceChildren(sendIcon(14), document.createTextNode('Send to Agent'));
  Object.assign(sendBtn.style, { ...BTN_STYLE, background: COLOR.primary, width: '100%', padding: '9px 4px', marginBottom: '4px' });
  sendBtn.title = 'Send annotations to your AI coding agent via MCP';
  sendBtn.addEventListener('mouseenter', () => { sendBtn.style.background = '#5558e6'; });
  sendBtn.addEventListener('mouseleave', () => { sendBtn.style.background = COLOR.primary; });
  sendBtn.addEventListener('click', onSend);

  // Copy Markdown
  const copyBtn = document.createElement('button');
  copyBtn.setAttribute(ATTR, 'copy-md');
  copyBtn.setAttribute('data-tooltip', 'Copy as Markdown for Jira/GitHub');
  copyBtn.replaceChildren(docIcon(14), document.createTextNode('Copy MD'));
  Object.assign(copyBtn.style, { ...BTN_STYLE, background: 'transparent', color: COLOR.secondary, flex: '1', border: `1px solid ${COLOR.border}` });
  copyBtn.title = 'Copy as Markdown';
  copyBtn.addEventListener('mouseenter', () => { copyBtn.style.background = 'rgba(255,255,255,0.05)'; });
  copyBtn.addEventListener('mouseleave', () => { copyBtn.style.background = 'transparent'; });
  copyBtn.addEventListener('click', () => {
    const meta = { title: document.title, url: location.href, timestamp: new Date().toISOString(), viewport: { width: window.innerWidth, height: window.innerHeight }, browser: navigator.userAgent.match(/Chrome\/[\d.]+|Firefox\/[\d.]+/)?.[0] || 'Unknown' };
    const enrichment = { network: collectNetworkState(), console: getConsoleState(), breakpoints: collectBreakpoints(), stacking: collectStackingContexts(), focus: collectFocusChain(), scroll: collectScrollContainers(), landmarks: collectLandmarks(), components: collectComponents() };
    const md = formatMarkdown(getAnnotations(), meta, { enrichment });
    navigator.clipboard.writeText(md).then(() => {
      flashButton(copyBtn, 'Copied!', docIcon, 'Copy MD');
    });
  });

  // Download Report
  const dlBtn = document.createElement('button');
  dlBtn.setAttribute(ATTR, 'download');
  dlBtn.setAttribute('data-tooltip', 'Download ZIP report with screenshots');
  dlBtn.replaceChildren(downloadIcon(14), document.createTextNode('Report'));
  Object.assign(dlBtn.style, { ...BTN_STYLE, background: 'transparent', color: COLOR.secondary, flex: '1', border: `1px solid ${COLOR.border}` });
  dlBtn.title = 'Download Report (Markdown + Screenshots)';
  dlBtn.addEventListener('mouseenter', () => { dlBtn.style.background = 'rgba(255,255,255,0.05)'; });
  dlBtn.addEventListener('mouseleave', () => { dlBtn.style.background = 'transparent'; });
  dlBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'download-report' });
    flashButton(dlBtn, 'Saved!', downloadIcon, 'Report');
  });

  // Secondary row
  const secondaryRow = document.createElement('div');
  Object.assign(secondaryRow.style, { display: 'flex', gap: '4px', alignItems: 'center' });
  secondaryRow.append(copyBtn, dlBtn);

  // Settings link
  const settingsLink = document.createElement('button');
  settingsLink.setAttribute(ATTR, 'settings-link');
  settingsLink.replaceChildren(gearIcon(12), document.createTextNode(' Settings'));
  Object.assign(settingsLink.style, {
    border: 'none', background: 'transparent', cursor: 'pointer',
    color: COLOR.muted, fontSize: '11px', fontFamily: FONT,
    padding: '6px 0', display: 'flex', alignItems: 'center', gap: '5px',
    width: '100%', justifyContent: 'center', marginTop: '4px',
  });
  settingsLink.addEventListener('mouseenter', () => { settingsLink.style.color = COLOR.secondary; });
  settingsLink.addEventListener('mouseleave', () => { settingsLink.style.color = COLOR.dim; });
  settingsLink.addEventListener('click', onShowSettings);

  footer.append(sendBtn, secondaryRow, settingsLink);

  /** Flash a button green with a success message, then restore. */
  function flashButton(btn, msg, iconFn, label) {
    btn.replaceChildren(checkIcon(14), document.createTextNode(msg));
    btn.style.background = '#059669';
    setTimeout(() => { btn.replaceChildren(iconFn(14), document.createTextNode(label)); btn.style.background = 'transparent'; }, 2000);
  }

  /**
   * Switch to offline mode: hide Send, promote Copy MD and Report.
   * Called when no server is discovered.
   */
  function setOfflineMode() {
    sendBtn.style.display = 'none';
    Object.assign(copyBtn.style, { background: COLOR.primary, color: COLOR.white, border: 'none', flex: '1' });
    Object.assign(dlBtn.style, { background: '#374151', color: COLOR.white, border: 'none', flex: '1' });
  }

  /**
   * Enable/disable export buttons based on annotation count.
   * @param {boolean} hasNotes - Whether any annotations exist
   */
  function updateDisabledState(hasNotes) {
    for (const btn of [sendBtn, copyBtn, dlBtn]) {
      btn.disabled = !hasNotes;
      btn.style.opacity = hasNotes ? '1' : '0.4';
      btn.style.cursor = hasNotes ? 'pointer' : 'default';
    }
  }

  /**
   * Flash the send button with success state.
   * Called after successful send-to-agent.
   */
  function flashSend() {
    sendBtn.replaceChildren(checkIcon(14), document.createTextNode('Sent!'));
    sendBtn.style.background = '#059669';
    setTimeout(() => { sendBtn.replaceChildren(sendIcon(14), document.createTextNode('Send to Agent')); sendBtn.style.background = COLOR.primary; }, 2000);
  }

  return { element: footer, sendBtn, copyBtn, dlBtn, setOfflineMode, updateDisabledState, flashSend };
}
