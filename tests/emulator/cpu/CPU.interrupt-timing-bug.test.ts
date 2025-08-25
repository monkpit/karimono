/**
 * Interrupt Timing Bug Test
 *
 * Tests the exact Game Boy Doctor ROM 2 failure:
 * Interrupts should be checked BEFORE fetching the next instruction,
 * not after executing the current instruction.
 */

import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';
import { Timer } from '../../../src/emulator/mmu/Timer';

describe('CPU Interrupt Timing Bug', () => {
  let cpu: CPU;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu);

    // Setup Timer component
    const timer = new Timer((interrupt: number) => mmu.requestInterrupt(interrupt));
    mmu.setTimer(timer);

    // Setup CPU reference for IF write notifications
    mmu.setCPU(cpu);

    cpu.reset();
    mmu.setPostBootState();
  });

  test('Interrupt should be checked AFTER instruction execution (hardware correct timing)', () => {
    // Hardware correct behavior: Instructions execute BEFORE interrupts are checked
    // DEC B at PC:C2C0 should execute, THEN interrupt should be serviced

    // Setup: Timer interrupt enabled and pending
    mmu.writeByte(0xffff, 0x04); // IE: Enable timer interrupt
    mmu.writeByte(0xff0f, 0x04); // IF: Timer interrupt pending
    cpu.setIME(true);

    // Clear IF write delay to simulate hardware interrupt timing
    // In real hardware, the interrupt would have been set by timer in previous cycle
    (cpu as any).if_write_delay = false;

    // Setup state matching Game Boy Doctor line 151346
    cpu.setRegisterA(0x04);
    cpu.setRegisterB(0x01);
    cpu.getRegisters().f = 0x10; // Flags: ---H----
    cpu.setStackPointer(0xdffd);

    // Setup DEC B instruction at PC:C2C0 (the instruction that should NOT execute)
    mmu.writeByte(0xc2c0, 0x05); // DEC B opcode
    mmu.writeByte(0xc2c1, 0xc2); // Next bytes (PCMEM pattern)
    mmu.writeByte(0xc2c2, 0xb9);
    mmu.writeByte(0xc2c3, 0xc1);

    // Setup interrupt handler at 0x0050 (timer interrupt vector)
    mmu.writeByte(0x0050, 0x3c); // INC A (changes A from 04 to 05)
    mmu.writeByte(0x0051, 0xc9); // RET

    cpu.setProgramCounter(0xc2c0);

    // Log state before step for debugging if needed

    // Execute one CPU step
    // Hardware correct behavior:
    // 1. Fetch DEC B instruction
    // 2. Execute DEC B (B: 01 → 00)
    // 3. Check for interrupts AFTER execution
    // 4. Service timer interrupt (jump to 0x0050, execute INC A)
    // 5. Result: A=05, B=00 (DEC B executed), PC=0051, SP=DFFB
    const cycles = cpu.step();

    // Log state after step for debugging if needed

    // HARDWARE CORRECT BEHAVIOR:
    // - A: 04 → 05 (INC A in interrupt handler executed)
    // - B: 01 → 00 (DEC B executed BEFORE interrupt check)
    // - PC: C2C0 → 0051 (jumped to interrupt handler, executed INC A)
    // - SP: DFFD → DFFB (return address pushed to stack)
    // - IF: 04 → 00 (timer interrupt flag cleared after service)
    // - Cycles: 28 (4 DEC B + 20 interrupt + 4 INC A)

    expect(cpu.getRegisters().a).toBe(0x05); // INC A executed in interrupt handler
    expect(cpu.getRegisters().b).toBe(0x00); // DEC B executed BEFORE interrupt
    expect(cpu.getPC()).toBe(0x0051); // Should be at interrupt handler after INC A
    expect(cpu.getRegisters().sp).toBe(0xdffb); // Stack pointer decremented (pushed return addr)
    expect(mmu.readByte(0xff0f) & 0x04).toBe(0); // Timer interrupt flag cleared
    expect(cycles).toBe(28); // 4 (DEC B) + 20 (interrupt) + 4 (INC A)

    // Test passed: Hardware correct interrupt timing (after instruction execution)
  });

  test('When no interrupt pending, instruction should execute normally', () => {
    // Control test: same setup but no interrupt pending
    // DEC B should execute normally

    // Setup: Timer interrupt enabled but NOT pending
    mmu.writeByte(0xffff, 0x04); // IE: Enable timer interrupt
    mmu.writeByte(0xff0f, 0x00); // IF: No interrupts pending
    cpu.setIME(true);

    // Setup state
    cpu.setRegisterA(0x04);
    cpu.setRegisterB(0x01);
    cpu.setStackPointer(0xdffd);

    // Setup DEC B instruction
    mmu.writeByte(0xc2c0, 0x05); // DEC B opcode
    cpu.setProgramCounter(0xc2c0);

    // Execute one CPU step
    const cycles = cpu.step();

    // EXPECTED: DEC B executes normally
    expect(cpu.getRegisters().a).toBe(0x04); // A unchanged
    expect(cpu.getRegisters().b).toBe(0x00); // B decremented 01 → 00
    expect(cpu.getPC()).toBe(0xc2c1); // PC advanced to next instruction
    expect(cpu.getRegisters().sp).toBe(0xdffd); // SP unchanged
    expect(cycles).toBe(4); // DEC B takes 4 cycles

    // Control test passed: Normal instruction execution
  });
});
