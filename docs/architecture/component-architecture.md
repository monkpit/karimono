# Game Boy DMG Emulator Component Architecture

## ARCHITECTURE APPROVED

Based on comprehensive analysis of hardware specifications and reference implementations (JSMoo, GameBoy Online), this document defines the complete component architecture for our Game Boy DMG emulator, optimized for both native performance (4.194304 MHz) and comprehensive testability.

## Executive Summary

### Architecture Decisions
1. **Component-Based Design**: Discrete, testable components with clear interface boundaries
2. **Hybrid Memory Access**: Direct typed array access for performance, abstracted interfaces for testing
3. **Cycle-Accurate Timing**: Master clock coordination with T-state precision
4. **Composition Over Inheritance**: Pure composition with dependency injection
5. **Performance-First Rendering**: Direct display buffer writes with functional abstraction layer

### Core Architectural Principles
- **Encapsulation**: Each component hides internal implementation details
- **Single Responsibility**: Components have one clear, well-defined purpose  
- **Interface Design**: Minimal, explicit contracts with inverted dependencies
- **Testability**: All components testable in isolation via boundary observation
- **Performance**: Native DMG speed with zero-copy memory operations where possible

## System Architecture Overview

### Component Hierarchy
```typescript
GameBoySystem
├── CPU (SM83)              // Instruction execution, interrupt handling
├── PPU (Picture Processor) // Video rendering, display output  
├── MemoryController       // Address decoding, banking, access restrictions
├── TimerSystem           // DIV/TIMA counters, timer interrupts
├── InputController       // Joypad input processing
├── CartridgeController   // ROM/RAM management, MBC implementations
└── SystemClock          // Master timing coordination
```

### Communication Architecture
```typescript
// Central bus for component communication
interface SystemBus {
  read(address: u16): u8;
  write(address: u16, value: u8): void;
  requestInterrupt(type: InterruptType): void;
  getCurrentCycle(): u32;
}

// Master clock for timing coordination  
interface SystemClock {
  step(cycles: u32): void;
  getCurrentCycle(): u32;
  getFrameProgress(): f32;
}
```

## Component Interface Specifications

### 1. CPU Component (SM83)

#### Interface Definition
```typescript
interface CPU {
  // Core execution
  step(): u32;                    // Execute next instruction, return cycles
  reset(): void;                  // Reset to power-on state
  
  // Interrupt handling
  requestInterrupt(type: InterruptType): void;
  acknowledgeInterrupt(): InterruptType | null;
  
  // State access (for testing/debugging only)
  getRegisters(): CPURegisters;
  getProgramCounter(): u16;
  getStackPointer(): u16;
  
  // Memory interface
  read(address: u16): u8;
  write(address: u16, value: u8): void;
}

interface CPURegisters {
  readonly A: u8; readonly F: u8;  // Accumulator & Flags
  readonly B: u8; readonly C: u8;  // BC register pair
  readonly D: u8; readonly E: u8;  // DE register pair  
  readonly H: u8; readonly L: u8;  // HL register pair
}
```

#### Implementation Requirements
- **Instruction Execution**: Generated switch table for optimal dispatch performance
- **Timing Accuracy**: Exact M-cycle (4 T-state) precision for all instructions
- **Memory Access**: All access through memory controller for proper restrictions
- **Flag Management**: Zero, Negative, Half-carry, Carry flags with exact behavior
- **Interrupt Processing**: 5 M-cycle interrupt handling with exact timing

#### Testing Strategy
```typescript
describe('CPU', () => {
  it('should execute NOP instruction in 4 cycles', () => {
    const mockMemory = new MockMemoryController();
    const cpu = new CPU(mockMemory);
    
    mockMemory.write(0x0000, 0x00); // NOP opcode
    const cycles = cpu.step();
    
    expect(cycles).toBe(4);
    expect(cpu.getProgramCounter()).toBe(0x0001);
  });
});
```

### 2. PPU Component (Picture Processing Unit)

