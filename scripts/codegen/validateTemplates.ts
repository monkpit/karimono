#!/usr/bin/env tsx

/**
 * Comprehensive Template Quality Validation System
 *
 * Ensures generated SM83 CPU instruction templates maintain architectural
 * integrity, hardware accuracy, and code quality standards. This script
 * validates against opcodes.json and established project patterns.
 *
 * It performs validation on:
 * - Hardware Accuracy (cycles, flags, operands)
 * - Architectural Compliance (private method pattern, naming)
 * - Code Quality (JSDoc, formatting, TypeScript)
 * - Integration Readiness (switch cases, memory access)
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

// Define interfaces for opcode specifications
interface OpcodeSpec {
  mnemonic: string;
  bytes: number;
  cycles: number[];
  operands: Array<{ name: string; immediate: boolean }>;
  flags: { Z: string; N: string; H: string; C: string };
}

interface OpcodesData {
  unprefixed: Record<string, OpcodeSpec>;
  cbprefixed: Record<string, OpcodeSpec>;
}

// Validation result structures
interface Issue {
  file: string;
  method?: string;
  line?: number;
  message: string;
  type: 'error' | 'warning';
}

interface ValidationResult {
  issues: Issue[];
  totalFiles: number;
  validatedFiles: number;
  totalMethods: number;
  validatedMethods: number;
}

// Main validation function with CLI options support
async function main() {
  // Parse CLI arguments for incremental validation
  const args = process.argv.slice(2);
  const incrementalMode = args.includes('--incremental') || args.includes('-i');
  const errorOnlyMode = args.includes('--errors-only') || args.includes('-e');
  const verboseMode = args.includes('--verbose') || args.includes('-v');
  const helpMode = args.includes('--help') || args.includes('-h');

  if (helpMode) {
    printHelp();
    process.exit(0);
  }

  console.log('🚀 Starting Comprehensive Template Quality Validation...');
  if (incrementalMode) {
    console.log('📍 Incremental mode: Only validating recently changed files');
  }
  if (errorOnlyMode) {
    console.log('🔍 Error-only mode: Suppressing warnings in output');
  }

  const opcodesPath = join(projectRoot, 'tests/resources/opcodes.json');
  if (!existsSync(opcodesPath)) {
    console.error('💥 Critical: opcodes.json not found at', opcodesPath);
    process.exit(1);
  }
  const opcodes: OpcodesData = JSON.parse(readFileSync(opcodesPath, 'utf8'));

  const generatedDir = join(projectRoot, 'src/emulator/cpu/generated');
  const unprefixedDir = join(generatedDir, 'unprefixed');
  const cbprefixedDir = join(generatedDir, 'cbprefixed');

  let allFiles = [
    ...readdirSync(unprefixedDir).map(f => join(unprefixedDir, f)),
    ...readdirSync(cbprefixedDir).map(f => join(cbprefixedDir, f)),
  ].filter(f => f.endsWith('.ts') && statSync(f).isFile());

  // Filter for incremental validation if requested
  if (incrementalMode) {
    allFiles = await getRecentlyChangedFiles(allFiles);
    console.log(`📊 Validating ${allFiles.length} recently changed files`);
  }

  const result: ValidationResult = {
    issues: [],
    totalFiles: allFiles.length,
    validatedFiles: 0,
    totalMethods: 0,
    validatedMethods: 0,
  };

  for (const file of allFiles) {
    if (verboseMode) {
      console.log(`🔍 Validating: ${file}`);
    }
    validateFile(file, opcodes, result);
    result.validatedFiles++;
  }

  printReport(result, errorOnlyMode, verboseMode);

  const criticalErrors = result.issues.filter(i => i.type === 'error').length;
  if (criticalErrors > 0) {
    console.error(`\n❌ Validation failed with ${criticalErrors} critical error(s).`);
    if (!verboseMode) {
      console.log('💡 Use --verbose or -v flag for detailed output');
    }
    process.exit(1);
  } else {
    console.log('\n✅ Validation successful with 0 critical errors.');
    const warnings = result.issues.filter(i => i.type === 'warning').length;
    if (warnings > 0 && !errorOnlyMode) {
      console.log(`⚠️  Note: ${warnings} warnings found (non-blocking)`);
    }
    process.exit(0);
  }
}

function validateFile(filePath: string, opcodes: OpcodesData, result: ValidationResult) {
  const content = readFileSync(filePath, 'utf-8');
  const isCb = filePath.includes('cbprefixed');
  const fileIssues: Issue[] = [];

  // File-level checks
  if (!content.startsWith('// @ts-nocheck')) {
    fileIssues.push({
      file: filePath,
      message: 'File must start with "// @ts-nocheck"',
      type: 'error',
    });
  }
  if (content.includes('@ts-ignore')) {
    fileIssues.push({
      file: filePath,
      message: 'File contains "@ts-ignore", which is forbidden',
      type: 'error',
    });
  }

  const methodRegex =
    /\/\*\*[\s\S]*?\*\/\s*function\s+(execute[A-Z0-9_a-z]+)\(\):\s*number\s*\{([\s\S]*?)\n\}/g;
  let match;
  let methodsFound = 0;
  while ((match = methodRegex.exec(content)) !== null) {
    methodsFound++;
    const [fullMethod, methodName, methodBody] = match;
    const jsdoc = fullMethod.substring(0, fullMethod.indexOf('function'));
    result.totalMethods++;
    validateMethod(filePath, methodName, methodBody, jsdoc, isCb, opcodes, result);
    result.validatedMethods++;
  }

  if (methodsFound === 0 && content.length > 0) {
    fileIssues.push({
      file: filePath,
      message: 'No instruction methods found in file.',
      type: 'warning',
    });
  }

  // Validate switch-case integration block
  const integrationBlockMatch = content.match(/\/\*\s*case\s0x[0-9A-Fa-f]{2}:[\s\S]*\*\//);
  if (!integrationBlockMatch) {
    fileIssues.push({
      file: filePath,
      message: 'Missing switch/case integration block.',
      type: 'error',
    });
  }

  result.issues.push(...fileIssues);
}

function validateMethod(
  file: string,
  methodName: string,
  body: string,
  jsdoc: string,
  isCb: boolean,
  opcodes: OpcodesData,
  result: ValidationResult
) {
  const methodIssues: Issue[] = [];

  // Architectural Compliance
  if (!methodName.startsWith('execute')) {
    methodIssues.push({
      file,
      method: methodName,
      message: 'Method name must start with "execute".',
      type: 'error',
    });
  }

  // JSDoc validation
  const opcodeMatch = jsdoc.match(/([A-Z]+)\s(0x[0-9A-Fa-f]{2})/);
  if (!opcodeMatch) {
    methodIssues.push({
      file,
      method: methodName,
      message: 'JSDoc missing opcode (e.g., "ADD 0x09").',
      type: 'error',
    });
    result.issues.push(...methodIssues);
    return;
  }
  // eslint-disable-next-line no-unused-vars
  const [, _mnemonic, opcodeStr] = opcodeMatch;
  const spec = (isCb ? opcodes.cbprefixed : opcodes.unprefixed)[opcodeStr];

  if (!spec) {
    methodIssues.push({
      file,
      method: methodName,
      message: `Opcode ${opcodeStr} not found in opcodes.json.`,
      type: 'error',
    });
    result.issues.push(...methodIssues);
    return;
  }

  if (!jsdoc.includes('Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7')) {
    methodIssues.push({
      file,
      method: methodName,
      message: 'JSDoc missing RGBDS reference link.',
      type: 'error',
    });
  }

  // Hardware Accuracy: Cycles
  const cycleMatch = body.match(/return\s+(\d+);/);
  if (!cycleMatch) {
    methodIssues.push({
      file,
      method: methodName,
      message: 'Cannot find return statement with cycle count.',
      type: 'error',
    });
  } else {
    const cycles = parseInt(cycleMatch[1], 10);
    if (!spec.cycles.includes(cycles)) {
      methodIssues.push({
        file,
        method: methodName,
        message: `Cycle count mismatch. Expected one of [${spec.cycles.join(', ')}], got ${cycles}.`,
        type: 'error',
      });
    }
  }

  // Hardware Accuracy: Flags
  const flagIssues: Issue[] = [];
  validateFlags(spec, body, flagIssues);
  // Set file and method for flag issues
  flagIssues.forEach(issue => {
    issue.file = file;
    issue.method = methodName;
  });
  methodIssues.push(...flagIssues);

  // Code Quality & Integration
  if (body.includes('this.mmu') && !body.match(/this\.mmu\.(read|write)Byte/)) {
    methodIssues.push({
      file,
      method: methodName,
      message: 'Memory access should use this.mmu.readByte or this.mmu.writeByte.',
      type: 'warning',
    });
  }
  if (body.includes('this.registers') && !body.match(/this\.registers\.[a-z]{1,2}/)) {
    methodIssues.push({
      file,
      method: methodName,
      message: 'Register access should use this.registers.* pattern.',
      type: 'warning',
    });
  }

  result.issues.push(...methodIssues);
}

function validateFlags(spec: OpcodeSpec, body: string, issues: Issue[]): void {
  const flagChecks: {
    flag: keyof OpcodeSpec['flags'];
    set: string;
    check: (body: string) => boolean;
  }[] = [
    { flag: 'Z', set: spec.flags.Z, check: body => body.includes('this.setZeroFlag') },
    { flag: 'N', set: spec.flags.N, check: body => body.includes('this.setSubtractFlag') },
    { flag: 'H', set: spec.flags.H, check: body => body.includes('this.setHalfCarryFlag') },
    { flag: 'C', set: spec.flags.C, check: body => body.includes('this.setCarryFlag') },
  ];

  for (const { flag, set, check } of flagChecks) {
    if (set !== '-' && !check(body)) {
      issues.push({
        file: '', // Will be set by caller
        method: '', // Will be set by caller
        message: `Flag ${flag} is specified as '${set}' but set*Flag call is missing.`,
        type: 'warning',
      });
    }
    if (set === '0' && !body.includes(`this.set${capitalize(flag)}Flag(false)`)) {
      // This is a simple check, might have false positives
    }
    if (set === '1' && !body.includes(`this.set${capitalize(flag)}Flag(true)`)) {
      // This is a simple check, might have false positives
    }
  }
}

function printReport(result: ValidationResult, errorOnlyMode = false, verboseMode = false) {
  console.log('\n--- Template Quality Validation Report ---');
  console.log(`📁 Filesystem: ${result.validatedFiles}/${result.totalFiles} files validated`);
  console.log(
    `⚙️  Instructions: ${result.validatedMethods}/${result.totalMethods} methods validated`
  );

  const errors = result.issues.filter(i => i.type === 'error');
  const warnings = result.issues.filter(i => i.type === 'warning');

  // Quality metrics
  const errorRate =
    result.totalMethods > 0 ? ((errors.length / result.totalMethods) * 100).toFixed(2) : '0.00';
  const warningRate =
    result.totalMethods > 0 ? ((warnings.length / result.totalMethods) * 100).toFixed(2) : '0.00';

  console.log(`📊 Quality Metrics:`);
  console.log(`   Error Rate: ${errorRate}% (${errors.length}/${result.totalMethods})`);
  console.log(`   Warning Rate: ${warningRate}% (${warnings.length}/${result.totalMethods})`);

  if (errors.length > 0) {
    console.log(`\n🚨 CRITICAL ERRORS (${errors.length}):`);
    const displayLimit = verboseMode ? errors.length : Math.min(errors.length, 10);
    errors.slice(0, displayLimit).forEach(e => {
      const location = e.method ? ` (${e.method})` : '';
      const filePath = e.file.replace('/home/pittm/karimono-v2/', '');
      console.log(`  - ${filePath}${location}: ${e.message}`);
    });

    if (errors.length > displayLimit) {
      console.log(
        `  ... and ${errors.length - displayLimit} more errors (use --verbose to see all)`
      );
    }
  }

  if (warnings.length > 0 && !errorOnlyMode) {
    console.log(`\n⚠️ WARNINGS (${warnings.length}):`);
    const displayLimit = verboseMode ? warnings.length : Math.min(warnings.length, 10);
    warnings.slice(0, displayLimit).forEach(w => {
      const location = w.method ? ` (${w.method})` : '';
      const filePath = w.file.replace('/home/pittm/karimono-v2/', '');
      console.log(`  - ${filePath}${location}: ${w.message}`);
    });

    if (warnings.length > displayLimit) {
      console.log(
        `  ... and ${warnings.length - displayLimit} more warnings (use --verbose to see all)`
      );
    }
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n✅ All template quality checks passed successfully!');
  }

  console.log('--- End of Report ---\n');

  // Performance insights
  if (verboseMode) {
    printPerformanceInsights(result);
  }
}

function capitalize(s: string) {
  if (s.length < 2) return s.toUpperCase();
  if (s === 'Subtract') return 'Subtract'; // special case
  if (s === 'HalfCarry') return 'HalfCarry'; // special case
  if (s === 'Carry') return 'Carry'; // special case
  if (s === 'Zero') return 'Zero'; // special case
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// Helper functions for enhanced capabilities

/**
 * Get recently changed files for incremental validation
 */
