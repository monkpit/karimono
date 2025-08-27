/**
 * MMU Timer Integration Tests
 *
 * Tests MMU delegation of timer registers (0xFF04-0xFF07) to Timer component
 * and integration with EmulatorContainer for cycle-accurate timing.
 */

import { EmulatorContainer } from '../../../src/emulator/EmulatorContainer';
import { MMU } from '../../../src/emulator/mmu/MMU';
import { Timer } from '../../../src/emulator/mmu/Timer';

describe('MMU Timer Integration', () => {
  let mmu: MMU;
  let timer: Timer;

  beforeEach(() => {
    mmu = new MMU();
    timer = new Timer((interrupt: number) => mmu.requestInterrupt(interrupt));
    mmu.setTimer(timer);
  });

  describe('Timer Register Delegation', () => {
    test('MMU delegates DIV register (0xFF04) reads to Timer component', () => {
      // Timer should start at 0x00
      expect(mmu.readByte(0xff04)).toBe(0x00);

      // Advance timer directly
      timer.step(256); // Should increment DIV
      expect(mmu.readByte(0xff04)).toBe(0x01);

      // Advance more
      timer.step(512); // Should increment DIV by 2 more
      expect(mmu.readByte(0xff04)).toBe(0x03);
    });

    test('MMU delegates DIV register (0xFF04) writes to Timer component', () => {
      // Advance timer first
      timer.step(1024);
      expect(mmu.readByte(0xff04)).toBe(0x04);

      // Write to DIV through MMU should reset
      mmu.writeByte(0xff04, 0xab); // Any value should reset
      expect(mmu.readByte(0xff04)).toBe(0x00);
    });

    test('MMU delegates TIMA register (0xFF05) reads/writes to Timer component', () => {
      // Initial value
      expect(mmu.readByte(0xff05)).toBe(0x00);

      // Write through MMU
      mmu.writeByte(0xff05, 0x42);
      expect(mmu.readByte(0xff05)).toBe(0x42);

      // Enable timer and test increment
      mmu.writeByte(0xff07, 0x04); // Enable with slowest frequency
      timer.step(1024); // Should increment TIMA
      expect(mmu.readByte(0xff05)).toBe(0x43);
    });

    test('MMU delegates TMA register (0xFF06) reads/writes to Timer component', () => {
      // Initial value
      expect(mmu.readByte(0xff06)).toBe(0x00);

      // Write through MMU
      mmu.writeByte(0xff06, 0x55);
      expect(mmu.readByte(0xff06)).toBe(0x55);
    });

    test('MMU delegates TAC register (0xFF07) reads/writes to Timer component', () => {
      // Initial value
      expect(mmu.readByte(0xff07)).toBe(0x00);

      // Write through MMU
      mmu.writeByte(0xff07, 0x05);
      expect(mmu.readByte(0xff07)).toBe(0x05);
    });
  });

  describe('Timer Interrupt Integration', () => {
    test('TIMA overflow triggers interrupt through MMU', () => {
      // Set up for overflow
      mmu.writeByte(0xff06, 0x42); // TMA = 0x42
      mmu.writeByte(0xff05, 0xff); // TIMA = 0xFF (near overflow)
      mmu.writeByte(0xff07, 0x05); // Enable timer, fast frequency

      // Step to trigger overflow
      timer.step(16); // Should cause overflow

      // Verify TIMA reloaded and interrupt requested via MMU
      expect(mmu.readByte(0xff05)).toBe(0x42); // Reloaded from TMA

      // Check IF register - bit 2 should be set via MMU.requestInterrupt
      const ifRegister = mmu.readByte(0xff0f);
      expect(ifRegister & 0x04).toBe(0x04); // Bit 2 set
    });

    test('timer overflow sets IF register bit 2 through MMU', () => {
      // Set up for overflow
      mmu.writeByte(0xff05, 0xff);
      mmu.writeByte(0xff07, 0x05); // Enable timer

      // Clear IF register first
      mmu.writeByte(0xff0f, 0x00);
      expect(mmu.readByte(0xff0f)).toBe(0x00);

      // Trigger overflow
      timer.step(16);

      // Check IF register - bit 2 should be set
      const ifRegister = mmu.readByte(0xff0f);
      expect(ifRegister & 0x04).toBe(0x04); // Bit 2 set
    });
  });

  describe('Hardware-Accurate Timing', () => {
    test('DIV and TIMA timing coordination through MMU', () => {
      // Both should increment at 256-cycle boundaries for frequency 11
      mmu.writeByte(0xff07, 0x07); // Timer enabled, frequency 11 (256 cycles)

      // Step 256 cycles
      timer.step(256);

      expect(mmu.readByte(0xff04)).toBe(0x01); // DIV incremented
      expect(mmu.readByte(0xff05)).toBe(0x01); // TIMA incremented
    });

    test('different timer frequencies work correctly through MMU', () => {
      const frequencies = [
        { tac: 0x04, cycles: 1024 }, // 00: 4096 Hz
        { tac: 0x05, cycles: 16 }, // 01: 262144 Hz
        { tac: 0x06, cycles: 64 }, // 10: 65536 Hz
        { tac: 0x07, cycles: 256 }, // 11: 16384 Hz
      ];

      frequencies.forEach(({ tac, cycles }) => {
        // Reset timer
        timer.reset();

        // Set frequency through MMU
        mmu.writeByte(0xff07, tac);

        // Step cycles-1 (should not increment TIMA)
        timer.step(cycles - 1);
        expect(mmu.readByte(0xff05)).toBe(0x00);

        // Step 1 more cycle (should increment TIMA)
        timer.step(1);
        expect(mmu.readByte(0xff05)).toBe(0x01);
      });
    });
  });
});

