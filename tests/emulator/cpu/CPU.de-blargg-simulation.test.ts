/**
 * DE Blargg Simulation Test Suite
 *
 * Simulates the type of comprehensive DE register testing that Blargg's
 * 04-op r,imm ROM might be performing. Tests sequences of operations
 * that would catch cumulative errors or state corruption.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';
import { CPUTestingComponent } from '../../../src/emulator/types';

describe('DE Blargg Simulation Tests', () => {
  let cpu: CPUTestingComponent;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu);
  });

  test('DE comprehensive operation sequence - simulate Blargg test pattern', () => {
    // This test simulates a sequence of operations that Blargg might use
    // to test DE register functionality thoroughly

    let pc = 0x8000;

    // Step 1: Load immediate values into D and E
    cpu.setProgramCounter(pc);
    mmu.writeByte(pc, 0x16); // LD D,n8
    mmu.writeByte(pc + 1, 0x12); // D = 0x12
    cpu.step();
    pc += 2;

    cpu.setProgramCounter(pc);
    mmu.writeByte(pc, 0x1e); // LD E,n8
    mmu.writeByte(pc + 1, 0x34); // E = 0x34
    cpu.step();
    pc += 2;

    // Verify DE = 0x1234
    expect(cpu.getRegisters().d).toBe(0x12);
    expect(cpu.getRegisters().e).toBe(0x34);

    // Step 2: Increment DE register pair
    cpu.setProgramCounter(pc);
    mmu.writeByte(pc, 0x13); // INC DE
    cpu.step();
    pc += 1;

    // Verify DE = 0x1235
    expect(cpu.getRegisters().d).toBe(0x12);
    expect(cpu.getRegisters().e).toBe(0x35);

    // Step 3: Use DE for memory access - store A to (DE)
    cpu.setRegisterA(0x42);
    cpu.setProgramCounter(pc);
    mmu.writeByte(pc, 0x12); // LD (DE),A
    cpu.step();
    pc += 1;

    // Verify memory at 0x1235 contains 0x42
    expect(mmu.readByte(0x1235)).toBe(0x42);

    // Step 4: Load from memory using DE - LD A,(DE)
    mmu.writeByte(0x1235, 0x73); // Change memory value
    cpu.setProgramCounter(pc);
    mmu.writeByte(pc, 0x1a); // LD A,(DE)
    cpu.step();
    pc += 1;

    // Verify A loaded from DE address
    expect(cpu.getRegisters().a).toBe(0x73);

    // Step 5: Use DE in 16-bit arithmetic - ADD HL,DE
    cpu.setRegisterH(0x10);
    cpu.setRegisterL(0x00); // HL = 0x1000
    cpu.setProgramCounter(pc);
    mmu.writeByte(pc, 0x19); // ADD HL,DE (0x1000 + 0x1235 = 0x2235)
    cpu.step();
    pc += 1;

    // Verify HL result and flags
    expect(cpu.getRegisters().h).toBe(0x22);
    expect(cpu.getRegisters().l).toBe(0x35);
    expect(cpu.getSubtractFlag()).toBe(false);
    expect(cpu.getCarryFlag()).toBe(false);
    expect(cpu.getHalfCarryFlag()).toBe(false);

    // Step 6: Decrement DE
    cpu.setProgramCounter(pc);
    mmu.writeByte(pc, 0x1b); // DEC DE (0x1235 -> 0x1234)
    cpu.step();
    pc += 1;

    // Verify DE decremented
    expect(cpu.getRegisters().d).toBe(0x12);
    expect(cpu.getRegisters().e).toBe(0x34);

    // Step 7: Individual D and E register increments
    cpu.setProgramCounter(pc);
    mmu.writeByte(pc, 0x14); // INC D (0x12 -> 0x13)
    cpu.step();
    pc += 1;

    expect(cpu.getRegisters().d).toBe(0x13);
    expect(cpu.getZeroFlag()).toBe(false);
    expect(cpu.getSubtractFlag()).toBe(false);

    cpu.setProgramCounter(pc);
    mmu.writeByte(pc, 0x1c); // INC E (0x34 -> 0x35)
    cpu.step();
    pc += 1;

    expect(cpu.getRegisters().e).toBe(0x35);

    // Step 8: Individual D and E register decrements
    cpu.setProgramCounter(pc);
    mmu.writeByte(pc, 0x15); // DEC D (0x13 -> 0x12)
    cpu.step();
    pc += 1;

    expect(cpu.getRegisters().d).toBe(0x12);
    expect(cpu.getSubtractFlag()).toBe(true); // DEC sets N flag

    cpu.setProgramCounter(pc);
    mmu.writeByte(pc, 0x1d); // DEC E (0x35 -> 0x34)
    cpu.step();
    pc += 1;

    expect(cpu.getRegisters().e).toBe(0x34);
    expect(cpu.getSubtractFlag()).toBe(true); // DEC sets N flag

    // Final verification: DE should be back to 0x1234
    const deValue = (cpu.getRegisters().d << 8) | cpu.getRegisters().e;
    expect(deValue).toBe(0x1234);
  });

  test('DE register in complex instruction sequences with flag interactions', () => {
    // Test complex sequences that might reveal flag calculation errors

    // Set up initial state
    cpu.setRegisterH(0x0f);
    cpu.setRegisterL(0xff); // HL = 0x0FFF
    cpu.setRegisterD(0x00);
    cpu.setRegisterE(0x01); // DE = 0x0001

    let pc = 0x8000;

    // ADD HL,DE with half-carry
    cpu.setProgramCounter(pc);
    mmu.writeByte(pc, 0x19); // ADD HL,DE
    cpu.step();

    // Verify half-carry flag set correctly
    expect(cpu.getHalfCarryFlag()).toBe(true);
    expect(cpu.getCarryFlag()).toBe(false);

    // Now test if the flag state affects subsequent operations
    pc += 1;
    cpu.setProgramCounter(pc);
    mmu.writeByte(pc, 0x1b); // DEC DE (should not affect flags)
    cpu.step();

    // Flags from ADD HL,DE should be preserved since DEC DE doesn't affect them
    expect(cpu.getHalfCarryFlag()).toBe(true);

    // Test individual register operations don't interfere with DE pair
    pc += 1;
    cpu.setProgramCounter(pc);
    mmu.writeByte(pc, 0x14); // INC D (should affect flags)
    cpu.step();

    // INC D should set flags independently
    expect(cpu.getSubtractFlag()).toBe(false); // INC clears N
    expect(cpu.getHalfCarryFlag()).toBe(false); // INC D from 0x00 to 0x01 has no half-carry
  });

  test('DE register edge cases - overflow and underflow', () => {
    // Test edge cases that might reveal implementation bugs

    let pc = 0x8000;

    // Test 16-bit overflow: DE = 0xFFFF, INC DE -> 0x0000
    cpu.setRegisterD(0xff);
    cpu.setRegisterE(0xff);

    cpu.setProgramCounter(pc);
    mmu.writeByte(pc, 0x13); // INC DE
    cpu.step();

    expect(cpu.getRegisters().d).toBe(0x00);
    expect(cpu.getRegisters().e).toBe(0x00);

    // Test 16-bit underflow: DE = 0x0000, DEC DE -> 0xFFFF
    pc += 1;
    cpu.setProgramCounter(pc);
    mmu.writeByte(pc, 0x1b); // DEC DE
    cpu.step();

    expect(cpu.getRegisters().d).toBe(0xff);
    expect(cpu.getRegisters().e).toBe(0xff);

    // Test 8-bit overflow on individual registers
    cpu.setRegisterD(0xff);
    pc += 1;
    cpu.setProgramCounter(pc);
    mmu.writeByte(pc, 0x14); // INC D (0xFF -> 0x00)
    cpu.step();

    expect(cpu.getRegisters().d).toBe(0x00);
    expect(cpu.getZeroFlag()).toBe(true); // INC D to 0 sets Z flag
    expect(cpu.getHalfCarryFlag()).toBe(true); // Half-carry from 0xF to 0x0

    // Test 8-bit underflow
    cpu.setRegisterE(0x00);
    pc += 1;
    cpu.setProgramCounter(pc);
    mmu.writeByte(pc, 0x1d); // DEC E (0x00 -> 0xFF)
    cpu.step();

    expect(cpu.getRegisters().e).toBe(0xff);
    expect(cpu.getZeroFlag()).toBe(false); // DEC E to 0xFF clears Z flag
    expect(cpu.getSubtractFlag()).toBe(true); // DEC sets N flag
    expect(cpu.getHalfCarryFlag()).toBe(true); // Half-carry from 0x0 to 0xF (borrow)
  });
});
