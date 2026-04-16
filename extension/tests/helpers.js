/**
 * Shared Test Constants
 *
 * Centralized values used across test files. Prevents hardcoded
 * version numbers and other values that go stale.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'));

/** Current extension version from package.json. */
export const VERSION = pkg.version;