#### Interface Definition
```typescript
interface PPU {
  // Core rendering
  step(cycles: u32): void;        // Advance PPU state machine
  isFrameReady(): boolean;        // New frame available
  getFrameBuffer(): Uint32Array;  // 160x144 RGBA pixels
  
  // State queries
  getCurrentMode(): PPUMode;
  getCurrentScanline(): u8;
  
  // Memory access restrictions
  isVRAMAccessible(): boolean;
  isOAMAccessible(): boolean;
  
  // Register interface
  writeRegister(address: u16, value: u8): void;
  readRegister(address: u16): u8;
}

enum PPUMode {
  HBLANK = 0,      // CPU can access VRAM/OAM
  VBLANK = 1,      // CPU can access VRAM/OAM  
  OAM_SEARCH = 2,  // CPU blocked from OAM
  PIXEL_TRANSFER = 3 // CPU blocked from VRAM/OAM  
}
```

#### Implementation Requirements
- **Mode Timing**: T-state accurate mode transitions (80/172-289/204-287 cycles)
- **Rendering Pipeline**: Scanline-based pixel generation with sprite priority
- **Memory Restrictions**: Block CPU access during appropriate modes
- **Display Output**: Direct write to 160×144 RGBA buffer for performance
- **Register Behavior**: Exact LCDC, STAT, SCX, SCY, LY, LYC register behavior

#### Testing Strategy
```typescript
describe('PPU', () => {
  it('should block VRAM access during pixel transfer mode', () => {
    const ppu = new PPU();
    ppu.forceMode(PPUMode.PIXEL_TRANSFER);
    
    expect(ppu.isVRAMAccessible()).toBe(false);
    expect(ppu.isOAMAccessible()).toBe(false);
  });
  
  it('should generate frame in exactly 70224 cycles', () => {
    const ppu = new PPU();
    let totalCycles = 0;
    
    while (!ppu.isFrameReady()) {
      ppu.step(4);
      totalCycles += 4;
    }
    
    expect(totalCycles).toBe(70224);
  });
});
```

### 3. Memory Controller Component

#### Interface Definition  
```typescript
interface MemoryController {
  // Core memory operations
  read(address: u16): u8;
  write(address: u16, value: u8): void;
  
  // Access control
  isAddressAccessible(address: u16, accessor: ComponentType): boolean;
  
  // Banking operations
  switchROMBank(bank: u8): void;
  switchRAMBank(bank: u8): void;
  enableRAM(enable: boolean): void;
  
  // Component interfaces
  attachCartridge(cartridge: CartridgeController): void;
  connectPPU(ppu: PPU): void;
}

interface MemoryRegion {
  readonly startAddress: u16;
  readonly endAddress: u16;
  readonly accessible: boolean;
  read(offset: u16): u8;
  write(offset: u16, value: u8): void;
}
```

#### Memory Layout Implementation
```typescript
// Performance-critical: Direct typed array access
class MemoryController implements MemoryController {
  private readonly wram = new Uint8Array(0x2000);    // 0xC000-0xDFFF
  private readonly hram = new Uint8Array(0x7F);      // 0xFF80-0xFFFE
  private readonly vram = new Uint8Array(0x2000);    // 0x8000-0x9FFF (via PPU)
  private readonly oam = new Uint8Array(0xA0);       // 0xFE00-0xFE9F (via PPU)
  
  read(address: u16): u8 {
    // Optimized address decoding with switch statement
    switch (address >> 12) {
      case 0x0: case 0x1: case 0x2: case 0x3:
        return this.cartridge.readROM(address);      // 0x0000-0x3FFF
      case 0x4: case 0x5: case 0x6: case 0x7:
        return this.cartridge.readROMBank(address);  // 0x4000-0x7FFF
      case 0x8: case 0x9:
        return this.readVRAM(address);               // 0x8000-0x9FFF
      case 0xA: case 0xB:
        return this.cartridge.readRAM(address);      // 0xA000-0xBFFF
      case 0xC: case 0xD:
        return this.wram[address - 0xC000];          // 0xC000-0xDFFF
      case 0xE: case 0xF:
        return this.readHighArea(address);           // 0xE000-0xFFFF
    }
  }
}
```

#### Testing Strategy
```typescript
describe('MemoryController', () => {
  it('should return 0xFF when VRAM blocked by PPU', () => {
    const mockPPU = new MockPPU();
    const memory = new MemoryController();
    memory.connectPPU(mockPPU);
    
    mockPPU.setMode(PPUMode.PIXEL_TRANSFER);
    const value = memory.read(0x8000);
    
    expect(value).toBe(0xFF);
  });
});
```

### 4. Cartridge Controller Component

