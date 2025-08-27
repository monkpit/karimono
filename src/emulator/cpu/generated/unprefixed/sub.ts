// @ts-nocheck
/**
 * Generated SM83 CPU Instruction: SUB
 *
 * GENERATED CODE - DO NOT EDIT MANUALLY
 * Generated on: 2025-08-12T00:32:12.389Z
 * Source: tests/resources/opcodes.json
 * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 *
 * This file implements 9 variants of the SUB instruction.
 * Each implementation follows hardware-accurate timing and flag calculations.
 *
 * ARCHITECTURAL PATTERN: These are private CPU methods, not separate classes.
 * They integrate directly into the existing CPU.ts executeInstruction() switch.
 */

// No imports needed - these methods are meant to be copied into CPU class

/**
 * CPU Method Implementations for SUB
 *
 * These methods should be added to the CPU class as private methods.
 * They follow the existing CPU architecture pattern:
 * - Direct register access via this.registers.*
 * - Use existing flag helper methods
 * - Return simple cycle count (number)
 * - Integrate into executeInstruction() switch statement
 */

/**
 * SUB 0x90 - A, B
 * Hardware: 1 byte, 4 cycles
 * Flags: Z=Z N=1 H=H C=C
 * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 */
function executeSUBAB90(): number {
  // SUB A,B - Subtract B from A with flag calculation
  const a = this.registers.a;
  const value = this.registers.b;
  const result = a - value;
  
  // Update A register (handle underflow)
  this.registers.a = result & 0xff;
  
  // Calculate and set flags
  this.setZeroFlag((result & 0xff) === 0);
  this.setSubtractFlag(true); // N flag always set for SUB
  this.setHalfCarryFlag((value & 0x0f) > (a & 0x0f)); // H flag set if borrow from bit 4
  this.setCarryFlag(result < 0); // C flag set if borrow occurred

  return 4;
}

/**
 * SUB 0x91 - A, C
 * Hardware: 1 byte, 4 cycles
 * Flags: Z=Z N=1 H=H C=C
 * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 */
function executeSUBAC91(): number {
  // SUB A,C - Subtract C from A with flag calculation
  const a = this.registers.a;
  const value = this.registers.c;
  const result = a - value;
  
  // Update A register (handle underflow)
  this.registers.a = result & 0xff;
  
  // Calculate and set flags
  this.setZeroFlag((result & 0xff) === 0);
  this.setSubtractFlag(true); // N flag always set for SUB
  this.setHalfCarryFlag((value & 0x0f) > (a & 0x0f)); // H flag set if borrow from bit 4
  this.setCarryFlag(result < 0); // C flag set if borrow occurred

  return 4;
}

/**
 * SUB 0x92 - A, D
 * Hardware: 1 byte, 4 cycles
 * Flags: Z=Z N=1 H=H C=C
 * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 */
function executeSUBAD92(): number {
  // SUB A,D - Subtract D from A with flag calculation
  const a = this.registers.a;
  const value = this.registers.d;
  const result = a - value;
  
  // Update A register (handle underflow)
  this.registers.a = result & 0xff;
  
  // Calculate and set flags
  this.setZeroFlag((result & 0xff) === 0);
  this.setSubtractFlag(true); // N flag always set for SUB
  this.setHalfCarryFlag((value & 0x0f) > (a & 0x0f)); // H flag set if borrow from bit 4
  this.setCarryFlag(result < 0); // C flag set if borrow occurred

  return 4;
}

/**
 * SUB 0x93 - A, E
 * Hardware: 1 byte, 4 cycles
 * Flags: Z=Z N=1 H=H C=C
 * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 */
function executeSUBAE93(): number {
  // SUB A,E - Subtract E from A with flag calculation
  const a = this.registers.a;
  const value = this.registers.e;
  const result = a - value;
  
  // Update A register (handle underflow)
  this.registers.a = result & 0xff;
  
  // Calculate and set flags
  this.setZeroFlag((result & 0xff) === 0);
  this.setSubtractFlag(true); // N flag always set for SUB
  this.setHalfCarryFlag((value & 0x0f) > (a & 0x0f)); // H flag set if borrow from bit 4
  this.setCarryFlag(result < 0); // C flag set if borrow occurred

  return 4;
}

/**
 * SUB 0x94 - A, H
 * Hardware: 1 byte, 4 cycles
 * Flags: Z=Z N=1 H=H C=C
 * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 */
