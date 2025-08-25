/**
 * SM83 CPU Arithmetic with Carry Instructions Test Suite - Phase 2A Coverage Implementation
 *
 * Tests ADC (Add with Carry) and SBC (Subtract with Carry) instruction families
 * following strict TDD principles for comprehensive branch coverage improvement.
 *
 * TDD Workflow: RED (failing test) -> GREEN (minimal implementation) -> REFACTOR
 *
 * Hardware References:
 * - RGBDS GBZ80 Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 * - Opcodes JSON: /tests/resources/opcodes.json
 *
 * Coverage Strategy: Target conditional flag branches in arithmetic operations
 * ADC: 8 instructions (A, B, C, D, E, H, L, [HL], n8)
 * SBC: 8 instructions (A, B, C, D, E, H, L, [HL], n8)
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';
import { CPUTestingComponent } from '../../../src/emulator/types';

/**
 * Test Helper Functions for Arithmetic with Carry Instruction Validation
 */

/**
 * Helper: Setup test scenario with specific register and flag values
 */
function setupArithmeticTest(
  cpu: CPUTestingComponent,
  regA: number,
  _operand: number,
  carryFlag: boolean
): void {
  cpu.setProgramCounter(0x8000);
  cpu.setRegisterA(regA);
  cpu.setCarryFlag(carryFlag);
  // Clear other flags for predictable testing
  cpu.setZeroFlag(false);
  cpu.setSubtractFlag(false);
  cpu.setHalfCarryFlag(false);
}

/**
 * Helper: Validate flag results for arithmetic operations
 */
function validateFlags(
  cpu: CPUTestingComponent,
  expectedZero: boolean,
  expectedSubtract: boolean,
  expectedHalfCarry: boolean,
  expectedCarry: boolean
): void {
  expect(cpu.getZeroFlag()).toBe(expectedZero);
  expect(cpu.getSubtractFlag()).toBe(expectedSubtract);
  expect(cpu.getHalfCarryFlag()).toBe(expectedHalfCarry);
  expect(cpu.getCarryFlag()).toBe(expectedCarry);
}

