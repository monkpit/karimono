/**
 * Timer component tests following TDD principles
 *
 * Tests hardware-accurate Game Boy DMG Timer System:
 * - DIV register auto-increment (256 CPU cycles = 16384 Hz)
 * - TIMA programmable timer counter with TAC frequency control
 * - TMA timer modulo reload on TIMA overflow
 * - Timer interrupts (IF register bit 2, vector 0x0050)
 * - Cycle-accurate timing behavior for Blargg test ROM compatibility
 */

import { Timer } from '../../../src/emulator/mmu/Timer';

describe('Timer Component', () => {
  let timer: Timer;
  let mockRequestInterrupt: jest.Mock;

  beforeEach(() => {
    mockRequestInterrupt = jest.fn();
    timer = new Timer(mockRequestInterrupt);
  });

  describe('Component Lifecycle', () => {
    test('initializes with correct default values', () => {
      expect(timer.readDIV()).toBe(0x00);
      expect(timer.readTIMA()).toBe(0x00);
      expect(timer.readTMA()).toBe(0x00);
      expect(timer.readTAC()).toBe(0x00);
    });

    test('reset() restores initial state', () => {
      // Modify state
      timer.writeTIMA(0xab);
      timer.writeTMA(0xcd);
      timer.writeTAC(0x05);
      timer.step(1000); // Advance DIV

      // Reset and verify
      timer.reset();
      expect(timer.readDIV()).toBe(0x00);
      expect(timer.readTIMA()).toBe(0x00);
      expect(timer.readTMA()).toBe(0x00);
      expect(timer.readTAC()).toBe(0x00);
    });
  });

  describe('DIV Register (0xFF04) - Divider', () => {
    test('increments every 256 CPU cycles (16384 Hz)', () => {
      // Test multiple increment boundaries
      expect(timer.readDIV()).toBe(0x00);

      timer.step(255);
      expect(timer.readDIV()).toBe(0x00); // Not yet

      timer.step(1);
      expect(timer.readDIV()).toBe(0x01); // First increment at 256 cycles

      timer.step(256);
      expect(timer.readDIV()).toBe(0x02); // Second increment at 512 cycles

      timer.step(512);
      expect(timer.readDIV()).toBe(0x04); // Third increment at 1024 cycles
    });

    test('wraps around from 0xFF to 0x00', () => {
      // Advance to near overflow
      timer.step(255 * 256); // DIV should be 0xFF
      expect(timer.readDIV()).toBe(0xff);

      timer.step(256); // Should wrap to 0x00
      expect(timer.readDIV()).toBe(0x00);
    });

    test('write to DIV resets internal counter to 0x0000', () => {
      // Advance DIV
      timer.step(500);
      expect(timer.readDIV()).toBe(0x01);

      // Write to DIV (any value resets)
      timer.writeDIV(0xab);
      expect(timer.readDIV()).toBe(0x00);

      // Verify counter was actually reset
      timer.step(255);
      expect(timer.readDIV()).toBe(0x00); // Still 0 after 255 cycles
      timer.step(1);
      expect(timer.readDIV()).toBe(0x01); // Increments at 256 cycles from reset
    });
  });

  describe('TIMA Register (0xFF05) - Timer Counter', () => {
    test('does not increment when timer is disabled (TAC bit 2 = 0)', () => {
      timer.writeTAC(0x00); // Timer disabled, frequency 00
      timer.step(10000); // Many cycles
      expect(timer.readTIMA()).toBe(0x00); // Should not increment
    });

    test('increments at 4096 Hz when TAC = 0x04 (frequency 00, enabled)', () => {
      timer.writeTAC(0x04); // Timer enabled, frequency 00 (4096 Hz = 1024 CPU cycles)

      timer.step(1023);
      expect(timer.readTIMA()).toBe(0x00); // Not yet

      timer.step(1);
      expect(timer.readTIMA()).toBe(0x01); // First increment at 1024 cycles

      timer.step(1024);
      expect(timer.readTIMA()).toBe(0x02); // Second increment at 2048 cycles
    });

    test('increments at 262144 Hz when TAC = 0x05 (frequency 01, enabled)', () => {
      timer.writeTAC(0x05); // Timer enabled, frequency 01 (262144 Hz = 16 CPU cycles)

      timer.step(15);
      expect(timer.readTIMA()).toBe(0x00); // Not yet

      timer.step(1);
      expect(timer.readTIMA()).toBe(0x01); // First increment at 16 cycles

      timer.step(16);
      expect(timer.readTIMA()).toBe(0x02); // Second increment at 32 cycles
    });

    test('increments at 65536 Hz when TAC = 0x06 (frequency 10, enabled)', () => {
      timer.writeTAC(0x06); // Timer enabled, frequency 10 (65536 Hz = 64 CPU cycles)

      timer.step(63);
      expect(timer.readTIMA()).toBe(0x00); // Not yet

      timer.step(1);
      expect(timer.readTIMA()).toBe(0x01); // First increment at 64 cycles

      timer.step(64);
      expect(timer.readTIMA()).toBe(0x02); // Second increment at 128 cycles
    });

    test('increments at 16384 Hz when TAC = 0x07 (frequency 11, enabled)', () => {
      timer.writeTAC(0x07); // Timer enabled, frequency 11 (16384 Hz = 256 CPU cycles)

      timer.step(255);
      expect(timer.readTIMA()).toBe(0x00); // Not yet

      timer.step(1);
      expect(timer.readTIMA()).toBe(0x01); // First increment at 256 cycles

      timer.step(256);
      expect(timer.readTIMA()).toBe(0x02); // Second increment at 512 cycles
    });

    test('can be written to directly', () => {
      timer.writeTIMA(0x42);
      expect(timer.readTIMA()).toBe(0x42);
    });
  });

  describe('TMA Register (0xFF06) - Timer Modulo', () => {
    test('can be read and written', () => {
      expect(timer.readTMA()).toBe(0x00); // Default

      timer.writeTMA(0x55);
      expect(timer.readTMA()).toBe(0x55);

      timer.writeTMA(0xaa);
      expect(timer.readTMA()).toBe(0xaa);
    });
  });

  describe('TAC Register (0xFF07) - Timer Control', () => {
    test('can be read and written', () => {
      expect(timer.readTAC()).toBe(0x00); // Default

      timer.writeTAC(0x05);
      expect(timer.readTAC()).toBe(0x05);

      timer.writeTAC(0x03); // Only bits 0-2 are used
      expect(timer.readTAC()).toBe(0x03);
    });

    test('bit 2 controls timer enable/disable', () => {
      timer.writeTAC(0x01); // Frequency 01, disabled
      timer.step(100);
      expect(timer.readTIMA()).toBe(0x00); // No increment

      timer.writeTAC(0x05); // Frequency 01, enabled
      timer.step(16);
      expect(timer.readTIMA()).toBe(0x01); // Should increment
    });

    test('bits 1-0 control frequency selection', () => {
      // Test all frequency combinations with timer enabled
      const frequencies = [
        { tac: 0x04, cycles: 1024 }, // 00: 4096 Hz
        { tac: 0x05, cycles: 16 }, // 01: 262144 Hz
        { tac: 0x06, cycles: 64 }, // 10: 65536 Hz
        { tac: 0x07, cycles: 256 }, // 11: 16384 Hz
      ];

      frequencies.forEach(({ tac, cycles }) => {
        timer.reset();
        timer.writeTAC(tac);

        timer.step(cycles - 1);
        expect(timer.readTIMA()).toBe(0x00); // Not yet

        timer.step(1);
        expect(timer.readTIMA()).toBe(0x01); // Should increment
      });
    });
  });

  describe('TIMA Overflow and Interrupt Generation', () => {
    test('TIMA overflow reloads from TMA and triggers interrupt', () => {
      timer.writeTMA(0x42); // Set reload value
      timer.writeTIMA(0xff); // Near overflow
      timer.writeTAC(0x05); // Enable timer, fastest frequency

      // Step to trigger overflow
      timer.step(16); // Should cause TIMA to overflow

      // Verify reload and interrupt
      expect(timer.readTIMA()).toBe(0x42); // Reloaded from TMA
      expect(mockRequestInterrupt).toHaveBeenCalledWith(2); // Timer interrupt bit
    });

    test('multiple TIMA overflows generate multiple interrupts', () => {
      timer.writeTMA(0xfe); // Near-max reload value
      timer.writeTIMA(0xff); // Start at overflow
      timer.writeTAC(0x05); // Enable timer, fastest frequency

      // First overflow
      timer.step(16);
      expect(timer.readTIMA()).toBe(0xfe);
      expect(mockRequestInterrupt).toHaveBeenCalledTimes(1);

      // Second overflow (FE -> FF -> 00 -> reload)
      timer.step(32); // 2 increments
      expect(timer.readTIMA()).toBe(0xfe);
      expect(mockRequestInterrupt).toHaveBeenCalledTimes(2);
    });

    test('no interrupt when timer disabled', () => {
      timer.writeTMA(0x00);
      timer.writeTIMA(0xff);
      timer.writeTAC(0x01); // Disabled

      timer.step(1000); // Many cycles

      expect(timer.readTIMA()).toBe(0xff); // No change
      expect(mockRequestInterrupt).not.toHaveBeenCalled();
    });

    test('TIMA overflow behavior with TMA = 0x00', () => {
      timer.writeTMA(0x00);
      timer.writeTIMA(0xff);
      timer.writeTAC(0x05); // Enabled, fastest

      timer.step(16); // Trigger overflow

      expect(timer.readTIMA()).toBe(0x00); // Reloaded with 0x00
      expect(mockRequestInterrupt).toHaveBeenCalledWith(2);
    });
  });

  describe('Hardware-Accurate Edge Cases', () => {
    test('DIV and TIMA increment on different boundaries', () => {
      // DIV increments every 256 cycles, TIMA (frequency 11) also every 256 cycles
      // They should increment at the same time for frequency 11
      timer.writeTAC(0x07); // Frequency 11 (256 cycles)

      timer.step(256);
      expect(timer.readDIV()).toBe(0x01);
      expect(timer.readTIMA()).toBe(0x01);

      timer.step(256);
      expect(timer.readDIV()).toBe(0x02);
      expect(timer.readTIMA()).toBe(0x02);
    });

    test('frequency change during timer operation', () => {
      timer.writeTAC(0x05); // Fast frequency (16 cycles)
      timer.step(16);
      expect(timer.readTIMA()).toBe(0x01);

      // Change to slow frequency
      timer.writeTAC(0x04); // Slow frequency (1024 cycles)
      timer.step(16); // Should not increment yet
      expect(timer.readTIMA()).toBe(0x01);

      timer.step(1008); // Complete the 1024 cycle period
      expect(timer.readTIMA()).toBe(0x02);
    });

    test('timer disable/enable during operation preserves TIMA value', () => {
      timer.writeTIMA(0x10);
      timer.writeTAC(0x05); // Enabled

      timer.step(16);
      expect(timer.readTIMA()).toBe(0x11); // Incremented

      // Disable timer
      timer.writeTAC(0x01); // Disabled
      timer.step(100);
      expect(timer.readTIMA()).toBe(0x11); // Unchanged

      // Re-enable timer
      timer.writeTAC(0x05); // Enabled again
      timer.step(16);
      expect(timer.readTIMA()).toBe(0x12); // Should increment again
    });
  });

  describe('Integration with Cycle Accumulation', () => {
    test('handles partial cycles correctly', () => {
      timer.writeTAC(0x05); // 16-cycle frequency

      // Step with various cycle counts
      timer.step(10);
      expect(timer.readTIMA()).toBe(0x00);

      timer.step(3);
      expect(timer.readTIMA()).toBe(0x00); // 13 total, not enough

      timer.step(3);
      expect(timer.readTIMA()).toBe(0x01); // 16 total, should increment

      timer.step(20); // Should cause one more increment (36 total cycles)
      expect(timer.readTIMA()).toBe(0x02);
    });

    test('accumulates cycles across multiple step() calls for DIV', () => {
      // DIV increments every 256 cycles
      timer.step(100);
      timer.step(100);
      timer.step(55);
      expect(timer.readDIV()).toBe(0x00); // 255 total

      timer.step(1);
      expect(timer.readDIV()).toBe(0x01); // 256 total
    });
  });
});
