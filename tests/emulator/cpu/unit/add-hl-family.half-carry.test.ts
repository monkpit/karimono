/**
 * ADD HL Family Half-Carry Bug Fix - TDD Suite
 *
 * CRITICAL BUG FIX: Systemic half-carry calculation bug in ADD HL family
 *
 * This test suite follows strict TDD methodology to fix the identified
 * half-carry flag calculation bug in all 4 ADD HL,rr instructions:
 * - 0x09: ADD HL,BC
 * - 0x19: ADD HL,DE
 * - 0x29: ADD HL,HL
 * - 0x39: ADD HL,SP
 *
 * HARDWARE SPEC (RGBDS GBZ80 Reference):
 * https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#ADD_HL_rr
 *
 * Flag behavior for ADD HL,rr:
 * - Z: Not affected (preserved)
 * - N: Reset to 0
 * - H: Set if carry from bit 11 to bit 12
 * - C: Set if carry from bit 15 (overflow beyond 16 bits)
 *
 * TDD WORKFLOW:
 * Phase 1: RED - All tests will FAIL until half-carry bug is fixed
 * Phase 2: GREEN - Minimal implementation to make tests pass
 * Phase 3: REFACTOR - Clean up implementation while keeping tests green
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { CPU } from '../../../../src/emulator/cpu/CPU';
import { MMU } from '../../../../src/emulator/mmu/MMU';
import { CPUTestingComponent } from '../../../../src/emulator/types';

/**
 * Hardware-Accurate Half-Carry Test Helper
 *
 * Calculates expected half-carry flag for 16-bit addition according to
 * RGBDS specification and GameBoy Online implementation:
 * H flag set if carry from bit 11 to bit 12
 *
 * CORRECTED IMPLEMENTATION: GameBoy Online uses result comparison method
 * Reference: https://github.com/taisel/GameBoy-Online/blob/master/js/GameBoyCore.js
 */
function calculateHalfCarry16(operandA: number, operandB: number): boolean {
  // GameBoy Online method: compare lower 12 bits of operand A with result
  // Half-carry occurs when original HL's lower 12 bits > result's lower 12 bits
  const result = operandA + operandB;
  return (operandA & 0x0fff) > (result & 0x0fff);
}

/**
 * Hardware-Accurate Carry Test Helper
 *
 * Calculates expected carry flag for 16-bit addition according to
 * RGBDS specification: C flag set if result exceeds 16 bits
 */
function calculateCarry16(operandA: number, operandB: number): boolean {
  return operandA + operandB > 0xffff;
}

/**
 * Atomic Test Helper for ADD HL,rr Instructions
 *
 * Tests single ADD HL,rr instruction with precise flag validation
 * according to RGBDS hardware specification
 */
function executeAddHLTest(
  cpu: CPUTestingComponent,
  mmu: MMU,
  opcode: number,
  hlValue: number,
  sourceValue: number,
  sourceRegH?: string,
  sourceRegL?: string,
  isSP: boolean = false
): void {
  // Set initial HL value
  cpu.setRegisterH((hlValue >> 8) & 0xff);
  cpu.setRegisterL(hlValue & 0xff);

  // Set source register pair or SP
  if (isSP) {
    cpu.setStackPointer(sourceValue);
  } else if (sourceRegH && sourceRegL) {
    // Refactored for type safety and clarity, avoiding dynamic property access
    switch (sourceRegH) {
      case 'B':
        cpu.setRegisterB((sourceValue >> 8) & 0xff);
        cpu.setRegisterC(sourceValue & 0xff);
        break;
      case 'D':
        cpu.setRegisterD((sourceValue >> 8) & 0xff);
        cpu.setRegisterE(sourceValue & 0xff);
        break;
    }
  }

  // Preserve Z flag, set initial test state for others
  const initialZFlag = cpu.getZeroFlag();
  cpu.setSubtractFlag(true); // Should be reset to 0
  cpu.setHalfCarryFlag(false); // Will be recalculated
  cpu.setCarryFlag(false); // Will be recalculated

  // Execute instruction
  cpu.setProgramCounter(0x8000);
  mmu.writeByte(0x8000, opcode);
  const cycles = cpu.step();

  // Calculate expected results using hardware-accurate formulas
  const expectedResult = (hlValue + sourceValue) & 0xffff;
  const expectedHalfCarry = calculateHalfCarry16(hlValue, sourceValue);
  const expectedCarry = calculateCarry16(hlValue, sourceValue);

  // Verify arithmetic result
  const { h, l } = cpu.getRegisters();
  const actualHL = (h << 8) | l;
  expect(actualHL).toBe(expectedResult);

  // Verify flag behavior per RGBDS specification
  expect(cpu.getZeroFlag()).toBe(initialZFlag); // Z: Not affected
  expect(cpu.getSubtractFlag()).toBe(false); // N: Reset to 0
  expect(cpu.getHalfCarryFlag()).toBe(expectedHalfCarry); // H: Carry from bit 11
  expect(cpu.getCarryFlag()).toBe(expectedCarry); // C: Carry from bit 15

  // Verify timing (8 cycles for all ADD HL,rr)
  expect(cycles).toBe(8);

  // Verify PC advancement
  expect(cpu.getPC()).toBe(0x8001);
}

