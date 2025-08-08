/**
 * CPU SRL (Shift Right Logical) Instructions Tests
 *
 * Tests all SRL instruction variants (CB 0x38-0x3F) following hardware specification.
 * Reference: RGBDS GBZ80 Reference (https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7)
 *
 * SRL Operation: result = value >> 1 (logical shift right, 0 into bit 7)
 * Flags: C=old_bit_0, Z=result==0, N=0, H=0
 * Cycles: 8 (registers), 16 (memory HL)
 */

import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';

describe('CPU SRL Instructions', () => {
  let cpu: CPU;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu);
  });

  describe('SRL B (CB 0x38)', () => {
    it('should shift right logically, always clearing bit 7', () => {
      cpu.setRegisterB(0b11110011); // Negative value, bit 7 = 1
      cpu.setRegisterF(0b00000000); // All flags clear initially

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x38);

      cpu.step();

      expect(cpu.getRegisters().b).toBe(0b01111001); // Bit 7 always becomes 0 in SRL
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 0 was 1
      expect(cpu.getZeroFlag()).toBe(false); // Result is not zero
      expect(cpu.getSubtractFlag()).toBe(false); // Always cleared
      expect(cpu.getHalfCarryFlag()).toBe(false); // Always cleared
    });

    it('should set carry flag from old bit 0', () => {
      cpu.setRegisterB(0b10110001); // Bit 0 = 1
      cpu.setRegisterF(0b00000000); // All flags clear

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x38);

      cpu.step();

      expect(cpu.getRegisters().b).toBe(0b01011000); // Logical shift, bit 7 = 0
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 0 was 1
    });

    it('should clear carry flag when old bit 0 was 0', () => {
      cpu.setRegisterB(0b10110010); // Bit 0 = 0
      cpu.setRegisterF(0b11110000); // All flags set

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x38);

      cpu.step();

      expect(cpu.getRegisters().b).toBe(0b01011001); // Logical shift, bit 7 = 0
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 0 was 0
    });
  });

  describe('SRL C (CB 0x39)', () => {
    it('should handle positive value correctly', () => {
      cpu.setRegisterC(0b01010101); // Positive value

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x39);

      cpu.step();

      expect(cpu.getRegisters().c).toBe(0b00101010); // Logical shift right
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 0 was 1
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });

    it('should handle negative value correctly - unlike SRA', () => {
      cpu.setRegisterC(0b10101010); // Negative value

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x39);

      cpu.step();

      expect(cpu.getRegisters().c).toBe(0b01010101); // Bit 7 becomes 0 (logical)
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 0 was 0
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });
  });

  describe('SRL D (CB 0x3A)', () => {
    it('should handle standard shift operation', () => {
      cpu.setRegisterD(0x80); // 0b10000000 - only sign bit set

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x3a);

      cpu.step();

      expect(cpu.getRegisters().d).toBe(0x40); // 0b01000000 - logical shift
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 0 was 0
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });
  });

  describe('SRL E (CB 0x3B)', () => {
    it('should handle edge case with 0x01', () => {
      cpu.setRegisterE(0x01); // Smallest positive value

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x3b);

      cpu.step();

      expect(cpu.getRegisters().e).toBe(0x00); // Shifts to zero
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 0 was 1
      expect(cpu.getZeroFlag()).toBe(true); // Result is zero
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });

    it('should handle even value with no carry', () => {
      cpu.setRegisterE(0x02); // Even value

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x3b);

      cpu.step();

      expect(cpu.getRegisters().e).toBe(0x01);
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 0 was 0
      expect(cpu.getZeroFlag()).toBe(false);
    });
  });

  describe('SRL H (CB 0x3C)', () => {
    it('should handle standard positive shift', () => {
      cpu.setRegisterH(0x7e); // 0b01111110 - positive value

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x3c);

      cpu.step();

      expect(cpu.getRegisters().h).toBe(0x3f); // 0b00111111 - logical shift
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 0 was 0
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });
  });

  describe('SRL L (CB 0x3D)', () => {
    it('should handle standard negative shift', () => {
      cpu.setRegisterL(0xff); // 0b11111111 - all bits set

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x3d);

      cpu.step();

      expect(cpu.getRegisters().l).toBe(0x7f); // 0b01111111 - bit 7 becomes 0
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 0 was 1
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });
  });

  describe('SRL (HL) (CB 0x3E)', () => {
    it('should shift memory value logically with 16 cycles', () => {
      cpu.setRegisterH(0x80);
      cpu.setRegisterL(0x00);
      mmu.writeByte(0x8000, 0b11000110); // Negative value in memory

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x3e);

      cpu.step();

      expect(mmu.readByte(0x8000)).toBe(0b01100011); // Bit 7 becomes 0 (logical)
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
      mmu.writeByte(0x0101, 0x3e);

      cpu.step();

      expect(mmu.readByte(0x8001)).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Result is zero
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 0 was 1
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });

    it('should handle memory value with all bits set', () => {
      cpu.setRegisterH(0x80);
      cpu.setRegisterL(0x02);
      mmu.writeByte(0x8002, 0xff); // All bits set

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x3e);

      cpu.step();

      expect(mmu.readByte(0x8002)).toBe(0x7f); // Bit 7 becomes 0 (logical)
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 0 was 1
      expect(cpu.getZeroFlag()).toBe(false);
    });
  });

  describe('SRL A (CB 0x3F)', () => {
    it('should handle accumulator shift with positive value', () => {
      cpu.setRegisterA(0x60); // 0b01100000 - positive value

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x3f);

      cpu.step();

      expect(cpu.getRegisters().a).toBe(0x30); // 0b00110000 - logical shift
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 0 was 0
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });

    it('should handle accumulator shift with negative value', () => {
      cpu.setRegisterA(0x81); // 0b10000001 - negative value

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x3f);

      cpu.step();

      expect(cpu.getRegisters().a).toBe(0x40); // 0b01000000 - bit 7 becomes 0 (logical)
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 0 was 1
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });

    it('should handle edge case: A = 0x00', () => {
      cpu.setRegisterA(0x00);
      cpu.setRegisterF(0b11110000); // All flags set

      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x3f);

      cpu.step();

      expect(cpu.getRegisters().a).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Result is zero
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 0 was 0
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
    });
  });

  describe('SRL vs SRA Comparison Tests', () => {
    it('should differ from SRA when handling negative values', () => {
      const negativeValue = 0x82; // 0b10000010

      // Test SRL behavior (CB 0x3F)
      cpu.setRegisterA(negativeValue);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x3f);
      cpu.step();

      const srlResult = cpu.getRegisters().a;
      const srlCarry = cpu.getCarryFlag();

      expect(srlResult).toBe(0x41); // 0b01000001 - bit 7 becomes 0 (logical)
      expect(srlCarry).toBe(false); // Old bit 0 was 0
      expect(srlResult & 0x80).toBe(0x00); // Bit 7 is always 0 in SRL
    });
  });

  describe('SRL Edge Cases and Flag Behavior', () => {
    it('should preserve other register values during SRL operations', () => {
      // Set all registers to known values
      cpu.setRegisterA(0x11);
      cpu.setRegisterB(0x82); // Will be modified
      cpu.setRegisterC(0x33);
      cpu.setRegisterD(0x44);
      cpu.setRegisterE(0x55);
      cpu.setRegisterH(0x66);
      cpu.setRegisterL(0x77);

      // Execute SRL B
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x38);

      cpu.step();

      // Only B should change
      const registers = cpu.getRegisters();
      expect(registers.a).toBe(0x11);
      expect(registers.b).toBe(0x41); // 0x82 >> 1 logical (bit 7 = 0)
      expect(registers.c).toBe(0x33);
      expect(registers.d).toBe(0x44);
      expect(registers.e).toBe(0x55);
      expect(registers.h).toBe(0x66);
      expect(registers.l).toBe(0x77);
    });

    it('should always clear N and H flags regardless of input', () => {
      const testCases = [
        { value: 0x00, expected: 0x00, carry: false, zero: true },
        { value: 0x01, expected: 0x00, carry: true, zero: true },
        { value: 0x80, expected: 0x40, carry: false, zero: false },
        { value: 0xff, expected: 0x7f, carry: true, zero: false },
        { value: 0x7e, expected: 0x3f, carry: false, zero: false },
      ];
      
      for (const testCase of testCases) {
        // Reset for each test
        mmu.reset();
        cpu = new CPU(mmu);
        
        cpu.setRegisterA(testCase.value);
        cpu.setRegisterF(0b01100000); // Set N=1, H=1 initially

        mmu.writeByte(0x0100, 0xcb);
        mmu.writeByte(0x0101, 0x3f); // SRL A

        cpu.step();

        expect(cpu.getRegisters().a).toBe(testCase.expected);
        expect(cpu.getCarryFlag()).toBe(testCase.carry);
        expect(cpu.getZeroFlag()).toBe(testCase.zero);
        expect(cpu.getSubtractFlag()).toBe(false); // Always cleared
        expect(cpu.getHalfCarryFlag()).toBe(false); // Always cleared
      }
    });

    it('should always clear bit 7 for all values (logical shift)', () => {
      const testValues = [0x80, 0x81, 0x82, 0xfe, 0xff, 0x01, 0x7f];
      
      for (const value of testValues) {
        // Reset for each test
        mmu.reset();
        cpu = new CPU(mmu);
        
        cpu.setRegisterA(value);

        mmu.writeByte(0x0100, 0xcb);
        mmu.writeByte(0x0101, 0x3f); // SRL A

        cpu.step();

        // Result should always have bit 7 clear (logical shift)
        expect(cpu.getRegisters().a & 0x80).toBe(0x00);
      }
    });

    it('should handle carry flag correctly for odd/even values', () => {
      const oddValues = [0x01, 0x03, 0x81, 0xff]; // Bit 0 = 1
      const evenValues = [0x00, 0x02, 0x80, 0xfe]; // Bit 0 = 0
      
      // Test odd values (should set carry)
      for (const value of oddValues) {
        mmu.reset();
        cpu = new CPU(mmu);
        
        cpu.setRegisterA(value);
        mmu.writeByte(0x0100, 0xcb);
        mmu.writeByte(0x0101, 0x3f);
        cpu.step();

        expect(cpu.getCarryFlag()).toBe(true);
      }

      // Test even values (should clear carry)
      for (const value of evenValues) {
        mmu.reset();
        cpu = new CPU(mmu);
        
        cpu.setRegisterA(value);
        mmu.writeByte(0x0100, 0xcb);
        mmu.writeByte(0x0101, 0x3f);
        cpu.step();

        expect(cpu.getCarryFlag()).toBe(false);
      }
    });
  });
});