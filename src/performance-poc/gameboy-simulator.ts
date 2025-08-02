/**
 * Game Boy Simulator for Performance Testing
 *
 * Simulates Game Boy CPU and memory operations to test performance
 * characteristics of immutable vs mutable state management patterns.
 */

import { GameBoyState } from './ring-buffer';

export type SimulationMode = 'immutable' | 'mutable';

interface MutableRegisters {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  h: number;
  l: number;
  sp: number;
  pc: number;
}

interface MutableGameBoyState {
  registers: MutableRegisters;
  memory: number[];
  cycle: number;
}

export class GameBoySimulator {
  private mode: SimulationMode = 'mutable';
  private mutableState: MutableGameBoyState;
  private immutableState: GameBoyState;

  // Game Boy memory map constants
  private static readonly MEMORY_SIZE = 32768; // 32KB (0x0000 - 0x7FFF)

  constructor() {
    // Initialize mutable state
    this.mutableState = {
      registers: {
        a: 0x01,
        b: 0x00,
        c: 0x13,
        d: 0x00,
        e: 0xd8,
        f: 0xb0,
        h: 0x01,
        l: 0x4d,
        sp: 0xfffe,
        pc: 0x0100, // Start at 0x0100 (after boot ROM)
      },
      memory: new Array(GameBoySimulator.MEMORY_SIZE).fill(0),
      cycle: 0,
    };

    // Initialize immutable state (frozen copy)
    this.immutableState = this.createImmutableState(this.mutableState);

    // Initialize memory with some realistic patterns
    this.initializeMemory();
  }

  private initializeMemory(): void {
    // Simulate cartridge header at 0x0100-0x014F
    for (let i = 0x0100; i < 0x0150; i++) {
      this.mutableState.memory[i] = Math.floor(Math.random() * 256);
    }

    // Simulate some working RAM patterns
    for (let i = 0x8000; i < 0x9000; i++) {
      if (i < this.mutableState.memory.length) {
        this.mutableState.memory[i] = Math.floor(Math.random() * 256);
      }
    }

    // Update immutable state if needed
    if (this.mode === 'immutable') {
      this.immutableState = this.createImmutableState(this.mutableState);
    }
  }

  private createImmutableState(mutableState: MutableGameBoyState): GameBoyState {
    return {
      registers: { ...mutableState.registers },
      memory: [...mutableState.memory],
      cycle: mutableState.cycle,
    };
  }

  setMode(mode: SimulationMode): void {
    this.mode = mode;

    // if (mode === 'immutable') {
    //   // Sync immutable state with current mutable state
    //   this.immutableState = this.createImmutableState(this.mutableState);
    // }
  }

  getMode(): SimulationMode {
    return this.mode;
  }

  simulateStep(): void {
    if (this.mode === 'immutable') {
      this.simulateStepImmutable();
    } else {
      this.simulateStepMutable();
    }
  }

  private simulateStepMutable(): void {
    // Simulate typical Game Boy CPU operations (mutable updates)

    // 1. Fetch instruction (increment PC)
    this.mutableState.registers.pc = (this.mutableState.registers.pc + 1) & 0xffff;

    // 2. Simulate random register operations
    const operation = Math.floor(Math.random() * 8);
    switch (operation) {
      case 0: // LD A, B
        this.mutableState.registers.a = this.mutableState.registers.b;
        break;
      case 1: // INC A
        this.mutableState.registers.a = (this.mutableState.registers.a + 1) & 0xff;
        break;
      case 2: // LD HL, immediate
        this.mutableState.registers.h = Math.floor(Math.random() * 256);
        this.mutableState.registers.l = Math.floor(Math.random() * 256);
        break;
      case 3: {
        // Memory write
        const writeAddr = Math.floor(Math.random() * this.mutableState.memory.length);
        this.mutableState.memory[writeAddr] = Math.floor(Math.random() * 256);
        break;
      }
      case 4: {
        // Memory read
        const readAddr = Math.floor(Math.random() * this.mutableState.memory.length);
        this.mutableState.registers.a = this.mutableState.memory[readAddr];
        break;
      }
      case 5: // Stack operation
        this.mutableState.registers.sp = (this.mutableState.registers.sp - 1) & 0xffff;
        break;
      case 6: // Flag manipulation
        this.mutableState.registers.f = Math.floor(Math.random() * 256) & 0xf0;
        break;
      case 7: {
        // 16-bit operation
        const bc = (this.mutableState.registers.b << 8) | this.mutableState.registers.c;
        const newBC = (bc + 1) & 0xffff;
        this.mutableState.registers.b = (newBC >> 8) & 0xff;
        this.mutableState.registers.c = newBC & 0xff;
        break;
      }
    }

    // 3. Increment cycle counter
    this.mutableState.cycle++;
  }

  private simulateStepImmutable(): void {
    // OPTIMIZED: Work directly on mutable state for performance,
    // copy-on-rewind strategy defers expensive operations until needed

    // Update mutable state directly for performance
    this.simulateStepMutable();

    // Update immutable state reference without copying memory
    // Memory copying will only happen if/when rewind is invoked
    this.immutableState = {
      registers: { ...this.mutableState.registers },
      memory: this.mutableState.memory, // Reference, not copy!
      cycle: this.mutableState.cycle,
    };
  }

  getState(): GameBoyState {
    if (this.mode === 'immutable') {
      return this.immutableState;
    } else {
      // Return a snapshot for mutable mode (same object reference for testing)
      return this.mutableState as GameBoyState;
    }
  }

  getMemorySize(): number {
    return GameBoySimulator.MEMORY_SIZE;
  }

  getMemorySnapshot(): readonly number[] {
    if (this.mode === 'immutable') {
      return this.immutableState.memory;
    } else {
      return this.mutableState.memory;
    }
  }

  /**
   * Get reference to mutable memory for lazy copying strategy
   * WARNING: This exposes the internal mutable memory array
   * Only use for performance-critical copy-on-rewind implementations
   */
  getMutableMemoryReference(): number[] {
    return this.mutableState.memory;
  }

  // Utility methods for performance analysis
  getCurrentCycle(): number {
    return this.mode === 'immutable' ? this.immutableState.cycle : this.mutableState.cycle;
  }

  reset(): void {
    // Reset to initial state
    this.mutableState = {
      registers: {
        a: 0x01,
        b: 0x00,
        c: 0x13,
        d: 0x00,
        e: 0xd8,
        f: 0xb0,
        h: 0x01,
        l: 0x4d,
        sp: 0xfffe,
        pc: 0x0100,
      },
      memory: new Array(GameBoySimulator.MEMORY_SIZE).fill(0),
      cycle: 0,
    };

    this.immutableState = this.createImmutableState(this.mutableState);
    this.initializeMemory();
  }

  // Batch simulation for performance testing
  simulateSteps(stepCount: number): void {
    for (let i = 0; i < stepCount; i++) {
      this.simulateStep();
    }
  }
}
