# Emulator Execution Loop Architecture

**Status**: Design Complete  
**Date**: 2025-08-02  
**Author**: Backend TypeScript Engineer  

## Executive Summary

This document defines the execution loop architecture for Karimono-v2, solving the tension between GameBoy Online's coupled approach and our immutable design goals. The solution implements **immutable opcodes with mutable state containers**, enabling both hardware-accurate emulation and efficient rewind functionality.

## Core Design Principles

### 1. Immutable Opcodes, Mutable Containers
- **Opcodes**: Pure functions that compute state transitions
- **State Containers**: Mutable objects that hold component state
- **MMU Integration**: Interface-based memory access for opcodes
- **Rewind Support**: Ring buffer captures complete system state

### 2. Component Isolation with Controlled Coupling
- **CPU**: Executes opcodes through MMU interface
- **PPU**: Synchronized via cycle-accurate timing
- **State Manager**: Captures snapshots for rewind functionality
- **Timing Controller**: Coordinates component synchronization

## Proposed Architecture

### Component Hierarchy

```
EmulatorCore
├── StateManager (rewind ring buffer)
├── TimingController (cycle coordination)
├── SM83CPU (instruction execution)
├── MMU (memory management unit)
├── PPU (picture processing unit)  
├── APU (audio processing unit)
├── InterruptController
└── InputController
```

### Key Architectural Decisions

1. **Immutable Opcodes**: Each instruction is a pure function
2. **State Snapshots**: Complete system state captured for rewind
3. **Cycle-Accurate Timing**: Components sync on master clock cycles
4. **Interface-Based MMU**: Clean memory abstraction for testing
5. **Ring Buffer History**: Efficient O(1) rewind to any previous frame

## TypeScript Interface Definitions

### Core System Interfaces

```typescript
// Core emulator state that can be rewound
interface EmulatorState {
  readonly cpu: SM83State;
  readonly memory: MemoryState;
  readonly ppu: PPUState;
  readonly apu: APUState;
  readonly interrupts: InterruptState;
  readonly timers: TimerState;
  readonly cycles: number;
}

// Pure opcode execution result
interface OpcodeResult {
  readonly newCpuState: SM83State;
  readonly memoryOperations: MemoryOperation[];
  readonly cyclesConsumed: number;
  readonly interruptRequests: InterruptRequest[];
}

// Memory operations from opcode execution
interface MemoryOperation {
  readonly type: 'read' | 'write';
  readonly address: number;
  readonly value?: number; // undefined for reads
}

// Interrupt requests from opcode execution
interface InterruptRequest {
  readonly vector: InterruptVector;
  readonly enable: boolean;
}
```

### Component State Definitions

```typescript
// CPU state (immutable snapshots)
interface SM83State {
  readonly registers: RegisterState;
  readonly flags: FlagState;
  readonly pc: number;
  readonly sp: number;
  readonly ime: boolean; // Interrupt Master Enable
  readonly halted: boolean;
  readonly stopped: boolean;
}

interface RegisterState {
  readonly A: number;
  readonly B: number;
  readonly C: number;
  readonly D: number;
  readonly E: number;
  readonly F: number;
  readonly H: number;
  readonly L: number;
}

interface FlagState {
  readonly Z: boolean; // Zero
  readonly N: boolean; // Subtract
  readonly H: boolean; // Half-carry
  readonly C: boolean; // Carry
}

// Memory state (bank switching and special regions)
interface MemoryState {
  readonly romBank: number;
  readonly ramBank: number;
  readonly ramEnabled: boolean;
  readonly memory: Uint8Array; // Current memory mapping
  readonly cartridgeType: number;
}

// PPU state for graphics rendering
interface PPUState {
  readonly lcdc: number;  // LCD Control
  readonly stat: number;  // LCD Status
  readonly scy: number;   // Scroll Y
  readonly scx: number;   // Scroll X
  readonly ly: number;    // LCD Y
  readonly lyc: number;   // LCD Y Compare
  readonly wy: number;    // Window Y
  readonly wx: number;    // Window X
  readonly bgp: number;   // Background Palette
  readonly obp0: number;  // Object Palette 0
  readonly obp1: number;  // Object Palette 1
  readonly mode: PPUMode;
  readonly modeCycles: number;
  readonly vram: Uint8Array;
  readonly oam: Uint8Array;
}

enum PPUMode {
  HBlank = 0,
  VBlank = 1, 
  OAMScan = 2,
  Drawing = 3
}
```

### Opcode Execution Interface

```typescript
// Pure opcode function signature
interface OpcodeFunction {
  (state: SM83State, mmu: MMUInterface): OpcodeResult;
}

// MMU interface for opcode execution
interface MMUInterface {
  read(address: number): number;
  write(address: number, value: number): void;
  readWord(address: number): number;
  writeWord(address: number, value: number): void;
}

// Opcode dispatch table
interface OpcodeExecutor {
  readonly opcodes: OpcodeFunction[]; // 256 standard opcodes
  readonly cbOpcodes: OpcodeFunction[]; // 256 CB-prefixed opcodes
  execute(opcode: number, state: SM83State, mmu: MMUInterface): OpcodeResult;
  executeCB(opcode: number, state: SM83State, mmu: MMUInterface): OpcodeResult;
}
```

