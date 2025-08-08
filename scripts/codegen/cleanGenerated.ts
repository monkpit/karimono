#!/usr/bin/env tsx

/**
 * Clean Generated Code Script
 *
 * Safely removes all generated CPU instruction files while preserving
 * hand-written code and ensuring no accidental deletions.
 *
 * This script is used for:
 * - Complete regeneration workflows
 * - Cleanup during development
 * - CI/CD pipeline maintenance
 */

import { rmSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

/**
 * Main cleanup entry point
 */
async function main(): Promise<void> {
  console.log('🧹 Cleaning generated CPU instruction files...');

  try {
    const generatedDir = join(projectRoot, 'src/emulator/cpu/generated');

    if (!existsSync(generatedDir)) {
      console.log('ℹ️  No generated files to clean');
      return;
    }

    // Verify we're cleaning the right directory
    await validateGeneratedDirectory(generatedDir);

    // Count files before cleanup
    const fileCount = countGeneratedFiles(generatedDir);

    // Remove generated directory
    rmSync(generatedDir, { recursive: true, force: true });

    console.log(`✅ Cleaned ${fileCount} generated files`);
    console.log('💡 Run `npm run codegen` to regenerate files');
  } catch (error) {
    console.error('💥 Cleanup failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Validate that we're cleaning the correct directory
 */
async function validateGeneratedDirectory(generatedDir: string): Promise<void> {
  // Safety check: ensure this is actually the generated directory
  const expectedPath = 'src/emulator/cpu/generated';
  if (!generatedDir.endsWith(expectedPath)) {
    throw new Error(`Safety check failed: not cleaning generated directory (${generatedDir})`);
  }

  // Additional safety: check for generated code markers
  const indexPath = join(generatedDir, 'index.ts');
  if (existsSync(indexPath)) {
    const indexContent = require('fs').readFileSync(indexPath, 'utf8');
    if (!indexContent.includes('GENERATED CODE - DO NOT EDIT MANUALLY')) {
      throw new Error('Safety check failed: directory may contain hand-written code');
    }
  }
}

/**
 * Count files in generated directory for reporting
 */
function countGeneratedFiles(generatedDir: string): number {
  let count = 0;

  function countRecursive(dir: string): void {
    if (!existsSync(dir)) return;

    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        countRecursive(fullPath);
      } else if (stat.isFile() && entry.endsWith('.ts')) {
        count++;
      }
    }
  }

  countRecursive(generatedDir);
  return count;
}

// Run cleanup if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}
