/**
 * Debug test to understand half-carry calculation
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';
import { CPUTestingComponent } from '../../../src/emulator/types';

describe('Half-Carry Debug', () => {
  let cpu: CPUTestingComponent;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu);
  });

  test('debug half-carry calculation for 0x0FFF + 0x0001', () => {
    cpu.setRegisterH(0x0f);
    cpu.setRegisterL(0xff); // HL = 0x0FFF
    cpu.setRegisterD(0x00);
    cpu.setRegisterE(0x01); // DE = 0x0001

    console.log('Before ADD HL,DE:');
    console.log(
      `HL = 0x${((cpu.getRegisters().h << 8) | cpu.getRegisters().l).toString(16).toUpperCase()}`
    );
    console.log(
      `DE = 0x${((cpu.getRegisters().d << 8) | cpu.getRegisters().e).toString(16).toUpperCase()}`
    );

    // Calculate what we expect
    const hl = 0x0fff;
    const de = 0x0001;
    const expected = (hl + de) & 0xffff;
    const expectedHalfCarry = (hl & 0x0fff) > (expected & 0x0fff);

    console.log(`Expected result: 0x${expected.toString(16).toUpperCase()}`);
    console.log(`Expected half-carry: ${expectedHalfCarry}`);
    console.log(`Lower 12 bits HL: 0x${(hl & 0x0fff).toString(16).toUpperCase()}`);
    console.log(`Lower 12 bits DE: 0x${(de & 0x0fff).toString(16).toUpperCase()}`);
    console.log(`Sum of lower 12: 0x${((hl & 0x0fff) + (de & 0x0fff)).toString(16).toUpperCase()}`);
    console.log(`Bit 12 set?: ${(((hl & 0x0fff) + (de & 0x0fff)) & 0x1000) !== 0}`);

    cpu.setProgramCounter(0x8000);
    mmu.writeByte(0x8000, 0x19); // ADD HL,DE

    cpu.step();

    console.log('After ADD HL,DE:');
    const result = (cpu.getRegisters().h << 8) | cpu.getRegisters().l;
    console.log(`HL = 0x${result.toString(16).toUpperCase()}`);
    console.log(`Half-carry flag: ${cpu.getHalfCarryFlag()}`);
    console.log(`Carry flag: ${cpu.getCarryFlag()}`);

    expect(result).toBe(0x1000);
    expect(cpu.getHalfCarryFlag()).toBe(true);
  });
});