### State Management Interfaces

```typescript
// Rewind functionality
interface StateManager {
  captureState(): EmulatorState;
  restoreState(state: EmulatorState): void;
  canRewind(): boolean;
  rewind(frames?: number): EmulatorState | null;
  getRewindBuffer(): EmulatorState[];
  clearRewindBuffer(): void;
}

// Ring buffer for efficient rewind
interface RewindBuffer {
  readonly capacity: number;
  readonly size: number;
  push(state: EmulatorState): void;
  get(framesBack: number): EmulatorState | null;
  clear(): void;
}

// Component synchronization
interface TimingController {
  readonly masterCycle: number;
  step(cycles: number): ComponentUpdates;
  sync(): void;
}

interface ComponentUpdates {
  readonly ppuUpdates: PPUUpdate[];
  readonly apuUpdates: APUUpdate[];
  readonly timerUpdates: TimerUpdate[];
  readonly interruptRequests: InterruptRequest[];
}
```

## Execution Loop Pseudocode

### Main Emulator Loop

```typescript
class EmulatorCore {
  private state: EmulatorState;
  private stateManager: StateManager;
  private timingController: TimingController;
  private opcodeExecutor: OpcodeExecutor;
  private mmu: MMU;

  // Main execution loop
  step(): void {
    // Capture state for rewind (every frame or on demand)
    if (this.shouldCaptureState()) {
      this.stateManager.captureState();
    }

    // Execute single CPU instruction
    const opcodeResult = this.executeCPUInstruction();
    
    // Apply CPU state changes
    this.state = {
      ...this.state,
      cpu: opcodeResult.newCpuState,
      cycles: this.state.cycles + opcodeResult.cyclesConsumed
    };

    // Apply memory operations to MMU
    this.applyMemoryOperations(opcodeResult.memoryOperations);

    // Process interrupt requests
    this.processInterrupts(opcodeResult.interruptRequests);

    // Synchronize other components with timing
    const updates = this.timingController.step(opcodeResult.cyclesConsumed);
    this.applyComponentUpdates(updates);
  }

  private executeCPUInstruction(): OpcodeResult {
    // Handle halted/stopped states
    if (this.state.cpu.halted || this.state.cpu.stopped) {
      return this.executeHaltedState();
    }

    // Handle interrupts if enabled
    if (this.state.cpu.ime) {
      const interrupt = this.checkPendingInterrupts();
      if (interrupt) {
        return this.executeInterrupt(interrupt);
      }
    }

    // Fetch and execute normal instruction
    const opcode = this.mmu.read(this.state.cpu.pc);
    
    if (opcode === 0xCB) {
      // CB-prefixed instruction
      const cbOpcode = this.mmu.read(this.state.cpu.pc + 1);
      return this.opcodeExecutor.executeCB(cbOpcode, this.state.cpu, this.mmu);
    } else {
      // Standard instruction
      return this.opcodeExecutor.execute(opcode, this.state.cpu, this.mmu);
    }
  }

  private applyMemoryOperations(operations: MemoryOperation[]): void {
    operations.forEach(op => {
      if (op.type === 'write' && op.value !== undefined) {
        this.mmu.write(op.address, op.value);
      }
      // Reads already completed during opcode execution
    });
  }

  private applyComponentUpdates(updates: ComponentUpdates): void {
    // Update PPU state
    this.state = {
      ...this.state,
      ppu: this.updatePPU(this.state.ppu, updates.ppuUpdates)
    };

    // Update APU state  
    this.state = {
      ...this.state,
      apu: this.updateAPU(this.state.apu, updates.apuUpdates)
    };

    // Process timer updates
    this.state = {
      ...this.state,
      timers: this.updateTimers(this.state.timers, updates.timerUpdates)
    };

    // Handle new interrupt requests
    this.processInterrupts(updates.interruptRequests);
  }
}
```

### Immutable Opcode Execution

```typescript
// Example: ADD A,B instruction
const ADD_A_B: OpcodeFunction = (state: SM83State, mmu: MMUInterface): OpcodeResult => {
  const result = state.registers.A + state.registers.B;
  
  const newFlags: FlagState = {
    Z: (result & 0xFF) === 0,
    N: false, // ADD clears N flag
    H: ((state.registers.A & 0xF) + (state.registers.B & 0xF)) > 0xF,
    C: result > 0xFF
  };

  const newRegisters: RegisterState = {
    ...state.registers,
    A: result & 0xFF,
    F: flagsToF(newFlags)
  };

  const newState: SM83State = {
    ...state,
    registers: newRegisters,
    flags: newFlags,
    pc: (state.pc + 1) & 0xFFFF // Increment PC
  };

  return {
    newCpuState: newState,
    memoryOperations: [], // No memory access for this instruction
    cyclesConsumed: 4,
    interruptRequests: []
  };
};

// Example: LD (HL),A instruction  
const LD_HL_A: OpcodeFunction = (state: SM83State, mmu: MMUInterface): OpcodeResult => {
  const hlAddress = (state.registers.H << 8) | state.registers.L;
  
  const memoryOperations: MemoryOperation[] = [{
    type: 'write',
    address: hlAddress,
    value: state.registers.A
  }];

  const newState: SM83State = {
    ...state,
    pc: (state.pc + 1) & 0xFFFF
  };

  return {
    newCpuState: newState,
    memoryOperations,
    cyclesConsumed: 8,
    interruptRequests: []
  };
};
```

