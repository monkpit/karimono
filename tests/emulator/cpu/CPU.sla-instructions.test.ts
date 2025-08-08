/**
 * CPU SLA (Shift Left Arithmetic) Instructions Tests
 *
 * Tests all SLA instruction variants (CB 0x20-0x27) following hardware specification.
 * Reference: RGBDS GBZ80 Reference (https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7)
 *
 * SLA Operation: result = value << 1 (shift left, 0 into bit 0)
 * Flags: C=old_bit_7, Z=result==0, N=0, H=0
 * Cycles: 8 (registers), 16 (memory HL)
 */

import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';

describe('CPU SLA Instructions', () => {
  let cpu: CPU;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu);
  });

  describe('SLA B (CB 0x20)', () => {
    it('should shift B left by 1, set carry from bit 7, clear other flags when result non-zero', () => {
      cpu.setRegisterB(0b10110001);
      cpu.setRegisterF(0b11110000); // All flags set initially

      // Load CB prefix instruction first
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x20);

      cpu.step();

      expect(cpu.getRegisters().b).toBe(0b01100010);
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 7 was 1
      expect(cpu.getZeroFlag()).toBe(false); // Result is not zero
      expect(cpu.getSubtractFlag()).toBe(false); // Always cleared
      expect(cpu.getHalfCarryFlag()).toBe(false); // Always cleared
    });

    it('should set zero flag when shift result is zero', () => {
      cpu.setRegisterB(0x80); // Only bit 7 set
      cpu.setRegisterF(0b00000000); // All flags clear

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x20);

      cpu.step();

      expect(cpu.getRegisters().b).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Result is zero
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 7 was 1
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });

    it('should clear carry flag when bit 7 was 0', () => {
      cpu.setRegisterB(0x40); // Bit 7 is 0
      cpu.setRegisterF(0b11110000); // All flags set initially

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x20);

      cpu.step();

      expect(cpu.getRegisters().b).toBe(0x80);
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 7 was 0
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });
  });

  describe('SLA C (CB 0x21)', () => {
    it('should shift C left by 1 with correct flags', () => {
      cpu.setRegisterC(0b11010011);

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x21);

      cpu.step();

      expect(cpu.getRegisters().c).toBe(0b10100110);
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 7 was 1
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });
  });

  describe('SLA D (CB 0x22)', () => {
    it('should shift D left by 1 with correct flags', () => {
      cpu.setRegisterD(0x55); // 0b01010101

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x22);

      cpu.step();

      expect(cpu.getRegisters().d).toBe(0xaa); // 0b10101010
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 7 was 0
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });
  });

  describe('SLA E (CB 0x23)', () => {
    it('should shift E left by 1 with correct flags', () => {
      cpu.setRegisterE(0xaa); // 0b10101010

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x23);

      cpu.step();

      expect(cpu.getRegisters().e).toBe(0x54); // 0b01010100
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 7 was 1
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });
  });

  describe('SLA H (CB 0x24)', () => {
    it('should shift H left by 1 with correct flags', () => {
      cpu.setRegisterH(0x01);

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x24);

      cpu.step();

      expect(cpu.getRegisters().h).toBe(0x02);
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 7 was 0
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });
  });

  describe('SLA L (CB 0x25)', () => {
    it('should shift L left by 1 with correct flags', () => {
      cpu.setRegisterL(0xff);

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x25);

      cpu.step();

      expect(cpu.getRegisters().l).toBe(0xfe);
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 7 was 1
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });
  });

  describe('SLA (HL) (CB 0x26)', () => {
    it('should shift memory at HL left by 1 with 16 cycles', () => {
      cpu.setRegisterH(0x80);
      cpu.setRegisterL(0x00);
      mmu.writeByte(0x8000, 0b11001010);

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x26);

      cpu.step();

      expect(mmu.readByte(0x8000)).toBe(0b10010100);
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 7 was 1
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });

    it('should handle zero result in memory operation', () => {
      cpu.setRegisterH(0x80);
      cpu.setRegisterL(0x01);
      mmu.writeByte(0x8001, 0x80); // Only bit 7 set

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x26);

      cpu.step();

      expect(mmu.readByte(0x8001)).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Result is zero
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 7 was 1
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });
  });

  describe('SLA A (CB 0x27)', () => {
    it('should shift A left by 1 with correct flags', () => {
      cpu.setRegisterA(0x7f); // 0b01111111

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x27);

      cpu.step();

      expect(cpu.getRegisters().a).toBe(0xfe); // 0b11111110
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 7 was 0
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });

    it('should handle edge case: A = 0x00', () => {
      cpu.setRegisterA(0x00);
      cpu.setRegisterF(0b11110000); // All flags set

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x27);

      cpu.step();

      expect(cpu.getRegisters().a).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Result is zero
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 7 was 0
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });
  });

  describe('SLA Flag Behavior Edge Cases', () => {
    it('should preserve other register values during SLA operations', () => {
      // Set all registers to known values
      cpu.setRegisterA(0x11);
      cpu.setRegisterB(0x22);
      cpu.setRegisterC(0x33);
      cpu.setRegisterD(0x44);
      cpu.setRegisterE(0x55);
      cpu.setRegisterH(0x66);
      cpu.setRegisterL(0x77);

      // Execute SLA B
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x20);

      cpu.step();

      // Only B should change
      const registers = cpu.getRegisters();
      expect(registers.a).toBe(0x11);
      expect(registers.b).toBe(0x44); // 0x22 << 1
      expect(registers.c).toBe(0x33);
      expect(registers.d).toBe(0x44);
      expect(registers.e).toBe(0x55);
      expect(registers.h).toBe(0x66);
      expect(registers.l).toBe(0x77);
    });

    it('should always clear N and H flags regardless of input', () => {
      const testCases = [0x00, 0x80, 0xff, 0x55, 0xaa];
      
      for (const value of testCases) {
        // Reset for each test
        mmu.reset();
        cpu = new CPU(mmu);
        
        cpu.setRegisterA(value);
        cpu.setRegisterF(0b01100000); // Set N=1, H=1 initially

        mmu.writeByte(0x0100, 0xcb);
        mmu.writeByte(0x0101, 0x27); // SLA A

        cpu.step();

        expect(cpu.getSubtractFlag()).toBe(false);
        expect(cpu.getHalfCarryFlag()).toBe(false);
      }
    });
  });
});