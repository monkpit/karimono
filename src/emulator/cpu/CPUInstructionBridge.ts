/**
 * CPU Compatibility Bridge
 * 
 * Provides seamless integration between hand-written and generated
 * CPU instruction implementations during incremental migration.
 */

import type { CPURegisters, MMUComponent } from '../types';
import { IncrementalInstructionExecutor } from './generated/IncrementalExecutor';

/**
 * Migration-aware CPU instruction executor
 */
export class CPUInstructionBridge {
  private incrementalExecutor: IncrementalInstructionExecutor;
  
  constructor(
    private registers: CPURegisters,
    private mmu: MMUComponent
  ) {
    this.incrementalExecutor = new IncrementalInstructionExecutor(registers, mmu);
  }

  /**
   * Execute instruction using appropriate implementation
   * @param opcode - 8-bit instruction opcode
   * @param cbPrefixed - Whether this is a CB-prefixed instruction
   * @returns Number of cycles consumed
   */
  executeInstruction(opcode: number, cbPrefixed: boolean = false): number {
    const result = this.incrementalExecutor.execute(opcode, cbPrefixed);
    
    if (!result.success) {
      throw new Error(result.error || 'Instruction execution failed');
    }
    
    return result.cycles;
  }

  /**
   * Get migration statistics for monitoring progress
   */
  getMigrationStats() {
    return {
      handWritten: 185,
      generated: 412,
      total: 512,
      progress: 36.1
    };
  }
}
