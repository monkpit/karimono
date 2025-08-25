/**
 * SM83 CPU SWAP Instructions Test Suite - Phase 11A Implementation
 *
 * Tests all 8 SWAP instruction variants following strict TDD principles.
 * Implements hardware-accurate flag behavior per RGBDS documentation.
 *
 * TDD Workflow: RED (failing test) -> GREEN (minimal implementation) -> REFACTOR
 *
 * Hardware References:
 * - RGBDS GBZ80 Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 * - Opcodes JSON: /tests/resources/opcodes.json
 * - Pan Docs: https://gbdev.io/pandocs/CPU_Registers_and_Flags.html
 *
 * SWAP Operation:
 * - Exchanges upper and lower nibbles of target
 * - Formula: (value >> 4) | ((value & 0x0F) << 4)
 * - Flags: Z=(result==0), N=0, H=0, C=0
 * - Cycles: 8 for registers, 16 for (HL) memory
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';
import { CPUTestingComponent } from '../../../src/emulator/types';

/**
 * Test Helper Functions for SWAP Instruction Validation
 * These utilities enforce consistent testing patterns and hardware-accurate flag behavior
 */

/**
 * Helper: Test SWAP register instruction with comprehensive validation
 * SWAP operations: Z=(result==0), N=0, H=0, C=0 (clear N/H/C always)
 */
function testSWAPRegister(
  cpu: CPUTestingComponent,
  mmu: MMU,
  cbOpcode: number,
  registerName: string,
  initialValue: number,
  expectedResult: number,
  expectedCycles: number
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

  // Set random flags to verify they are set correctly
  cpu.setRegisterF(0b11110000); // Z=1, N=1, H=1, C=1

  // Set up CB prefix instruction
  cpu.setProgramCounter(0x8000);
  mmu.writeByte(0x8000, 0xcb); // CB prefix
  mmu.writeByte(0x8001, cbOpcode); // SWAP opcode

  // Execute CB prefix instruction
  const cycles = cpu.step();

  // Verify register result
  const registers = cpu.getRegisters();
  let resultValue: number;
  switch (registerName) {
    case 'A':
      resultValue = registers.a;
      break;
    case 'B':
      resultValue = registers.b;
      break;
    case 'C':
      resultValue = registers.c;
      break;
    case 'D':
      resultValue = registers.d;
      break;
    case 'E':
      resultValue = registers.e;
      break;
    case 'H':
      resultValue = registers.h;
      break;
    case 'L':
      resultValue = registers.l;
      break;
    default:
      throw new Error(`Unknown register: ${registerName}`);
  }

  expect(resultValue).toBe(expectedResult);

  // Verify flags per RGBDS specification
  expect(cpu.getZeroFlag()).toBe(expectedResult === 0); // Z flag set if result is 0
  expect(cpu.getSubtractFlag()).toBe(false); // N flag always cleared
  expect(cpu.getHalfCarryFlag()).toBe(false); // H flag always cleared
  expect(cpu.getCarryFlag()).toBe(false); // C flag always cleared

  // Verify cycle count
  expect(cycles).toBe(expectedCycles);

  // Verify PC advancement (CB prefix + opcode = 2 bytes)
  expect(cpu.getPC()).toBe(0x8002);
}

/**
 * Helper: Test SWAP (HL) memory instruction with comprehensive validation
 */
function testSWAPMemory(
  cpu: CPUTestingComponent,
  mmu: MMU,
  cbOpcode: number,
  hlAddress: number,
  initialValue: number,
  expectedResult: number,
  expectedCycles: number
): void {
  // Set HL to target address
  cpu.setRegisterH((hlAddress >> 8) & 0xff);
  cpu.setRegisterL(hlAddress & 0xff);

  // Set initial memory value
  mmu.writeByte(hlAddress, initialValue);

  // Set random flags to verify they are set correctly
  cpu.setRegisterF(0b11110000); // Z=1, N=1, H=1, C=1

  // Set up CB prefix instruction
  cpu.setProgramCounter(0x8000);
  mmu.writeByte(0x8000, 0xcb); // CB prefix
  mmu.writeByte(0x8001, cbOpcode); // SWAP opcode

  // Execute CB prefix instruction
  const cycles = cpu.step();

  // Verify memory result
  const resultValue = mmu.readByte(hlAddress);
  expect(resultValue).toBe(expectedResult);

  // Verify flags per RGBDS specification
  expect(cpu.getZeroFlag()).toBe(expectedResult === 0); // Z flag set if result is 0
  expect(cpu.getSubtractFlag()).toBe(false); // N flag always cleared
  expect(cpu.getHalfCarryFlag()).toBe(false); // H flag always cleared
  expect(cpu.getCarryFlag()).toBe(false); // C flag always cleared

  // Verify cycle count
  expect(cycles).toBe(expectedCycles);

  // Verify PC advancement (CB prefix + opcode = 2 bytes)
  expect(cpu.getPC()).toBe(0x8002);
}

