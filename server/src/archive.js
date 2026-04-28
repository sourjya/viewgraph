/**
 * Capture Archive
 *
 * Moves resolved captures from captures/ to archive/YYYY-MM/ with a
 * lightweight index.json for historical queries. Keeps the active
 * captures directory lean for fast agent scans.
 *
 * Archive eligibility: all annotations resolved (or none), older than
 * ageThresholdHours, not the latest N captures per URL.
 *
 * @see docs/ideas/rolling-archive.md - full design rationale
 * @see #src/indexer.js - in-memory index for active captures
 */

import { promises as fs } from 'node:fs';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

/** Default archive configuration. */
const DEFAULTS = { ageThresholdHours: 24, keepLatestPerUrl: 2 };

/**
 * Check if a parsed capture is eligible for archiving.
 * Eligible when all annotations are resolved (or none exist) and the
 * capture is older than the age threshold.
 *
 * @param {object} capture - Parsed capture JSON
 * @param {{ now?: Date, ageThresholdHours?: number }} opts
 * @returns {boolean}
 */
export function isEligible(capture, opts = {}) {
  const { now = new Date(), ageThresholdHours = DEFAULTS.ageThresholdHours } = opts;
  const anns = capture.annotations || [];
  // Any unresolved annotation disqualifies
  if (anns.some((a) => !a.resolved)) return false;
  // Must be older than threshold
  const ts = new Date(capture.metadata?.timestamp || 0);
  const ageMs = now.getTime() - ts.getTime();
  return ageMs >= ageThresholdHours * 3600_000;
}

/**
 * Derive the archive subdirectory (YYYY-MM) from a capture timestamp.
 * @param {string} timestamp - ISO timestamp
 * @returns {string} e.g. "2026-04"
 */
function monthFolder(timestamp) {
  const d = new Date(timestamp);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Resolve the archive root directory (sibling of captures/).
 * @param {string} capturesDir - Absolute path to captures/
 * @returns {string} Absolute path to archive/
 */
function archiveRoot(capturesDir) {
  return path.join(path.dirname(capturesDir), 'archive');
}

/**
 * Read the archive index.json. Returns empty structure if missing.
 * @param {string} archiveDir - Absolute path to archive/
 * @returns {{ version: number, lastUpdated: string, captures: Array }}
 */
export function readArchiveIndex(archiveDir) {
  const indexPath = path.join(archiveDir, 'index.json');
  try {
    return JSON.parse(readFileSync(indexPath, 'utf-8'));
  } catch {
    return { version: 1, lastUpdated: new Date().toISOString(), captures: [] };
  }
}

/**
 * Write the archive index.json atomically.
 * @param {string} archiveDir - Absolute path to archive/
 * @param {object} index - Index object to write
 */
function writeArchiveIndex(archiveDir, index) {
  index.lastUpdated = new Date().toISOString();
  writeFileSync(path.join(archiveDir, 'index.json'), JSON.stringify(index, null, 2));
}

/**
 * Build an index entry from a parsed capture.
 * @param {string} filename - Original filename
 * @param {string} archivePath - Relative path within archive/ (e.g. "2026-04/file.json")
 * @param {object} capture - Parsed capture JSON
 * @returns {object} Index entry
 */
function buildIndexEntry(filename, archivePath, capture) {
  const anns = capture.annotations || [];
  const categories = [...new Set(anns.map((a) => a.category).filter(Boolean).flatMap((c) => c.split(',')))];
  const resolutions = anns
    .filter((a) => a.resolution)
    .map((a) => ({ uuid: a.uuid, action: a.resolution.action, by: a.resolution.by, summary: a.resolution.summary?.slice(0, 100), at: a.resolution.at }));
  return {
    filename: archivePath,
    originalPath: filename,
    url: capture.metadata?.url || '',
    title: capture.metadata?.title || '',
    timestamp: capture.metadata?.timestamp || '',
    nodeCount: capture.metadata?.stats?.totalNodes || capture.nodes?.length || 0,
    annotations: { total: anns.length, resolved: anns.filter((a) => a.resolved).length, categories },
    resolutions,
    archivedAt: new Date().toISOString(),
  };
}

/**
 * Archive a single capture file. Moves it to archive/YYYY-MM/ and
 * updates index.json.
 *
 * @param {string} capturesDir - Absolute path to captures/
 * @param {string} filename - Capture filename (e.g. "viewgraph-localhost-2026-04-08-1206.json")
 */
export async function archiveCapture(capturesDir, filename) {
  const srcPath = path.join(capturesDir, filename);
  const raw = await fs.readFile(srcPath, 'utf-8');
  const capture = JSON.parse(raw);

  const month = monthFolder(capture.metadata?.timestamp || new Date().toISOString());
  const root = archiveRoot(capturesDir);
  const destDir = path.join(root, month);
  mkdirSync(destDir, { recursive: true });

  const destPath = path.join(destDir, filename);
  await fs.rename(srcPath, destPath);

  // Update index
  const index = readArchiveIndex(root);
  index.captures.push(buildIndexEntry(filename, `${month}/${filename}`, capture));
  writeArchiveIndex(root, index);
}

/**
 * Run archive pass on all captures in the directory. Checks eligibility,
 * respects keepLatestPerUrl, and archives eligible files.
 *
 * @param {string} capturesDir - Absolute path to captures/
 * @param {{ now?: Date, ageThresholdHours?: number, keepLatestPerUrl?: number }} opts
 * @returns {{ archived: number, skipped: number }}
 */
export async function runArchive(capturesDir, opts = {}) {
  const { now = new Date(), ageThresholdHours = DEFAULTS.ageThresholdHours, keepLatestPerUrl = DEFAULTS.keepLatestPerUrl } = opts;

  let files;
  try { files = readdirSync(capturesDir).filter((f) => f.endsWith('.json') && f.startsWith('viewgraph-')); } catch { return { archived: 0, skipped: 0 }; }

  // Parse all captures and check eligibility
  const candidates = [];
  for (const f of files) {
    try {
      const raw = readFileSync(path.join(capturesDir, f), 'utf-8');
      const capture = JSON.parse(raw);
      const eligible = isEligible(capture, { now, ageThresholdHours });
      candidates.push({ filename: f, capture, eligible, url: capture.metadata?.url || '', timestamp: capture.metadata?.timestamp || '' });
    } catch { /* skip unparseable files */ }
  }

  // Protect latest N per URL from archiving
  if (keepLatestPerUrl > 0) {
    const byUrl = {};
    for (const c of candidates) {
      if (!byUrl[c.url]) byUrl[c.url] = [];
      byUrl[c.url].push(c);
    }
    for (const urlCandidates of Object.values(byUrl)) {
      urlCandidates.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      for (let i = 0; i < Math.min(keepLatestPerUrl, urlCandidates.length); i++) {
        urlCandidates[i].eligible = false; // protect latest N
      }
    }
  }

  let archived = 0;
  let skipped = 0;
  for (const c of candidates) {
    if (c.eligible) {
      await archiveCapture(capturesDir, c.filename);
      archived++;
    } else {
      skipped++;
    }
  }
  return { archived, skipped };
}