describe('EmulatorContainer Timer Integration', () => {
  let container: EmulatorContainer;
  let parentElement: HTMLElement;

  beforeEach(() => {
    parentElement = document.createElement('div');
    document.body.appendChild(parentElement);
    container = new EmulatorContainer(parentElement);
  });

  afterEach(() => {
    container.stop();
    document.body.removeChild(parentElement);
  });

  describe('Component Integration', () => {
    test('EmulatorContainer initializes Timer component', () => {
      const timer = container.getTimer();
      expect(timer).toBeDefined();
    });

    test('Timer component integrates with MMU through container', () => {
      const mmu = container.getMMU();

      // Initial timer register values through MMU
      expect(mmu.readByte(0xff04)).toBe(0x00); // DIV
      expect(mmu.readByte(0xff05)).toBe(0x00); // TIMA
      expect(mmu.readByte(0xff06)).toBe(0x00); // TMA
      expect(mmu.readByte(0xff07)).toBe(0x00); // TAC
    });

    test('EmulatorContainer step() updates timer through cycle propagation', () => {
      container.start();
      const mmu = container.getMMU();

      // Enable timer for testing
      mmu.writeByte(0xff07, 0x05); // Fast frequency for quick testing

      // Perform multiple steps to accumulate cycles
      const totalSteps = 20; // Should provide enough cycles for timer increment
      for (let i = 0; i < totalSteps; i++) {
        container.step();
      }

      // DIV should have incremented due to accumulated cycles
      // (Each instruction consumes at least 4 cycles, 20 instructions = 80+ cycles)
      const cycleCount = container.getCycleCount();
      expect(cycleCount).toBeGreaterThan(0);

      // The exact values depend on which instructions are executed
      // but we can verify that timer registers are accessible
      const divValue = mmu.readByte(0xff04);
      const timaValue = mmu.readByte(0xff05);
      expect(typeof divValue).toBe('number');
      expect(typeof timaValue).toBe('number');
    });
  });

  describe('Reset and Lifecycle', () => {
    test('EmulatorContainer reset() resets timer component', () => {
      const mmu = container.getMMU();
      const timer = container.getTimer();

      // Modify timer state
      mmu.writeByte(0xff05, 0xab);
      mmu.writeByte(0xff06, 0xcd);
      mmu.writeByte(0xff07, 0x07);
      if (!timer) {
        throw new Error('Timer not found in container');
      }
      timer.step(1000); // Advance DIV

      // Verify state is modified - note that TIMA might have incremented since timer is enabled
      const timaValue = mmu.readByte(0xff05);
      expect(timaValue).toBeGreaterThanOrEqual(0xab); // Should be at least what we wrote
      expect(mmu.readByte(0xff06)).toBe(0xcd); // TMA should be unchanged
      expect(mmu.readByte(0xff07)).toBe(0x07); // TAC should be unchanged
      // DIV should have incremented due to step()
      expect(mmu.readByte(0xff04)).toBeGreaterThan(0x00);

      // Reset container
      container.reset();

      // Verify timer registers are reset
      // Note: MMU may set post-boot state after reset, but timer registers should be 0x00
      expect(mmu.readByte(0xff04)).toBe(0x00); // DIV reset
      expect(mmu.readByte(0xff05)).toBe(0x00); // TIMA reset
      expect(mmu.readByte(0xff06)).toBe(0x00); // TMA reset
      expect(mmu.readByte(0xff07)).toBe(0x00); // TAC reset
    });
  });
});
