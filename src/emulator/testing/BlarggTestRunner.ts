/**
 * Blargg Test Runner Implementation
 *
 * Automated execution and validation of Blargg test ROMs for hardware accuracy validation
 * Integrates with Serial Interface for output capture and test completion detection
 */

import { EmulatorContainer } from '../EmulatorContainer';
import { CPUComponent, SerialInterfaceComponent, MMUComponent } from '../types';
import { TestROMCartridge } from './TestROMCartridge';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Result of executing a single Blargg test ROM
 */
export interface BlarggTestResult {
  /** Whether the test passed */
  passed: boolean;
  /** Captured serial output from the test */
  output: string;
  /** Expected output pattern (if provided) */
  expectedOutput?: string;
  /** Number of CPU cycles executed */
  cyclesExecuted: number;
  /** Reason for failure (if test failed) */
  failureReason?: string;
}

/**
 * Result of executing a Blargg test suite
 */
export interface BlarggTestSuiteResult {
  /** Whether all tests passed */
  passed: boolean;
  /** Results for individual tests */
  testResults: Map<string, BlarggTestResult>;
  /** Total number of tests executed */
  totalTests: number;
  /** Number of tests that passed */
  passedTests: number;
  /** Number of tests that failed */
  failedTests: number;
}

/**
 * Blargg Test Runner for automated hardware validation
 */
export class BlarggTestRunner {
  private static readonly MAX_CYCLES = 10_000_000; // 10 million cycles maximum
  private static readonly COMPLETION_TIMEOUT_MS = 30_000; // 30 second timeout
  private static readonly CPU_STATE_LOG_INTERVAL = 1_000_000; // Log CPU state every 1M cycles

  private emulator: EmulatorContainer;
  private serialInterface: SerialInterfaceComponent;
  private mmu: MMUComponent;
  private cpu: CPUComponent;
  private debug: boolean;

  constructor(parentElement: HTMLElement, debug = false) {
    // Initialize emulator with minimal configuration
    this.emulator = new EmulatorContainer(parentElement, {
      display: { width: 160, height: 144, scale: 1 },
      debug: true,
      frameRate: 60,
    });

    // Get required components
    const serialInterface = this.emulator.getSerialInterface();
    const mmu = this.emulator.getMMU();
    const cpu = this.emulator.getCPU();

    if (!serialInterface) {
      throw new Error('Serial Interface component not available');
    }

    if (!mmu) {
      throw new Error('MMU component not available');
    }

    if (!cpu) {
      throw new Error('CPU component not available');
    }

    this.serialInterface = serialInterface;
    this.mmu = mmu;
    this.cpu = cpu;
    this.debug = debug;
  }

