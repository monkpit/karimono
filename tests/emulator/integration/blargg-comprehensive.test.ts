/**
 * Blargg Comprehensive CPU Instructions Test
 *
 * This test runs the comprehensive cpu_instrs.gb ROM that tests all instruction families together.
 * Separated from individual tests for performance optimization and timeout management.
 */

import { BlarggTestRunner } from '../../../src/emulator/testing/BlarggTestRunner';
import { EmulatorContainer } from '../../../src/emulator/EmulatorContainer';
import * as path from 'path';

describe('Blargg Comprehensive CPU Instructions Test', () => {
  let testRunner: BlarggTestRunner;
  let emulatorContainer: EmulatorContainer;

  const MAIN_TEST_ROM = path.join(__dirname, '../../resources/blargg/cpu_instrs/cpu_instrs.gb');

  beforeEach(() => {
    // Setup DOM mocks for EmulatorContainer
    global.HTMLElement = class MockHTMLElement {
      appendChild = jest.fn();
      style: Record<string, any> = {};
    } as any;

    global.document = {
      createElement: jest.fn(() => new (global.HTMLElement as any)()),
    } as any;

    global.window = {
      requestAnimationFrame: jest.fn(),
    } as any;

    // Create emulator container with minimal config for testing
    emulatorContainer = new EmulatorContainer(new (global.HTMLElement as any)(), {
      debug: false, // Disable debug for performance
      frameRate: 60,
    });

    // Initialize test runner with performance optimizations
    testRunner = new BlarggTestRunner(emulatorContainer, false, true); // No debug, performance mode
  });

  afterEach(() => {
    testRunner?.dispose();
    // EmulatorContainer cleanup - no dispose method needed
  });

  test('should pass comprehensive cpu_instrs.gb test with all instruction families', async () => {
    // Comprehensive test ROM validates all CPU instruction families together
    const result = testRunner.executeTest(MAIN_TEST_ROM);

    expect(result.passed).toBe(true);
    expect(result.output).not.toContain('Failed');
    expect(result.cyclesExecuted).toBeGreaterThan(0);

    // Comprehensive ROM outputs format: "cpu_instrs\n\n01:ok  02:ok  03:ok..."
    // All tests passing means all show "ok" status
    const hasComprehensiveFormat =
      result.output.includes('cpu_instrs') && result.output.includes('ok');

    expect(hasComprehensiveFormat).toBe(true);

    // Ensure no failures in comprehensive output
    expect(result.output).not.toContain('failed');
    expect(result.output).not.toContain('Failed');

    console.log('Comprehensive CPU Instructions Test: ALL PASSED');
    console.log(`Cycles executed: ${result.cyclesExecuted}`);
    console.log(`Output: ${result.output}`);
  }, 180000); // 3-minute timeout for comprehensive test only
});
