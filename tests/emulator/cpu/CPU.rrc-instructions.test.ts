/**
 * Tests for RRC (Rotate Right Circular) CB-prefixed instructions (0x08-0x0F)
 *
 * RRC Operation: result = (value >> 1) | (value << 7)
 *
 * Hardware Specification per RGBDS GBZ80 Reference:
 * - C Flag: Set to old bit 0 value (the bit that was rotated out)
 * - Z Flag: Set if result is 0x00, reset otherwise
 * - N Flag: Always reset (0)
 * - H Flag: Always reset (0)
 * - Cycles: 8 cycles (registers), 16 cycles (memory HL)
 *
 * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 */

import { CPU } from '../../../src/emulator/cpu/CPU.js';
import { MMU } from '../../../src/emulator/mmu/MMU.js';
import { CPUTestingComponent } from '../../../src/emulator/types.js';

describe('CPU - RRC Instructions (CB 0x08-0x0F)', () => {
  let cpu: CPUTestingComponent;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu);
    cpu.reset();
  });

  describe('RRC B (CB 0x08)', () => {
    test('rotates B register right circular - normal case 0x01 -> 0x80', () => {
      cpu.setRegisterB(0x01); // 00000001b
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x08);

      const cycles = cpu.step();

      expect(cpu.getRegisters().b).toBe(0x80); // 10000000b (bit 0 rotated to bit 7)
      expect(cpu.getZeroFlag()).toBe(false); // Result is not zero
      expect(cpu.getSubtractFlag()).toBe(false); // N flag always 0
      expect(cpu.getHalfCarryFlag()).toBe(false); // H flag always 0
      expect(cpu.getCarryFlag()).toBe(true); // C flag = old bit 0 (was 1)
      expect(cycles).toBe(8);
    });

    test('rotates B register right circular - zero result 0x00 -> 0x00', () => {
      cpu.setRegisterB(0x00);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x08);

      const cycles = cpu.step();

      expect(cpu.getRegisters().b).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Result is zero
      expect(cpu.getSubtractFlag()).toBe(false); // N flag always 0
      expect(cpu.getHalfCarryFlag()).toBe(false); // H flag always 0
      expect(cpu.getCarryFlag()).toBe(false); // C flag = old bit 0 (was 0)
      expect(cycles).toBe(8);
    });

    test('rotates B register right circular - all bits set 0xFF -> 0xFF', () => {
      cpu.setRegisterB(0xff);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x08);

      const cycles = cpu.step();

      expect(cpu.getRegisters().b).toBe(0xff); // All bits remain set
      expect(cpu.getZeroFlag()).toBe(false); // Result is not zero
      expect(cpu.getSubtractFlag()).toBe(false); // N flag always 0
      expect(cpu.getHalfCarryFlag()).toBe(false); // H flag always 0
      expect(cpu.getCarryFlag()).toBe(true); // C flag = old bit 0 (was 1)
      expect(cycles).toBe(8);
    });
  });

  describe('RRC C (CB 0x09)', () => {
    test('rotates C register right circular - normal case 0x01 -> 0x80', () => {
      cpu.setRegisterC(0x01);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x09);

      const cycles = cpu.step();

      expect(cpu.getRegisters().c).toBe(0x80);
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true);
      expect(cycles).toBe(8);
    });

    test('rotates C register right circular - zero result', () => {
      cpu.setRegisterC(0x00);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x09);

      const cycles = cpu.step();

      expect(cpu.getRegisters().c).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true);
      expect(cpu.getCarryFlag()).toBe(false);
      expect(cycles).toBe(8);
    });
  });

  describe('RRC D (CB 0x0A)', () => {
    test('rotates D register right circular - normal case 0x01 -> 0x80', () => {
      cpu.setRegisterD(0x01);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x0a);

      const cycles = cpu.step();

      expect(cpu.getRegisters().d).toBe(0x80);
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true);
      expect(cycles).toBe(8);
    });

    test('rotates D register right circular - zero result', () => {
      cpu.setRegisterD(0x00);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x0a);

      const cycles = cpu.step();

      expect(cpu.getRegisters().d).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true);
      expect(cpu.getCarryFlag()).toBe(false);
      expect(cycles).toBe(8);
    });
  });

  describe('RRC E (CB 0x0B)', () => {
    test('rotates E register right circular - normal case 0x01 -> 0x80', () => {
      cpu.setRegisterE(0x01);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x0b);

      const cycles = cpu.step();

      expect(cpu.getRegisters().e).toBe(0x80);
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true);
      expect(cycles).toBe(8);
    });

    test('rotates E register right circular - zero result', () => {
      cpu.setRegisterE(0x00);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x0b);

      const cycles = cpu.step();

      expect(cpu.getRegisters().e).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true);
      expect(cpu.getCarryFlag()).toBe(false);
      expect(cycles).toBe(8);
    });
  });

  describe('RRC H (CB 0x0C)', () => {
    test('rotates H register right circular - normal case 0x01 -> 0x80', () => {
      cpu.setRegisterH(0x01);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x0c);

      const cycles = cpu.step();

      expect(cpu.getRegisters().h).toBe(0x80);
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true);
      expect(cycles).toBe(8);
    });

    test('rotates H register right circular - zero result', () => {
      cpu.setRegisterH(0x00);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x0c);

      const cycles = cpu.step();

      expect(cpu.getRegisters().h).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true);
      expect(cpu.getCarryFlag()).toBe(false);
      expect(cycles).toBe(8);
    });
  });

  describe('RRC L (CB 0x0D)', () => {
    test('rotates L register right circular - normal case 0x01 -> 0x80', () => {
      cpu.setRegisterL(0x01);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x0d);

      const cycles = cpu.step();

      expect(cpu.getRegisters().l).toBe(0x80);
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true);
      expect(cycles).toBe(8);
    });

    test('rotates L register right circular - zero result', () => {
      cpu.setRegisterL(0x00);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x0d);

      const cycles = cpu.step();

      expect(cpu.getRegisters().l).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true);
      expect(cpu.getCarryFlag()).toBe(false);
      expect(cycles).toBe(8);
    });
  });

  describe('RRC (HL) (CB 0x0E)', () => {
    test('rotates memory at HL right circular - normal case 0x01 -> 0x80', () => {
      cpu.setRegisterH(0x80);
      cpu.setRegisterL(0x00);
      mmu.writeByte(0x8000, 0x01); // Memory value
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x0e);

      const cycles = cpu.step();

      expect(mmu.readByte(0x8000)).toBe(0x80);
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true);
      expect(cycles).toBe(16); // Memory operations take 16 cycles
    });

    test('rotates memory at HL right circular - zero result', () => {
      cpu.setRegisterH(0x80);
      cpu.setRegisterL(0x00);
      mmu.writeByte(0x8000, 0x00);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x0e);

      const cycles = cpu.step();

      expect(mmu.readByte(0x8000)).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true);
      expect(cpu.getCarryFlag()).toBe(false);
      expect(cycles).toBe(16);
    });
  });

  describe('RRC A (CB 0x0F)', () => {
    test('rotates A register right circular - normal case 0x01 -> 0x80', () => {
      cpu.setRegisterA(0x01);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x0f);

      const cycles = cpu.step();

      expect(cpu.getRegisters().a).toBe(0x80);
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true);
      expect(cycles).toBe(8);
    });

    test('rotates A register right circular - zero result', () => {
      cpu.setRegisterA(0x00);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x0f);

      const cycles = cpu.step();

      expect(cpu.getRegisters().a).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true);
      expect(cpu.getCarryFlag()).toBe(false);
      expect(cycles).toBe(8);
    });
  });

  describe('RRC Instructions - Comprehensive Flag Behavior', () => {
    test('RRC properly sets carry flag from bit 0 - test with 0x42', () => {
      // 0x42 = 01000010b -> RRC -> 00100001b = 0x21, C=0 (bit 0 was 0)
      cpu.setRegisterB(0x42);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x08);

      cpu.step();

      expect(cpu.getRegisters().b).toBe(0x21);
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 0 was 0
      expect(cpu.getZeroFlag()).toBe(false);
    });

    test('RRC properly sets carry flag from bit 0 - test with 0x43', () => {
      // 0x43 = 01000011b -> RRC -> 10100001b = 0xA1, C=1 (bit 0 was 1)
      cpu.setRegisterC(0x43);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x09);

      cpu.step();

      expect(cpu.getRegisters().c).toBe(0xa1);
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 0 was 1
      expect(cpu.getZeroFlag()).toBe(false);
    });

    test('RRC always resets N and H flags regardless of input', () => {
      // Set some flags first
      cpu.setSubtractFlag(true);
      cpu.setHalfCarryFlag(true);

      cpu.setRegisterD(0x55);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x0a);

      cpu.step();

      expect(cpu.getSubtractFlag()).toBe(false); // N always 0
      expect(cpu.getHalfCarryFlag()).toBe(false); // H always 0
    });
  });
});
