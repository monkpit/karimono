/**
 * CPU Final Coverage Tests
 *
 * Surgical precision tests to achieve exactly 70% branch coverage.
 * Focus: Minimal tests for uncovered conditional branches and opcodes.
 *
 * Target: Convert from 68.5% (583/851) to 70% (596/851) = +13 branches
 *
 * TDD Methodology: RED -> GREEN -> REFACTOR
 * Hardware Reference: RGBDS GBZ80 Reference (https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7)
 */

import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';
import { CPUTestingComponent } from '../../../src/emulator/types';

describe('CPU Final Coverage Tests', () => {
  let cpu: CPUTestingComponent;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu);
    cpu.reset();
  });

  describe('Interrupt Control Instructions', () => {
    it('should execute DI (0xF3) - Disable Interrupts', () => {
      // RED PHASE: Test interrupt disable instruction
      mmu.writeByte(0x0100, 0xf3);

      const cycles = cpu.step();

      // DI should disable interrupts and take 4 cycles
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x0101);
    });

    it('should execute EI (0xFB) - Enable Interrupts', () => {
      // RED PHASE: Test interrupt enable instruction
      mmu.writeByte(0x0100, 0xfb);

      const cycles = cpu.step();

      // EI should enable interrupts and take 4 cycles
      expect(cycles).toBe(4);
      expect(cpu.getPC()).toBe(0x0101);
    });
  });

  describe('Conditional Jump Edge Cases', () => {
    it('should execute JP NZ,a16 (0xC2) when zero flag is clear', () => {
      // RED PHASE: Test conditional jump when condition is true
      cpu.setZeroFlag(false); // Condition is true (not zero)

      // Write JP NZ,a16 with target address 0x8000
      mmu.writeByte(0x0100, 0xc2);
      mmu.writeByte(0x0101, 0x00); // low byte
      mmu.writeByte(0x0102, 0x80); // high byte

      const cycles = cpu.step();

      // Should jump to 0x8000 since Z=0
      expect(cpu.getPC()).toBe(0x8000);
      expect(cycles).toBe(4); // Jump taken = 4 cycles
    });

    it('should execute JP NZ,a16 (0xC2) when zero flag is set', () => {
      // RED PHASE: Test conditional jump when condition is false
      cpu.setZeroFlag(true); // Condition is false (is zero)

      // Write JP NZ,a16 with target address 0x8000
      mmu.writeByte(0x0100, 0xc2);
      mmu.writeByte(0x0101, 0x00);
      mmu.writeByte(0x0102, 0x80);

      const cycles = cpu.step();

      // Should NOT jump since Z=1, continue to next instruction
      expect(cpu.getPC()).toBe(0x0103);
      expect(cycles).toBe(3); // Jump not taken = 3 cycles
    });
  });

  describe('Stack Operations', () => {
    it('should execute PUSH BC (0xC5)', () => {
      // RED PHASE: Test stack push operation
      cpu.setRegisterB(0x12);
      cpu.setRegisterC(0x34);

      // Set SP to a known value
      const initialSP = cpu.getRegisters().sp;

      mmu.writeByte(0x0100, 0xc5);

      const cycles = cpu.step();

      expect(cycles).toBe(16);
      expect(cpu.getPC()).toBe(0x0101);

      // SP should be decremented by 2
      expect(cpu.getRegisters().sp).toBe((initialSP - 2) & 0xffff);
    });

    it('should execute POP BC (0xC1)', () => {
      // RED PHASE: Test stack pop operation
      const initialSP = cpu.getRegisters().sp;

      // Set up stack data
      mmu.writeByte(initialSP, 0x34); // low byte (C)
      mmu.writeByte(initialSP + 1, 0x12); // high byte (B)

      mmu.writeByte(0x0100, 0xc1);

      const cycles = cpu.step();

      expect(cycles).toBe(12);
      expect(cpu.getPC()).toBe(0x0101);

      // BC should be loaded from stack
      expect(cpu.getRegisters().b).toBe(0x12);
      expect(cpu.getRegisters().c).toBe(0x34);

      // SP should be incremented by 2
      expect(cpu.getRegisters().sp).toBe((initialSP + 2) & 0xffff);
    });
  });

  describe('Carry Flag Instructions', () => {
    it('should execute JR C,e8 (0x38) when carry flag is set', () => {
      // RED PHASE: Test relative jump with carry condition true
      cpu.setCarryFlag(true);
      cpu.setProgramCounter(0x0200);

      // Write JR C,e8 with offset +5
      mmu.writeByte(0x0200, 0x38);
      mmu.writeByte(0x0201, 0x05);

      const cycles = cpu.step();

      // Should jump: PC = 0x0202 + 5 = 0x0207
      expect(cpu.getPC()).toBe(0x0207);
      expect(cycles).toBe(12); // Branch taken
    });

    it('should execute JR C,e8 (0x38) when carry flag is clear', () => {
      // RED PHASE: Test relative jump with carry condition false
      cpu.setCarryFlag(false);
      cpu.setProgramCounter(0x0200);

      // Write JR C,e8 with offset +5
      mmu.writeByte(0x0200, 0x38);
      mmu.writeByte(0x0201, 0x05);

      const cycles = cpu.step();

      // Should NOT jump: PC = 0x0202
      expect(cpu.getPC()).toBe(0x0202);
      expect(cycles).toBe(8); // Branch not taken
    });
  });

  describe('Memory Operations', () => {
    it('should execute DEC (HL) (0x35) with half-carry flag', () => {
      // RED PHASE: Test memory decrement that causes specific flag condition
      cpu.setRegisterH(0x80);
      cpu.setRegisterL(0x00);

      // Set memory value that will cause half-carry when decremented
      mmu.writeByte(0x8000, 0x10);

      mmu.writeByte(0x0100, 0x35);

      const cycles = cpu.step();

      expect(mmu.readByte(0x8000)).toBe(0x0f);
      expect(cycles).toBe(12);

      // DEC sets N=1 always, this should test half-carry condition
      expect(cpu.getSubtractFlag()).toBe(true);
    });

    it('should execute INC (HL) (0x34) with overflow to zero', () => {
      // RED PHASE: Test memory increment with zero result
      cpu.setRegisterH(0x80);
      cpu.setRegisterL(0x01);

      // Set memory to 0xFF so increment causes overflow
      mmu.writeByte(0x8001, 0xff);

      mmu.writeByte(0x0100, 0x34);

      const cycles = cpu.step();

      expect(mmu.readByte(0x8001)).toBe(0x00);
      expect(cycles).toBe(12);

      // INC should set Z flag when result is zero
      expect(cpu.getZeroFlag()).toBe(true);
      expect(cpu.getSubtractFlag()).toBe(false);
    });
  });

  describe('Additional Coverage Target Instructions', () => {
    it('should execute DEC C (0x0D) with underflow', () => {
      // RED PHASE: Target specific DEC register instruction
      cpu.setRegisterC(0x00);

      mmu.writeByte(0x0100, 0x0d);

      const cycles = cpu.step();

      expect(cpu.getRegisters().c).toBe(0xff);
      expect(cycles).toBe(4);
      expect(cpu.getSubtractFlag()).toBe(true);
    });

    it('should execute DEC E (0x1D) normally', () => {
      // RED PHASE: Another DEC register variant
      cpu.setRegisterE(0x42);

      mmu.writeByte(0x0100, 0x1d);

      const cycles = cpu.step();

      expect(cpu.getRegisters().e).toBe(0x41);
      expect(cycles).toBe(4);
    });

    it('should execute DEC H (0x25) normally', () => {
      // RED PHASE: DEC H register
      cpu.setRegisterH(0x80);

      mmu.writeByte(0x0100, 0x25);

      const cycles = cpu.step();

      expect(cpu.getRegisters().h).toBe(0x7f);
      expect(cycles).toBe(4);
    });

    it('should execute DEC L (0x2D) normally', () => {
      // RED PHASE: DEC L register
      cpu.setRegisterL(0x01);

      mmu.writeByte(0x0100, 0x2d);

      const cycles = cpu.step();

      expect(cpu.getRegisters().l).toBe(0x00);
      expect(cycles).toBe(4);
      expect(cpu.getZeroFlag()).toBe(true);
    });

    it('should execute DEC A (0x3D) normally', () => {
      // RED PHASE: DEC A register
      cpu.setRegisterA(0xff);

      mmu.writeByte(0x0100, 0x3d);

      const cycles = cpu.step();

      expect(cpu.getRegisters().a).toBe(0xfe);
      expect(cycles).toBe(4);
    });

    it('should execute DEC BC (0x0B) - 16-bit decrement', () => {
      // RED PHASE: Target 16-bit DEC instruction
      cpu.setRegisterB(0x00);
      cpu.setRegisterC(0x00);

      mmu.writeByte(0x0100, 0x0b);

      const cycles = cpu.step();

      // BC = 0x0000 - 1 = 0xFFFF
      expect(cpu.getRegisters().b).toBe(0xff);
      expect(cpu.getRegisters().c).toBe(0xff);
      expect(cycles).toBe(8);
    });

    it('should execute DEC DE (0x1B) - 16-bit decrement', () => {
      // RED PHASE: Another 16-bit DEC
      cpu.setRegisterD(0x80);
      cpu.setRegisterE(0x00);

      mmu.writeByte(0x0100, 0x1b);

      const cycles = cpu.step();

      // DE = 0x8000 - 1 = 0x7FFF
      expect(cpu.getRegisters().d).toBe(0x7f);
      expect(cpu.getRegisters().e).toBe(0xff);
      expect(cycles).toBe(8);
    });

    it('should execute DEC HL (0x2B) - 16-bit decrement', () => {
      // RED PHASE: DEC HL register pair
      cpu.setRegisterH(0x01);
      cpu.setRegisterL(0x00);

      mmu.writeByte(0x0100, 0x2b);

      const cycles = cpu.step();

      // HL = 0x0100 - 1 = 0x00FF
      expect(cpu.getRegisters().h).toBe(0x00);
      expect(cpu.getRegisters().l).toBe(0xff);
      expect(cycles).toBe(8);
    });

    it('should execute DEC SP (0x3B) - 16-bit decrement', () => {
      // RED PHASE: DEC SP register
      const initialSP = cpu.getRegisters().sp;

      mmu.writeByte(0x0100, 0x3b);

      const cycles = cpu.step();

      expect(cpu.getRegisters().sp).toBe((initialSP - 1) & 0xffff);
      expect(cycles).toBe(8);
    });
  });

  describe('Compare Instructions - CP Family', () => {
    it('should execute CP A,B (0xB8) with A equal to B', () => {
      // RED PHASE: Test compare instruction with equal values
      cpu.setRegisterA(0x42);
      cpu.setRegisterB(0x42);

      mmu.writeByte(0x0100, 0xb8);

      const cycles = cpu.step();

      expect(cycles).toBe(4);
      // CP sets Z=1 when values are equal, N=1 always, H and C depend on values
      expect(cpu.getZeroFlag()).toBe(true); // A == B
      expect(cpu.getSubtractFlag()).toBe(true); // Always set for CP
    });

    it('should execute CP A,C (0xB9) with A greater than C', () => {
      // RED PHASE: Test compare with A > C
      cpu.setRegisterA(0x50);
      cpu.setRegisterC(0x30);

      mmu.writeByte(0x0100, 0xb9);

      const cycles = cpu.step();

      expect(cycles).toBe(4);
      expect(cpu.getZeroFlag()).toBe(false); // A != C
      expect(cpu.getSubtractFlag()).toBe(true);
      expect(cpu.getCarryFlag()).toBe(false); // No underflow
    });

    it('should execute CP A,D (0xBA) with A less than D', () => {
      // RED PHASE: Test compare with A < D (causes underflow)
      cpu.setRegisterA(0x10);
      cpu.setRegisterD(0x20);

      mmu.writeByte(0x0100, 0xba);

      const cycles = cpu.step();

      expect(cycles).toBe(4);
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(true);
      expect(cpu.getCarryFlag()).toBe(true); // Underflow/borrow
    });

    it('should execute CP A,E (0xBB) normally', () => {
      cpu.setRegisterA(0x80);
      cpu.setRegisterE(0x7f);

      mmu.writeByte(0x0100, 0xbb);

      const cycles = cpu.step();

      expect(cycles).toBe(4);
      expect(cpu.getSubtractFlag()).toBe(true);
    });

    it('should execute CP A,H (0xBC) normally', () => {
      cpu.setRegisterA(0xff);
      cpu.setRegisterH(0x01);

      mmu.writeByte(0x0100, 0xbc);

      const cycles = cpu.step();

      expect(cycles).toBe(4);
      expect(cpu.getSubtractFlag()).toBe(true);
    });

    it('should execute CP A,L (0xBD) normally', () => {
      cpu.setRegisterA(0x00);
      cpu.setRegisterL(0x00);

      mmu.writeByte(0x0100, 0xbd);

      const cycles = cpu.step();

      expect(cycles).toBe(4);
      expect(cpu.getZeroFlag()).toBe(true); // Equal values
      expect(cpu.getSubtractFlag()).toBe(true);
    });

    it('should execute CP A,(HL) (0xBE) - memory compare', () => {
      // RED PHASE: Compare with memory value
      cpu.setRegisterA(0x42);
      cpu.setRegisterH(0x80);
      cpu.setRegisterL(0x00);

      mmu.writeByte(0x8000, 0x42); // Same value in memory
      mmu.writeByte(0x0100, 0xbe);

      const cycles = cpu.step();

      expect(cycles).toBe(8); // Memory access takes longer
      expect(cpu.getZeroFlag()).toBe(true);
      expect(cpu.getSubtractFlag()).toBe(true);
    });

    it('should execute CP A,A (0xBF) - compare A with itself', () => {
      cpu.setRegisterA(0x73);

      mmu.writeByte(0x0100, 0xbf);

      const cycles = cpu.step();

      expect(cycles).toBe(4);
      expect(cpu.getZeroFlag()).toBe(true); // Always equal
      expect(cpu.getSubtractFlag()).toBe(true);
      expect(cpu.getCarryFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });

    it('should execute CP A,n8 (0xFE) - immediate compare', () => {
      // RED PHASE: Compare with immediate value
      cpu.setRegisterA(0x30);

      mmu.writeByte(0x0100, 0xfe);
      mmu.writeByte(0x0101, 0x30); // Same immediate value

      const cycles = cpu.step();

      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x0102);
      expect(cpu.getZeroFlag()).toBe(true);
      expect(cpu.getSubtractFlag()).toBe(true);
    });
  });

  describe('Final Branch Coverage Push', () => {
    it('should execute JP C,a16 (0xDA) when carry is clear', () => {
      // RED PHASE: Test conditional jump with carry condition false
      cpu.setCarryFlag(false);

      mmu.writeByte(0x0100, 0xda);
      mmu.writeByte(0x0101, 0x00);
      mmu.writeByte(0x0102, 0x80);

      const cycles = cpu.step();

      // Should not jump
      expect(cpu.getPC()).toBe(0x0103);
      expect(cycles).toBe(3);
    });

    it('should execute JP NC,a16 (0xD2) when carry is set', () => {
      // RED PHASE: Test not-carry jump when carry is set (condition false)
      cpu.setCarryFlag(true);

      mmu.writeByte(0x0100, 0xd2);
      mmu.writeByte(0x0101, 0x00);
      mmu.writeByte(0x0102, 0x90);

      const cycles = cpu.step();

      // Should not jump since carry is set
      expect(cpu.getPC()).toBe(0x0103);
      expect(cycles).toBe(3);
    });

    it('should execute JP Z,a16 (0xCA) when zero is clear', () => {
      // RED PHASE: Test zero jump when zero is clear (condition false)
      cpu.setZeroFlag(false);

      mmu.writeByte(0x0100, 0xca);
      mmu.writeByte(0x0101, 0x00);
      mmu.writeByte(0x0102, 0xa0);

      const cycles = cpu.step();

      // Should not jump since zero is clear
      expect(cpu.getPC()).toBe(0x0103);
      expect(cycles).toBe(3);
    });

    it('should execute PUSH DE (0xD5)', () => {
      // RED PHASE: Test another PUSH instruction
      cpu.setRegisterD(0x34);
      cpu.setRegisterE(0x56);

      const initialSP = cpu.getRegisters().sp;

      mmu.writeByte(0x0100, 0xd5);

      const cycles = cpu.step();

      expect(cycles).toBe(16);
      expect(cpu.getRegisters().sp).toBe((initialSP - 2) & 0xffff);
    });

    it('should execute POP DE (0xD1)', () => {
      // RED PHASE: Test another POP instruction
      const initialSP = cpu.getRegisters().sp;

      mmu.writeByte(initialSP, 0x56); // E
      mmu.writeByte(initialSP + 1, 0x34); // D

      mmu.writeByte(0x0100, 0xd1);

      const cycles = cpu.step();

      expect(cycles).toBe(12);
      expect(cpu.getRegisters().d).toBe(0x34);
      expect(cpu.getRegisters().e).toBe(0x56);
    });

    it('should execute PUSH HL (0xE5)', () => {
      cpu.setRegisterH(0x78);
      cpu.setRegisterL(0x9a);

      mmu.writeByte(0x0100, 0xe5);

      const cycles = cpu.step();

      expect(cycles).toBe(16);
    });

    it('should execute POP HL (0xE1)', () => {
      const initialSP = cpu.getRegisters().sp;

      mmu.writeByte(initialSP, 0x9a); // L
      mmu.writeByte(initialSP + 1, 0x78); // H

      mmu.writeByte(0x0100, 0xe1);

      const cycles = cpu.step();

      expect(cycles).toBe(12);
      expect(cpu.getRegisters().h).toBe(0x78);
      expect(cpu.getRegisters().l).toBe(0x9a);
    });

    it('should execute PUSH AF (0xF5)', () => {
      cpu.setRegisterA(0xbc);
      // Set all flags for testing
      cpu.setZeroFlag(true);
      cpu.setSubtractFlag(false);
      cpu.setHalfCarryFlag(true);
      cpu.setCarryFlag(false);

      mmu.writeByte(0x0100, 0xf5);

      const cycles = cpu.step();

      expect(cycles).toBe(16);
    });

    it('should execute POP AF (0xF1)', () => {
      const initialSP = cpu.getRegisters().sp;

      // Set up stack with F register (flags) and A register
      mmu.writeByte(initialSP, 0xa0); // F register (Z=1, N=0, H=1, C=0)
      mmu.writeByte(initialSP + 1, 0xbc); // A register

      mmu.writeByte(0x0100, 0xf1);

      const cycles = cpu.step();

      expect(cycles).toBe(12);
      expect(cpu.getRegisters().a).toBe(0xbc);
      // Check flags were restored
      expect(cpu.getZeroFlag()).toBe(true);
      expect(cpu.getHalfCarryFlag()).toBe(true);
    });

    it('should execute CALL a16 (0xCD) instruction', () => {
      // RED PHASE: Test unconditional call instruction
      const initialSP = cpu.getRegisters().sp;

      mmu.writeByte(0x0100, 0xcd);
      mmu.writeByte(0x0101, 0x00); // low byte of call target
      mmu.writeByte(0x0102, 0x80); // high byte of call target

      const cycles = cpu.step();

      // CALL should push return address and jump
      expect(cycles).toBe(24); // CALL takes 24 cycles
      expect(cpu.getPC()).toBe(0x8000); // Jump to target
      expect(cpu.getRegisters().sp).toBe((initialSP - 2) & 0xffff); // SP decremented
    });

    it('should execute RET (0xC9) instruction', () => {
      // RED PHASE: Test return instruction
      const initialSP = cpu.getRegisters().sp;

      // Set up return address on stack
      mmu.writeByte(initialSP, 0x34); // low byte
      mmu.writeByte(initialSP + 1, 0x12); // high byte

      mmu.writeByte(0x0100, 0xc9);

      const cycles = cpu.step();

      expect(cycles).toBe(16); // RET takes 16 cycles
      expect(cpu.getPC()).toBe(0x1234); // Jump to return address
      expect(cpu.getRegisters().sp).toBe((initialSP + 2) & 0xffff); // SP incremented
    });

    it('should execute CALL NZ,a16 (0xC4) when zero is clear', () => {
      // RED PHASE: Test conditional call when condition is true
      cpu.setZeroFlag(false); // NZ condition is true

      const initialSP = cpu.getRegisters().sp;

      mmu.writeByte(0x0100, 0xc4);
      mmu.writeByte(0x0101, 0x00);
      mmu.writeByte(0x0102, 0x90);

      const cycles = cpu.step();

      // Should call since Z=0
      expect(cycles).toBe(24); // Call taken
      expect(cpu.getPC()).toBe(0x9000);
      expect(cpu.getRegisters().sp).toBe((initialSP - 2) & 0xffff);
    });

    it('should execute CALL NZ,a16 (0xC4) when zero is set', () => {
      // RED PHASE: Test conditional call when condition is false
      cpu.setZeroFlag(true); // NZ condition is false

      mmu.writeByte(0x0100, 0xc4);
      mmu.writeByte(0x0101, 0x00);
      mmu.writeByte(0x0102, 0x90);

      const cycles = cpu.step();

      // Should NOT call since Z=1
      expect(cycles).toBe(12); // Call not taken
      expect(cpu.getPC()).toBe(0x0103); // Continue to next instruction
    });

    it('should execute RET NZ (0xC0) when zero is clear', () => {
      // RED PHASE: Test conditional return when condition is true
      cpu.setZeroFlag(false);

      const initialSP = cpu.getRegisters().sp;
      mmu.writeByte(initialSP, 0x56); // return address low
      mmu.writeByte(initialSP + 1, 0x78); // return address high

      mmu.writeByte(0x0100, 0xc0);

      const cycles = cpu.step();

      // Should return since Z=0
      expect(cycles).toBe(20); // Conditional return taken
      expect(cpu.getPC()).toBe(0x7856);
    });

    it('should execute RET NZ (0xC0) when zero is set', () => {
      // RED PHASE: Test conditional return when condition is false
      cpu.setZeroFlag(true);

      mmu.writeByte(0x0100, 0xc0);

      const cycles = cpu.step();

      // Should NOT return since Z=1
      expect(cycles).toBe(8); // Conditional return not taken
      expect(cpu.getPC()).toBe(0x0101);
    });

    it('should execute RET Z (0xC8) when zero is set', () => {
      // RED PHASE: Test conditional return Z when condition is true
      cpu.setZeroFlag(true);

      const initialSP = cpu.getRegisters().sp;
      mmu.writeByte(initialSP, 0x00);
      mmu.writeByte(initialSP + 1, 0xa0);

      mmu.writeByte(0x0100, 0xc8);

      const cycles = cpu.step();

      // Should return since Z=1
      expect(cycles).toBe(20);
      expect(cpu.getPC()).toBe(0xa000);
    });

    it('should execute RET C (0xD8) when carry is set', () => {
      // RED PHASE: Test conditional return C when condition is true
      cpu.setCarryFlag(true);

      const initialSP = cpu.getRegisters().sp;
      mmu.writeByte(initialSP, 0x00);
      mmu.writeByte(initialSP + 1, 0xb0);

      mmu.writeByte(0x0100, 0xd8);

      const cycles = cpu.step();

      expect(cycles).toBe(20);
      expect(cpu.getPC()).toBe(0xb000);
    });

    it('should execute CALL Z,a16 (0xCC) when zero is set', () => {
      // RED PHASE: Test conditional call when condition is true
      cpu.setZeroFlag(true);

      const initialSP = cpu.getRegisters().sp;

      mmu.writeByte(0x0100, 0xcc);
      mmu.writeByte(0x0101, 0x00);
      mmu.writeByte(0x0102, 0xc0);

      const cycles = cpu.step();

      expect(cycles).toBe(24); // Call taken
      expect(cpu.getPC()).toBe(0xc000);
      expect(cpu.getRegisters().sp).toBe((initialSP - 2) & 0xffff);
    });

    it('should execute CALL C,a16 (0xDC) when carry is set', () => {
      cpu.setCarryFlag(true);

      mmu.writeByte(0x0100, 0xdc);
      mmu.writeByte(0x0101, 0x00);
      mmu.writeByte(0x0102, 0xd0);

      const cycles = cpu.step();

      expect(cycles).toBe(24);
      expect(cpu.getPC()).toBe(0xd000);
    });

    it('should execute CALL NC,a16 (0xD4) when carry is clear', () => {
      cpu.setCarryFlag(false);

      mmu.writeByte(0x0100, 0xd4);
      mmu.writeByte(0x0101, 0x00);
      mmu.writeByte(0x0102, 0xe0);

      const cycles = cpu.step();

      expect(cycles).toBe(24);
      expect(cpu.getPC()).toBe(0xe000);
    });

    it('should execute RET NC (0xD0) when carry is clear', () => {
      cpu.setCarryFlag(false);

      const initialSP = cpu.getRegisters().sp;
      mmu.writeByte(initialSP, 0x00);
      mmu.writeByte(initialSP + 1, 0xf0);

      mmu.writeByte(0x0100, 0xd0);

      const cycles = cpu.step();

      expect(cycles).toBe(20);
      expect(cpu.getPC()).toBe(0xf000);
    });

    it('should execute RET NC (0xD0) when carry is set', () => {
      // Test conditional return when condition is false
      cpu.setCarryFlag(true);

      mmu.writeByte(0x0100, 0xd0);

      const cycles = cpu.step();

      // Should NOT return since C=1
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x0101);
    });

    it('should execute RET Z (0xC8) when zero is clear', () => {
      // Test conditional return when condition is false
      cpu.setZeroFlag(false);

      mmu.writeByte(0x0100, 0xc8);

      const cycles = cpu.step();

      // Should NOT return since Z=0
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x0101);
    });

    it('should execute RET C (0xD8) when carry is clear', () => {
      // RED PHASE: Final test - conditional return when condition is false
      cpu.setCarryFlag(false);

      mmu.writeByte(0x0100, 0xd8);

      const cycles = cpu.step();

      // Should NOT return since C=0
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x0101);
    });
  });
});
