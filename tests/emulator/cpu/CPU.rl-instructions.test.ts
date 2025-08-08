/**
 * Tests for RL (Rotate Left through carry) CB-prefixed instructions (0x10-0x17)
 *
 * RL Operation: result = (value << 1) | currentCarryFlag
 *
 * Hardware Specification per RGBDS GBZ80 Reference:
 * - C Flag: Set to old bit 7 value (the bit that shifts out)
 * - Z Flag: Set if result is 0x00, reset otherwise
 * - N Flag: Always reset (0)
 * - H Flag: Always reset (0)
 * - Cycles: 8 cycles (registers), 16 cycles (memory HL)
 *
 * KEY DIFFERENCE from RLC: RL uses current carry flag as the input bit
 *
 * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 */

import { CPU } from '../../../src/emulator/cpu/CPU.js';
import { MMU } from '../../../src/emulator/mmu/MMU.js';
import { CPUTestingComponent } from '../../../src/emulator/types.js';

describe('CPU - RL Instructions (CB 0x10-0x17)', () => {
  let cpu: CPUTestingComponent;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu);
    cpu.reset();
  });

  describe('RL B (CB 0x10)', () => {
    test('rotates B left through carry - carry clear: 0x80 with C=0 -> 0x00, C=1', () => {
      cpu.setRegisterB(0x80); // 10000000b
      cpu.setCarryFlag(false); // Carry = 0
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x10);

      const cycles = cpu.step();

      expect(cpu.getRegisters().b).toBe(0x00); // (0x80 << 1) | 0 = 0x00
      expect(cpu.getZeroFlag()).toBe(true); // Result is zero
      expect(cpu.getSubtractFlag()).toBe(false); // N flag always 0
      expect(cpu.getHalfCarryFlag()).toBe(false); // H flag always 0
      expect(cpu.getCarryFlag()).toBe(true); // C flag = old bit 7 (was 1)
      expect(cycles).toBe(8);
    });

    test('rotates B left through carry - carry set: 0x80 with C=1 -> 0x01, C=1', () => {
      cpu.setRegisterB(0x80); // 10000000b
      cpu.setCarryFlag(true); // Carry = 1
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x10);

      const cycles = cpu.step();

      expect(cpu.getRegisters().b).toBe(0x01); // (0x80 << 1) | 1 = 0x01
      expect(cpu.getZeroFlag()).toBe(false); // Result is not zero
      expect(cpu.getSubtractFlag()).toBe(false); // N flag always 0
      expect(cpu.getHalfCarryFlag()).toBe(false); // H flag always 0
      expect(cpu.getCarryFlag()).toBe(true); // C flag = old bit 7 (was 1)
      expect(cycles).toBe(8);
    });

    test('rotates B left through carry - zero with carry: 0x00 with C=1 -> 0x01, C=0', () => {
      cpu.setRegisterB(0x00); // 00000000b
      cpu.setCarryFlag(true); // Carry = 1
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x10);

      const cycles = cpu.step();

      expect(cpu.getRegisters().b).toBe(0x01); // (0x00 << 1) | 1 = 0x01
      expect(cpu.getZeroFlag()).toBe(false); // Result is not zero
      expect(cpu.getSubtractFlag()).toBe(false); // N flag always 0
      expect(cpu.getHalfCarryFlag()).toBe(false); // H flag always 0
      expect(cpu.getCarryFlag()).toBe(false); // C flag = old bit 7 (was 0)
      expect(cycles).toBe(8);
    });

    test('rotates B left through carry - normal case: 0x7F with C=0 -> 0xFE, C=0', () => {
      cpu.setRegisterB(0x7f); // 01111111b
      cpu.setCarryFlag(false); // Carry = 0
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x10);

      const cycles = cpu.step();

      expect(cpu.getRegisters().b).toBe(0xfe); // (0x7F << 1) | 0 = 0xFE
      expect(cpu.getZeroFlag()).toBe(false); // Result is not zero
      expect(cpu.getSubtractFlag()).toBe(false); // N flag always 0
      expect(cpu.getHalfCarryFlag()).toBe(false); // H flag always 0
      expect(cpu.getCarryFlag()).toBe(false); // C flag = old bit 7 (was 0)
      expect(cycles).toBe(8);
    });
  });

  describe('RL C (CB 0x11)', () => {
    test('rotates C left through carry - carry flag dependency test', () => {
      cpu.setRegisterC(0x85); // 10000101b
      cpu.setCarryFlag(true); // Carry = 1
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x11);

      const cycles = cpu.step();

      expect(cpu.getRegisters().c).toBe(0x0b); // (0x85 << 1) | 1 = 0x10A -> 0x0B
      expect(cpu.getZeroFlag()).toBe(false); // Result is not zero
      expect(cpu.getCarryFlag()).toBe(true); // C flag = old bit 7 (was 1)
      expect(cycles).toBe(8);
    });

    test('rotates C left through carry - boundary test zero result', () => {
      cpu.setRegisterC(0x80); // 10000000b
      cpu.setCarryFlag(false); // Carry = 0
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x11);

      const cycles = cpu.step();

      expect(cpu.getRegisters().c).toBe(0x00); // (0x80 << 1) | 0 = 0x00
      expect(cpu.getZeroFlag()).toBe(true); // Result is zero
      expect(cpu.getCarryFlag()).toBe(true); // C flag = old bit 7 (was 1)
      expect(cycles).toBe(8);
    });
  });

  describe('RL D (CB 0x12)', () => {
    test('rotates D left through carry - mixed bit pattern', () => {
      cpu.setRegisterD(0x42); // 01000010b
      cpu.setCarryFlag(true); // Carry = 1
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x12);

      const cycles = cpu.step();

      expect(cpu.getRegisters().d).toBe(0x85); // (0x42 << 1) | 1 = 0x85
      expect(cpu.getZeroFlag()).toBe(false); // Result is not zero
      expect(cpu.getCarryFlag()).toBe(false); // C flag = old bit 7 (was 0)
      expect(cycles).toBe(8);
    });
  });

  describe('RL E (CB 0x13)', () => {
    test('rotates E left through carry - all bits pattern', () => {
      cpu.setRegisterE(0xff); // 11111111b
      cpu.setCarryFlag(false); // Carry = 0
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x13);

      const cycles = cpu.step();

      expect(cpu.getRegisters().e).toBe(0xfe); // (0xFF << 1) | 0 = 0x1FE -> 0xFE
      expect(cpu.getZeroFlag()).toBe(false); // Result is not zero
      expect(cpu.getCarryFlag()).toBe(true); // C flag = old bit 7 (was 1)
      expect(cycles).toBe(8);
    });
  });

  describe('RL H (CB 0x14)', () => {
    test('rotates H left through carry - sequential carry test', () => {
      cpu.setRegisterH(0x40); // 01000000b
      cpu.setCarryFlag(true); // Carry = 1
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x14);

      const cycles = cpu.step();

      expect(cpu.getRegisters().h).toBe(0x81); // (0x40 << 1) | 1 = 0x81
      expect(cpu.getZeroFlag()).toBe(false); // Result is not zero
      expect(cpu.getCarryFlag()).toBe(false); // C flag = old bit 7 (was 0)
      expect(cycles).toBe(8);
    });
  });

  describe('RL L (CB 0x15)', () => {
    test('rotates L left through carry - edge case test', () => {
      cpu.setRegisterL(0x01); // 00000001b
      cpu.setCarryFlag(false); // Carry = 0
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x15);

      const cycles = cpu.step();

      expect(cpu.getRegisters().l).toBe(0x02); // (0x01 << 1) | 0 = 0x02
      expect(cpu.getZeroFlag()).toBe(false); // Result is not zero
      expect(cpu.getCarryFlag()).toBe(false); // C flag = old bit 7 (was 0)
      expect(cycles).toBe(8);
    });
  });

  describe('RL (HL) (CB 0x16)', () => {
    test('rotates memory at HL left through carry - memory operand', () => {
      const address = 0x8000;
      cpu.setRegisterH((address >> 8) & 0xff);
      cpu.setRegisterL(address & 0xff);
      mmu.writeByte(address, 0xc3); // 11000011b
      cpu.setCarryFlag(true); // Carry = 1
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x16);

      const cycles = cpu.step();

      expect(mmu.readByte(address)).toBe(0x87); // (0xC3 << 1) | 1 = 0x187 -> 0x87
      expect(cpu.getZeroFlag()).toBe(false); // Result is not zero
      expect(cpu.getSubtractFlag()).toBe(false); // N flag always 0
      expect(cpu.getHalfCarryFlag()).toBe(false); // H flag always 0
      expect(cpu.getCarryFlag()).toBe(true); // C flag = old bit 7 (was 1)
      expect(cycles).toBe(16); // Memory operations take 16 cycles
    });

    test('rotates memory at HL left through carry - zero result with memory', () => {
      const address = 0x8000;
      cpu.setRegisterH((address >> 8) & 0xff);
      cpu.setRegisterL(address & 0xff);
      mmu.writeByte(address, 0x80); // 10000000b
      cpu.setCarryFlag(false); // Carry = 0
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x16);

      const cycles = cpu.step();

      expect(mmu.readByte(address)).toBe(0x00); // (0x80 << 1) | 0 = 0x00
      expect(cpu.getZeroFlag()).toBe(true); // Result is zero
      expect(cpu.getCarryFlag()).toBe(true); // C flag = old bit 7 (was 1)
      expect(cycles).toBe(16);
    });
  });

  describe('RL A (CB 0x17)', () => {
    test('rotates A left through carry - accumulator test', () => {
      cpu.setRegisterA(0x95); // 10010101b
      cpu.setCarryFlag(false); // Carry = 0
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x17);

      const cycles = cpu.step();

      expect(cpu.getRegisters().a).toBe(0x2a); // (0x95 << 1) | 0 = 0x12A -> 0x2A
      expect(cpu.getZeroFlag()).toBe(false); // Result is not zero
      expect(cpu.getCarryFlag()).toBe(true); // C flag = old bit 7 (was 1)
      expect(cycles).toBe(8);
    });

    test('rotates A left through carry - carry propagation test', () => {
      cpu.setRegisterA(0x00); // 00000000b
      cpu.setCarryFlag(true); // Carry = 1
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x17);

      const cycles = cpu.step();

      expect(cpu.getRegisters().a).toBe(0x01); // (0x00 << 1) | 1 = 0x01
      expect(cpu.getZeroFlag()).toBe(false); // Result is not zero
      expect(cpu.getCarryFlag()).toBe(false); // C flag = old bit 7 (was 0)
      expect(cycles).toBe(8);
    });
  });

  describe('RL Instructions - Comprehensive Flag Behavior', () => {
    test.each([
      { reg: 'B', opcode: 0x10, setMethod: 'setRegisterB' },
      { reg: 'C', opcode: 0x11, setMethod: 'setRegisterC' },
      { reg: 'D', opcode: 0x12, setMethod: 'setRegisterD' },
      { reg: 'E', opcode: 0x13, setMethod: 'setRegisterE' },
      { reg: 'H', opcode: 0x14, setMethod: 'setRegisterH' },
      { reg: 'L', opcode: 0x15, setMethod: 'setRegisterL' },
      { reg: 'A', opcode: 0x17, setMethod: 'setRegisterA' },
    ])('RL $reg - N and H flags always reset', ({ opcode, setMethod }) => {
      // Set register to any value with some flags set initially
      (cpu as any)[setMethod](0x55);
      cpu.setSubtractFlag(true); // N flag initially set
      cpu.setHalfCarryFlag(true); // H flag initially set
      cpu.setCarryFlag(false);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, opcode);

      cpu.step();

      expect(cpu.getSubtractFlag()).toBe(false); // N flag always reset
      expect(cpu.getHalfCarryFlag()).toBe(false); // H flag always reset
    });

    test('RL instructions - carry flag dependency comprehensive test', () => {
      const testCases = [
        { value: 0x80, carryIn: false, expectedResult: 0x00, expectedCarryOut: true },
        { value: 0x80, carryIn: true, expectedResult: 0x01, expectedCarryOut: true },
        { value: 0x7f, carryIn: false, expectedResult: 0xfe, expectedCarryOut: false },
        { value: 0x7f, carryIn: true, expectedResult: 0xff, expectedCarryOut: false },
        { value: 0x00, carryIn: false, expectedResult: 0x00, expectedCarryOut: false },
        { value: 0x00, carryIn: true, expectedResult: 0x01, expectedCarryOut: false },
      ];

      testCases.forEach(({ value, carryIn, expectedResult, expectedCarryOut }) => {
        cpu.reset();
        cpu.setRegisterB(value);
        cpu.setCarryFlag(carryIn);
        cpu.setProgramCounter(0x100);
        mmu.writeByte(0x100, 0xcb);
        mmu.writeByte(0x101, 0x10); // RL B

        cpu.step();

        expect(cpu.getRegisters().b).toBe(expectedResult);
        expect(cpu.getCarryFlag()).toBe(expectedCarryOut);
        expect(cpu.getZeroFlag()).toBe(expectedResult === 0x00);
      });
    });
  });
});
