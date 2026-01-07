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
 *   pnpm docs:generate --retry-failed   # Retry only failed files
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseArgs } from 'node:util';
import {
  createProvider,
  getMarkdownFiles,
  loadFailedFiles,
  saveFailedFiles,
  clearFailedFiles,
  needsRegeneration,
  type FailedFile,
} from './utils.ts';
import type { LLMProvider } from './providers/index.ts';

// Failed files tracking
const FAILED_FILES_PATH = path.join(process.cwd(), '.docs-generate-failed.json');

// Parse CLI arguments
const { values } = parseArgs({
  options: {
    provider: { type: 'string', short: 'p', default: 'ollama' },
    model: { type: 'string', short: 'm' },
    file: { type: 'string', short: 'f' },
    force: { type: 'boolean', default: false },
    'retry-failed': { type: 'boolean', default: false },
    clean: { type: 'boolean', default: false },
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
  --retry-failed         Retry only files that failed in previous run
  --clean                Clear failed history and restart all files
  -h, --help             Show this help

Examples:
  pnpm docs:generate
  pnpm docs:generate --provider gemini
  pnpm docs:generate --file policies/security.md
  pnpm docs:generate --force
  pnpm docs:generate --retry-failed
  pnpm docs:generate --clean
`);
  process.exit(0);
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

// Generate a single file
async function generateFile(
  provider: LLMProvider,
  sourcePath: string,
  targetPath: string,
  promptTemplate: string,
): Promise<void> {
  const content = fs.readFileSync(sourcePath, 'utf-8');
  const prompt = buildPrompt(promptTemplate, content);

  console.log(`  Generating: ${path.basename(sourcePath)}...`);

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
}

// Main function
async function main() {
  const providerName = values.provider!;
  const force = values.force ?? false;
  const retryFailed = values['retry-failed'] ?? false;
  const clean = values.clean ?? false;

  // Clean mode: clear failed history first
  if (clean) {
    if (clearFailedFiles(FAILED_FILES_PATH)) {
      console.log('🧹 Cleared failed files history\n');
    }
  }

  console.log(`\n📚 Documentation Generation (SSOT → Human-readable)`);
  console.log(`   Provider: ${providerName}`);
  console.log(`   Source: docs/llm/`);
  console.log(`   Target: docs/en/`);
  if (retryFailed) {
    console.log(`   Mode: Retry failed files only`);
  } else if (clean) {
    console.log(`   Mode: Clean restart (all files)`);
  }
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
  let filesToProcess: string[];

  if (retryFailed) {
    // Load failed files from previous run
    const previousFailed = loadFailedFiles(FAILED_FILES_PATH);
    if (previousFailed.length === 0) {
      console.log('✓ No failed files to retry.\n');
      return;
    }
    filesToProcess = previousFailed.map((f) => path.join(sourceDir, f.relativePath));
    console.log(`📄 Retrying ${filesToProcess.length} failed files:\n`);
    for (const f of previousFailed) {
      console.log(`   - ${f.relativePath}`);
    }
    console.log('');
  } else if (values.file) {
    const sourcePath = path.join(sourceDir, values.file);
    if (!fs.existsSync(sourcePath)) {
      console.error(`❌ File not found: ${sourcePath}`);
      process.exit(1);
    }
    filesToProcess = [sourcePath];
  } else {
    // Get all files and filter those needing regeneration
    const allFiles = getMarkdownFiles(sourceDir);
    filesToProcess = allFiles.filter((sourcePath) => {
      const relativePath = path.relative(sourceDir, sourcePath);
      const targetPath = path.join(targetDir, relativePath);
      return needsRegeneration(sourcePath, targetPath, force);
    });

    if (filesToProcess.length === 0) {
      console.log('✓ All files are up to date. Use --force to regenerate.\n');
      return;
    }
  }

  console.log(`📄 Files to generate: ${filesToProcess.length}\n`);

  // Generate each file
  let success = 0;
  const failedFiles: FailedFile[] = [];

  for (const sourcePath of filesToProcess) {
    const relativePath = path.relative(sourceDir, sourcePath);
    const targetPath = path.join(targetDir, relativePath);

    try {
      await generateFile(provider, sourcePath, targetPath, promptTemplate);
      success++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Failed: ${relativePath}`);
      console.error(`     ${errorMessage}`);
      failedFiles.push({
        relativePath,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Save failed files for retry
  saveFailedFiles(FAILED_FILES_PATH, failedFiles);

  console.log(`\n✅ Generation complete`);
  console.log(`   Success: ${success}`);
  if (failedFiles.length > 0) {
    console.log(`   Failed: ${failedFiles.length}`);
    console.log(`\n💡 To retry failed files, run:`);
    console.log(`   pnpm docs:generate --retry-failed`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
