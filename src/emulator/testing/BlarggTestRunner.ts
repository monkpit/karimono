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
  // Increased cycle limit for longer tests, sufficient for ~35 seconds at 4.194MHz
  private static readonly MAX_CYCLES = 150_000_000;
  private static readonly COMPLETION_TIMEOUT_MS = 30_000; // 30 second timeout
  // Adjusted logging intervals for performance
  private static readonly CPU_STATE_LOG_INTERVAL = 10_000_000; // Log CPU state every 10M cycles
  private static readonly INSTRUCTION_DEBUG_INTERVAL = 1_000_000; // Log instruction state every 1M cycles for debugging

  private emulator: EmulatorContainer;
  private serialInterface: SerialInterfaceComponent;
  private mmu: MMUComponent;
  private cpu: CPUComponent;
  private debug: boolean;
  private performanceMode: boolean;
  private instructionDebugMode: boolean = false;
  private lastSerialOutput: string = '';
  private instructionCount: number = 0;

  constructor(parentElement: HTMLElement, debug = false, performanceMode = true) {
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
    this.performanceMode = performanceMode;
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
   * Enable instruction-level debugging for detailed failure analysis
   * @param enabled Whether to enable instruction debugging
   */
  enableInstructionDebug(enabled: boolean): void {
    this.instructionDebugMode = enabled;
    this.log(`Instruction debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Log detailed CPU state and instruction information for debugging
   * @param opcode Current opcode being executed
   * @param preState CPU state before instruction
   * @param postState CPU state after instruction
   */
  private logInstructionDebug(
    opcode: number,
    preState: string,
    postState: string,
    serialOutput: string
  ): void {
    if (this.instructionDebugMode) {
      // eslint-disable-next-line no-console
      console.log(
        `[INSTR-DEBUG] Instruction ${this.instructionCount}: ` +
          `Opcode=0x${opcode.toString(16).padStart(2, '0').toUpperCase()} | ` +
          `PRE: ${preState} | POST: ${postState}`
      );

      if (serialOutput !== this.lastSerialOutput) {
        // eslint-disable-next-line no-console
        console.log(
          `[SERIAL-CHANGE] New output: "${serialOutput}" ` + `(was: "${this.lastSerialOutput}")`
        );
        this.lastSerialOutput = serialOutput;
      }
    }
  }

  /**
   * Execute a single Blargg test ROM
   * @param romPath Path to the ROM file
   * @param expectedOutput Expected output pattern (optional)
   * @returns Test execution result
   */
  executeTest(romPath: string, expectedOutput?: string): BlarggTestResult {
    this.log(`Executing test: ${romPath}`);

    // Enable instruction debugging for problematic test ROMs that were timing out
    const problematicRoms = ['04-op r,imm', '05-op rp', '09-op r,r', '10-bit ops', '11-op a,(hl)'];
    const isProblematicRom = problematicRoms.some(romName => romPath.includes(romName));

    if (isProblematicRom && !this.instructionDebugMode) {
      this.log(`Enabling instruction debug mode for potentially problematic ROM: ${romPath}`);
      this.enableInstructionDebug(true);
    }

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
      const result = this.executeWithLimits();

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
  executeTestSuite(romDirectory: string): BlarggTestSuiteResult {
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
        const result = this.executeTest(romPath);

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
  captureSerialOutput(maxCycles: number): string {
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
    }

    return this.serialInterface.getOutputBuffer();
  }

  /**
   * Execute emulation with cycle and time limits
   * @returns Execution result with cycle count and potential failure reason
   */
  private executeWithLimits(): { cycles: number; failureReason?: string } {
    const startTime = Date.now();
    let cyclesExecuted = 0;
    let lastCpuStateLog = 0;
    let lastInstructionDebugLog = 0;

    // Reset debug state
    this.instructionCount = 0;
    this.lastSerialOutput = this.serialInterface.getOutputBuffer();

    // Infinite loop detection variables
    let lastPC = -1;
    let pcStallCounter = 0;
    const PC_STALL_THRESHOLD = 8192; // Cycles stuck at same PC before assuming infinite loop
    let loopDetectionActive = false;

    if (this.instructionDebugMode && !this.performanceMode) {
      this.log('Starting instruction-level debugging mode');
    }

    while (cyclesExecuted < BlarggTestRunner.MAX_CYCLES) {
      // Get current PC for loop detection
      const debugInfo = this.cpu.getDebugInfo();
      const currentPC = this.extractPCFromDebugInfo(debugInfo);

      // Track PC stall for infinite loop detection
      if (currentPC === lastPC) {
        pcStallCounter++;
      } else {
        lastPC = currentPC;
        pcStallCounter = 0;
      }

      // Check for infinite loop - only after we've detected test completion
      const output = this.serialInterface.getOutputBuffer();
      const testCompleteDetected = this.isTestComplete(output);

      if (testCompleteDetected && !loopDetectionActive) {
        loopDetectionActive = true;
        this.log(`Test completion pattern detected, enabling infinite loop detection`);
      }

      if (loopDetectionActive && pcStallCounter > PC_STALL_THRESHOLD) {
        this.log(
          `Infinite loop detected at PC=0x${currentPC.toString(16).toUpperCase().padStart(4, '0')} after test completion`
        );
        this.log(`Test finished successfully with output: ${JSON.stringify(output)}`);
        if (this.instructionDebugMode && !this.performanceMode) {
          this.log(`Total instructions executed: ${this.instructionCount}`);
        }
        return { cycles: cyclesExecuted };
      }

      // Capture CPU state before stepping for instruction debugging
      let preStepState = '';
      let opcode = 0x00;
      if (this.instructionDebugMode && !this.performanceMode) {
        preStepState = this.cpu.getDebugInfo();
        // Try to get the opcode that will be executed
        try {
          const pc = this.cpu.getPC();
          opcode = this.mmu.readByte(pc);
        } catch {
          // If we can't read the opcode, use 0x00
          opcode = 0x00;
        }
      }

      // Step emulation and get actual CPU cycles
      const actualCycles = this.emulator.step();
      this.serialInterface.step(actualCycles); // Use actual CPU cycles

      // Also step MMU for LY register timing, skip in performance mode
      if (
        !this.performanceMode &&
        this.mmu &&
        'step' in this.mmu &&
        // eslint-disable-next-line no-unused-vars
        typeof (this.mmu as { step: (cycles: number) => void }).step === 'function'
      ) {
        // eslint-disable-next-line no-unused-vars
        (this.mmu as { step: (cycles: number) => void }).step(actualCycles);
      }

      cyclesExecuted += actualCycles;
      this.instructionCount++;

      // Log instruction-level debugging if enabled and not in performance mode
      if (
        !this.performanceMode &&
        this.instructionDebugMode &&
        cyclesExecuted - lastInstructionDebugLog >= BlarggTestRunner.INSTRUCTION_DEBUG_INTERVAL
      ) {
        const postStepState = this.cpu.getDebugInfo();
        const currentSerialOutput = this.serialInterface.getOutputBuffer();
        this.logInstructionDebug(opcode, preStepState, postStepState, currentSerialOutput);
        lastInstructionDebugLog = cyclesExecuted;
      }

      // Check for completion patterns in output (early detection without loop requirement)
      if (testCompleteDetected && pcStallCounter === 0) {
        // Test completed and still executing - give it a moment to settle
        this.log(`Test completion detected! Output: ${JSON.stringify(output)}`);
        if (this.instructionDebugMode && !this.performanceMode) {
          this.log(`Total instructions executed: ${this.instructionCount}`);
        }
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

      // Log CPU state periodically, skip in performance mode
      if (
        !this.performanceMode &&
        this.debug &&
        cyclesExecuted - lastCpuStateLog >= BlarggTestRunner.CPU_STATE_LOG_INTERVAL
      ) {
        this.log(`CPU state at ${cyclesExecuted} cycles:`);
        this.log(this.cpu.getDebugInfo());
        lastCpuStateLog = cyclesExecuted;
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
   * Extract PC value from CPU debug info string
   * @param debugInfo Debug info string from CPU
   * @returns PC value or -1 if not found
   */
  private extractPCFromDebugInfo(debugInfo: string): number {
    // Look for PC pattern like "PC: 0x1234" or "pc=0x1234"
    const pcMatch = debugInfo.match(/pc[:\s=]+0x([0-9a-fA-F]+)/i);
    if (pcMatch?.[1]) {
      return parseInt(pcMatch[1], 16);
    }
    return -1; // Couldn't parse PC
  }

  /**
   * Check if test execution is complete based on output patterns
   * Enhanced to handle individual Blargg test ROM completion patterns
   * @param output Serial output to analyze
   * @returns Whether test appears complete
   */
  private isTestComplete(output: string): boolean {
    // Standard completion patterns
    const standardPatterns = ['Passed', 'Failed', 'Done', 'All tests passed', 'Test completed'];

    // Individual test ROM patterns - these tests output their name followed by completion
    const individualTestPatterns = [
      '04-op r,imm',
      '05-op rp',
      '09-op r,r',
      '10-bit ops',
      '11-op a,(hl)',
      '01-special',
      '02-interrupts',
      '03-op sp,hl',
      '06-ld r,r',
      '07-jr,jp,call,ret,rst',
      '08-misc instrs',
    ];

    // Check for standard completion patterns first
    const hasStandardCompletion = standardPatterns.some(pattern =>
      output.toLowerCase().includes(pattern.toLowerCase())
    );

    if (hasStandardCompletion) {
      return true;
    }

    // For individual test ROMs, check if we have the test name and signs of completion
    // Many Blargg tests output: "Test Name\n\n\nPassed" or similar
    const hasIndividualTestName = individualTestPatterns.some(testName =>
      output.includes(testName)
    );

    if (hasIndividualTestName) {
      // Look for completion indicators after test name
      const lines = output.split('\n');
      const hasPassedLine = lines.some(line => line.trim().toLowerCase() === 'passed');
      const hasFailedLine = lines.some(line => line.trim().toLowerCase().includes('failed'));

      // Check for the typical Blargg pattern: test name followed by multiple newlines then "Passed"
      const blarggPattern = /\n\s*\n\s*\n\s*(Passed|Failed)/i;
      const hasBlarggPattern = blarggPattern.test(output);

      return hasPassedLine || hasFailedLine || hasBlarggPattern;
    }

    return false;
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
