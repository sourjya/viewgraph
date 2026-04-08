/**
 * File Watcher — ViewGraph Captures Directory
 *
 * Uses chokidar to watch for new/changed/deleted .json files in the captures
 * directory. chokidar is used instead of fs.watch for cross-platform reliability,
 * especially on WSL/Windows boundaries where fs.watch is unreliable.
 *
 * Design: awaitWriteFinish is intentionally disabled because it can prevent
 * detection of pre-existing files on startup. Instead, consumers should handle
 * partial reads gracefully (the parser already does via safeParse).
 */

import chokidar from 'chokidar';
import path from 'path';

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
    console.error(`[viewgraph] Capture added: ${filename}`);
    onAdd(filename, filePath);
  });

  watcher.on('change', (filePath) => {
    if (!filePath.endsWith('.json')) return;
    const filename = path.basename(filePath);
    console.error(`[viewgraph] Capture changed: ${filename}`);
    onChange(filename, filePath);
  });

  watcher.on('unlink', (filePath) => {
    if (!filePath.endsWith('.json')) return;
    const filename = path.basename(filePath);
    console.error(`[viewgraph] Capture removed: ${filename}`);
    onRemove(filename);
  });

  watcher.on('error', (err) => {
    console.error(`[viewgraph] Watcher error: ${err.message}`);
  });

  return watcher;
}
