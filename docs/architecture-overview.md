# Karimono-v2 Game Boy DMG Emulator - Master Architecture Overview

## Executive Summary

Karimono-v2 is a cycle-accurate Game Boy DMG emulator designed to achieve native hardware performance (4.194304 MHz) while maintaining comprehensive testability and architectural integrity. This document consolidates our complete research, specifications, architecture design, and testing strategy into a unified implementation guide.

## Project Philosophy

**"Hardware accuracy through architectural excellence"**

We prioritize cycle-accurate emulation validated by hardware test ROMs, achieved through clean component-based architecture that enables both native performance and comprehensive testing. Every architectural decision balances three core requirements:

1. **Hardware Accuracy**: Bit-perfect, cycle-accurate DMG emulation
2. **Native Performance**: 4.194304 MHz CPU, 59.7 FPS rendering, real-time operation
3. **Comprehensive Testability**: TDD workflow with boundary observation testing

## Architecture Decision Rationale

### Component-Based Design with Interface Boundaries

**Decision**: Discrete components (CPU, PPU, Memory, etc.) with clean TypeScript interfaces  
**Rationale**: Enables independent development, comprehensive testing, and easy debugging  
**Evidence**: Successful pattern in JSMoo and other production emulators  
**Implementation**: Dependency injection with interface contracts

### Hybrid Memory Access Strategy

**Decision**: Direct typed arrays for performance, abstracted interfaces for testing  
**Rationale**: Balances 4MHz performance requirements with comprehensive testability  
**Evidence**: GameBoy Online performance analysis shows typed arrays essential  
**Implementation**: Fast path for production, mockable interfaces for testing

### Cycle-Accurate Timing Coordination

**Decision**: Master clock with T-state precision coordinating all components  
**Rationale**: Essential for hardware compatibility and passing timing test ROMs  
**Evidence**: Blargg timing tests require exact cycle accuracy  
**Implementation**: SystemClock distributes timing to all components

### TDD with Boundary Observation

**Decision**: Test-driven development testing component boundaries, not implementation  
**Rationale**: Ensures hardware accuracy while maintaining refactoring freedom  
**Evidence**: Mealybug tests validate PPU behavior through pixel output  
**Implementation**: Mock components testing observable side effects

## System Architecture Overview

### Component Structure

```
GameBoySystem
├── CPU (SM83)              // 4.194304 MHz instruction execution
├── PPU (Picture Processor) // 160×144 @ 59.7 FPS rendering
├── MemoryController       // 64KB address space + banking
├── TimerSystem           // DIV/TIMA counters, interrupts
├── InputController       // Joypad input processing
├── CartridgeController   // ROM/RAM + MBC implementations
└── SystemClock          // Master timing coordination
```

### Communication Architecture

```typescript
// Central communication hub
interface SystemBus {
  read(address: u16): u8;
  write(address: u16, value: u8): void;
  requestInterrupt(type: InterruptType): void;
  getCurrentCycle(): u32;
}

// Master timing coordinator
interface SystemClock {
  step(cycles: u32): void;
  getCurrentCycle(): u32;
  getFrameProgress(): f32;
}

// Service layer for external interactions
interface EmulatorService {
  loadROM(romPath: string): Promise<void>;
  pressButton(button: GameBoyButton, frames?: number): void;
  captureScreen(): Promise<ImageData>;
  isROMLoaded(): boolean;
  reset(): void;
}
```

## Component Interaction Diagrams

### CPU-Memory-PPU Interaction Flow

```
CPU Instruction Fetch:
CPU → MemoryController.read(PC) → CartridgeController/RAM
  ↓
CPU executes instruction (1-4 M-cycles)
  ↓
SystemClock.step(cycles) notifies all components:
  ↓
PPU.step(cycles) → checks mode transitions
  ↓
If PPU blocking: MemoryController restricts CPU access
  ↓
Continue until frame complete (70224 cycles)
```

### Interrupt Processing Flow

```
Timer/PPU/Input generates interrupt:
Component → SystemBus.requestInterrupt(type)
  ↓
CPU checks interrupt enable flags
  ↓
If enabled: CPU.acknowledgeInterrupt() → 5 M-cycle processing
  ↓
SystemClock coordinates timing across all components
```

## Performance Targets and Benchmarks

### Core Performance Requirements

