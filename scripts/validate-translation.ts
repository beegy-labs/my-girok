#!/usr/bin/env tsx
/**
 * Translation Validation Script
 *
 * Validates translated documentation for quality and consistency.
 *
 * Usage:
 *   tsx scripts/validate-translation.ts --locale=kr
 *
 * Checks:
 *   1. Length ratio (translated vs original)
 *   2. Code block preservation
 *   3. Link preservation
 *   4. Section structure matching
 *   5. Required elements presence
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

const DOCS_ROOT = path.join(process.cwd(), 'docs');
const CONFIG_PATH = path.join(DOCS_ROOT, 'llm/_meta/i18n-config.yaml');

interface ValidationResult {
  file: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

interface I18nConfig {
  translation: {
    settings: {
      validation: {
        length_ratio: { min: number; max: number };
        required_sections: boolean;
      };
    };
  };
}

function parseArgs(): { locale: string } {
  const args = process.argv.slice(2);
  let locale = 'kr';

  for (const arg of args) {
    if (arg.startsWith('--locale=')) {
      locale = arg.split('=')[1];
    }
  }

  return { locale };
}

function loadConfig(): I18nConfig {
  const configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return yaml.parse(configContent) as I18nConfig;
}

function extractCodeBlocks(content: string): string[] {
  const codeBlockRegex = /```[\s\S]*?```/g;
  return content.match(codeBlockRegex) || [];
}

function extractInlineCode(content: string): string[] {
  const inlineCodeRegex = /`[^`]+`/g;
  return content.match(inlineCodeRegex) || [];
}

function extractLinks(content: string): string[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links: string[] = [];
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    links.push(match[2]); // URL part only
  }
  return links;
}

function extractHeadings(content: string): string[] {
  const headingRegex = /^#{1,6}\s+.+$/gm;
  return content.match(headingRegex) || [];
}

function validateFile(
  sourcePath: string,
  targetPath: string,
  config: I18nConfig,
): ValidationResult {
  const relativePath = path.relative(path.join(DOCS_ROOT, 'en'), sourcePath);
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if target file exists
  if (!fs.existsSync(targetPath)) {
    return {
      file: relativePath,
      passed: false,
      errors: ['Target file does not exist'],
      warnings: [],
    };
  }

  const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
  const targetContent = fs.readFileSync(targetPath, 'utf-8');

  // Skip empty files
  if (!sourceContent.trim()) {
    return { file: relativePath, passed: true, errors: [], warnings: [] };
  }

  const { length_ratio } = config.translation.settings.validation;

  // 1. Length ratio check
  const sourceLength = sourceContent.length;
  const targetLength = targetContent.length;
  const ratio = targetLength / sourceLength;

  if (ratio < length_ratio.min) {
    errors.push(`Length ratio too low: ${ratio.toFixed(2)} (min: ${length_ratio.min})`);
  } else if (ratio > length_ratio.max) {
    warnings.push(`Length ratio high: ${ratio.toFixed(2)} (max: ${length_ratio.max})`);
  }

  // 2. Code block preservation
  const sourceCodeBlocks = extractCodeBlocks(sourceContent);
  const targetCodeBlocks = extractCodeBlocks(targetContent);

  if (sourceCodeBlocks.length !== targetCodeBlocks.length) {
    errors.push(
      `Code block count mismatch: source=${sourceCodeBlocks.length}, target=${targetCodeBlocks.length}`,
    );
  } else {
    // Check if code blocks content is preserved
    for (let i = 0; i < sourceCodeBlocks.length; i++) {
      // Remove leading/trailing whitespace for comparison
      const sourceBlock = sourceCodeBlocks[i].trim();
      const targetBlock = targetCodeBlocks[i].trim();

      // Code blocks should be identical (not translated)
      if (sourceBlock !== targetBlock) {
        // Allow minor whitespace differences
        const sourceNormalized = sourceBlock.replace(/\s+/g, ' ');
        const targetNormalized = targetBlock.replace(/\s+/g, ' ');

        if (sourceNormalized !== targetNormalized) {
          warnings.push(`Code block ${i + 1} may have been modified`);
        }
      }
    }
  }

  // 3. Link preservation
  const sourceLinks = extractLinks(sourceContent);
  const targetLinks = extractLinks(targetContent);

  const missingLinks = sourceLinks.filter((link) => !targetLinks.includes(link));
  if (missingLinks.length > 0) {
    errors.push(
      `Missing links: ${missingLinks.slice(0, 3).join(', ')}${missingLinks.length > 3 ? '...' : ''}`,
    );
  }

  // 4. Section structure
  const sourceHeadings = extractHeadings(sourceContent);
  const targetHeadings = extractHeadings(targetContent);

  if (sourceHeadings.length !== targetHeadings.length) {
    warnings.push(
      `Heading count mismatch: source=${sourceHeadings.length}, target=${targetHeadings.length}`,
    );
  }

  // 5. Check for untranslated content (common issue detection)
  const untranslatedPatterns = [/\bTODO\b/gi, /\bFIXME\b/gi, /\[Translation needed\]/gi];

  for (const pattern of untranslatedPatterns) {
    if (pattern.test(targetContent)) {
      warnings.push(`Possibly untranslated content detected: ${pattern.source}`);
    }
  }

  return {
    file: relativePath,
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

function getMarkdownFiles(dir: string): string[] {
  const files: string[] = [];

  function walkDir(currentDir: string) {
    if (!fs.existsSync(currentDir)) return;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  walkDir(dir);
  return files;
}

async function main() {
  const { locale } = parseArgs();
  const config = loadConfig();

  console.log('=== Translation Validation ===');
  console.log(`Locale: ${locale}`);
  console.log('');

  const sourceDir = path.join(DOCS_ROOT, 'en');
  const targetDir = path.join(DOCS_ROOT, locale);

  const sourceFiles = getMarkdownFiles(sourceDir);

  if (sourceFiles.length === 0) {
    console.log('No source files found');
    return;
  }

  console.log(`Validating ${sourceFiles.length} files...`);
  console.log('');

  const results: ValidationResult[] = [];

  for (const sourceFile of sourceFiles) {
    const relativePath = path.relative(sourceDir, sourceFile);
    const targetFile = path.join(targetDir, relativePath);

    const result = validateFile(sourceFile, targetFile, config);
    results.push(result);

    // Print result
    const status = result.passed ? '✓' : '✗';
    const statusColor = result.passed ? '\x1b[32m' : '\x1b[31m';
    console.log(`${statusColor}${status}\x1b[0m ${result.file}`);

    if (result.errors.length > 0) {
      result.errors.forEach((e) => console.log(`    \x1b[31mError: ${e}\x1b[0m`));
    }
    if (result.warnings.length > 0) {
      result.warnings.forEach((w) => console.log(`    \x1b[33mWarn: ${w}\x1b[0m`));
    }
  }

  // Summary
  console.log('');
  console.log('=== Summary ===');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const withWarnings = results.filter((r) => r.warnings.length > 0).length;

  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`With warnings: ${withWarnings}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Validation failed:', error);
  process.exit(1);
});