### MMU Implementation

```typescript
class MMU implements MMUInterface {
  private memory: MemoryState;
  private cartridge: Cartridge;
  private ppuRegisters: PPURegisters;
  private inputController: InputController;

  read(address: number): number {
    // Memory region dispatch
    if (address < 0x8000) {
      // ROM area - handle banking
      return this.cartridge.readROM(address, this.memory.romBank);
    } else if (address < 0xA000) {
      // VRAM area
      return this.ppuRegisters.readVRAM(address - 0x8000);
    } else if (address < 0xC000) {
      // External RAM - handle banking
      return this.cartridge.readRAM(address - 0xA000, this.memory.ramBank);
    } else if (address < 0xE000) {
      // Work RAM
      return this.memory.memory[address];
    } else if (address < 0xFE00) {
      // Echo of work RAM
      return this.memory.memory[address - 0x2000];
    } else if (address < 0xFEA0) {
      // OAM (Object Attribute Memory)
      return this.ppuRegisters.readOAM(address - 0xFE00);
    } else if (address < 0xFF00) {
      // Prohibited area
      return 0xFF;
    } else if (address < 0xFF80) {
      // Memory-mapped I/O
      return this.readIO(address);
    } else if (address < 0xFFFF) {
      // High RAM (HRAM)
      return this.memory.memory[address];
    } else {
      // Interrupt Enable register
      return this.memory.memory[0xFFFF];
    }
  }

  write(address: number, value: number): void {
    value = value & 0xFF; // Ensure 8-bit value

    if (address < 0x8000) {
      // ROM area - handle banking control
      this.cartridge.writeControl(address, value);
      this.updateBankingState();
    } else if (address < 0xA000) {
      // VRAM area
      this.ppuRegisters.writeVRAM(address - 0x8000, value);
    } else if (address < 0xC000) {
      // External RAM
      if (this.memory.ramEnabled) {
        this.cartridge.writeRAM(address - 0xA000, value, this.memory.ramBank);
      }
    } else if (address < 0xE000) {
      // Work RAM
      this.memory.memory[address] = value;
    } else if (address < 0xFE00) {
      // Echo of work RAM
      this.memory.memory[address - 0x2000] = value;
    } else if (address < 0xFEA0) {
      // OAM
      this.ppuRegisters.writeOAM(address - 0xFE00, value);
    } else if (address < 0xFF00) {
      // Prohibited area - ignored
      return;
    } else if (address < 0xFF80) {
      // Memory-mapped I/O
      this.writeIO(address, value);
    } else if (address < 0xFFFF) {
      // High RAM
      this.memory.memory[address] = value;
    } else {
      // Interrupt Enable register
      this.memory.memory[0xFFFF] = value;
    }
  }

  readWord(address: number): number {
    const low = this.read(address);
    const high = this.read((address + 1) & 0xFFFF);
    return (high << 8) | low;
  }

  writeWord(address: number, value: number): void {
    this.write(address, value & 0xFF);
    this.write((address + 1) & 0xFFFF, (value >> 8) & 0xFF);
  }
}
```

### State Management Implementation

```typescript
class StateManager {
  private rewindBuffer: RewindBuffer;
  private currentState: EmulatorState;

  constructor(bufferSize: number = 3600) { // 60 seconds at 60fps
    this.rewindBuffer = new RingRewindBuffer(bufferSize);
  }

  captureState(): EmulatorState {
    // Deep copy current state for immutable snapshot
    const snapshot: EmulatorState = {
      cpu: { ...this.currentState.cpu },
      memory: { 
        ...this.currentState.memory,
        memory: new Uint8Array(this.currentState.memory.memory)
      },
      ppu: {
        ...this.currentState.ppu,
        vram: new Uint8Array(this.currentState.ppu.vram),
        oam: new Uint8Array(this.currentState.ppu.oam)
      },
      apu: { ...this.currentState.apu },
      interrupts: { ...this.currentState.interrupts },
      timers: { ...this.currentState.timers },
      cycles: this.currentState.cycles
    };

    this.rewindBuffer.push(snapshot);
    return snapshot;
  }

  rewind(frames: number = 1): EmulatorState | null {
    const targetState = this.rewindBuffer.get(frames);
    if (targetState) {
      this.currentState = targetState;
      return targetState;
    }
    return null;
  }

  canRewind(): boolean {
    return this.rewindBuffer.size > 0;
  }
}

class RingRewindBuffer implements RewindBuffer {
  private buffer: EmulatorState[];
  private head: number = 0;
  private count: number = 0;

  constructor(public readonly capacity: number) {
    this.buffer = new Array(capacity);
  }

  get size(): number {
    return this.count;
  }

  push(state: EmulatorState): void {
    this.buffer[this.head] = state;
    this.head = (this.head + 1) % this.capacity;
    
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  get(framesBack: number): EmulatorState | null {
    if (framesBack <= 0 || framesBack > this.count) {
      return null;
    }

    const index = (this.head - framesBack + this.capacity) % this.capacity;
    return this.buffer[index];
  }

  clear(): void {
    this.count = 0;
    this.head = 0;
  }
}
```

