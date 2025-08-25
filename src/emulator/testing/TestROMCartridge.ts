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

  // MBC1 state registers
  private currentROMBank: number = 1; // Current ROM bank (1-31, bank 0 maps to bank 1)
  private ramEnabled: boolean = false; // RAM enable state
  private mbcType: number; // MBC type from ROM header
  private bankingMode: number = 0; // MBC1 banking mode: 0 = simple, 1 = advanced
  private lowerROMBankBits: number = 1; // Lower 5 bits of ROM bank number
  private upperBankBits: number = 0; // Upper 2 bits for ROM bank (or RAM bank in simple mode)
  private currentRAMBank: number = 0; // Current RAM bank

  constructor(romData: Uint8Array) {
    this.romData = new Uint8Array(romData);
    // Allocate 32KB of RAM for test ROMs (typical Game Boy cartridge size)
    this.ramData = new Uint8Array(32768);

    // Extract MBC type from ROM header (address 0x0147)
    this.mbcType = romData.length > 0x0147 ? romData[0x0147] : 0;
  }

  readROM(address: number): number {
    // Handle ROM bank switching for MBC1
    if (this.mbcType === 0x01 && address >= 0x4000 && address <= 0x7fff) {
      // Switchable ROM bank (0x4000-0x7FFF)
      const bankOffset = address - 0x4000; // Offset within bank (0x0000-0x3FFF)
      const actualAddress = this.currentROMBank * 0x4000 + bankOffset;

      if (actualAddress >= this.romData.length) {
        return 0xff; // Return 0xFF for unmapped ROM addresses
      }
      return this.romData[actualAddress];
    }

    // Fixed ROM bank (0x0000-0x3FFF) or non-MBC ROM
    if (address >= this.romData.length) {
      return 0xff; // Return 0xFF for unmapped ROM addresses (hardware behavior)
    }
    return this.romData[address];
  }

  readRAM(address: number): number {
    // Check if RAM is enabled for MBC1
    if (this.mbcType === 0x01 && !this.ramEnabled) {
      return 0xff; // Return 0xFF when RAM is disabled (hardware behavior)
    }

    // RAM addresses are typically 0xA000-0xBFFF (8KB window)
    // For MBC1, apply RAM bank switching
    let ramAddress = address & 0x1fff; // Mask to 8KB
    if (this.mbcType === 0x01) {
      ramAddress += this.currentRAMBank * 0x2000; // Add RAM bank offset
    }

    if (ramAddress >= this.ramData.length) {
      return 0xff;
    }
    return this.ramData[ramAddress];
  }

  writeRAM(address: number, value: number): void {
    // Check if RAM is enabled for MBC1
    if (this.mbcType === 0x01 && !this.ramEnabled) {
      return; // Ignore writes when RAM is disabled (hardware behavior)
    }

    // RAM addresses are typically 0xA000-0xBFFF (8KB window)
    // For MBC1, apply RAM bank switching
    let ramAddress = address & 0x1fff; // Mask to 8KB
    if (this.mbcType === 0x01) {
      ramAddress += this.currentRAMBank * 0x2000; // Add RAM bank offset
    }

    if (ramAddress < this.ramData.length) {
      this.ramData[ramAddress] = value & 0xff;
    }
  }

  writeMBCRegister(address: number, value: number): void {
    // Hardware-accurate behavior: writes to ROM space (0x0000-0x7FFF) control MBC registers only
    // ROM content itself is immutable - writes do not modify ROM data
    //
    // Per Pan Docs: "writes to the ROM area control the MBC"
    // Reference: https://gbdev.io/pandocs/Memory_Map.html
    // MBC1 Specification: https://gbdev.io/pandocs/MBC1.html

    // Handle MBC1 register writes
    if (this.mbcType === 0x01) {
      if (address >= 0x0000 && address <= 0x1fff) {
        // RAM Enable/Disable (0x0000-0x1FFF)
        this.ramEnabled = (value & 0x0f) === 0x0a;
      } else if (address >= 0x2000 && address <= 0x3fff) {
        // ROM Bank Number (0x2000-0x3FFF) - 5-bit register
        this.lowerROMBankBits = Math.max(1, value & 0x1f);
        this.updateCurrentROMBank();
      } else if (address >= 0x4000 && address <= 0x5fff) {
        // RAM Bank Number or Upper ROM Bank Bits (0x4000-0x5FFF)
        this.upperBankBits = value & 0x03;

        if (this.bankingMode === 0) {
          // Simple banking mode: this controls RAM bank
          this.currentRAMBank = this.upperBankBits;
        } else {
          // Advanced banking mode: this controls upper ROM bank bits
          this.updateCurrentROMBank();
          this.currentRAMBank = 0; // RAM bank fixed to 0 in advanced mode
        }
      } else if (address >= 0x6000 && address <= 0x7fff) {
        // Banking Mode Select (0x6000-0x7FFF)
        this.bankingMode = value & 0x01;

        // Update banking state based on new mode
        if (this.bankingMode === 0) {
          // Simple banking: ROM bank uses only lower bits, RAM bank uses upper bits
          this.currentROMBank = this.lowerROMBankBits;
          this.currentRAMBank = this.upperBankBits;
        } else {
          // Advanced banking: ROM bank uses upper+lower bits, RAM bank fixed to 0
          this.updateCurrentROMBank();
          this.currentRAMBank = 0;
        }
      }
    }

    // For non-MBC ROMs, writes are effectively ignored (ROM space immutable)
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

    // Reset MBC1 state to hardware defaults
    this.currentROMBank = 1; // Default ROM bank
    this.ramEnabled = false; // RAM disabled by default
    this.bankingMode = 0;
    this.lowerROMBankBits = 1;
    this.upperBankBits = 0;
    this.currentRAMBank = 0;
  }

  getState(): {
    rom: Uint8Array;
    ram: Uint8Array;
    banking: {
      currentROMBank: number;
      currentRAMBank: number;
      ramEnabled: boolean;
      bankingMode: number;
    };
  } {
    return {
      rom: new Uint8Array(this.romData),
      ram: new Uint8Array(this.ramData),
      banking: {
        currentROMBank: this.currentROMBank,
        currentRAMBank: this.currentRAMBank,
        ramEnabled: this.ramEnabled,
        bankingMode: this.bankingMode,
      },
    };
  }

  /**
   * Update current ROM bank based on banking mode and bank bits
   * Handles ROM bank calculation for both simple and advanced banking modes
   */
  private updateCurrentROMBank(): void {
    if (this.bankingMode === 0) {
      // Simple banking: only lower 5 bits matter
      this.currentROMBank = this.lowerROMBankBits;
    } else {
      // Advanced banking: combine upper 2 bits and lower 5 bits
      // ROM bank = (upper bits << 5) | lower bits
      this.currentROMBank = (this.upperBankBits << 5) | this.lowerROMBankBits;
    }
  }
}
