/**
 * Serial Interface Component Unit Tests
 *
 * Hardware-accurate Game Boy DMG serial communication testing
 * Following TDD principles with hardware specification compliance
 */

import { SerialInterface } from '../../../src/emulator/mmu/SerialInterface';

describe('SerialInterface Component', () => {
  let serialInterface: SerialInterface;

  beforeEach(() => {
    serialInterface = new SerialInterface();
  });

  describe('Register Access', () => {
    test('Serial data register should hold written value', () => {
      // Initial State: SB = 0x00
      expect(serialInterface.readSB()).toBe(0x00);

      // Action: Write 0x42 to SB register
      serialInterface.writeSB(0x42);

      // Expected Result: Reading SB returns 0x42
      expect(serialInterface.readSB()).toBe(0x42);
    });

    test('Serial control register should start transfer when written with 0x81', () => {
      // Initial State: SC = 0x00, SB = 0x55
      expect(serialInterface.readSC()).toBe(0x00);
      serialInterface.writeSB(0x55);

      // Action: Write 0x81 to SC register
      serialInterface.writeSC(0x81);

      // Expected Result: SC bit 7 = 1 (transfer active), transfer begins
      expect(serialInterface.readSC() & 0x80).toBe(0x80); // Transfer start bit set
      expect(serialInterface.isTransferActive()).toBe(true);
    });

    test('Serial control register should preserve clock select bit', () => {
      // Test internal clock selection (bit 0 = 1)
      serialInterface.writeSC(0x81); // Transfer start + internal clock
      expect(serialInterface.readSC() & 0x01).toBe(0x01); // Clock select preserved

      // Reset and test external clock selection (bit 0 = 0)
      serialInterface.reset();
      serialInterface.writeSC(0x80); // Transfer start + external clock
      expect(serialInterface.readSC() & 0x01).toBe(0x00); // Clock select preserved
    });
  });

  describe('Transfer Timing', () => {
    test('Serial transfer should complete after correct cycle count', () => {
      // Initial State: SC = 0x81 (transfer active), SB = 0xAA
      serialInterface.writeSB(0xaa);
      serialInterface.writeSC(0x81);
      expect(serialInterface.isTransferActive()).toBe(true);

      // Action: Execute exactly 4096 CPU cycles (hardware-accurate timing)
      serialInterface.step(4095); // One cycle short
      expect(serialInterface.isTransferActive()).toBe(true); // Still active

      serialInterface.step(1); // Complete the transfer

      // Expected Result: SC bit 7 = 0 (transfer complete)
      expect(serialInterface.readSC() & 0x80).toBe(0x00); // Transfer complete
      expect(serialInterface.isTransferActive()).toBe(false);
    });

    test('Multiple step calls should accumulate transfer progress', () => {
      serialInterface.writeSB(0x55);
      serialInterface.writeSC(0x81);

      // Step in chunks that add up to complete transfer
      serialInterface.step(2000);
      expect(serialInterface.isTransferActive()).toBe(true);

      serialInterface.step(2000);
      expect(serialInterface.isTransferActive()).toBe(true);

      serialInterface.step(96); // Total: 4096
      expect(serialInterface.isTransferActive()).toBe(false);
    });
  });

  describe('Disconnected Cable Behavior', () => {
    test('Disconnected cable should shift in 0xFF during transfer', () => {
      // Initial State: SB = 0x00, no external device connected
      serialInterface.writeSB(0x00);

      // Action: Write 0x81 to SC, wait for transfer completion
      serialInterface.writeSC(0x81);
      serialInterface.step(4096); // Complete transfer

      // Expected Result: SB = 0xFF (all input bits high)
      expect(serialInterface.readSB()).toBe(0xff);
      expect(serialInterface.isTransferActive()).toBe(false);
    });

    test('Disconnected cable behavior with different initial data', () => {
      // Test with different starting value - should still become 0xFF
      serialInterface.writeSB(0x55);
      serialInterface.writeSC(0x81);
      serialInterface.step(4096);

      expect(serialInterface.readSB()).toBe(0xff);
    });
  });

  describe('Output Buffer Management', () => {
    test('Serial output buffer should capture transferred characters', () => {
      // Initial State: Empty output buffer
      expect(serialInterface.getOutputBuffer()).toBe('');

      // Action: Transfer ASCII 'H', 'i', '!' characters via serial
      // Transfer 'H' (0x48)
      serialInterface.writeSB(0x48);
      serialInterface.writeSC(0x81);
      serialInterface.step(4096);

      // Transfer 'i' (0x69)
      serialInterface.writeSB(0x69);
      serialInterface.writeSC(0x81);
      serialInterface.step(4096);

      // Transfer '!' (0x21)
      serialInterface.writeSB(0x21);
      serialInterface.writeSC(0x81);
      serialInterface.step(4096);

      // Expected Result: Output buffer contains "Hi!"
      expect(serialInterface.getOutputBuffer()).toBe('Hi!');
    });

    test('Output buffer should handle newline characters', () => {
      // Transfer text with newline
      const text = 'Line1\nLine2';
      for (let i = 0; i < text.length; i++) {
        serialInterface.writeSB(text.charCodeAt(i));
        serialInterface.writeSC(0x81);
        serialInterface.step(4096);
      }

      expect(serialInterface.getOutputBuffer()).toBe(text);
    });

    test('Output buffer clear should empty the buffer', () => {
      // Add some text to buffer
      serialInterface.writeSB(0x41); // 'A'
      serialInterface.writeSC(0x81);
      serialInterface.step(4096);

      expect(serialInterface.getOutputBuffer()).toBe('A');

      // Clear buffer
      serialInterface.clearOutputBuffer();
      expect(serialInterface.getOutputBuffer()).toBe('');
    });

    test('Output buffer should handle non-printable characters safely', () => {
      // Test control characters and extended ASCII
      serialInterface.writeSB(0x00); // NULL
      serialInterface.writeSC(0x81);
      serialInterface.step(4096);

      serialInterface.writeSB(0x0a); // Newline
      serialInterface.writeSC(0x81);
      serialInterface.step(4096);

      serialInterface.writeSB(0xff); // Extended ASCII
      serialInterface.writeSC(0x81);
      serialInterface.step(4096);

      const output = serialInterface.getOutputBuffer();
      expect(output.length).toBe(3); // All characters should be captured
      expect(output.charCodeAt(1)).toBe(0x0a); // Newline preserved
    });
  });

  describe('Interrupt Handling', () => {
    test('Serial transfer completion should trigger a serial interrupt', () => {
      // Mock interrupt callback
      const interruptCallback = jest.fn();
      serialInterface = new SerialInterface(false, interruptCallback);

      // Initial State: SC = 0x81 (transfer active), SB = 0xAA
      serialInterface.writeSB(0xaa);
      serialInterface.writeSC(0x81);

      // Action: Complete the transfer
      serialInterface.step(4096);

      // Expected Result: Interrupt callback for serial (bit 3) should be called
      expect(interruptCallback).toHaveBeenCalledWith(3);
      expect(interruptCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('External Clock Mode', () => {
    test('External clock mode should not auto-advance transfer', () => {
      // Set external clock mode (bit 0 = 0)
      serialInterface.writeSB(0xaa);
      serialInterface.writeSC(0x80); // Transfer start + external clock

      expect(serialInterface.isTransferActive()).toBe(true);

      // Step many cycles - transfer should remain active without external clock
      serialInterface.step(100000);
      expect(serialInterface.isTransferActive()).toBe(true);
      expect(serialInterface.readSC() & 0x80).toBe(0x80); // Still busy
    });
  });

  describe('Component Reset', () => {
    test('Reset should clear all register states and buffers', () => {
      // Setup some state
      serialInterface.writeSB(0x42);
      serialInterface.writeSC(0x81);
      serialInterface.step(4096);

      expect(serialInterface.getOutputBuffer().length).toBeGreaterThan(0);

      // Reset
      serialInterface.reset();

      // Verify clean state
      expect(serialInterface.readSB()).toBe(0x00);
      expect(serialInterface.readSC()).toBe(0x00);
      expect(serialInterface.isTransferActive()).toBe(false);
      expect(serialInterface.getOutputBuffer()).toBe('');
    });
  });

  describe('Edge Cases', () => {
    test('Writing to SC register during active transfer should not interfere', () => {
      serialInterface.writeSB(0x55);
      serialInterface.writeSC(0x81);

      // Advance transfer partway
      serialInterface.step(2048); // Halfway point (4096 / 2)
      expect(serialInterface.isTransferActive()).toBe(true);

      // Try to write to SC again - this starts a new transfer
      serialInterface.writeSC(0x81);

      // Since a new transfer was started, we need full cycle count again
      serialInterface.step(4096); // Complete the new transfer
      expect(serialInterface.isTransferActive()).toBe(false);
    });

    test('Step with zero cycles should not change transfer state', () => {
      serialInterface.writeSB(0x55);
      serialInterface.writeSC(0x81);
      const initialActive = serialInterface.isTransferActive();

      serialInterface.step(0);

      expect(serialInterface.isTransferActive()).toBe(initialActive);
    });

    test('Step with negative cycles should be handled gracefully', () => {
      serialInterface.writeSB(0x55);
      serialInterface.writeSC(0x81);

      // This should not crash or cause undefined behavior
      expect(() => {
        serialInterface.step(-100);
      }).not.toThrow();

      expect(serialInterface.isTransferActive()).toBe(true); // Should remain active
    });
  });
});
