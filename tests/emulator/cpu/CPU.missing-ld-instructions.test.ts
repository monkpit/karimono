/**
 * CPU Missing LD Instructions Test
 *
 * Tests for the two missing LD instructions identified by diagnostic:
 * - 0xF8: LD HL,SP+e8
 * - 0xF9: LD SP,HL
 *
 * Following TDD methodology - write failing tests first, then implement.
 */

import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';
import { CPUTestingComponent } from '../../../src/emulator/types';

describe('CPU Missing LD Instructions', () => {
  let cpu: CPUTestingComponent;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu) as CPUTestingComponent;
    cpu.reset();
  });

  describe('LD SP,HL (0xF9)', () => {
    test('should load SP with HL value', () => {
      // Setup: HL = 0x1234, SP = 0x0000
      cpu.setRegisterH(0x12);
      cpu.setRegisterL(0x34);
      cpu.setStackPointer(0x0000);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xf9); // LD SP,HL

      const cycles = cpu.step();

      // Verify: SP should now equal HL (we'll need to implement getStackPointer as public)
      const registers = cpu.getRegisters();
      expect(registers.sp).toBe(0x1234);
      expect(cycles).toBe(8); // Should take 8 cycles

      // Verify: HL should remain unchanged
      expect((registers.h << 8) | registers.l).toBe(0x1234);

      // Verify: No flags should be affected (save original F before operation)
      // Reset and test again to verify flags
      cpu.reset();
      cpu.setRegisterH(0x12);
      cpu.setRegisterL(0x34);
      cpu.setStackPointer(0x0000);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xf9);

      const originalF = cpu.getRegisters().f;
      cpu.step();
      expect(cpu.getRegisters().f).toBe(originalF);
    });

    test('should handle edge cases correctly', () => {
      const testCases = [
        { hl: 0x0000, h: 0x00, l: 0x00, description: 'HL = 0x0000' },
        { hl: 0xffff, h: 0xff, l: 0xff, description: 'HL = 0xFFFF' },
        { hl: 0x8000, h: 0x80, l: 0x00, description: 'HL = 0x8000 (negative in signed 16-bit)' },
        {
          hl: 0x7fff,
          h: 0x7f,
          l: 0xff,
          description: 'HL = 0x7FFF (max positive in signed 16-bit)',
        },
      ];

      testCases.forEach(({ hl, h, l }) => {
        // Reset and setup
        cpu.reset();
        cpu.setRegisterH(h);
        cpu.setRegisterL(l);
        cpu.setStackPointer(0x1000); // Different from HL
        cpu.setProgramCounter(0x8000);
        mmu.writeByte(0x8000, 0xf9);

        const cycles = cpu.step();

        const registers = cpu.getRegisters();
        expect(registers.sp).toBe(hl);
        expect(cycles).toBe(8);
      });
    });
  });

  describe('LD HL,SP+e8 (0xF8)', () => {
    test('should load HL with SP plus positive offset', () => {
      // Setup: SP = 0x1000, offset = +0x10
      cpu.setStackPointer(0x1000);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xf8); // LD HL,SP+e8
      mmu.writeByte(0x8001, 0x10); // Positive offset

      const cycles = cpu.step();

      // Verify: HL = SP + offset = 0x1000 + 0x10 = 0x1010
      const registers = cpu.getRegisters();
      const hl = (registers.h << 8) | registers.l;
      expect(hl).toBe(0x1010);
      expect(cycles).toBe(12); // Should take 12 cycles

      // Verify: SP should remain unchanged
      expect(cpu.getRegisters().sp).toBe(0x1000);

      // Verify: Z and N flags are reset, H and C based on arithmetic
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
    });

    test('should load HL with SP plus negative offset', () => {
      // Setup: SP = 0x1000, offset = -0x10 (0xF0 as signed 8-bit)
      cpu.setStackPointer(0x1000);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xf8);
      mmu.writeByte(0x8001, 0xf0); // -16 as signed 8-bit (0xF0)

      const cycles = cpu.step();

      // Verify: HL = SP + offset = 0x1000 + (-16) = 0x0FF0
      const registers = cpu.getRegisters();
      const hl = (registers.h << 8) | registers.l;
      expect(hl).toBe(0x0ff0);
      expect(cycles).toBe(12);
    });

    test('should correctly calculate half-carry flag', () => {
      // Test case: SP = 0x000F, offset = +1 should set half-carry flag
      cpu.setStackPointer(0x000f);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xf8);
      mmu.writeByte(0x8001, 0x01);

      cpu.step();

      const registers = cpu.getRegisters();
      const hl = (registers.h << 8) | registers.l;
      expect(hl).toBe(0x0010);
      expect(cpu.getHalfCarryFlag()).toBe(true); // Half-carry from bit 3->4
    });

    test('should correctly calculate carry flag', () => {
      // Test case: SP = 0x00FF, offset = +1 should set carry flag
      cpu.setStackPointer(0x00ff);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xf8);
      mmu.writeByte(0x8001, 0x01);

      cpu.step();

      const registers = cpu.getRegisters();
      const hl = (registers.h << 8) | registers.l;
      expect(hl).toBe(0x0100);
      expect(cpu.getCarryFlag()).toBe(true); // Carry from bit 7->8
    });

    test('should handle edge cases with wraparound', () => {
      // Test case: SP = 0xFFFF, offset = +1 should wrap to 0x0000
      cpu.setStackPointer(0xffff);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xf8);
      mmu.writeByte(0x8001, 0x01);

      cpu.step();

      const registers = cpu.getRegisters();
      const hl = (registers.h << 8) | registers.l;
      expect(hl).toBe(0x0000); // Wrapped around
      expect(cpu.getHalfCarryFlag()).toBe(true);
      expect(cpu.getCarryFlag()).toBe(true);
    });

    test('should handle negative offset edge cases', () => {
      // Test case: SP = 0x0000, offset = -1 (0xFF) should wrap to 0xFFFF
      cpu.setStackPointer(0x0000);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xf8);
      mmu.writeByte(0x8001, 0xff); // -1 as signed 8-bit

      cpu.step();

      const registers = cpu.getRegisters();
      const hl = (registers.h << 8) | registers.l;
      expect(hl).toBe(0xffff); // Wrapped around backwards

      // Flag calculation: SP(0x0000) + offset(0xFF) in 8-bit arithmetic
      // SP low: 0x00, offset: 0xFF
      // Half-carry: (0x00 & 0x0F) + (0xFF & 0x0F) = 0x0 + 0xF = 0xF <= 0x0F (no half-carry)
      // Carry: (0x00 & 0xFF) + 0xFF = 0xFF <= 0xFF (no carry in 8-bit arithmetic)
      expect(cpu.getHalfCarryFlag()).toBe(false); // Fixed expectation based on hardware behavior
      expect(cpu.getCarryFlag()).toBe(false); // Fixed expectation based on hardware behavior
    });
  });
});
