/**
 * SM83 CPU RES Instructions Test Suite - Complete Implementation
 *
 * Tests all 64 RES instructions (0x80-0xBF) following strict TDD principles.
 * Implements hardware-accurate bit clearing behavior per RGBDS documentation.
 *
 * TDD Workflow: RED (failing test) -> GREEN (minimal implementation) -> REFACTOR
 *
 * Hardware References:
 * - RGBDS GBZ80 Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 * - Opcodes JSON: /tests/resources/opcodes.json
 * - Pan Docs: https://gbdev.io/pandocs/CPU_Registers_and_Flags.html
 *
 * RES Operation:
 * - Resets specified bit in register/memory to 0
 * - Flag Behavior: No flags affected (Z=- N=- H=- C=-)
 * - Cycles: 8 for registers, 16 for (HL) memory
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';
import { CPUTestingComponent } from '../../../src/emulator/types';

/**
 * Test Helper Functions for RES Instruction Validation
 * These utilities enforce consistent testing patterns and hardware-accurate bit clearing behavior
 */

/**
 * Helper: Test RES register instruction with comprehensive validation
 * RES operations: Clear specified bit to 0, no flags affected
 */
function testRESRegister(
  cpu: CPUTestingComponent,
  mmu: MMU,
  cbOpcode: number,
  registerName: string,
  bitPosition: number,
  initialValue: number
): void {
  // Set initial register value
  switch (registerName) {
    case 'A':
      cpu.setRegisterA(initialValue);
      break;
    case 'B':
      cpu.setRegisterB(initialValue);
      break;
    case 'C':
      cpu.setRegisterC(initialValue);
      break;
    case 'D':
      cpu.setRegisterD(initialValue);
      break;
    case 'E':
      cpu.setRegisterE(initialValue);
      break;
    case 'H':
      cpu.setRegisterH(initialValue);
      break;
    case 'L':
      cpu.setRegisterL(initialValue);
      break;
  }

  // Set diverse initial flag state (should be preserved)
  cpu.setZeroFlag(true);
  cpu.setSubtractFlag(false);
  cpu.setHalfCarryFlag(true);
  cpu.setCarryFlag(false);

  // Execute CB prefix instruction
  const initialPC = cpu.getPC();
  mmu.writeByte(initialPC, 0xcb);
  mmu.writeByte(initialPC + 1, cbOpcode);

  const cycles = cpu.step();

  // Verify flags are unchanged (RES affects no flags)
  expect(cpu.getZeroFlag()).toBe(true);
  expect(cpu.getSubtractFlag()).toBe(false);
  expect(cpu.getHalfCarryFlag()).toBe(true);
  expect(cpu.getCarryFlag()).toBe(false);

  // Verify register value has bit cleared
  const expectedValue = initialValue & ~(1 << bitPosition);
  const actualValue = ((): number => {
    switch (registerName) {
      case 'A':
        return cpu.getRegisters().a;
      case 'B':
        return cpu.getRegisters().b;
      case 'C':
        return cpu.getRegisters().c;
      case 'D':
        return cpu.getRegisters().d;
      case 'E':
        return cpu.getRegisters().e;
      case 'H':
        return cpu.getRegisters().h;
      case 'L':
        return cpu.getRegisters().l;
      default:
        throw new Error(`Unknown register: ${registerName}`);
    }
  })();

  expect(actualValue).toBe(expectedValue);

  // Verify cycle count
  expect(cycles).toBe(8);

  // Verify PC advancement
  expect(cpu.getPC()).toBe(initialPC + 2);
}

/**
 * Helper: Test RES (HL) instruction with comprehensive validation
 * RES operations: Clear specified bit to 0 in memory, no flags affected
 */
function testRESMemory(
  cpu: CPUTestingComponent,
  mmu: MMU,
  cbOpcode: number,
  bitPosition: number,
  initialValue: number
): void {
  const hlAddress = 0xc000;
  cpu.setRegisterH((hlAddress >> 8) & 0xff);
  cpu.setRegisterL(hlAddress & 0xff);
  mmu.writeByte(hlAddress, initialValue);

  // Set diverse initial flag state (should be preserved)
  cpu.setZeroFlag(false);
  cpu.setSubtractFlag(true);
  cpu.setHalfCarryFlag(false);
  cpu.setCarryFlag(true);

  // Execute CB prefix instruction
  const initialPC = cpu.getPC();
  mmu.writeByte(initialPC, 0xcb);
  mmu.writeByte(initialPC + 1, cbOpcode);

  const cycles = cpu.step();

  // Verify flags are unchanged (RES affects no flags)
  expect(cpu.getZeroFlag()).toBe(false);
  expect(cpu.getSubtractFlag()).toBe(true);
  expect(cpu.getHalfCarryFlag()).toBe(false);
  expect(cpu.getCarryFlag()).toBe(true);

  // Verify memory value has bit cleared
  const expectedValue = initialValue & ~(1 << bitPosition);
  expect(mmu.readByte(hlAddress)).toBe(expectedValue);

  // Verify cycle count
  expect(cycles).toBe(16);

  // Verify PC advancement
  expect(cpu.getPC()).toBe(initialPC + 2);
}

