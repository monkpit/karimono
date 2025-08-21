/**
 * DEC B Bug Reproduction Test
 *
 * Based on Game Boy Doctor failure in ROM 2:
 * Before: A:04 F:10 B:01 C:00 D:C7 E:BA H:90 L:00 SP:DFFD PC:C2C0 PCMEM:05,C2,B9,C1
 * Expected: A:05 PC:0051 PCMEM:C9,00,00,00
 * Our result: A:04 PC:0050 PCMEM:3C,C9,00,00
 * Last operation: 0x05 DEC B
 */

import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';

describe('DEC B Bug Reproduction', () => {
  let cpu: CPU;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu);
  });

  test('should reproduce Game Boy Doctor DEC B bug - step by step', () => {
    // Set up the exact state from Game Boy Doctor failure
    const registers = cpu.getRegisters();
    registers.a = 0x04;
    registers.f = 0x10;
    registers.b = 0x01;
    registers.c = 0x00;
    registers.d = 0xc7;
    registers.e = 0xba;
    registers.h = 0x90;
    registers.l = 0x00;
    registers.sp = 0xdffd;
    registers.pc = 0xc2c0;

    // Set up memory with the next few instructions
    mmu.writeByte(0xc2c0, 0x05); // DEC B instruction
    mmu.writeByte(0xc2c1, 0xc2); // JP NZ,a16 instruction
    mmu.writeByte(0xc2c2, 0xb9); // Low byte of jump address
    mmu.writeByte(0xc2c3, 0xc1); // High byte of jump address (0xC1B9)

    // Set up interrupt condition (missing from original test)
    // Timer interrupt enabled and pending
    mmu.writeByte(0xffff, 0x04); // IE: Enable timer interrupt
    mmu.writeByte(0xff0f, 0x04); // IF: Timer interrupt pending
    cpu.setIME(true);

    // Set up interrupt handler at 0x0050 (timer interrupt vector)
    mmu.writeByte(0x0050, 0x3c); // INC A (changes A from 04 to 05)
    mmu.writeByte(0x0051, 0xc9); // RET

    // Clear IF write delay to simulate hardware interrupt timing
    (cpu as any).if_write_delay = false;

    console.log('=== BEFORE STEP ===');
    console.log(
      `A:${registers.a.toString(16).padStart(2, '0').toUpperCase()} F:${registers.f.toString(16).padStart(2, '0')} B:${registers.b.toString(16).padStart(2, '0')} PC:${registers.pc.toString(16).padStart(4, '0').toUpperCase()}`
    );
    console.log(
      `Z flag: ${cpu.getZeroFlag()}, N flag: ${cpu.getSubtractFlag()}, H flag: ${cpu.getHalfCarryFlag()}, C flag: ${cpu.getCarryFlag()}`
    );

    // Check what instruction is actually at PC
    const opcodeAtPC = mmu.readByte(registers.pc);
    console.log(
      `Opcode at PC (0x${registers.pc.toString(16).toUpperCase()}): 0x${opcodeAtPC.toString(16).padStart(2, '0').toUpperCase()}`
    );

    // Check interrupt registers and IME state before execution
    const ie = mmu.readByte(0xffff); // Interrupt Enable
    const ifReg = mmu.readByte(0xff0f); // Interrupt Flag
    console.log(
      `IE: 0x${ie.toString(16).padStart(2, '0')} IF: 0x${ifReg.toString(16).padStart(2, '0')} IME: ${cpu.getIME()}`
    );

    // Execute one step (should be DEC B unless interrupt occurs)
    const cycles = cpu.step();
    console.log(`Cycles executed: ${cycles}`);

    // Check registers after step
    const ieAfter = mmu.readByte(0xffff);
    const ifAfter = mmu.readByte(0xff0f);
    console.log(
      `After - IE: 0x${ieAfter.toString(16).padStart(2, '0')} IF: 0x${ifAfter.toString(16).padStart(2, '0')} IME: ${cpu.getIME()}`
    );

    const afterStep = cpu.getRegisters();
    console.log('=== AFTER STEP ===');
    console.log(
      `A:${afterStep.a.toString(16).padStart(2, '0').toUpperCase()} F:${afterStep.f.toString(16).padStart(2, '0')} B:${afterStep.b.toString(16).padStart(2, '0')} PC:${afterStep.pc.toString(16).padStart(4, '0').toUpperCase()}`
    );
    console.log(
      `Z flag: ${cpu.getZeroFlag()}, N flag: ${cpu.getSubtractFlag()}, H flag: ${cpu.getHalfCarryFlag()}, C flag: ${cpu.getCarryFlag()}`
    );

    // Check if B register changed (would indicate DEC B executed)
    if (afterStep.b === registers.b) {
      console.log('⚠️  B register unchanged - DEC B did NOT execute! Likely interrupt occurred.');
    } else {
      console.log('✅ B register changed - DEC B executed normally.');
    }

    // Game Boy Doctor expects after one step: A:05 PC:0051 B:01
    // If B is still 01, then DEC B never executed (interrupt handling issue)
    expect(afterStep.a).toBe(0x05); // Expected by Game Boy Doctor
    expect(afterStep.pc).toBe(0x0051); // Expected by Game Boy Doctor
  });

  test('should isolate DEC B instruction behavior', () => {
    // Simpler test - just execute DEC B in isolation
    const registers = cpu.getRegisters();
    registers.b = 0x01;
    registers.pc = 0x1000;

    // Place DEC B instruction at PC
    mmu.writeByte(0x1000, 0x05); // DEC B

    // Execute the instruction
    const cycles = cpu.step();

    const finalRegisters = cpu.getRegisters();

    console.log('Simple DEC B test:');
    console.log(`B before: 0x${registers.b.toString(16).padStart(2, '0')}`);
    console.log(`B after: 0x${finalRegisters.b.toString(16).padStart(2, '0')}`);
    console.log(`PC before: 0x${registers.pc.toString(16).padStart(4, '0')}`);
    console.log(`PC after: 0x${finalRegisters.pc.toString(16).padStart(4, '0')}`);
    console.log(`Cycles: ${cycles}`);

    // Basic expectations for DEC B
    expect(finalRegisters.b).toBe(0x00); // B should decrement from 1 to 0
    expect(finalRegisters.pc).toBe(0x1001); // PC should advance by 1
    expect(cycles).toBe(4); // DEC B should take 4 cycles
  });
});