### Component Synchronization

```typescript
class TimingController {
  private _masterCycle: number = 0;
  private ppuCycles: number = 0;
  private apuCycles: number = 0;
  private timerCycles: number = 0;

  get masterCycle(): number {
    return this._masterCycle;
  }

  step(cycles: number): ComponentUpdates {
    this._masterCycle += cycles;
    
    const updates: ComponentUpdates = {
      ppuUpdates: [],
      apuUpdates: [],
      timerUpdates: [],
      interruptRequests: []
    };

    // Update PPU (runs at CPU speed)
    this.ppuCycles += cycles;
    while (this.ppuCycles >= 4) { // PPU processes every 4 CPU cycles
      updates.ppuUpdates.push(this.stepPPU());
      this.ppuCycles -= 4;
    }

    // Update APU (runs at CPU speed / 2)
    this.apuCycles += cycles;
    while (this.apuCycles >= 8) { // APU processes every 8 CPU cycles
      updates.apuUpdates.push(this.stepAPU());
      this.apuCycles -= 8;
    }

    // Update Timers (DIV increments every 256 CPU cycles)
    this.timerCycles += cycles;
    while (this.timerCycles >= 256) {
      updates.timerUpdates.push(this.stepTimer());
      this.timerCycles -= 256;
    }

    return updates;
  }

  private stepPPU(): PPUUpdate {
    // PPU state machine logic
    // Returns mode changes, line increments, interrupts
    return {
      newMode: PPUMode.Drawing,
      lyIncrement: false,
      statInterrupt: false,
      vblankInterrupt: false
    };
  }

  private stepAPU(): APUUpdate {
    // APU channel processing
    return {
      channel1Update: true,
      channel2Update: true,
      channel3Update: false,
      channel4Update: false
    };
  }

  private stepTimer(): TimerUpdate {
    // Timer increment and overflow checking
    return {
      divIncrement: true,
      timaIncrement: false,
      timaOverflow: false
    };
  }
}
```

## State Flow Architecture

### Data Flow Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Opcode        │───▶│  OpcodeResult    │───▶│  State Update   │
│  (Pure Func)    │    │  (Immutable)     │    │  (Controlled)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  MMU Interface  │    │ Memory Ops List  │    │ Component Sync  │
│  (Read/Write)   │    │  (Deferred)      │    │ (Timing Ctrl)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Current Memory  │    │  Applied to MMU  │    │ Updated State   │
│    State        │    │   After Exec     │    │   + History     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Execution Sequence

1. **Opcode Fetch**: CPU reads instruction from MMU
2. **Pure Execution**: Opcode function computes result immutably  
3. **Memory Operations**: Deferred writes applied to MMU
4. **State Transition**: New CPU state replaces current state
5. **Component Sync**: Other components updated via timing controller
6. **State Capture**: Complete state snapshot for rewind (periodically)

### Rewind Flow

1. **State Request**: User requests rewind to N frames back
2. **Buffer Lookup**: StateManager finds snapshot in ring buffer
3. **State Restoration**: All components updated to historical state
4. **Memory Restoration**: MMU restored to historical memory state
5. **Component Sync**: All components synchronized to historical timing
6. **Execution Resume**: Normal execution continues from restored state

## Performance Considerations

### Memory Usage
- **Ring Buffer**: ~60MB for 60 seconds at 60fps (1MB per frame estimate)
- **State Snapshots**: Optimized copying using TypedArrays
- **Memory Operations**: Batched for efficiency

### CPU Performance
- **Opcode Dispatch**: Function array lookup O(1)
- **State Updates**: Immutable updates with structural sharing
- **Component Sync**: Cycle-accurate but optimized timing

### Optimization Strategies
1. **Copy-on-Write**: Share unchanged state between snapshots
2. **Differential Snapshots**: Store only changed state regions
3. **Adaptive Capture**: Capture snapshots only during significant changes
4. **Memory Pooling**: Reuse snapshot objects when possible

## Testing Strategy

### Unit Testing
- **Opcodes**: Test each instruction as pure function
- **State Manager**: Test rewind functionality with known states
- **MMU**: Test memory mapping and banking logic
- **Components**: Test each component in isolation

### Integration Testing  
- **Execution Loop**: Test complete step() cycle
- **Component Sync**: Test timing controller coordination
- **State Consistency**: Test state transitions and snapshots

### Hardware Validation
- **Blargg Tests**: CPU instruction accuracy
- **Mealybug Tests**: Hardware behavior validation
- **Game ROMs**: Real-world compatibility testing

## Implementation Phases

### Phase 1: Core Architecture (Week 1)
- Implement basic interfaces and state structures
- Create opcode execution framework with MMU interface
- Build simple state manager with basic rewind

### Phase 2: CPU Implementation (Week 2-3)
- Implement all SM83 opcodes as pure functions
- Add comprehensive CPU state management
- Integrate with MMU for memory operations

