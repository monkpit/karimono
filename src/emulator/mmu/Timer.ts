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

  // TIMA timing state
  private timaAccumulator = 0; // Accumulated cycles for TIMA increment timing

  // Interrupt callback for timer overflow
  // eslint-disable-next-line no-unused-vars
  private requestInterrupt: (interrupt: number) => void;

  // Timer frequency lookup table (cycles per TIMA increment)
  private static readonly TIMER_FREQUENCIES = [
    1024, // 00: 4096 Hz (1024 CPU cycles)
    16, // 01: 262144 Hz (16 CPU cycles)
    64, // 10: 65536 Hz (64 CPU cycles)
    256, // 11: 16384 Hz (256 CPU cycles)
  ];

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
    this.timaAccumulator = 0;
  }

  /**
   * Advance timer system by specified CPU cycles
   * Updates DIV register and TIMA counter with hardware-accurate timing
   *
   * @param cycles Number of CPU cycles to advance
   */
  step(cycles: number): void {
    // Update internal counter for DIV register (every cycle)
    this.internalCounter = (this.internalCounter + cycles) & 0xffff;

    // Update TIMA if timer is enabled (TAC bit 2)
    if (this.isTimerEnabled()) {
      this.updateTIMA(cycles);
    }
  }

  /**
   * Update TIMA counter based on TAC frequency setting
   * Handles TIMA overflow and interrupt generation
   */
  private updateTIMA(cycles: number): void {
    this.timaAccumulator += cycles;

    const timerFrequency = this.getTimerFrequency();

    // Process TIMA increments
    while (this.timaAccumulator >= timerFrequency) {
      this.timaAccumulator -= timerFrequency;
      this.incrementTIMA();
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

  /**
   * Get timer frequency from TAC bits 1-0
   */
  private getTimerFrequency(): number {
    const frequencySelect = this.tac & 0x03;
    return Timer.TIMER_FREQUENCIES[frequencySelect];
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
   */
  writeDIV(_value: number): void {
    void _value; // Mark parameter as used
    // Any write to DIV resets the internal counter (value is ignored)
    this.internalCounter = 0x0000;
    this.timaAccumulator = 0; // Also reset TIMA timing accumulator
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
   */
  writeTAC(value: number): void {
    this.tac = value & 0x07; // Only lower 3 bits are used
  }
}
