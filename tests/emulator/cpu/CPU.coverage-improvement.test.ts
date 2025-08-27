/**
 * CPU Coverage Improvement Tests
 *
 * Strategic tests to improve branch coverage for untested CPU instructions.
 * Following TDD principles and hardware accuracy requirements.
 *
 * Focus on simple arithmetic/logical instructions with clear test patterns.
 */

import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu';
import { CPUTestingComponent } from '../../../src/emulator/types';

describe('CPU Coverage Improvement Tests', () => {
  let cpu: CPUTestingComponent;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu);
  });

  afterEach(() => {
    cpu.reset();
    mmu.reset();
  });

  describe('SUB Instructions - Subtract from A', () => {
    it('should execute SUB A,B (0x90) correctly', () => {
      // Set up registers: A=0x10, B=0x05
      cpu.setRegisterA(0x10);
      cpu.setRegisterB(0x05);

      // Write SUB A,B instruction to memory
      mmu.writeByte(0x0100, 0x90);

      // Execute instruction
      const cycles = cpu.step();

      // Verify: A = 0x10 - 0x05 = 0x0B
      expect(cpu.getRegisters().a).toBe(0x0b);
      expect(cycles).toBe(4);

      // Verify flags: Z=0 (result not zero), N=1 (subtraction), H=1 (borrow from bit 4: 0x05 > 0x00), C=0
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(true);
      expect(cpu.getHalfCarryFlag()).toBe(true); // H set because (0x05 & 0x0f) > (0x10 & 0x0f)
      expect(cpu.getCarryFlag()).toBe(false);
    });

    it('should execute SUB A,C (0x91) with zero result', () => {
      // Set up registers: A=0x42, C=0x42
      cpu.setRegisterA(0x42);
      cpu.setRegisterC(0x42);

      // Write SUB A,C instruction
      mmu.writeByte(0x0100, 0x91);

      const cycles = cpu.step();

      // Verify: A = 0x42 - 0x42 = 0x00
      expect(cpu.getRegisters().a).toBe(0x00);
      expect(cycles).toBe(4);

      // Verify flags: Z=1 (result is zero), N=1, H=0, C=0
      expect(cpu.getZeroFlag()).toBe(true);
      expect(cpu.getSubtractFlag()).toBe(true);
    });

    it('should execute SUB A,D (0x92) with underflow', () => {
      // Set up registers: A=0x05, D=0x10 (will underflow)
      cpu.setRegisterA(0x05);
      cpu.setRegisterD(0x10);

      mmu.writeByte(0x0100, 0x92);

      const cycles = cpu.step();

      // Verify: A = 0x05 - 0x10 = 0xF5 (256 - 11 = 245)
      expect(cpu.getRegisters().a).toBe(0xf5);
      expect(cycles).toBe(4);

      // Verify flags: Z=0, N=1, C=1 (borrow/underflow)
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(true);
      expect(cpu.getCarryFlag()).toBe(true);
    });
  });

  describe('AND Instructions - Logical AND with A', () => {
    it('should execute AND A,B (0xA0) correctly', () => {
      // Set up registers: A=0xF0, B=0x0F
      cpu.setRegisterA(0xf0);
      cpu.setRegisterB(0x0f);

      mmu.writeByte(0x0100, 0xa0);

      const cycles = cpu.step();

      // Verify: A = 0xF0 & 0x0F = 0x00
      expect(cpu.getRegisters().a).toBe(0x00);
      expect(cycles).toBe(4);

      // Verify flags: Z=1 (result is zero), N=0, H=1 (always set for AND), C=0
      expect(cpu.getZeroFlag()).toBe(true);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(true);
      expect(cpu.getCarryFlag()).toBe(false);
    });

    it('should execute AND A,C (0xA1) with non-zero result', () => {
      // Set up registers: A=0xFF, C=0x81
      cpu.setRegisterA(0xff);
      cpu.setRegisterC(0x81);

      mmu.writeByte(0x0100, 0xa1);

      const cycles = cpu.step();

      // Verify: A = 0xFF & 0x81 = 0x81
      expect(cpu.getRegisters().a).toBe(0x81);
      expect(cycles).toBe(4);

      // Verify flags: Z=0, N=0, H=1, C=0
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(true);
      expect(cpu.getCarryFlag()).toBe(false);
    });
  });

  describe('OR Instructions - Logical OR with A', () => {
    it('should execute OR A,B (0xB0) correctly', () => {
      // Set up registers: A=0xF0, B=0x0F
      cpu.setRegisterA(0xf0);
      cpu.setRegisterB(0x0f);

      mmu.writeByte(0x0100, 0xb0);

      const cycles = cpu.step();

      // Verify: A = 0xF0 | 0x0F = 0xFF
      expect(cpu.getRegisters().a).toBe(0xff);
      expect(cycles).toBe(4);

      // Verify flags: Z=0, N=0, H=0, C=0 (OR clears all flags except Z if result is 0)
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false);
    });

    it('should execute OR A,C (0xB1) with zero inputs', () => {
      // Set up registers: A=0x00, C=0x00
      cpu.setRegisterA(0x00);
      cpu.setRegisterC(0x00);

      mmu.writeByte(0x0100, 0xb1);

      const cycles = cpu.step();

      // Verify: A = 0x00 | 0x00 = 0x00
      expect(cpu.getRegisters().a).toBe(0x00);
      expect(cycles).toBe(4);

      // Verify flags: Z=1 (result is zero), others cleared
      expect(cpu.getZeroFlag()).toBe(true);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false);
    });
  });

  describe('XOR Instructions - Logical XOR with A', () => {
    it('should execute XOR A,B (0xA8) correctly', () => {
      // Set up registers: A=0xFF, B=0xAA
      cpu.setRegisterA(0xff);
      cpu.setRegisterB(0xaa);

      mmu.writeByte(0x0100, 0xa8);

      const cycles = cpu.step();

      // Verify: A = 0xFF ^ 0xAA = 0x55
      expect(cpu.getRegisters().a).toBe(0x55);
      expect(cycles).toBe(4);

      // Verify flags: Z=0, N=0, H=0, C=0
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false);
    });

    it('should execute XOR A,A (0xAF) to clear A register', () => {
      // Set up register: A=0x42 (any value)
      cpu.setRegisterA(0x42);

      mmu.writeByte(0x0100, 0xaf);

      const cycles = cpu.step();

      // Verify: A = 0x42 ^ 0x42 = 0x00 (common pattern to clear A)
      expect(cpu.getRegisters().a).toBe(0x00);
      expect(cycles).toBe(4);

      // Verify flags: Z=1 (result is zero), others cleared
      expect(cpu.getZeroFlag()).toBe(true);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false);
    });
  });

  describe('Immediate Value Instructions', () => {
    it('should execute SUB A,n8 (0xD6) with immediate value', () => {
      // Set up register: A=0x20
      cpu.setRegisterA(0x20);

      // Write SUB A,n8 instruction with immediate value 0x10
      mmu.writeByte(0x0100, 0xd6);
      mmu.writeByte(0x0101, 0x10);

      const cycles = cpu.step();

      // Verify: A = 0x20 - 0x10 = 0x10
      expect(cpu.getRegisters().a).toBe(0x10);
      expect(cycles).toBe(8); // Immediate instructions take 8 cycles

      // PC should advance 2 bytes (opcode + immediate)
      expect(cpu.getPC()).toBe(0x0102);
    });

    it('should execute AND A,n8 (0xE6) with immediate value', () => {
      cpu.setRegisterA(0xf3);

      mmu.writeByte(0x0100, 0xe6);
      mmu.writeByte(0x0101, 0x0f);

      const cycles = cpu.step();

      expect(cpu.getRegisters().a).toBe(0x03);
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x0102);
    });

    it('should execute OR A,n8 (0xF6) with immediate value', () => {
      cpu.setRegisterA(0x0f);

      mmu.writeByte(0x0100, 0xf6);
      mmu.writeByte(0x0101, 0xf0);

      const cycles = cpu.step();

      expect(cpu.getRegisters().a).toBe(0xff);
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x0102);
    });

    it('should execute XOR A,n8 (0xEE) with immediate value', () => {
      cpu.setRegisterA(0xaa);

      mmu.writeByte(0x0100, 0xee);
      mmu.writeByte(0x0101, 0xff);

      const cycles = cpu.step();

      expect(cpu.getRegisters().a).toBe(0x55);
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x0102);
    });
  });

  describe('INC/DEC Instructions - Register Pairs', () => {
    it('should execute INC BC (0x03) correctly', () => {
      // Set up registers: BC=0x12FF
      cpu.setRegisterB(0x12);
      cpu.setRegisterC(0xff);

      mmu.writeByte(0x0100, 0x03);

      const cycles = cpu.step();

      // Verify: BC = 0x12FF + 1 = 0x1300
      expect(cpu.getRegisters().b).toBe(0x13);
      expect(cpu.getRegisters().c).toBe(0x00);
      expect(cycles).toBe(8);

      // INC BC does not affect flags
      // (flags should remain in their previous state)
    });

    it('should execute INC DE (0x13) correctly', () => {
      cpu.setRegisterD(0xff);
      cpu.setRegisterE(0xff);

      mmu.writeByte(0x0100, 0x13);

      const cycles = cpu.step();

      // DE = 0xFFFF + 1 = 0x0000 (16-bit overflow)
      expect(cpu.getRegisters().d).toBe(0x00);
      expect(cpu.getRegisters().e).toBe(0x00);
      expect(cycles).toBe(8);
    });

    it('should execute INC HL (0x23) correctly', () => {
      cpu.setRegisterH(0x00);
      cpu.setRegisterL(0xff);

      mmu.writeByte(0x0100, 0x23);

      const cycles = cpu.step();

      // HL = 0x00FF + 1 = 0x0100
      expect(cpu.getRegisters().h).toBe(0x01);
      expect(cpu.getRegisters().l).toBe(0x00);
      expect(cycles).toBe(8);
    });

    it('should execute INC SP (0x33) correctly', () => {
      // We need to set SP indirectly by modifying register state
      // Since we don't have setRegisterSP, we'll test with default SP value
      const initialSP = cpu.getRegisters().sp;

      mmu.writeByte(0x0100, 0x33);

      const cycles = cpu.step();

      // SP should be incremented by 1
      expect(cpu.getRegisters().sp).toBe((initialSP + 1) & 0xffff);
      expect(cycles).toBe(8);
    });
  });

  describe('INC/DEC Instructions - Single Registers', () => {
    it('should execute INC B (0x04) with normal increment', () => {
      cpu.setRegisterB(0x42);

      mmu.writeByte(0x0100, 0x04);

      const cycles = cpu.step();

      expect(cpu.getRegisters().b).toBe(0x43);
      expect(cycles).toBe(4);

      // INC sets Z=0 (not zero), N=0 (not subtraction), H and C depend on implementation
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
    });

    it('should execute INC B (0x04) with overflow to zero', () => {
      cpu.setRegisterB(0xff);

      mmu.writeByte(0x0100, 0x04);

      const cycles = cpu.step();

      expect(cpu.getRegisters().b).toBe(0x00);
      expect(cycles).toBe(4);

      // INC sets Z=1 (result is zero), N=0
      expect(cpu.getZeroFlag()).toBe(true);
      expect(cpu.getSubtractFlag()).toBe(false);
    });

    it('should execute DEC B (0x05) with normal decrement', () => {
      cpu.setRegisterB(0x43);

      mmu.writeByte(0x0100, 0x05);

      const cycles = cpu.step();

      expect(cpu.getRegisters().b).toBe(0x42);
      expect(cycles).toBe(4);

      // DEC sets N=1 (subtraction), Z=0 (not zero)
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(true);
    });

    it('should execute DEC B (0x05) with underflow from zero', () => {
      cpu.setRegisterB(0x00);

      mmu.writeByte(0x0100, 0x05);

      const cycles = cpu.step();

      expect(cpu.getRegisters().b).toBe(0xff);
      expect(cycles).toBe(4);

      // DEC sets N=1, Z=0 (result is 0xFF, not zero)
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(true);
    });

    it('should execute INC D (0x14) correctly', () => {
      cpu.setRegisterD(0x2f);

      mmu.writeByte(0x0100, 0x14);

      const cycles = cpu.step();

      expect(cpu.getRegisters().d).toBe(0x30);
      expect(cycles).toBe(4);
      expect(cpu.getSubtractFlag()).toBe(false);
    });

    it('should execute DEC D (0x15) correctly', () => {
      cpu.setRegisterD(0x30);

      mmu.writeByte(0x0100, 0x15);

      const cycles = cpu.step();

      expect(cpu.getRegisters().d).toBe(0x2f);
      expect(cycles).toBe(4);
      expect(cpu.getSubtractFlag()).toBe(true);
    });
  });

  describe('Flag Manipulation Instructions', () => {
    it('should execute SCF (0x37) - Set Carry Flag', () => {
      // Set up initial flag state
      cpu.setZeroFlag(false);
      cpu.setSubtractFlag(true);
      cpu.setHalfCarryFlag(true);
      cpu.setCarryFlag(false);

      mmu.writeByte(0x0100, 0x37);

      const cycles = cpu.step();

      expect(cycles).toBe(4);

      // SCF sets C=1, clears N=0, H=0, leaves Z unchanged
      expect(cpu.getCarryFlag()).toBe(true);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      // Z flag should remain unchanged from before
      expect(cpu.getZeroFlag()).toBe(false);
    });

    it('should execute CCF (0x3F) - Complement Carry Flag', () => {
      // Test CCF with carry flag set - should clear it
      cpu.setCarryFlag(true);
      cpu.setSubtractFlag(true);
      cpu.setHalfCarryFlag(true);

      mmu.writeByte(0x0100, 0x3f);

      const cycles = cpu.step();

      expect(cycles).toBe(4);

      // CCF complements carry flag and clears N, H
      expect(cpu.getCarryFlag()).toBe(false); // inverted from true
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });

    it('should execute CPL (0x2F) - Complement A Register', () => {
      // Test CPL instruction - complements A register
      cpu.setRegisterA(0xaa); // 10101010 in binary

      mmu.writeByte(0x0100, 0x2f);

      const cycles = cpu.step();

      expect(cycles).toBe(4);

      // CPL inverts all bits in A: 0xAA becomes 0x55
      expect(cpu.getRegisters().a).toBe(0x55); // 01010101 in binary

      // CPL sets N and H flags
      expect(cpu.getSubtractFlag()).toBe(true);
      expect(cpu.getHalfCarryFlag()).toBe(true);
    });

    it('should execute DAA (0x27) with half-carry adjustment', () => {
      // Test DAA with specific flag conditions to cover conditional branches
      cpu.setRegisterA(0x0a); // After BCD addition that needs adjustment
      cpu.setZeroFlag(false);
      cpu.setSubtractFlag(false);
      cpu.setHalfCarryFlag(true); // This should trigger adjustment
      cpu.setCarryFlag(false);

      mmu.writeByte(0x0100, 0x27);

      const cycles = cpu.step();

      expect(cycles).toBe(4);

      // DAA should adjust for BCD - with H flag set, should add 0x06
      expect(cpu.getRegisters().a).toBe(0x10);
    });

    it('should execute DAA (0x27) with carry adjustment', () => {
      // Test DAA with carry condition
      cpu.setRegisterA(0xa0); // Value that needs carry adjustment
      cpu.setZeroFlag(false);
      cpu.setSubtractFlag(false);
      cpu.setHalfCarryFlag(false);
      cpu.setCarryFlag(false);

      mmu.writeByte(0x0100, 0x27);

      const cycles = cpu.step();

      expect(cycles).toBe(4);

      // DAA should adjust for BCD - high nibble >= 0x0A should add 0x60
      expect(cpu.getRegisters().a).toBe(0x00);
      expect(cpu.getCarryFlag()).toBe(true);
    });

    it('should execute DAA (0x27) subtraction with half-carry only', () => {
      // Target specific branch: DAA subtraction path with H flag set, C flag clear
      cpu.setRegisterA(0x3f); // Value for half-carry subtraction adjustment
      cpu.setZeroFlag(false);
      cpu.setSubtractFlag(true); // Subtraction mode - KEY for this branch
      cpu.setHalfCarryFlag(true); // This triggers the hFlag branch
      cpu.setCarryFlag(false); // This ensures cFlag branch is NOT taken

      mmu.writeByte(0x0100, 0x27);

      const cycles = cpu.step();

      expect(cycles).toBe(4);

      // DAA subtraction with H flag: A = 0x3F - 0x06 = 0x39
      expect(cpu.getRegisters().a).toBe(0x39);
      // H flag should be cleared after DAA
      expect(cpu.getHalfCarryFlag()).toBe(false);
      // C flag should remain unchanged (false)
      expect(cpu.getCarryFlag()).toBe(false);
    });
  });

  describe('Load Immediate Instructions', () => {
    it('should execute LD D,n8 (0x16) correctly', () => {
      mmu.writeByte(0x0100, 0x16);
      mmu.writeByte(0x0101, 0x84);

      const cycles = cpu.step();

      expect(cpu.getRegisters().d).toBe(0x84);
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x0102);
    });

    it('should execute LD E,n8 (0x1E) correctly', () => {
      mmu.writeByte(0x0100, 0x1e);
      mmu.writeByte(0x0101, 0x42);

      const cycles = cpu.step();

      expect(cpu.getRegisters().e).toBe(0x42);
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x0102);
    });

    it('should execute LD H,n8 (0x26) correctly', () => {
      mmu.writeByte(0x0100, 0x26);
      mmu.writeByte(0x0101, 0xff);

      const cycles = cpu.step();

      expect(cpu.getRegisters().h).toBe(0xff);
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x0102);
    });

    it('should execute LD L,n8 (0x2E) correctly', () => {
      mmu.writeByte(0x0100, 0x2e);
      mmu.writeByte(0x0101, 0x00);

      const cycles = cpu.step();

      expect(cpu.getRegisters().l).toBe(0x00);
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x0102);
    });
  });

  describe('Memory Load Instructions - Strategic Coverage', () => {
    it('should execute LD A,(a16) (0xFA) - absolute address load', () => {
      // Test memory read operation to cover branch
      cpu.setRegisterA(0x00);

      // Write LD A,(a16) instruction with address 0x8000
      mmu.writeByte(0x0100, 0xfa);
      mmu.writeByte(0x0101, 0x00); // low byte of address
      mmu.writeByte(0x0102, 0x80); // high byte of address

      // Set value at target memory location
      mmu.writeByte(0x8000, 0x42);

      const cycles = cpu.step();

      // Verify A loaded from memory
      expect(cpu.getRegisters().a).toBe(0x42);
      expect(cycles).toBe(16);
      expect(cpu.getPC()).toBe(0x0103);
    });

    it('should execute LD (a16),A (0xEA) - absolute address store', () => {
      // Test memory write operation to cover branch
      cpu.setRegisterA(0x73);

      // Write LD (a16),A instruction with address 0x8001
      mmu.writeByte(0x0100, 0xea);
      mmu.writeByte(0x0101, 0x01); // low byte of address
      mmu.writeByte(0x0102, 0x80); // high byte of address

      const cycles = cpu.step();

      // Verify A stored to memory
      expect(mmu.readByte(0x8001)).toBe(0x73);
      expect(cycles).toBe(16);
      expect(cpu.getPC()).toBe(0x0103);
    });
  });

  describe('Private Register Pair Getters', () => {
    it('should return correct combined value from getBC() method', () => {
      // Set up registers: B=0x12, C=0x34
      cpu.setRegisterB(0x12);
      cpu.setRegisterC(0x34);

      // Access private method for coverage
      const bcValue = (cpu as any).getBC();

      // Verify combined value: B << 8 | C = 0x1234
      expect(bcValue).toBe(0x1234);
    });

    it('should return correct combined value from getDE() method', () => {
      // Set up registers: D=0x56, E=0x78
      cpu.setRegisterD(0x56);
      cpu.setRegisterE(0x78);

      // Access private method for coverage
      const deValue = (cpu as any).getDE();

      // Verify combined value: D << 8 | E = 0x5678
      expect(deValue).toBe(0x5678);
    });

    it('should handle zero values in getBC() method', () => {
      // Set up registers: B=0x00, C=0x00
      cpu.setRegisterB(0x00);
      cpu.setRegisterC(0x00);

      // Access private method for coverage
      const bcValue = (cpu as any).getBC();

      // Verify combined value is zero
      expect(bcValue).toBe(0x0000);
    });

    it('should handle maximum values in getDE() method', () => {
      // Set up registers: D=0xFF, E=0xFF
      cpu.setRegisterD(0xff);
      cpu.setRegisterE(0xff);

      // Access private method for coverage
      const deValue = (cpu as any).getDE();

      // Verify combined value is maximum 16-bit value
      expect(deValue).toBe(0xffff);
    });
  });

  describe('Control Flow Instructions - Edge Cases', () => {
    it('should execute JR e8 (0x18) with negative offset', () => {
      // Test relative jump with negative displacement
      cpu.setProgramCounter(0x0105);

      // Write JR e8 with negative offset (-3 = 0xFD in two's complement)
      mmu.writeByte(0x0105, 0x18);
      mmu.writeByte(0x0106, 0xfd);

      const cycles = cpu.step();

      // PC should jump backwards: 0x0107 + (-3) = 0x0104
      expect(cpu.getPC()).toBe(0x0104);
      expect(cycles).toBe(12);
    });

    it('should execute STOP (0x10) instruction', () => {
      // Test STOP instruction to cover halt functionality branch
      cpu.setProgramCounter(0x0200);

      // Write STOP instruction
      mmu.writeByte(0x0200, 0x10);
      mmu.writeByte(0x0201, 0x00); // STOP requires following NOP

      const cycles = cpu.step();

      // STOP should halt CPU and advance PC by 2
      expect(cpu.getPC()).toBe(0x0202);
      expect(cycles).toBe(4);
    });

    it('should execute HALT (0x76) instruction', () => {
      // Test HALT instruction to cover halt functionality
      cpu.setProgramCounter(0x0300);

      // Write HALT instruction
      mmu.writeByte(0x0300, 0x76);

      const cycles = cpu.step();

      // HALT should halt CPU and advance PC by 1
      expect(cpu.getPC()).toBe(0x0301);
      expect(cycles).toBe(4);
      expect(cpu.isHalted()).toBe(true);
    });

    it('should execute NOP (0x00) instruction', () => {
      // Test NOP instruction - simplest instruction that should definitely work
      cpu.setProgramCounter(0x0400);

      mmu.writeByte(0x0400, 0x00);

      const cycles = cpu.step();

      // NOP should do nothing except advance PC
      expect(cpu.getPC()).toBe(0x0401);
      expect(cycles).toBe(4);
    });

    it('should execute LD (HL),n8 (0x36) - store immediate to memory pointed by HL', () => {
      // Test memory store instruction that might not be covered
      cpu.setRegisterH(0x80);
      cpu.setRegisterL(0x00);

      // Write LD (HL),n8 instruction
      mmu.writeByte(0x0100, 0x36);
      mmu.writeByte(0x0101, 0x42); // immediate value to store

      const cycles = cpu.step();

      // Should store immediate value at address pointed by HL
      expect(mmu.readByte(0x8000)).toBe(0x42);
      expect(cycles).toBe(12);
      expect(cpu.getPC()).toBe(0x0102);
    });
  });
});