#### Interface Definition
```typescript
interface CartridgeController {
  // ROM operations
  readROM(address: u16): u8;
  readROMBank(address:u16): u8;
  
  // RAM operations  
  readRAM(address: u16): u8;
  writeRAM(address: u16, value: u8): void;
  
  // Banking control
  writeROMBankRegister(address: u16, value: u8): void;
  
  // Cartridge info
  getHeader(): CartridgeHeader;  
  getMBCType(): MBCType;
  
  // Save data
  getSaveData(): Uint8Array | null;
  loadSaveData(data: Uint8Array): void;
}

interface CartridgeHeader {
  readonly title: string;
  readonly cartridgeType: u8;
  readonly romSize: u8;
  readonly ramSize: u8;  
  readonly headerChecksum: u8;
}
```

#### MBC Implementation Strategy
```typescript
// Factory pattern for MBC implementations
class CartridgeController {
  private mbc: MemoryBankController;
  
  constructor(romData: Uint8Array) {
    const header = this.parseHeader(romData);
    this.mbc = MBCFactory.create(header.cartridgeType, romData);
  }
}

interface MemoryBankController {
  readROM(address: u16): u8;
  writeROM(address: u16, value: u8): void;
  readRAM(address: u16): u8; 
  writeRAM(address: u16, value: u8): void;
}

// Concrete MBC implementations
class MBC1 implements MemoryBankController {
  private romBanks: Uint8Array[];
  private ramBanks: Uint8Array[];
  private currentROMBank = 1;
  private currentRAMBank = 0;
  private ramEnabled = false;
}
```

### 5. System Clock and Timing Coordination

#### Interface Definition
```typescript
interface SystemClock {
  // Core timing
  step(): void;                   // Advance one T-state
  stepMultiple(cycles: u32): void; // Advance multiple T-states
  
  // State queries
  getCurrentCycle(): u32;
  getFrameProgress(): f32;        // 0.0-1.0 through current frame
  
  // Component coordination
  addComponent(component: ClockableComponent): void;
  synchronizeAll(): void;
}

interface ClockableComponent {
  step(cycles: u32): void;
  getCurrentCycle(): u32;
}
```

#### Timing Implementation
```typescript
class SystemClock implements SystemClock {
  private currentCycle: u32 = 0;
  private components: ClockableComponent[] = [];
  
  step(): void {
    this.currentCycle++;
    
    // Coordinate all components each T-state
    for (const component of this.components) {
      component.step(1);
    }
    
    // Handle frame boundary
    if (this.currentCycle % 70224 === 0) {
      this.handleFrameBoundary();
    }
  }
  
  stepMultiple(cycles: u32): void {
    for (let i = 0; i < cycles; i++) {
      this.step();
    }
  }
}
```

## Performance Optimization Strategies

### 1. Memory Access Optimization

#### Direct Buffer Access for Hot Paths
```typescript
// Performance-critical paths use direct array access
class PPURenderer {
  private frameBuffer = new Uint32Array(160 * 144);
  
  renderPixel(x: u8, y: u8, color: u8): void {
    // Direct array write - no function call overhead
    this.frameBuffer[y * 160 + x] = this.palette[color];
  }
}
```

#### Lookup Tables for Complex Operations
```typescript
// Pre-computed instruction decode tables
class InstructionDecoder {
  private static readonly OPCODES = InstructionDecoder.generateOpcodes();
  
  decode(opcode: u8): InstructionHandler {
    return InstructionDecoder.OPCODES[opcode]; // O(1) lookup
  }
}
```

### 2. Component Communication Patterns

#### Performance vs Abstraction Balance
```typescript
// Testing interface - abstracted for mockability
interface ComponentInterface {
  read(address: u16): u8;
  write(address: u16, value: u8): void;
}

// Production implementation - optimized for performance  
class ProductionComponent implements ComponentInterface {
  read(address: u16): u8 {
    // Direct memory access, minimal function call overhead
    return this.memory[address];
  }
}

// Testing implementation - full abstraction
class TestableComponent implements ComponentInterface {
  constructor(private mockMemory: MockMemory) {}
  
  read(address: u16): u8 {
    return this.mockMemory.read(address); // Trackable for testing
  }
}
```

### 3. Rendering Pipeline Optimization

