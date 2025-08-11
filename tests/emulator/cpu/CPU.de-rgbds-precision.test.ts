/**
 * DE Register RGBDS Precision Test
 *
 * Tests DE register operations against exact RGBDS specification
 * to identify subtle hardware accuracy issues that may cause Blargg test failures.
 *
 * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';
import { CPUTestingComponent } from '../../../src/emulator/types';

describe('DE Register RGBDS Precision Tests', () => {
  let cpu: CPUTestingComponent;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu);
  });

  describe('ADD HL,DE Half-Carry Flag Precision Tests', () => {
    test('ADD HL,DE - test exact bit 11 overflow detection', () => {
      // Test case from RGBDS: half-carry is "Set if overflow from bit 11"
      // This means we need to detect carry from bit 11 to bit 12

      // Case 1: No bit 11 overflow - carry propagates TO bit 11 but not FROM it
      cpu.setRegisterH(0x07);
      cpu.setRegisterL(0xff); // HL = 0x07FF
      cpu.setRegisterD(0x00);
      cpu.setRegisterE(0x01); // DE = 0x0001
      // Expected: 0x07FF + 0x0001 = 0x0800 (carry TO bit 11, but no overflow FROM bit 11)

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x19); // ADD HL,DE

      cpu.step();

      const registers = cpu.getRegisters();
      expect(registers.h).toBe(0x08);
      expect(registers.l).toBe(0x00);
      expect(cpu.getHalfCarryFlag()).toBe(false); // H should be clear (no overflow FROM bit 11)
      expect(cpu.getCarryFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
    });

    test('ADD HL,DE - test no bit 11 overflow', () => {
      // Case 2: No bit 11 overflow should clear H flag
      cpu.setRegisterH(0x07);
      cpu.setRegisterL(0xfe); // HL = 0x07FE
      cpu.setRegisterD(0x00);
      cpu.setRegisterE(0x01); // DE = 0x0001
      // Expected: 0x07FE + 0x0001 = 0x07FF (no bit 11 overflow)

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x19); // ADD HL,DE

      cpu.step();

      const registers = cpu.getRegisters();
      expect(registers.h).toBe(0x07);
      expect(registers.l).toBe(0xff);
      expect(cpu.getHalfCarryFlag()).toBe(false); // H should be clear (no bit 11 overflow)
      expect(cpu.getCarryFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
    });

    test('ADD HL,DE - test multiple bit overflows', () => {
      // Case 3: Multiple lower bits but specifically bit 11 overflow
      cpu.setRegisterH(0x0f);
      cpu.setRegisterL(0xff); // HL = 0x0FFF
      cpu.setRegisterD(0x00);
      cpu.setRegisterE(0x01); // DE = 0x0001
      // Expected: 0x0FFF + 0x0001 = 0x1000 (bit 11 overflow occurred)

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x19); // ADD HL,DE

      cpu.step();

      const registers = cpu.getRegisters();
      expect(registers.h).toBe(0x10);
      expect(registers.l).toBe(0x00);
      expect(cpu.getHalfCarryFlag()).toBe(true); // H should be set due to bit 11 overflow
      expect(cpu.getCarryFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
    });

    test('ADD HL,DE - test edge case with maximum 12-bit value', () => {
      // Case 4: Exact boundary test at 0x0FFF
      cpu.setRegisterH(0x0f);
      cpu.setRegisterL(0xfe); // HL = 0x0FFE
      cpu.setRegisterD(0x00);
      cpu.setRegisterE(0x01); // DE = 0x0001
      // Expected: 0x0FFE + 0x0001 = 0x0FFF (no bit 11 overflow yet)

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x19); // ADD HL,DE

      cpu.step();

      const registers = cpu.getRegisters();
      expect(registers.h).toBe(0x0f);
      expect(registers.l).toBe(0xff);
      expect(cpu.getHalfCarryFlag()).toBe(false); // H should be clear
      expect(cpu.getCarryFlag()).toBe(false);
    });

    test('ADD HL,DE - verify bit 11 vs bit 15 distinction', () => {
      // Case 5: Both bit 15 overflow AND bit 11 overflow occur
      cpu.setRegisterH(0xff);
      cpu.setRegisterL(0x00); // HL = 0xFF00
      cpu.setRegisterD(0x01);
      cpu.setRegisterE(0x00); // DE = 0x0100
      // Expected: 0xFF00 + 0x0100 = 0x10000 -> 0x0000 (both overflows)
      // HL lower 12 bits (0xF00) > result lower 12 bits (0x000) = true

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x19); // ADD HL,DE

      cpu.step();

      const registers = cpu.getRegisters();
      expect(registers.h).toBe(0x00);
      expect(registers.l).toBe(0x00);
      expect(cpu.getHalfCarryFlag()).toBe(true); // H should be set (bit 11 overflow detected)
      expect(cpu.getCarryFlag()).toBe(true); // C should be set (bit 15 overflow)
      expect(cpu.getSubtractFlag()).toBe(false);
    });
  });

  describe('Compare DE vs BC/HL flag behavior', () => {
    test('ADD HL,DE vs ADD HL,BC - identical flag behavior verification', () => {
      // This test ensures DE and BC behave identically for the same operation
      const hlValue = 0x07ff;
      const addValue = 0x0001;

      // Test with BC first
      cpu.setRegisterH((hlValue >> 8) & 0xff);
      cpu.setRegisterL(hlValue & 0xff);
      cpu.setRegisterB((addValue >> 8) & 0xff);
      cpu.setRegisterC(addValue & 0xff);
      cpu.setHalfCarryFlag(false); // Ensure clean state
      cpu.setCarryFlag(false);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x09); // ADD HL,BC
      cpu.step();

      const bcFlags = {
        h: cpu.getHalfCarryFlag(),
        c: cpu.getCarryFlag(),
        n: cpu.getSubtractFlag(),
      };

      // Reset and test with DE
      cpu.setRegisterH((hlValue >> 8) & 0xff);
      cpu.setRegisterL(hlValue & 0xff);
      cpu.setRegisterD((addValue >> 8) & 0xff);
      cpu.setRegisterE(addValue & 0xff);
      cpu.setHalfCarryFlag(false); // Ensure clean state
      cpu.setCarryFlag(false);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x19); // ADD HL,DE
      cpu.step();

      const deFlags = {
        h: cpu.getHalfCarryFlag(),
        c: cpu.getCarryFlag(),
        n: cpu.getSubtractFlag(),
      };

      // Flags should be identical
      expect(deFlags.h).toBe(bcFlags.h);
      expect(deFlags.c).toBe(bcFlags.c);
      expect(deFlags.n).toBe(bcFlags.n);

      // Both should NOT show half-carry for this test case (no bit 11 overflow)
      expect(deFlags.h).toBe(false);
      expect(bcFlags.h).toBe(false);
    });

    test('Multiple ADD HL operations - ensure DE matches BC behavior', () => {
      // Test a sequence that might reveal cumulative errors
      const testCases = [
        { hl: 0x0000, add: 0x0001 }, // No carries
        { hl: 0x07ff, add: 0x0001 }, // Bit 11 carry
        { hl: 0xff00, add: 0x0100 }, // Bit 15 carry only
        { hl: 0x0fff, add: 0x0001 }, // Bit 11 carry
        { hl: 0xffff, add: 0x0001 }, // Both carries
      ];

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];

        // Test with BC
        cpu.setRegisterH((testCase.hl >> 8) & 0xff);
        cpu.setRegisterL(testCase.hl & 0xff);
        cpu.setRegisterB((testCase.add >> 8) & 0xff);
        cpu.setRegisterC(testCase.add & 0xff);
        cpu.setHalfCarryFlag(false);
        cpu.setCarryFlag(false);

        cpu.setProgramCounter(0x8000);
        mmu.writeByte(0x8000, 0x09); // ADD HL,BC
        cpu.step();

        const bcResult = {
          hl: (cpu.getRegisters().h << 8) | cpu.getRegisters().l,
          h: cpu.getHalfCarryFlag(),
          c: cpu.getCarryFlag(),
        };

        // Test with DE
        cpu.setRegisterH((testCase.hl >> 8) & 0xff);
        cpu.setRegisterL(testCase.hl & 0xff);
        cpu.setRegisterD((testCase.add >> 8) & 0xff);
        cpu.setRegisterE(testCase.add & 0xff);
        cpu.setHalfCarryFlag(false);
        cpu.setCarryFlag(false);

        cpu.setProgramCounter(0x8000);
        mmu.writeByte(0x8000, 0x19); // ADD HL,DE
        cpu.step();

        const deResult = {
          hl: (cpu.getRegisters().h << 8) | cpu.getRegisters().l,
          h: cpu.getHalfCarryFlag(),
          c: cpu.getCarryFlag(),
        };

        // Results must be identical
        expect(deResult.hl).toBe(bcResult.hl);
        expect(deResult.h).toBe(bcResult.h);
        expect(deResult.c).toBe(bcResult.c);
      }
    });
  });

  describe('Potential Implementation Bug Detection', () => {
    test('DE register getter/setter consistency check', () => {
      // Test that DE register pair operations are consistent
      cpu.setRegisterD(0x12);
      cpu.setRegisterE(0x34);

      const deValue = (cpu.getRegisters().d << 8) | cpu.getRegisters().e;
      expect(deValue).toBe(0x1234);

      // Test using internal getDE helper (if accessible through operations)
      cpu.setRegisterH(0x00);
      cpu.setRegisterL(0x00); // HL = 0x0000

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x19); // ADD HL,DE
      cpu.step();

      const resultHL = (cpu.getRegisters().h << 8) | cpu.getRegisters().l;
      expect(resultHL).toBe(0x1234); // HL should equal the DE value we set
    });

    test('DE register individual vs pair operations consistency', () => {
      // Set DE using individual register setters
      cpu.setRegisterD(0xab);
      cpu.setRegisterE(0xcd);

      // Use DE in 16-bit operation
      cpu.setRegisterH(0x00);
      cpu.setRegisterL(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x19); // ADD HL,DE
      cpu.step();

      const result = (cpu.getRegisters().h << 8) | cpu.getRegisters().l;
      expect(result).toBe(0xabcd);

      // Verify DE registers are unchanged
      expect(cpu.getRegisters().d).toBe(0xab);
      expect(cpu.getRegisters().e).toBe(0xcd);
    });
  });
});