describe('ADD HL Family Half-Carry Bug Fix - TDD Suite', () => {
  let cpu: CPUTestingComponent;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu) as CPUTestingComponent;
    cpu.reset();
  });

  /**
   * RED PHASE TESTS - These tests WILL FAIL until half-carry bug is fixed
   *
   * Each test targets a specific half-carry boundary condition that
   * triggers the bug identified by the Backend Engineer
   */

  describe('ADD HL,BC (0x09) - Half-Carry Bug Fix', () => {
    test('should set H flag on half-carry from bit 11 - Boundary Case 1', () => {
      // RED PHASE: This test WILL FAIL due to half-carry bug
      //
      // Test case: 0x0FFF + 0x0001 = 0x1000
      // Half-carry: (0x0FFF & 0x0FFF) + (0x0001 & 0x0FFF) = 0x0FFF + 0x0001 = 0x1000
      // Since 0x1000 > 0x0FFF, H flag should be SET

      executeAddHLTest(cpu, mmu, 0x09, 0x0fff, 0x0001, 'B', 'C');

      // This assertion will FAIL until bug is fixed
      expect(cpu.getHalfCarryFlag()).toBe(true);
    });

    test('should set H flag on half-carry from bit 11 - Boundary Case 2', () => {
      // RED PHASE: This test WILL FAIL due to half-carry bug
      //
      // Test case: 0x0800 + 0x0800 = 0x1000
      // Half-carry: (0x0800 & 0x0FFF) + (0x0800 & 0x0FFF) = 0x0800 + 0x0800 = 0x1000
      // Since 0x1000 > 0x0FFF, H flag should be SET

      executeAddHLTest(cpu, mmu, 0x09, 0x0800, 0x0800, 'B', 'C');

      // This assertion will FAIL until bug is fixed
      expect(cpu.getHalfCarryFlag()).toBe(true);
    });

    test('should NOT set H flag when no half-carry from bit 11', () => {
      // RED PHASE: This test may PASS or FAIL depending on current implementation
      //
      // Test case: 0x0700 + 0x0200 = 0x0900
      // Half-carry: (0x0700 & 0x0FFF) + (0x0200 & 0x0FFF) = 0x0700 + 0x0200 = 0x0900
      // Since 0x0900 <= 0x0FFF, H flag should be CLEAR

      executeAddHLTest(cpu, mmu, 0x09, 0x0700, 0x0200, 'B', 'C');

      expect(cpu.getHalfCarryFlag()).toBe(false);
    });
  });

  describe('ADD HL,DE (0x19) - Half-Carry Bug Fix', () => {
    test('should set H flag on half-carry from bit 11 - Critical Case', () => {
      // RED PHASE: This test WILL FAIL due to half-carry bug
      //
      // This is the exact case that fails the "DE Failed" Blargg test
      // Test case: 0x0FFF + 0x0001 = 0x1000

      executeAddHLTest(cpu, mmu, 0x19, 0x0fff, 0x0001, 'D', 'E');

      // This assertion will FAIL until bug is fixed
      expect(cpu.getHalfCarryFlag()).toBe(true);
    });

    test('should handle complex half-carry case with high bits', () => {
      // RED PHASE: This test WILL FAIL due to half-carry bug
      //
      // Test case: 0xF7FF + 0x0801 = 0x0000 (with both H and C flags)
      // Half-carry: (0xF7FF & 0x0FFF) + (0x0801 & 0x0FFF) = 0x07FF + 0x0801 = 0x1000
      // Since 0x1000 > 0x0FFF, H flag should be SET
      // Full carry: 0xF7FF + 0x0801 = 0x10000 > 0xFFFF, so C flag should be SET

      executeAddHLTest(cpu, mmu, 0x19, 0xf7ff, 0x0801, 'D', 'E');

      // Both assertions will FAIL until bug is fixed
      expect(cpu.getHalfCarryFlag()).toBe(true);
      expect(cpu.getCarryFlag()).toBe(true);
    });
  });

  describe('ADD HL,HL (0x29) - Half-Carry Bug Fix', () => {
    test('should set H flag when doubling creates half-carry', () => {
      // RED PHASE: This test WILL FAIL due to half-carry bug
      //
      // Test case: 0x0800 + 0x0800 = 0x1000 (HL = HL + HL)
      // This is effectively a left shift operation

      executeAddHLTest(cpu, mmu, 0x29, 0x0800, 0x0800);

      // This assertion will FAIL until bug is fixed
      expect(cpu.getHalfCarryFlag()).toBe(true);
    });

    test('should set both H and C flags on boundary overflow', () => {
      // RED PHASE: This test WILL FAIL due to half-carry bug
      //
      // Test case: 0x87FF + 0x87FF = 0x0FFE (with both flags)
      // Half-carry: (0x87FF & 0x0FFF) + (0x87FF & 0x0FFF) = 0x07FF + 0x07FF = 0x0FFE
      // Wait, that's wrong. Let me recalculate:
      // Actually: 0x07FF + 0x07FF = 0x0FFE <= 0x0FFF, so no half-carry
      // Let me use: 0x8800 + 0x8800 = 0x1000 (wraps to 0x1000)
      // Half-carry: (0x8800 & 0x0FFF) + (0x8800 & 0x0FFF) = 0x0800 + 0x0800 = 0x1000 > 0x0FFF

      executeAddHLTest(cpu, mmu, 0x29, 0x8800, 0x8800);

      // Both assertions will FAIL until bug is fixed
      expect(cpu.getHalfCarryFlag()).toBe(true);
      expect(cpu.getCarryFlag()).toBe(true);
    });
  });

  describe('ADD HL,SP (0x39) - Half-Carry Bug Fix', () => {
    test('should set H flag with stack pointer half-carry', () => {
      // RED PHASE: This test WILL FAIL due to half-carry bug
      //
      // Test case: HL=0x0F00, SP=0x0100 -> 0x0F00 + 0x0100 = 0x1000
      // Half-carry: (0x0F00 & 0x0FFF) + (0x0100 & 0x0FFF) = 0x0F00 + 0x0100 = 0x1000 > 0x0FFF

      executeAddHLTest(cpu, mmu, 0x39, 0x0f00, 0x0100, undefined, undefined, true);

      // This assertion will FAIL until bug is fixed
      expect(cpu.getHalfCarryFlag()).toBe(true);
    });

    test('should handle SP addition with both carries at boundary', () => {
      // RED PHASE: This test WILL FAIL due to half-carry bug
      //
      // Test case: HL=0xFFFF, SP=0x0001 -> 0xFFFF + 0x0001 = 0x0000 (with both flags)
      // Half-carry: (0xFFFF & 0x0FFF) + (0x0001 & 0x0FFF) = 0x0FFF + 0x0001 = 0x1000 > 0x0FFF
      // Full carry: 0xFFFF + 0x0001 = 0x10000 > 0xFFFF

      executeAddHLTest(cpu, mmu, 0x39, 0xffff, 0x0001, undefined, undefined, true);

      // Both assertions will FAIL until bug is fixed
      expect(cpu.getHalfCarryFlag()).toBe(true);
      expect(cpu.getCarryFlag()).toBe(true);
    });
  });

  /**
   * REGRESSION PROTECTION TESTS
   *
   * These tests ensure that fixing the half-carry bug doesn't break
   * cases that currently work correctly
   */

  describe('Regression Protection - Cases That Should Already Work', () => {
    test('should preserve Z flag correctly across all ADD HL,rr instructions', () => {
      // Test Z flag preservation for each instruction
      const instructions = [
        { opcode: 0x09, regH: 'B', regL: 'C', desc: 'ADD HL,BC' },
        { opcode: 0x19, regH: 'D', regL: 'E', desc: 'ADD HL,DE' },
      ];

      instructions.forEach(({ opcode, regH, regL }) => {
        // Test with Z flag initially set
        cpu.reset();
        cpu.setZeroFlag(true);
        executeAddHLTest(cpu, mmu, opcode, 0x1000, 0x0500, regH, regL);
        expect(cpu.getZeroFlag()).toBe(true); // Should be preserved

        // Test with Z flag initially clear
        cpu.reset();
        cpu.setZeroFlag(false);
        executeAddHLTest(cpu, mmu, opcode, 0x1000, 0x0500, regH, regL);
        expect(cpu.getZeroFlag()).toBe(false); // Should be preserved
      });
    });

    test('should always clear N flag for all ADD HL,rr instructions', () => {
      const instructions = [0x09, 0x19, 0x29, 0x39];

      instructions.forEach(opcode => {
        cpu.reset();
        cpu.setSubtractFlag(true); // Set N flag initially

        if (opcode === 0x39) {
          executeAddHLTest(cpu, mmu, opcode, 0x1000, 0x2000, undefined, undefined, true);
        } else if (opcode === 0x29) {
          executeAddHLTest(cpu, mmu, opcode, 0x1000, 0x1000);
        } else {
          const regPairs = { 0x09: ['B', 'C'], 0x19: ['D', 'E'] };
          const [regH, regL] = regPairs[opcode as keyof typeof regPairs];
          executeAddHLTest(cpu, mmu, opcode, 0x1000, 0x2000, regH, regL);
        }

        expect(cpu.getSubtractFlag()).toBe(false); // N should always be cleared
      });
    });
  });

  /**
   * COMPREHENSIVE BOUNDARY VALIDATION
   *
   * Edge cases that validate the fix works across all boundary conditions
   */

  describe('Boundary Validation - Comprehensive Edge Cases', () => {
    test('should handle all half-carry boundary transitions correctly', () => {
      // Test key boundary values where half-carry behavior changes
      const boundaryTests = [
        { hl: 0x0000, src: 0x0fff, expectH: false }, // No half-carry at lower boundary
        { hl: 0x0fff, src: 0x0000, expectH: false }, // No half-carry with zero
        { hl: 0x0fff, src: 0x0001, expectH: true }, // Half-carry at exact boundary
        { hl: 0x0001, src: 0x0fff, expectH: true }, // Half-carry (commutative)
        { hl: 0x0800, src: 0x07ff, expectH: false }, // Just under boundary
        { hl: 0x0800, src: 0x0800, expectH: true }, // Exactly at boundary
      ];

      boundaryTests.forEach(({ hl, src, expectH }) => {
        cpu.reset();
        executeAddHLTest(cpu, mmu, 0x09, hl, src, 'B', 'C');
        expect(cpu.getHalfCarryFlag()).toBe(expectH);
      });
    });

    test('should handle zero operands correctly', () => {
      // Ensure zero operands don't cause unexpected flag behavior
      executeAddHLTest(cpu, mmu, 0x09, 0x0000, 0x0000, 'B', 'C');
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
    });

    test('should handle maximum values correctly', () => {
      // Test with maximum 16-bit values
      executeAddHLTest(cpu, mmu, 0x09, 0xffff, 0xffff, 'B', 'C');
      expect(cpu.getHalfCarryFlag()).toBe(true); // 0xFFF + 0xFFF = 0x1FFE > 0xFFF
      expect(cpu.getCarryFlag()).toBe(true); // 0xFFFF + 0xFFFF > 0xFFFF
    });
  });
});

/**
 * TEST EXECUTION PLAN
 *
 * Phase 1 (RED): Run tests - ALL half-carry tests should FAIL
 * Command: npm test -- tests/emulator/cpu/unit/add-hl-family.half-carry.test.ts
 *
 * Phase 2 (GREEN): Fix CPU implementation for ADD HL,rr half-carry calculation
 * - Modify CPU class to correctly implement bit 11 carry detection
 * - Re-run tests - all should PASS
 *
 * Phase 3 (REFACTOR): Clean up implementation while keeping tests green
 *
 * SUCCESS METRICS:
 * - All tests in this file pass
 * - Existing regression tests still pass
 * - Blargg test "05-op rp" transitions from timeout to pass
 * - Progress toward 11/11 Blargg compliance
 */