### Phase 3: Component Integration (Week 4)
- Implement PPU, APU, timer synchronization
- Add timing controller for component coordination
- Test complete execution loop with simple ROMs

### Phase 4: Optimization and Polish (Week 5-6)
- Optimize rewind buffer and state capture
- Performance profiling and hot path optimization
- Final hardware validation and compatibility testing

## Conclusion

This architecture successfully bridges GameBoy Online's performance-oriented design with modern immutable principles. The key innovations are:

1. **Pure Opcode Functions**: Enable testability while maintaining performance
2. **Controlled State Mutation**: Mutable containers with immutable snapshots
3. **Interface-Based MMU**: Clean abstraction without performance penalty
4. **Ring Buffer Rewind**: Efficient O(1) access to historical states
5. **Cycle-Accurate Timing**: Hardware-precise component synchronization

The design supports both hardware accuracy and modern development practices, providing a solid foundation for the complete Game Boy emulator implementation.

---

## Tech Lead Early Feedback

**Date**: 2025-08-02  
**Reviewer**: Tech Lead Enforcer  
**Status**: CONDITIONAL APPROVAL - Address Critical Issues  

### Engineering Standards Assessment: PASSED WITH CONCERNS

✅ **Pipeline Status**: All validation passes  
✅ **Architecture Quality**: Clean separation of concerns  
⚠️ **Implementation Feasibility**: Significant complexity risks identified  
⚠️ **Performance Considerations**: Memory usage and GC pressure concerns  
⚠️ **Testing Strategy**: TDD workflow unclear for complex state transitions  

### Critical Issues Requiring Resolution

#### 1. IMMUTABLE STATE PERFORMANCE PENALTY (HIGH PRIORITY)

**Issue**: Constant object spreading for state updates will cause severe GC pressure
```typescript
// This pattern repeated 60 times per second will kill performance
this.state = {
  ...this.state,
  cpu: opcodeResult.newCpuState,
  cycles: this.state.cycles + opcodeResult.cyclesConsumed
};
```

**Resolution Required**:
- Implement structural sharing or copy-on-write optimization
- Profile memory allocation patterns under load
- Consider mutable state with immutable snapshots only for rewind
- Benchmark against GameBoy Online's mutable approach

#### 2. MEMORY OPERATION DEFERRED EXECUTION (CRITICAL)

**Issue**: Deferred memory operations break hardware timing accuracy
```typescript
// Memory writes must be immediate for accurate emulation
private applyMemoryOperations(operations: MemoryOperation[]): void {
  operations.forEach(op => {
    if (op.type === 'write' && op.value !== undefined) {
      this.mmu.write(op.address, value); // Too late - breaks timing
    }
  });
}
```

**Resolution Required**:
- Memory operations must execute during opcode function execution
- MMU interface needs immediate write capability
- Reconsider pure function approach for memory-affecting instructions

#### 3. STATE SNAPSHOT DEEP COPY COST (HIGH PRIORITY)

**Issue**: 60MB/second state copying will destroy performance
```typescript
// This deep copy every frame is unacceptable
memory: { 
  ...this.currentState.memory,
  memory: new Uint8Array(this.currentState.memory.memory) // 64KB copy
},
vram: new Uint8Array(this.currentState.ppu.vram), // 8KB copy
oam: new Uint8Array(this.currentState.ppu.oam)    // 160B copy
```

**Resolution Required**:
- Implement copy-on-write for memory regions
- Differential snapshots tracking only changed regions
- Consider frame-based vs instruction-based capture frequency

#### 4. TDD WORKFLOW UNCLEAR (BLOCKING)

**Issue**: Complex state transitions don't map to red-green-refactor cycle

**Resolution Required**:
- Define atomic test boundaries for opcode functions
- Specify MMU interface mocking strategy
- Document test-first approach for component synchronization
- Example TDD workflow for multi-component state updates

### Architecture Quality: STRONG WITH RESERVATIONS

✅ **Encapsulation**: Clean component boundaries  
✅ **Composition**: Well-defined interfaces  
✅ **Separation of Concerns**: MMU abstraction is excellent  
⚠️ **Hardware Accuracy**: Timing concerns with deferred operations  

### Implementation Feasibility: MODERATE RISK

**Concerns**:
1. Performance characteristics unknown - needs benchmarking
2. State management complexity may require significant optimization
3. Testing strategy needs concrete examples
4. Memory usage projection (60MB/sec) needs validation

**Mitigations Required**:
- Create performance prototype before full implementation
- Establish memory usage benchmarks
- Define fallback to mutable-state approach if performance fails

### Testing Strategy: NEEDS CONCRETE EXAMPLES

**Requirements**:
- Show TDD workflow for sample opcode implementation
- Define MMU interface testing approach
- Specify component synchronization test boundaries
- Document test-first approach for rewind functionality

### Performance Validation Requirements

Before implementation proceeds, MUST demonstrate:

1. **Memory Benchmark**: State snapshot cost under 1ms per frame
2. **GC Pressure Test**: Sustained 60fps with immutable updates
3. **MMU Interface Cost**: Memory operation overhead measurement
4. **Rewind Buffer Efficiency**: O(1) access validation with real data

### ESCALATION NOTICE

The following design decisions require **HUMAN APPROVAL** before implementation:

