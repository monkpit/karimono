/**
 * Timer System Implementation for Game Boy DMG
 *
 * Hardware-accurate timer system implementing:
 * - DIV register (0xFF04): Auto-increment every 256 CPU cycles (16384 Hz)
 * - TIMA register (0xFF05): Programmable timer counter
 * - TMA register (0xFF06): Timer modulo (reload value for TIMA overflow)
 * - TAC register (0xFF07): Timer control (enable bit + frequency selection)
 *
 * Provides cycle-accurate timing behavior required for Blargg test ROM compatibility.
 * Implements hardware-accurate TIMA overflow behavior with interrupt generation.
 */

import { EmulatorComponent } from '../types';

/**
 * Timer component following project architectural patterns
 */
export class Timer implements EmulatorComponent {
  // Internal 16-bit divider counter (DIV register is upper 8 bits)
  private internalCounter = 0x0000;

  // Timer registers
  private tima = 0x00; // Timer counter (0xFF05)
  private tma = 0x00; // Timer modulo (0xFF06)
  private tac = 0x00; // Timer control (0xFF07)

  // Hardware-accurate timing state (reserved for future use)
  // private timaAccumulator = 0; // Accumulated cycles for TIMA increment timing
  // private previousTimerBit = false; // Previous state of timer enable & frequency bit (for falling edge detection)

  // Interrupt callback for timer overflow
  // eslint-disable-next-line no-unused-vars
  private requestInterrupt: (interrupt: number) => void;

  // Note: TIMER_FREQUENCIES removed - now using hardware-accurate bit positions instead
  // Frequency mapping: 00=1024 cycles (bit 9), 01=16 cycles (bit 3), 10=64 cycles (bit 5), 11=256 cycles (bit 7)

  // eslint-disable-next-line no-unused-vars
  constructor(requestInterrupt: (interrupt: number) => void) {
    this.requestInterrupt = requestInterrupt;
    this.reset();
  }

  reset(): void {
    this.internalCounter = 0x0000;
    this.tima = 0x00;
    this.tma = 0x00;
    this.tac = 0x00;
    // this.timaAccumulator = 0;
    // this.previousTimerBit = false;
  }

  /**
   * Advance timer system by specified CPU cycles
   * Updates DIV register and TIMA counter with hardware-accurate timing
   *
   * @param cycles Number of CPU cycles to advance
   */
  step(cycles: number): void {
    // Update TIMA using hardware-accurate falling edge detection
    // This also updates the internal counter, so we don't need to do it separately
    if (this.isTimerEnabled()) {
      this.updateTIMA(cycles);
    } else {
      // If timer is disabled, just update internal counter for DIV register
      this.internalCounter = (this.internalCounter + cycles) & 0xffff;
    }
  }

  /**
   * Update TIMA counter using hardware-accurate falling edge detection
   * This replaces the accumulator-based approach with true hardware behavior
   */
  private updateTIMA(cycles: number): void {
    // Update internal counter
    const oldCounter = this.internalCounter;
    this.internalCounter = (this.internalCounter + cycles) & 0xffff;

    // Check for timer increments using falling edge detection
    // Process each cycle individually to catch all edge transitions
    for (let i = 0; i < cycles; i++) {
      const cycleCounter = (oldCounter + i) & 0xffff;
      const nextCycleCounter = (oldCounter + i + 1) & 0xffff;

      const currentBit = this.getTimerBitForCounter(cycleCounter);
      const nextBit = this.getTimerBitForCounter(nextCycleCounter);

      const timerEnabled = this.isTimerEnabled();
      const currentState = timerEnabled && currentBit;
      const nextState = timerEnabled && nextBit;

      // Detect falling edge: current high, next low
      if (currentState && !nextState) {
        this.incrementTIMA();
      }
    }
  }

  /**
   * Increment TIMA counter and handle overflow
   */
  private incrementTIMA(): void {
    this.tima = (this.tima + 1) & 0xff;

    // Check for overflow (0xFF -> 0x00)
    if (this.tima === 0x00) {
      // Reload TIMA with TMA value
      this.tima = this.tma;

      // Request timer interrupt (bit 2 of IF register)
      this.requestInterrupt(2);
    }
  }

