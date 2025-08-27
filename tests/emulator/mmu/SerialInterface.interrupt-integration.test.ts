/**
 * Serial Interface Interrupt Integration Tests
 *
 * Tests the complete interrupt flow from SerialInterface to MMU to IF register
 * to identify why Blargg test ROMs are timing out after serial communication
 */

import { MMU } from '../../../src/emulator/mmu/MMU';
import { SerialInterface } from '../../../src/emulator/mmu/SerialInterface';

describe('Serial Interface Interrupt Integration', () => {
  let mmu: MMU;
  let serialInterface: SerialInterface;

  beforeEach(() => {
    mmu = new MMU();
    // Create SerialInterface with interrupt callback that talks to MMU
    serialInterface = new SerialInterface(false, (interrupt: number) => {
      mmu.requestInterrupt(interrupt);
    });
    mmu.setSerialInterface(serialInterface);
  });

  describe('Complete Interrupt Flow', () => {
    test('serial transfer completion should set IF register bit 3', () => {
      // Initial state: IF register should be 0
      expect(mmu.readByte(0xff0f)).toBe(0x00);

      // Start serial transfer
      serialInterface.writeSB(0x41); // 'A'
      serialInterface.writeSC(0x81); // Start transfer
      expect(serialInterface.isTransferActive()).toBe(true);

      // Complete transfer - this should trigger interrupt
      serialInterface.step(4096);

      // Verify transfer completed
      expect(serialInterface.isTransferActive()).toBe(false);
      expect(serialInterface.getOutputBuffer()).toBe('A');

      // CRITICAL TEST: IF register bit 3 should now be set
      const ifRegister = mmu.readByte(0xff0f);
      expect(ifRegister & 0x08).toBe(0x08); // Bit 3 set for serial interrupt
    });

    test('multiple serial transfers should accumulate interrupt flags correctly', () => {
      // Start first transfer
      serialInterface.writeSB(0x41); // 'A'
      serialInterface.writeSC(0x81);
      serialInterface.step(4096);

      // Check IF after first transfer
      let ifRegister = mmu.readByte(0xff0f);
      expect(ifRegister & 0x08).toBe(0x08); // Serial interrupt bit set

      // Start second transfer without clearing IF
      serialInterface.writeSB(0x42); // 'B'
      serialInterface.writeSC(0x81);
      serialInterface.step(4096);

      // IF register should still have serial interrupt bit set
      ifRegister = mmu.readByte(0xff0f);
      expect(ifRegister & 0x08).toBe(0x08); // Still set

      expect(serialInterface.getOutputBuffer()).toBe('AB');
    });

    test('IF register can be cleared and set again', () => {
      // Complete a transfer to set interrupt
      serialInterface.writeSB(0x41);
      serialInterface.writeSC(0x81);
      serialInterface.step(4096);

      // Verify interrupt is set
      expect(mmu.readByte(0xff0f) & 0x08).toBe(0x08);

      // Clear IF register (simulate interrupt handler)
      mmu.writeByte(0xff0f, 0x00);
      expect(mmu.readByte(0xff0f)).toBe(0x00);

      // Do another transfer
      serialInterface.writeSB(0x42);
      serialInterface.writeSC(0x81);
      serialInterface.step(4096);

      // Should set interrupt flag again
      expect(mmu.readByte(0xff0f) & 0x08).toBe(0x08);
    });
  });

  describe('Timing Verification', () => {
    test('interrupt flag is set immediately upon transfer completion', () => {
      serialInterface.writeSB(0x54); // 'T'
      serialInterface.writeSC(0x81);

      // Step just before completion
      serialInterface.step(4095);
      expect(mmu.readByte(0xff0f) & 0x08).toBe(0x00); // Not set yet

      // Complete transfer with one more cycle
      serialInterface.step(1);
      expect(mmu.readByte(0xff0f) & 0x08).toBe(0x08); // Now set
    });

    test('interrupt flag timing matches transfer completion exactly', () => {
      // This test verifies that there's no timing gap between
      // transfer completion and interrupt flag setting
      serialInterface.writeSB(0x45); // 'E'
      serialInterface.writeSC(0x81);

      // Check multiple points during transfer
      for (let i = 1000; i < 4096; i += 1000) {
        serialInterface.step(1000);
        expect(mmu.readByte(0xff0f) & 0x08).toBe(0x00); // Should not be set during transfer
      }

      // Complete final cycles
      serialInterface.step(96); // Total: 4096
      expect(mmu.readByte(0xff0f) & 0x08).toBe(0x08); // Should be set immediately
    });
  });

  describe('MMU Word Access Integration', () => {
    test('IF register accessible via word operations after interrupt', () => {
      // Complete transfer to set interrupt
      serialInterface.writeSB(0x57); // 'W'
      serialInterface.writeSC(0x81);
      serialInterface.step(4096);

      // Read IF register via word access
      const wordValue = mmu.readWord(0xff0e); // Reads 0xFF0E and 0xFF0F
      expect(wordValue & 0x0800).toBe(0x0800); // Bit 11 in word (bit 3 of high byte)
    });
  });

  describe('Post-Boot State Integration', () => {
    test('interrupt system works after MMU post-boot state', () => {
      mmu.setPostBootState();

      // Complete transfer
      serialInterface.writeSB(0x50); // 'P'
      serialInterface.writeSC(0x81);
      serialInterface.step(4096);

      // Should still set interrupt flag
      expect(mmu.readByte(0xff0f) & 0x08).toBe(0x08);
    });
  });
});
