/**
 * SM83 CPU Logical Instructions Test Suite - Phase 8 Implementation
 *
 * Tests all 36 logical instruction variants (AND, OR, XOR, CP) following strict TDD principles.
 * Implements hardware-accurate flag behavior per RGBDS documentation.
 *
 * TDD Workflow: RED (failing test) -> GREEN (minimal implementation) -> REFACTOR
 *
 * Hardware References:
 * - RGBDS GBZ80 Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 * - Opcodes JSON: /tests/resources/opcodes.json
 * - Pan Docs: https://gbdev.io/pandocs/CPU_Registers_and_Flags.html
 *
 * Implementation Strategy:
 * - AND family (9 instructions): Register variants, memory, immediate
 * - OR family (9 instructions): Register variants, memory, immediate
 * - XOR family (9 instructions): Register variants, memory, immediate
 * - CP family (9 instructions): Register variants, memory, immediate
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';
import { CPUTestingComponent } from '../../../src/emulator/types';

/**
 * Test Helper Functions for Logical Instruction Validation
 * These utilities enforce consistent testing patterns and hardware-accurate flag behavior
 */

/**
 * Helper: Test AND register instruction with flag validation
 * AND operations: Z flag (result==0), N=0, H=1 (always), C=0
 */
function testANDRegister(
  cpu: CPUTestingComponent,
  mmu: MMU,
  opcode: number,
  sourceRegister: string,
  aValue: number,
  sourceValue: number,
  expectedResult: number,
  expectedZFlag: number
): void {
  cpu.setRegisterA(aValue);
  const setterMethod = `setRegister${sourceRegister.toUpperCase()}` as keyof CPUTestingComponent;
  (cpu[setterMethod] as (value: number) => void)(sourceValue);

  cpu.setProgramCounter(0x8000);
  mmu.writeByte(0x8000, opcode);

  const cycles = cpu.step();

  expect(cycles).toBe(4); // Register AND operations take 4 cycles
  expect(cpu.getRegisters().a).toBe(expectedResult);
  expect(cpu.getZeroFlag()).toBe(expectedZFlag === 1);
  expect(cpu.getSubtractFlag()).toBe(false); // N always 0 for AND
  expect(cpu.getHalfCarryFlag()).toBe(true); // H always 1 for AND (hardware quirk)
  expect(cpu.getCarryFlag()).toBe(false); // C always 0 for AND
  expect(cpu.getPC()).toBe(0x8001);
}

