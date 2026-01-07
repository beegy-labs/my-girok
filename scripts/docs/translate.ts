#!/usr/bin/env node
/**
 * Documentation Translation CLI
 *
 * Usage:
 *   pnpm docs:translate --locale kr
 *   pnpm docs:translate --locale kr --provider ollama
 *   pnpm docs:translate --locale kr --provider gemini
 *   pnpm docs:translate --file policies/security.md --locale kr
 *   pnpm docs:translate --locale kr --retry-failed   # Retry only failed files
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseArgs } from 'node:util';
import { createOllamaProvider } from './providers/ollama.ts';
import { createGeminiProvider } from './providers/gemini.ts';
import type { LLMProvider } from './providers/index.ts';

// Language names for prompts
const LANGUAGE_NAMES: Record<string, string> = {
  kr: 'Korean',
  ja: 'Japanese',
  zh: 'Chinese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
};

// Failed files tracking
const FAILED_FILES_PATH = path.join(process.cwd(), '.docs-translate-failed.json');

interface FailedFile {
  relativePath: string;
  error: string;
  timestamp: string;
}

// Parse CLI arguments
const { values } = parseArgs({
  options: {
    locale: { type: 'string', short: 'l', default: 'kr' },
    provider: { type: 'string', short: 'p', default: 'ollama' },
    model: { type: 'string', short: 'm' },
    file: { type: 'string', short: 'f' },
    'retry-failed': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help) {
  console.log(`
Documentation Translation CLI

Usage:
  pnpm docs:translate [options]

Options:
  -l, --locale <code>    Target locale (default: kr)
  -p, --provider <name>  LLM provider: ollama, gemini (default: ollama)
  -m, --model <name>     Model name (optional)
  -f, --file <path>      Translate specific file only (relative to docs/en/)
  --retry-failed         Retry only files that failed in previous run
  -h, --help             Show this help

Examples:
  pnpm docs:translate --locale kr
  pnpm docs:translate --locale kr --provider gemini
  pnpm docs:translate --file policies/security.md --locale kr
  pnpm docs:translate --locale kr --retry-failed
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

// Load translation prompt template
function loadPromptTemplate(): string {
  const promptPath = path.join(import.meta.dirname, 'prompts', 'translate.txt');
  return fs.readFileSync(promptPath, 'utf-8');
}

// Build translation prompt
function buildPrompt(template: string, content: string, targetLanguage: string): string {
  return template.replace('{{TARGET_LANGUAGE}}', targetLanguage).replace('{{CONTENT}}', content);
}

// Get all markdown files in a directory recursively
function getMarkdownFiles(dir: string): string[] {
  const files: string[] = [];

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

// Load failed files from previous run
function loadFailedFiles(): FailedFile[] {
  if (!fs.existsSync(FAILED_FILES_PATH)) {
    return [];
  }
  try {
    const content = fs.readFileSync(FAILED_FILES_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

// Save failed files
function saveFailedFiles(failedFiles: FailedFile[]): void {
  if (failedFiles.length === 0) {
    // Remove file if no failures
    if (fs.existsSync(FAILED_FILES_PATH)) {
      fs.unlinkSync(FAILED_FILES_PATH);
    }
    return;
  }
  fs.writeFileSync(FAILED_FILES_PATH, JSON.stringify(failedFiles, null, 2), 'utf-8');
}

// Translate a single file
async function translateFile(
  provider: LLMProvider,
  sourcePath: string,
  targetPath: string,
  targetLanguage: string,
  promptTemplate: string,
): Promise<void> {
  const content = fs.readFileSync(sourcePath, 'utf-8');
  const prompt = buildPrompt(promptTemplate, content, targetLanguage);

  console.log(`  Translating: ${path.basename(sourcePath)}...`);

  const translated = await provider.generate(prompt, {
    temperature: 0.1,
    maxTokens: 16384,
  });

  // Ensure target directory exists
  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(targetPath, translated, 'utf-8');
  console.log(`  ✓ Saved: ${targetPath}`);
}

// Main function
async function main() {
  const locale = values.locale!;
  const providerName = values.provider!;
  const retryFailed = values['retry-failed'] ?? false;
  const targetLanguage = LANGUAGE_NAMES[locale] ?? locale;

  console.log(`\n📚 Documentation Translation`);
  console.log(`   Provider: ${providerName}`);
  console.log(`   Target: ${locale} (${targetLanguage})`);
  if (retryFailed) {
    console.log(`   Mode: Retry failed files only`);
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
  const sourceDir = path.join(process.cwd(), 'docs', 'en');
  const targetDir = path.join(process.cwd(), 'docs', locale);

  // Get files to translate
  let filesToTranslate: string[];

  if (retryFailed) {
    // Load failed files from previous run
    const previousFailed = loadFailedFiles();
    if (previousFailed.length === 0) {
      console.log('✓ No failed files to retry.\n');
      return;
    }
    filesToTranslate = previousFailed.map((f) => path.join(sourceDir, f.relativePath));
    console.log(`📄 Retrying ${filesToTranslate.length} failed files:\n`);
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
    filesToTranslate = [sourcePath];
  } else {
    filesToTranslate = getMarkdownFiles(sourceDir);
  }

  console.log(`📄 Files to translate: ${filesToTranslate.length}\n`);

  // Translate each file
  let success = 0;
  const failedFiles: FailedFile[] = [];

  for (const sourcePath of filesToTranslate) {
    const relativePath = path.relative(sourceDir, sourcePath);
    const targetPath = path.join(targetDir, relativePath);

    try {
      await translateFile(provider, sourcePath, targetPath, targetLanguage, promptTemplate);
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
  saveFailedFiles(failedFiles);

  console.log(`\n✅ Translation complete`);
  console.log(`   Success: ${success}`);
  if (failedFiles.length > 0) {
    console.log(`   Failed: ${failedFiles.length}`);
    console.log(`\n💡 To retry failed files, run:`);
    console.log(`   pnpm docs:translate --locale ${locale} --retry-failed`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