- **CPU Performance**: Exactly 4.194304 MHz (4,194,304 cycles/second)
- **Frame Rate**: Precisely 59.727500569606 FPS (16.742706298828 ms/frame)
- **Frame Cycles**: Exactly 70,224 cycles per frame
- **Memory Throughput**: 4.2M+ memory operations per second
- **Pixel Rendering**: 1,375,000 pixels per second (160×144×59.7)

### Performance Optimization Strategies

#### Memory Access Optimization

```typescript
// Hot path: Direct typed array access
const memory = new Uint8Array(0x10000);
const value = memory[address]; // Zero-copy read

// Testing path: Mockable interface
interface MemoryController {
  read(address: u16): u8;
  write(address: u16, value: u8): void;
}
```

#### Instruction Execution Optimization

```typescript
// Generated opcode dispatch table
const opcodeHandlers = new Array<() => u32>(256);
opcodeHandlers[0x00] = () => {
  /* NOP */ return 4;
};
opcodeHandlers[0x01] = () => {
  /* LD BC,nn */ return 12;
};

// Branchless flag operations where possible
const halfCarryLookup = new Uint8Array(512); // Pre-computed H flag
```

#### PPU Rendering Optimization

```typescript
// Direct pixel buffer writes
const frameBuffer = new Uint32Array(160 * 144);
frameBuffer[y * 160 + x] = pixelColor; // Direct write

// Sprite culling and scanline optimization
const visibleSprites = sprites.filter(
  s => s.x >= -7 && s.x < 160 && s.y >= scanline && s.y < scanline + 16
);
```

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Priority**: Core infrastructure for component development

1. **TypeScript Project Setup**
   - Configure strict TypeScript, ESLint, Prettier
   - Set up Jest testing framework with custom matchers
   - Establish GitHub Actions pipeline

2. **Interface Definitions**
   - Define all component interfaces from `/docs/architecture/component-interfaces.md`
   - Create comprehensive mock implementations
   - Establish testing patterns and utilities

3. **Memory System Foundation**
   - Basic 64KB address space implementation
   - I/O register framework ($FF00-$FFFF)
   - Memory access timing and restrictions

**Success Criteria**: Complete type-safe interfaces, comprehensive mocks, basic memory tests pass

### Phase 2: CPU Core (Weeks 3-4)

**Priority**: SM83 CPU with full instruction set

1. **CPU Architecture**
   - Register management (A, F, B, C, D, E, H, L, SP, PC)
   - Flag operations (Z, N, H, C) with exact hardware behavior
   - Stack operations and interrupt handling

2. **Instruction Implementation**
   - All 256 opcodes from `opcodes.json` specification
   - Exact cycle timing for each instruction
   - Generated dispatch table for optimal performance

3. **Blargg CPU Test Integration**
   - `cpu_instrs.gb` test ROM integration
   - Serial output capture and validation
   - Instruction timing test (`instr_timing.gb`) compatibility

**Success Criteria**: All Blargg CPU tests pass, 4MHz performance maintained

### Phase 3: Cartridge System (Weeks 5-6)

**Priority**: ROM loading and Memory Bank Controllers

1. **ROM Loading**
   - Cartridge header parsing and validation
   - Error handling for invalid ROM files
   - File I/O integration with browser and Node.js

2. **MBC Implementation**
   - MBC1: ROM/RAM banking for larger games
   - MBC2: Built-in RAM cartridges
   - MBC3: Real-time clock support
   - MBC5: Advanced banking for larger ROMs

3. **Save Data Management**
   - Battery-backed RAM persistence
   - Save state creation and restoration
   - Cross-platform save data handling

**Success Criteria**: Major games load correctly, save data persists, MBC switching works

### Phase 4: PPU and Display (Weeks 7-9)

**Priority**: Video output with Mealybug test compatibility

1. **PPU Mode Implementation**
   - Mode 0: H-Blank (204 cycles)
   - Mode 1: V-Blank (4560 cycles)
   - Mode 2: OAM Search (80 cycles)
   - Mode 3: Drawing (172-289 cycles)

2. **Rendering Pipeline**
   - Background tile rendering with scrolling
   - Window overlay rendering
   - Sprite rendering with priority and transparency
   - Palette application and pixel output

3. **Display Integration**
   - Frame buffer management
   - Canvas rendering for web browsers
   - Screenshot generation for testing
   - Real-time display synchronization

**Success Criteria**: Mealybug PPU tests pass pixel-perfect, 59.7 FPS maintained

