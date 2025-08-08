#!/usr/bin/env tsx

/**
 * Codegen Validation Script
 *
 * Ensures all generated CPU instruction files are up-to-date and synchronized
 * with the opcodes.json specification. This script is run during build and CI
 * to maintain strict quality gates for generated code.
 *
 * Exit codes:
 * - 0: All generated files are current and valid
 * - 1: Generated files are missing or out of sync
 * - 2: Critical validation errors (corrupted files, etc.)
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

interface ValidationResult {
  valid: boolean;
  message: string;
  details?: string[];
}

interface OpcodeSpec {
  mnemonic: string;
  bytes: number;
  cycles: number[];
  operands: Array<{
    name: string;
    bytes?: number;
    immediate: boolean;
  }>;
  flags: {
    Z: string;
    N: string;
    H: string;
    C: string;
  };
}

interface OpcodesData {
  unprefixed: Record<string, OpcodeSpec>;
  cbprefixed: Record<string, OpcodeSpec>;
}

/**
 * Main validation entry point
 */
async function main(): Promise<void> {
  console.log('🔍 Validating generated CPU instruction files...');

  try {
    const validationResults = await validateGeneratedCode();

    if (validationResults.every(result => result.valid)) {
      console.log('✅ All generated files are current and valid');
      process.exit(0);
    } else {
      console.error('❌ Generated files validation failed:');
      validationResults
        .filter(result => !result.valid)
        .forEach(result => {
          console.error(`  • ${result.message}`);
          if (result.details) {
            result.details.forEach(detail => console.error(`    - ${detail}`));
          }
        });

      console.error('\n💡 Run `npm run codegen:force` to regenerate all files');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Critical validation error:', error instanceof Error ? error.message : error);
    process.exit(2);
  }
}

/**
 * Validate all generated code against specifications
 */
async function validateGeneratedCode(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // Check if opcodes.json exists and is readable
  const opcodesPath = join(projectRoot, 'tests/resources/opcodes.json');
  results.push(validateOpcodesSpec(opcodesPath));

  // Check generated directory structure
  results.push(validateGeneratedStructure());

  // Check individual generated files
  results.push(await validateGeneratedFiles(opcodesPath));

  // Check integration with existing CPU architecture
  results.push(validateCPUIntegration());

  return results;
}

/**
 * Validate opcodes.json specification file
 */
function validateOpcodesSpec(opcodesPath: string): ValidationResult {
  if (!existsSync(opcodesPath)) {
    return {
      valid: false,
      message: 'opcodes.json specification file not found',
      details: [`Expected: ${opcodesPath}`],
    };
  }

  try {
    const content = readFileSync(opcodesPath, 'utf8');
    const opcodes: OpcodesData = JSON.parse(content);

    if (!opcodes.unprefixed || !opcodes.cbprefixed) {
      return {
        valid: false,
        message: 'opcodes.json missing required sections',
        details: ['Must contain "unprefixed" and "cbprefixed" sections'],
      };
    }

    const unprefixedCount = Object.keys(opcodes.unprefixed).length;
    const cbprefixedCount = Object.keys(opcodes.cbprefixed).length;

    if (unprefixedCount !== 256 || cbprefixedCount !== 256) {
      return {
        valid: false,
        message: 'opcodes.json incomplete instruction set',
        details: [`Unprefixed: ${unprefixedCount}/256`, `CB-prefixed: ${cbprefixedCount}/256`],
      };
    }

    return {
      valid: true,
      message: 'opcodes.json specification valid',
    };
  } catch (error) {
    return {
      valid: false,
      message: 'opcodes.json parse error',
      details: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Validate generated directory structure
 */
function validateGeneratedStructure(): ValidationResult {
  const generatedDir = join(projectRoot, 'src/emulator/cpu/generated');

  if (!existsSync(generatedDir)) {
    return {
      valid: false,
      message: 'Generated CPU instructions directory missing',
      details: [`Expected: ${generatedDir}`, 'Run `npm run codegen` to generate files'],
    };
  }

  const requiredFiles = [
    'index.ts',
    'instructionMap.ts',
    'unprefixed/index.ts',
    'cbprefixed/index.ts',
  ];

  const missingFiles = requiredFiles.filter(file => !existsSync(join(generatedDir, file)));

  if (missingFiles.length > 0) {
    return {
      valid: false,
      message: 'Generated files incomplete',
      details: missingFiles.map(file => `Missing: ${file}`),
    };
  }

  return {
    valid: true,
    message: 'Generated directory structure valid',
  };
}

/**
 * Validate generated files against specification
 */
async function validateGeneratedFiles(opcodesPath: string): Promise<ValidationResult> {
  try {
    JSON.parse(readFileSync(opcodesPath, 'utf8')) as OpcodesData;
    const generatedDir = join(projectRoot, 'src/emulator/cpu/generated');

    // Check if generated files are newer than opcodes.json
    const opcodesModified = statSync(opcodesPath).mtime;
    const indexPath = join(generatedDir, 'index.ts');

    if (existsSync(indexPath)) {
      const indexModified = statSync(indexPath).mtime;
      if (indexModified < opcodesModified) {
        return {
          valid: false,
          message: 'Generated files are outdated',
          details: [
            'opcodes.json is newer than generated files',
            'Run `npm run codegen` to update',
          ],
        };
      }
    }

    // Validate instruction count in generated files
    const instructionMapPath = join(generatedDir, 'instructionMap.ts');
    if (existsSync(instructionMapPath)) {
      const mapContent = readFileSync(instructionMapPath, 'utf8');

      // Count instruction entries in the map
      const unprefixedMatches = mapContent.match(/^ {2}0x[0-9a-fA-F]{2}:/gm) ?? [];
      const cbMatches = mapContent.match(/^ {2}CB_0x[0-9a-fA-F]{2}:/gm) ?? [];

      if (unprefixedMatches.length !== 256 || cbMatches.length !== 256) {
        return {
          valid: false,
          message: 'Generated instruction map incomplete',
          details: [
            `Unprefixed instructions: ${unprefixedMatches.length}/256`,
            `CB-prefixed instructions: ${cbMatches.length}/256`,
          ],
        };
      }
    }

    return {
      valid: true,
      message: 'Generated files synchronized with specification',
    };
  } catch (error) {
    return {
      valid: false,
      message: 'Generated files validation error',
      details: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Validate integration with existing CPU architecture
 */
function validateCPUIntegration(): ValidationResult {
  const cpuPath = join(projectRoot, 'src/emulator/cpu/CPU.ts');

  if (!existsSync(cpuPath)) {
    return {
      valid: false,
      message: 'CPU.ts file not found',
      details: ['Generated code requires existing CPU architecture'],
    };
  }

  try {
    const cpuContent = readFileSync(cpuPath, 'utf8');

    // Check if CPU has the required methods for integration
    const requiredMethods = ['executeInstruction', 'getPC', 'getRegisters'];

    const missingMethods = requiredMethods.filter(method => !cpuContent.includes(method));

    if (missingMethods.length > 0) {
      return {
        valid: false,
        message: 'CPU architecture missing required methods',
        details: missingMethods.map(method => `Missing method: ${method}`),
      };
    }

    return {
      valid: true,
      message: 'CPU integration points validated',
    };
  } catch (error) {
    return {
      valid: false,
      message: 'CPU integration validation error',
      details: [error instanceof Error ? error.message : String(error)],
    };
  }
}

// Run validation if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(2);
  });
}
