/**
 * Test ROM Cartridge Implementation
 *
 * Minimal cartridge implementation for Blargg test ROM execution
 * Following TDD principles - implements just enough to make tests pass
 */

import { CartridgeComponent, CartridgeHeader } from '../types';

/**
 * Simple test cartridge that loads ROM data directly
 * Used specifically for Blargg test ROM execution
 */
export class TestROMCartridge implements CartridgeComponent {
  private romData: Uint8Array;
  private ramData: Uint8Array;

  constructor(romData: Uint8Array) {
    this.romData = new Uint8Array(romData);
    // Allocate 32KB of RAM for test ROMs (typical Game Boy cartridge size)
    this.ramData = new Uint8Array(32768);
  }

  readROM(address: number): number {
    // ROM addresses are typically 0x0000-0x7FFF (32KB)
    if (address >= this.romData.length) {
      return 0xff; // Return 0xFF for unmapped ROM addresses (hardware behavior)
    }
    return this.romData[address];
  }

  readRAM(address: number): number {
    // RAM addresses are typically 0xA000-0xBFFF (8KB window)
    const ramAddress = address & 0x1fff; // Mask to 8KB
    if (ramAddress >= this.ramData.length) {
      return 0xff;
    }
    return this.ramData[ramAddress];
  }

  writeRAM(address: number, value: number): void {
    // RAM addresses are typically 0xA000-0xBFFF (8KB window)
    const ramAddress = address & 0x1fff; // Mask to 8KB
    if (ramAddress < this.ramData.length) {
      this.ramData[ramAddress] = value & 0xff;
    }
  }

  writeMBCRegister(_address: number, _value: number): void {
    void _address;
    void _value;
    // Test ROMs typically don't use complex MBC (Memory Bank Controller) features
    // For Blargg test ROMs, we can implement a simple no-op
  }

  getHeader(): CartridgeHeader {
    // Parse basic header information from ROM data
    // Game Boy cartridge header starts at 0x0100
    if (this.romData.length < 0x0150) {
      // Return minimal header for incomplete ROM data
      return {
        title: 'Test ROM',
        mbcType: 0, // No MBC
        romSize: this.romData.length,
        ramSize: this.ramData.length,
        checksumValid: false, // Don't validate for test ROMs
      };
    }

    // Extract title (0x0134-0x0143, ASCII)
    let title = '';
    for (let i = 0x0134; i <= 0x0143 && i < this.romData.length; i++) {
      const char = this.romData[i];
      if (char === 0) break; // Null terminator
      if (char >= 0x20 && char <= 0x7e) {
        // Printable ASCII
        title += String.fromCharCode(char);
      }
    }

    // Extract MBC type (0x0147)
    const mbcType = this.romData[0x0147] || 0;

    // Extract ROM size (0x0148)
    const romSizeCode = this.romData[0x0148] || 0;
    const romSize = 32768 << romSizeCode; // 32KB * 2^code

    // Extract RAM size (0x0149)
    const ramSizeCode = this.romData[0x0149] || 0;
    const ramSizeMap = [0, 2048, 8192, 32768]; // RAM sizes for codes 0-3
    const ramSize = ramSizeMap[ramSizeCode] || 0;

    return {
      title: title || 'Test ROM',
      mbcType,
      romSize,
      ramSize,
      checksumValid: false, // Don't validate checksums for test ROMs
    };
  }

  step(_cycles: number): void {
    void _cycles;
    // Test ROM cartridges don't need stepping logic
  }

  reset(): void {
    // Clear RAM but preserve ROM data
    this.ramData.fill(0x00);
  }

  getState(): { rom: Uint8Array; ram: Uint8Array } {
    return {
      rom: new Uint8Array(this.romData),
      ram: new Uint8Array(this.ramData),
    };
  }
}