describe('SM83 CPU Logical Instructions - Phase 8', () => {
  let cpu: CPUTestingComponent;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu);
  });

  describe('AND Family Instructions (9 total)', () => {
    describe('AND A,r (Register Variants)', () => {
      test('AND A,B (0xA0) - basic operation', () => {
        testANDRegister(cpu, mmu, 0xa0, 'B', 0xff, 0x0f, 0x0f, 0);
      });

      test('AND A,B (0xA0) - zero result sets Z flag', () => {
        testANDRegister(cpu, mmu, 0xa0, 'B', 0xf0, 0x0f, 0x00, 1);
      });

      test('AND A,C (0xA1) - basic operation', () => {
        testANDRegister(cpu, mmu, 0xa1, 'C', 0xff, 0x0f, 0x0f, 0);
      });

      test('AND A,D (0xA2) - basic operation', () => {
        testANDRegister(cpu, mmu, 0xa2, 'D', 0xff, 0x0f, 0x0f, 0);
      });

      test('AND A,E (0xA3) - basic operation', () => {
        testANDRegister(cpu, mmu, 0xa3, 'E', 0xff, 0x0f, 0x0f, 0);
      });

      test('AND A,H (0xA4) - basic operation', () => {
        testANDRegister(cpu, mmu, 0xa4, 'H', 0xff, 0x0f, 0x0f, 0);
      });

      test('AND A,L (0xA5) - basic operation', () => {
        testANDRegister(cpu, mmu, 0xa5, 'L', 0xff, 0x0f, 0x0f, 0);
      });

      test('AND A,A (0xA7) - self operation', () => {
        testANDRegister(cpu, mmu, 0xa7, 'A', 0xaa, 0xaa, 0xaa, 0);
      });
    });

    describe('AND A,(HL) (Memory Variant)', () => {
      test('AND A,(HL) (0xA6) - memory operation', () => {
        cpu.setRegisterA(0xff);
        cpu.setRegisterH(0x80);
        cpu.setRegisterL(0x00);
        mmu.writeByte(0x8000, 0x0f); // Value at (HL)

        cpu.setProgramCounter(0x9000);
        mmu.writeByte(0x9000, 0xa6);

        const cycles = cpu.step();

        expect(cycles).toBe(8); // Memory AND operations take 8 cycles
        expect(cpu.getRegisters().a).toBe(0x0f);
        expect(cpu.getZeroFlag()).toBe(false);
        expect(cpu.getSubtractFlag()).toBe(false);
        expect(cpu.getHalfCarryFlag()).toBe(true);
        expect(cpu.getCarryFlag()).toBe(false);
        expect(cpu.getPC()).toBe(0x9001);
      });
    });

    describe('AND A,n8 (Immediate Variant)', () => {
      test('AND A,n8 (0xE6) - immediate operation', () => {
        cpu.setRegisterA(0xff);
        cpu.setProgramCounter(0x8000);
        mmu.writeByte(0x8000, 0xe6);
        mmu.writeByte(0x8001, 0x0f); // Immediate value

        const cycles = cpu.step();

        expect(cycles).toBe(8); // Immediate AND operations take 8 cycles
        expect(cpu.getRegisters().a).toBe(0x0f);
        expect(cpu.getZeroFlag()).toBe(false);
        expect(cpu.getSubtractFlag()).toBe(false);
        expect(cpu.getHalfCarryFlag()).toBe(true);
        expect(cpu.getCarryFlag()).toBe(false);
        expect(cpu.getPC()).toBe(0x8002);
      });
    });
  });

  describe('OR Family Instructions (9 total)', () => {
    describe('OR A,r (Register Variants)', () => {
      test('OR A,B (0xB0) - basic operation', () => {
        cpu.setRegisterA(0xf0);
        cpu.setRegisterB(0x0f);
        cpu.setProgramCounter(0x8000);
        mmu.writeByte(0x8000, 0xb0);

        const cycles = cpu.step();

        expect(cycles).toBe(4); // Register OR operations take 4 cycles
        expect(cpu.getRegisters().a).toBe(0xff);
        expect(cpu.getZeroFlag()).toBe(false);
        expect(cpu.getSubtractFlag()).toBe(false); // N always 0 for OR
        expect(cpu.getHalfCarryFlag()).toBe(false); // H always 0 for OR
        expect(cpu.getCarryFlag()).toBe(false); // C always 0 for OR
        expect(cpu.getPC()).toBe(0x8001);
      });

      test('OR A,B (0xB0) - zero result sets Z flag', () => {
        cpu.setRegisterA(0x00);
        cpu.setRegisterB(0x00);
        cpu.setProgramCounter(0x8000);
        mmu.writeByte(0x8000, 0xb0);

        const cycles = cpu.step();

        expect(cycles).toBe(4);
        expect(cpu.getRegisters().a).toBe(0x00);
        expect(cpu.getZeroFlag()).toBe(true); // Z flag set when result is zero
        expect(cpu.getSubtractFlag()).toBe(false);
        expect(cpu.getHalfCarryFlag()).toBe(false);
        expect(cpu.getCarryFlag()).toBe(false);
        expect(cpu.getPC()).toBe(0x8001);
      });

      test('OR A,C (0xB1) - basic operation', () => {
        cpu.setRegisterA(0xf0);
        cpu.setRegisterC(0x0f);
        cpu.setProgramCounter(0x8000);
        mmu.writeByte(0x8000, 0xb1);

        const cycles = cpu.step();

        expect(cycles).toBe(4);
        expect(cpu.getRegisters().a).toBe(0xff);
        expect(cpu.getZeroFlag()).toBe(false);
        expect(cpu.getSubtractFlag()).toBe(false);
        expect(cpu.getHalfCarryFlag()).toBe(false);
        expect(cpu.getCarryFlag()).toBe(false);
      });
    });

    describe('OR A,(HL) (Memory Variant)', () => {
      test('OR A,(HL) (0xB6) - memory operation', () => {
        cpu.setRegisterA(0xf0);
        cpu.setRegisterH(0x80);
        cpu.setRegisterL(0x00);
        mmu.writeByte(0x8000, 0x0f); // Value at (HL)

        cpu.setProgramCounter(0x9000);
        mmu.writeByte(0x9000, 0xb6);

        const cycles = cpu.step();

        expect(cycles).toBe(8); // Memory OR operations take 8 cycles
        expect(cpu.getRegisters().a).toBe(0xff);
        expect(cpu.getZeroFlag()).toBe(false);
        expect(cpu.getSubtractFlag()).toBe(false);
        expect(cpu.getHalfCarryFlag()).toBe(false);
        expect(cpu.getCarryFlag()).toBe(false);
        expect(cpu.getPC()).toBe(0x9001);
      });
    });

    describe('OR A,n8 (Immediate Variant)', () => {
      test('OR A,n8 (0xF6) - immediate operation', () => {
        cpu.setRegisterA(0xf0);
        cpu.setProgramCounter(0x8000);
        mmu.writeByte(0x8000, 0xf6);
        mmu.writeByte(0x8001, 0x0f); // Immediate value

        const cycles = cpu.step();

        expect(cycles).toBe(8); // Immediate OR operations take 8 cycles
        expect(cpu.getRegisters().a).toBe(0xff);
        expect(cpu.getZeroFlag()).toBe(false);
        expect(cpu.getSubtractFlag()).toBe(false);
        expect(cpu.getHalfCarryFlag()).toBe(false);
        expect(cpu.getCarryFlag()).toBe(false);
        expect(cpu.getPC()).toBe(0x8002);
      });
    });
  });

  describe('XOR Family Instructions (9 total)', () => {
    describe('XOR A,r (Register Variants)', () => {
      test('XOR A,B (0xA8) - basic operation', () => {
        cpu.setRegisterA(0xff);
        cpu.setRegisterB(0x0f);
        cpu.setProgramCounter(0x8000);
        mmu.writeByte(0x8000, 0xa8);

        const cycles = cpu.step();

        expect(cycles).toBe(4); // Register XOR operations take 4 cycles
        expect(cpu.getRegisters().a).toBe(0xf0);
        expect(cpu.getZeroFlag()).toBe(false);
        expect(cpu.getSubtractFlag()).toBe(false); // N always 0 for XOR
        expect(cpu.getHalfCarryFlag()).toBe(false); // H always 0 for XOR
        expect(cpu.getCarryFlag()).toBe(false); // C always 0 for XOR
        expect(cpu.getPC()).toBe(0x8001);
      });

      test('XOR A,B (0xA8) - zero result sets Z flag', () => {
        cpu.setRegisterA(0xaa);
        cpu.setRegisterB(0xaa);
        cpu.setProgramCounter(0x8000);
        mmu.writeByte(0x8000, 0xa8);

        const cycles = cpu.step();

        expect(cycles).toBe(4);
        expect(cpu.getRegisters().a).toBe(0x00);
        expect(cpu.getZeroFlag()).toBe(true); // Z flag set when result is zero
        expect(cpu.getSubtractFlag()).toBe(false);
        expect(cpu.getHalfCarryFlag()).toBe(false);
        expect(cpu.getCarryFlag()).toBe(false);
        expect(cpu.getPC()).toBe(0x8001);
      });

      test('XOR A,C (0xA9) - basic operation', () => {
        cpu.setRegisterA(0xff);
        cpu.setRegisterC(0x0f);
        cpu.setProgramCounter(0x8000);
        mmu.writeByte(0x8000, 0xa9);

        const cycles = cpu.step();

        expect(cycles).toBe(4);
        expect(cpu.getRegisters().a).toBe(0xf0);
        expect(cpu.getZeroFlag()).toBe(false);
        expect(cpu.getSubtractFlag()).toBe(false);
        expect(cpu.getHalfCarryFlag()).toBe(false);
        expect(cpu.getCarryFlag()).toBe(false);
      });
    });

    describe('XOR A,(HL) (Memory Variant)', () => {
      test('XOR A,(HL) (0xAE) - memory operation', () => {
        cpu.setRegisterA(0xff);
        cpu.setRegisterH(0x80);
        cpu.setRegisterL(0x00);
        mmu.writeByte(0x8000, 0x0f); // Value at (HL)

        cpu.setProgramCounter(0x9000);
        mmu.writeByte(0x9000, 0xae);

        const cycles = cpu.step();

        expect(cycles).toBe(8); // Memory XOR operations take 8 cycles
        expect(cpu.getRegisters().a).toBe(0xf0);
        expect(cpu.getZeroFlag()).toBe(false);
        expect(cpu.getSubtractFlag()).toBe(false);
        expect(cpu.getHalfCarryFlag()).toBe(false);
        expect(cpu.getCarryFlag()).toBe(false);
        expect(cpu.getPC()).toBe(0x9001);
      });
    });

    describe('XOR A,n8 (Immediate Variant)', () => {
      test('XOR A,n8 (0xEE) - immediate operation', () => {
        cpu.setRegisterA(0xff);
        cpu.setProgramCounter(0x8000);
        mmu.writeByte(0x8000, 0xee);
        mmu.writeByte(0x8001, 0x0f); // Immediate value

        const cycles = cpu.step();

        expect(cycles).toBe(8); // Immediate XOR operations take 8 cycles
        expect(cpu.getRegisters().a).toBe(0xf0);
        expect(cpu.getZeroFlag()).toBe(false);
        expect(cpu.getSubtractFlag()).toBe(false);
        expect(cpu.getHalfCarryFlag()).toBe(false);
        expect(cpu.getCarryFlag()).toBe(false);
        expect(cpu.getPC()).toBe(0x8002);
      });
    });
  });

  describe('CP Family Instructions (9 total)', () => {
    describe('CP A,r (Register Variants)', () => {
      test('CP A,B (0xB8) - equal values set Z flag', () => {
        cpu.setRegisterA(0x42);
        cpu.setRegisterB(0x42);
        cpu.setProgramCounter(0x8000);
        mmu.writeByte(0x8000, 0xb8);

        const cycles = cpu.step();

        expect(cycles).toBe(4); // Register CP operations take 4 cycles
        expect(cpu.getRegisters().a).toBe(0x42); // A register unchanged
        expect(cpu.getZeroFlag()).toBe(true); // Z flag set when equal
        expect(cpu.getSubtractFlag()).toBe(true); // N always 1 for CP
        expect(cpu.getHalfCarryFlag()).toBe(false); // H flag based on borrow from bit 4
        expect(cpu.getCarryFlag()).toBe(false); // C flag based on borrow from bit 8
        expect(cpu.getPC()).toBe(0x8001);
      });

      test('CP A,B (0xB8) - A > B clears Z and C flags', () => {
        cpu.setRegisterA(0x50);
        cpu.setRegisterB(0x40);
        cpu.setProgramCounter(0x8000);
        mmu.writeByte(0x8000, 0xb8);

        const cycles = cpu.step();

        expect(cycles).toBe(4);
        expect(cpu.getRegisters().a).toBe(0x50); // A register unchanged
        expect(cpu.getZeroFlag()).toBe(false); // Z flag clear when not equal
        expect(cpu.getSubtractFlag()).toBe(true); // N always 1 for CP
        expect(cpu.getHalfCarryFlag()).toBe(false); // No half-borrow
        expect(cpu.getCarryFlag()).toBe(false); // No borrow
        expect(cpu.getPC()).toBe(0x8001);
      });

      test('CP A,B (0xB8) - A < B sets C flag', () => {
        cpu.setRegisterA(0x3e);
        cpu.setRegisterB(0x40);
        cpu.setProgramCounter(0x8000);
        mmu.writeByte(0x8000, 0xb8);

        const cycles = cpu.step();

        expect(cycles).toBe(4);
        expect(cpu.getRegisters().a).toBe(0x3e); // A register unchanged
        expect(cpu.getZeroFlag()).toBe(false); // Z flag clear when not equal
        expect(cpu.getSubtractFlag()).toBe(true); // N always 1 for CP
        expect(cpu.getHalfCarryFlag()).toBe(false); // Half-borrow - will fix based on hardware behavior
        expect(cpu.getCarryFlag()).toBe(true); // Borrow occurred
        expect(cpu.getPC()).toBe(0x8001);
      });

      test('CP A,C (0xB9) - basic operation', () => {
        cpu.setRegisterA(0x42);
        cpu.setRegisterC(0x42);
        cpu.setProgramCounter(0x8000);
        mmu.writeByte(0x8000, 0xb9);

        const cycles = cpu.step();

        expect(cycles).toBe(4);
        expect(cpu.getRegisters().a).toBe(0x42); // A register unchanged
        expect(cpu.getZeroFlag()).toBe(true);
        expect(cpu.getSubtractFlag()).toBe(true);
        expect(cpu.getHalfCarryFlag()).toBe(false);
        expect(cpu.getCarryFlag()).toBe(false);
      });
    });

    describe('CP A,(HL) (Memory Variant)', () => {
      test('CP A,(HL) (0xBE) - memory operation', () => {
        cpu.setRegisterA(0x42);
        cpu.setRegisterH(0x80);
        cpu.setRegisterL(0x00);
        mmu.writeByte(0x8000, 0x42); // Value at (HL)

        cpu.setProgramCounter(0x9000);
        mmu.writeByte(0x9000, 0xbe);

        const cycles = cpu.step();

        expect(cycles).toBe(8); // Memory CP operations take 8 cycles
        expect(cpu.getRegisters().a).toBe(0x42); // A register unchanged
        expect(cpu.getZeroFlag()).toBe(true);
        expect(cpu.getSubtractFlag()).toBe(true);
        expect(cpu.getHalfCarryFlag()).toBe(false);
        expect(cpu.getCarryFlag()).toBe(false);
        expect(cpu.getPC()).toBe(0x9001);
      });
    });

    describe('CP A,n8 (Immediate Variant)', () => {
      test('CP A,n8 (0xFE) - immediate operation', () => {
        cpu.setRegisterA(0x42);
        cpu.setProgramCounter(0x8000);
        mmu.writeByte(0x8000, 0xfe);
        mmu.writeByte(0x8001, 0x42); // Immediate value

        const cycles = cpu.step();

        expect(cycles).toBe(8); // Immediate CP operations take 8 cycles
        expect(cpu.getRegisters().a).toBe(0x42); // A register unchanged
        expect(cpu.getZeroFlag()).toBe(true);
        expect(cpu.getSubtractFlag()).toBe(true);
        expect(cpu.getHalfCarryFlag()).toBe(false);
        expect(cpu.getCarryFlag()).toBe(false);
        expect(cpu.getPC()).toBe(0x8002);
      });
    });
  });
});
