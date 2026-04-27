/**
 * MCP Prompt Registration
 *
 * Registers ViewGraph prompt templates via the MCP prompts/list capability.
 * Any MCP client can discover these prompts without installing Power files.
 * This is the zero-friction delivery channel for agent guidance.
 *
 * Prompts are read from power/prompts/*.md at startup. Each file's YAML
 * frontmatter provides the description; the markdown body is the prompt content.
 *
 * @see power/prompts/ - prompt template source files
 * @see docs/architecture/chrome-devtools-mcp-analysis.md - skill delivery strategy
 */

import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';

/** Directory containing prompt markdown files (relative to package root). */
const PROMPTS_DIR = join(fileURLToPath(import.meta.url), '..', '..', 'power', 'prompts');

/**
 * Parse YAML frontmatter from a markdown file.
 * Returns { description, body } where body is the content after the frontmatter.
 *
 * @param {string} content - Raw markdown file content
 * @returns {{ description: string, body: string }}
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { description: '', body: content };
  const yaml = match[1];
  const body = match[2].trim();
  const descMatch = yaml.match(/description:\s*"([^"]+)"/);
  return { description: descMatch?.[1] || '', body };
}

/**
 * Register all prompt templates from power/prompts/ as MCP prompts.
 * Each prompt becomes discoverable via the MCP prompts/list capability.
 *
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 */
export function registerPrompts(server) {
  let files;
  try {
    files = readdirSync(PROMPTS_DIR).filter((f) => f.endsWith('.md'));
  } catch {
    return; // prompts dir not found (e.g., running from npm without power/)
  }

  for (const file of files) {
    const name = basename(file, '.md'); // e.g., "vg-review"
    try {
      const raw = readFileSync(join(PROMPTS_DIR, file), 'utf-8');
      const { description, body } = parseFrontmatter(raw);

      server.prompt(name, description || `ViewGraph prompt: ${name}`, () => ({
        messages: [{ role: 'user', content: { type: 'text', text: body } }],
      }));
    } catch {
      // Skip malformed prompt files
    }
  }
}
