/**
 * Game Boy Doctor Bug Reproduction Test
 * LD A,(HL+) (0x2A) instruction specific test case
 *
 * Bug Report:
 * - Line 2335 in ROM 2 execution
 * - Expected A register: 0x23
 * - Our result: 0xD3
 * - State before: A:21 F:10 B:01 C:0E D:C2 E:44 H:42 L:44 SP:FFFE PC:0206
 * - State after should be: A:23 F:C0 B:01 C:0E D:C2 E:44 H:42 L:45 SP:FFFE PC:0207
 *
 * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 * LD A,[HLI] - Copy the byte pointed to by HL into register A, and increment HL afterwards.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';
import { CPUTestingComponent } from '../../../src/emulator/types';

describe('Game Boy Doctor LD A,(HL+) Bug Reproduction', () => {
  let cpu: CPUTestingComponent;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu) as CPUTestingComponent;
  });

  test('LD A,(HL+) (0x2A) - Game Boy Doctor exact test case reproduction', () => {
    // Setup exact Game Boy Doctor state
    // State before: A:21 F:10 B:01 C:0E D:C2 E:44 H:42 L:44 SP:FFFE PC:0206
    cpu.setRegisterA(0x21);
    cpu.setRegisterF(0x10);
    cpu.setRegisterB(0x01);
    cpu.setRegisterC(0x0e);
    cpu.setRegisterD(0xc2);
    cpu.setRegisterE(0x44);
    cpu.setRegisterH(0x42);
    cpu.setRegisterL(0x44);
    cpu.setStackPointer(0xfffe);
    cpu.setProgramCounter(0x0206);

    // Memory setup: At address HL (0x4244), store the expected value 0x23
    mmu.writeByte(0x4244, 0x23);

    // Place LD A,(HL+) instruction at PC
    mmu.writeByte(0x0206, 0x2a);

    // Execute the instruction
    const cycles = cpu.step();

    // Verify LD A,(HL+) core functionality
    expect(cpu.getRegisters().a).toBe(0x23); // A should load value from memory[0x4244]
    expect(cpu.getRegisters().h).toBe(0x42); // H unchanged
    expect(cpu.getRegisters().l).toBe(0x45); // L incremented: 0x44 + 1 = 0x45
    expect(cpu.getRegisters().pc).toBe(0x0207); // PC should advance
    expect(cycles).toBe(8); // LD A,(HL+) takes 8 cycles

    // Note: Flag register expectation (F:C0) may be context-dependent
    // LD A,(HL+) itself doesn't modify flags according to RGBDS specification
    // Current F is 0x10, Game Boy Doctor expects 0xC0 - investigating context
  });

  test('LD A,(HL+) (0x2A) - Memory read verification', () => {
    // Setup memory with specific values
    cpu.setRegisterH(0x42);
    cpu.setRegisterL(0x44);
    cpu.setProgramCounter(0x8000);

    // Write test value at HL address
    mmu.writeByte(0x4244, 0x23);
    mmu.writeByte(0x8000, 0x2a); // LD A,(HL+)

    // Execute instruction
    const cycles = cpu.step();

    // Verify memory was read correctly and HL incremented
    expect(cpu.getRegisters().a).toBe(0x23);
    const finalHL = (cpu.getRegisters().h << 8) | cpu.getRegisters().l;
    expect(finalHL).toBe(0x4245);
    expect(cycles).toBe(8);
  });

  test('LD A,(HL+) (0x2A) - Flag handling should not affect flags', () => {
    // Setup with specific flag state
    cpu.setRegisterA(0x00);
    cpu.setRegisterH(0x80);
    cpu.setRegisterL(0x00);
    cpu.setRegisterF(0xf0); // All flags set
    cpu.setProgramCounter(0x8000);

    // Write test value at HL address (0x8000)
    mmu.writeByte(0x8000, 0x23);
    // Place LD A,(HL+) instruction at PC (different address)
    mmu.writeByte(0x9000, 0x2a); // LD A,(HL+)
    cpu.setProgramCounter(0x9000);

    // Execute instruction
    cpu.step();

    // Verify flags remain unchanged (LD instructions don't affect flags)
    expect(cpu.getRegisters().f).toBe(0xf0);
    expect(cpu.getRegisters().a).toBe(0x23);
    const finalHL = (cpu.getRegisters().h << 8) | cpu.getRegisters().l;
    expect(finalHL).toBe(0x8001);
  });
});