  /**
   * Check if timer is enabled (TAC bit 2)
   */
  private isTimerEnabled(): boolean {
    return (this.tac & 0x04) !== 0;
  }

  // Note: getTimerFrequency() removed - now using hardware-accurate bit checking instead

  /**
   * Get the timer bit state for the current internal counter
   * This determines whether the timer should increment based on frequency setting
   */
  private getTimerBit(): boolean {
    return this.getTimerBitForCounter(this.internalCounter);
  }

  /**
   * Get the timer bit state for a specific counter value
   * Hardware-accurate bit checking based on TAC frequency setting:
   * - Frequency 00 (1024 cycles): bit 9 of internal counter (0x0200)
   * - Frequency 01 (16 cycles): bit 3 of internal counter (0x0008)
   * - Frequency 10 (64 cycles): bit 5 of internal counter (0x0020)
   * - Frequency 11 (256 cycles): bit 7 of internal counter (0x0080)
   */
  private getTimerBitForCounter(counter: number): boolean {
    const frequencySelect = this.tac & 0x03;

    switch (frequencySelect) {
      case 0:
        return (counter & 0x0200) !== 0; // bit 9 (1024 cycles)
      case 1:
        return (counter & 0x0008) !== 0; // bit 3 (16 cycles)
      case 2:
        return (counter & 0x0020) !== 0; // bit 5 (64 cycles)
      case 3:
        return (counter & 0x0080) !== 0; // bit 7 (256 cycles)
      default:
        return false;
    }
  }

  // Register access methods

  /**
   * Read DIV register (0xFF04) - upper 8 bits of internal counter
   */
  readDIV(): number {
    return (this.internalCounter >> 8) & 0xff;
  }

  /**
   * Write DIV register (0xFF04) - resets internal counter to 0x0000
   * Any write value resets the entire 16-bit internal counter
   *
   * HARDWARE EDGE CASE: If the currently selected timer bit was set before reset,
   * this creates a falling edge that can trigger a timer increment.
   */
  writeDIV(_value: number): void {
    void _value; // Mark parameter as used

    // Check if current timer bit is set before reset (edge case)
    const currentTimerBit = this.getTimerBit();
    const timerEnabled = this.isTimerEnabled();
    const currentState = timerEnabled && currentTimerBit;

    // Reset the internal counter
    this.internalCounter = 0x0000;
    // this.timaAccumulator = 0;

    // Check for falling edge: was high, now low (after reset)
    const newTimerBit = this.getTimerBit(); // Will be false after reset
    const newState = timerEnabled && newTimerBit;

    if (currentState && !newState) {
      // Falling edge detected - trigger timer increment
      this.incrementTIMA();
    }

    // this.previousTimerBit = newState;
  }

  /**
   * Read TIMA register (0xFF05)
   */
  readTIMA(): number {
    return this.tima;
  }

  /**
   * Write TIMA register (0xFF05)
   */
  writeTIMA(value: number): void {
    this.tima = value & 0xff;
  }

  /**
   * Read TMA register (0xFF06)
   */
  readTMA(): number {
    return this.tma;
  }

  /**
   * Write TMA register (0xFF06)
   */
  writeTMA(value: number): void {
    this.tma = value & 0xff;
  }

  /**
   * Read TAC register (0xFF07)
   */
  readTAC(): number {
    return this.tac;
  }

  /**
   * Write TAC register (0xFF07)
   * Only bits 0-2 are used (bit 2: enable, bits 1-0: frequency)
   *
   * HARDWARE EDGE CASE: Changing TAC can trigger immediate timer increment
   * if the change creates a falling edge on (timer_enable & frequency_bit).
   */
  writeTAC(value: number): void {
    const oldTac = this.tac;
    const newTac = value & 0x07; // Only lower 3 bits are used

    // Calculate old and new timer states
    const oldEnabled = (oldTac & 0x04) !== 0;
    const newEnabled = (newTac & 0x04) !== 0;
    const timerBit = this.getTimerBit();

    const oldState = oldEnabled && timerBit;
    const newState = newEnabled && timerBit;

    // Update TAC register
    this.tac = newTac;

    // Check for falling edge
    if (oldState && !newState) {
      // Falling edge detected - trigger timer increment
      this.incrementTIMA();
    }

    // this.previousTimerBit = newState;
  }
}
