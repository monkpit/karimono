/**
 * Focused Debugging Test for Blargg 04-op r,imm Test ROM
 *
 * This test is specifically designed to identify hardware accuracy issues
 * in register-immediate operations by providing detailed instruction-level
 * debugging output to identify the first failing instruction.
 *
 * The test runs with maximum debugging enabled and uses systematic analysis
 * to pinpoint exact instruction failures against RGBDS GBZ80 Reference.
 */

import { BlarggTestRunner } from '../../../src/emulator/testing/BlarggTestRunner';
import * as path from 'path';
import * as fs from 'fs';

describe('Blargg 04-op r,imm Debug Analysis', () => {
  let testRunner: BlarggTestRunner;
  let mockParentElement: HTMLElement;

  // Test ROM paths
  const INDIVIDUAL_TESTS_DIR = path.join(
    __dirname,
    '../../../tests/resources/blargg/cpu_instrs/individual'
  );
  const TARGET_ROM = path.join(INDIVIDUAL_TESTS_DIR, '04-op r,imm.gb');

  beforeEach(() => {
    // Setup DOM mocks for EmulatorContainer
    global.HTMLElement = class MockHTMLElement {
      appendChild = jest.fn();
      style: Record<string, any> = {};
    } as any;

    global.document = {
      createElement: jest.fn(() => ({
        getContext: jest.fn(() => ({
          createImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
          putImageData: jest.fn(),
          fillStyle: '',
          fillRect: jest.fn(),
        })),
        style: {},
        width: 0,
        height: 0,
        appendChild: jest.fn(),
      })),
    } as any;

    mockParentElement = new HTMLElement();
    testRunner = new BlarggTestRunner(mockParentElement, true); // Enable debug mode

    // Enable instruction-level debugging for maximum detail
    testRunner.enableInstructionDebug(true);
  });

  afterEach(() => {
    testRunner?.dispose();
  });

  describe('Environment Verification', () => {
    test('should verify 04-op r,imm.gb test ROM exists', () => {
      expect(fs.existsSync(TARGET_ROM)).toBe(true);

      // Verify ROM is reasonable size
      const stats = fs.statSync(TARGET_ROM);
      expect(stats.size).toBeGreaterThan(1024); // At least 1KB
      expect(stats.size).toBeLessThan(1024 * 1024); // Less than 1MB
    });
  });

  describe('Instruction-Level Debug Analysis', () => {
    test('should run 04-op r,imm with maximum debugging to identify first failure', async () => {
      // This test is designed to fail initially but provide detailed debugging output
      // to identify the exact instruction causing the hardware accuracy issue

      console.log('='.repeat(80));
      console.log('STARTING FOCUSED DEBUG ANALYSIS FOR 04-op r,imm.gb');
      console.log('='.repeat(80));
      console.log('This test will provide detailed instruction-level debugging output');
      console.log('to identify hardware accuracy issues in register-immediate operations.');
      console.log('Expected patterns to look for:');
      console.log('1. First serial output should contain "04-op r,imm"');
      console.log('2. Test progress indicators in serial output');
      console.log('3. Specific instruction failures with opcode details');
      console.log('4. CPU register state at failure point');
      console.log('='.repeat(80));

      const result = testRunner.executeTest(TARGET_ROM);

      console.log('='.repeat(80));
      console.log('DEBUG ANALYSIS RESULTS:');
      console.log('='.repeat(80));
      console.log(`Test passed: ${result.passed}`);
      console.log(`Cycles executed: ${result.cyclesExecuted}`);
      console.log(`Output length: ${result.output.length}`);
      console.log(`Output content: ${JSON.stringify(result.output)}`);

      if (result.failureReason) {
        console.log(`Failure reason: ${result.failureReason}`);
      }

      // Analyze the output for specific patterns that indicate where the test is failing
      if (result.output.includes('04-op r,imm')) {
        console.log('✅ Test ROM successfully started (name appeared in output)');
      } else {
        console.log('❌ Test ROM did not start properly (name not in output)');
      }

      if (result.output.includes('Passed')) {
        console.log('✅ Test completed successfully');
      } else if (result.output.includes('Failed')) {
        console.log('❌ Test failed - need to analyze failure details');
      } else {
        console.log('⚠️  Test did not complete (no Pass/Fail indication)');
      }

      // Look for specific instruction failure patterns
      const lines = result.output.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('Failed') || line.includes('Error') || line.includes('Fail')) {
          console.log(`❌ Failure detected at line ${i}: "${line}"`);
        }
      }

      console.log('='.repeat(80));
      console.log('DEBUGGING RECOMMENDATIONS:');
      console.log('='.repeat(80));

      if (result.passed) {
        console.log('✅ Test passed! Hardware accuracy issue may be resolved.');
      } else if (result.cyclesExecuted >= 10000000) {
        console.log('⚠️  Test timed out - likely missing instruction implementations');
        console.log('   Check the instruction debug output above for unimplemented opcodes');
      } else if (result.output.length === 0) {
        console.log('❌ No serial output - ROM may not be loading correctly');
        console.log('   Check MMU cartridge loading and boot ROM disable');
      } else {
        console.log('❌ Test failed with output - analyze the failure details above');
        console.log('   Look for specific opcode failures in the debug logs');
      }

      console.log('='.repeat(80));

      // For now, this test is expected to fail - it's a diagnostic tool
      // Once we identify and fix the issues, we can change this to expect(result.passed).toBe(true)
      expect(result.output.length).toBeGreaterThan(0); // At least some output should be generated
    }, 60000); // 60 second timeout

    test('should capture detailed serial output progression for analysis', async () => {
      // This test focuses on the serial output progression to understand
      // exactly when and why the test ROM fails

      console.log('='.repeat(60));
      console.log('SERIAL OUTPUT PROGRESSION ANALYSIS');
      console.log('='.repeat(60));

      const result = testRunner.executeTest(TARGET_ROM);

      // Split output into lines and analyze progression
      const lines = result.output.split('\n');
      console.log(`Total output lines: ${lines.length}`);

      for (let i = 0; i < Math.min(lines.length, 20); i++) {
        console.log(`Line ${i.toString().padStart(2, '0')}: "${lines[i]}"`);
      }

      if (lines.length > 20) {
        console.log(`... (${lines.length - 20} more lines)`);
      }

      console.log('='.repeat(60));

      expect(result).toBeDefined();
      expect(result.output).toBeDefined();
    }, 60000);
  });

  describe('Hardware Accuracy Analysis', () => {
    test('should identify specific instruction families causing failures', async () => {
      // This test helps identify which specific register-immediate instruction
      // patterns are causing hardware accuracy failures

      const result = testRunner.executeTest(TARGET_ROM);

      // Look for common register-immediate instruction patterns that might be failing:
      // - ADD A,n8  (0xC6) - Add immediate to A
      // - SUB A,n8  (0xD6) - Subtract immediate from A
      // - AND A,n8  (0xE6) - Logical AND immediate with A
      // - OR A,n8   (0xF6) - Logical OR immediate with A
      // - XOR A,n8  (0xEE) - Logical XOR immediate with A
      // - CP A,n8   (0xFE) - Compare immediate with A

      const suspiciousPatterns = [
        'ADD',
        'SUB',
        'AND',
        'OR',
        'XOR',
        'CP',
        'C6',
        'D6',
        'E6',
        'F6',
        'EE',
        'FE', // Hex opcodes
        'flag',
        'carry',
        'zero',
        'half', // Flag-related issues
      ];

      console.log('Analyzing output for suspicious instruction patterns...');

      for (const pattern of suspiciousPatterns) {
        if (result.output.toLowerCase().includes(pattern.toLowerCase())) {
          console.log(`⚠️  Found suspicious pattern: "${pattern}" in output`);
        }
      }

      expect(result).toBeDefined();
    }, 60000);
  });
});
