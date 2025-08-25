/**
 * Tests for RLC (Rotate Left Circular) CB-prefixed instructions (0x00-0x07)
 *
 * RLC Operation: result = (value << 1) | (value >> 7)
 *
 * Hardware Specification per RGBDS GBZ80 Reference:
 * - C Flag: Set to old bit 7 value (the bit that was rotated out)
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

describe('CPU - RLC Instructions (CB 0x00-0x07)', () => {
  let cpu: CPUTestingComponent;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu);
    cpu.reset();
  });

  describe('RLC B (CB 0x00)', () => {
    test('rotates B register left circular - normal case 0x80 -> 0x01', () => {
      cpu.setRegisterB(0x80); // 10000000b
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x00);

      const cycles = cpu.step();

      expect(cpu.getRegisters().b).toBe(0x01); // 00000001b (bit 7 rotated to bit 0)
      expect(cpu.getZeroFlag()).toBe(false); // Result is not zero
      expect(cpu.getSubtractFlag()).toBe(false); // N flag always 0
      expect(cpu.getHalfCarryFlag()).toBe(false); // H flag always 0
      expect(cpu.getCarryFlag()).toBe(true); // C flag = old bit 7 (was 1)
      expect(cycles).toBe(8);
    });

    test('rotates B register left circular - zero result 0x00 -> 0x00', () => {
      cpu.setRegisterB(0x00);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x00);

      const cycles = cpu.step();

      expect(cpu.getRegisters().b).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Result is zero
      expect(cpu.getSubtractFlag()).toBe(false); // N flag always 0
      expect(cpu.getHalfCarryFlag()).toBe(false); // H flag always 0
      expect(cpu.getCarryFlag()).toBe(false); // C flag = old bit 7 (was 0)
      expect(cycles).toBe(8);
    });

    test('rotates B register left circular - all bits set 0xFF -> 0xFF', () => {
      cpu.setRegisterB(0xff);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x00);

      const cycles = cpu.step();

      expect(cpu.getRegisters().b).toBe(0xff); // 11111111b stays the same
      expect(cpu.getZeroFlag()).toBe(false); // Result is not zero
      expect(cpu.getSubtractFlag()).toBe(false); // N flag always 0
      expect(cpu.getHalfCarryFlag()).toBe(false); // H flag always 0
      expect(cpu.getCarryFlag()).toBe(true); // C flag = old bit 7 (was 1)
      expect(cycles).toBe(8);
    });

    test('rotates B register left circular - pattern 0x41 -> 0x82', () => {
      cpu.setRegisterB(0x41); // 01000001b
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x00);

      const cycles = cpu.step();

      expect(cpu.getRegisters().b).toBe(0x82); // 10000010b
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false); // C flag = old bit 7 (was 0)
      expect(cycles).toBe(8);
    });
  });

  describe('RLC C (CB 0x01)', () => {
    test('rotates C register left circular', () => {
      cpu.setRegisterC(0x80);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x01);

      const cycles = cpu.step();

      expect(cpu.getRegisters().c).toBe(0x01);
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true);
      expect(cycles).toBe(8);
    });
  });

  describe('RLC D (CB 0x02)', () => {
    test('rotates D register left circular', () => {
      cpu.setRegisterD(0x80);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x02);

      const cycles = cpu.step();

      expect(cpu.getRegisters().d).toBe(0x01);
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true);
      expect(cycles).toBe(8);
    });
  });

  describe('RLC E (CB 0x03)', () => {
    test('rotates E register left circular', () => {
      cpu.setRegisterE(0x80);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x03);

      const cycles = cpu.step();

      expect(cpu.getRegisters().e).toBe(0x01);
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true);
      expect(cycles).toBe(8);
    });
  });

  describe('RLC H (CB 0x04)', () => {
    test('rotates H register left circular', () => {
      cpu.setRegisterH(0x80);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x04);

      const cycles = cpu.step();

      expect(cpu.getRegisters().h).toBe(0x01);
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true);
      expect(cycles).toBe(8);
    });
  });

  describe('RLC L (CB 0x05)', () => {
    test('rotates L register left circular', () => {
      cpu.setRegisterL(0x80);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x05);

      const cycles = cpu.step();

      expect(cpu.getRegisters().l).toBe(0x01);
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true);
      expect(cycles).toBe(8);
    });
  });

  describe('RLC (HL) (CB 0x06)', () => {
    test('rotates memory at HL left circular - takes 16 cycles', () => {
      const address = 0x8000;
      cpu.setRegisterH((address >> 8) & 0xff);
      cpu.setRegisterL(address & 0xff);
      mmu.writeByte(address, 0x80);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x06);

      const cycles = cpu.step();

      expect(mmu.readByte(address)).toBe(0x01);
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true);
      expect(cycles).toBe(16); // Memory operations take 16 cycles
    });

    test('rotates memory at HL left circular - zero result', () => {
      const address = 0x8000;
      cpu.setRegisterH((address >> 8) & 0xff);
      cpu.setRegisterL(address & 0xff);
      mmu.writeByte(address, 0x00);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x06);

      const cycles = cpu.step();

      expect(mmu.readByte(address)).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false);
      expect(cycles).toBe(16);
    });
  });

  describe('RLC A (CB 0x07)', () => {
    test('rotates A register left circular', () => {
      cpu.setRegisterA(0x80);
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x07);

      const cycles = cpu.step();

      expect(cpu.getRegisters().a).toBe(0x01);
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true);
      expect(cycles).toBe(8);
    });
  });

  describe('Edge cases and flag verification', () => {
    test('RLC preserves other flag states appropriately', () => {
      // Set initial flag state
      cpu.setZeroFlag(true);
      cpu.setSubtractFlag(true);
      cpu.setHalfCarryFlag(true);
      cpu.setCarryFlag(false);

      cpu.setRegisterB(0x7f); // 01111111b
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x00);

      cpu.step();

      expect(cpu.getRegisters().b).toBe(0xfe); // 11111110b
      expect(cpu.getZeroFlag()).toBe(false); // Cleared because result is not zero
      expect(cpu.getSubtractFlag()).toBe(false); // Always 0 for RLC
      expect(cpu.getHalfCarryFlag()).toBe(false); // Always 0 for RLC
      expect(cpu.getCarryFlag()).toBe(false); // Old bit 7 was 0
    });

    test('RLC with mixed bit patterns', () => {
      cpu.setRegisterA(0xa5); // 10100101b
      cpu.setProgramCounter(0x100);
      mmu.writeByte(0x100, 0xcb);
      mmu.writeByte(0x101, 0x07);

      cpu.step();

      expect(cpu.getRegisters().a).toBe(0x4b); // 01001011b (rotated left)
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true); // Old bit 7 was 1
    });
  });
});
