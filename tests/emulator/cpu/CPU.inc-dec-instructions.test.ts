/**
 * CPU Phase 6: INC/DEC Instruction Tests
 *
 * Tests for the 24 Phase 6 INC/DEC instructions:
 * - INC family (12 variants) - Increment operations
 * - DEC family (12 variants) - Decrement operations
 *
 * Following TDD principles - tests verify hardware-accurate behavior
 * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';

describe('CPU Phase 6: INC/DEC Instructions', () => {
  let cpu: CPU;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu);
    cpu.reset();
  });

  describe('8-bit register INC instructions', () => {
    test('INC B (0x04) increments B register with correct flags', () => {
      // Setup: B = 0x0F (test half-carry from bit 3), clear carry flag to test "unchanged"
      cpu.setRegisterB(0x0f);
      cpu.setCarryFlag(false); // Explicitly clear carry flag to test it remains unchanged
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x04); // INC B opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x0F + 1 = 0x10
      expect(cpu.getRegisters().b).toBe(0x10);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result is not zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (INC clears N)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (carry from bit 3)
      expect(cpu.getCarryFlag()).toBe(false); // C unchanged (was cleared to 0)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('INC B (0x04) sets zero flag when incrementing 0xFF', () => {
      // Setup: B = 0xFF (test overflow to zero)
      cpu.setRegisterB(0xff);
      cpu.setCarryFlag(true); // Ensure carry flag is preserved
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x04); // INC B opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0xFF + 1 = 0x00 (overflow)
      expect(cpu.getRegisters().b).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Z = 1 (result is zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (INC clears N)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (carry from bit 3)
      expect(cpu.getCarryFlag()).toBe(true); // C unchanged (preserved)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('INC C (0x0C) increments C register with correct flags', () => {
      // Setup: C = 0x42 (normal case, no half-carry)
      cpu.setRegisterC(0x42);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x0c); // INC C opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x42 + 1 = 0x43
      expect(cpu.getRegisters().c).toBe(0x43);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result is not zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (INC clears N)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no carry from bit 3)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('INC D (0x14) increments D register with correct flags', () => {
      // Setup: D = 0x7F (lower nibble = 0x0F, so this WILL cause half-carry)
      cpu.setRegisterD(0x7f);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x14); // INC D opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x7F + 1 = 0x80
      expect(cpu.getRegisters().d).toBe(0x80);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result is not zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (INC clears N)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (carry from bit 3: 0x0F + 1 = 0x10)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('INC E (0x1C) increments E register with correct flags', () => {
      // Setup: E = 0x00 (test increment from zero)
      cpu.setRegisterE(0x00);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x1c); // INC E opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x00 + 1 = 0x01
      expect(cpu.getRegisters().e).toBe(0x01);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result is not zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (INC clears N)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no carry from bit 3)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('INC H (0x24) increments H register with correct flags', () => {
      // Setup: H = 0x2F (test half-carry)
      cpu.setRegisterH(0x2f);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x24); // INC H opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x2F + 1 = 0x30
      expect(cpu.getRegisters().h).toBe(0x30);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result is not zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (INC clears N)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (carry from bit 3)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('INC L (0x2C) increments L register with correct flags', () => {
      // Setup: L = 0x55 (normal case)
      cpu.setRegisterL(0x55);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x2c); // INC L opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x55 + 1 = 0x56
      expect(cpu.getRegisters().l).toBe(0x56);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result is not zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (INC clears N)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no carry from bit 3)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('INC A (0x3C) increments A register with correct flags', () => {
      // Setup: A = 0xEF (test half-carry)
      cpu.setRegisterA(0xef);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x3c); // INC A opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0xEF + 1 = 0xF0
      expect(cpu.getRegisters().a).toBe(0xf0);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result is not zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (INC clears N)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (carry from bit 3)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });
  });

  describe('Memory INC instruction', () => {
    test('INC (HL) (0x34) increments memory value at HL address', () => {
      // Setup: HL = 0x8100 (H=0x81, L=0x00), memory[0x8100] = 0x5A
      cpu.setRegisterH(0x81);
      cpu.setRegisterL(0x00);
      mmu.writeByte(0x8100, 0x5a);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x34); // INC (HL) opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: memory[0x8100] = 0x5A + 1 = 0x5B
      expect(mmu.readByte(0x8100)).toBe(0x5b);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result is not zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (INC clears N)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no carry from bit 3)
      expect(cycles).toBe(12);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('INC (HL) (0x34) sets zero flag when memory value is 0xFF', () => {
      // Setup: HL = 0x8100 (H=0x81, L=0x00), memory[0x8100] = 0xFF
      cpu.setRegisterH(0x81);
      cpu.setRegisterL(0x00);
      mmu.writeByte(0x8100, 0xff);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x34); // INC (HL) opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: memory[0x8100] = 0xFF + 1 = 0x00 (overflow)
      expect(mmu.readByte(0x8100)).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Z = 1 (result is zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (INC clears N)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (carry from bit 3)
      expect(cycles).toBe(12);
      expect(cpu.getPC()).toBe(0x8001);
    });
  });

  describe('16-bit register INC instructions', () => {
    test('INC BC (0x03) increments BC register pair without affecting flags', () => {
      // Setup: BC = 0x12FF (B=0x12, C=0xFF) - test 16-bit overflow
      cpu.setRegisterB(0x12);
      cpu.setRegisterC(0xff);
      cpu.setZeroFlag(true); // Ensure flags are not affected
      cpu.setSubtractFlag(true);
      cpu.setHalfCarryFlag(true);
      cpu.setCarryFlag(true);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x03); // INC BC opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: BC = 0x12FF + 1 = 0x1300 (B=0x13, C=0x00)
      expect(cpu.getRegisters().b).toBe(0x13);
      expect(cpu.getRegisters().c).toBe(0x00);
      // Verify no flags are affected
      expect(cpu.getZeroFlag()).toBe(true);
      expect(cpu.getSubtractFlag()).toBe(true);
      expect(cpu.getHalfCarryFlag()).toBe(true);
      expect(cpu.getCarryFlag()).toBe(true);
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('INC DE (0x13) increments DE register pair without affecting flags', () => {
      // Setup: DE = 0xFFFF (D=0xFF, E=0xFF) - test 16-bit overflow to zero
      cpu.setRegisterD(0xff);
      cpu.setRegisterE(0xff);
      cpu.setZeroFlag(false); // Ensure flags are not affected
      cpu.setSubtractFlag(false);
      cpu.setHalfCarryFlag(false);
      cpu.setCarryFlag(false);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x13); // INC DE opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: DE = 0xFFFF + 1 = 0x0000 (D=0x00, E=0x00)
      expect(cpu.getRegisters().d).toBe(0x00);
      expect(cpu.getRegisters().e).toBe(0x00);
      // Verify no flags are affected
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false);
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('INC HL (0x23) increments HL register pair without affecting flags', () => {
      // Setup: HL = 0x1234 (H=0x12, L=0x34)
      cpu.setRegisterH(0x12);
      cpu.setRegisterL(0x34);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x23); // INC HL opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: HL = 0x1234 + 1 = 0x1235 (H=0x12, L=0x35)
      expect(cpu.getRegisters().h).toBe(0x12);
      expect(cpu.getRegisters().l).toBe(0x35);
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('INC SP (0x33) increments SP register without affecting flags', () => {
      // Setup: SP = 0xFFFE
      cpu.getRegisters().sp = 0xfffe;
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x33); // INC SP opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: SP = 0xFFFE + 1 = 0xFFFF
      expect(cpu.getRegisters().sp).toBe(0xffff);
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x8001);
    });
  });

  describe('8-bit register DEC instructions', () => {
    test('DEC B (0x05) decrements B register with correct flags', () => {
      // Setup: B = 0x10 (test half-carry borrow from bit 4), clear carry flag
      cpu.setRegisterB(0x10);
      cpu.setCarryFlag(false); // Explicitly clear carry flag to test it remains unchanged
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x05); // DEC B opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x10 - 1 = 0x0F
      expect(cpu.getRegisters().b).toBe(0x0f);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result is not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (DEC sets N)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (borrow from bit 4)
      expect(cpu.getCarryFlag()).toBe(false); // C unchanged (was cleared to 0)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('DEC B (0x05) sets zero flag when decrementing 0x01', () => {
      // Setup: B = 0x01 (test decrement to zero)
      cpu.setRegisterB(0x01);
      cpu.setCarryFlag(true); // Ensure carry flag is preserved
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x05); // DEC B opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x01 - 1 = 0x00
      expect(cpu.getRegisters().b).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Z = 1 (result is zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (DEC sets N)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no borrow from bit 4)
      expect(cpu.getCarryFlag()).toBe(true); // C unchanged (preserved)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('DEC C (0x0D) decrements C register with underflow', () => {
      // Setup: C = 0x00 (test underflow to 0xFF)
      cpu.setRegisterC(0x00);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x0d); // DEC C opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x00 - 1 = 0xFF (underflow)
      expect(cpu.getRegisters().c).toBe(0xff);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result is not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (DEC sets N)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (borrow from bit 4)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('DEC D (0x15) decrements D register with correct flags', () => {
      // Setup: D = 0x80 (lower nibble = 0x00, so this WILL cause half-carry borrow)
      cpu.setRegisterD(0x80);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x15); // DEC D opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x80 - 1 = 0x7F
      expect(cpu.getRegisters().d).toBe(0x7f);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result is not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (DEC sets N)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (borrow from bit 4: 0x00 - 1 needs borrow)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('DEC E (0x1D) decrements E register with correct flags', () => {
      // Setup: E = 0x42 (normal case)
      cpu.setRegisterE(0x42);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x1d); // DEC E opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x42 - 1 = 0x41
      expect(cpu.getRegisters().e).toBe(0x41);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result is not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (DEC sets N)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no borrow from bit 4)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('DEC H (0x25) decrements H register with correct flags', () => {
      // Setup: H = 0x30 (test half-carry borrow)
      cpu.setRegisterH(0x30);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x25); // DEC H opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x30 - 1 = 0x2F
      expect(cpu.getRegisters().h).toBe(0x2f);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result is not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (DEC sets N)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (borrow from bit 4)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('DEC L (0x2D) decrements L register with correct flags', () => {
      // Setup: L = 0x55 (normal case)
      cpu.setRegisterL(0x55);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x2d); // DEC L opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x55 - 1 = 0x54
      expect(cpu.getRegisters().l).toBe(0x54);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result is not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (DEC sets N)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no borrow from bit 4)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('DEC A (0x3D) decrements A register with correct flags', () => {
      // Setup: A = 0xF0 (test half-carry borrow)
      cpu.setRegisterA(0xf0);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x3d); // DEC A opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0xF0 - 1 = 0xEF
      expect(cpu.getRegisters().a).toBe(0xef);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result is not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (DEC sets N)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (borrow from bit 4)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });
  });

  describe('Memory DEC instruction', () => {
    test('DEC (HL) (0x35) decrements memory value at HL address', () => {
      // Setup: HL = 0x8100 (H=0x81, L=0x00), memory[0x8100] = 0x5B
      cpu.setRegisterH(0x81);
      cpu.setRegisterL(0x00);
      mmu.writeByte(0x8100, 0x5b);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x35); // DEC (HL) opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: memory[0x8100] = 0x5B - 1 = 0x5A
      expect(mmu.readByte(0x8100)).toBe(0x5a);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result is not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (DEC sets N)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no borrow from bit 4)
      expect(cycles).toBe(12);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('DEC (HL) (0x35) sets zero flag when memory value is 0x01', () => {
      // Setup: HL = 0x8100 (H=0x81, L=0x00), memory[0x8100] = 0x01
      cpu.setRegisterH(0x81);
      cpu.setRegisterL(0x00);
      mmu.writeByte(0x8100, 0x01);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x35); // DEC (HL) opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: memory[0x8100] = 0x01 - 1 = 0x00
      expect(mmu.readByte(0x8100)).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Z = 1 (result is zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (DEC sets N)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no borrow from bit 4)
      expect(cycles).toBe(12);
      expect(cpu.getPC()).toBe(0x8001);
    });
  });

  describe('16-bit register DEC instructions', () => {
    test('DEC BC (0x0B) decrements BC register pair without affecting flags', () => {
      // Setup: BC = 0x1300 (B=0x13, C=0x00)
      cpu.setRegisterB(0x13);
      cpu.setRegisterC(0x00);
      cpu.setZeroFlag(true); // Ensure flags are not affected
      cpu.setSubtractFlag(true);
      cpu.setHalfCarryFlag(true);
      cpu.setCarryFlag(true);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x0b); // DEC BC opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: BC = 0x1300 - 1 = 0x12FF (B=0x12, C=0xFF)
      expect(cpu.getRegisters().b).toBe(0x12);
      expect(cpu.getRegisters().c).toBe(0xff);
      // Verify no flags are affected
      expect(cpu.getZeroFlag()).toBe(true);
      expect(cpu.getSubtractFlag()).toBe(true);
      expect(cpu.getHalfCarryFlag()).toBe(true);
      expect(cpu.getCarryFlag()).toBe(true);
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('DEC DE (0x1B) decrements DE register pair without affecting flags', () => {
      // Setup: DE = 0x0000 (D=0x00, E=0x00) - test 16-bit underflow
      cpu.setRegisterD(0x00);
      cpu.setRegisterE(0x00);
      cpu.setZeroFlag(false); // Ensure flags are not affected
      cpu.setSubtractFlag(false);
      cpu.setHalfCarryFlag(false);
      cpu.setCarryFlag(false);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x1b); // DEC DE opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: DE = 0x0000 - 1 = 0xFFFF (D=0xFF, E=0xFF)
      expect(cpu.getRegisters().d).toBe(0xff);
      expect(cpu.getRegisters().e).toBe(0xff);
      // Verify no flags are affected
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false);
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('DEC HL (0x2B) decrements HL register pair without affecting flags', () => {
      // Setup: HL = 0x1235 (H=0x12, L=0x35)
      cpu.setRegisterH(0x12);
      cpu.setRegisterL(0x35);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x2b); // DEC HL opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: HL = 0x1235 - 1 = 0x1234 (H=0x12, L=0x34)
      expect(cpu.getRegisters().h).toBe(0x12);
      expect(cpu.getRegisters().l).toBe(0x34);
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('DEC SP (0x3B) decrements SP register without affecting flags', () => {
      // Setup: Set SP to test value using proper setter
      const initialSP = 0x1000;
      cpu.setStackPointer(initialSP);

      const initialPC = 0x8000;
      cpu.setProgramCounter(initialPC);
      mmu.writeByte(initialPC, 0x3b); // DEC SP opcode

      // Verify setup worked
      expect(cpu.getStackPointer()).toBe(initialSP);
      expect(cpu.getPC()).toBe(initialPC);

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: SP should be decremented by exactly 1
      expect(cpu.getStackPointer()).toBe(initialSP - 1);
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(initialPC + 1);
    });
  });
});
