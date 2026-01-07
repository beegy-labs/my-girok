/**
 * Shared utilities for documentation scripts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createOllamaProvider } from './providers/ollama.ts';
import { createGeminiProvider } from './providers/gemini.ts';
import type { LLMProvider } from './providers/index.ts';

/**
 * Failed file tracking interface
 */
export interface FailedFile {
  relativePath: string;
  error: string;
  timestamp: string;
}

/**
 * Create LLM provider by name
 */
export function createProvider(name: string, model?: string): LLMProvider {
  switch (name) {
    case 'ollama':
      return createOllamaProvider(undefined, model);
    case 'gemini':
      return createGeminiProvider(undefined, model);
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

/**
 * Get all markdown files in a directory recursively
 */
export function getMarkdownFiles(dir: string): string[] {
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

/**
 * Load failed files from previous run
 */
export function loadFailedFiles(failedFilesPath: string): FailedFile[] {
  if (!fs.existsSync(failedFilesPath)) {
    return [];
  }
  try {
    const content = fs.readFileSync(failedFilesPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

/**
 * Save failed files for retry
 */
export function saveFailedFiles(failedFilesPath: string, failedFiles: FailedFile[]): void {
  if (failedFiles.length === 0) {
    // Remove file if no failures
    if (fs.existsSync(failedFilesPath)) {
      fs.unlinkSync(failedFilesPath);
    }
    return;
  }
  fs.writeFileSync(failedFilesPath, JSON.stringify(failedFiles, null, 2), 'utf-8');
}

/**
 * Clear failed files history
 */
export function clearFailedFiles(failedFilesPath: string): boolean {
  if (fs.existsSync(failedFilesPath)) {
    fs.unlinkSync(failedFilesPath);
    return true;
  }
  return false;
}

/**
 * Check if target file needs regeneration based on modification time
 */
export function needsRegeneration(sourcePath: string, targetPath: string, force: boolean): boolean {
  if (force) return true;
  if (!fs.existsSync(targetPath)) return true;

  const sourceStat = fs.statSync(sourcePath);
  const targetStat = fs.statSync(targetPath);

  return sourceStat.mtime > targetStat.mtime;
}