### Phase 5: System Integration (Weeks 10-11)

**Priority**: Complete system with timing coordination

1. **Component Timing**
   - SystemClock coordination across all components
   - Interrupt timing and priority handling
   - Frame timing and synchronization

2. **Peripheral Systems**
   - Timer implementation (DIV, TIMA registers)
   - Input controller with joypad support
   - Serial communication for test ROM output

3. **System Testing**
   - Full system integration testing
   - Popular game compatibility validation
   - Performance optimization and profiling

**Success Criteria**: Complete games run correctly, all test ROMs pass, native performance

### Phase 6: Optimization and Polish (Weeks 12+)

**Priority**: Production readiness and advanced features

1. **Performance Optimization**
   - Profile and optimize hot paths
   - WebAssembly compilation exploration
   - Advanced caching and lookup tables

2. **Advanced Features**
   - Save state management
   - Debugging tools and visualization
   - Audio system integration (APU)

3. **Production Deployment**
   - Web application deployment
   - Documentation completion
   - User interface and controls

**Success Criteria**: Production-ready emulator with full feature set

## Testing Validation Plan

### Hardware Test ROM Strategy

#### Blargg Test Suite Validation

**Location**: `./tests/resources/blargg/`
**Purpose**: CPU instruction and timing accuracy validation

1. **CPU Instructions** (`cpu_instrs.gb`)
   - Tests all 256 CPU instructions
   - Validates flag behavior and edge cases
   - Serial output: "Passed" indicates success

2. **Instruction Timing** (`instr_timing.gb`)
   - Tests exact cycle timing for all instructions
   - Critical for game compatibility
   - Validates T-state accuracy

3. **Memory Timing** (`mem_timing.gb`)
   - Tests memory access timing
   - PPU memory restriction validation
   - DMA transfer timing

#### Mealybug Tearoom Test Suite

**Location**: `./tests/resources/mealybug/`
**Purpose**: PPU pixel-perfect accuracy validation

1. **PPU Behavior Tests**
   - LCDC register behavior during mode transitions
   - Sprite rendering with priority and transparency
   - Background and window rendering accuracy
   - Timing-sensitive PPU mode changes

2. **Visual Validation**
   - Pixel-perfect comparison with real hardware screenshots
   - Color palette accuracy
   - Scroll timing and window positioning

### Component Testing Strategy

#### CPU Testing

```typescript
describe('SM83 CPU', () => {
  test('executes NOP instruction in exactly 4 cycles', () => {
    const mockMemory = new MockMemoryController();
    const cpu = new CPU(mockMemory);

    const cycles = cpu.step(); // Execute NOP

    expect(cycles).toBe(4);
    expect(cpu.getProgramCounter()).toBe(0x0001);
  });

  test('ADD A,B sets half-carry flag correctly', () => {
    const cpu = new CPU(mockMemory);
    cpu.setRegisterA(0x0f);
    cpu.setRegisterB(0x01);

    cpu.executeOpcode(0x80); // ADD A,B

    expect(cpu.getFlags().halfCarry).toBe(true);
    expect(cpu.getRegisterA()).toBe(0x10);
  });
});
```

#### PPU Testing

```typescript
describe('PPU', () => {
  test('renders sprite at correct position', () => {
    const mockDisplay = new MockDisplay();
    const ppu = new PPU(mockDisplay);

    ppu.loadSprite({ x: 16, y: 24, tile: 0x01, palette: 0 });
    ppu.renderScanline(24);

    expect(mockDisplay.getPixelAt(16, 24)).toBe(PALETTE_COLORS[1]);
  });

  test('blocks CPU memory access during mode 3', () => {
    const ppu = new PPU();
    ppu.setMode(PPUMode.Drawing);

    const blocked = ppu.isCPUAccessBlocked(0x8000); // VRAM

    expect(blocked).toBe(true);
  });
});
```

#### Integration Testing

```typescript
describe('System Integration', () => {
  test('completes full frame in exactly 70224 cycles', () => {
    const system = new GameBoySystem();
    const startCycle = system.getCurrentCycle();

    system.runFrame();

    const endCycle = system.getCurrentCycle();
    expect(endCycle - startCycle).toBe(70224);
  });
});
```

### Screenshot Testing Implementation

```typescript
test('boot screen renders correctly', async () => {
  const emulator = new GameBoyEmulator();
  await emulator.boot();

  const screenshot = emulator.display.screenshot();
  expect(screenshot).toMatchSnapshot('boot-screen.png');
});
```