function executeSUBAH94(): number {
  // SUB A,H - Subtract H from A with flag calculation
  const a = this.registers.a;
  const value = this.registers.h;
  const result = a - value;
  
  // Update A register (handle underflow)
  this.registers.a = result & 0xff;
  
  // Calculate and set flags
  this.setZeroFlag((result & 0xff) === 0);
  this.setSubtractFlag(true); // N flag always set for SUB
  this.setHalfCarryFlag((value & 0x0f) > (a & 0x0f)); // H flag set if borrow from bit 4
  this.setCarryFlag(result < 0); // C flag set if borrow occurred

  return 4;
}

/**
 * SUB 0x95 - A, L
 * Hardware: 1 byte, 4 cycles
 * Flags: Z=Z N=1 H=H C=C
 * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 */
function executeSUBAL95(): number {
  // SUB A,L - Subtract L from A with flag calculation
  const a = this.registers.a;
  const value = this.registers.l;
  const result = a - value;
  
  // Update A register (handle underflow)
  this.registers.a = result & 0xff;
  
  // Calculate and set flags
  this.setZeroFlag((result & 0xff) === 0);
  this.setSubtractFlag(true); // N flag always set for SUB
  this.setHalfCarryFlag((value & 0x0f) > (a & 0x0f)); // H flag set if borrow from bit 4
  this.setCarryFlag(result < 0); // C flag set if borrow occurred

  return 4;
}

/**
 * SUB 0x96 - A, HL
 * Hardware: 1 byte, 8 cycles
 * Flags: Z=Z N=1 H=H C=C
 * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 */
function executeSUBAHL96(): number {
  // SUB A,(HL) - Subtract value at HL from A
  const a = this.registers.a;
  const hlAddress = this.getHL();
  const value = this.mmu.readByte(hlAddress);
  const result = a - value;
  
  // Update A register (handle underflow)
  this.registers.a = result & 0xff;
  
  // Calculate and set flags
  this.setZeroFlag((result & 0xff) === 0);
  this.setSubtractFlag(true); // N flag always set for SUB
  this.setHalfCarryFlag((value & 0x0f) > (a & 0x0f)); // H flag set if borrow from bit 4
  this.setCarryFlag(result < 0); // C flag set if borrow occurred

  return 8;
}

/**
 * SUB 0x97 - A, A
 * Hardware: 1 byte, 4 cycles
 * Flags: Z=1 N=1 H=0 C=0
 * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 */
function executeSUBAA97(): number {
  // SUB A,A - Subtract A from A with flag calculation
  const a = this.registers.a;
  const value = this.registers.a;
  const result = a - value;
  
  // Update A register (handle underflow)
  this.registers.a = result & 0xff;
  
  // Calculate and set flags
  this.setZeroFlag((result & 0xff) === 0);
  this.setSubtractFlag(true); // N flag always set for SUB
  this.setHalfCarryFlag((value & 0x0f) > (a & 0x0f)); // H flag set if borrow from bit 4
  this.setCarryFlag(result < 0); // C flag set if borrow occurred

  return 4;
}

/**
 * SUB 0xD6 - A, n8
 * Hardware: 2 bytes, 8 cycles
 * Flags: Z=Z N=1 H=H C=C
 * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 */
function executeSUBAn8D6(): number {
  // SUB A,n8 - Subtract immediate 8-bit value from A
  const a = this.registers.a;
  const value = this.mmu.readByte(this.registers.pc);
  this.registers.pc = (this.registers.pc + 1) & 0xffff;
  const result = a - value;
  
  // Update A register (handle underflow)
  this.registers.a = result & 0xff;
  
  // Calculate and set flags
  this.setZeroFlag((result & 0xff) === 0);
  this.setSubtractFlag(true); // N flag always set for SUB
  this.setHalfCarryFlag((value & 0x0f) > (a & 0x0f)); // H flag set if borrow from bit 4
  this.setCarryFlag(result < 0); // C flag set if borrow occurred

  return 8;
}

/**
 * INTEGRATION: Add these cases to CPU.executeInstruction() switch statement
 */
/*
case 0x90: // SUB - A, B
  return this.executeSUBAB90();

case 0x91: // SUB - A, C
  return this.executeSUBAC91();

case 0x92: // SUB - A, D
  return this.executeSUBAD92();

case 0x93: // SUB - A, E
  return this.executeSUBAE93();

case 0x94: // SUB - A, H
  return this.executeSUBAH94();

case 0x95: // SUB - A, L
  return this.executeSUBAL95();

case 0x96: // SUB - A, HL
  return this.executeSUBAHL96();

case 0x97: // SUB - A, A
  return this.executeSUBAA97();

case 0xD6: // SUB - A, n8
  return this.executeSUBAn8D6();

*/
