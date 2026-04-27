/**
 * Trust Gate
 *
 * Inline warning panel shown when user tries to Send to Agent from an
 * untrusted URL. Offers two actions:
 * - "Add to trusted" - adds hostname to trustedPatterns permanently
 * - "Send anyway" - one-time override
 *
 * Part of F17 URL Trust Indicator feature.
 *
 * @see lib/constants.js - classifyTrust() determines trust level
 * @see lib/transport.js - updateConfig() persists trustedPatterns
 * @see sidebar/icons.js - shieldIcon for trust shield update
 */

import { ATTR } from '#lib/selector.js';
import { shieldIcon } from '#lib/sidebar/icons.js';
import * as transport from '#lib/transport-client.js';
import { COLOR, FONT } from './styles.js';

/**
 * Show inline trust gate when user tries to send from an untrusted URL.
 *
 * @param {HTMLElement} parent - Container to insert gate into
 * @param {HTMLElement} anchorBtn - Button to insert gate before
 * @param {Object} opts
 * @param {Function} opts.onSend - Called after user approves (add or override)
 * @param {Function} opts.onTrustUpdated - Called with new trust level after adding to trusted
 * @param {HTMLElement} [opts.shadowRoot] - Shadow root for shield update
 */
export function showTrustGate(parent, anchorBtn, { onSend, onTrustUpdated, shadowRoot }) {
  // Remove existing gate if any
  parent.querySelector(`[${ATTR}="trust-gate"]`)?.remove();

  const gate = document.createElement('div');
  gate.setAttribute(ATTR, 'trust-gate');
  Object.assign(gate.style, {
    padding: '10px 12px', background: '#2a2a1a', border: `1px solid ${COLOR.warning}`,
    borderRadius: '6px', margin: '4px 0', fontFamily: FONT,
  });

  const msg = document.createElement('div');
  msg.textContent = '\u26a0 Untrusted URL - captures from remote sites may contain malicious content.';
  Object.assign(msg.style, { color: COLOR.warning, fontSize: '11px', marginBottom: '8px', lineHeight: '1.4' });

  const hostname = (() => { try { return new URL(window.location.href).hostname; } catch { return window.location.hostname; } })();

  const btnRow = document.createElement('div');
  Object.assign(btnRow.style, { display: 'flex', gap: '6px' });

  const addBtn = document.createElement('button');
  addBtn.textContent = `Add "${hostname}" to trusted`;
  Object.assign(addBtn.style, {
    flex: '1', padding: '6px', border: 'none', borderRadius: '4px',
    background: COLOR.primary, color: COLOR.white, fontSize: '10px', fontWeight: '600',
    cursor: 'pointer', fontFamily: FONT,
  });
  addBtn.addEventListener('click', async () => {
    try {
      const cfg = await transport.getConfig().catch(() => ({}));
      const patterns = cfg.trustedPatterns || [];
      if (!patterns.includes(hostname)) patterns.push(hostname);
      await transport.updateConfig({ trustedPatterns: patterns });
      const newTrust = { level: 'configured', reason: hostname };
      onTrustUpdated(newTrust);
      // Update shield in shadow DOM
      const shield = shadowRoot?.querySelector(`[${ATTR}="trust-shield"]`);
      if (shield) { shield.replaceChildren(shieldIcon(16, '#60a5fa', 'check')); shield.setAttribute('data-tooltip', `configured: ${hostname}`); }
    } catch { /* best effort */ }
    gate.remove();
    onSend();
  });

  const overrideBtn = document.createElement('button');
  overrideBtn.textContent = 'Send anyway';
  Object.assign(overrideBtn.style, {
    padding: '6px 10px', border: `1px solid ${COLOR.border}`, borderRadius: '4px',
    background: 'transparent', color: COLOR.muted, fontSize: '10px',
    cursor: 'pointer', fontFamily: FONT,
  });
  overrideBtn.addEventListener('click', () => { gate.remove(); onSend(true); });

  btnRow.append(addBtn, overrideBtn);
  gate.append(msg, btnRow);
  anchorBtn.parentElement.insertBefore(gate, anchorBtn);
}