## Design Principles Summary

### Core Engineering Principles

1. **Test-Driven Development**
   - RED: Write failing test describing desired behavior
   - GREEN: Write minimal code to make test pass
   - REFACTOR: Improve code while keeping tests green
   - **Mandatory workflow** - no exceptions without documented approval

2. **Component Encapsulation**
   - Each component has single, well-defined responsibility
   - Internal implementation hidden behind clean interfaces
   - Dependencies injected through constructors
   - No direct coupling between components

3. **Boundary Observation Testing**
   - Test observable side effects at component boundaries
   - Never test internal implementation details
   - Use mock implementations for all dependencies
   - Focus on behavior, not structure

4. **Hardware Accuracy First**
   - Prioritize accuracy over performance optimizations
   - Validate against real hardware test ROMs
   - Implement documented edge cases and quirks
   - Cycle-accurate timing for all operations

5. **Performance with Testability**
   - Hot paths optimized for native performance
   - Testing interfaces don't compromise performance
   - Zero garbage collection in critical execution paths
   - Typed arrays for memory-intensive operations

### Implementation Guidelines

#### Code Quality Standards

- **TypeScript Strict Mode**: Full type safety with no `any` types
- **ESLint + Prettier**: Zero warnings, consistent formatting
- **JSDoc Documentation**: All public APIs comprehensively documented
- **Error Handling**: Graceful handling of all edge cases
- **Performance Monitoring**: Continuous validation of timing requirements

#### Defensive Programming Patterns

- **Input Validation**: Validate all inputs at service boundaries before processing
- **Resource Management**: Proper lifecycle management and cleanup of resources
- **Error Propagation**: Clear error messages with context for debugging
- **State Validation**: Verify system state before operations
- **Comprehensive Logging**: Log all significant operations for debugging and monitoring

#### Testing Requirements

- **100% Test Coverage**: Meaningful tests for all components
- **Atomic Tests**: Single responsibility, no test dependencies
- **Fast Execution**: Sub-second test suite execution
- **Debuggable Tests**: Clear failure messages, focused scope
- **Hardware Validation**: All test ROMs must pass

#### Architecture Compliance

- **Interface Segregation**: Minimal, focused component contracts
- **Dependency Inversion**: Components depend on abstractions
- **Single Responsibility**: One clear purpose per component
- **Open/Closed**: Open for extension, closed for modification
- **Composition**: Build complexity through composition, not inheritance

## Key Technical Specifications

### CPU (SM83) Specifications

- **Clock Speed**: 4.194304 MHz (4,194,304 cycles/second)
- **Register Set**: 8-bit A,F,B,C,D,E,H,L + 16-bit SP,PC
- **Instruction Set**: 256 opcodes with exact cycle timings
- **Addressing**: 16-bit address space (64KB)
- **Interrupts**: 5 types with priority handling and exact timing

### PPU (Picture Processing Unit) Specifications

- **Display Resolution**: 160×144 pixels
- **Color Depth**: 4 shades of gray (2-bit per pixel)
- **Frame Rate**: 59.727500569606 FPS
- **Modes**: H-Blank, V-Blank, OAM Search, Drawing
- **VRAM**: 8KB tile data + 1KB tile maps
- **Sprites**: 40 sprites, 10 per scanline maximum

### Memory System Specifications

- **Address Space**: 64KB (0x0000-0xFFFF)
- **ROM**: 32KB (0x0000-0x7FFF) with banking
- **VRAM**: 8KB (0x8000-0x9FFF) with PPU access restrictions
- **External RAM**: 8KB (0xA000-0xBFFF) with MBC banking
- **Working RAM**: 8KB (0xC000-0xDFFF)
- **I/O Registers**: 128 bytes (0xFF00-0xFF7F)

### Performance Targets

- **CPU Performance**: Exactly 4.194304 MHz
- **Frame Rate**: Precisely 59.7 FPS (16.74ms per frame)
- **Memory Operations**: 4.2M+ operations per second
- **Pixel Throughput**: 1.375M pixels per second
- **Input Latency**: <16ms response time

## Implementation Success Criteria

### Technical Validation

- ✅ **Blargg CPU Tests**: All CPU instruction and timing tests pass
- ✅ **Mealybug PPU Tests**: Pixel-perfect PPU behavior validation
- ✅ **Performance Benchmarks**: Native 4MHz performance maintained
- ✅ **Game Compatibility**: Popular titles run correctly
- ✅ **Memory Accuracy**: All memory timing and access restrictions correct

