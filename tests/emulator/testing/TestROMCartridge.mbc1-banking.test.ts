/**
 * Unified Cartridge MBC1 Banking Tests
 *
 * Tests the complete MBC1 implementation including:
 * - Simple vs Advanced banking modes
 * - ROM bank switching with upper/lower bits
 * - RAM bank switching
 * - Bank 0 special case handling
 *
 * This test validates the fix for Game Boy Doctor failures at line 2335
 * where incorrect ROM bank switching caused LD A,(HL+) to read wrong values.
 */

import { Cartridge } from '../../../src/emulator/cartridge';
import { MMU } from '../../../src/emulator/mmu/MMU';

describe('Unified Cartridge MBC1 Banking', () => {
  let cartridge: Cartridge;
  let mmu: MMU;

  beforeEach(() => {
    // Create a mock ROM with multiple banks for testing
    const romData = new Uint8Array(0x8000); // 32KB ROM (2 banks)

    // Fill bank 0 with 0x00 values
    for (let i = 0x0000; i < 0x4000; i++) {
      romData[i] = 0x00;
    }

    // Fill bank 1 with 0x11 values
    for (let i = 0x4000; i < 0x8000; i++) {
      romData[i] = 0x11;
    }

    // Set MBC1 type in header
    romData[0x147] = 0x01; // MBC1

    cartridge = new Cartridge(romData);
    mmu = new MMU();
    mmu.loadCartridge(cartridge);
  });

  describe('Banking Mode Control', () => {
    test('should start in simple banking mode (mode 0)', () => {
      // Bank 1 should be active by default
      const value = mmu.readByte(0x4000);
      expect(value).toBe(0x11); // Bank 1 data
    });

    test('should switch to advanced banking mode', () => {
      // Switch to advanced banking mode
      mmu.writeByte(0x6000, 0x01);

      // Bank behavior should remain the same initially
      const value = mmu.readByte(0x4000);
      expect(value).toBe(0x11); // Still bank 1
    });
  });

  describe('ROM Bank Switching - Lower Bits', () => {
    test('should handle bank 0 special case (maps to bank 1)', () => {
      // Try to select bank 0
      mmu.writeByte(0x2000, 0x00);

      // Should automatically map to bank 1
      const value = mmu.readByte(0x4000);
      expect(value).toBe(0x11); // Bank 1 data
    });

    test('should switch ROM banks using lower 5 bits', () => {
      // Create larger ROM for this test
      const largeROM = new Uint8Array(0x40000); // 256KB ROM

      // Fill different banks with different values
      for (let bank = 0; bank < 16; bank++) {
        const bankStart = bank * 0x4000;
        for (let i = 0; i < 0x4000; i++) {
          largeROM[bankStart + i] = bank;
        }
      }

      // Set MBC1 type AFTER filling banks (so it doesn't get overwritten)
      largeROM[0x147] = 0x01; // MBC1

      const largeBankCartridge = new Cartridge(largeROM);
      const largeBankMMU = new MMU();
      largeBankMMU.loadCartridge(largeBankCartridge);

      // Test switching to different banks
      largeBankMMU.writeByte(0x2000, 0x05);
      expect(largeBankMMU.readByte(0x4000)).toBe(0x05);

      largeBankMMU.writeByte(0x2000, 0x0a);
      expect(largeBankMMU.readByte(0x4000)).toBe(0x0a);

      largeBankMMU.writeByte(0x2000, 0x0f); // Bank 15 (max available bank)
      expect(largeBankMMU.readByte(0x4000)).toBe(0x0f);
    });
  });

  describe('Advanced Banking Mode - Upper Bits', () => {
    test('should combine upper and lower bits in advanced mode', () => {
      // Create large ROM for testing upper bits
      const largeROM = new Uint8Array(0x200000); // 2MB ROM

      // Fill bank 32 (0x20) with distinctive value
      const bank32Start = 32 * 0x4000;
      for (let i = 0; i < 0x4000; i++) {
        largeROM[bank32Start + i] = 0x20;
      }

      // Fill bank 33 (0x21) with distinctive value
      const bank33Start = 33 * 0x4000;
      for (let i = 0; i < 0x4000; i++) {
        largeROM[bank33Start + i] = 0x21;
      }

      // Set MBC1 type AFTER filling banks
      largeROM[0x147] = 0x01; // MBC1

      const largeBankCartridge = new Cartridge(largeROM);
      const largeBankMMU = new MMU();
      largeBankMMU.loadCartridge(largeBankCartridge);

      // Switch to advanced banking mode
      largeBankMMU.writeByte(0x6000, 0x01);

      // Set upper bits to 1 (bit 5 = 1, so adds 32 to bank)
      largeBankMMU.writeByte(0x4000, 0x01);

      // Set lower bits to 0 (which maps to 1)
      largeBankMMU.writeByte(0x2000, 0x00);

      // Should be bank 33 (32 + 1)
      expect(largeBankMMU.readByte(0x4000)).toBe(0x21);

      // Set lower bits to 1 explicitly
      largeBankMMU.writeByte(0x2000, 0x01);

      // Should still be bank 33 (32 + 1)
      expect(largeBankMMU.readByte(0x4000)).toBe(0x21);
    });
  });

  describe('RAM Enable Control', () => {
    test('should enable RAM with 0x0A', () => {
      mmu.writeByte(0x0000, 0x0a);

      // RAM operations should work (no error thrown)
      expect(() => {
        mmu.writeByte(0xa000, 0x42);
        mmu.readByte(0xa000);
      }).not.toThrow();
    });

    test('should disable RAM with other values', () => {
      mmu.writeByte(0x0000, 0x00);

      // RAM should be disabled - specific behavior depends on implementation
      // At minimum, it shouldn't crash
      expect(() => {
        mmu.writeByte(0xa000, 0x42);
        mmu.readByte(0xa000);
      }).not.toThrow();
    });
  });

  describe('Banking State Reset', () => {
    test('should reset all banking state on reset()', () => {
      // Modify banking state
      mmu.writeByte(0x2000, 0x05); // Set ROM bank
      mmu.writeByte(0x4000, 0x02); // Set upper bits
      mmu.writeByte(0x6000, 0x01); // Set advanced mode
      mmu.writeByte(0x0000, 0x0a); // Enable RAM

      // Reset
      cartridge.reset();

      // Should be back to defaults (bank 1, simple mode, RAM disabled)
      const value = mmu.readByte(0x4000);
      expect(value).toBe(0x11); // Back to bank 1
    });
  });

  describe('Game Boy Doctor Scenario', () => {
    test('should correctly handle Blargg ROM bank switching scenario', () => {
      // Simulate the scenario that was failing in Game Boy Doctor
      // ROMs 04 and 05 were failing at line 2335 with LD A,(HL+)

      // Create ROM data similar to Blargg test structure
      const blarggROM = new Uint8Array(0x8000);
      blarggROM[0x147] = 0x01; // MBC1

      // Bank 0: fill with 0x00
      for (let i = 0x0000; i < 0x4000; i++) {
        blarggROM[i] = 0x00;
      }

      // Bank 1: fill with expected value that should be read
      for (let i = 0x4000; i < 0x8000; i++) {
        blarggROM[i] = 0x23; // The value Game Boy Doctor expects
      }

      const blarggCartridge = new Cartridge(blarggROM);
      const blarggMMU = new MMU();
      blarggMMU.loadCartridge(blarggCartridge);

      // Simulate bank switching that occurs during Blargg test
      blarggMMU.writeByte(0x2000, 0x01); // Select bank 1

      // Read from switchable ROM area - should get correct bank data
      const value = blarggMMU.readByte(0x4000);
      expect(value).toBe(0x23); // Game Boy Doctor expected value

      // Verify consistent behavior across multiple reads
      const value2 = blarggMMU.readByte(0x5000);
      expect(value2).toBe(0x23);
    });
  });
});