describe('SM83 CPU RES Instructions', () => {
  let cpu: CPUTestingComponent;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu);
  });

  // Test all RES instructions systematically
  const registers = ['B', 'C', 'D', 'E', 'H', 'L', '(HL)', 'A'];
  const testValues = [0xff, 0x00, 0xaa, 0x55]; // Various bit patterns

  for (let bit = 0; bit < 8; bit++) {
    describe(`RES ${bit}`, () => {
      registers.forEach((reg, regIndex) => {
        const opcode = 0x80 + bit * 8 + regIndex;

        test(`CB 0x${opcode.toString(16).toUpperCase()}: RES ${bit},${reg}`, () => {
          testValues.forEach(initialValue => {
            if (reg === '(HL)') {
              testRESMemory(cpu, mmu, opcode, bit, initialValue);
            } else {
              testRESRegister(cpu, mmu, opcode, reg, bit, initialValue);
            }
          });
        });
      });
    });
  }

  // Additional edge case tests
  describe('RES Edge Cases', () => {
    test('RES does not affect already clear bits', () => {
      // Test that clearing an already-clear bit doesn't change the value
      cpu.setRegisterA(0b01111111); // Bit 7 already clear

      const initialPC = cpu.getPC();
      mmu.writeByte(initialPC, 0xcb);
      mmu.writeByte(initialPC + 1, 0xbf); // RES 7,A

      cpu.step();

      expect(cpu.getRegisters().a).toBe(0b01111111); // Should remain the same
    });

    test('RES works with boundary memory addresses', () => {
      // Test RES with memory at various addresses
      const testAddresses = [0x8000, 0x9fff, 0xc000, 0xfffe];

      testAddresses.forEach(address => {
        cpu.setRegisterH((address >> 8) & 0xff);
        cpu.setRegisterL(address & 0xff);
        mmu.writeByte(address, 0xff); // All bits set

        const initialPC = cpu.getPC();
        mmu.writeByte(initialPC, 0xcb);
        mmu.writeByte(initialPC + 1, 0x86); // RES 0,(HL)

        cpu.step();

        expect(mmu.readByte(address)).toBe(0xfe); // Bit 0 should be cleared
      });
    });

    test('RES preserves all flag states', () => {
      // Test all possible flag combinations are preserved
      const flagCombinations = [
        { Z: false, N: false, H: false, C: false },
        { Z: true, N: false, H: false, C: false },
        { Z: false, N: true, H: false, C: false },
        { Z: false, N: false, H: true, C: false },
        { Z: false, N: false, H: false, C: true },
        { Z: true, N: true, H: true, C: true },
      ];

      flagCombinations.forEach(flags => {
        cpu.setRegisterB(0xff); // All bits set
        cpu.setZeroFlag(flags.Z);
        cpu.setSubtractFlag(flags.N);
        cpu.setHalfCarryFlag(flags.H);
        cpu.setCarryFlag(flags.C);

        const initialPC = cpu.getPC();
        mmu.writeByte(initialPC, 0xcb);
        mmu.writeByte(initialPC + 1, 0x80); // RES 0,B

        cpu.step();

        expect(cpu.getZeroFlag()).toBe(flags.Z);
        expect(cpu.getSubtractFlag()).toBe(flags.N);
        expect(cpu.getHalfCarryFlag()).toBe(flags.H);
        expect(cpu.getCarryFlag()).toBe(flags.C);
      });
    });

    test('RES clears specific bits correctly', () => {
      // Test that RES only clears the target bit
      cpu.setRegisterA(0b11111111); // All bits set

      // Test clearing each bit individually
      for (let bit = 0; bit < 8; bit++) {
        cpu.setRegisterA(0b11111111);
        const expectedValue = 0b11111111 & ~(1 << bit);

        const initialPC = cpu.getPC();
        mmu.writeByte(initialPC, 0xcb);
        mmu.writeByte(initialPC + 1, 0x87 + bit * 8); // RES bit,A

        cpu.step();

        expect(cpu.getRegisters().a).toBe(expectedValue);
      }
    });
  });
});
