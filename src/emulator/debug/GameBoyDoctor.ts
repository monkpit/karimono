/**
 * Game Boy Doctor Integration
 *
 * Generates diagnostic logs compatible with Game Boy Doctor tool
 * for debugging emulator state divergence from reference implementation.
 *
 * Format: A:00 F:11 B:22 C:33 D:44 E:55 H:66 L:77 SP:8888 PC:9999 PCMEM:AA,BB,CC,DD
 *
 * Reference: https://robertheaton.com/gameboy-doctor/
 */

import { CPURegisters, MMUComponent } from '../types';

export interface GameBoyDoctorConfig {
  enabled: boolean;
  outputFile?: string;
}

export class GameBoyDoctor {
  private enabled: boolean = false;
  private logs: string[] = [];
  private outputFile?: string;

  constructor(config?: GameBoyDoctorConfig) {
    this.enabled = config?.enabled ?? false;
    this.outputFile = config?.outputFile;
  }

  /**
   * Enable Game Boy Doctor logging
   */
  enable(outputFile?: string): void {
    this.enabled = true;
    this.outputFile = outputFile;
    this.logs = [];
  }

  /**
   * Disable Game Boy Doctor logging
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Check if Game Boy Doctor logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Log CPU state for Game Boy Doctor analysis
   * Called once per CPU step before instruction execution
   */
  logState(registers: CPURegisters, mmu: MMUComponent): void {
    if (!this.enabled) {
      return;
    }

    const pc = registers.pc;

    // Read 4 bytes of memory near program counter for PCMEM
    const pcmem = [
      mmu.readByte(pc),
      mmu.readByte((pc + 1) & 0xffff),
      mmu.readByte((pc + 2) & 0xffff),
      mmu.readByte((pc + 3) & 0xffff),
    ];

    // Format: A:00 F:11 B:22 C:33 D:44 E:55 H:66 L:77 SP:8888 PC:9999 PCMEM:AA,BB,CC,DD
    const logLine = [
      `A:${this.toHex2(registers.a)}`,
      `F:${this.toHex2(registers.f)}`,
      `B:${this.toHex2(registers.b)}`,
      `C:${this.toHex2(registers.c)}`,
      `D:${this.toHex2(registers.d)}`,
      `E:${this.toHex2(registers.e)}`,
      `H:${this.toHex2(registers.h)}`,
      `L:${this.toHex2(registers.l)}`,
      `SP:${this.toHex4(registers.sp)}`,
      `PC:${this.toHex4(pc)}`,
      `PCMEM:${pcmem.map(b => this.toHex2(b)).join(',')}`,
    ].join(' ');

    this.logs.push(logLine);
  }

  /**
   * Get all logged lines
   */
  getLogs(): string[] {
    return [...this.logs];
  }

  /**
   * Get logs as string with newlines
   */
  getLogsAsString(): string {
    return this.logs.join('\n');
  }

  /**
   * Clear logged data
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Save logs to file (Node.js environment)
   */
  saveLogs(): void {
    if (!this.outputFile || typeof window !== 'undefined') {
      return; // Skip file operations in browser
    }

    try {
      const fs = require('fs');
      fs.writeFileSync(this.outputFile, this.getLogsAsString());
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to save Game Boy Doctor logs:', error);
    }
  }

  /**
   * Format number as 2-digit hex string
   */
  private toHex2(value: number): string {
    return (value & 0xff).toString(16).toUpperCase().padStart(2, '0');
  }

  /**
   * Format number as 4-digit hex string
   */
  private toHex4(value: number): string {
    return (value & 0xffff).toString(16).toUpperCase().padStart(4, '0');
  }
}
