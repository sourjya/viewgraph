/**
 * Native Messaging Host Registration
 *
 * Generates and installs the native messaging host manifest for
 * Chrome and Firefox. Called by viewgraph-init.
 *
 * @see ADR-013 native messaging transport
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import os from 'os';

/** Native messaging host name. Must match extension's HOST_NAME. */
const HOST_NAME = 'com.viewgraph.host';

/**
 * Get the native messaging host directory for the current platform and browser.
 * @param {'chrome'|'firefox'} browser
 * @returns {string}
 */
export function getHostDir(browser = 'chrome') {
  const home = os.homedir();
  const platform = os.platform();

  if (browser === 'firefox') {
    if (platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'Mozilla', 'NativeMessagingHosts');
    if (platform === 'win32') return path.join(home, 'AppData', 'Roaming', 'Mozilla', 'NativeMessagingHosts');
    return path.join(home, '.mozilla', 'native-messaging-hosts');
  }

  // Chrome
  if (platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'Google', 'Chrome', 'NativeMessagingHosts');
  if (platform === 'win32') return path.join(home, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'NativeMessagingHosts');
  return path.join(home, '.config', 'google-chrome', 'NativeMessagingHosts');
}

/**
 * Generate the native messaging host manifest.
 * @param {string} hostScriptPath - Absolute path to native-host.js
 * @param {string} extensionId - Chrome extension ID
 * @param {'chrome'|'firefox'} browser
 * @returns {object}
 */
export function generateManifest(hostScriptPath, extensionId, browser = 'chrome') {
  const manifest = {
    name: HOST_NAME,
    description: 'ViewGraph native messaging host for secure extension-server communication',
    path: hostScriptPath,
    type: 'stdio',
  };

  if (browser === 'chrome') {
    manifest.allowed_origins = [`chrome-extension://${extensionId}/`];
  } else {
    manifest.allowed_extensions = [extensionId];
  }

  return manifest;
}

/**
 * Install the native messaging host manifest.
 * @param {string} hostScriptPath - Absolute path to native-host.js
 * @param {string} extensionId - Chrome extension ID
 * @param {'chrome'|'firefox'} browser
 * @returns {{ path: string, manifest: object }}
 */
export function installHost(hostScriptPath, extensionId, browser = 'chrome') {
  const dir = getHostDir(browser);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const manifest = generateManifest(hostScriptPath, extensionId, browser);
  const manifestPath = path.join(dir, `${HOST_NAME}.json`);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return { path: manifestPath, manifest };
}