1. **Immutable vs Mutable State Trade-off**: Performance vs maintainability
2. **Memory Operation Timing**: Immediate vs deferred execution
3. **Snapshot Frequency**: Frame-based vs adaptive capture
4. **Fallback Strategy**: If performance targets cannot be met

### Conditional Approval Requirements

Implementation may proceed to Phase 1 ONLY after:

1. **Performance Prototype**: Basic opcode execution benchmark
2. **TDD Example**: Complete red-green-refactor workflow for one opcode
3. **Memory Usage Validation**: Snapshot cost measurement
4. **Human Approval**: For performance trade-off decisions

### Recommendations

1. **Start with Hybrid Approach**: Mutable state + immutable snapshots
2. **Benchmark Early**: Performance validation before complex features
3. **Incremental Complexity**: Prove each optimization before adding next
4. **Document Fallbacks**: Clear path if performance fails

**Final Assessment**: Architecture is sound but implementation risks are HIGH. Performance validation and TDD workflow clarification are MANDATORY before proceeding to implementation.

---

---

## Architecture Reviewer Assessment

**Date**: 2025-08-02  
**Reviewer**: Architecture Reviewer  
**Status**: ARCHITECTURE REJECTED - CRITICAL VIOLATIONS IDENTIFIED  

### Architectural Compliance Analysis

#### 1. Component Boundaries: FAILED ENCAPSULATION PRINCIPLES

**VIOLATION**: MMU Interface Exposes Implementation Details
```typescript
interface MMUInterface {
  read(address: number): number;
  write(address: number, value: number): void;
  readWord(address: number): number;
  writeWord(address: number, value: number): void;
}
```

**Issue**: The MMU interface forces opcodes to know about memory timing and side effects. This breaks encapsulation by requiring opcode functions to understand memory implementation details.

**Resolution Required**:
- Opcodes must observe memory effects through a bounded interface
- Memory timing must be handled internal to MMU, not exposed to CPU
- Consider Command pattern for memory operations with internal timing control

**VIOLATION**: Deferred Memory Operations Break Hardware Contract
```typescript
interface OpcodeResult {
  readonly memoryOperations: MemoryOperation[];
}
```

**Issue**: Memory operations as return values violate the principle that components should not expose their internal coordination mechanisms. This approach makes memory timing an implementation detail that opcodes must manage.

**Resolution Required**:
- Memory operations must complete during opcode execution
- MMU must handle timing internally without exposing coordination complexity
- Opcodes should remain pure functions that observe memory state, not manage it

#### 2. Encapsulation: MAJOR VIOLATIONS IDENTIFIED

**VIOLATION**: State Snapshots Expose Internal Component Structure
```typescript
interface EmulatorState {
  readonly cpu: SM83State;
  readonly memory: MemoryState;
  readonly ppu: PPUState;
  // ... exposing all internal states
}
```

**Issue**: The StateManager requires deep knowledge of every component's internal structure, violating encapsulation. Components cannot evolve their internal state without breaking StateManager.

**Resolution Required**:
- Components must provide their own snapshot/restore interfaces
- StateManager should coordinate component snapshots, not access internal state
- Use Strategy pattern for component-specific state management

**VIOLATION**: Ring Buffer Directly Accesses Component Internals
```typescript
memory: { 
  ...this.currentState.memory,
  memory: new Uint8Array(this.currentState.memory.memory)
}
```

**Issue**: StateManager performs deep copies of component internals, creating tight coupling and exposing implementation details.

**Resolution Required**:
- Each component must implement Snapshotable interface
- StateManager coordinates snapshots without accessing internals
- Components control their own state serialization

#### 3. Design Patterns: INCORRECT APPLICATION

**VIOLATION**: Strategy Pattern Misapplied for Opcodes
```typescript
interface OpcodeFunction {
  (state: SM83State, mmu: MMUInterface): OpcodeResult;
}
```

**Issue**: Using function signatures instead of proper Strategy pattern objects. This makes opcode behavior harder to test and extend.

**Resolution Required**:
```typescript
interface Opcode {
  execute(context: ExecutionContext): void;
  getCycles(): number;
  getDescription(): string;
}
```

**VIOLATION**: Observer Pattern Missing for Component Coordination
The current design lacks proper Observer pattern for component synchronization. TimingController directly manages all component updates, creating tight coupling.

**Resolution Required**:
- Components should implement EventEmitter/Observer interfaces
- TimingController should coordinate events, not directly update components
- Use Mediator pattern for component communication

#### 4. System Integration: POOR COMPOSITION

**VIOLATION**: Tight Coupling Between Core Components
```typescript
class EmulatorCore {
  private state: EmulatorState;
  private stateManager: StateManager;
  private timingController: TimingController;
  // EmulatorCore knows about all components
}
```

**Issue**: EmulatorCore has direct dependencies on all system components, violating Dependency Inversion Principle.

**Resolution Required**:
- Use Dependency Injection for all component dependencies
- EmulatorCore should depend on abstractions, not concrete implementations
- Components should communicate through interfaces only

**VIOLATION**: State Management Violates Single Responsibility
StateManager handles both rewind functionality AND coordinating component state access. This violates SRP.