### Architectural Validation

- ✅ **Component Isolation**: All components testable independently
- ✅ **Interface Compliance**: Clean contracts with no coupling violations
- ✅ **Testing Coverage**: 100% meaningful test coverage
- ✅ **TDD Workflow**: All code developed following RED-GREEN-REFACTOR
- ✅ **Performance Maintenance**: No performance regression during development

### Quality Validation

- ✅ **Code Quality**: Zero TypeScript/ESLint warnings
- ✅ **Documentation**: Complete API documentation and implementation guides
- ✅ **Hardware Accuracy**: All documented edge cases and quirks implemented
- ✅ **Maintainability**: Clean, readable, well-structured codebase
- ✅ **Production Readiness**: Deployable web application with full feature set

## Development Environment Setup

### Required Tools

```bash
# Core development dependencies
npm install --save-dev typescript jest @types/jest
npm install --save-dev eslint prettier @typescript-eslint/parser
npm install --save-dev vite @vitejs/plugin-typescript

# Testing and validation tools
npm install --save-dev jest-image-snapshot
npm install --save-dev @types/node # For file I/O
```

### Project Configuration

```bash
# TypeScript strict mode configuration
npx tsc --init --strict --target ES2020 --module ESNext

# ESLint TypeScript integration
npx eslint --init # Select TypeScript preset

# Jest configuration with TypeScript
npm run test -- --init # Configure for TypeScript
```

### Validation Pipeline

```bash
# Full validation matching CI pipeline
npm run validate  # Runs: typecheck, lint, test, build

# Individual validation steps
npm run typecheck  # TypeScript compilation check
npm run lint      # ESLint validation
npm run test      # Jest test suite
npm run build     # Vite production build
```

## Resource References

### Primary Documentation

- **Architecture Specifications**: `/docs/architecture/` - Complete component design
- **Hardware Specifications**: `/docs/specs/` - DMG hardware requirements
- **Testing Standards**: `/docs/testing-standards.md` - TDD workflow and requirements
- **Development Workflow**: `/docs/development-workflow.md` - Process guidelines

### Test ROM Resources

- **Blargg Test Suite**: `./tests/resources/blargg/` - CPU and timing validation
- **Mealybug Tearoom**: `./tests/resources/mealybug/` - PPU accuracy validation
- **SM83 Opcodes**: `./tests/resources/opcodes.json` - Complete instruction reference

### Reference Implementations

- **JSMoo Analysis**: `./tests/resources/reference-implementations/jsmoo-analysis.md`
- **GameBoy Online Analysis**: `./tests/resources/reference-implementations/gameboy-online-analysis.md`
- **MCP-GameBoy Analysis**: `./tests/resources/reference-implementations/mcp-gameboy-analysis.md`
- **Implementation Comparison**: `./tests/resources/reference-implementations/implementation-comparison.md`
- **Technical Specifications**: `./tests/resources/reference-implementations/technical-specifications.md`

### External References

- **Pan Docs**: https://gbdev.io/pandocs/ - Authoritative DMG documentation
- **GB Dev Wiki**: https://gbdev.gg8.se/wiki - Hardware behavior reference
- **SM83 Opcodes**: https://gbdev.io/gb-opcodes/optables/ - Visual opcode reference

## Conclusion

This architecture overview provides the complete foundation for implementing a highly accurate, performant, and maintainable Game Boy DMG emulator. The design successfully balances hardware accuracy, native performance, and comprehensive testability through:

**Architectural Excellence**:

- Component-based design with clean interface boundaries
- Hybrid performance/testing approach optimized for both requirements
- Cycle-accurate timing coordination ensuring hardware compatibility

**Implementation Rigor**:

- Test-driven development with boundary observation testing
- Hardware validation through comprehensive test ROM integration
- Performance targets maintaining native DMG specifications

**Development Process**:

- Phased implementation roadmap with clear milestones
- Comprehensive quality standards and validation criteria
- Complete tooling and environment setup guidance

The architecture is production-ready and will produce a robust, accurate, and maintainable Game Boy DMG emulator that passes all hardware validation tests while maintaining native performance.

**Next Steps**: Begin implementation following the Phase 1 roadmap, starting with TypeScript project setup and interface definitions as outlined in the Implementation Roadmap section.
