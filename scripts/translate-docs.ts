#!/usr/bin/env tsx
/**
 * Docs Translation Script
 *
 * Translates documentation from docs/en/ to target locales using Claude API.
 * Preserves code blocks, links, and technical terminology.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=xxx tsx scripts/translate-docs.ts
 *
 * Environment Variables:
 *   ANTHROPIC_API_KEY - Required: Claude API key
 *   CHANGED_FILES - Optional: Comma-separated list of files to translate
 *   TARGET_LOCALE - Optional: Target locale (default: kr)
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

const DOCS_ROOT = path.join(process.cwd(), 'docs');
const CONFIG_PATH = path.join(DOCS_ROOT, 'llm/_meta/i18n-config.yaml');

interface I18nConfig {
  locales: Array<{
    code: string;
    name: string;
    primary?: boolean;
    translated?: boolean;
  }>;
  translation: {
    source: string;
    targets: string[];
    settings: {
      preserve: string[];
      validation: {
        length_ratio: { min: number; max: number };
        required_sections: boolean;
      };
    };
  };
}

interface TranslationResult {
  file: string;
  success: boolean;
  error?: string;
}

const LOCALE_NAMES: Record<string, string> = {
  kr: 'Korean',
  ja: 'Japanese',
  zh: 'Chinese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
};

function getTranslationPrompt(locale: string, content: string, filename: string): string {
  const localeName = LOCALE_NAMES[locale] || locale;

  return `You are a professional technical documentation translator. Translate the following Markdown documentation from English to ${localeName}.

## Translation Rules

1. **Preserve exactly as-is (DO NOT translate)**:
   - Code blocks (\`\`\`....\`\`\` and inline \`code\`)
   - URLs and file paths
   - Variable names, function names, class names
   - Technical terms in code context (e.g., "string", "boolean", "null")
   - Brand names (e.g., "GitHub", "Kubernetes", "Docker")
   - Markdown syntax (headers, lists, tables, links)

2. **Translate naturally**:
   - Headings and titles
   - Explanatory text and descriptions
   - Comments in natural language
   - UI labels mentioned in text (provide translation in parentheses if needed)

3. **Formatting**:
   - Keep the same Markdown structure
   - Maintain line breaks and spacing
   - Preserve table alignment
   - Keep frontmatter (if any) structure intact

4. **Quality**:
   - Use formal/professional tone
   - Be consistent with terminology throughout
   - Ensure technical accuracy

## File Information
- Source: docs/en/${filename}
- Target: docs/${locale}/${filename}

## Content to Translate

${content}

## Output

Provide ONLY the translated Markdown content. Do not include any explanations or notes.`;
}

async function loadConfig(): Promise<I18nConfig> {
  const configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return yaml.parse(configContent) as I18nConfig;
}

async function translateFile(
  client: Anthropic,
  sourcePath: string,
  targetLocale: string,
): Promise<TranslationResult> {
  const relativePath = path.relative(path.join(DOCS_ROOT, 'en'), sourcePath);
  const targetPath = path.join(DOCS_ROOT, targetLocale, relativePath);

  try {
    const content = fs.readFileSync(sourcePath, 'utf-8');

    // Skip empty files
    if (!content.trim()) {
      return { file: relativePath, success: true };
    }

    console.log(`Translating: ${relativePath} -> ${targetLocale}`);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      temperature: 0, // Deterministic output
      messages: [
        {
          role: 'user',
          content: getTranslationPrompt(targetLocale, content, relativePath),
        },
      ],
    });

    const translatedContent = response.content[0].type === 'text' ? response.content[0].text : '';

    // Ensure target directory exists
    const targetDir = path.dirname(targetPath);
    fs.mkdirSync(targetDir, { recursive: true });

    // Write translated content
    fs.writeFileSync(targetPath, translatedContent, 'utf-8');

    console.log(`  ✓ Saved: ${targetPath}`);
    return { file: relativePath, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`  ✗ Failed: ${relativePath} - ${errorMessage}`);
    return { file: relativePath, success: false, error: errorMessage };
  }
}

async function getFilesToTranslate(): Promise<string[]> {
  const changedFiles = process.env.CHANGED_FILES;

  if (changedFiles) {
    // Filter to only include docs/en files
    return changedFiles
      .split(',')
      .filter((f) => f.trim() && f.startsWith('docs/en/'))
      .map((f) => path.join(process.cwd(), f.trim()));
  }

  // Default: translate all markdown files in docs/en
  const enDir = path.join(DOCS_ROOT, 'en');
  const files: string[] = [];

  function walkDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  walkDir(enDir);
  return files;
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required');
    process.exit(1);
  }

  const targetLocale = process.env.TARGET_LOCALE || 'kr';
  const client = new Anthropic({ apiKey });

  console.log('=== Docs Translation ===');
  console.log(`Target locale: ${targetLocale}`);
  console.log('');

  const files = await getFilesToTranslate();

  if (files.length === 0) {
    console.log('No files to translate');
    return;
  }

  console.log(`Files to translate: ${files.length}`);
  console.log('');

  const results: TranslationResult[] = [];

  for (const file of files) {
    const result = await translateFile(client, file, targetLocale);
    results.push(result);

    // Rate limiting: wait 1 second between API calls
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('');
  console.log('=== Summary ===');
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  console.log(`Total: ${results.length}`);
  console.log(`Success: ${successful}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('');
    console.log('Failed files:');
    results.filter((r) => !r.success).forEach((r) => console.log(`  - ${r.file}: ${r.error}`));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Translation failed:', error);
  process.exit(1);
});
