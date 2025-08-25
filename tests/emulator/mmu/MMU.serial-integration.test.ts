/**
 * MMU Serial Interface Integration Tests
 *
 * Tests the integration between MMU and Serial Interface components
 * following TDD principles and hardware accuracy requirements
 */

import { MMU } from '../../../src/emulator/mmu/MMU';
import { SerialInterface } from '../../../src/emulator/mmu/SerialInterface';

describe('MMU Serial Interface Integration', () => {
  let mmu: MMU;
  let serialInterface: SerialInterface;

  beforeEach(() => {
    mmu = new MMU();
    serialInterface = new SerialInterface();
    mmu.setSerialInterface(serialInterface);
  });

  describe('Serial Register Delegation', () => {
    test('MMU should delegate Serial Data Register (0xFF01) reads to Serial Interface', () => {
      // Write directly to serial interface
      serialInterface.writeSB(0x42);

      // Read through MMU should return the same value
      expect(mmu.readByte(0xff01)).toBe(0x42);
    });

    test('MMU should delegate Serial Data Register (0xFF01) writes to Serial Interface', () => {
      // Write through MMU
      mmu.writeByte(0xff01, 0x55);

      // Read directly from serial interface should return the same value
      expect(serialInterface.readSB()).toBe(0x55);
    });

    test('MMU should delegate Serial Control Register (0xFF02) reads to Serial Interface', () => {
      // Write directly to serial interface
      serialInterface.writeSC(0x81);

      // Read through MMU should return the same value
      expect(mmu.readByte(0xff02)).toBe(0x81);
    });

    test('MMU should delegate Serial Control Register (0xFF02) writes to Serial Interface', () => {
      // Write through MMU
      mmu.writeByte(0xff02, 0x81);

      // Read directly from serial interface should return the same value
      expect(serialInterface.readSC()).toBe(0x81);
    });
  });

  describe('Transfer State Through MMU', () => {
    test('Serial transfer state should be accessible through MMU register writes', () => {
      // Start transfer through MMU
      mmu.writeByte(0xff01, 0xaa); // Set data
      mmu.writeByte(0xff02, 0x81); // Start transfer

      // Verify transfer is active
      expect(serialInterface.isTransferActive()).toBe(true);

      // Complete transfer
      serialInterface.step(4096);

      // Verify transfer completed
      expect(serialInterface.isTransferActive()).toBe(false);
      expect(mmu.readByte(0xff02) & 0x80).toBe(0x00); // Busy bit cleared
    });

    test('Serial output buffer should capture data sent through MMU', () => {
      const testString = 'Test';

      for (let i = 0; i < testString.length; i++) {
        mmu.writeByte(0xff01, testString.charCodeAt(i));
        mmu.writeByte(0xff02, 0x81);
        serialInterface.step(4096); // Complete transfer
      }

      expect(serialInterface.getOutputBuffer()).toBe(testString);
    });
  });

  describe('Fallback Behavior Without Serial Interface', () => {
    test('MMU without Serial Interface should fall back to I/O register storage', () => {
      // Create MMU without Serial Interface
      const standaloneMMU = new MMU();

      // Write to serial registers
      standaloneMMU.writeByte(0xff01, 0x42);
      standaloneMMU.writeByte(0xff02, 0x81);

      // Should read back written values (stored in I/O registers)
      expect(standaloneMMU.readByte(0xff01)).toBe(0x42);
      expect(standaloneMMU.readByte(0xff02)).toBe(0x81);
    });
  });

  describe('Word Access Through MMU', () => {
    test('Serial registers should be accessible via 16-bit word operations', () => {
      // Write 16-bit word (little-endian: 0xFF01 = 0x34, 0xFF02 = 0x12)
      mmu.writeWord(0xff01, 0x1234);

      // Verify individual byte reads
      expect(mmu.readByte(0xff01)).toBe(0x34); // Low byte
      expect(mmu.readByte(0xff02)).toBe(0x12); // High byte

      // Verify word read
      expect(mmu.readWord(0xff01)).toBe(0x1234);
    });
  });

  describe('Reset Behavior', () => {
    test('MMU reset should preserve Serial Interface wiring', () => {
      // Setup serial interface state
      mmu.writeByte(0xff01, 0x42);
      mmu.writeByte(0xff02, 0x81);
      serialInterface.step(4096);

      expect(serialInterface.getOutputBuffer().length).toBeGreaterThan(0);

      // Reset MMU
      mmu.reset();

      // Serial Interface should still be wired and functional
      mmu.writeByte(0xff01, 0x55);
      expect(serialInterface.readSB()).toBe(0x55);

      // But previous state should be cleared by MMU's reset
      // Note: Serial Interface reset is handled separately in EmulatorContainer
    });
  });

  describe('Post-Boot State Integration', () => {
    test('Post-boot state should not interfere with Serial Interface delegation', () => {
      // Set post-boot state
      mmu.setPostBootState();

      // Serial Interface should still work through MMU
      mmu.writeByte(0xff01, 0x99);
      mmu.writeByte(0xff02, 0x81);

      expect(serialInterface.readSB()).toBe(0x99);
      expect(serialInterface.isTransferActive()).toBe(true);
    });
  });
});
