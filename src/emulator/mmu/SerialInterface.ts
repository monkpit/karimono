/**
 * Serial Interface Component Implementation
 *
 * Hardware-accurate Game Boy DMG serial communication component
 * Following TDD principles with hardware specification compliance
 *
 * Hardware Specifications:
 * - Serial Data Register (SB - 0xFF01): Holds data for transfer
 * - Serial Control Register (SC - 0xFF02): Controls transfer timing
 * - Internal clock: 8192 Hz (4096 CPU cycles per bit, 32768 cycles per byte)
 * - Disconnected cable behavior: incoming bits read as 1 (0xFF shifted in)
 */

import { SerialInterfaceComponent } from '../types';

/**
 * Serial Interface Component
 * Implements hardware-accurate Game Boy DMG serial communication
 */
export class SerialInterface implements SerialInterfaceComponent {
  // Serial registers
  private serialData: number = 0x00; // SB register (0xFF01)
  private serialControl: number = 0x00; // SC register (0xFF02)

  // Transfer state
  private transferActive: boolean = false;
  private transferCycles: number = 0; // Accumulated cycles during transfer
  private readonly TRANSFER_CYCLES = 4096; // Hardware-accurate timing: 8192Hz clock -> 4096 CPU cycles @ 4.194MHz

  // Output buffer for test ROM integration
  private outputBuffer: string = '';

  // Debug mode
  private debug: boolean = false;
  // eslint-disable-next-line no-unused-vars
  private interruptCallback: (interrupt: number) => void;

  constructor(
    debug = false,
    // eslint-disable-next-line no-unused-vars
    interruptCallback: (interrupt: number) => void = (_interrupt: number) => {
      // No-op default implementation
    }
  ) {
    this.debug = debug;
    this.interruptCallback = interruptCallback;
    this.reset();
  }

  reset(): void {
    this.serialData = 0x00;
    this.serialControl = 0x00;
    this.transferActive = false;
    this.transferCycles = 0;
    this.outputBuffer = '';
  }

  readSB(): number {
    return this.serialData;
  }

  writeSB(value: number): void {
    this.serialData = value & 0xff; // Mask to 8 bits
  }

  readSC(): number {
    return this.serialControl;
  }

  writeSC(value: number): void {
    const maskedValue = value & 0xff;
    this.serialControl = maskedValue;

    if (this.debug) {
      // Debug logging would go here when needed
    }

    // Check if transfer should start
    // Bit 7 = Transfer Start/Busy flag
    // Bit 0 = Clock Select (1 = internal, 0 = external)
    if ((maskedValue & 0x80) !== 0) {
      // Transfer start bit set
      this.startTransfer();
    }
  }

  isTransferActive(): boolean {
    return this.transferActive;
  }

  step(cpuCycles: number): void {
    // Only process if transfer is active and using internal clock
    if (!this.transferActive || cpuCycles <= 0) {
      return;
    }

    // Hardware-accurate: only advance transfer with internal clock
    if ((this.serialControl & 0x01) === 0) {
      // External clock mode - no auto-advance
      return;
    }

    // Accumulate transfer cycles
    this.transferCycles += cpuCycles;

    // Check if transfer is complete
    if (this.transferCycles >= this.TRANSFER_CYCLES) {
      this.completeTransfer();
    }
  }

  getOutputBuffer(): string {
    return this.outputBuffer;
  }

  clearOutputBuffer(): void {
    this.outputBuffer = '';
  }

  /**
   * Start a serial transfer
   * Called when SC register is written with transfer start bit set
   */
  private startTransfer(): void {
    this.transferActive = true;
    this.transferCycles = 0;

    // Set busy flag (bit 7) in SC register
    this.serialControl |= 0x80;

    if (this.debug) {
      // Debug logging would go here when needed
    }
  }

  /**
   * Complete a serial transfer
   * Simulates disconnected cable behavior and captures output
   */
  private completeTransfer(): void {
    // Capture the transmitted byte for output buffer
    const transmittedByte = this.serialData;

    // Simulate disconnected cable: all incoming bits are 1
    // This means 0xFF is shifted into the data register
    this.serialData = 0xff;

    // Clear busy flag (bit 7) in SC register
    this.serialControl &= 0x7f; // Clear bit 7

    // Mark transfer as complete
    this.transferActive = false;
    this.transferCycles = 0;

    // Add transmitted byte to output buffer as ASCII character
    this.outputBuffer += String.fromCharCode(transmittedByte);

    if (this.debug) {
      // Debug logging would go here when needed
    }

    // In real hardware, this would also trigger a serial interrupt
    this.interruptCallback(3); // Trigger Serial Interrupt (bit 3)
  }
}
