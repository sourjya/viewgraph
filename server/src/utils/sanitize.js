/**
 * Capture Text Sanitization Utilities
 *
 * Wraps page-sourced text in delimiters and detects suspicious
 * instruction-like patterns. Part of F19 prompt injection defense.
 *
 * Delimiters create a clear boundary between data and instructions
 * so LLMs can distinguish captured page content from actual commands.
 *
 * @see ADR-012 prompt injection defense
 * @see .kiro/specs/prompt-injection-defense/design.md
 */

/** Delimiter for page-sourced text (DOM content). */
export const TEXT_OPEN = '[CAPTURED_TEXT]';
export const TEXT_CLOSE = '[/CAPTURED_TEXT]';

/** Delimiter for user annotation comments. */
export const COMMENT_OPEN = '[USER_COMMENT]';
export const COMMENT_CLOSE = '[/USER_COMMENT]';

/**
 * Wrap page-sourced text in CAPTURED_TEXT delimiters.
 * @param {string} text
 * @returns {string}
 */
export function wrapCapturedText(text) {
  if (!text) return text;
  return `${TEXT_OPEN}${text}${TEXT_CLOSE}`;
}

/**
 * Wrap user annotation comment in USER_COMMENT delimiters.
 * @param {string} text
 * @returns {string}
 */
export function wrapComment(text) {
  if (!text) return text;
  return `${COMMENT_OPEN}${text}${COMMENT_CLOSE}`;
}

/**
 * Patterns that look like prompt injection attempts.
 * Tuned to avoid false positives on normal UI text like
 * "System settings", "Ignore this field", "Submit Form".
 */
const SUSPICIOUS_PATTERNS = [
  { re: /ignore\s+(all\s+)?(above|previous|prior)\s+instructions/i, name: 'ignore-instructions' },
  { re: /system\s*:\s*\w/i, name: 'system-prefix' },
  { re: /IMPORTANT\s*:\s*(ignore|override|forget|disregard)/i, name: 'important-override' },
  { re: /you\s+are\s+now\s+/i, name: 'role-reassignment' },
  { re: /disregard\s+(all|previous|above)/i, name: 'disregard' },
  { re: /new\s+instructions\s*:/i, name: 'new-instructions' },
  { re: /override\s+(all|previous)\s/i, name: 'override' },
  { re: /forget\s+everything\s+(above|previous|you)/i, name: 'forget' },
  { re: /act\s+as\s+(a|an|if|though)\s/i, name: 'act-as' },
  { re: /pretend\s+you\s+are/i, name: 'pretend' },
  { re: /execute\s+the\s+following/i, name: 'execute' },
];

/**
 * Check text for instruction-like patterns.
 * @param {string} text
 * @returns {{ suspicious: boolean, patterns: string[] }}
 */
export function detectSuspicious(text) {
  if (!text || text.length < 10) return { suspicious: false, patterns: [] };
  const found = SUSPICIOUS_PATTERNS
    .filter((p) => p.re.test(text))
    .map((p) => p.name);
  return { suspicious: found.length > 0, patterns: found };
}