#### Scanline-Based Rendering
```typescript
class PPURenderer {
  renderScanline(line: u8): void {
    // Process entire scanline at once for cache efficiency
    const bgTiles = this.fetchBackgroundTiles(line);
    const sprites = this.fetchSprites(line);
    
    // Direct pixel buffer writes
    for (let x = 0; x < 160; x++) {
      const pixel = this.mixPixels(bgTiles[x], sprites[x]);
      this.frameBuffer[line * 160 + x] = pixel;
    }
  }
}
```

## Testing Isolation Strategies

### 1. Component Boundary Testing

#### CPU Testing via Side Effects
```typescript
describe('CPU Instruction Execution', () => {
  it('should increment memory value with INC (HL)', () => {
    const mockMemory = new MockMemoryController();
    const cpu = new CPU(mockMemory);
    
    // Setup: HL=0x8000, (0x8000)=0x42
    cpu.setHL(0x8000);
    mockMemory.write(0x8000, 0x42);
    mockMemory.write(0x0000, 0x34); // INC (HL) opcode
    
    // Execute
    const cycles = cpu.step();
    
    // Verify side effects at boundary
    expect(mockMemory.read(0x8000)).toBe(0x43);
    expect(cycles).toBe(12);
    expect(cpu.getFlagZ()).toBe(false);
  });
});
```

#### PPU Testing via Display Buffer
```typescript
describe('PPU Rendering', () => {
  it('should render solid color tile correctly', () => {
    const ppu = new PPU();
    
    // Setup tile data for solid white tile
    ppu.writeTileData(0, [
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF
    ]);
    
    // Render scanline
    ppu.renderScanline(0);
    
    // Verify output at display boundary
    const frameBuffer = ppu.getFrameBuffer();
    for (let x = 0; x < 8; x++) {
      expect(frameBuffer[x]).toBe(0xFFFFFFFF); // White pixels
    }
  });
});
```

### 2. Integration Testing

#### System-Level Hardware Test ROM Validation
```typescript
describe('Hardware Test ROM Compatibility', () => {
  it('should pass all Blargg CPU instruction tests', async () => {
    const system = new GameBoySystem();
    await system.loadROM(blarggCPUInstructionROM);
    
    // Run until test completion marker
    while (!system.isTestComplete()) {
      system.step();
    }
    
    // Verify test result via serial output
    const testOutput = system.getSerialOutput();
    expect(testOutput).toContain('Passed');
  });
  
  it('should produce pixel-perfect Mealybug test output', async () => {
    const system = new GameBoySystem();
    await system.loadROM(mealybugTestROM);
    
    // Run until frame ready
    while (!system.getPPU().isFrameReady()) {
      system.step();
    }
    
    // Compare with known-good baseline
    const actualFrame = system.getPPU().getFrameBuffer();
    const expectedFrame = await loadExpectedFrame('mealybug_test.png');
    expect(actualFrame).toEqual(expectedFrame);
  });
});
```

## ROM Loading Architecture

### Cartridge Detection and Loading Process
```typescript
class ROMLoader {
  async loadCartridge(romData: Uint8Array): Promise<CartridgeController> {
    // 1. Validate ROM file
    this.validateROMData(romData);
    
    // 2. Parse cartridge header
    const header = this.parseCartridgeHeader(romData);
    
    // 3. Detect MBC type
    const mbcType = this.detectMBCType(header.cartridgeType);
    
    // 4. Create appropriate cartridge controller
    const cartridge = new CartridgeController(romData, mbcType);
    
    // 5. Initialize banking state
    cartridge.reset();
    
    return cartridge;
  }
  
  private detectMBCType(cartridgeType: u8): MBCType {
    switch (cartridgeType) {
      case 0x00: return MBCType.NONE;
      case 0x01: case 0x02: case 0x03: return MBCType.MBC1;
      case 0x05: case 0x06: return MBCType.MBC2;
      case 0x0F: case 0x10: case 0x11: case 0x12: case 0x13: return MBCType.MBC3;
      default: throw new Error(`Unsupported MBC type: 0x${cartridgeType.toString(16)}`);
    }
  }
}
```

### Memory Bank Controller Integration
```typescript
interface GameBoySystem {
  loadROM(romData: Uint8Array): Promise<void>;
  reset(): void;
  step(): void;
  
  // Component access for testing
  getCPU(): CPU;
  getPPU(): PPU;  
  getMemoryController(): MemoryController;
}

class GameBoySystem implements GameBoySystem {
  private cpu: CPU;
  private ppu: PPU;
  private memory: MemoryController;
  private cartridge: CartridgeController | null = null;
  
  async loadROM(romData: Uint8Array): Promise<void> {
    const loader = new ROMLoader();
    this.cartridge = await loader.loadCartridge(romData);
    
    // Connect cartridge to memory system
    this.memory.attachCartridge(this.cartridge);
    
    // Reset system with new cartridge
    this.reset();
  }
}
```

