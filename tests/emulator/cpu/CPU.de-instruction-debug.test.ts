/**
 * DE Instruction Debug Test Suite
 *
 * Specifically targets DE register instructions to identify the root cause
 * of "DE Failed" in Blargg's 04-op r,imm test ROM.
 *
 * Focus on suspected instructions:
 * - ADD HL,DE (0x19) - Complex flag calculation
 * - LD A,(DE) (0x1A) - Memory access using DE as pointer
 * - LD (DE),A (0x12) - Memory write using DE as pointer
 * - INC DE (0x13) - 16-bit increment of DE pair
 * - DEC DE (0x1B) - 16-bit decrement of DE pair
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';
import { CPUTestingComponent } from '../../../src/emulator/types';

describe('DE Register Instruction Debug Tests', () => {
  let cpu: CPUTestingComponent;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu);
  });

  describe('ADD HL,DE (0x19) - Flag Calculation Analysis', () => {
    test('ADD HL,DE - no carry, no half-carry', () => {
      // Test case: Simple addition without carries
      cpu.setRegisterH(0x10);
      cpu.setRegisterL(0x20);
      cpu.setRegisterD(0x01);
      cpu.setRegisterE(0x30);

      // Set up instruction and execute
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x19); // ADD HL,DE

      const cycles = cpu.step();

      const registers = cpu.getRegisters();
      expect(registers.h).toBe(0x11); // HL = 0x1020 + 0x0130 = 0x1150
      expect(registers.l).toBe(0x50);
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0
      expect(cpu.getHalfCarryFlag()).toBe(false); // No half-carry
      expect(cpu.getCarryFlag()).toBe(false); // No carry
      expect(cycles).toBe(8);
    });

    test('ADD HL,DE - with half-carry, no carry', () => {
      // Test case: Half-carry from bit 11->12
      cpu.setRegisterH(0x0f);
      cpu.setRegisterL(0xff);
      cpu.setRegisterD(0x00);
      cpu.setRegisterE(0x01);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x19); // ADD HL,DE

      const cycles = cpu.step();

      const registers = cpu.getRegisters();
      expect(registers.h).toBe(0x10); // HL = 0x0FFF + 0x0001 = 0x1000
      expect(registers.l).toBe(0x00);
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0
      expect(cpu.getHalfCarryFlag()).toBe(true); // Half-carry occurred
      expect(cpu.getCarryFlag()).toBe(false); // No full carry
      expect(cycles).toBe(8);
    });

    test('ADD HL,DE - with carry, no half-carry', () => {
      // Test case: Full carry from 16-bit overflow
      cpu.setRegisterH(0xff);
      cpu.setRegisterL(0x00);
      cpu.setRegisterD(0x01);
      cpu.setRegisterE(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x19); // ADD HL,DE

      const cycles = cpu.step();

      const registers = cpu.getRegisters();
      expect(registers.h).toBe(0x00); // HL = 0xFF00 + 0x0100 = 0x10000 -> 0x0000
      expect(registers.l).toBe(0x00);
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0
      expect(cpu.getHalfCarryFlag()).toBe(false); // No half-carry
      expect(cpu.getCarryFlag()).toBe(true); // Full carry occurred
      expect(cycles).toBe(8);
    });

    test('ADD HL,DE - with both carries', () => {
      // Test case: Both half-carry and full carry
      cpu.setRegisterH(0xff);
      cpu.setRegisterL(0xff);
      cpu.setRegisterD(0x00);
      cpu.setRegisterE(0x01);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x19); // ADD HL,DE

      const cycles = cpu.step();

      const registers = cpu.getRegisters();
      expect(registers.h).toBe(0x00); // HL = 0xFFFF + 0x0001 = 0x10000 -> 0x0000
      expect(registers.l).toBe(0x00);
      expect(cpu.getSubtractFlag()).toBe(false); // N = 0
      expect(cpu.getHalfCarryFlag()).toBe(true); // Half-carry occurred
      expect(cpu.getCarryFlag()).toBe(true); // Full carry occurred
      expect(cycles).toBe(8);
    });
  });

  describe('Memory Access Instructions with DE', () => {
    test('LD (DE),A (0x12) - store A to memory at DE address', () => {
      // Test storing A into memory pointed by DE
      cpu.setRegisterD(0xc0);
      cpu.setRegisterE(0x00);
      cpu.setRegisterA(0x42);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x12); // LD (DE),A

      const cycles = cpu.step();

      expect(mmu.readByte(0xc000)).toBe(0x42); // A stored at DE address
      expect(cycles).toBe(8);
    });

    test('LD A,(DE) (0x1A) - load A from memory at DE address', () => {
      // Test loading A from memory pointed by DE
      mmu.writeByte(0xd100, 0x73); // Set up test data in memory
      cpu.setRegisterD(0xd1);
      cpu.setRegisterE(0x00);
      cpu.setRegisterA(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x1a); // LD A,(DE)

      const cycles = cpu.step();

      const registers = cpu.getRegisters();
      expect(registers.a).toBe(0x73); // A loaded from DE address
      expect(registers.d).toBe(0xd1); // DE unchanged
      expect(registers.e).toBe(0x00);
      expect(cycles).toBe(8);
    });
  });

  describe('16-bit DE Register Operations', () => {
    test('INC DE (0x13) - increment DE register pair', () => {
      cpu.setRegisterD(0x12);
      cpu.setRegisterE(0x34);
      cpu.setZeroFlag(true); // Set flags to verify they're not affected
      cpu.setCarryFlag(true);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x13); // INC DE

      const cycles = cpu.step();

      const registers = cpu.getRegisters();
      expect(registers.d).toBe(0x12); // DE = 0x1234 + 1 = 0x1235
      expect(registers.e).toBe(0x35);
      // Verify flags unchanged by 16-bit INC
      expect(cpu.getZeroFlag()).toBe(true);
      expect(cpu.getCarryFlag()).toBe(true);
      expect(cycles).toBe(8);
    });

    test('INC DE (0x13) - overflow test from 0xFFFF to 0x0000', () => {
      cpu.setRegisterD(0xff);
      cpu.setRegisterE(0xff);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x13); // INC DE

      const cycles = cpu.step();

      const registers = cpu.getRegisters();
      expect(registers.d).toBe(0x00); // DE = 0xFFFF + 1 = 0x0000
      expect(registers.e).toBe(0x00);
      expect(cycles).toBe(8);
    });

    test('DEC DE (0x1B) - decrement DE register pair', () => {
      cpu.setRegisterD(0x12);
      cpu.setRegisterE(0x35);
      cpu.setZeroFlag(true); // Set flags to verify they're not affected
      cpu.setCarryFlag(true);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x1b); // DEC DE

      const cycles = cpu.step();

      const registers = cpu.getRegisters();
      expect(registers.d).toBe(0x12); // DE = 0x1235 - 1 = 0x1234
      expect(registers.e).toBe(0x34);
      // Verify flags unchanged by 16-bit DEC
      expect(cpu.getZeroFlag()).toBe(true);
      expect(cpu.getCarryFlag()).toBe(true);
      expect(cycles).toBe(8);
    });

    test('DEC DE (0x1B) - underflow test from 0x0000 to 0xFFFF', () => {
      cpu.setRegisterD(0x00);
      cpu.setRegisterE(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x1b); // DEC DE

      const cycles = cpu.step();

      const registers = cpu.getRegisters();
      expect(registers.d).toBe(0xff); // DE = 0x0000 - 1 = 0xFFFF
      expect(registers.e).toBe(0xff);
      expect(cycles).toBe(8);
    });
  });

  describe('Cross-Register Verification - Compare DE vs BC behavior', () => {
    test('ADD HL,DE vs ADD HL,BC - same flag calculation logic', () => {
      // Test same addition with BC to verify DE-specific issue
      const hlValue = 0x0fff;
      const addValue = 0x0001;

      // Test with BC first
      cpu.setRegisterH((hlValue >> 8) & 0xff);
      cpu.setRegisterL(hlValue & 0xff);
      cpu.setRegisterB((addValue >> 8) & 0xff);
      cpu.setRegisterC(addValue & 0xff);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x09); // ADD HL,BC

      cpu.step();

      const bcResult = {
        h: cpu.getRegisters().h,
        l: cpu.getRegisters().l,
        halfCarry: cpu.getHalfCarryFlag(),
        carry: cpu.getCarryFlag(),
      };

      // Reset and test with DE
      cpu.setRegisterH((hlValue >> 8) & 0xff);
      cpu.setRegisterL(hlValue & 0xff);
      cpu.setRegisterD((addValue >> 8) & 0xff);
      cpu.setRegisterE(addValue & 0xff);
      cpu.setHalfCarryFlag(false); // Reset flags
      cpu.setCarryFlag(false);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x19); // ADD HL,DE

      cpu.step();

      const deResult = {
        h: cpu.getRegisters().h,
        l: cpu.getRegisters().l,
        halfCarry: cpu.getHalfCarryFlag(),
        carry: cpu.getCarryFlag(),
      };

      // Results should be identical
      expect(deResult.h).toBe(bcResult.h);
      expect(deResult.l).toBe(bcResult.l);
      expect(deResult.halfCarry).toBe(bcResult.halfCarry);
      expect(deResult.carry).toBe(bcResult.carry);
    });

    test('INC DE vs INC BC - same operation logic', () => {
      const testValue = 0x1234;

      // Test with BC
      cpu.setRegisterB((testValue >> 8) & 0xff);
      cpu.setRegisterC(testValue & 0xff);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x03); // INC BC

      cpu.step();

      const bcResult = (cpu.getRegisters().b << 8) | cpu.getRegisters().c;

      // Test with DE
      cpu.setRegisterD((testValue >> 8) & 0xff);
      cpu.setRegisterE(testValue & 0xff);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x13); // INC DE

      cpu.step();

      const deResult = (cpu.getRegisters().d << 8) | cpu.getRegisters().e;

      expect(deResult).toBe(bcResult); // Should both be 0x1235
    });
  });
});
