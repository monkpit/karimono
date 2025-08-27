/**
 * Generated SM83 CPU Instructions
 *
 * GENERATED CODE - DO NOT EDIT MANUALLY
 * Generated on: 2025-08-12T00:32:12.392Z
 * Source: tests/resources/opcodes.json
 * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 *
 * Complete implementation of all 512 SM83 CPU instructions as private CPU methods.
 * These integrate directly into the existing CPU.ts architecture.
 *
 * USAGE: Copy the generated private methods into CPU.ts and add corresponding
 * switch cases to executeInstruction().
 */

export * from './unprefixed';
export * from './cbprefixed';
export * from './instructionMap';

/**
 * Total instruction count validation
 */
export const INSTRUCTION_COUNT = {
  UNPREFIXED: 256,
  CB_PREFIXED: 256,
  TOTAL: 512,
} as const;
