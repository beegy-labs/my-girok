#!/usr/bin/env node
/**
 * Documentation Generation CLI
 *
 * Converts SSOT (docs/llm/) to human-readable documentation (docs/en/)
 *
 * Usage:
 *   pnpm docs:generate
 *   pnpm docs:generate --provider ollama
 *   pnpm docs:generate --provider gemini
 *   pnpm docs:generate --file policies/security.md
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseArgs } from 'node:util';
import { createOllamaProvider } from './providers/ollama.ts';
import { createGeminiProvider } from './providers/gemini.ts';
import type { LLMProvider } from './providers/index.ts';

// Default retry configuration
const DEFAULT_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// Parse CLI arguments
const { values } = parseArgs({
  options: {
    provider: { type: 'string', short: 'p', default: 'ollama' },
    model: { type: 'string', short: 'm' },
    file: { type: 'string', short: 'f' },
    force: { type: 'boolean', default: false },
    retries: { type: 'string', short: 'r', default: String(DEFAULT_RETRIES) },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help) {
  console.log(`
Documentation Generation CLI

Converts SSOT (docs/llm/) to human-readable documentation (docs/en/)

Usage:
  pnpm docs:generate [options]

Options:
  -p, --provider <name>  LLM provider: ollama, gemini (default: ollama)
  -m, --model <name>     Model name (optional)
  -f, --file <path>      Generate specific file only (relative to docs/llm/)
  --force                Regenerate even if target exists and is newer
  -r, --retries <num>    Number of retries on failure (default: ${DEFAULT_RETRIES})
  -h, --help             Show this help

Examples:
  pnpm docs:generate
  pnpm docs:generate --provider gemini
  pnpm docs:generate --file policies/security.md
  pnpm docs:generate --force
  pnpm docs:generate --retries 5
`);
  process.exit(0);
}

// Create provider
function createProvider(name: string, model?: string): LLMProvider {
  switch (name) {
    case 'ollama':
      return createOllamaProvider(undefined, model);
    case 'gemini':
      return createGeminiProvider(undefined, model);
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

// Load generation prompt template
function loadPromptTemplate(): string {
  const promptPath = path.join(import.meta.dirname, 'prompts', 'generate.txt');
  return fs.readFileSync(promptPath, 'utf-8');
}

// Build generation prompt
function buildPrompt(template: string, content: string): string {
  return template.replace('{{CONTENT}}', content);
}

// Sleep utility for retry delay
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Get all markdown files in a directory recursively
function getMarkdownFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

// Check if target needs regeneration
function needsRegeneration(sourcePath: string, targetPath: string, force: boolean): boolean {
  if (force) return true;
  if (!fs.existsSync(targetPath)) return true;

  const sourceStat = fs.statSync(sourcePath);
  const targetStat = fs.statSync(targetPath);

  return sourceStat.mtime > targetStat.mtime;
}

// Generate a single file with retry logic
async function generateFile(
  provider: LLMProvider,
  sourcePath: string,
  targetPath: string,
  promptTemplate: string,
  maxRetries: number,
): Promise<void> {
  const content = fs.readFileSync(sourcePath, 'utf-8');
  const prompt = buildPrompt(promptTemplate, content);
  const fileName = path.basename(sourcePath);

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt === 1) {
        console.log(`  Generating: ${fileName}...`);
      } else {
        console.log(`  Retrying (${attempt}/${maxRetries}): ${fileName}...`);
      }

      const generated = await provider.generate(prompt, {
        temperature: 0.3,
        maxTokens: 16384,
      });

      // Ensure target directory exists
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      fs.writeFileSync(targetPath, generated, 'utf-8');
      console.log(`  ✓ Saved: ${targetPath}`);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = RETRY_DELAY_MS * attempt; // Exponential backoff
        console.log(`  ⚠ Attempt ${attempt} failed, retrying in ${delay / 1000}s...`);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error('Generation failed after all retries');
}

// Main function
async function main() {
  const providerName = values.provider!;
  const force = values.force ?? false;
  const maxRetries = parseInt(values.retries!, 10) || DEFAULT_RETRIES;

  console.log(`\n📚 Documentation Generation (SSOT → Human-readable)`);
  console.log(`   Provider: ${providerName}`);
  console.log(`   Source: docs/llm/`);
  console.log(`   Target: docs/en/`);
  console.log(`   Retries: ${maxRetries}`);
  console.log('');

  // Create provider
  const provider = createProvider(providerName, values.model);

  // Health check
  const healthy = await provider.healthCheck();
  if (!healthy) {
    console.error(`❌ Provider "${providerName}" is not available.`);
    if (providerName === 'ollama') {
      console.error('   Make sure Ollama is running: ollama serve');
    } else if (providerName === 'gemini') {
      console.error('   Make sure GEMINI_API_KEY is set');
    }
    process.exit(1);
  }
  console.log(`✓ Provider "${providerName}" is ready\n`);

  // Load prompt template
  const promptTemplate = loadPromptTemplate();

  // Determine source and target directories
  const sourceDir = path.join(process.cwd(), 'docs', 'llm');
  const targetDir = path.join(process.cwd(), 'docs', 'en');

  // Ensure source directory exists
  if (!fs.existsSync(sourceDir)) {
    console.error(`❌ Source directory not found: ${sourceDir}`);
    process.exit(1);
  }

  // Get files to generate
  let filesToGenerate: string[];
  if (values.file) {
    const sourcePath = path.join(sourceDir, values.file);
    if (!fs.existsSync(sourcePath)) {
      console.error(`❌ File not found: ${sourcePath}`);
      process.exit(1);
    }
    filesToGenerate = [sourcePath];
  } else {
    filesToGenerate = getMarkdownFiles(sourceDir);
  }

  // Filter files that need regeneration
  const filesToProcess = filesToGenerate.filter((sourcePath) => {
    const relativePath = path.relative(sourceDir, sourcePath);
    const targetPath = path.join(targetDir, relativePath);
    return needsRegeneration(sourcePath, targetPath, force);
  });

  if (filesToProcess.length === 0) {
    console.log('✓ All files are up to date. Use --force to regenerate.\n');
    return;
  }

  console.log(`📄 Files to generate: ${filesToProcess.length}\n`);

  // Generate each file
  let success = 0;
  let failed = 0;

  for (const sourcePath of filesToProcess) {
    const relativePath = path.relative(sourceDir, sourcePath);
    const targetPath = path.join(targetDir, relativePath);

    try {
      await generateFile(provider, sourcePath, targetPath, promptTemplate, maxRetries);
      success++;
    } catch (error) {
      console.error(`  ❌ Failed after ${maxRetries} attempts: ${relativePath}`);
      console.error(`     ${error}`);
      failed++;
    }
  }

  console.log(`\n✅ Generation complete`);
  console.log(`   Success: ${success}`);
  if (failed > 0) {
    console.log(`   Failed: ${failed}`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