describe('SM83 CPU SWAP Instructions - Phase 11A', () => {
  let cpu: CPUTestingComponent;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu) as CPUTestingComponent;
  });

  describe('SWAP Register Instructions (0xCB30-0xCB35, 0xCB37)', () => {
    // SWAP B (0xCB30) tests
    test('SWAP B with 0x12 should produce 0x21', () => {
      testSWAPRegister(cpu, mmu, 0x30, 'B', 0x12, 0x21, 8);
    });
    test('SWAP B with 0xAB should produce 0xBA', () => {
      testSWAPRegister(cpu, mmu, 0x30, 'B', 0xab, 0xba, 8);
    });
    test('SWAP B with 0x00 should set Z flag', () => {
      testSWAPRegister(cpu, mmu, 0x30, 'B', 0x00, 0x00, 8);
    });
    test('SWAP B with 0xF0 should produce 0x0F', () => {
      testSWAPRegister(cpu, mmu, 0x30, 'B', 0xf0, 0x0f, 8);
    });

    // SWAP C (0xCB31) tests
    test('SWAP C with 0x34 should produce 0x43', () => {
      testSWAPRegister(cpu, mmu, 0x31, 'C', 0x34, 0x43, 8);
    });
    test('SWAP C with 0xCD should produce 0xDC', () => {
      testSWAPRegister(cpu, mmu, 0x31, 'C', 0xcd, 0xdc, 8);
    });
    test('SWAP C with 0x00 should set Z flag', () => {
      testSWAPRegister(cpu, mmu, 0x31, 'C', 0x00, 0x00, 8);
    });

    // SWAP D (0xCB32) tests
    test('SWAP D with 0x56 should produce 0x65', () => {
      testSWAPRegister(cpu, mmu, 0x32, 'D', 0x56, 0x65, 8);
    });
    test('SWAP D with 0xEF should produce 0xFE', () => {
      testSWAPRegister(cpu, mmu, 0x32, 'D', 0xef, 0xfe, 8);
    });
    test('SWAP D with 0x00 should set Z flag', () => {
      testSWAPRegister(cpu, mmu, 0x32, 'D', 0x00, 0x00, 8);
    });

    // SWAP E (0xCB33) tests
    test('SWAP E with 0x78 should produce 0x87', () => {
      testSWAPRegister(cpu, mmu, 0x33, 'E', 0x78, 0x87, 8);
    });
    test('SWAP E with 0x91 should produce 0x19', () => {
      testSWAPRegister(cpu, mmu, 0x33, 'E', 0x91, 0x19, 8);
    });
    test('SWAP E with 0x00 should set Z flag', () => {
      testSWAPRegister(cpu, mmu, 0x33, 'E', 0x00, 0x00, 8);
    });

    // SWAP H (0xCB34) tests
    test('SWAP H with 0x9A should produce 0xA9', () => {
      testSWAPRegister(cpu, mmu, 0x34, 'H', 0x9a, 0xa9, 8);
    });
    test('SWAP H with 0x23 should produce 0x32', () => {
      testSWAPRegister(cpu, mmu, 0x34, 'H', 0x23, 0x32, 8);
    });
    test('SWAP H with 0x00 should set Z flag', () => {
      testSWAPRegister(cpu, mmu, 0x34, 'H', 0x00, 0x00, 8);
    });

    // SWAP L (0xCB35) tests
    test('SWAP L with 0xBC should produce 0xCB', () => {
      testSWAPRegister(cpu, mmu, 0x35, 'L', 0xbc, 0xcb, 8);
    });
    test('SWAP L with 0x45 should produce 0x54', () => {
      testSWAPRegister(cpu, mmu, 0x35, 'L', 0x45, 0x54, 8);
    });
    test('SWAP L with 0x00 should set Z flag', () => {
      testSWAPRegister(cpu, mmu, 0x35, 'L', 0x00, 0x00, 8);
    });

    // SWAP A (0xCB37) tests
    test('SWAP A with 0xDE should produce 0xED', () => {
      testSWAPRegister(cpu, mmu, 0x37, 'A', 0xde, 0xed, 8);
    });
    test('SWAP A with 0x67 should produce 0x76', () => {
      testSWAPRegister(cpu, mmu, 0x37, 'A', 0x67, 0x76, 8);
    });
    test('SWAP A with 0x00 should set Z flag', () => {
      testSWAPRegister(cpu, mmu, 0x37, 'A', 0x00, 0x00, 8);
    });
  });

  describe('SWAP Memory Instruction (0xCB36)', () => {
    // SWAP (HL) (0xCB36) tests
    test('SWAP (HL) with 0x89 should produce 0x98', () => {
      testSWAPMemory(cpu, mmu, 0x36, 0xc000, 0x89, 0x98, 16);
    });
    test('SWAP (HL) with 0x12 should produce 0x21', () => {
      testSWAPMemory(cpu, mmu, 0x36, 0xc000, 0x12, 0x21, 16);
    });
    test('SWAP (HL) with 0x00 should set Z flag', () => {
      testSWAPMemory(cpu, mmu, 0x36, 0xc000, 0x00, 0x00, 16);
    });
    test('SWAP (HL) with 0xFF should produce 0xFF', () => {
      testSWAPMemory(cpu, mmu, 0x36, 0xc000, 0xff, 0xff, 16);
    });
    test('SWAP (HL) with 0xF0 should produce 0x0F', () => {
      testSWAPMemory(cpu, mmu, 0x36, 0xc000, 0xf0, 0x0f, 16);
    });
  });

  describe('SWAP Edge Cases and Hardware Accuracy', () => {
    test('SWAP nibble exchange formula verification', () => {
      // Test the exact nibble swap formula: ((value & 0x0F) << 4) | ((value & 0xF0) >> 4)
      const testCases = [
        { input: 0x12, expected: 0x21 },
        { input: 0xab, expected: 0xba },
        { input: 0xf0, expected: 0x0f },
        { input: 0x0f, expected: 0xf0 },
        { input: 0x34, expected: 0x43 },
        { input: 0x56, expected: 0x65 },
        { input: 0x78, expected: 0x87 },
        { input: 0x9a, expected: 0xa9 },
        { input: 0xbc, expected: 0xcb },
        { input: 0xde, expected: 0xed },
        { input: 0xff, expected: 0xff },
        { input: 0x00, expected: 0x00 },
      ];

      testCases.forEach(({ input, expected }) => {
        cpu.setRegisterA(input);
        cpu.setRegisterF(0b11110000); // Set all flags

        cpu.setProgramCounter(0x8000);
        mmu.writeByte(0x8000, 0xcb);
        mmu.writeByte(0x8001, 0x37); // SWAP A

        cpu.step();

        expect(cpu.getRegisters().a).toBe(expected);

        // Verify flags are set correctly
        expect(cpu.getZeroFlag()).toBe(expected === 0); // Z flag
        expect(cpu.getSubtractFlag()).toBe(false); // N flag cleared
        expect(cpu.getHalfCarryFlag()).toBe(false); // H flag cleared
        expect(cpu.getCarryFlag()).toBe(false); // C flag cleared
      });
    });

    test('SWAP preserves non-flag bits in F register', () => {
      cpu.setRegisterA(0x34);
      cpu.setRegisterF(0b11111111); // Set all bits including undefined ones

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xcb);
      mmu.writeByte(0x8001, 0x37); // SWAP A

      cpu.step();

      // Result should be 0x43, so Z=0, N=0, H=0, C=0, but lower 4 bits should be preserved
      const flags = cpu.getRegisters().f;
      expect(flags & 0b10000000).toBe(0); // Z flag cleared (result != 0)
      expect(flags & 0b01000000).toBe(0); // N flag cleared
      expect(flags & 0b00100000).toBe(0); // H flag cleared
      expect(flags & 0b00010000).toBe(0); // C flag cleared
      expect(flags & 0b00001111).toBe(0b00001111); // Lower 4 bits preserved
    });

    test('SWAP with all possible nibble combinations', () => {
      // Test systematic nibble combinations to verify correctness
      for (let upper = 0; upper <= 0xf; upper++) {
        for (let lower = 0; lower <= 0xf; lower++) {
          const input = (upper << 4) | lower;
          const expected = (lower << 4) | upper;

          cpu.setRegisterB(input);
          cpu.setRegisterF(0x00); // Clear all flags

          cpu.setProgramCounter(0x8000);
          mmu.writeByte(0x8000, 0xcb);
          mmu.writeByte(0x8001, 0x30); // SWAP B

          cpu.step();

          expect(cpu.getRegisters().b).toBe(expected);

          // Verify Z flag correctness
          expect(cpu.getZeroFlag()).toBe(expected === 0);
        }
      }
    });
  });
});
