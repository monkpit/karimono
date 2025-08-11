/**
 * CPU Phase 1 Instruction Tests
 *
 * Tests for the 94 Phase 1 instructions implemented:
 * - LD family (88 variants) - Load operations
 * - ADD family (4 variants) - Arithmetic addition operations
 * - SUB family (1 variant) - Arithmetic subtraction operations
 * - JMP family (1 variant) - Jump/control flow operations
 *
 * Following TDD principles - tests verify hardware-accurate behavior
 * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';

describe('CPU Phase 1 Instructions', () => {
  let cpu: CPU;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu);
    cpu.reset();
  });

  describe('ADD A,register instructions', () => {
    test('ADD A,D (0x82) performs 8-bit addition with flag calculation', () => {
      // Setup: A = 0x3A, D = 0xC6
      cpu.setRegisterA(0x3a);
      cpu.setRegisterD(0xc6);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x82); // ADD A,D opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x3A + 0xC6 = 0x100 (overflow to 0x00)
      expect(cpu.getRegisters().a).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Z = 1 (result is zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (carry from bit 3)
      expect(cpu.getCarryFlag()).toBe(true); // C = 1 (carry from bit 7)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('ADD A,E (0x83) performs 8-bit addition without overflow', () => {
      // Setup: A = 0x20, E = 0x15
      cpu.setRegisterA(0x20);
      cpu.setRegisterE(0x15);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x83); // ADD A,E opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x20 + 0x15 = 0x35
      expect(cpu.getRegisters().a).toBe(0x35);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no carry from bit 3)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no carry from bit 7)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    // Phase 3 ADD instructions - Following TDD RED phase (tests will fail until implemented)
    test('ADD A,H (0x84) performs 8-bit addition with zero result', () => {
      // Setup: A = 0x10, H = 0xF0 (should result in 0x100 -> 0x00 with carry)
      cpu.setRegisterA(0x10);
      cpu.setRegisterH(0xf0);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x84); // ADD A,H opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x10 + 0xF0 = 0x100 (overflow to 0x00)
      expect(cpu.getRegisters().a).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Z = 1 (result is zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no carry from bit 3: 0x0 + 0x0 = 0x0)
      expect(cpu.getCarryFlag()).toBe(true); // C = 1 (carry from bit 7)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('ADD A,H (0x84) performs 8-bit addition with half-carry flag', () => {
      // Setup: A = 0x0F, H = 0x01 (should cause half-carry from bit 3 to 4)
      cpu.setRegisterA(0x0f);
      cpu.setRegisterH(0x01);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x84); // ADD A,H opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x0F + 0x01 = 0x10
      expect(cpu.getRegisters().a).toBe(0x10);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (carry from bit 3: 0xF + 0x1 > 0xF)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no carry from bit 7)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('ADD A,L (0x85) performs 8-bit addition with normal result', () => {
      // Setup: A = 0x20, L = 0x15
      cpu.setRegisterA(0x20);
      cpu.setRegisterL(0x15);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x85); // ADD A,L opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x20 + 0x15 = 0x35
      expect(cpu.getRegisters().a).toBe(0x35);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no carry from bit 3: 0x0 + 0x5 = 0x5)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no carry from bit 7)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('ADD A,(HL) (0x86) performs 8-bit addition from memory', () => {
      // Setup: A = 0x30, memory at HL = 0x25
      cpu.setRegisterA(0x30);
      cpu.setRegisterH(0x80); // HL = 0x8000
      cpu.setRegisterL(0x00);
      mmu.writeByte(0x8000, 0x25); // Value at HL address
      cpu.setProgramCounter(0x9000);
      mmu.writeByte(0x9000, 0x86); // ADD A,(HL) opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x30 + 0x25 = 0x55
      expect(cpu.getRegisters().a).toBe(0x55);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no carry from bit 3)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no carry from bit 7)
      expect(cycles).toBe(8); // Memory access takes 8 cycles
      expect(cpu.getPC()).toBe(0x9001);
    });

    test('ADD A,A (0x87) performs 8-bit self addition (double A)', () => {
      // Setup: A = 0x40 (should double to 0x80)
      cpu.setRegisterA(0x40);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x87); // ADD A,A opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x40 + 0x40 = 0x80
      expect(cpu.getRegisters().a).toBe(0x80);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no carry from bit 3: 0x0 + 0x0 = 0x0)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no carry from bit 7)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('ADD A,n8 (0xC6) performs 8-bit addition with immediate operand', () => {
      // Setup: A = 0x3C, immediate = 0x12
      cpu.setRegisterA(0x3c);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xc6); // ADD A,n8 opcode
      mmu.writeByte(0x8001, 0x12); // Immediate operand

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x3C + 0x12 = 0x4E
      expect(cpu.getRegisters().a).toBe(0x4e);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no carry from bit 3: 0xC + 0x2 = 0xE)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no carry from bit 7)
      expect(cycles).toBe(8); // Immediate operand access takes 8 cycles
      expect(cpu.getPC()).toBe(0x8002); // PC advances past opcode and operand
    });
  });

  describe('ADC A,register instructions - Phase 3', () => {
    // ADC (Add with Carry) includes the carry flag in the addition
    test('ADC A,B (0x88) performs 8-bit addition with carry flag clear', () => {
      // Setup: A = 0x20, B = 0x15, Carry = 0
      cpu.setRegisterA(0x20);
      cpu.setRegisterB(0x15);
      cpu.setCarryFlag(false); // Carry flag clear
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x88); // ADC A,B opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x20 + 0x15 + 0 = 0x35
      expect(cpu.getRegisters().a).toBe(0x35);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no carry from bit 3)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no carry from bit 7)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('ADC A,B (0x88) performs 8-bit addition with carry flag set', () => {
      // Setup: A = 0x20, B = 0x15, Carry = 1
      cpu.setRegisterA(0x20);
      cpu.setRegisterB(0x15);
      cpu.setCarryFlag(true); // Carry flag set
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x88); // ADC A,B opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x20 + 0x15 + 1 = 0x36
      expect(cpu.getRegisters().a).toBe(0x36);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no carry from bit 3)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no carry from bit 7)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('ADC A,C (0x89) performs 8-bit addition with carry causing overflow', () => {
      // Setup: A = 0xFF, C = 0x00, Carry = 1 (should overflow)
      cpu.setRegisterA(0xff);
      cpu.setRegisterC(0x00);
      cpu.setCarryFlag(true); // Carry flag set
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x89); // ADC A,C opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0xFF + 0x00 + 1 = 0x100 (overflow to 0x00)
      expect(cpu.getRegisters().a).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Z = 1 (result is zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (carry from bit 3: 0xF + 0x0 + 1 > 0xF)
      expect(cpu.getCarryFlag()).toBe(true); // C = 1 (carry from bit 7)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('ADC A,D (0x8A) performs 8-bit addition with half-carry', () => {
      // Setup: A = 0x0F, D = 0x00, Carry = 1 (should cause half-carry)
      cpu.setRegisterA(0x0f);
      cpu.setRegisterD(0x00);
      cpu.setCarryFlag(true); // Carry flag set
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x8a); // ADC A,D opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x0F + 0x00 + 1 = 0x10
      expect(cpu.getRegisters().a).toBe(0x10);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (carry from bit 3: 0xF + 0x0 + 1 > 0xF)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no carry from bit 7)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('ADC A,E (0x8B) performs 8-bit addition with normal result', () => {
      // Setup: A = 0x30, E = 0x25, Carry = 0
      cpu.setRegisterA(0x30);
      cpu.setRegisterE(0x25);
      cpu.setCarryFlag(false); // Carry flag clear
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x8b); // ADC A,E opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x30 + 0x25 + 0 = 0x55
      expect(cpu.getRegisters().a).toBe(0x55);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no carry from bit 3)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no carry from bit 7)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('ADC A,H (0x8C) performs 8-bit addition with carry from H register', () => {
      // Setup: A = 0x80, H = 0x7F, Carry = 1
      cpu.setRegisterA(0x80);
      cpu.setRegisterH(0x7f);
      cpu.setCarryFlag(true); // Carry flag set
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x8c); // ADC A,H opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x80 + 0x7F + 1 = 0x100 (overflow to 0x00)
      expect(cpu.getRegisters().a).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Z = 1 (result is zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (carry from bit 3: 0x0 + 0xF + 1 > 0xF)
      expect(cpu.getCarryFlag()).toBe(true); // C = 1 (carry from bit 7)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('ADC A,L (0x8D) performs 8-bit addition with L register', () => {
      // Setup: A = 0x40, L = 0x30, Carry = 1
      cpu.setRegisterA(0x40);
      cpu.setRegisterL(0x30);
      cpu.setCarryFlag(true); // Carry flag set
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x8d); // ADC A,L opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x40 + 0x30 + 1 = 0x71
      expect(cpu.getRegisters().a).toBe(0x71);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no carry from bit 3: 0x0 + 0x0 + 1 = 0x1)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no carry from bit 7)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('ADC A,(HL) (0x8E) performs 8-bit addition from memory with carry', () => {
      // Setup: A = 0x50, memory at HL = 0x2F, Carry = 1
      cpu.setRegisterA(0x50);
      cpu.setRegisterH(0x80); // HL = 0x8000
      cpu.setRegisterL(0x00);
      mmu.writeByte(0x8000, 0x2f); // Value at HL address
      cpu.setCarryFlag(true); // Carry flag set
      cpu.setProgramCounter(0x9000);
      mmu.writeByte(0x9000, 0x8e); // ADC A,(HL) opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x50 + 0x2F + 1 = 0x80
      expect(cpu.getRegisters().a).toBe(0x80);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (carry from bit 3: 0x0 + 0xF + 1 = 0x10 > 0xF)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no carry from bit 7)
      expect(cycles).toBe(8); // Memory access takes 8 cycles
      expect(cpu.getPC()).toBe(0x9001);
    });

    test('ADC A,A (0x8F) performs 8-bit self addition with carry', () => {
      // Setup: A = 0x7F, Carry = 1 (should double A and add carry)
      cpu.setRegisterA(0x7f);
      cpu.setCarryFlag(true); // Carry flag set
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x8f); // ADC A,A opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x7F + 0x7F + 1 = 0xFF
      expect(cpu.getRegisters().a).toBe(0xff);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (carry from bit 3: 0xF + 0xF + 1 > 0xF)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no carry from bit 7)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('ADC A,n8 (0xCE) performs 8-bit addition with immediate operand and carry', () => {
      // Setup: A = 0x3C, immediate = 0x12, Carry = 1
      cpu.setRegisterA(0x3c);
      cpu.setCarryFlag(true); // Carry flag set
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xce); // ADC A,n8 opcode
      mmu.writeByte(0x8001, 0x12); // Immediate operand

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x3C + 0x12 + 1 = 0x4F
      expect(cpu.getRegisters().a).toBe(0x4f);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no carry from bit 3: 0xC + 0x2 + 1 = 0xF)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no carry from bit 7)
      expect(cycles).toBe(8); // Immediate operand access takes 8 cycles
      expect(cpu.getPC()).toBe(0x8002); // PC advances past opcode and operand
    });
  });

  describe('16-bit ADD instructions - Phase 3', () => {
    // 16-bit ADD instructions preserve Z flag and have special H/C flag calculations
    test('ADD HL,BC (0x09) performs 16-bit addition with normal result', () => {
      // Setup: HL = 0x1000, BC = 0x0500
      cpu.setRegisterH(0x10); // HL = 0x1000
      cpu.setRegisterL(0x00);
      cpu.setRegisterB(0x05); // BC = 0x0500
      cpu.setRegisterC(0x00);
      cpu.setZeroFlag(true); // Should be preserved (not affected by 16-bit ADD)
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x09); // ADD HL,BC opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x1000 + 0x0500 = 0x1500
      expect(cpu.getRegisters().h).toBe(0x15); // HL high byte
      expect(cpu.getRegisters().l).toBe(0x00); // HL low byte
      expect(cpu.getZeroFlag()).toBe(true); // Z preserved (unchanged for 16-bit ADD)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no carry from bit 11)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no carry from bit 15)
      expect(cycles).toBe(8); // 16-bit addition takes 8 cycles
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('ADD HL,BC (0x09) performs 16-bit addition with half-carry', () => {
      // Setup: HL = 0x0FFF, BC = 0x0001 (should cause half-carry from bit 11)
      cpu.setRegisterH(0x0f); // HL = 0x0FFF
      cpu.setRegisterL(0xff);
      cpu.setRegisterB(0x00); // BC = 0x0001
      cpu.setRegisterC(0x01);
      cpu.setZeroFlag(false); // Should be preserved
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x09); // ADD HL,BC opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x0FFF + 0x0001 = 0x1000
      expect(cpu.getRegisters().h).toBe(0x10); // HL high byte
      expect(cpu.getRegisters().l).toBe(0x00); // HL low byte
      expect(cpu.getZeroFlag()).toBe(false); // Z preserved (unchanged)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (carry from bit 11: 0xFFF + 0x001 > 0xFFF)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no carry from bit 15)
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('ADD HL,DE (0x19) performs 16-bit addition with carry', () => {
      // Setup: HL = 0xFFFF, DE = 0x0001 (should cause 16-bit overflow)
      cpu.setRegisterH(0xff); // HL = 0xFFFF
      cpu.setRegisterL(0xff);
      cpu.setRegisterD(0x00); // DE = 0x0001
      cpu.setRegisterE(0x01);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x19); // ADD HL,DE opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0xFFFF + 0x0001 = 0x10000 (overflow to 0x0000)
      expect(cpu.getRegisters().h).toBe(0x00); // HL high byte
      expect(cpu.getRegisters().l).toBe(0x00); // HL low byte
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (carry from bit 11: 0xFFF + 0x001 > 0xFFF)
      expect(cpu.getCarryFlag()).toBe(true); // C = 1 (carry from bit 15: overflow)
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('ADD HL,HL (0x29) performs 16-bit self addition (double HL)', () => {
      // Setup: HL = 0x4000 (should double to 0x8000)
      cpu.setRegisterH(0x40); // HL = 0x4000
      cpu.setRegisterL(0x00);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x29); // ADD HL,HL opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x4000 + 0x4000 = 0x8000
      expect(cpu.getRegisters().h).toBe(0x80); // HL high byte
      expect(cpu.getRegisters().l).toBe(0x00); // HL low byte
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no carry from bit 11)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no carry from bit 15)
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('ADD HL,SP (0x39) performs 16-bit addition with stack pointer', () => {
      // Setup: HL = 0x2000, SP = 0x1000
      cpu.setRegisterH(0x20); // HL = 0x2000
      cpu.setRegisterL(0x00);
      cpu.setStackPointer(0x1000); // SP = 0x1000
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x39); // ADD HL,SP opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x2000 + 0x1000 = 0x3000
      expect(cpu.getRegisters().h).toBe(0x30); // HL high byte
      expect(cpu.getRegisters().l).toBe(0x00); // HL low byte
      expect(cpu.getStackPointer()).toBe(0x1000); // SP unchanged
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no carry from bit 11)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no carry from bit 15)
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('ADD SP,e8 (0xE8) adds positive signed offset to stack pointer', () => {
      // Setup: SP = 0x2000, e8 = +0x10 (positive offset)
      cpu.setStackPointer(0x2000);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xe8); // ADD SP,e8 opcode
      mmu.writeByte(0x8001, 0x10); // e8 = +16 (positive)

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x2000 + 0x10 = 0x2010
      expect(cpu.getStackPointer()).toBe(0x2010);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (always reset)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (always reset)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no carry from bit 3 of lower byte)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no carry from bit 7 of lower byte)
      expect(cycles).toBe(16); // ADD SP,e8 takes 16 cycles
      expect(cpu.getPC()).toBe(0x8002);
    });

    test('ADD SP,e8 (0xE8) adds negative signed offset to stack pointer', () => {
      // Setup: SP = 0x2000, e8 = -0x10 (negative offset)
      cpu.setStackPointer(0x2000);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xe8); // ADD SP,e8 opcode
      mmu.writeByte(0x8001, 0xf0); // e8 = -16 (0xF0 = -16 in signed 8-bit)

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x2000 + (-16) = 0x1FF0
      expect(cpu.getStackPointer()).toBe(0x1ff0);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (always reset)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (always reset)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no carry from bit 3 of lower byte)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no carry from bit 7 of lower byte)
      expect(cycles).toBe(16);
      expect(cpu.getPC()).toBe(0x8002);
    });

    test('ADD SP,e8 (0xE8) sets half-carry flag on lower byte bit 3->4 carry', () => {
      // Setup: SP = 0x100F, e8 = +0x01 (should cause H flag)
      // Lower byte: 0x0F + 0x01 = 0x10 (carry from bit 3 to bit 4)
      cpu.setStackPointer(0x100f);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xe8); // ADD SP,e8 opcode
      mmu.writeByte(0x8001, 0x01); // e8 = +1

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x100F + 0x01 = 0x1010
      expect(cpu.getStackPointer()).toBe(0x1010);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (always reset)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (always reset)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (carry from bit 3: 0x0F + 0x01 > 0x0F)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no carry from bit 7 of lower byte)
      expect(cycles).toBe(16);
      expect(cpu.getPC()).toBe(0x8002);
    });

    test('ADD SP,e8 (0xE8) sets carry flag on lower byte bit 7->8 carry', () => {
      // Setup: SP = 0x10FF, e8 = +0x01 (should cause C flag)
      // Lower byte: 0xFF + 0x01 = 0x100 (carry from bit 7 to bit 8)
      cpu.setStackPointer(0x10ff);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xe8); // ADD SP,e8 opcode
      mmu.writeByte(0x8001, 0x01); // e8 = +1

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x10FF + 0x01 = 0x1100
      expect(cpu.getStackPointer()).toBe(0x1100);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (always reset)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (always reset)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (carry from bit 3: 0xFF + 0x01 > 0x0F)
      expect(cpu.getCarryFlag()).toBe(true); // C = 1 (carry from bit 7: 0xFF + 0x01 > 0xFF)
      expect(cycles).toBe(16);
      expect(cpu.getPC()).toBe(0x8002);
    });

    test('ADD SP,e8 (0xE8) handles maximum positive offset (+127)', () => {
      // Setup: SP = 0x2000, e8 = +127 (0x7F)
      cpu.setStackPointer(0x2000);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xe8); // ADD SP,e8 opcode
      mmu.writeByte(0x8001, 0x7f); // e8 = +127 (maximum positive)

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x2000 + 127 = 0x207F
      expect(cpu.getStackPointer()).toBe(0x207f);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (always reset)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (always reset)
      expect(cycles).toBe(16);
      expect(cpu.getPC()).toBe(0x8002);
    });

    test('ADD SP,e8 (0xE8) handles maximum negative offset (-128)', () => {
      // Setup: SP = 0x2000, e8 = -128 (0x80)
      cpu.setStackPointer(0x2000);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xe8); // ADD SP,e8 opcode
      mmu.writeByte(0x8001, 0x80); // e8 = -128 (0x80 = -128 in signed 8-bit)

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x2000 + (-128) = 0x1F80
      expect(cpu.getStackPointer()).toBe(0x1f80);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (always reset)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (always reset)
      expect(cycles).toBe(16);
      expect(cpu.getPC()).toBe(0x8002);
    });

    test('ADD SP,e8 (0xE8) handles 16-bit stack pointer overflow correctly', () => {
      // Setup: SP = 0xFFFF, e8 = +1 (should overflow to 0x0000)
      cpu.setStackPointer(0xffff);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xe8); // ADD SP,e8 opcode
      mmu.writeByte(0x8001, 0x01); // e8 = +1

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0xFFFF + 1 = 0x0000 (16-bit overflow)
      expect(cpu.getStackPointer()).toBe(0x0000);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (always reset)
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (always reset)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (carry from bit 3: 0xFF + 0x01 > 0x0F)
      expect(cpu.getCarryFlag()).toBe(true); // C = 1 (carry from bit 7: 0xFF + 0x01 > 0xFF)
      expect(cycles).toBe(16);
      expect(cpu.getPC()).toBe(0x8002);
    });
  });

  describe('SUB A,register instructions', () => {
    test('SUB A,B (0x90) performs 8-bit subtraction with borrow', () => {
      // Setup: A = 0x20, B = 0x31 (half-carry should occur)
      cpu.setRegisterA(0x20);
      cpu.setRegisterB(0x31);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x90); // SUB A,B opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x20 - 0x31 = -17 = 0xEF (underflow)
      expect(cpu.getRegisters().a).toBe(0xef);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (subtraction)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (borrow from bit 4: 0 < 1)
      expect(cpu.getCarryFlag()).toBe(true); // C = 1 (borrow occurred)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('SUB A,B (0x90) performs 8-bit subtraction to zero', () => {
      // Setup: A = 0x40, B = 0x40 (equal values)
      cpu.setRegisterA(0x40);
      cpu.setRegisterB(0x40);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x90); // SUB A,B opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x40 - 0x40 = 0x00
      expect(cpu.getRegisters().a).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Z = 1 (result is zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (subtraction)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no borrow from bit 4)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no borrow)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('SUB A,C (0x91) performs 8-bit subtraction from register C', () => {
      // Setup: A = 0x30, C = 0x20 (normal subtraction)
      cpu.setRegisterA(0x30);
      cpu.setRegisterC(0x20);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x91); // SUB A,C opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x30 - 0x20 = 0x10
      expect(cpu.getRegisters().a).toBe(0x10);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (subtraction)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no borrow from bit 4)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no borrow)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('SUB A,D (0x92) performs 8-bit subtraction from register D', () => {
      // Setup: A = 0x15, D = 0x16 (half-carry and carry test)
      cpu.setRegisterA(0x15);
      cpu.setRegisterD(0x16);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x92); // SUB A,D opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x15 - 0x16 = -1 = 0xFF (underflow)
      expect(cpu.getRegisters().a).toBe(0xff);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (subtraction)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (borrow from bit 4: 5 < 6)
      expect(cpu.getCarryFlag()).toBe(true); // C = 1 (borrow occurred)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('SUB A,E (0x93) performs 8-bit subtraction from register E', () => {
      // Setup: A = 0x80, E = 0x10 (normal subtraction, no flags)
      cpu.setRegisterA(0x80);
      cpu.setRegisterE(0x10);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x93); // SUB A,E opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x80 - 0x10 = 0x70
      expect(cpu.getRegisters().a).toBe(0x70);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (subtraction)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no borrow from bit 4)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no borrow)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('SUB A,H (0x94) performs 8-bit subtraction from register H', () => {
      // Setup: A = 0x3C, H = 0x2E (half-carry test)
      cpu.setRegisterA(0x3c);
      cpu.setRegisterH(0x2e);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x94); // SUB A,H opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x3C - 0x2E = 0x0E
      expect(cpu.getRegisters().a).toBe(0x0e);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (subtraction)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (borrow from bit 4: C < E in lower nibbles)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no borrow)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('SUB A,L (0x95) performs 8-bit subtraction from register L', () => {
      // Setup: A = 0x50, L = 0x50 (equal values - result zero)
      cpu.setRegisterA(0x50);
      cpu.setRegisterL(0x50);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x95); // SUB A,L opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x50 - 0x50 = 0x00
      expect(cpu.getRegisters().a).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Z = 1 (result is zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (subtraction)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no borrow from bit 4)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no borrow)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('SUB A,(HL) (0x96) performs 8-bit subtraction from memory', () => {
      // Setup: A = 0x40, memory at HL = 0x30
      cpu.setRegisterA(0x40);
      cpu.setRegisterH(0x80); // HL = 0x8000
      cpu.setRegisterL(0x00);
      mmu.writeByte(0x8000, 0x30); // Value at HL address
      cpu.setProgramCounter(0x9000);
      mmu.writeByte(0x9000, 0x96); // SUB A,(HL) opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x40 - 0x30 = 0x10
      expect(cpu.getRegisters().a).toBe(0x10);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (subtraction)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no borrow from bit 4)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no borrow)
      expect(cycles).toBe(8); // Memory access takes 8 cycles
      expect(cpu.getPC()).toBe(0x9001);
    });

    test('SUB A,A (0x97) performs 8-bit self subtraction (always zero)', () => {
      // Setup: A = 0x42 (any value, result always zero per RGBDS spec)
      cpu.setRegisterA(0x42);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x97); // SUB A,A opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: A - A = 0x00 (always per RGBDS specification)
      expect(cpu.getRegisters().a).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Z = 1 (result always zero per spec)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (subtraction)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no borrow per spec)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no borrow per spec)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('SUB A,n8 (0xD6) performs 8-bit subtraction from immediate value', () => {
      // Setup: A = 0x3E, immediate = 0x0F
      cpu.setRegisterA(0x3e);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xd6); // SUB A,n8 opcode
      mmu.writeByte(0x8001, 0x0f); // Immediate value

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x3E - 0x0F = 0x2F
      expect(cpu.getRegisters().a).toBe(0x2f);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (subtraction)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (borrow from bit 4: E < F in lower nibbles)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no borrow)
      expect(cycles).toBe(8); // Immediate operand takes 8 cycles
      expect(cpu.getPC()).toBe(0x8002);
    });
  });

  describe('SBC A,register instructions', () => {
    test('SBC A,B (0x98) performs 8-bit subtraction with carry from register B', () => {
      // Setup: A = 0x20, B = 0x10, Carry = 1
      cpu.setRegisterA(0x20);
      cpu.setRegisterB(0x10);
      cpu.setCarryFlag(true); // Carry flag set
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x98); // SBC A,B opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x20 - 0x10 - 1 = 0x0F
      expect(cpu.getRegisters().a).toBe(0x0f);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (subtraction)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (borrow from bit 4: (0 - 0 - 1) < 0, RGBDS-compliant)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no borrow)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('SBC A,C (0x99) performs 8-bit subtraction with carry from register C', () => {
      // Setup: A = 0x30, C = 0x31, Carry = 0 (underflow test)
      cpu.setRegisterA(0x30);
      cpu.setRegisterC(0x31);
      cpu.setCarryFlag(false); // Carry flag clear
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x99); // SBC A,C opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x30 - 0x31 - 0 = -1 = 0xFF (underflow)
      expect(cpu.getRegisters().a).toBe(0xff);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (subtraction)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (borrow from bit 4: 0 < 1)
      expect(cpu.getCarryFlag()).toBe(true); // C = 1 (borrow occurred)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('SBC A,D (0x9A) performs 8-bit subtraction with carry from register D', () => {
      // Setup: A = 0x50, D = 0x25, Carry = 1
      cpu.setRegisterA(0x50);
      cpu.setRegisterD(0x25);
      cpu.setCarryFlag(true); // Carry flag set
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x9a); // SBC A,D opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x50 - 0x25 - 1 = 0x2A
      expect(cpu.getRegisters().a).toBe(0x2a);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (subtraction)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (borrow from bit 4: (0 - 5 - 1) < 0, RGBDS-compliant)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no borrow)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('SBC A,E (0x9B) performs 8-bit subtraction with carry from register E', () => {
      // Setup: A = 0x40, E = 0x40, Carry = 1 (should result in negative)
      cpu.setRegisterA(0x40);
      cpu.setRegisterE(0x40);
      cpu.setCarryFlag(true); // Carry flag set
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x9b); // SBC A,E opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x40 - 0x40 - 1 = -1 = 0xFF (underflow)
      expect(cpu.getRegisters().a).toBe(0xff);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (subtraction)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (borrow from bit 4)
      expect(cpu.getCarryFlag()).toBe(true); // C = 1 (borrow occurred)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('SBC A,H (0x9C) performs 8-bit subtraction with carry from register H', () => {
      // Setup: A = 0x80, H = 0x30, Carry = 0
      cpu.setRegisterA(0x80);
      cpu.setRegisterH(0x30);
      cpu.setCarryFlag(false); // Carry flag clear
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x9c); // SBC A,H opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x80 - 0x30 - 0 = 0x50
      expect(cpu.getRegisters().a).toBe(0x50);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (subtraction)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no borrow from bit 4)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no borrow)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('SBC A,L (0x9D) performs 8-bit subtraction with carry from register L', () => {
      // Setup: A = 0x10, L = 0x0F, Carry = 1
      cpu.setRegisterA(0x10);
      cpu.setRegisterL(0x0f);
      cpu.setCarryFlag(true); // Carry flag set
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x9d); // SBC A,L opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x10 - 0x0F - 1 = 0x00
      expect(cpu.getRegisters().a).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Z = 1 (result is zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (subtraction)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (borrow from bit 4: (0 - 15 - 1) < 0, RGBDS-compliant)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no borrow)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('SBC A,(HL) (0x9E) performs 8-bit subtraction with carry from memory', () => {
      // Setup: A = 0x60, memory at HL = 0x20, Carry = 1
      cpu.setRegisterA(0x60);
      cpu.setRegisterH(0x80); // HL = 0x8000
      cpu.setRegisterL(0x00);
      mmu.writeByte(0x8000, 0x20); // Value at HL address
      cpu.setCarryFlag(true); // Carry flag set
      cpu.setProgramCounter(0x9000);
      mmu.writeByte(0x9000, 0x9e); // SBC A,(HL) opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x60 - 0x20 - 1 = 0x3F
      expect(cpu.getRegisters().a).toBe(0x3f);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (subtraction)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no borrow from bit 4: upper nibble 0x20 > 0x10)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no borrow)
      expect(cycles).toBe(8); // Memory access takes 8 cycles
      expect(cpu.getPC()).toBe(0x9001);
    });

    test('SBC A,A (0x9F) performs 8-bit self subtraction with carry', () => {
      // Setup: A = 0x42, Carry = 1 (SBC A,A with carry = 0xFF per RGBDS spec)
      cpu.setRegisterA(0x42);
      cpu.setCarryFlag(true); // Carry flag set
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x9f); // SBC A,A opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: A - A - 1 = 0x00 - 1 = 0xFF (underflow with carry)
      expect(cpu.getRegisters().a).toBe(0xff);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (subtraction)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (borrow from bit 4)
      expect(cpu.getCarryFlag()).toBe(true); // C = 1 (borrow occurred)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('SBC A,A (0x9F) performs 8-bit self subtraction without carry', () => {
      // Setup: A = 0x42, Carry = 0 (SBC A,A without carry = 0x00)
      cpu.setRegisterA(0x42);
      cpu.setCarryFlag(false); // Carry flag clear
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x9f); // SBC A,A opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: A - A - 0 = 0x00
      expect(cpu.getRegisters().a).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Z = 1 (result is zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (subtraction)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no borrow)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no borrow)
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x8001);
    });

    test('SBC A,n8 (0xDE) performs 8-bit subtraction with carry from immediate value', () => {
      // Setup: A = 0x50, immediate = 0x1F, Carry = 1
      cpu.setRegisterA(0x50);
      cpu.setCarryFlag(true); // Carry flag set
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xde); // SBC A,n8 opcode
      mmu.writeByte(0x8001, 0x1f); // Immediate value

      // Execute instruction
      const cycles = cpu.step();

      // Verify result: 0x50 - 0x1F - 1 = 0x30
      expect(cpu.getRegisters().a).toBe(0x30);
      expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
      expect(cpu.getSubtractFlag()).toBe(true); // N = 1 (subtraction)
      expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no borrow from bit 4: upper nibble 0x50 > 0x10)
      expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no borrow)
      expect(cycles).toBe(8); // Immediate operand takes 8 cycles
      expect(cpu.getPC()).toBe(0x8002);
    });
  });

  describe('JP conditional instructions', () => {
    test('JP NZ,a16 (0xC2) jumps when zero flag is clear', () => {
      // Setup: Zero flag clear, target address 0x1234
      cpu.setZeroFlag(false);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xc2); // JP NZ,a16 opcode
      mmu.writeByte(0x8001, 0x34); // Low byte of target address
      mmu.writeByte(0x8002, 0x12); // High byte of target address

      // Execute instruction
      const cycles = cpu.step();

      // Verify jump occurred to 0x1234
      expect(cpu.getPC()).toBe(0x1234);
      expect(cycles).toBe(4); // RGBDS GBZ80: JP taken takes 4 cycles
    });

    test('JP NZ,a16 (0xC2) does not jump when zero flag is set', () => {
      // Setup: Zero flag set, target address 0x1234
      cpu.setZeroFlag(true);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xc2); // JP NZ,a16 opcode
      mmu.writeByte(0x8001, 0x34); // Low byte of target address
      mmu.writeByte(0x8002, 0x12); // High byte of target address

      // Execute instruction
      const cycles = cpu.step();

      // Verify jump did not occur - PC advanced past instruction
      expect(cpu.getPC()).toBe(0x8003);
      expect(cycles).toBe(3); // RGBDS GBZ80: JP not taken takes 3 cycles
    });
  });

  describe('LD 16-bit immediate instructions', () => {
    test('LD BC,n16 (0x01) loads 16-bit immediate into BC register pair', () => {
      // Setup: Load 0x1234 into BC
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x01); // LD BC,n16 opcode
      mmu.writeByte(0x8001, 0x34); // Low byte (little-endian)
      mmu.writeByte(0x8002, 0x12); // High byte

      // Execute instruction
      const cycles = cpu.step();

      // Verify BC = 0x1234
      const registers = cpu.getRegisters();
      expect(registers.b).toBe(0x12); // High byte
      expect(registers.c).toBe(0x34); // Low byte
      expect(cycles).toBe(12);
      expect(cpu.getPC()).toBe(0x8003);
    });
  });

  describe('LD memory instructions', () => {
    test('LD (BC),A (0x02) stores A register into memory pointed by BC', () => {
      // Setup: A = 0x42, BC = 0x9000
      cpu.setRegisterA(0x42);
      cpu.setRegisterB(0x90);
      cpu.setRegisterC(0x00);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x02); // LD (BC),A opcode

      // Execute instruction
      const cycles = cpu.step();

      // Verify A was stored at address 0x9000
      expect(mmu.readByte(0x9000)).toBe(0x42);
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x8001);
    });
  });

  describe('Integration with existing instructions', () => {
    test('Phase 1 instructions integrate correctly with existing CPU state', () => {
      // Test sequence: Load values, perform operations, verify results

      // 1. LD BC,0x1234
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x01); // LD BC,n16
      mmu.writeByte(0x8001, 0x34);
      mmu.writeByte(0x8002, 0x12);
      cpu.step();

      // 2. Set A = 0x10, D = 0x05
      cpu.setRegisterA(0x10);
      cpu.setRegisterD(0x05);

      // 3. ADD A,D
      mmu.writeByte(0x8003, 0x82); // ADD A,D
      cpu.step();

      // 4. Verify A = 0x15
      expect(cpu.getRegisters().a).toBe(0x15);

      // 5. SUB A,B (B = 0x12 from step 1)
      mmu.writeByte(0x8004, 0x90); // SUB A,B
      cpu.step();

      // 6. Verify A = 0x15 - 0x12 = 0x03
      expect(cpu.getRegisters().a).toBe(0x03);
      expect(cpu.getZeroFlag()).toBe(false);
    });
  });

  describe('Hardware timing verification', () => {
    test('Phase 1 instructions return correct cycle counts', () => {
      const testCases = [
        { opcode: 0x01, setup: [0x34, 0x12], expectedCycles: 12 }, // LD BC,n16
        { opcode: 0x02, setup: [], expectedCycles: 8 }, // LD (BC),A
        { opcode: 0x82, setup: [], expectedCycles: 4 }, // ADD A,D
        { opcode: 0x83, setup: [], expectedCycles: 4 }, // ADD A,E
        { opcode: 0x90, setup: [], expectedCycles: 4 }, // SUB A,B
        { opcode: 0xc2, setup: [0x00, 0x80], expectedCycles: 3 }, // JP NZ,a16 (Z flag set after reset, so condition false) - RGBDS GBZ80: 3 cycles when not taken
      ];

      testCases.forEach(({ opcode, setup, expectedCycles }) => {
        cpu.reset();
        cpu.setProgramCounter(0x8000);
        mmu.writeByte(0x8000, opcode);

        // Write any immediate operands
        setup.forEach((byte, offset) => {
          mmu.writeByte(0x8001 + offset, byte);
        });

        const cycles = cpu.step();
        expect(cycles).toBe(expectedCycles);
      });
    });
  });
});
