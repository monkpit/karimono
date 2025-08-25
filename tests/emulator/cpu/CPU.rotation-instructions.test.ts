/**
 * SM83 CPU Rotation Instructions Test Suite - Phase 2A Coverage Implementation
 *
 * Tests RLA, RRA, RLCA, RRCA rotation instructions with comprehensive flag behavior
 * following strict TDD principles for branch coverage improvement.
 *
 * TDD Workflow: RED (failing test) -> GREEN (minimal implementation) -> REFACTOR
 *
 * Hardware References:
 * - RGBDS GBZ80 Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 * - Opcodes JSON: /tests/resources/opcodes.json
 *
 * Coverage Strategy: Target flag condition branches in rotation operations
 * RLA (0x17): Rotate A left through carry
 * RRA (0x1F): Rotate A right through carry
 * RLCA (0x07): Rotate A left circular
 * RRCA (0x0F): Rotate A right circular
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';
import { CPUTestingComponent } from '../../../src/emulator/types';

/**
 * Test Helper Functions for Rotation Instruction Validation
 */

/**
 * Helper: Setup test scenario with specific register A and flag values
 */
function setupRotationTest(
  cpu: CPUTestingComponent,
  regA: number,
  carryFlag: boolean = false
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
 * Helper: Validate rotation instruction results and flag behavior
 */
function validateRotationResult(
  cpu: CPUTestingComponent,
  expectedA: number,
  expectedCarry: boolean,
  expectedZero: boolean = false
): void {
  const registers = cpu.getRegisters();
  expect(registers.a).toBe(expectedA);
  expect(cpu.getCarryFlag()).toBe(expectedCarry);
  expect(cpu.getZeroFlag()).toBe(expectedZero);
  // Rotation instructions always clear subtract and half-carry flags
  expect(cpu.getSubtractFlag()).toBe(false);
  expect(cpu.getHalfCarryFlag()).toBe(false);
  expect(registers.pc).toBe(0x8001);
}

describe('SM83 CPU Rotation Instructions (Phase 2A)', () => {
  let cpu: CPUTestingComponent;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu) as CPUTestingComponent;
  });

  describe('RLA (0x17) - Rotate A left through carry', () => {
    test('rotates A left with carry flag clear', () => {
      setupRotationTest(cpu, 0b10110001, false);
      mmu.writeByte(0x8000, 0x17);

      const cycles = cpu.step();

      expect(cycles).toBe(4);
      // 0b10110001 rotated left through carry (0) = 0b01100010
      validateRotationResult(cpu, 0b01100010, true); // Bit 7 goes to carry
    });

    test('rotates A left with carry flag set', () => {
      setupRotationTest(cpu, 0b10110001, true);
      mmu.writeByte(0x8000, 0x17);

      cpu.step();

      // 0b10110001 rotated left through carry (1) = 0b01100011
      validateRotationResult(cpu, 0b01100011, true); // Bit 7 goes to carry, carry goes to bit 0
    });

    test('rotates A left with no carry generated', () => {
      setupRotationTest(cpu, 0b01110001, false);
      mmu.writeByte(0x8000, 0x17);

      cpu.step();

      // 0b01110001 rotated left through carry (0) = 0b11100010
      validateRotationResult(cpu, 0b11100010, false); // Bit 7 (0) goes to carry
    });

    test('handles rotation with carry from previous operation', () => {
      setupRotationTest(cpu, 0b00000000, true);
      mmu.writeByte(0x8000, 0x17);

      cpu.step();

      // 0b00000000 rotated left through carry (1) = 0b00000001
      validateRotationResult(cpu, 0b00000001, false); // Carry becomes bit 0
    });

    test('produces zero result and maintains correct flags', () => {
      setupRotationTest(cpu, 0b00000000, false);
      mmu.writeByte(0x8000, 0x17);

      cpu.step();

      // 0b00000000 rotated left through carry (0) = 0b00000000
      validateRotationResult(cpu, 0b00000000, false, false); // RLA never sets zero flag
    });
  });

  describe('RRA (0x1F) - Rotate A right through carry', () => {
    test('rotates A right with carry flag clear', () => {
      setupRotationTest(cpu, 0b10110001, false);
      mmu.writeByte(0x8000, 0x1f);

      const cycles = cpu.step();

      expect(cycles).toBe(4);
      // 0b10110001 rotated right through carry (0) = 0b01011000
      validateRotationResult(cpu, 0b01011000, true); // Bit 0 goes to carry
    });

    test('rotates A right with carry flag set', () => {
      setupRotationTest(cpu, 0b10110001, true);
      mmu.writeByte(0x8000, 0x1f);

      cpu.step();

      // 0b10110001 rotated right through carry (1) = 0b11011000
      validateRotationResult(cpu, 0b11011000, true); // Bit 0 goes to carry, carry goes to bit 7
    });

    test('rotates A right with no carry generated', () => {
      setupRotationTest(cpu, 0b10110000, false);
      mmu.writeByte(0x8000, 0x1f);

      cpu.step();

      // 0b10110000 rotated right through carry (0) = 0b01011000
      validateRotationResult(cpu, 0b01011000, false); // Bit 0 (0) goes to carry
    });

    test('handles rotation with carry from previous operation', () => {
      setupRotationTest(cpu, 0b00000000, true);
      mmu.writeByte(0x8000, 0x1f);

      cpu.step();

      // 0b00000000 rotated right through carry (1) = 0b10000000
      validateRotationResult(cpu, 0b10000000, false); // Carry becomes bit 7
    });

    test('produces zero result and maintains correct flags', () => {
      setupRotationTest(cpu, 0b00000000, false);
      mmu.writeByte(0x8000, 0x1f);

      cpu.step();

      // 0b00000000 rotated right through carry (0) = 0b00000000
      validateRotationResult(cpu, 0b00000000, false, false); // RRA never sets zero flag
    });
  });

  describe('RLCA (0x07) - Rotate A left circular', () => {
    test('rotates A left circular with bit 7 to carry', () => {
      setupRotationTest(cpu, 0b10110001);
      mmu.writeByte(0x8000, 0x07);

      const cycles = cpu.step();

      expect(cycles).toBe(4);
      // 0b10110001 rotated left circular = 0b01100011
      validateRotationResult(cpu, 0b01100011, true); // Bit 7 (1) goes to carry and bit 0
    });

    test('rotates A left circular without setting carry', () => {
      setupRotationTest(cpu, 0b01110001);
      mmu.writeByte(0x8000, 0x07);

      cpu.step();

      // 0b01110001 rotated left circular = 0b11100010
      validateRotationResult(cpu, 0b11100010, false); // Bit 7 (0) goes to carry and bit 0
    });

    test('handles all bits set case', () => {
      setupRotationTest(cpu, 0b11111111);
      mmu.writeByte(0x8000, 0x07);

      cpu.step();

      // 0b11111111 rotated left circular = 0b11111111
      validateRotationResult(cpu, 0b11111111, true); // Bit 7 (1) goes to carry and bit 0
    });

    test('handles all bits clear case', () => {
      setupRotationTest(cpu, 0b00000000);
      mmu.writeByte(0x8000, 0x07);

      cpu.step();

      // 0b00000000 rotated left circular = 0b00000000
      validateRotationResult(cpu, 0b00000000, false, false); // RLCA never sets zero flag
    });

    test('ignores existing carry flag state', () => {
      // Test that RLCA doesn't use existing carry, unlike RLA
      setupRotationTest(cpu, 0b01110001, true); // Carry set, but should be ignored
      mmu.writeByte(0x8000, 0x07);

      cpu.step();

      // Result should be same regardless of initial carry state
      validateRotationResult(cpu, 0b11100010, false);
    });
  });

  describe('RRCA (0x0F) - Rotate A right circular', () => {
    test('rotates A right circular with bit 0 to carry', () => {
      setupRotationTest(cpu, 0b10110001);
      mmu.writeByte(0x8000, 0x0f);

      const cycles = cpu.step();

      expect(cycles).toBe(4);
      // 0b10110001 rotated right circular = 0b11011000
      validateRotationResult(cpu, 0b11011000, true); // Bit 0 (1) goes to carry and bit 7
    });

    test('rotates A right circular without setting carry', () => {
      setupRotationTest(cpu, 0b10110000);
      mmu.writeByte(0x8000, 0x0f);

      cpu.step();

      // 0b10110000 rotated right circular = 0b01011000
      validateRotationResult(cpu, 0b01011000, false); // Bit 0 (0) goes to carry and bit 7
    });

    test('handles all bits set case', () => {
      setupRotationTest(cpu, 0b11111111);
      mmu.writeByte(0x8000, 0x0f);

      cpu.step();

      // 0b11111111 rotated right circular = 0b11111111
      validateRotationResult(cpu, 0b11111111, true); // Bit 0 (1) goes to carry and bit 7
    });

    test('handles all bits clear case', () => {
      setupRotationTest(cpu, 0b00000000);
      mmu.writeByte(0x8000, 0x0f);

      cpu.step();

      // 0b00000000 rotated right circular = 0b00000000
      validateRotationResult(cpu, 0b00000000, false, false); // RRCA never sets zero flag
    });

    test('ignores existing carry flag state', () => {
      // Test that RRCA doesn't use existing carry, unlike RRA
      setupRotationTest(cpu, 0b10110000, true); // Carry set, but should be ignored
      mmu.writeByte(0x8000, 0x0f);

      cpu.step();

      // Result should be same regardless of initial carry state
      validateRotationResult(cpu, 0b01011000, false);
    });
  });

  describe('Rotation Instruction Patterns and Edge Cases', () => {
    test('all rotation instructions have 4-cycle timing', () => {
      const instructions = [0x07, 0x0f, 0x17, 0x1f]; // RLCA, RRCA, RLA, RRA

      instructions.forEach(opcode => {
        setupRotationTest(cpu, 0x55);
        mmu.writeByte(0x8000, opcode);

        const cycles = cpu.step();
        expect(cycles).toBe(4);

        // Reset CPU for next test
        cpu = new CPU(mmu) as CPUTestingComponent;
      });
    });

    test('rotation sequence produces expected pattern', () => {
      // Test RLA sequence: each rotation shifts pattern
      const initialValue = 0b10101010;
      setupRotationTest(cpu, initialValue, false);

      const rotationSteps = [
        { instruction: 0x17, expected: 0b01010100, carry: true }, // RLA
        { instruction: 0x17, expected: 0b10101001, carry: false }, // RLA
        { instruction: 0x17, expected: 0b01010010, carry: true }, // RLA
        { instruction: 0x17, expected: 0b10100101, carry: false }, // RLA
      ];

      rotationSteps.forEach(({ instruction, expected, carry }) => {
        mmu.writeByte(0x8000, instruction);
        cpu.step();

        expect(cpu.getRegisters().a).toBe(expected);
        expect(cpu.getCarryFlag()).toBe(carry);

        // Advance PC for next instruction
        cpu.setProgramCounter(0x8000);
      });
    });

    test('circular rotation preserves bit patterns', () => {
      // Test RLCA/RRCA round-trip preservation
      const testValue = 0b11001010;
      setupRotationTest(cpu, testValue);

      // Perform 8 left circular rotations (should return to original)
      for (let i = 0; i < 8; i++) {
        mmu.writeByte(0x8000, 0x07); // RLCA
        cpu.step();
        cpu.setProgramCounter(0x8000); // Reset PC for next instruction
      }

      expect(cpu.getRegisters().a).toBe(testValue);
    });

    test('through-carry rotation produces different patterns than circular', () => {
      const testValue = 0b10000001;

      // Test RLA vs RLCA with same input
      setupRotationTest(cpu, testValue, false);
      mmu.writeByte(0x8000, 0x17); // RLA
      cpu.step();
      const rlaResult = cpu.getRegisters().a;
      const rlaCarry = cpu.getCarryFlag();

      // Reset and test RLCA
      setupRotationTest(cpu, testValue, false);
      mmu.writeByte(0x8000, 0x07); // RLCA
      cpu.step();
      const rlcaResult = cpu.getRegisters().a;
      const rlcaCarry = cpu.getCarryFlag();

      // RLA: 0b10000001 -> 0b00000010 (carry=1)
      // RLCA: 0b10000001 -> 0b00000011 (carry=1)
      expect(rlaResult).toBe(0b00000010);
      expect(rlcaResult).toBe(0b00000011);
      expect(rlaCarry).toBe(true);
      expect(rlcaCarry).toBe(true);
    });

    test('flag interactions with subsequent operations', () => {
      // Set up scenario where rotation sets carry, then test if it affects next operation
      setupRotationTest(cpu, 0b10000000, false);
      mmu.writeByte(0x8000, 0x07); // RLCA - should set carry

      cpu.step();
      expect(cpu.getCarryFlag()).toBe(true);

      // Next operation should see the carry flag
      cpu.setProgramCounter(0x8001);
      cpu.setRegisterB(0x00);
      mmu.writeByte(0x8001, 0x88); // ADC A,B - should use carry from rotation

      const aBeforeAdc = cpu.getRegisters().a;
      cpu.step();

      // ADC should add 1 due to carry flag from rotation
      expect(cpu.getRegisters().a).toBe(aBeforeAdc + 1);
    });
  });

  describe('Zero Flag Behavior Verification', () => {
    test('rotation instructions never set zero flag even for zero results', () => {
      // This is a key difference from CB-prefixed rotate instructions
      const testCases = [
        { instruction: 0x07, value: 0x00, carry: false }, // RLCA
        { instruction: 0x0f, value: 0x00, carry: false }, // RRCA
        { instruction: 0x17, value: 0x00, carry: false }, // RLA
        { instruction: 0x1f, value: 0x00, carry: false }, // RRA
      ];

      testCases.forEach(({ instruction, value, carry }) => {
        setupRotationTest(cpu, value, carry);
        mmu.writeByte(0x8000, instruction);

        cpu.step();

        // Even though result is 0x00, zero flag should not be set
        expect(cpu.getRegisters().a).toBe(0x00);
        expect(cpu.getZeroFlag()).toBe(false);

        // Reset for next test
        cpu = new CPU(mmu) as CPUTestingComponent;
      });
    });
  });

  describe('Register and Memory State Preservation', () => {
    test('rotation instructions only affect A register and flags', () => {
      // Setup all registers with known values
      setupRotationTest(cpu, 0xaa);
      cpu.setRegisterB(0x11);
      cpu.setRegisterC(0x22);
      cpu.setRegisterD(0x33);
      cpu.setRegisterE(0x44);
      cpu.setRegisterH(0x55);
      cpu.setRegisterL(0x66);
      const initialSP = 0xfffe;
      cpu.setStackPointer(initialSP);

      // Capture initial register values (not references)
      const initialA = cpu.getRegisters().a;
      const initialB = cpu.getRegisters().b;
      const initialC = cpu.getRegisters().c;
      const initialD = cpu.getRegisters().d;
      const initialE = cpu.getRegisters().e;
      const initialH = cpu.getRegisters().h;
      const initialL = cpu.getRegisters().l;

      // Debug: check initial state
      expect(initialA).toBe(170); // Should be 0xaa (170)

      // Perform rotation
      mmu.writeByte(0x8000, 0x17); // RLA
      cpu.step();

      // Capture final register values (not references)
      const finalA = cpu.getRegisters().a;
      const finalB = cpu.getRegisters().b;
      const finalC = cpu.getRegisters().c;
      const finalD = cpu.getRegisters().d;
      const finalE = cpu.getRegisters().e;
      const finalH = cpu.getRegisters().h;
      const finalL = cpu.getRegisters().l;
      const finalPC = cpu.getRegisters().pc;

      // Debug: check expected result
      expect(finalA).toBe(84); // Should be 0x54 (84) after RLA

      // Only A register and flags should change
      expect(finalB).toBe(initialB);
      expect(finalC).toBe(initialC);
      expect(finalD).toBe(initialD);
      expect(finalE).toBe(initialE);
      expect(finalH).toBe(initialH);
      expect(finalL).toBe(initialL);
      expect(cpu.getRegisters().sp).toBe(initialSP);
      expect(finalPC).toBe(0x8001); // PC should advance

      // A register should change
      expect(finalA).not.toBe(initialA);
    });
  });
});