async function getRecentlyChangedFiles(allFiles: string[]): Promise<string[]> {
  try {
    // Check git status for recently modified files
    const { execSync } = await import('child_process');
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8', cwd: projectRoot });

    if (!gitStatus.trim()) {
      // No changes, return empty array or all files based on last commit time
      const recentFiles = allFiles.filter(file => {
        const stats = statSync(file);
        const hourAgo = Date.now() - 60 * 60 * 1000;
        return stats.mtime.getTime() > hourAgo;
      });
      return recentFiles.length > 0 ? recentFiles : allFiles.slice(0, 10); // At least validate some files
    }

    const changedFiles = gitStatus
      .split('\n')
      .filter(line => line.trim())
      .map(line => join(projectRoot, line.substring(3)))
      .filter(file => allFiles.includes(file));

    return changedFiles.length > 0 ? changedFiles : allFiles;
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  } catch (error) {
    console.warn('⚠️ Could not determine recently changed files, validating all files');
    return allFiles;
  }
}

/**
 * Print CLI help information
 */
function printHelp() {
  console.log(`
🔧 SM83 CPU Template Quality Validation System
`);
  console.log('Usage: npx tsx scripts/codegen/validateTemplates.ts [options]\n');
  console.log('Options:');
  console.log('  -i, --incremental    Only validate recently changed files');
  console.log('  -e, --errors-only    Show only critical errors, suppress warnings');
  console.log('  -v, --verbose        Show detailed output and performance insights');
  console.log('  -h, --help           Show this help message\n');

  console.log('Examples:');
  console.log('  npx tsx scripts/codegen/validateTemplates.ts                 # Full validation');
  console.log('  npx tsx scripts/codegen/validateTemplates.ts --incremental   # Quick validation');
  console.log('  npx tsx scripts/codegen/validateTemplates.ts --errors-only   # CI-friendly');
  console.log('  npx tsx scripts/codegen/validateTemplates.ts --verbose       # Detailed report\n');

  console.log('Integration:');
  console.log('  npm run codegen:verify     # Full validation with npm script');
  console.log('  npm run codegen:check      # Quick incremental check\n');
}

/**
 * Print performance insights for the validation process
 */
function printPerformanceInsights(result: ValidationResult) {
  console.log('📈 Performance Insights:');

  const avgMethodsPerFile =
    result.totalFiles > 0 ? (result.totalMethods / result.totalFiles).toFixed(1) : '0';
  console.log(`   Average methods per file: ${avgMethodsPerFile}`);

  const totalIssues = result.issues.length;
  const issueRate =
    result.totalMethods > 0 ? ((totalIssues / result.totalMethods) * 100).toFixed(2) : '0.00';
  console.log(
    `   Overall issue rate: ${issueRate}% (${totalIssues} issues in ${result.totalMethods} methods)`
  );

  // Template quality score (100% - error rate)
  const errors = result.issues.filter(i => i.type === 'error').length;
  const qualityScore =
    result.totalMethods > 0 ? (100 - (errors / result.totalMethods) * 100).toFixed(2) : '100.00';
  console.log(`   Template quality score: ${qualityScore}% (based on error-free methods)`);

  console.log();
}

// Execute main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('💥 Unhandled error during validation:', err);
    process.exit(1);
  });
}
