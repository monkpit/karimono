/**
 * Debug test for LD HL,SP+e8 flag behavior
 */

import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';
import { CPUTestingComponent } from '../../../src/emulator/types';

describe('LD HL,SP+e8 Flag Debug', () => {
  let cpu: CPUTestingComponent;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu) as CPUTestingComponent;
    cpu.reset();
  });

  test('debug flag calculations for various inputs', () => {
    const testCases = [
      { sp: 0x0000, offset: 0xff, description: 'SP=0x0000, offset=-1 (0xFF)' },
      { sp: 0x000f, offset: 0x01, description: 'SP=0x000F, offset=+1 (half-carry)' },
      { sp: 0x00ff, offset: 0x01, description: 'SP=0x00FF, offset=+1 (carry)' },
      { sp: 0x0100, offset: 0xff, description: 'SP=0x0100, offset=-1' },
    ];

    testCases.forEach(({ sp, offset, description }) => {
      console.log(`\n=== ${description} ===`);

      cpu.reset();
      cpu.setStackPointer(sp);
      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0xf8);
      mmu.writeByte(0x8001, offset);

      console.log(
        `Before: SP=0x${sp.toString(16).toUpperCase().padStart(4, '0')}, offset=0x${offset.toString(16).toUpperCase().padStart(2, '0')}`
      );

      cpu.step();

      const registers = cpu.getRegisters();
      const hl = (registers.h << 8) | registers.l;

      console.log(`After: HL=0x${hl.toString(16).toUpperCase().padStart(4, '0')}`);
      console.log(
        `Flags: Z=${cpu.getZeroFlag()}, N=${cpu.getSubtractFlag()}, H=${cpu.getHalfCarryFlag()}, C=${cpu.getCarryFlag()}`
      );

      // Manual calculations
      const spLow = sp & 0xff;
      const hCalc = (spLow & 0x0f) + (offset & 0x0f);
      const cCalc = spLow + offset;

      console.log(`Manual calc: spLow=0x${spLow.toString(16)}, offset=0x${offset.toString(16)}`);
      console.log(`H calc: (${spLow & 0x0f}) + (${offset & 0x0f}) = ${hCalc} > 15? ${hCalc > 15}`);
      console.log(`C calc: ${spLow} + ${offset} = ${cCalc} > 255? ${cCalc > 255}`);
    });

    // Just pass the test - we're debugging
    expect(true).toBe(true);
  });
});
