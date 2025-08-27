/**
 * MMU Blargg Test Fixes Validation
 *
 * Tests for hardware register stubs and timing fixes implemented for Blargg test ROM success
 */

import { MMU } from '../../../src/emulator/mmu/MMU';
import { SerialInterface } from '../../../src/emulator/mmu/SerialInterface';

describe('MMU Blargg Test Fixes', () => {
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
  });

  describe('Sound Register Stubs', () => {
    test('NR52 register reads and writes correctly', () => {
      // Initial state - should read as initialized value
      expect(mmu.readByte(0xff26)).toBe(0xff); // Undefined registers return 0xFF initially

      // Write to NR52
      mmu.writeByte(0xff26, 0x80);
      expect(mmu.readByte(0xff26)).toBe(0x80);

      // Write to NR52 again
      mmu.writeByte(0xff26, 0x00);
      expect(mmu.readByte(0xff26)).toBe(0x00);
    });

    test('NR50 register reads and writes correctly', () => {
      // Write to NR50
      mmu.writeByte(0xff24, 0x77);
      expect(mmu.readByte(0xff24)).toBe(0x77);

      // Write different value
      mmu.writeByte(0xff24, 0x33);
      expect(mmu.readByte(0xff24)).toBe(0x33);
    });

    test('NR51 register reads and writes correctly', () => {
      // Write to NR51
      mmu.writeByte(0xff25, 0xf3);
      expect(mmu.readByte(0xff25)).toBe(0xf3);

      // Write different value
      mmu.writeByte(0xff25, 0xff);
      expect(mmu.readByte(0xff25)).toBe(0xff);
    });

    test('sound register writes do not crash emulator', () => {
      // Write sequence like Blargg tests do
      expect(() => {
        mmu.writeByte(0xff26, 0x00); // Sound off
        mmu.writeByte(0xff26, 0x80); // Sound on
        mmu.writeByte(0xff25, 0xff); // Full panning
        mmu.writeByte(0xff24, 0x77); // Volume settings
      }).not.toThrow();
    });
  });

  describe('LY Register Auto-Increment', () => {
    test('LY register starts at 0', () => {
      expect(mmu.readByte(0xff44)).toBe(0);
    });

    test('LY register increments after step cycles', () => {
      const initialLY = mmu.readByte(0xff44);

      // Step enough cycles to trigger LY increment (456 cycles)
      mmu.step(456);

      const newLY = mmu.readByte(0xff44);
      expect(newLY).toBe((initialLY + 1) % 154);
    });

    test('LY register wraps around after 153', () => {
      // Step enough cycles to reach 153 and wrap
      for (let i = 0; i < 154; i++) {
        mmu.step(456);
      }

      expect(mmu.readByte(0xff44)).toBe(0); // Should wrap to 0
    });

    test('writing to LY register resets it to 0', () => {
      // Step to get non-zero LY
      mmu.step(456 * 10);
      expect(mmu.readByte(0xff44)).not.toBe(0);

      // Write to LY should reset it
      mmu.writeByte(0xff44, 0x42); // Value doesn't matter
      expect(mmu.readByte(0xff44)).toBe(0);
    });

    test('LY timing works for VBlank detection', () => {
      // Step to scanline 144 (start of VBlank) - need 144 line periods
      for (let line = 0; line < 144; line++) {
        mmu.step(456);
      }
      const ly = mmu.readByte(0xff44);
      expect(ly).toBe(144); // Should be exactly at VBlank start
    });
  });

  describe('Post-Boot State Integration', () => {
    test('sound registers initialized correctly in post-boot state', () => {
      mmu.setPostBootState();

      // Check that sound registers have correct post-boot values
      expect(mmu.readByte(0xff26)).toBe(0xf1); // NR52 post-boot value
      expect(mmu.readByte(0xff24)).toBe(0x77); // NR50 post-boot value
      expect(mmu.readByte(0xff25)).toBe(0xf3); // NR51 post-boot value
    });

    test('LY register accessible in post-boot state', () => {
      mmu.setPostBootState();

      expect(mmu.readByte(0xff44)).toBe(0); // LY starts at 0
      mmu.step(456);
      expect(mmu.readByte(0xff44)).toBe(1); // Should increment
    });
  });
});

describe('SerialInterface Hardware-Accurate Timing', () => {
  let serialInterface: SerialInterface;

  beforeEach(() => {
    serialInterface = new SerialInterface();
  });

  test('serial transfer completes in 4096 cycles (hardware-accurate)', () => {
    // Start a transfer
    serialInterface.writeSB(0x41); // 'A'
    serialInterface.writeSC(0x81); // Start transfer with internal clock

    // Should not be complete yet
    expect(serialInterface.isTransferActive()).toBe(true);

    // Step exactly 4096 cycles (hardware-accurate timing)
    serialInterface.step(4096);

    // Transfer should now be complete
    expect(serialInterface.isTransferActive()).toBe(false);
    expect(serialInterface.getOutputBuffer()).toBe('A');
  });

  test('serial transfer not complete before 4096 cycles', () => {
    // Start a transfer
    serialInterface.writeSB(0x42); // 'B'
    serialInterface.writeSC(0x81); // Start transfer

    // Step just under 4096 cycles
    serialInterface.step(4095);

    // Transfer should still be active
    expect(serialInterface.isTransferActive()).toBe(true);
    expect(serialInterface.getOutputBuffer()).toBe('');
  });

  test('multiple characters complete with correct timing', () => {
    const testString = 'Test';
    let totalCycles = 0;

    for (const char of testString) {
      serialInterface.writeSB(char.charCodeAt(0));
      serialInterface.writeSC(0x81);

      // Each transfer takes 4096 cycles (hardware-accurate)
      serialInterface.step(4096);
      totalCycles += 4096;
    }

    expect(serialInterface.getOutputBuffer()).toBe(testString);
    expect(totalCycles).toBe(4096 * testString.length);
  });
});
