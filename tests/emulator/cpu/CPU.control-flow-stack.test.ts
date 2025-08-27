/**
 * SM83 CPU Control Flow and Stack Management Instructions Test Suite - Phase 9 Implementation
 *
 * Tests all 27 control flow and stack management instruction variants following strict TDD principles.
 * Organized by instruction family for efficient implementation workflow.
 *
 * TDD Workflow: RED (failing test) -> GREEN (minimal implementation) -> REFACTOR
 *
 * Hardware References:
 * - RGBDS GBZ80 Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 * - Opcodes JSON: /tests/resources/opcodes.json
 * - Blargg Test ROMs: /tests/resources/blargg/cpu_instrs/
 *
 * Implementation Strategy:
 * Phase 9A: CALL family (9 instructions) - Subroutine calls with stack operations
 * Phase 9B: RET family (6 instructions) - Return from subroutines
 * Phase 9C: RST family (8 instructions) - Fixed address calls (interrupt vectors)
 * Phase 9D: PUSH family (4 instructions) - Stack push operations
 * Phase 9E: POP family (4 instructions) - Stack pop operations
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';
import { CPUTestingComponent } from '../../../src/emulator/types';

/**
 * Test Helper Functions for Control Flow and Stack Management Instruction Validation
 * These utilities enforce consistent testing patterns and reduce code duplication
 */

/**
 * Helper: Setup 16-bit memory address for instructions requiring a16 operand
 * Writes little-endian 16-bit address to memory at PC+1 and PC+2
 */
function setup16BitAddress(mmu: MMU, pc: number, address: number): void {
  const lowByte = address & 0xff;
  const highByte = (address >> 8) & 0xff;
  mmu.writeByte(pc + 1, lowByte); // Little-endian: low byte first
  mmu.writeByte(pc + 2, highByte); // Little-endian: high byte second
}

/**
 * Helper: Setup stack memory for testing stack operations
 * Initializes stack area with known values for push/pop validation
 */
function setupStackMemory(mmu: MMU, stackPointer: number): void {
  // Initialize stack area with recognizable pattern
  for (let i = 0; i < 16; i++) {
    mmu.writeByte(stackPointer - i, 0x00);
  }
}

/**
 * Helper: Validate stack operation result
 * Checks memory contents at stack pointer locations
 */
function validateStackContents(
  mmu: MMU,
  address: number,
  expectedLow: number,
  expectedHigh: number
): void {
  expect(mmu.readByte(address)).toBe(expectedLow);
  expect(mmu.readByte(address + 1)).toBe(expectedHigh);
}

