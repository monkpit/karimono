/**
 * CPU Integration Guide for Generated Instructions
 *
 * GENERATED CODE - DO NOT EDIT MANUALLY
 * Generated on: 2025-08-12T00:32:12.393Z
 * Source: tests/resources/opcodes.json
 * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 *
 * This guide shows how to integrate generated CPU methods into the existing CPU.ts architecture.
 * All generated methods follow the established patterns in CPU.ts.
 */

/**
 * INTEGRATION STEPS:
 *
 * 1. Copy generated private methods from unprefixed/ and cbprefixed/ folders into CPU.ts
 * 2. Add corresponding switch cases to executeInstruction() method
 * 3. For CB-prefixed instructions, implement CB prefix handling in executeInstruction()
 * 4. Run tests to validate integration
 *
 * ARCHITECTURAL REQUIREMENTS:
 *
 * - All generated methods are private CPU methods
 * - Methods return simple number (cycle count)
 * - Methods use direct register access: this.registers.*
 * - Methods use existing flag helper methods: this.setZeroFlag(), etc.
 * - Methods follow hardware-accurate timing from opcodes.json
 *
 * EXAMPLE INTEGRATION:
 *
 * // In CPU.ts executeInstruction() switch:
 * case 0x88: // ADC A,B
 *   return this.executeADCAB();
 *
 * case 0x89: // ADC A,C
 *   return this.executeADCAC();
 *
 * // CB-prefixed handling:
 * case 0xCB: // CB prefix
 *   const cbOpcode = this.mmu.readByte(this.registers.pc);
 *   this.registers.pc = (this.registers.pc + 1) & 0xffff;
 *   return this.executeCBInstruction(cbOpcode);
 */

/**
 * Instruction count summary
 */
export const INTEGRATION_SUMMARY = {
  UNPREFIXED_INSTRUCTIONS: 256,
  CB_PREFIXED_INSTRUCTIONS: 256,
  TOTAL_INSTRUCTIONS: 512,
  EXISTING_IMPLEMENTED: 8, // Current CPU.ts implementation count
  REMAINING_TO_INTEGRATE: 504,
} as const;

/**
 * Generated file structure:
 * - unprefixed/: Contains private CPU methods for 0x00-0xFF opcodes
 * - cbprefixed/: Contains private CPU methods for CB 0x00-0xFF opcodes
 * - instructionMap.ts: Lookup table for instruction specifications
 * - This file: Integration guide and summary
 */
