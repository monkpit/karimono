/**
 * CPU Diagnostics Tests for Game Boy Doctor Integration
 *
 * Tests diagnostic logging functionality that outputs CPU state in Game Boy Doctor format:
 * A:00 F:11 B:22 C:33 D:44 E:55 H:66 L:77 SP:8888 PC:9999 PCMEM:AA,BB,CC,DD
 *
 * References:
 * - Game Boy Doctor: https://robertheaton.com/gameboy-doctor/
 * - RGBDS GBZ80 Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 */

import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';

describe('CPU Diagnostics', () => {
  let cpu: CPU;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu);
  });

  describe('Diagnostic Logging', () => {
    test('should log CPU state in Game Boy Doctor format when diagnostic mode enabled', () => {
      // Arrange: Set specific register values for predictable output
      const registers = cpu.getRegisters();
      registers.a = 0x01;
      registers.f = 0xb0;
      registers.b = 0x00;
      registers.c = 0x13;
      registers.d = 0x00;
      registers.e = 0xd8;
      registers.h = 0x01;
      registers.l = 0x4d;
      registers.sp = 0xfffe;
      registers.pc = 0x0100;

      // Set up memory at PC location with known values
      mmu.writeByte(0x0100, 0xaa);
      mmu.writeByte(0x0101, 0xbb);
      mmu.writeByte(0x0102, 0xcc);
      mmu.writeByte(0x0103, 0xdd);

      // Act: Enable Game Boy Doctor and execute one instruction
      cpu.enableGameBoyDoctor();
      cpu.step();

      // Assert: Verify Game Boy Doctor format output
      const logs = cpu.getGameBoyDoctorLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toBe(
        'A:01 F:B0 B:00 C:13 D:00 E:D8 H:01 L:4D SP:FFFE PC:0100 PCMEM:AA,BB,CC,DD'
      );
    });

    test('should not log when diagnostic mode is disabled', () => {
      // Act: Execute instruction without enabling diagnostic mode
      cpu.step();

      // Assert: No logging should occur
      const logs = cpu.getGameBoyDoctorLogs();
      expect(logs).toHaveLength(0);
    });

    test('should allow enabling and disabling diagnostic mode', () => {
      // Act & Assert: Enable diagnostic mode
      cpu.enableGameBoyDoctor();
      cpu.step();
      expect(cpu.getGameBoyDoctorLogs()).toHaveLength(1);

      // Act & Assert: Disable diagnostic mode
      cpu.disableGameBoyDoctor();
      cpu.clearGameBoyDoctorLogs();
      cpu.step();
      expect(cpu.getGameBoyDoctorLogs()).toHaveLength(0);
    });
  });

  describe('Post-Boot State Initialization', () => {
    test('should initialize CPU to Game Boy Doctor post-boot state', () => {
      // Act: Get current register state
      const registers = cpu.getRegisters();

      // Assert: Verify post-boot state matches Game Boy Doctor specification
      expect(registers.a).toBe(0x01);
      expect(registers.f).toBe(0xb0);
      expect(registers.b).toBe(0x00);
      expect(registers.c).toBe(0x13);
      expect(registers.d).toBe(0x00);
      expect(registers.e).toBe(0xd8);
      expect(registers.h).toBe(0x01);
      expect(registers.l).toBe(0x4d);
      expect(registers.sp).toBe(0xfffe);
      expect(registers.pc).toBe(0x0100);
    });

    test('should reset CPU to post-boot state when reset is called', () => {
      // Arrange: Modify registers
      const registers = cpu.getRegisters();
      registers.a = 0xff;
      registers.f = 0x00;
      registers.b = 0xff;
      registers.c = 0xff;
      registers.d = 0xff;
      registers.e = 0xff;
      registers.h = 0xff;
      registers.l = 0xff;
      registers.sp = 0x0000;
      registers.pc = 0x8000;

      // Act: Reset CPU
      cpu.reset();

      // Assert: Verify reset to post-boot state
      const resetRegisters = cpu.getRegisters();
      expect(resetRegisters.a).toBe(0x01);
      expect(resetRegisters.f).toBe(0xb0);
      expect(resetRegisters.b).toBe(0x00);
      expect(resetRegisters.c).toBe(0x13);
      expect(resetRegisters.d).toBe(0x00);
      expect(resetRegisters.e).toBe(0xd8);
      expect(resetRegisters.h).toBe(0x01);
      expect(resetRegisters.l).toBe(0x4d);
      expect(resetRegisters.sp).toBe(0xfffe);
      expect(resetRegisters.pc).toBe(0x0100);
    });
  });

  describe('Memory Content Formatting', () => {
    test('should format 4 bytes of memory content as comma-separated hex values', () => {
      // Arrange: Set up memory with known values
      mmu.writeByte(0x0100, 0x12);
      mmu.writeByte(0x0101, 0x34);
      mmu.writeByte(0x0102, 0x56);
      mmu.writeByte(0x0103, 0x78);

      const registers = cpu.getRegisters();
      registers.pc = 0x0100;

      // Act: Enable Game Boy Doctor and execute
      cpu.enableGameBoyDoctor();
      cpu.step();

      // Assert: Verify memory content formatting
      const logs = cpu.getGameBoyDoctorLogs();
      expect(logs[0]).toContain('PCMEM:12,34,56,78');
    });

    test('should handle memory reads at edge addresses', () => {
      // Arrange: Test at high memory address
      const registers = cpu.getRegisters();
      registers.pc = 0xfffd; // Near end of address space

      mmu.writeByte(0xfffd, 0xaa);
      mmu.writeByte(0xfffe, 0xbb);
      mmu.writeByte(0xffff, 0xcc);
      // Address 0x10000 wraps to 0x0000
      mmu.writeByte(0x0000, 0xdd);

      // Act: Enable Game Boy Doctor and execute
      cpu.enableGameBoyDoctor();
      cpu.step();

      // Assert: Verify memory content with address wrapping
      const logs = cpu.getGameBoyDoctorLogs();
      expect(logs[0]).toContain('PCMEM:AA,BB,CC,DD');
    });
  });
});