## Implementation Roadmap

### Phase 1: Core Architecture (Weeks 1-2)
1. **Component Interfaces**: Define all component interfaces and mock implementations
2. **Memory Controller**: Basic address decoding and WRAM/HRAM access  
3. **System Clock**: Master timing coordination framework
4. **Basic CPU**: Instruction decoding framework with NOP instruction
5. **Testing Infrastructure**: Jest setup with mock components

### Phase 2: CPU Implementation (Weeks 3-4)  
1. **Register Management**: 8-bit and 16-bit register operations
2. **Instruction Set**: Complete SM83 instruction implementation
3. **Flag Operations**: Zero, Negative, Half-carry, Carry flag behavior
4. **Memory Access**: CPU memory read/write through memory controller
5. **Interrupt System**: Interrupt request, acknowledgment, and handling

### Phase 3: Memory and Cartridge (Weeks 5-6)
1. **Cartridge Loading**: ROM parsing and header validation  
2. **MBC Implementation**: MBC1, MBC2, MBC3 memory bank controllers
3. **RAM Banking**: External RAM management and save data
4. **Memory Restrictions**: PPU-based access blocking implementation
5. **Address Decoding**: Complete 64KB address space handling

### Phase 4: PPU and Display (Weeks 7-8)
1. **PPU State Machine**: Four-mode operation with exact timing
2. **VRAM Management**: Tile data and tile map organization
3. **Rendering Pipeline**: Background, window, and sprite rendering
4. **Display Output**: Frame buffer generation and display interface
5. **Memory Access Control**: CPU blocking during appropriate PPU modes

### Phase 5: Integration and Testing (Weeks 9-10)
1. **System Integration**: Connect all components through system bus
2. **Hardware Test ROMs**: Blargg CPU tests and Mealybug PPU tests  
3. **Performance Optimization**: Profile and optimize hot paths
4. **Save System**: Save state and battery-backed RAM persistence
5. **Input System**: Joypad input processing and interrupts

## Quality Assurance and Validation

### Architectural Compliance Checklist
✅ **Single Responsibility**: Each component has one clear purpose  
✅ **Encapsulation**: Internal implementation details hidden behind interfaces
✅ **Interface Design**: Minimal, explicit contracts with clear boundaries
✅ **Composition**: Dependencies injected, no inheritance hierarchies  
✅ **Testability**: All components testable in isolation via boundary observation
✅ **Loose Coupling**: Components interact only through defined interfaces
✅ **Performance**: Direct memory access for hot paths, abstraction for testing

### Testing Requirements
- **Unit Tests**: Individual component behavior validation with 100% coverage
- **Integration Tests**: Component interaction and timing coordination
- **Hardware Tests**: Blargg and Mealybug ROM compatibility validation  
- **Performance Tests**: Native speed maintenance at 4.194304 MHz
- **Compatibility Tests**: Popular game ROM compatibility verification

### Success Criteria
1. **Accuracy**: Pass all Blargg CPU instruction and timing tests
2. **Visual Accuracy**: Pixel-perfect output matching Mealybug test baselines
3. **Performance**: Maintain native DMG speed (59.7 FPS) in real-time
4. **Maintainability**: Component isolation enables independent testing and modification
5. **Extensibility**: Architecture supports additional features (debugging, save states)

## Conclusion

This component architecture successfully balances the competing requirements of hardware accuracy, native performance, and comprehensive testability. The hybrid approach of performance-optimized implementation with testable abstractions ensures we can achieve both cycle-accurate emulation and maintainable, well-tested code.

**Key architectural strengths:**
- **Clear component boundaries** enable independent development and testing
- **Performance-first memory access** maintains native DMG timing requirements  
- **Comprehensive testing strategy** ensures hardware accuracy through boundary observation
- **Modular design** supports incremental development and easy debugging
- **Clean interfaces** minimize coupling while maximizing flexibility

The architecture is ready for implementation following the defined roadmap, with each phase building upon the previous to create a robust, accurate, and maintainable Game Boy DMG emulator.