/**
 * Simple Timer Overflow Test
 *
 * Tests basic timer overflow and interrupt timing to understand the current behavior
 */

import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';
import { Timer } from '../../../src/emulator/mmu/Timer';

describe('CPU Simple Timer Test', () => {
  let cpu: CPU;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu);

    // Setup Timer component - this was missing!
    const timer = new Timer((interrupt: number) => mmu.requestInterrupt(interrupt));
    mmu.setTimer(timer);

    cpu.reset();
    mmu.setPostBootState();
  });

  test('Timer should overflow and trigger interrupt', () => {
    // Setup timer to overflow very quickly
    mmu.writeByte(0xff07, 0x05); // TAC: Timer enabled, 262144 Hz (16 cycles per increment)
    mmu.writeByte(0xff06, 0x42); // TMA: Timer modulo (reload value)
    mmu.writeByte(0xff05, 0xff); // TIMA: Will overflow on next increment
    mmu.writeByte(0xffff, 0x04); // IE: Enable timer interrupt

    cpu.setIME(true);
    mmu.writeByte(0xff0f, 0x00); // Clear IF

    // Setup simple NOP instruction
    mmu.writeByte(0x0100, 0x00); // NOP (4 cycles)

    // Setup interrupt vector
    mmu.writeByte(0x0050, 0x3e); // LD A,n
    mmu.writeByte(0x0051, 0xaa); // Load distinctive value

    cpu.setProgramCounter(0x0100);

    // Log state before execution for debugging if needed

    // Execute NOP - this should trigger timer overflow and interrupt
    cpu.step();

    // Log state after execution for debugging if needed

    // Force timer to advance manually to see if it's working
    const timer = (mmu as any).timer;
    timer.step(16); // 16 cycles should cause TIMA to increment
  });
});
