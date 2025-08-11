/**
 * DE Register-to-Register LD Instructions Test
 *
 * Tests all LD instructions that involve copying values TO and FROM
 * D and E registers with other registers.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';
import { CPUTestingComponent } from '../../../src/emulator/types';

describe('DE Register-to-Register LD Tests', () => {
  let cpu: CPUTestingComponent;
  let mmu: MMU;

  beforeEach(() => {
    mmu = new MMU();
    cpu = new CPU(mmu);
  });

  describe('LD r,D instructions - copy FROM D register', () => {
    test('LD B,D (0x42) - copy D to B', () => {
      cpu.setRegisterD(0xab);
      cpu.setRegisterB(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x42); // LD B,D

      const cycles = cpu.step();

      expect(cpu.getRegisters().b).toBe(0xab);
      expect(cpu.getRegisters().d).toBe(0xab); // D unchanged
      expect(cycles).toBe(4);
    });

    test('LD C,D (0x4A) - copy D to C', () => {
      cpu.setRegisterD(0xcd);
      cpu.setRegisterC(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x4a); // LD C,D

      const cycles = cpu.step();

      expect(cpu.getRegisters().c).toBe(0xcd);
      expect(cpu.getRegisters().d).toBe(0xcd); // D unchanged
      expect(cycles).toBe(4);
    });

    test('LD E,D (0x5A) - copy D to E', () => {
      cpu.setRegisterD(0xef);
      cpu.setRegisterE(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x5a); // LD E,D

      const cycles = cpu.step();

      expect(cpu.getRegisters().e).toBe(0xef);
      expect(cpu.getRegisters().d).toBe(0xef); // D unchanged
      expect(cycles).toBe(4);
    });

    test('LD H,D (0x62) - copy D to H', () => {
      cpu.setRegisterD(0x12);
      cpu.setRegisterH(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x62); // LD H,D

      const cycles = cpu.step();

      expect(cpu.getRegisters().h).toBe(0x12);
      expect(cpu.getRegisters().d).toBe(0x12); // D unchanged
      expect(cycles).toBe(4);
    });

    test('LD L,D (0x6A) - copy D to L', () => {
      cpu.setRegisterD(0x34);
      cpu.setRegisterL(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x6a); // LD L,D

      const cycles = cpu.step();

      expect(cpu.getRegisters().l).toBe(0x34);
      expect(cpu.getRegisters().d).toBe(0x34); // D unchanged
      expect(cycles).toBe(4);
    });

    test('LD A,D (0x7A) - copy D to A', () => {
      cpu.setRegisterD(0x56);
      cpu.setRegisterA(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x7a); // LD A,D

      const cycles = cpu.step();

      expect(cpu.getRegisters().a).toBe(0x56);
      expect(cpu.getRegisters().d).toBe(0x56); // D unchanged
      expect(cycles).toBe(4);
    });
  });

  describe('LD r,E instructions - copy FROM E register', () => {
    test('LD B,E (0x43) - copy E to B', () => {
      cpu.setRegisterE(0x78);
      cpu.setRegisterB(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x43); // LD B,E

      const cycles = cpu.step();

      expect(cpu.getRegisters().b).toBe(0x78);
      expect(cpu.getRegisters().e).toBe(0x78); // E unchanged
      expect(cycles).toBe(4);
    });

    test('LD C,E (0x4B) - copy E to C', () => {
      cpu.setRegisterE(0x9a);
      cpu.setRegisterC(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x4b); // LD C,E

      const cycles = cpu.step();

      expect(cpu.getRegisters().c).toBe(0x9a);
      expect(cpu.getRegisters().e).toBe(0x9a); // E unchanged
      expect(cycles).toBe(4);
    });

    test('LD D,E (0x53) - copy E to D', () => {
      cpu.setRegisterE(0xbc);
      cpu.setRegisterD(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x53); // LD D,E

      const cycles = cpu.step();

      expect(cpu.getRegisters().d).toBe(0xbc);
      expect(cpu.getRegisters().e).toBe(0xbc); // E unchanged
      expect(cycles).toBe(4);
    });

    test('LD H,E (0x63) - copy E to H', () => {
      cpu.setRegisterE(0xde);
      cpu.setRegisterH(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x63); // LD H,E

      const cycles = cpu.step();

      expect(cpu.getRegisters().h).toBe(0xde);
      expect(cpu.getRegisters().e).toBe(0xde); // E unchanged
      expect(cycles).toBe(4);
    });

    test('LD L,E (0x6B) - copy E to L', () => {
      cpu.setRegisterE(0xf0);
      cpu.setRegisterL(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x6b); // LD L,E

      const cycles = cpu.step();

      expect(cpu.getRegisters().l).toBe(0xf0);
      expect(cpu.getRegisters().e).toBe(0xf0); // E unchanged
      expect(cycles).toBe(4);
    });

    test('LD A,E (0x7B) - copy E to A', () => {
      cpu.setRegisterE(0x11);
      cpu.setRegisterA(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x7b); // LD A,E

      const cycles = cpu.step();

      expect(cpu.getRegisters().a).toBe(0x11);
      expect(cpu.getRegisters().e).toBe(0x11); // E unchanged
      expect(cycles).toBe(4);
    });
  });

  describe('LD D,r instructions - copy TO D register', () => {
    test('LD D,B (0x50) - copy B to D', () => {
      cpu.setRegisterB(0x22);
      cpu.setRegisterD(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x50); // LD D,B

      const cycles = cpu.step();

      expect(cpu.getRegisters().d).toBe(0x22);
      expect(cpu.getRegisters().b).toBe(0x22); // B unchanged
      expect(cycles).toBe(4);
    });

    test('LD D,C (0x51) - copy C to D', () => {
      cpu.setRegisterC(0x33);
      cpu.setRegisterD(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x51); // LD D,C

      const cycles = cpu.step();

      expect(cpu.getRegisters().d).toBe(0x33);
      expect(cpu.getRegisters().c).toBe(0x33); // C unchanged
      expect(cycles).toBe(4);
    });

    test('LD D,D (0x52) - copy D to D (NOP-like)', () => {
      cpu.setRegisterD(0x44);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x52); // LD D,D

      const cycles = cpu.step();

      expect(cpu.getRegisters().d).toBe(0x44); // D unchanged
      expect(cycles).toBe(4);
    });

    test('LD D,H (0x54) - copy H to D', () => {
      cpu.setRegisterH(0x55);
      cpu.setRegisterD(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x54); // LD D,H

      const cycles = cpu.step();

      expect(cpu.getRegisters().d).toBe(0x55);
      expect(cpu.getRegisters().h).toBe(0x55); // H unchanged
      expect(cycles).toBe(4);
    });

    test('LD D,L (0x55) - copy L to D', () => {
      cpu.setRegisterL(0x66);
      cpu.setRegisterD(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x55); // LD D,L

      const cycles = cpu.step();

      expect(cpu.getRegisters().d).toBe(0x66);
      expect(cpu.getRegisters().l).toBe(0x66); // L unchanged
      expect(cycles).toBe(4);
    });

    test('LD D,A (0x57) - copy A to D', () => {
      cpu.setRegisterA(0x77);
      cpu.setRegisterD(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x57); // LD D,A

      const cycles = cpu.step();

      expect(cpu.getRegisters().d).toBe(0x77);
      expect(cpu.getRegisters().a).toBe(0x77); // A unchanged
      expect(cycles).toBe(4);
    });
  });

  describe('LD E,r instructions - copy TO E register', () => {
    test('LD E,B (0x58) - copy B to E', () => {
      cpu.setRegisterB(0x88);
      cpu.setRegisterE(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x58); // LD E,B

      const cycles = cpu.step();

      expect(cpu.getRegisters().e).toBe(0x88);
      expect(cpu.getRegisters().b).toBe(0x88); // B unchanged
      expect(cycles).toBe(4);
    });

    test('LD E,C (0x59) - copy C to E', () => {
      cpu.setRegisterC(0x99);
      cpu.setRegisterE(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x59); // LD E,C

      const cycles = cpu.step();

      expect(cpu.getRegisters().e).toBe(0x99);
      expect(cpu.getRegisters().c).toBe(0x99); // C unchanged
      expect(cycles).toBe(4);
    });

    test('LD E,H (0x5C) - copy H to E', () => {
      cpu.setRegisterH(0xaa);
      cpu.setRegisterE(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x5c); // LD E,H

      const cycles = cpu.step();

      expect(cpu.getRegisters().e).toBe(0xaa);
      expect(cpu.getRegisters().h).toBe(0xaa); // H unchanged
      expect(cycles).toBe(4);
    });

    test('LD E,L (0x5D) - copy L to E', () => {
      cpu.setRegisterL(0xbb);
      cpu.setRegisterE(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x5d); // LD E,L

      const cycles = cpu.step();

      expect(cpu.getRegisters().e).toBe(0xbb);
      expect(cpu.getRegisters().l).toBe(0xbb); // L unchanged
      expect(cycles).toBe(4);
    });

    test('LD E,E (0x5B) - copy E to E (NOP-like)', () => {
      cpu.setRegisterE(0xcc);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x5b); // LD E,E

      const cycles = cpu.step();

      expect(cpu.getRegisters().e).toBe(0xcc); // E unchanged
      expect(cycles).toBe(4);
    });

    test('LD E,A (0x5F) - copy A to E', () => {
      cpu.setRegisterA(0xdd);
      cpu.setRegisterE(0x00);

      cpu.setProgramCounter(0x8000);
      mmu.writeByte(0x8000, 0x5f); // LD E,A

      const cycles = cpu.step();

      expect(cpu.getRegisters().e).toBe(0xdd);
      expect(cpu.getRegisters().a).toBe(0xdd); // A unchanged
      expect(cycles).toBe(4);
    });
  });
});