**Resolution Required**:
- Separate RewindManager from StateCoordinator
- StateCoordinator handles component state access
- RewindManager handles history and time travel
- Use Composite pattern for state management hierarchy

#### 5. Long-term Maintainability: ARCHITECTURAL DEBT

**CRITICAL ISSUE**: Performance Optimization Conflicts with Encapsulation
The proposed optimizations (copy-on-write, differential snapshots) will require breaking encapsulation to access component internals.

**Resolution Required**:
- Design must support optimization WITHOUT breaking encapsulation
- Components must provide efficient state access through proper interfaces
- Consider Flyweight pattern for memory-efficient state sharing

**CRITICAL ISSUE**: Testing Boundaries Undefined
Current design makes it unclear where test boundaries should be drawn, violating testability principle.

**Resolution Required**:
- Define clear test boundaries at component interfaces
- Ensure components can be tested in complete isolation
- Document test doubles strategy for component interfaces

### Required Architectural Changes

#### 1. Implement Proper Encapsulation

```typescript
// Component interface with proper encapsulation
interface Component {
  step(cycles: number): void;
  createSnapshot(): ComponentSnapshot;
  restoreSnapshot(snapshot: ComponentSnapshot): void;
  getPublicState(): ComponentPublicState;
}

// Clean MMU interface without timing exposure
interface MemoryController {
  executeWithMemory<T>(operation: MemoryOperation<T>): T;
}

interface MemoryOperation<T> {
  execute(memory: MemoryAccess): T;
}
```

#### 2. Apply Correct Design Patterns

```typescript
// Proper Strategy pattern for opcodes
interface InstructionStrategy {
  execute(context: ExecutionContext): ExecutionResult;
  getTimingInfo(): TimingInfo;
}

// Observer pattern for component coordination
interface ComponentObserver {
  onCycleComplete(cycles: number): void;
  onInterruptRequested(interrupt: InterruptType): void;
}

// Mediator for component communication
interface SystemMediator {
  coordinateComponents(event: SystemEvent): void;
  registerComponent(component: Component): void;
}
```

#### 3. Fix Composition Issues

```typescript
// Proper dependency injection structure
interface EmulatorServices {
  readonly memoryController: MemoryController;
  readonly instructionDecoder: InstructionDecoder;
  readonly systemMediator: SystemMediator;
  readonly rewindManager: RewindManager;
}

class EmulatorCore {
  constructor(private services: EmulatorServices) {}
  
  step(): void {
    // Core depends only on abstractions
  }
}
```

### Performance vs Architecture Resolution

**MANDATE**: Performance optimizations MUST NOT break encapsulation

**Required Approach**:
1. Components provide efficient state access through designed interfaces
2. Use Proxy pattern for lazy copying where needed
3. Implement Flyweight pattern for shared immutable data
4. Performance must be achieved through proper design, not architectural shortcuts

### Testing Architecture Requirements

**MANDATE**: All components MUST be testable in isolation

**Required Boundaries**:
1. Opcode strategies tested with mock ExecutionContext
2. Components tested with mock dependencies only
3. Integration tests at SystemMediator boundary only
4. StateManager tested with mock Component implementations

### Final Architectural Verdict

**ARCHITECTURE REJECTED**

The proposed design violates fundamental encapsulation principles and misapplies design patterns. While the goals are sound, the implementation approach creates architectural debt that will become unmaintainable.

### Required Changes Before Resubmission

1. **Implement proper Component encapsulation** with Snapshotable interfaces
2. **Apply Strategy pattern correctly** for opcode implementations  
3. **Use Observer/Mediator patterns** for component coordination
4. **Remove StateManager's direct access** to component internals
5. **Design performance optimizations** that maintain encapsulation
6. **Define clear testing boundaries** at component interfaces
7. **Implement Dependency Injection** for all component relationships

### Recommendation

Start with a simpler, properly encapsulated design that can be optimized later. Architectural purity enables performance optimization - never sacrifice architecture for premature optimization.

**Resubmit after addressing ALL encapsulation violations and design pattern misapplications.**

---

## Tech Lead Final Signoff

**Date**: 2025-08-02  
**Authority**: Tech Lead Enforcer  
**Decision**: ARCHITECTURE BLOCKED - FUNDAMENTAL REDESIGN REQUIRED  

### FINAL STATUS: REJECTED

After comprehensive review of both my early engineering feedback and the Architecture Reviewer's detailed assessment, this design contains **CRITICAL VIOLATIONS** that make it unsuitable for implementation under our engineering standards.

### BLOCKING ISSUES (MUST FIX ALL)

#### 1. ENCAPSULATION VIOLATIONS (CRITICAL - BLOCKING)

**VIOLATION**: MMU Interface Breaks Component Boundaries
- Opcodes directly access memory implementation details
- Components expose internal state structure to StateManager
- Memory timing coordination leaked into CPU logic

**IMPACT**: Creates tight coupling that prevents component evolution and violates fundamental OOP principles.

**MANDATE**: Components MUST encapsulate internal state and coordinate through bounded interfaces only.

#### 2. PERFORMANCE ARCHITECTURE CONFLICT (CRITICAL - BLOCKING) 