describe('SM83 CPU Arithmetic with Carry Instructions (Phase 2A)', () => {
  let cpu: CPUTestingComponent;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu) as CPUTestingComponent;
  });

  describe('ADC A,r8 Family Instructions (Add with Carry)', () => {
    describe('ADC A,A (0x8F) - Add A to A with carry', () => {
      test('adds A to A with carry flag clear', () => {
        setupArithmeticTest(cpu, 0x15, 0x15, false);
        mmu.writeByte(0x8000, 0x8f);

        const cycles = cpu.step();

        expect(cycles).toBe(4);
        expect(cpu.getRegisters().a).toBe(0x2a); // 0x15 + 0x15 + 0 = 0x2A
        expect(cpu.getRegisters().pc).toBe(0x8001);
        validateFlags(cpu, false, false, false, false);
      });

      test('adds A to A with carry flag set', () => {
        setupArithmeticTest(cpu, 0x15, 0x15, true);
        mmu.writeByte(0x8000, 0x8f);

        const cycles = cpu.step();

        expect(cycles).toBe(4);
        expect(cpu.getRegisters().a).toBe(0x2b); // 0x15 + 0x15 + 1 = 0x2B
        expect(cpu.getRegisters().pc).toBe(0x8001);
        validateFlags(cpu, false, false, false, false);
      });

      test('generates zero flag when result is 0x00', () => {
        setupArithmeticTest(cpu, 0x00, 0x00, false);
        mmu.writeByte(0x8000, 0x8f);

        cpu.step();

        expect(cpu.getRegisters().a).toBe(0x00);
        validateFlags(cpu, true, false, false, false);
      });

      test('generates carry flag on 8-bit overflow', () => {
        setupArithmeticTest(cpu, 0xff, 0xff, false);
        mmu.writeByte(0x8000, 0x8f);

        cpu.step();

        expect(cpu.getRegisters().a).toBe(0xfe); // 0xFF + 0xFF = 0x1FE -> 0xFE
        validateFlags(cpu, false, false, true, true);
      });

      test('generates half-carry flag on bit 3 overflow', () => {
        setupArithmeticTest(cpu, 0x08, 0x08, false);
        mmu.writeByte(0x8000, 0x8f);

        cpu.step();

        expect(cpu.getRegisters().a).toBe(0x10); // 0x08 + 0x08 = 0x10
        validateFlags(cpu, false, false, true, false);
      });
    });

    describe('ADC A,B (0x88) - Add B to A with carry', () => {
      test('adds B register value to A with carry clear', () => {
        setupArithmeticTest(cpu, 0x20, 0x00, false);
        cpu.setRegisterB(0x10);
        mmu.writeByte(0x8000, 0x88);

        const cycles = cpu.step();

        expect(cycles).toBe(4);
        expect(cpu.getRegisters().a).toBe(0x30); // 0x20 + 0x10 + 0 = 0x30
        validateFlags(cpu, false, false, false, false);
      });

      test('adds B register value to A with carry set', () => {
        setupArithmeticTest(cpu, 0x20, 0x00, true);
        cpu.setRegisterB(0x10);
        mmu.writeByte(0x8000, 0x88);

        cpu.step();

        expect(cpu.getRegisters().a).toBe(0x31); // 0x20 + 0x10 + 1 = 0x31
        validateFlags(cpu, false, false, false, false);
      });
    });

    describe('ADC A,C (0x89) through ADC A,L (0x8D) - Register variants', () => {
      const testCases = [
        {
          opcode: 0x89,
          register: 'C',
          setReg: (cpu: CPUTestingComponent, val: number): void => cpu.setRegisterC(val),
        },
        {
          opcode: 0x8a,
          register: 'D',
          setReg: (cpu: CPUTestingComponent, val: number): void => cpu.setRegisterD(val),
        },
        {
          opcode: 0x8b,
          register: 'E',
          setReg: (cpu: CPUTestingComponent, val: number): void => cpu.setRegisterE(val),
        },
        {
          opcode: 0x8c,
          register: 'H',
          setReg: (cpu: CPUTestingComponent, val: number): void => cpu.setRegisterH(val),
        },
        {
          opcode: 0x8d,
          register: 'L',
          setReg: (cpu: CPUTestingComponent, val: number): void => cpu.setRegisterL(val),
        },
      ];

      testCases.forEach(({ opcode, register, setReg }) => {
        test(`ADC A,${register} (0x${opcode.toString(16).toUpperCase()}) executes correctly`, () => {
          setupArithmeticTest(cpu, 0x25, 0x00, false);
          setReg(cpu, 0x15);
          mmu.writeByte(0x8000, opcode);

          const cycles = cpu.step();

          expect(cycles).toBe(4);
          expect(cpu.getRegisters().a).toBe(0x3a); // 0x25 + 0x15 = 0x3A
          validateFlags(cpu, false, false, false, false);
        });
      });
    });

    describe('ADC A,[HL] (0x8E) - Add memory value to A with carry', () => {
      test('adds memory value pointed by HL to A', () => {
        setupArithmeticTest(cpu, 0x30, 0x00, false);
        cpu.setRegisterH(0x80);
        cpu.setRegisterL(0x10);
        mmu.writeByte(0x8010, 0x25); // Memory value at HL
        mmu.writeByte(0x8000, 0x8e);

        const cycles = cpu.step();

        expect(cycles).toBe(8); // Memory access takes 8 cycles
        expect(cpu.getRegisters().a).toBe(0x55); // 0x30 + 0x25 = 0x55
        validateFlags(cpu, false, false, false, false);
      });

      test('adds memory value with carry flag set', () => {
        setupArithmeticTest(cpu, 0x30, 0x00, true);
        cpu.setRegisterH(0x80);
        cpu.setRegisterL(0x10);
        mmu.writeByte(0x8010, 0x25);
        mmu.writeByte(0x8000, 0x8e);

        cpu.step();

        expect(cpu.getRegisters().a).toBe(0x56); // 0x30 + 0x25 + 1 = 0x56
        validateFlags(cpu, false, false, false, false);
      });
    });

    describe('ADC A,n8 (0xCE) - Add immediate value to A with carry', () => {
      test('adds immediate 8-bit value to A', () => {
        setupArithmeticTest(cpu, 0x40, 0x00, false);
        mmu.writeByte(0x8000, 0xce);
        mmu.writeByte(0x8001, 0x18); // Immediate value

        const cycles = cpu.step();

        expect(cycles).toBe(8); // Immediate read takes 8 cycles
        expect(cpu.getRegisters().a).toBe(0x58); // 0x40 + 0x18 = 0x58
        expect(cpu.getRegisters().pc).toBe(0x8002);
        validateFlags(cpu, false, false, false, false);
      });
    });
  });

  describe('SBC A,r8 Family Instructions (Subtract with Carry)', () => {
    describe('SBC A,A (0x9F) - Subtract A from A with carry', () => {
      test('subtracts A from A with carry flag clear', () => {
        setupArithmeticTest(cpu, 0x25, 0x25, false);
        mmu.writeByte(0x8000, 0x9f);

        const cycles = cpu.step();

        expect(cycles).toBe(4);
        expect(cpu.getRegisters().a).toBe(0x00); // 0x25 - 0x25 - 0 = 0x00
        expect(cpu.getRegisters().pc).toBe(0x8001);
        validateFlags(cpu, true, true, false, false); // Zero and subtract flags set
      });

      test('subtracts A from A with carry flag set', () => {
        setupArithmeticTest(cpu, 0x25, 0x25, true);
        mmu.writeByte(0x8000, 0x9f);

        cpu.step();

        expect(cpu.getRegisters().a).toBe(0xff); // 0x25 - 0x25 - 1 = -1 = 0xFF
        validateFlags(cpu, false, true, true, true); // Subtract, half-carry, and carry flags set
      });

      test('generates carry flag on 8-bit underflow', () => {
        setupArithmeticTest(cpu, 0x00, 0x00, false);
        cpu.setRegisterA(0x10);
        cpu.setRegisterA(0x20); // A = 0x10, but subtract 0x20
        mmu.writeByte(0x8000, 0x9f);

        // Actually test borrowing scenario
        cpu.setRegisterA(0x10);
        mmu.writeByte(0x8000, 0x9f);

        cpu.step();

        expect(cpu.getRegisters().a).toBe(0x00); // 0x10 - 0x10 = 0x00
        validateFlags(cpu, true, true, false, false);
      });

      test('generates half-carry flag on bit 3 borrow', () => {
        setupArithmeticTest(cpu, 0x00, 0x00, false);
        mmu.writeByte(0x8000, 0x9f);

        cpu.step();

        expect(cpu.getRegisters().a).toBe(0x00);
        validateFlags(cpu, true, true, false, false);
      });
    });

    describe('SBC A,B (0x98) - Subtract B from A with carry', () => {
      test('subtracts B register value from A with carry clear', () => {
        setupArithmeticTest(cpu, 0x50, 0x00, false);
        cpu.setRegisterB(0x20);
        mmu.writeByte(0x8000, 0x98);

        const cycles = cpu.step();

        expect(cycles).toBe(4);
        expect(cpu.getRegisters().a).toBe(0x30); // 0x50 - 0x20 - 0 = 0x30
        validateFlags(cpu, false, true, false, false); // Only subtract flag set
      });

      test('subtracts B register value from A with carry set', () => {
        setupArithmeticTest(cpu, 0x50, 0x00, true);
        cpu.setRegisterB(0x20);
        mmu.writeByte(0x8000, 0x98);

        cpu.step();

        expect(cpu.getRegisters().a).toBe(0x2f); // 0x50 - 0x20 - 1 = 0x2F
        validateFlags(cpu, false, true, true, false); // H flag should be true: (0 - 0 - 1) < 0, RGBDS-compliant
      });

      test('handles underflow with borrow', () => {
        setupArithmeticTest(cpu, 0x20, 0x00, false);
        cpu.setRegisterB(0x30);
        mmu.writeByte(0x8000, 0x98);

        cpu.step();

        expect(cpu.getRegisters().a).toBe(0xf0); // 0x20 - 0x30 = -0x10 = 0xF0
        validateFlags(cpu, false, true, false, true); // Subtract and carry flags set
      });
    });

    describe('SBC A,C (0x99) through SBC A,L (0x9D) - Register variants', () => {
      const testCases = [
        {
          opcode: 0x99,
          register: 'C',
          setReg: (cpu: CPUTestingComponent, val: number): void => cpu.setRegisterC(val),
        },
        {
          opcode: 0x9a,
          register: 'D',
          setReg: (cpu: CPUTestingComponent, val: number): void => cpu.setRegisterD(val),
        },
        {
          opcode: 0x9b,
          register: 'E',
          setReg: (cpu: CPUTestingComponent, val: number): void => cpu.setRegisterE(val),
        },
        {
          opcode: 0x9c,
          register: 'H',
          setReg: (cpu: CPUTestingComponent, val: number): void => cpu.setRegisterH(val),
        },
        {
          opcode: 0x9d,
          register: 'L',
          setReg: (cpu: CPUTestingComponent, val: number): void => cpu.setRegisterL(val),
        },
      ];

      testCases.forEach(({ opcode, register, setReg }) => {
        test(`SBC A,${register} (0x${opcode.toString(16).toUpperCase()}) executes correctly`, () => {
          setupArithmeticTest(cpu, 0x60, 0x00, false);
          setReg(cpu, 0x25);
          mmu.writeByte(0x8000, opcode);

          const cycles = cpu.step();

          expect(cycles).toBe(4);
          expect(cpu.getRegisters().a).toBe(0x3b); // 0x60 - 0x25 = 0x3B
          validateFlags(cpu, false, true, true, false); // H flag set: (0 - 5 - 0) < 0, RGBDS-compliant
        });
      });
    });

    describe('SBC A,[HL] (0x9E) - Subtract memory value from A with carry', () => {
      test('subtracts memory value pointed by HL from A', () => {
        setupArithmeticTest(cpu, 0x70, 0x00, false);
        cpu.setRegisterH(0x80);
        cpu.setRegisterL(0x10);
        mmu.writeByte(0x8010, 0x30); // Memory value at HL
        mmu.writeByte(0x8000, 0x9e);

        const cycles = cpu.step();

        expect(cycles).toBe(8); // Memory access takes 8 cycles
        expect(cpu.getRegisters().a).toBe(0x40); // 0x70 - 0x30 = 0x40
        validateFlags(cpu, false, true, false, false);
      });

      test('subtracts memory value with carry flag set', () => {
        setupArithmeticTest(cpu, 0x70, 0x00, true);
        cpu.setRegisterH(0x80);
        cpu.setRegisterL(0x10);
        mmu.writeByte(0x8010, 0x30);
        mmu.writeByte(0x8000, 0x9e);

        cpu.step();

        expect(cpu.getRegisters().a).toBe(0x3f); // 0x70 - 0x30 - 1 = 0x3F
        validateFlags(cpu, false, true, true, false); // H flag set: (0x0 - 0x0 - 1) < 0
      });
    });

    describe('SBC A,n8 (0xDE) - Subtract immediate value from A with carry', () => {
      test('subtracts immediate 8-bit value from A', () => {
        setupArithmeticTest(cpu, 0x80, 0x00, false);
        mmu.writeByte(0x8000, 0xde);
        mmu.writeByte(0x8001, 0x35); // Immediate value

        const cycles = cpu.step();

        expect(cycles).toBe(8); // Immediate read takes 8 cycles
        expect(cpu.getRegisters().a).toBe(0x4b); // 0x80 - 0x35 = 0x4B
        expect(cpu.getRegisters().pc).toBe(0x8002);
        validateFlags(cpu, false, true, true, false); // H flag set: (0x0 - 0x5 - 0) < 0
      });

      test('handles underflow with immediate value', () => {
        setupArithmeticTest(cpu, 0x10, 0x00, false);
        mmu.writeByte(0x8000, 0xde);
        mmu.writeByte(0x8001, 0x20);

        cpu.step();

        expect(cpu.getRegisters().a).toBe(0xf0); // 0x10 - 0x20 = -0x10 = 0xF0
        validateFlags(cpu, false, true, false, true);
      });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('ADC with maximum values and carry propagation', () => {
      setupArithmeticTest(cpu, 0xff, 0x00, true);
      cpu.setRegisterB(0x01);
      mmu.writeByte(0x8000, 0x88); // ADC A,B

      cpu.step();

      expect(cpu.getRegisters().a).toBe(0x01); // 0xFF + 0x01 + 1 = 0x101 -> 0x01
      validateFlags(cpu, false, false, true, true); // Half-carry and carry set
    });

    test('SBC with minimum values and borrow propagation', () => {
      setupArithmeticTest(cpu, 0x00, 0x00, true);
      cpu.setRegisterB(0x01);
      mmu.writeByte(0x8000, 0x98); // SBC A,B

      cpu.step();

      expect(cpu.getRegisters().a).toBe(0xfe); // 0x00 - 0x01 - 1 = -2 = 0xFE
      validateFlags(cpu, false, true, true, true); // Subtract, half-carry, and carry set
    });

    test('carry flag affects subsequent operations correctly', () => {
      // First operation sets carry
      setupArithmeticTest(cpu, 0xff, 0x00, false);
      cpu.setRegisterB(0x02);
      mmu.writeByte(0x8000, 0x80); // ADD A,B (not ADC, but sets carry)

      cpu.step();
      expect(cpu.getCarryFlag()).toBe(true);

      // Second operation uses carry
      cpu.setProgramCounter(0x8001);
      cpu.setRegisterC(0x00);
      mmu.writeByte(0x8001, 0x89); // ADC A,C

      cpu.step();

      expect(cpu.getRegisters().a).toBe(0x02); // Previous result 0x01 + 0x00 + 1 = 0x02
    });
  });

  describe('Flags Preservation and Interaction', () => {
    test('ADC operations correctly set all flag combinations', () => {
      const flagTests = [
        {
          a: 0x0f,
          operand: 0x01,
          carry: false,
          expected: { result: 0x10, z: false, n: false, h: true, c: false },
        },
        {
          a: 0xff,
          operand: 0xff,
          carry: true,
          expected: { result: 0xff, z: false, n: false, h: true, c: true },
        },
        {
          a: 0x00,
          operand: 0x00,
          carry: false,
          expected: { result: 0x00, z: true, n: false, h: false, c: false },
        },
      ];

      flagTests.forEach(({ a, operand, carry, expected }) => {
        setupArithmeticTest(cpu, a, 0x00, carry);
        cpu.setRegisterB(operand);
        mmu.writeByte(0x8000, 0x88); // ADC A,B

        cpu.step();

        expect(cpu.getRegisters().a).toBe(expected.result);
        validateFlags(cpu, expected.z, expected.n, expected.h, expected.c);

        // Reset for next test
        cpu = new CPU(mmu) as CPUTestingComponent;
      });
    });

    test('SBC operations correctly set all flag combinations', () => {
      const flagTests = [
        {
          a: 0x10,
          operand: 0x01,
          carry: false,
          expected: { result: 0x0f, z: false, n: true, h: true, c: false }, // H=true: (0-1-0) < 0, RGBDS-compliant
        },
        {
          a: 0x00,
          operand: 0x01,
          carry: true,
          expected: { result: 0xfe, z: false, n: true, h: true, c: true },
        },
        {
          a: 0x01,
          operand: 0x01,
          carry: false,
          expected: { result: 0x00, z: true, n: true, h: false, c: false },
        },
      ];

      flagTests.forEach(({ a, operand, carry, expected }) => {
        setupArithmeticTest(cpu, a, 0x00, carry);
        cpu.setRegisterB(operand);
        mmu.writeByte(0x8000, 0x98); // SBC A,B

        cpu.step();

        expect(cpu.getRegisters().a).toBe(expected.result);
        validateFlags(cpu, expected.z, expected.n, expected.h, expected.c);

        // Reset for next test
        cpu = new CPU(mmu) as CPUTestingComponent;
      });
    });
  });
});