  /**
   * Log a debug message if debug mode is enabled
   * @param message Message to log
   */
  private log(message: string): void {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log(`[BlarggTestRunner] ${message}`);
    }
  }

  /**
   * Execute a single Blargg test ROM
   * @param romPath Path to the ROM file
   * @param expectedOutput Expected output pattern (optional)
   * @returns Test execution result
   */
  async executeTest(romPath: string, expectedOutput?: string): Promise<BlarggTestResult> {
    this.log(`Executing test: ${romPath}`);
    // Verify ROM file exists
    if (!fs.existsSync(romPath)) {
      const failureReason = `ROM file not found: ${romPath}`;
      this.log(`Test failed: ${failureReason}`);
      return {
        passed: false,
        output: '',
        expectedOutput,
        cyclesExecuted: 0,
        failureReason,
      };
    }

    try {
      // Load ROM data from file
      const romData = fs.readFileSync(romPath);

      // Reset emulator state
      this.emulator.reset();
      this.serialInterface.clearOutputBuffer();

      // Create test cartridge and load ROM data
      const testCartridge = new TestROMCartridge(new Uint8Array(romData));
      this.mmu.loadCartridge(testCartridge);

      // Set MMU to post-boot state to disable boot ROM and use cartridge
      this.mmu.setPostBootState();

      // Start emulation
      this.emulator.start();

      // Execute with cycle limit and timeout
      const result = await this.executeWithLimits();

      this.emulator.stop();

      // Determine if test passed
      const output = this.serialInterface.getOutputBuffer();
      const passed = this.evaluateTestResult(output, expectedOutput);

      this.log(`Test finished: ${romPath}`);
      this.log(`- Passed: ${passed}`);
      this.log(`- Cycles: ${result.cycles}`);
      this.log(`- Output: ${JSON.stringify(output)}`);
      if (!passed) {
        this.log(`- Failure reason: ${result.failureReason}`);
      }

      return {
        passed,
        output,
        expectedOutput,
        cyclesExecuted: result.cycles,
        failureReason: passed ? undefined : result.failureReason,
      };
    } catch (error) {
      const failureReason = `Error executing test: ${error instanceof Error ? error.message : String(error)}`;
      this.log(`Test failed with error: ${failureReason}`);
      return {
        passed: false,
        output: '',
        expectedOutput,
        cyclesExecuted: 0,
        failureReason,
      };
    }
  }

  /**
   * Execute a test suite from a directory of ROMs
   * @param romDirectory Directory containing ROM files
   * @returns Test suite execution results
   */
  async executeTestSuite(romDirectory: string): Promise<BlarggTestSuiteResult> {
    this.log(`Executing test suite: ${romDirectory}`);
    if (!fs.existsSync(romDirectory)) {
      this.log(`Test suite failed: Directory not found`);
      return {
        passed: false,
        testResults: new Map(),
        totalTests: 0,
        passedTests: 0,
        failedTests: 1, // Count directory not found as a failure
      };
    }

    const testResults = new Map<string, BlarggTestResult>();

    try {
      // Find all ROM files in directory
      const files = fs
        .readdirSync(romDirectory)
        .filter(file => file.endsWith('.gb') || file.endsWith('.gbc'))
        .sort(); // Consistent execution order

      let passedTests = 0;
      let failedTests = 0;

      // Execute each test ROM
      for (const file of files) {
        const romPath = path.join(romDirectory, file);
        const result = await this.executeTest(romPath);

        testResults.set(file, result);

        if (result.passed) {
          passedTests++;
        } else {
          failedTests++;
        }
      }

      const passed = failedTests === 0;
      this.log(`Test suite finished: ${romDirectory}`);
      this.log(`- Passed: ${passed}`);
      this.log(`- Total tests: ${files.length}`);
      this.log(`- Passed tests: ${passedTests}`);
      this.log(`- Failed tests: ${failedTests}`);

      return {
        passed,
        testResults,
        totalTests: files.length,
        passedTests,
        failedTests,
      };
    } catch {
      this.log(`Test suite failed with error`);
      // Handle directory read errors
      return {
        passed: false,
        testResults: new Map(),
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
      };
    }
  }

  /**
   * Capture serial output with cycle limits
   * @param maxCycles Maximum cycles to execute
   * @returns Captured serial output
   */
  async captureSerialOutput(maxCycles: number): Promise<string> {
    this.serialInterface.clearOutputBuffer();

    const startTime = Date.now();
    let cyclesExecuted = 0;

    while (cyclesExecuted < maxCycles) {
      // In a real implementation, this would step the CPU
      // For now, we simulate by advancing serial interface timing
      this.serialInterface.step(100); // Step 100 cycles at a time
      cyclesExecuted += 100;

      // Check for timeout
      if (Date.now() - startTime > BlarggTestRunner.COMPLETION_TIMEOUT_MS) {
        break;
      }

      // Allow other tasks to run
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    return this.serialInterface.getOutputBuffer();
  }

  /**
   * Execute emulation with cycle and time limits
   * @returns Execution result with cycle count and potential failure reason
   */
  private async executeWithLimits(): Promise<{ cycles: number; failureReason?: string }> {
    const startTime = Date.now();
    let cyclesExecuted = 0;
    let lastCpuStateLog = 0;

    while (cyclesExecuted < BlarggTestRunner.MAX_CYCLES) {
      // Step emulation and get actual CPU cycles
      const actualCycles = this.emulator.step();
      this.serialInterface.step(actualCycles); // Use actual CPU cycles
      cyclesExecuted += actualCycles;

      // Check for completion patterns in output
      const output = this.serialInterface.getOutputBuffer();
      if (this.isTestComplete(output)) {
        this.log(`Test completion detected! Output: ${JSON.stringify(output)}`);
        return { cycles: cyclesExecuted };
      }

      // Check for timeout
      if (Date.now() - startTime > BlarggTestRunner.COMPLETION_TIMEOUT_MS) {
        const failureReason = 'Test execution timeout';
        this.log(failureReason);
        this.log(`CPU state at timeout: ${this.cpu.getDebugInfo()}`);
        return {
          cycles: cyclesExecuted,
          failureReason,
        };
      }

      // Log CPU state periodically
      if (
        this.debug &&
        cyclesExecuted - lastCpuStateLog >= BlarggTestRunner.CPU_STATE_LOG_INTERVAL
      ) {
        this.log(`CPU state at ${cyclesExecuted} cycles:`);
        this.log(this.cpu.getDebugInfo());
        lastCpuStateLog = cyclesExecuted;
      }

      // Yield control periodically
      if (cyclesExecuted % 10000 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    const failureReason = 'Maximum cycle limit reached';
    this.log(failureReason);
    this.log(`CPU state at max cycles: ${this.cpu.getDebugInfo()}`);
    return {
      cycles: cyclesExecuted,
      failureReason,
    };
  }

  /**
   * Check if test execution is complete based on output patterns
   * @param output Serial output to analyze
   * @returns Whether test appears complete
   */
  private isTestComplete(output: string): boolean {
    const completionPatterns = ['Passed', 'Failed', 'Done', 'All tests passed', 'Test completed'];

    return completionPatterns.some(pattern => output.toLowerCase().includes(pattern.toLowerCase()));
  }

  /**
   * Evaluate whether a test passed based on its output
   * @param output Captured serial output
   * @param expectedOutput Expected output pattern (optional)
   * @returns Whether test passed
   */
  private evaluateTestResult(output: string, expectedOutput?: string): boolean {
    // Check for explicit failure patterns first
    const failurePatterns = ['failed', 'error', 'fail #'];

    if (failurePatterns.some(pattern => output.toLowerCase().includes(pattern.toLowerCase()))) {
      return false;
    }

    // Check for success patterns
    const successPatterns = ['passed', 'ok', 'all tests passed'];

    const hasSuccessPattern = successPatterns.some(pattern =>
      output.toLowerCase().includes(pattern.toLowerCase())
    );

    // If expected output is provided, check for match
    if (expectedOutput) {
      return output.includes(expectedOutput) && hasSuccessPattern;
    }

    // Otherwise, just check for success patterns
    return hasSuccessPattern;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.emulator.stop();
    this.emulator.reset();
  }
}
