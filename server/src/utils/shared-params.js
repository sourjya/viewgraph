/**
 * Shared Zod Parameter Schemas
 *
 * Common parameter definitions used across multiple MCP tools.
 * Extracted to eliminate duplication and ensure consistent descriptions.
 *
 * @see .kiro/specs/schema-token-optimization/design.md - Phase 3
 */

import { z } from 'zod';

/** Capture filename parameter - used by 10+ tools. */
export const filenameParam = z.string().describe('Capture filename');

/** URL substring filter - used by list/history/latest tools. */
export const urlFilterParam = z.string().optional().describe('Filter by URL substring');

/** Result limit - used by list/history tools. */
export const limitParam = z.number().optional().default(20).describe('Max results');

/** First capture filename for comparison tools. */
export const fileAParam = z.string().describe('First capture filename (before)');

/** Second capture filename for comparison tools. */
export const fileBParam = z.string().describe('Second capture filename (after)');