**VIOLATION**: Immutable State Updates Create Severe GC Pressure
- 60fps object spreading will cause frame drops
- Deep copying 64KB+ memory every snapshot is unacceptable
- No structural sharing or copy-on-write optimization

**IMPACT**: Design cannot meet 60fps performance requirement.

**MANDATE**: Performance optimizations MUST be designed into architecture, not bolted on later.

#### 3. HARDWARE TIMING ACCURACY BROKEN (CRITICAL - BLOCKING)

**VIOLATION**: Deferred Memory Operations Break Hardware Contract
- Memory writes delayed until after opcode execution
- Breaks cycle-accurate timing required for Game Boy emulation
- Side effects not observable at correct component boundaries

**IMPACT**: Emulator will fail hardware accuracy tests (Blargg, Mealybug).

**MANDATE**: Memory operations must execute during instruction timing, not deferred.

#### 4. TDD WORKFLOW UNDEFINED (BLOCKING)

**VIOLATION**: No Clear Test Boundaries
- Complex state transitions don't map to red-green-refactor
- MMU interface mocking strategy undefined
- Component integration testing approach unclear

**IMPACT**: Cannot implement using TDD methodology.

**MANDATE**: All components MUST be testable in isolation with clear test boundaries.

### REQUIRED ARCHITECTURAL CHANGES

#### IMMEDIATE REQUIREMENTS (NO EXCEPTIONS)

1. **Implement Proper Component Encapsulation**
   ```typescript
   interface Component {
     step(cycles: number): void;
     createSnapshot(): ComponentSnapshot;
     restoreSnapshot(snapshot: ComponentSnapshot): void;
   }
   ```

2. **Design Performance-Compatible Architecture**
   - Use mutable state containers with immutable snapshots ONLY for rewind
   - Implement copy-on-write at component level, not system level
   - Structural sharing for unchanged state regions

3. **Fix Memory Operation Timing**
   ```typescript
   interface MemoryController {
     executeWithMemory<T>(operation: MemoryOperation<T>): T;
   }
   ```

4. **Define Clear Testing Strategy**
   - Each component testable in complete isolation
   - Mock strategies for all dependencies
   - TDD workflow examples for opcode implementation

#### DESIGN PATTERN CORRECTIONS (MANDATORY)

1. **Strategy Pattern**: Proper opcode objects, not function signatures
2. **Observer Pattern**: Component coordination through events
3. **Mediator Pattern**: System coordination without tight coupling
4. **Dependency Injection**: All component relationships through interfaces

### HUMAN ESCALATION REQUIRED

The following decisions require **IMMEDIATE HUMAN APPROVAL**:

1. **Performance vs Architectural Purity Trade-off**: How much performance optimization versus clean architecture?
2. **Timing Accuracy vs Immutability**: Immediate memory operations versus pure functions?
3. **Implementation Timeline**: Complex architecture versus delivery schedule?
4. **Fallback Strategy**: If proper architecture cannot meet performance targets?

### ESCALATION RECOMMENDATION

**TECHNICAL POSITION**: The current design attempts to bridge immutable principles with performance requirements but fails on both fronts. Either:

1. **Pure Immutable Approach**: Accept performance penalty, optimize through structural sharing
2. **Hybrid Approach**: Mutable state + immutable snapshots only for rewind
3. **Performance-First**: Follow GameBoy Online pattern with cleaner encapsulation

**RISK ASSESSMENT**: HIGH - Current design will fail both performance and maintainability requirements.

**RECOMMENDATION**: Start with Hybrid Approach (#2) - achieves both performance and rewind functionality while maintaining reasonable architectural quality.

### IMPLEMENTATION BLOCKED UNTIL

1. **Architecture Redesign**: Address ALL encapsulation violations
2. **Performance Prototype**: Demonstrate 60fps capability with proposed architecture
3. **TDD Workflow**: Complete red-green-refactor example for sample opcode
4. **Human Decision**: Performance vs architecture trade-off approval

### CONDITIONAL PATHS FORWARD

**Path 1 - Pure Architecture (Recommended for Human Review)**
- Fix all encapsulation violations
- Implement proper design patterns
- Benchmark performance with structural sharing
- May require fallback if performance fails

**Path 2 - Pragmatic Hybrid (Alternative)**
- Mutable state containers with clean interfaces
- Immutable snapshots only for rewind
- Immediate memory operations for timing accuracy
- Easier to achieve performance targets

**Path 3 - GameBoy Online Pattern (Fallback)**
- Mutable design with cleaner encapsulation
- No rewind functionality initially
- Focus on hardware accuracy first
- Add rewind as separate feature layer

### FINAL MANDATE

**NO IMPLEMENTATION SHALL PROCEED** until:

1. Human approval on performance vs architecture trade-off
2. Complete architectural redesign addressing all violations
3. TDD workflow demonstration with concrete examples
4. Performance validation showing 60fps capability

This design represents significant engineering investment. We must get the foundation correct before proceeding.

**Status**: BLOCKED - Escalated to Human Authority for Direction

---

**References**:
- GameBoy Online implementation analysis
- SM83 CPU specifications and opcodes.json
- Mealybug and Blargg hardware test ROMs
- Pan Docs and gbdev.gg8.se documentation