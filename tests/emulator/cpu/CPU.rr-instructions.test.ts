/**
 * SM83 CPU RR Instruction Test Suite
 *
 * Tests for CB-prefixed RR (Rotate Right through carry) instructions
 *
 * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 * Hardware: Each instruction is 2 bytes, 8 cycles for registers (16 for (HL))
 *
 * RR Operation: Rotates register right through carry flag
 *   C ← [7...0] ← C
 *
 * Flags: Z=result_is_zero, N=0, H=0, C=bit_0_before_rotation
 */

import { CPUTestingComponent, MMUComponent } from '../../../src/emulator/types';
import { CPU } from '../../../src/emulator/cpu';
import { MMU } from '../../../src/emulator/mmu';

describe('SM83 CPU RR Instructions', () => {
  let cpu: CPUTestingComponent;
  let mmu: MMUComponent;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu);
    mmu.setPostBootState();
  });

  describe('CB 0x19: RR C - Rotate C right through carry', () => {
    it('should rotate C right with carry=0 and bit 0 becomes carry', () => {
      // Test: C=0b10101010, carry=0 → C=0b01010101, carry=0
      cpu.setRegisterC(0b10101010); // 0xAA
      cpu.setCarryFlag(false);

      // Setup CB 0x19 instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x19);

      const cycles = cpu.step();

      expect(cpu.getRegisters().c).toBe(0b01010101); // 0x55
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false); // bit 0 was 0
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x0102);
    });

    it('should rotate C right with carry=0 and set carry from bit 0', () => {
      // Test: C=0b10101011, carry=0 → C=0b01010101, carry=1
      cpu.setRegisterC(0b10101011); // 0xAB
      cpu.setCarryFlag(false);

      // Setup CB 0x19 instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x19);

      const cycles = cpu.step();

      expect(cpu.getRegisters().c).toBe(0b01010101); // 0x55
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true); // bit 0 was 1
      expect(cycles).toBe(8);
    });

    it('should rotate C right with carry=1 becomes bit 7', () => {
      // Test: C=0b01010100, carry=1 → C=0b10101010, carry=0
      cpu.setRegisterC(0b01010100); // 0x54
      cpu.setCarryFlag(true);

      // Setup CB 0x19 instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x19);

      const cycles = cpu.step();

      expect(cpu.getRegisters().c).toBe(0b10101010); // 0xAA
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false); // bit 0 was 0
      expect(cycles).toBe(8);
    });

    it('should set zero flag when result is 0', () => {
      // Test: C=0b00000001, carry=0 → C=0b00000000, carry=1, Z=1
      cpu.setRegisterC(0b00000001); // 0x01
      cpu.setCarryFlag(false);

      // Setup CB 0x19 instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x19);

      const cycles = cpu.step();

      expect(cpu.getRegisters().c).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Result is zero
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true); // bit 0 was 1
      expect(cycles).toBe(8);
    });

    it('should handle edge case with carry=1 and C=0', () => {
      // Test: C=0b00000000, carry=1 → C=0b10000000, carry=0
      cpu.setRegisterC(0x00);
      cpu.setCarryFlag(true);

      // Setup CB 0x19 instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x19);

      const cycles = cpu.step();

      expect(cpu.getRegisters().c).toBe(0x80);
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false); // bit 0 was 0
      expect(cycles).toBe(8);
    });
  });

  describe('CB 0x1A: RR D - Rotate D right through carry', () => {
    it('should rotate D right with carry=0 and bit 0 becomes carry', () => {
      // Test: D=0b10101010, carry=0 → D=0b01010101, carry=0
      cpu.setRegisterD(0b10101010); // 0xAA
      cpu.setCarryFlag(false);

      // Setup CB 0x1A instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x1a);

      const cycles = cpu.step();

      expect(cpu.getRegisters().d).toBe(0b01010101); // 0x55
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false); // bit 0 was 0
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x0102);
    });

    it('should rotate D right with carry=0 and set carry from bit 0', () => {
      // Test: D=0b10101011, carry=0 → D=0b01010101, carry=1
      cpu.setRegisterD(0b10101011); // 0xAB
      cpu.setCarryFlag(false);

      // Setup CB 0x1A instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x1a);

      const cycles = cpu.step();

      expect(cpu.getRegisters().d).toBe(0b01010101); // 0x55
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true); // bit 0 was 1
      expect(cycles).toBe(8);
    });

    it('should rotate D right with carry=1 becomes bit 7', () => {
      // Test: D=0b01010100, carry=1 → D=0b10101010, carry=0
      cpu.setRegisterD(0b01010100); // 0x54
      cpu.setCarryFlag(true);

      // Setup CB 0x1A instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x1a);

      const cycles = cpu.step();

      expect(cpu.getRegisters().d).toBe(0b10101010); // 0xAA
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false); // bit 0 was 0
      expect(cycles).toBe(8);
    });

    it('should set zero flag when result is 0', () => {
      // Test: D=0b00000001, carry=0 → D=0b00000000, carry=1, Z=1
      cpu.setRegisterD(0b00000001); // 0x01
      cpu.setCarryFlag(false);

      // Setup CB 0x1A instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x1a);

      const cycles = cpu.step();

      expect(cpu.getRegisters().d).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Result is zero
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true); // bit 0 was 1
      expect(cycles).toBe(8);
    });

    it('should handle edge case with carry=1 and D=0', () => {
      // Test: D=0b00000000, carry=1 → D=0b10000000, carry=0
      cpu.setRegisterD(0x00);
      cpu.setCarryFlag(true);

      // Setup CB 0x1A instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x1a);

      const cycles = cpu.step();

      expect(cpu.getRegisters().d).toBe(0x80);
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false); // bit 0 was 0
      expect(cycles).toBe(8);
    });
  });

  describe('CB 0x18: RR B - Rotate B right through carry', () => {
    it('should rotate B right with carry=0 and bit 0 becomes carry', () => {
      // Test: B=0b10101010, carry=0 → B=0b01010101, carry=0
      cpu.setRegisterB(0b10101010); // 0xAA
      cpu.setCarryFlag(false);

      // Setup CB 0x18 instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x18);

      const cycles = cpu.step();

      expect(cpu.getRegisters().b).toBe(0b01010101); // 0x55
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false); // bit 0 was 0
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x0102);
    });

    it('should set zero flag when result is 0', () => {
      // Test: B=0b00000001, carry=0 → B=0b00000000, carry=1, Z=1
      cpu.setRegisterB(0b00000001); // 0x01
      cpu.setCarryFlag(false);

      // Setup CB 0x18 instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x18);

      const cycles = cpu.step();

      expect(cpu.getRegisters().b).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Result is zero
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true); // bit 0 was 1
      expect(cycles).toBe(8);
    });
  });

  describe('CB 0x1B: RR E - Rotate E right through carry', () => {
    it('should rotate E right with carry=1 becomes bit 7', () => {
      // Test: E=0b01010100, carry=1 → E=0b10101010, carry=0
      cpu.setRegisterE(0b01010100); // 0x54
      cpu.setCarryFlag(true);

      // Setup CB 0x1B instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x1b);

      const cycles = cpu.step();

      expect(cpu.getRegisters().e).toBe(0b10101010); // 0xAA
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false); // bit 0 was 0
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x0102);
    });

    it('should rotate E right with carry=0 and set carry from bit 0', () => {
      // Test: E=0b10101011, carry=0 → E=0b01010101, carry=1
      cpu.setRegisterE(0b10101011); // 0xAB
      cpu.setCarryFlag(false);

      // Setup CB 0x1B instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x1b);

      const cycles = cpu.step();

      expect(cpu.getRegisters().e).toBe(0b01010101); // 0x55
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true); // bit 0 was 1
      expect(cycles).toBe(8);
    });
  });

  describe('CB 0x1C: RR H - Rotate H right through carry', () => {
    it('should rotate H right with carry=0 and bit 0 becomes carry', () => {
      // Test: H=0b10101010, carry=0 → H=0b01010101, carry=0
      cpu.setRegisterH(0b10101010); // 0xAA
      cpu.setCarryFlag(false);

      // Setup CB 0x1C instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x1c);

      const cycles = cpu.step();

      expect(cpu.getRegisters().h).toBe(0b01010101); // 0x55
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false); // bit 0 was 0
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x0102);
    });

    it('should set zero flag when result is 0', () => {
      // Test: H=0b00000001, carry=0 → H=0b00000000, carry=1, Z=1
      cpu.setRegisterH(0b00000001); // 0x01
      cpu.setCarryFlag(false);

      // Setup CB 0x1C instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x1c);

      const cycles = cpu.step();

      expect(cpu.getRegisters().h).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Result is zero
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true); // bit 0 was 1
      expect(cycles).toBe(8);
    });
  });

  describe('CB 0x1D: RR L - Rotate L right through carry', () => {
    it('should rotate L right with carry=1 becomes bit 7', () => {
      // Test: L=0b01010100, carry=1 → L=0b10101010, carry=0
      cpu.setRegisterL(0b01010100); // 0x54
      cpu.setCarryFlag(true);

      // Setup CB 0x1D instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x1d);

      const cycles = cpu.step();

      expect(cpu.getRegisters().l).toBe(0b10101010); // 0xAA
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false); // bit 0 was 0
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x0102);
    });

    it('should rotate L right with carry=0 and set carry from bit 0', () => {
      // Test: L=0b10101011, carry=0 → L=0b01010101, carry=1
      cpu.setRegisterL(0b10101011); // 0xAB
      cpu.setCarryFlag(false);

      // Setup CB 0x1D instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x1d);

      const cycles = cpu.step();

      expect(cpu.getRegisters().l).toBe(0b01010101); // 0x55
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true); // bit 0 was 1
      expect(cycles).toBe(8);
    });
  });

  describe('CB 0x1E: RR (HL) - Rotate memory at HL right through carry', () => {
    it('should rotate memory at HL right with carry=0', () => {
      // Test: (HL)=0b10101010, carry=0 → (HL)=0b01010101, carry=0
      const testAddr = 0x8000;
      cpu.setRegisterH((testAddr >> 8) & 0xff);
      cpu.setRegisterL(testAddr & 0xff);
      mmu.writeByte(testAddr, 0b10101010); // 0xAA
      cpu.setCarryFlag(false);

      // Setup CB 0x1E instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x1e);

      const cycles = cpu.step();

      expect(mmu.readByte(testAddr)).toBe(0b01010101); // 0x55
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false); // bit 0 was 0
      expect(cycles).toBe(16); // Memory operations take 16 cycles
      expect(cpu.getPC()).toBe(0x0102);
    });

    it('should rotate memory at HL right with carry=1 and set zero flag', () => {
      // Test: (HL)=0b00000001, carry=0 → (HL)=0b00000000, carry=1, Z=1
      const testAddr = 0x8000;
      cpu.setRegisterH((testAddr >> 8) & 0xff);
      cpu.setRegisterL(testAddr & 0xff);
      mmu.writeByte(testAddr, 0b00000001); // 0x01
      cpu.setCarryFlag(false);

      // Setup CB 0x1E instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x1e);

      const cycles = cpu.step();

      expect(mmu.readByte(testAddr)).toBe(0x00);
      expect(cpu.getZeroFlag()).toBe(true); // Result is zero
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(true); // bit 0 was 1
      expect(cycles).toBe(16);
    });
  });

  describe('CB 0x1F: RR A - Rotate A right through carry', () => {
    it('should rotate A right with carry=0 and bit 0 becomes carry', () => {
      // Test: A=0b10101010, carry=0 → A=0b01010101, carry=0
      cpu.setRegisterA(0b10101010); // 0xAA
      cpu.setCarryFlag(false);

      // Setup CB 0x1F instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x1f);

      const cycles = cpu.step();

      expect(cpu.getRegisters().a).toBe(0b01010101); // 0x55
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false); // bit 0 was 0
      expect(cycles).toBe(8);
      expect(cpu.getPC()).toBe(0x0102);
    });

    it('should rotate A right with carry=1 becomes bit 7', () => {
      // Test: A=0b01010100, carry=1 → A=0b10101010, carry=0
      cpu.setRegisterA(0b01010100); // 0x54
      cpu.setCarryFlag(true);

      // Setup CB 0x1F instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x1f);

      const cycles = cpu.step();

      expect(cpu.getRegisters().a).toBe(0b10101010); // 0xAA
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false); // bit 0 was 0
      expect(cycles).toBe(8);
    });

    it('should handle edge case with carry=1 and A=0', () => {
      // Test: A=0b00000000, carry=1 → A=0b10000000, carry=0
      cpu.setRegisterA(0x00);
      cpu.setCarryFlag(true);

      // Setup CB 0x1F instruction
      cpu.setProgramCounter(0x0100);
      mmu.writeByte(0x0100, 0xcb);
      mmu.writeByte(0x0101, 0x1f);

      const cycles = cpu.step();

      expect(cpu.getRegisters().a).toBe(0x80);
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getSubtractFlag()).toBe(false);
      expect(cpu.getHalfCarryFlag()).toBe(false);
      expect(cpu.getCarryFlag()).toBe(false); // bit 0 was 0
      expect(cycles).toBe(8);
    });
  });
});