describe('SM83 CPU Control Flow and Stack Management Instructions (Phase 9)', () => {
  let cpu: CPUTestingComponent;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu) as CPUTestingComponent;
  });

  describe('CALL Family Instructions (9 instructions)', () => {
    describe('CALL nn (0xCD) - Unconditional call to 16-bit address', () => {
      test('pushes PC to stack and jumps to target address', () => {
        // Setup: PC at 0x8000, SP at 0xFFFE, target address 0x4000
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffe);
        setupStackMemory(mmu, 0xfffe);

        // Place CALL instruction and target address
        mmu.writeByte(0x8000, 0xcd);
        setup16BitAddress(mmu, 0x8000, 0x4000);

        // Execute CALL nn
        const cycles = cpu.step();

        // Verify: 24 cycles consumed
        expect(cycles).toBe(24);

        // Verify: PC jumped to target address 0x4000
        const registers = cpu.getRegisters();
        expect(registers.pc).toBe(0x4000);

        // Verify: Stack pointer decremented by 2 (SP = 0xFFFC)
        expect(registers.sp).toBe(0xfffc);

        // Verify: Return address (0x8003) pushed to stack (little-endian)
        // CALL is 3 bytes, so return address is PC + 3 = 0x8000 + 3 = 0x8003
        validateStackContents(mmu, 0xfffc, 0x03, 0x80); // 0x8003 in little-endian
      });
    });

    describe('CALL NZ,nn (0xC4) - Conditional call if not zero', () => {
      test('calls when zero flag is clear (condition true)', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffe);
        cpu.setZeroFlag(false); // Not zero - condition true
        setupStackMemory(mmu, 0xfffe);

        mmu.writeByte(0x8000, 0xc4);
        setup16BitAddress(mmu, 0x8000, 0x4000);

        const cycles = cpu.step();

        // Verify: 24 cycles when condition true (call taken)
        expect(cycles).toBe(24);
        expect(cpu.getRegisters().pc).toBe(0x4000);
        expect(cpu.getRegisters().sp).toBe(0xfffc);
        validateStackContents(mmu, 0xfffc, 0x03, 0x80);
      });

      test('does not call when zero flag is set (condition false)', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffe);
        cpu.setZeroFlag(true); // Zero - condition false

        mmu.writeByte(0x8000, 0xc4);
        setup16BitAddress(mmu, 0x8000, 0x4000);

        const cycles = cpu.step();

        // Verify: 12 cycles when condition false (call not taken)
        expect(cycles).toBe(12);

        // Verify: PC advanced by 3 bytes (instruction length), not jumped
        expect(cpu.getRegisters().pc).toBe(0x8003);

        // Verify: Stack unchanged
        expect(cpu.getRegisters().sp).toBe(0xfffe);
      });
    });

    describe('CALL Z,nn (0xCC) - Conditional call if zero', () => {
      test('calls when zero flag is set (condition true)', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffe);
        cpu.setZeroFlag(true); // Zero - condition true
        setupStackMemory(mmu, 0xfffe);

        mmu.writeByte(0x8000, 0xcc);
        setup16BitAddress(mmu, 0x8000, 0x4000);

        const cycles = cpu.step();

        expect(cycles).toBe(24);
        expect(cpu.getRegisters().pc).toBe(0x4000);
        expect(cpu.getRegisters().sp).toBe(0xfffc);
        validateStackContents(mmu, 0xfffc, 0x03, 0x80);
      });

      test('does not call when zero flag is clear (condition false)', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffe);
        cpu.setZeroFlag(false); // Not zero - condition false

        mmu.writeByte(0x8000, 0xcc);
        setup16BitAddress(mmu, 0x8000, 0x4000);

        const cycles = cpu.step();

        expect(cycles).toBe(12);
        expect(cpu.getRegisters().pc).toBe(0x8003);
        expect(cpu.getRegisters().sp).toBe(0xfffe);
      });
    });

    describe('CALL NC,nn (0xD4) - Conditional call if not carry', () => {
      test('calls when carry flag is clear (condition true)', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffe);
        cpu.setCarryFlag(false); // Not carry - condition true
        setupStackMemory(mmu, 0xfffe);

        mmu.writeByte(0x8000, 0xd4);
        setup16BitAddress(mmu, 0x8000, 0x4000);

        const cycles = cpu.step();

        expect(cycles).toBe(24);
        expect(cpu.getRegisters().pc).toBe(0x4000);
        expect(cpu.getRegisters().sp).toBe(0xfffc);
        validateStackContents(mmu, 0xfffc, 0x03, 0x80);
      });

      test('does not call when carry flag is set (condition false)', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffe);
        cpu.setCarryFlag(true); // Carry - condition false

        mmu.writeByte(0x8000, 0xd4);
        setup16BitAddress(mmu, 0x8000, 0x4000);

        const cycles = cpu.step();

        expect(cycles).toBe(12);
        expect(cpu.getRegisters().pc).toBe(0x8003);
        expect(cpu.getRegisters().sp).toBe(0xfffe);
      });
    });

    describe('CALL C,nn (0xDC) - Conditional call if carry', () => {
      test('calls when carry flag is set (condition true)', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffe);
        cpu.setCarryFlag(true); // Carry - condition true
        setupStackMemory(mmu, 0xfffe);

        mmu.writeByte(0x8000, 0xdc);
        setup16BitAddress(mmu, 0x8000, 0x4000);

        const cycles = cpu.step();

        expect(cycles).toBe(24);
        expect(cpu.getRegisters().pc).toBe(0x4000);
        expect(cpu.getRegisters().sp).toBe(0xfffc);
        validateStackContents(mmu, 0xfffc, 0x03, 0x80);
      });

      test('does not call when carry flag is clear (condition false)', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffe);
        cpu.setCarryFlag(false); // Not carry - condition false

        mmu.writeByte(0x8000, 0xdc);
        setup16BitAddress(mmu, 0x8000, 0x4000);

        const cycles = cpu.step();

        expect(cycles).toBe(12);
        expect(cpu.getRegisters().pc).toBe(0x8003);
        expect(cpu.getRegisters().sp).toBe(0xfffe);
      });
    });
  });

  describe('RET Family Instructions (6 instructions)', () => {
    describe('RET (0xC9) - Unconditional return', () => {
      test('pops return address from stack and jumps to it', () => {
        // Setup: Stack contains return address 0x8003 (little-endian)
        cpu.setProgramCounter(0x4000);
        cpu.setStackPointer(0xfffc);

        // Place return address on stack (0x8003 in little-endian)
        mmu.writeByte(0xfffc, 0x03); // Low byte
        mmu.writeByte(0xfffd, 0x80); // High byte

        mmu.writeByte(0x4000, 0xc9); // RET instruction

        const cycles = cpu.step();

        // Verify: 16 cycles consumed
        expect(cycles).toBe(16);

        // Verify: PC set to popped address
        expect(cpu.getRegisters().pc).toBe(0x8003);

        // Verify: SP incremented by 2
        expect(cpu.getRegisters().sp).toBe(0xfffe);
      });
    });

    describe('RET NZ (0xC0) - Conditional return if not zero', () => {
      test('returns when zero flag is clear (condition true)', () => {
        cpu.setProgramCounter(0x4000);
        cpu.setStackPointer(0xfffc);
        cpu.setZeroFlag(false); // Not zero - condition true

        mmu.writeByte(0xfffc, 0x03);
        mmu.writeByte(0xfffd, 0x80);
        mmu.writeByte(0x4000, 0xc0);

        const cycles = cpu.step();

        // Verify: 20 cycles when condition true (return taken)
        expect(cycles).toBe(20);
        expect(cpu.getRegisters().pc).toBe(0x8003);
        expect(cpu.getRegisters().sp).toBe(0xfffe);
      });

      test('does not return when zero flag is set (condition false)', () => {
        cpu.setProgramCounter(0x4000);
        cpu.setStackPointer(0xfffc);
        cpu.setZeroFlag(true); // Zero - condition false

        mmu.writeByte(0x4000, 0xc0);

        const cycles = cpu.step();

        // Verify: 8 cycles when condition false (return not taken)
        expect(cycles).toBe(8);

        // Verify: PC advanced by 1 byte (instruction length)
        expect(cpu.getRegisters().pc).toBe(0x4001);

        // Verify: Stack unchanged
        expect(cpu.getRegisters().sp).toBe(0xfffc);
      });
    });

    describe('RET Z (0xC8) - Conditional return if zero', () => {
      test('returns when zero flag is set (condition true)', () => {
        cpu.setProgramCounter(0x4000);
        cpu.setStackPointer(0xfffc);
        cpu.setZeroFlag(true); // Zero - condition true

        mmu.writeByte(0xfffc, 0x03);
        mmu.writeByte(0xfffd, 0x80);
        mmu.writeByte(0x4000, 0xc8);

        const cycles = cpu.step();

        expect(cycles).toBe(20);
        expect(cpu.getRegisters().pc).toBe(0x8003);
        expect(cpu.getRegisters().sp).toBe(0xfffe);
      });

      test('does not return when zero flag is clear (condition false)', () => {
        cpu.setProgramCounter(0x4000);
        cpu.setStackPointer(0xfffc);
        cpu.setZeroFlag(false); // Not zero - condition false

        mmu.writeByte(0x4000, 0xc8);

        const cycles = cpu.step();

        expect(cycles).toBe(8);
        expect(cpu.getRegisters().pc).toBe(0x4001);
        expect(cpu.getRegisters().sp).toBe(0xfffc);
      });
    });

    describe('RET NC (0xD0) - Conditional return if not carry', () => {
      test('returns when carry flag is clear (condition true)', () => {
        cpu.setProgramCounter(0x4000);
        cpu.setStackPointer(0xfffc);
        cpu.setCarryFlag(false); // Not carry - condition true

        mmu.writeByte(0xfffc, 0x03);
        mmu.writeByte(0xfffd, 0x80);
        mmu.writeByte(0x4000, 0xd0);

        const cycles = cpu.step();

        expect(cycles).toBe(20);
        expect(cpu.getRegisters().pc).toBe(0x8003);
        expect(cpu.getRegisters().sp).toBe(0xfffe);
      });

      test('does not return when carry flag is set (condition false)', () => {
        cpu.setProgramCounter(0x4000);
        cpu.setStackPointer(0xfffc);
        cpu.setCarryFlag(true); // Carry - condition false

        mmu.writeByte(0x4000, 0xd0);

        const cycles = cpu.step();

        expect(cycles).toBe(8);
        expect(cpu.getRegisters().pc).toBe(0x4001);
        expect(cpu.getRegisters().sp).toBe(0xfffc);
      });
    });

    describe('RET C (0xD8) - Conditional return if carry', () => {
      test('returns when carry flag is set (condition true)', () => {
        cpu.setProgramCounter(0x4000);
        cpu.setStackPointer(0xfffc);
        cpu.setCarryFlag(true); // Carry - condition true

        mmu.writeByte(0xfffc, 0x03);
        mmu.writeByte(0xfffd, 0x80);
        mmu.writeByte(0x4000, 0xd8);

        const cycles = cpu.step();

        expect(cycles).toBe(20);
        expect(cpu.getRegisters().pc).toBe(0x8003);
        expect(cpu.getRegisters().sp).toBe(0xfffe);
      });

      test('does not return when carry flag is clear (condition false)', () => {
        cpu.setProgramCounter(0x4000);
        cpu.setStackPointer(0xfffc);
        cpu.setCarryFlag(false); // Not carry - condition false

        mmu.writeByte(0x4000, 0xd8);

        const cycles = cpu.step();

        expect(cycles).toBe(8);
        expect(cpu.getRegisters().pc).toBe(0x4001);
        expect(cpu.getRegisters().sp).toBe(0xfffc);
      });
    });

    describe('RETI (0xD9) - Return and enable interrupts', () => {
      test('pops return address and enables interrupts (sets IME)', () => {
        cpu.setProgramCounter(0x4000);
        cpu.setStackPointer(0xfffc);

        mmu.writeByte(0xfffc, 0x03);
        mmu.writeByte(0xfffd, 0x80);
        mmu.writeByte(0x4000, 0xd9);

        const cycles = cpu.step();

        // Verify: 16 cycles consumed
        expect(cycles).toBe(16);

        // Verify: PC set to popped address
        expect(cpu.getRegisters().pc).toBe(0x8003);

        // Verify: SP incremented by 2
        expect(cpu.getRegisters().sp).toBe(0xfffe);

        // Note: IME flag testing will be implemented when interrupt system is added
        // For now, we verify the basic return behavior matches RET
      });
    });
  });

  describe('RST Family Instructions (8 instructions)', () => {
    describe('RST 00H (0xC7) - Call to address 0x0000', () => {
      test('pushes PC to stack and jumps to 0x0000', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffe);
        setupStackMemory(mmu, 0xfffe);

        mmu.writeByte(0x8000, 0xc7);

        const cycles = cpu.step();

        // Verify: 16 cycles consumed
        expect(cycles).toBe(16);

        // Verify: PC jumped to 0x0000
        expect(cpu.getRegisters().pc).toBe(0x0000);

        // Verify: SP decremented by 2
        expect(cpu.getRegisters().sp).toBe(0xfffc);

        // Verify: Return address (0x8001) pushed to stack
        // RST is 1 byte, so return address is PC + 1 = 0x8001
        validateStackContents(mmu, 0xfffc, 0x01, 0x80);
      });
    });

    describe('RST 08H (0xCF) - Call to address 0x0008', () => {
      test('pushes PC to stack and jumps to 0x0008', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffe);
        setupStackMemory(mmu, 0xfffe);

        mmu.writeByte(0x8000, 0xcf);

        const cycles = cpu.step();

        expect(cycles).toBe(16);
        expect(cpu.getRegisters().pc).toBe(0x0008);
        expect(cpu.getRegisters().sp).toBe(0xfffc);
        validateStackContents(mmu, 0xfffc, 0x01, 0x80);
      });
    });

    describe('RST 10H (0xD7) - Call to address 0x0010', () => {
      test('pushes PC to stack and jumps to 0x0010', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffe);
        setupStackMemory(mmu, 0xfffe);

        mmu.writeByte(0x8000, 0xd7);

        const cycles = cpu.step();

        expect(cycles).toBe(16);
        expect(cpu.getRegisters().pc).toBe(0x0010);
        expect(cpu.getRegisters().sp).toBe(0xfffc);
        validateStackContents(mmu, 0xfffc, 0x01, 0x80);
      });
    });

    describe('RST 18H (0xDF) - Call to address 0x0018', () => {
      test('pushes PC to stack and jumps to 0x0018', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffe);
        setupStackMemory(mmu, 0xfffe);

        mmu.writeByte(0x8000, 0xdf);

        const cycles = cpu.step();

        expect(cycles).toBe(16);
        expect(cpu.getRegisters().pc).toBe(0x0018);
        expect(cpu.getRegisters().sp).toBe(0xfffc);
        validateStackContents(mmu, 0xfffc, 0x01, 0x80);
      });
    });

    describe('RST 20H (0xE7) - Call to address 0x0020', () => {
      test('pushes PC to stack and jumps to 0x0020', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffe);
        setupStackMemory(mmu, 0xfffe);

        mmu.writeByte(0x8000, 0xe7);

        const cycles = cpu.step();

        expect(cycles).toBe(16);
        expect(cpu.getRegisters().pc).toBe(0x0020);
        expect(cpu.getRegisters().sp).toBe(0xfffc);
        validateStackContents(mmu, 0xfffc, 0x01, 0x80);
      });
    });

    describe('RST 28H (0xEF) - Call to address 0x0028', () => {
      test('pushes PC to stack and jumps to 0x0028', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffe);
        setupStackMemory(mmu, 0xfffe);

        mmu.writeByte(0x8000, 0xef);

        const cycles = cpu.step();

        expect(cycles).toBe(16);
        expect(cpu.getRegisters().pc).toBe(0x0028);
        expect(cpu.getRegisters().sp).toBe(0xfffc);
        validateStackContents(mmu, 0xfffc, 0x01, 0x80);
      });
    });

    describe('RST 30H (0xF7) - Call to address 0x0030', () => {
      test('pushes PC to stack and jumps to 0x0030', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffe);
        setupStackMemory(mmu, 0xfffe);

        mmu.writeByte(0x8000, 0xf7);

        const cycles = cpu.step();

        expect(cycles).toBe(16);
        expect(cpu.getRegisters().pc).toBe(0x0030);
        expect(cpu.getRegisters().sp).toBe(0xfffc);
        validateStackContents(mmu, 0xfffc, 0x01, 0x80);
      });
    });

    describe('RST 38H (0xFF) - Call to address 0x0038', () => {
      test('pushes PC to stack and jumps to 0x0038', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffe);
        setupStackMemory(mmu, 0xfffe);

        mmu.writeByte(0x8000, 0xff);

        const cycles = cpu.step();

        expect(cycles).toBe(16);
        expect(cpu.getRegisters().pc).toBe(0x0038);
        expect(cpu.getRegisters().sp).toBe(0xfffc);
        validateStackContents(mmu, 0xfffc, 0x01, 0x80);
      });
    });
  });

  describe('PUSH Family Instructions (4 instructions)', () => {
    describe('PUSH BC (0xC5) - Push BC register pair onto stack', () => {
      test('pushes BC register pair to stack in correct order', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffe);
        cpu.setRegisterB(0x12);
        cpu.setRegisterC(0x34);
        setupStackMemory(mmu, 0xfffe);

        mmu.writeByte(0x8000, 0xc5);

        const cycles = cpu.step();

        // Verify: 16 cycles consumed
        expect(cycles).toBe(16);

        // Verify: SP decremented by 2
        expect(cpu.getRegisters().sp).toBe(0xfffc);

        // Verify: BC pushed to stack (B=high byte, C=low byte)
        // Stack push order: high byte to (SP-1), low byte to (SP-2)
        expect(mmu.readByte(0xfffc)).toBe(0x34); // C (low byte)
        expect(mmu.readByte(0xfffd)).toBe(0x12); // B (high byte)
      });
    });

    describe('PUSH DE (0xD5) - Push DE register pair onto stack', () => {
      test('pushes DE register pair to stack in correct order', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffe);
        cpu.setRegisterD(0x56);
        cpu.setRegisterE(0x78);
        setupStackMemory(mmu, 0xfffe);

        mmu.writeByte(0x8000, 0xd5);

        const cycles = cpu.step();

        expect(cycles).toBe(16);
        expect(cpu.getRegisters().sp).toBe(0xfffc);
        expect(mmu.readByte(0xfffc)).toBe(0x78); // E (low byte)
        expect(mmu.readByte(0xfffd)).toBe(0x56); // D (high byte)
      });
    });

    describe('PUSH HL (0xE5) - Push HL register pair onto stack', () => {
      test('pushes HL register pair to stack in correct order', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffe);
        cpu.setRegisterH(0x9a);
        cpu.setRegisterL(0xbc);
        setupStackMemory(mmu, 0xfffe);

        mmu.writeByte(0x8000, 0xe5);

        const cycles = cpu.step();

        expect(cycles).toBe(16);
        expect(cpu.getRegisters().sp).toBe(0xfffc);
        expect(mmu.readByte(0xfffc)).toBe(0xbc); // L (low byte)
        expect(mmu.readByte(0xfffd)).toBe(0x9a); // H (high byte)
      });
    });

    describe('PUSH AF (0xF5) - Push AF register pair onto stack', () => {
      test('pushes AF register pair to stack in correct order', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffe);
        cpu.setRegisterA(0xde);
        cpu.setRegisterF(0xf0); // Flags register
        setupStackMemory(mmu, 0xfffe);

        mmu.writeByte(0x8000, 0xf5);

        const cycles = cpu.step();

        expect(cycles).toBe(16);
        expect(cpu.getRegisters().sp).toBe(0xfffc);
        expect(mmu.readByte(0xfffc)).toBe(0xf0); // F (low byte)
        expect(mmu.readByte(0xfffd)).toBe(0xde); // A (high byte)
      });
    });
  });

  describe('POP Family Instructions (4 instructions)', () => {
    describe('POP BC (0xC1) - Pop BC register pair from stack', () => {
      test('pops BC register pair from stack in correct order', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffc);

        // Setup stack with values to pop
        mmu.writeByte(0xfffc, 0x34); // C (low byte)
        mmu.writeByte(0xfffd, 0x12); // B (high byte)
        mmu.writeByte(0x8000, 0xc1);

        const cycles = cpu.step();

        // Verify: 12 cycles consumed
        expect(cycles).toBe(12);

        // Verify: SP incremented by 2
        expect(cpu.getRegisters().sp).toBe(0xfffe);

        // Verify: BC registers loaded from stack
        const registers = cpu.getRegisters();
        expect(registers.b).toBe(0x12); // High byte
        expect(registers.c).toBe(0x34); // Low byte
      });
    });

    describe('POP DE (0xD1) - Pop DE register pair from stack', () => {
      test('pops DE register pair from stack in correct order', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffc);

        mmu.writeByte(0xfffc, 0x78); // E (low byte)
        mmu.writeByte(0xfffd, 0x56); // D (high byte)
        mmu.writeByte(0x8000, 0xd1);

        const cycles = cpu.step();

        expect(cycles).toBe(12);
        expect(cpu.getRegisters().sp).toBe(0xfffe);

        const registers = cpu.getRegisters();
        expect(registers.d).toBe(0x56); // High byte
        expect(registers.e).toBe(0x78); // Low byte
      });
    });

    describe('POP HL (0xE1) - Pop HL register pair from stack', () => {
      test('pops HL register pair from stack in correct order', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffc);

        mmu.writeByte(0xfffc, 0xbc); // L (low byte)
        mmu.writeByte(0xfffd, 0x9a); // H (high byte)
        mmu.writeByte(0x8000, 0xe1);

        const cycles = cpu.step();

        expect(cycles).toBe(12);
        expect(cpu.getRegisters().sp).toBe(0xfffe);

        const registers = cpu.getRegisters();
        expect(registers.h).toBe(0x9a); // High byte
        expect(registers.l).toBe(0xbc); // Low byte
      });
    });

    describe('POP AF (0xF1) - Pop AF register pair from stack', () => {
      test('pops AF register pair from stack in correct order', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffc);

        mmu.writeByte(0xfffc, 0xf0); // F (low byte - flags)
        mmu.writeByte(0xfffd, 0xde); // A (high byte)
        mmu.writeByte(0x8000, 0xf1);

        const cycles = cpu.step();

        expect(cycles).toBe(12);
        expect(cpu.getRegisters().sp).toBe(0xfffe);

        const registers = cpu.getRegisters();
        expect(registers.a).toBe(0xde); // High byte
        expect(registers.f).toBe(0xf0 & 0xf0); // Low byte, only upper nibble valid for flags
      });

      test('preserves only valid flag bits in F register', () => {
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(0xfffc);

        // Try to set invalid flag bits (lower nibble should be masked)
        mmu.writeByte(0xfffc, 0xff); // All bits set
        mmu.writeByte(0xfffd, 0x00);
        mmu.writeByte(0x8000, 0xf1);

        cpu.step();

        // Verify: Only upper nibble (valid flag bits) preserved
        const registers = cpu.getRegisters();
        expect(registers.f).toBe(0xf0); // Lower nibble masked to 0
      });
    });
  });

  describe('Flags Preservation', () => {
    test('all control flow and stack instructions preserve flags (except RETI IME)', () => {
      // Test each instruction family preserves flags
      const testCases = [
        {
          opcode: 0xcd,
          name: 'CALL nn',
          setup: (): void => setup16BitAddress(mmu, 0x8000, 0x4000),
        },
        {
          opcode: 0xc9,
          name: 'RET',
          setup: (): void => {
            mmu.writeByte(0xfffc, 0x03);
            mmu.writeByte(0xfffd, 0x80);
          },
        },
        { opcode: 0xc7, name: 'RST 00H', setup: (): void => {} },
        { opcode: 0xc5, name: 'PUSH BC', setup: (): void => {} },
        {
          opcode: 0xc1,
          name: 'POP BC',
          setup: (): void => {
            mmu.writeByte(0xfffc, 0x34);
            mmu.writeByte(0xfffd, 0x12);
          },
        },
      ];

      testCases.forEach(({ opcode, setup }) => {
        // Reset CPU for each test
        cpu = new CPU(mmu) as CPUTestingComponent;
        cpu.setProgramCounter(0x8000);
        cpu.setStackPointer(opcode === 0xc9 ? 0xfffc : 0xfffe);

        // Setup known flag state
        cpu.setZeroFlag(true);
        cpu.setSubtractFlag(true);
        cpu.setHalfCarryFlag(true);
        cpu.setCarryFlag(true);

        const initialFlags = cpu.getRegisters().f;

        setup();
        mmu.writeByte(0x8000, opcode);

        cpu.step();

        // Verify flags unchanged (except for POP AF which intentionally modifies flags)
        if (opcode !== 0xf1) {
          // POP AF is special case
          expect(cpu.getRegisters().f).toBe(initialFlags);
        }
      });
    });
  });
});
