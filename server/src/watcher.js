/**
 * File Watcher — Captures Directory
 *
 * Uses chokidar to watch for new/changed/deleted .json files in the captures
 * directory. chokidar is used instead of fs.watch for cross-platform reliability,
 * especially on WSL/Windows boundaries where fs.watch is unreliable.
 *
 * Watches the directory (not a glob) because chokidar glob patterns don't
 * reliably detect pre-existing files on some platforms.
 */

import chokidar from 'chokidar';
import path from 'path';
import { LOG_PREFIX } from './constants.js';

/**
 * Start watching a directory for capture file changes.
 * @param {string} dir - Absolute path to captures directory
 * @param {{ onAdd: Function, onChange: Function, onRemove: Function }} callbacks
 * @returns {import('chokidar').FSWatcher} watcher instance for cleanup
 */
export function createWatcher(dir, { onAdd, onChange, onRemove }) {
  const watcher = chokidar.watch(dir, {
    ignoreInitial: false,
    persistent: true,
  });

  watcher.on('add', (filePath) => {
    if (!filePath.endsWith('.json')) return;
    const filename = path.basename(filePath);
    console.error(`${LOG_PREFIX} Capture added: ${filename}`);
    onAdd(filename, filePath);
  });

  watcher.on('change', (filePath) => {
    if (!filePath.endsWith('.json')) return;
    const filename = path.basename(filePath);
    console.error(`${LOG_PREFIX} Capture changed: ${filename}`);
    onChange(filename, filePath);
  });

  watcher.on('unlink', (filePath) => {
    if (!filePath.endsWith('.json')) return;
    const filename = path.basename(filePath);
    console.error(`${LOG_PREFIX} Capture removed: ${filename}`);
    onRemove(filename);
  });

  watcher.on('error', (err) => {
    console.error(`${LOG_PREFIX} Watcher error: ${err.message}`);
  });

  return watcher;
}
