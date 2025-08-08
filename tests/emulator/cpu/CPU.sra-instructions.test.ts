/**
 * CPU SRA (Shift Right Arithmetic) Instructions Tests
 *
 * Tests all SRA instruction variants (CB 0x28-0x2F) following hardware specification.
 * Reference: RGBDS GBZ80 Reference (https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7)
 *
 * SRA Operation: result = (value >> 1) | (value & 0x80) (preserve sign bit)
 * Flags: C=old_bit_0, Z=result==0, N=0, H=0
 * Cycles: 8 (registers), 16 (memory HL)
 */

import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';

describe('CPU SRA Instructions', () => {
  let cpu: CPU;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu);
  });

  describe('SRA B (CB 0x28)', () => {
    it('should preserve sign bit when shifting positive value', () => {
      cpu.setRegisterB(0b01110010); // Positive value, bit 7 = 0
      cpu.setRegisterF(0b11110000); // All flags set initially

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x28);

      cpu.step();

      expect(cpu.getRegisters().b).toBe(0b00111001); // Sign bit 7 preserved as 0
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 0 was 0
      expect(cpu.getZeroFlag()).toBe(false); // Result is not zero
      expect(cpu.getSubtractFlag()).toBe(false); // Always cleared
      expect(cpu.getHalfCarryFlag()).toBe(false); // Always cleared
    });

    it('should preserve sign bit when shifting negative value', () => {
      cpu.setRegisterB(0b11110011); // Negative value, bit 7 = 1
      cpu.setRegisterF(0b00000000); // All flags clear initially

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x28);

      cpu.step();

      expect(cpu.getRegisters().b).toBe(0b11111001); // Sign bit 7 preserved as 1
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 0 was 1
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });

    it('should set carry flag from old bit 0', () => {
      cpu.setRegisterB(0b10110001); // Bit 0 = 1
      cpu.setRegisterF(0b00000000); // All flags clear

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x28);

      cpu.step();

      expect(cpu.getRegisters().b).toBe(0b11011000); // Sign bit preserved, shifted right
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 0 was 1
    });

    it('should clear carry flag when old bit 0 was 0', () => {
      cpu.setRegisterB(0b10110010); // Bit 0 = 0
      cpu.setRegisterF(0b11110000); // All flags set

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x28);

      cpu.step();

      expect(cpu.getRegisters().b).toBe(0b11011001); // Sign bit preserved, shifted right
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 0 was 0
    });
  });

  describe('SRA C (CB 0x29)', () => {
    it('should handle positive value correctly', () => {
      cpu.setRegisterC(0b01010101); // Positive value

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x29);

      cpu.step();

      expect(cpu.getRegisters().c).toBe(0b00101010); // Sign bit preserved as 0
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 0 was 1
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });

    it('should handle negative value correctly', () => {
      cpu.setRegisterC(0b10101010); // Negative value

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x29);

      cpu.step();

      expect(cpu.getRegisters().c).toBe(0b11010101); // Sign bit preserved as 1
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 0 was 0
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });
  });

  describe('SRA D (CB 0x2A)', () => {
    it('should handle standard shift operation', () => {
      cpu.setRegisterD(0x80); // 0b10000000 - negative value with only sign bit set

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x2a);

      cpu.step();

      expect(cpu.getRegisters().d).toBe(0xc0); // 0b11000000 - sign bit preserved
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 0 was 0
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });
  });

  describe('SRA E (CB 0x2B)', () => {
    it('should handle edge case with 0x01', () => {
      cpu.setRegisterE(0x01); // Smallest positive value

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x2b);

      cpu.step();

      expect(cpu.getRegisters().e).toBe(0x00); // Shifts to zero
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 0 was 1
      expect(cpu.getZeroFlag()).toBe(true); // Result is zero
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });
  });

  describe('SRA H (CB 0x2C)', () => {
    it('should handle standard positive shift', () => {
      cpu.setRegisterH(0x7e); // 0b01111110 - positive value

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x2c);

      cpu.step();

      expect(cpu.getRegisters().h).toBe(0x3f); // 0b00111111 - sign bit preserved
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 0 was 0
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });
  });

  describe('SRA L (CB 0x2D)', () => {
    it('should handle standard negative shift', () => {
      cpu.setRegisterL(0xff); // 0b11111111 - all bits set

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x2d);

      cpu.step();

      expect(cpu.getRegisters().l).toBe(0xff); // 0b11111111 - remains the same
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 0 was 1
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });
  });

  describe('SRA (HL) (CB 0x2E)', () => {
    it('should shift memory value preserving sign bit with 16 cycles', () => {
      cpu.setRegisterH(0x80);
      cpu.setRegisterL(0x00);
      mmu.writeByte(0x8000, 0b11000110); // Negative value in memory

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x2e);

      cpu.step();

      expect(mmu.readByte(0x8000)).toBe(0b11100011); // Sign bit preserved
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 0 was 0
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });

    it('should handle memory zero result', () => {
      cpu.setRegisterH(0x80);
      cpu.setRegisterL(0x01);
      mmu.writeByte(0x8001, 0x01); // Will shift to zero

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x2e);

      cpu.step();

      expect(mmu.readByte(0x8001)).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Result is zero
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 0 was 1
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });

    it('should handle positive memory value', () => {
      cpu.setRegisterH(0x80);
      cpu.setRegisterL(0x02);
      mmu.writeByte(0x8002, 0b01001010); // Positive value

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x2e);

      cpu.step();

      expect(mmu.readByte(0x8002)).toBe(0b00100101); // Sign bit preserved as 0
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 0 was 0
      expect(cpu.getZeroFlag()).toBe(false);
    });
  });

  describe('SRA A (CB 0x2F)', () => {
    it('should handle accumulator shift with positive value', () => {
      cpu.setRegisterA(0x60); // 0b01100000 - positive value

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x2f);

      cpu.step();

      expect(cpu.getRegisters().a).toBe(0x30); // 0b00110000 - sign bit preserved
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 0 was 0
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });

    it('should handle accumulator shift with negative value', () => {
      cpu.setRegisterA(0x81); // 0b10000001 - negative value

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x2f);

      cpu.step();

      expect(cpu.getRegisters().a).toBe(0xc0); // 0b11000000 - sign bit preserved
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 0 was 1
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });

    it('should handle edge case: A = 0x00', () => {
      cpu.setRegisterA(0x00);
      cpu.setRegisterF(0b11110000); // All flags set

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x2f);

      cpu.step();

      expect(cpu.getRegisters().a).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Result is zero
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 0 was 0
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });
  });

  describe('SRA Edge Cases and Flag Behavior', () => {
    it('should preserve other register values during SRA operations', () => {
      // Set all registers to known values
      cpu.setRegisterA(0x11);
      cpu.setRegisterB(0x82); // Will be modified
      cpu.setRegisterC(0x33);
      cpu.setRegisterD(0x44);
      cpu.setRegisterE(0x55);
      cpu.setRegisterH(0x66);
      cpu.setRegisterL(0x77);

      // Execute SRA B
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x28);

      cpu.step();

      // Only B should change
      const registers = cpu.getRegisters();
      expect(registers.a).toBe(0x11);
      expect(registers.b).toBe(0xc1); // 0x82 >> 1 with sign preservation
      expect(registers.c).toBe(0x33);
      expect(registers.d).toBe(0x44);
      expect(registers.e).toBe(0x55);
      expect(registers.h).toBe(0x66);
      expect(registers.l).toBe(0x77);
    });

    it('should always clear N and H flags regardless of input', () => {
      const testCases = [
        { value: 0x00, expected: 0x00, carry: false, zero: true },
        { value: 0x80, expected: 0xc0, carry: false, zero: false },
        { value: 0xff, expected: 0xff, carry: true, zero: false },
        { value: 0x01, expected: 0x00, carry: true, zero: true },
        { value: 0x7e, expected: 0x3f, carry: false, zero: false },
      ];
      
      for (const testCase of testCases) {
        // Reset for each test
        mmu.reset();
        cpu = new CPU(mmu);
        
        cpu.setRegisterA(testCase.value);
        cpu.setRegisterF(0b01100000); // Set N=1, H=1 initially

        mmu.writeByte(0x0100, 0xcb);
        mmu.writeByte(0x0101, 0x2f); // SRA A

        cpu.step();

        expect(cpu.getRegisters().a).toBe(testCase.expected);
        expect(cpu.getCarryFlag()).toBe(testCase.carry);
        expect(cpu.getZeroFlag()).toBe(testCase.zero);
        expect(cpu.getSubtractFlag()).toBe(false); // Always cleared
        expect(cpu.getHalfCarryFlag()).toBe(false); // Always cleared
      }
    });

    it('should handle all negative values correctly (sign bit = 1)', () => {
      const negativeValues = [0x80, 0x81, 0x82, 0xfe, 0xff];
      
      for (const value of negativeValues) {
        // Reset for each test
        mmu.reset();
        cpu = new CPU(mmu);
        
        cpu.setRegisterA(value);

        mmu.writeByte(0x0100, 0xcb);
        mmu.writeByte(0x0101, 0x2f); // SRA A

        cpu.step();

        // Result should still have bit 7 set (sign preserved)
        expect(cpu.getRegisters().a & 0x80).toBe(0x80);
      }
    });

    it('should handle all positive values correctly (sign bit = 0)', () => {
      const positiveValues = [0x00, 0x01, 0x02, 0x7e, 0x7f];
      
      for (const value of positiveValues) {
        // Reset for each test
        mmu.reset();
        cpu = new CPU(mmu);
        
        cpu.setRegisterA(value);

        mmu.writeByte(0x0100, 0xcb);
        mmu.writeByte(0x0101, 0x2f); // SRA A

        cpu.step();

        // Result should still have bit 7 clear (sign preserved)
        expect(cpu.getRegisters().a & 0x80).toBe(0x00);
      }
    });
  });
});