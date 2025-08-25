/**
 * Unified Cartridge Implementation
 *
 * Handles all cartridge functionality including MBC1 banking, ROM/RAM access,
 * and header parsing. Consolidates duplicate logic previously spread between
 * MMU and TestROMCartridge to provide single source of truth for cartridge behavior.
 *
 * Reference: RGBDS GBZ80 Reference - https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 * Reference: Pan Docs MBC1 - https://gbdev.io/pandocs/MBC1.html
 */

import { CartridgeComponent, CartridgeHeader } from '../types';

/**
 * Unified cartridge implementation supporting both test ROMs and real cartridges
 * Provides hardware-accurate MBC1 banking behavior as single source of truth
 */
export class Cartridge implements CartridgeComponent {
  private romData: Uint8Array;
  private ramData: Uint8Array;
  private mbcType: number;

  // MBC1 banking state - encapsulated within cartridge
  private currentROMBank: number = 1; // Current ROM bank (1-127, bank 0 maps to bank 1)
  private currentRAMBank: number = 0; // Current RAM bank (0-3)
  private ramEnabled: boolean = false; // RAM enable state
  private bankingMode: number = 0; // MBC1 banking mode: 0 = simple, 1 = advanced
  private lowerROMBankBits: number = 1; // Lower 5 bits of ROM bank number
  private upperBankBits: number = 0; // Upper 2 bits for ROM bank (or RAM bank in simple mode)

  /**
   * Create cartridge from ROM data
   * @param romData ROM data to load
   * @param ramSize Optional RAM size override (defaults to header-specified size)
   */
  constructor(romData: Uint8Array, ramSize?: number) {
    this.romData = new Uint8Array(romData);

    // Extract MBC type from ROM header (address 0x0147)
    this.mbcType = romData.length > 0x0147 ? romData[0x0147] : 0;

    // Determine RAM size from header or override
    let actualRamSize = ramSize;
    if (!actualRamSize) {
      const ramSizeCode = romData.length > 0x0149 ? romData[0x0149] : 0;
      const ramSizeMap = [0, 2048, 8192, 32768]; // RAM sizes for codes 0-3
      actualRamSize = ramSizeMap[ramSizeCode] || 32768; // Default to 32KB for test ROMs
    }

    this.ramData = new Uint8Array(actualRamSize);
    this.reset();
  }

  /**
   * Read from ROM space with banking support
   * Handles fixed bank (0x0000-0x3FFF) and switchable bank (0x4000-0x7FFF)
   */
  readROM(address: number): number {
    // Fixed ROM bank (0x0000-0x3FFF) - always bank 0
    if (address >= 0x0000 && address <= 0x3fff) {
      if (address >= this.romData.length) {
        return 0xff; // Unmapped ROM returns 0xFF
      }
      return this.romData[address];
    }

    // Switchable ROM bank (0x4000-0x7FFF)
    if (address >= 0x4000 && address <= 0x7fff) {
      // Handle MBC1 banking
      if (this.mbcType === 0x01) {
        const bankOffset = address - 0x4000; // Offset within bank (0x0000-0x3FFF)
        const actualAddress = this.currentROMBank * 0x4000 + bankOffset;

        if (actualAddress >= this.romData.length) {
          return 0xff; // Unmapped ROM returns 0xFF
        }
        return this.romData[actualAddress];
      } else {
        // Non-MBC ROM - direct access
        if (address >= this.romData.length) {
          return 0xff;
        }
        return this.romData[address];
      }
    }

    // Address outside ROM space
    return 0xff;
  }

  /**
   * Read from cartridge RAM with banking support
   * Address is relative to cartridge RAM space (0x0000-0x1FFF for 8KB window)
   */
  readRAM(address: number): number {
    // Check if RAM is enabled for MBC1
    if (this.mbcType === 0x01 && !this.ramEnabled) {
      return 0xff; // Return 0xFF when RAM is disabled (hardware behavior)
    }

    // Apply RAM banking for MBC1
    let ramAddress = address & 0x1fff; // Mask to 8KB window
    if (this.mbcType === 0x01) {
      ramAddress += this.currentRAMBank * 0x2000; // Add RAM bank offset
    }

    if (ramAddress >= this.ramData.length) {
      return 0xff;
    }
    return this.ramData[ramAddress];
  }

  /**
   * Write to cartridge RAM with banking support
   * Address is relative to cartridge RAM space (0x0000-0x1FFF for 8KB window)
   */
  writeRAM(address: number, value: number): void {
    // Check if RAM is enabled for MBC1
    if (this.mbcType === 0x01 && !this.ramEnabled) {
      return; // Ignore writes when RAM is disabled (hardware behavior)
    }

    // Apply RAM banking for MBC1
    let ramAddress = address & 0x1fff; // Mask to 8KB window
    if (this.mbcType === 0x01) {
      ramAddress += this.currentRAMBank * 0x2000; // Add RAM bank offset
    }

    if (ramAddress < this.ramData.length) {
      this.ramData[ramAddress] = value & 0xff;
    }
  }

  /**
   * Handle MBC register writes for banking control
   * Hardware-accurate MBC1 implementation as single source of truth
   *
   * Reference: Pan Docs MBC1 specification
   * https://gbdev.io/pandocs/MBC1.html
   */
  writeMBCRegister(address: number, value: number): void {
    // Hardware-accurate behavior: writes to ROM space control MBC registers only
    // ROM content itself is immutable - writes do not modify ROM data

    // Handle MBC1 register writes
    if (this.mbcType === 0x01) {
      if (address >= 0x0000 && address <= 0x1fff) {
        // RAM Enable/Disable (0x0000-0x1FFF)
        this.ramEnabled = (value & 0x0f) === 0x0a;
      } else if (address >= 0x2000 && address <= 0x3fff) {
        // ROM Bank Number (0x2000-0x3FFF) - lower 5 bits
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

  /**
   * Get cartridge header information
   * Parses standard Game Boy cartridge header from ROM data
   */
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

  /**
   * Step function for component interface compliance
   * Cartridges don't have timing requirements
   */
  step(_cycles: number): void {
    void _cycles;
    // Cartridges don't need stepping logic
  }

  /**
   * Reset cartridge to hardware default state
   * Preserves ROM data but resets all banking state
   */
  reset(): void {
    // Clear RAM but preserve ROM data
    this.ramData.fill(0x00);

    // Reset MBC1 state to hardware defaults
    this.currentROMBank = 1; // Default ROM bank (bank 0 maps to bank 1)
    this.currentRAMBank = 0; // Default RAM bank
    this.ramEnabled = false; // RAM disabled by default
    this.bankingMode = 0; // Simple banking mode
    this.lowerROMBankBits = 1; // Default lower ROM bank bits
    this.upperBankBits = 0; // Default upper bank bits
  }

  /**
   * Get current cartridge state for debugging
   * Returns copy of internal state without exposing mutable references
   */
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
}
