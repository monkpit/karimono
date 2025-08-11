/**
 * Blargg CPU Instruction Test Suite - Hardware Validation
 *
 * HISTORIC MILESTONE: 6/11 Blargg test ROMs now PASSING!
 * Comprehensive test suite validating SM83 CPU implementation against
 * Blargg hardware test ROMs following TDD methodology.
 *
 * CURRENT STATUS:
 * ✅ PASSING (6/11): 01-special, 02-interrupts, 03-op sp,hl, 06-ld r,r, 07-jr,jp,call,ret,rst, 08-misc instrs
 * ⏳ INCOMPLETE (5/11): 04-op r,imm, 05-op rp, 09-op r,r, 10-bit ops, 11-op a,(hl) (timeout due to missing instructions)
 *
 * Tests validate hardware-accurate CPU behavior using real Game Boy test ROMs
 * that have been verified against actual DMG hardware.
 */

import {
  BlarggTestRunner,
  BlarggTestSuiteResult,
} from '../../../src/emulator/testing/BlarggTestRunner';
import * as path from 'path';
import * as fs from 'fs';

describe('Blargg CPU Instruction Hardware Validation', () => {
  let testRunner: BlarggTestRunner;
  let mockParentElement: HTMLElement;

  // Test ROM paths relative to project root
  const BLARGG_CPU_INSTRS_PATH = path.join(__dirname, '../../../tests/resources/blargg/cpu_instrs');
  const MAIN_TEST_ROM = path.join(BLARGG_CPU_INSTRS_PATH, 'cpu_instrs.gb');
  const INDIVIDUAL_TESTS_DIR = path.join(BLARGG_CPU_INSTRS_PATH, 'individual');

  // Expected output patterns based on actual Blargg test ROM behavior
  // Individual test ROMs output their test name followed by result, not the full "cpu_instrs" prefix
  const EXPECTED_OUTPUTS = {
    '01-special.gb': '01-special\n\n\nPassed',
    '02-interrupts.gb': '02-interrupts\n\n\nPassed',
    '03-op sp,hl.gb': '03-op sp,hl\n\n\nPassed',
    '04-op r,imm.gb': '04-op r,imm\n\n\nPassed',
    '05-op rp.gb': '05-op rp\n\n\nPassed',
    '06-ld r,r.gb': '06-ld r,r\n\n\nPassed',
    '07-jr,jp,call,ret,rst.gb': '07-jr,jp,call,ret,rst\n\n\nPassed',
    '08-misc instrs.gb': '08-misc instrs\n\n\nPassed',
    '09-op r,r.gb': '09-op r,r\n\n\nPassed',
    '10-bit ops.gb': '10-bit ops\n\n\nPassed',
    '11-op a,(hl).gb': '11-op a,(hl)\n\n\nPassed',
  };

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
    testRunner = new BlarggTestRunner(mockParentElement, true, true); // Enable debug mode, performance mode
  });

  afterEach(() => {
    testRunner?.dispose();
  });

  describe('Environment Verification', () => {
    test('should verify Blargg test ROM files exist', () => {
      // FAILING TEST: These files should exist but may not be properly set up
      expect(fs.existsSync(BLARGG_CPU_INSTRS_PATH)).toBe(true);
      expect(fs.existsSync(MAIN_TEST_ROM)).toBe(true);
      expect(fs.existsSync(INDIVIDUAL_TESTS_DIR)).toBe(true);

      // Verify all 11 individual test ROMs exist
      const expectedRoms = [
        '01-special.gb',
        '02-interrupts.gb',
        '03-op sp,hl.gb',
        '04-op r,imm.gb',
        '05-op rp.gb',
        '06-ld r,r.gb',
        '07-jr,jp,call,ret,rst.gb',
        '08-misc instrs.gb',
        '09-op r,r.gb',
        '10-bit ops.gb',
        '11-op a,(hl).gb',
      ];

      expectedRoms.forEach(rom => {
        const romPath = path.join(INDIVIDUAL_TESTS_DIR, rom);
        expect(fs.existsSync(romPath)).toBe(true);
      });
    });

    test('should verify test ROM file sizes are reasonable', () => {
      // FAILING TEST: Verify ROMs are actual Game Boy ROM files
      if (fs.existsSync(MAIN_TEST_ROM)) {
        const stats = fs.statSync(MAIN_TEST_ROM);
        expect(stats.size).toBeGreaterThan(1024); // At least 1KB
        expect(stats.size).toBeLessThan(1024 * 1024); // Less than 1MB
      }
    });
  });

  describe('Individual Instruction Family Tests', () => {
    // HISTORIC SUCCESS: 6/11 tests now PASSING! Remaining 5 timeout due to missing instruction implementations

    test('should pass 01-special.gb (Special Instructions)', async () => {
      const romPath = path.join(INDIVIDUAL_TESTS_DIR, '01-special.gb');

      const result = testRunner.executeTest(romPath, EXPECTED_OUTPUTS['01-special.gb']);

      // SUCCESS: This test ROM now completes successfully and reports "Passed"
      expect(result.passed).toBe(true);
      expect(result.output).toContain('Passed');
      expect(result.output).not.toContain('Failed');
      expect(result.cyclesExecuted).toBeGreaterThan(0);
      expect(result.failureReason).toBeUndefined();
    }, 60000); // 60 second timeout

    test('should pass 02-interrupts.gb (Interrupt Handling)', async () => {
      const romPath = path.join(INDIVIDUAL_TESTS_DIR, '02-interrupts.gb');

      const result = testRunner.executeTest(romPath, EXPECTED_OUTPUTS['02-interrupts.gb']);

      expect(result.passed).toBe(true);
      expect(result.output).toContain('Passed');
      expect(result.cyclesExecuted).toBeGreaterThan(0);
    }, 60000);

    test('should pass 03-op sp,hl.gb (Stack Pointer Operations)', async () => {
      const romPath = path.join(INDIVIDUAL_TESTS_DIR, '03-op sp,hl.gb');

      const result = testRunner.executeTest(romPath, EXPECTED_OUTPUTS['03-op sp,hl.gb']);

      expect(result.passed).toBe(true);
      expect(result.output).toContain('Passed');
      expect(result.cyclesExecuted).toBeGreaterThan(0);
    }, 60000);

    test('should pass 04-op r,imm.gb (Register-Immediate Operations)', async () => {
      const romPath = path.join(INDIVIDUAL_TESTS_DIR, '04-op r,imm.gb');

      const result = testRunner.executeTest(romPath, EXPECTED_OUTPUTS['04-op r,imm.gb']);

      // INCOMPLETE: Test times out at 10M cycles - needs additional instruction implementations
      expect(result.passed).toBe(true);
      expect(result.output).toContain('Passed');
      expect(result.cyclesExecuted).toBeGreaterThan(0);
    }, 60000);

    test('should pass 05-op rp.gb (Register Pair Operations)', async () => {
      const romPath = path.join(INDIVIDUAL_TESTS_DIR, '05-op rp.gb');

      const result = testRunner.executeTest(romPath, EXPECTED_OUTPUTS['05-op rp.gb']);

      // INCOMPLETE: Test times out at 10M cycles - needs additional instruction implementations
      expect(result.passed).toBe(true);
      expect(result.output).toContain('Passed');
      expect(result.cyclesExecuted).toBeGreaterThan(0);
    }, 60000);

    test('should pass 06-ld r,r.gb (Register-to-Register Loads)', async () => {
      const romPath = path.join(INDIVIDUAL_TESTS_DIR, '06-ld r,r.gb');

      const result = testRunner.executeTest(romPath, EXPECTED_OUTPUTS['06-ld r,r.gb']);

      expect(result.passed).toBe(true);
      expect(result.output).toContain('Passed');
      expect(result.cyclesExecuted).toBeGreaterThan(0);
    }, 60000);

    test('should pass 07-jr,jp,call,ret,rst.gb (Control Flow)', async () => {
      const romPath = path.join(INDIVIDUAL_TESTS_DIR, '07-jr,jp,call,ret,rst.gb');

      const result = testRunner.executeTest(romPath, EXPECTED_OUTPUTS['07-jr,jp,call,ret,rst.gb']);

      expect(result.passed).toBe(true);
      expect(result.output).toContain('Passed');
      expect(result.cyclesExecuted).toBeGreaterThan(0);
    }, 60000);

    test('should pass 08-misc instrs.gb (Miscellaneous Instructions)', async () => {
      const romPath = path.join(INDIVIDUAL_TESTS_DIR, '08-misc instrs.gb');

      const result = testRunner.executeTest(romPath, EXPECTED_OUTPUTS['08-misc instrs.gb']);

      expect(result.passed).toBe(true);
      expect(result.output).toContain('Passed');
      expect(result.cyclesExecuted).toBeGreaterThan(0);
    }, 60000);

    test('should pass 09-op r,r.gb (Register-to-Register Operations)', async () => {
      const romPath = path.join(INDIVIDUAL_TESTS_DIR, '09-op r,r.gb');

      const result = testRunner.executeTest(romPath, EXPECTED_OUTPUTS['09-op r,r.gb']);

      // INCOMPLETE: Test times out at 10M cycles - needs additional instruction implementations
      expect(result.passed).toBe(true);
      expect(result.output).toContain('Passed');
      expect(result.cyclesExecuted).toBeGreaterThan(0);
    }, 60000);

    test('should pass 10-bit ops.gb (Bit Operations)', async () => {
      const romPath = path.join(INDIVIDUAL_TESTS_DIR, '10-bit ops.gb');

      const result = testRunner.executeTest(romPath, EXPECTED_OUTPUTS['10-bit ops.gb']);

      // INCOMPLETE: Test times out at 10M cycles - needs additional instruction implementations
      expect(result.passed).toBe(true);
      expect(result.output).toContain('Passed');
      expect(result.cyclesExecuted).toBeGreaterThan(0);
    }, 60000);

    test('should pass 11-op a,(hl).gb (Accumulator-Memory Operations)', async () => {
      const romPath = path.join(INDIVIDUAL_TESTS_DIR, '11-op a,(hl).gb');

      const result = testRunner.executeTest(romPath, EXPECTED_OUTPUTS['11-op a,(hl).gb']);

      // INCOMPLETE: Test times out at 10M cycles - needs additional instruction implementations
      expect(result.passed).toBe(true);
      expect(result.output).toContain('Passed');
      expect(result.cyclesExecuted).toBeGreaterThan(0);
    }, 60000);
  });

  describe('Individual Test Suite Execution', () => {
    test('should execute all individual tests as a cohesive suite', async () => {
      // FAILING TEST: Suite execution should pass all 11 tests
      const result: BlarggTestSuiteResult = testRunner.executeTestSuite(INDIVIDUAL_TESTS_DIR);

      expect(result.totalTests).toBe(11);
      expect(result.passedTests).toBe(11);
      expect(result.failedTests).toBe(0);
      expect(result.passed).toBe(true);

      // Verify all expected test ROMs were found and executed
      expect(result.testResults.size).toBe(11);

      Object.keys(EXPECTED_OUTPUTS).forEach(romName => {
        expect(result.testResults.has(romName)).toBe(true);
        const testResult = result.testResults.get(romName);
        if (!testResult) {
          throw new Error(`Test result not found for ${romName}`);
        }
        expect(testResult.passed).toBe(true);
      });
    }, 300000); // 5 minute timeout for full suite
  });

  describe('Main CPU Instructions Integration Test', () => {
    test('should pass main cpu_instrs.gb comprehensive test', async () => {
      // FAILING TEST: Main test ROM should pass with all instruction families
      const result = testRunner.executeTest(MAIN_TEST_ROM);

      expect(result.passed).toBe(true);
      expect(result.output).toContain('Passed');
      expect(result.output).not.toContain('Failed');
      expect(result.cyclesExecuted).toBeGreaterThan(0);

      // Main test should indicate all sub-tests passed
      expect(result.output).toMatch(/All tests passed|cpu_instrs.*?Passed/i);
    }, 300000); // 5 minute timeout
  });

  describe('Hardware Accuracy Validation', () => {
    test('should detect and report any CPU instruction inaccuracies', async () => {
      // FAILING TEST: This will help identify areas needing improvement
      const result = testRunner.executeTestSuite(INDIVIDUAL_TESTS_DIR);

      const failedTests: string[] = [];
      const inaccuracyReports: string[] = [];

      result.testResults.forEach((testResult, romName) => {
        if (!testResult.passed) {
          failedTests.push(romName);

          // Analyze failure output for specific instruction issues
          if (testResult.output.includes('Failed #')) {
            inaccuracyReports.push(`${romName}: ${testResult.output}`);
          }
        }
      });

      // For now, this test documents what we find
      if (failedTests.length > 0) {
        console.warn('CPU Instruction Inaccuracies Detected:', {
          failedTests,
          inaccuracyReports,
          totalFailed: failedTests.length,
          accuracy: `${(((11 - failedTests.length) / 11) * 100).toFixed(1)}%`,
        });
      }

      // FAILING ASSERTION: This should pass once our CPU implementation is complete
      expect(failedTests.length).toBe(0);
    }, 300000);

    test('should provide detailed failure analysis for debugging', async () => {
      // FAILING TEST: Provides debugging information for failed tests
      const result = testRunner.executeTest(path.join(INDIVIDUAL_TESTS_DIR, '01-special.gb'));

      if (!result.passed) {
        // Extract specific failure information
        const failureDetails = {
          rom: '01-special.gb',
          output: result.output,
          cycles: result.cyclesExecuted,
          reason: result.failureReason,
        };

        console.debug('Failure Analysis:', failureDetails);

        // Look for specific instruction failure patterns
        if (result.output.includes('CB')) {
          console.debug('CB-prefixed instruction failure detected');
        }

        if (result.output.match(/[0-9A-Fa-f]{2}/)) {
          console.debug('Opcode failure detected:', result.output.match(/[0-9A-Fa-f]{2}/));
        }
      }

      // This test helps with debugging but should eventually pass
      expect(result.passed).toBe(true);
    }, 60000);
  });

  describe('Serial Output Integration', () => {
    test('should capture serial output from test ROM execution', async () => {
      // FAILING TEST: Serial interface should capture output during ROM execution
      const output = testRunner.captureSerialOutput(50000); // 50k cycles

      expect(typeof output).toBe('string');
      // Initial execution might not produce meaningful output yet
      // but should not crash or hang
    }, 30000);

    test('should handle test completion detection correctly', async () => {
      // FAILING TEST: Should detect when test completes
      const result = testRunner.executeTest(path.join(INDIVIDUAL_TESTS_DIR, '06-ld r,r.gb'));

      // Test should complete within reasonable cycle count
      expect(result.cyclesExecuted).toBeGreaterThan(1000);
      expect(result.cyclesExecuted).toBeLessThan(150000000); // 150M cycle limit
    }, 60000);
  });

  describe('Error Handling and Timeouts', () => {
    test('should handle ROM execution timeouts gracefully', async () => {
      // Test timeout handling with a simple test ROM
      const result = testRunner.executeTest(path.join(INDIVIDUAL_TESTS_DIR, '01-special.gb'));

      // Should not timeout on a basic test (but may fail for other reasons)
      expect(result.failureReason).not.toContain('timeout');
      expect(result.cyclesExecuted).toBeGreaterThan(0);
    }, 60000);

    test('should provide meaningful error messages for ROM failures', async () => {
      const result = testRunner.executeTest(path.join(INDIVIDUAL_TESTS_DIR, '10-bit ops.gb'));

      if (!result.passed) {
        expect(result.failureReason ?? result.output).toBeTruthy();
        expect(typeof (result.failureReason ?? result.output)).toBe('string');
      }
    }, 60000);
  });
});
