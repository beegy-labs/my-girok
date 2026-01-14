#!/usr/bin/env node
/**
 * Post-processing script to add .js extensions to ESM imports
 * Node.js ESM requires explicit file extensions for relative imports
 */

const fs = require('fs');
const path = require('path');

const GENERATED_DIR = path.join(__dirname, '../../types/src/generated/proto');

/**
 * Recursively process all .js files in directory
 */
function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.js')) {
      processFile(filePath);
    }
  }
}

/**
 * Add .js extension to relative imports in a file
 */
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Match import/export statements with relative paths (starts with ./ or ../)
  // that don't already have .js extension
  const importRegex = /((?:import|export).*from\s+["'])(\.\S+?)(?<!\.js)(["'])/g;

  content = content.replace(importRegex, (match, prefix, importPath, suffix) => {
    modified = true;
    return `${prefix}${importPath}.js${suffix}`;
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed imports in ${path.relative(GENERATED_DIR, filePath)}`);
  }
}

// Main execution
console.log('Adding .js extensions to ESM imports...');
processDirectory(GENERATED_DIR);
console.log('Done!');
