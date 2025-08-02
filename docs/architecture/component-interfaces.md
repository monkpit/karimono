# Game Boy DMG Component Interface Specifications

> **⚠️ OUTDATED DOCUMENT NOTICE**  
> **Performance Optimization (2025-08-02)**: This document contains outdated interface specifications that include PPU mode access control. The current implementation uses simplified interfaces for performance. See `/home/pittm/karimono-v2/src/emulator/types.ts` for current interfaces and `/home/pittm/karimono-v2/docs/decisions/mmu-performance-optimization.md` for context.

## Overview

This document defines the precise TypeScript interfaces that establish the contracts between all Game Boy DMG emulator components. These interfaces enforce architectural boundaries, enable comprehensive testing, and ensure component isolation while maintaining native performance.

## Core System Interfaces

### System Bus Interface

```typescript
/**
 * Central communication bus for all system components
 * Provides unified memory access and interrupt coordination
 */
interface SystemBus {
  // Memory operations
  read(address: u16): u8;
  write(address: u16, value: u8): void;

  // Interrupt coordination
  requestInterrupt(type: InterruptType): void;
  acknowledgeInterrupt(): InterruptType | null;

  // Timing coordination
  getCurrentCycle(): u32;

  // Component access restrictions
  isAddressAccessible(address: u16, accessor: ComponentType): boolean;
}

/**
 * Master system clock for component synchronization
 * Ensures all components maintain cycle-accurate timing
 */
interface SystemClock {
  // Core timing operations
  step(): void; // Advance one T-state
  stepMultiple(cycles: u32): void; // Advance multiple T-states

  // State queries
  getCurrentCycle(): u32; // Current T-state count
  getFrameProgress(): f32; // 0.0-1.0 through current frame

  // Component coordination
  addComponent(component: ClockableComponent): void;
  removeComponent(component: ClockableComponent): void;
  synchronizeAll(): void;
}

/**
 * Interface for components that require clock synchronization
 */
interface ClockableComponent {
  step(cycles: u32): void; // Advance component by T-states
  getCurrentCycle(): u32; // Component's current T-state
  reset(): void; // Reset to power-on state
}
```

## CPU Component Interface

### SM83 CPU Interface

```typescript
/**
 * Game Boy SM83 CPU implementation interface
 * Handles instruction execution, register management, and interrupt processing
 */
interface CPU extends ClockableComponent {
  // Core execution
  step(): u32; // Execute next instruction, return cycles consumed
  executeInstruction(opcode: u8): u32; // Execute specific instruction

  // Interrupt handling
  requestInterrupt(type: InterruptType): void;
  processInterrupts(): u32; // Process pending interrupts, return cycles
  setInterruptMasterEnable(enabled: boolean): void;
  getInterruptMasterEnable(): boolean;

  // Memory interface
  read(address: u16): u8;
  write(address: u16, value: u8): void;

  // Register access (testing/debugging only)
  getRegisters(): CPURegisters;
  setRegisters(registers: CPURegisters): void;
  getProgramCounter(): u16;
  setProgramCounter(pc: u16): void;
  getStackPointer(): u16;
  setStackPointer(sp: u16): void;

  // Flag operations
  getFlag(flag: CPUFlag): boolean;
  setFlag(flag: CPUFlag, value: boolean): void;
  getFlags(): u8;
  setFlags(flags: u8): void;

  // State management
  getState(): CPUState;
  setState(state: CPUState): void;
  isHalted(): boolean;
  isStopped(): boolean;
}

/**
 * CPU register set structure
 */
interface CPURegisters {
  readonly A: u8; // Accumulator
  readonly F: u8; // Flags register
  readonly B: u8; // B register
  readonly C: u8; // C register
  readonly D: u8; // D register
  readonly E: u8; // E register
  readonly H: u8; // H register
  readonly L: u8; // L register
  readonly SP: u16; // Stack pointer
  readonly PC: u16; // Program counter
}

/**
 * CPU flag enumeration
 */
enum CPUFlag {
  ZERO = 0x80, // Z flag - Zero result
  NEGATIVE = 0x40, // N flag - Negative operation
  HALF_CARRY = 0x20, // H flag - Half carry
  CARRY = 0x10, // C flag - Carry
}

/**
 * Complete CPU state for save/restore
 */
interface CPUState {
  registers: CPURegisters;
  interruptMasterEnable: boolean;
  halted: boolean;
  stopped: boolean;
  currentCycle: u32;
}

/**
 * Interrupt types
 */
enum InterruptType {
  VBLANK = 0x01, // VBlank interrupt
  LCD_STAT = 0x02, // LCD STAT interrupt
  TIMER = 0x04, // Timer interrupt
  SERIAL = 0x08, // Serial interrupt
  JOYPAD = 0x10, // Joypad interrupt
}
```

## PPU Component Interface

### Picture Processing Unit Interface

```typescript
/**
 * Game Boy PPU implementation interface
 * Handles video rendering, display output, and memory access restrictions
 */
interface PPU extends ClockableComponent {
  // Core rendering
  step(cycles: u32): void; // Advance PPU state machine
  renderScanline(line: u8): void; // Render specific scanline

  // Frame management
  isFrameReady(): boolean; // New frame available for display
  getFrameBuffer(): Uint32Array; // 160x144 RGBA pixel buffer
  clearFrameReady(): void; // Mark frame as consumed

  // PPU state queries
  getCurrentMode(): PPUMode; // Current PPU mode
  getCurrentScanline(): u8; // Current LY value (0-153)
  getScanlineCycle(): u16; // T-state within current scanline

  // Memory access control
  isVRAMAccessible(): boolean; // CPU can access VRAM
  isOAMAccessible(): boolean; // CPU can access OAM

  // VRAM interface
  readVRAM(address: u16): u8;
  writeVRAM(address: u16, value: u8): void;

  // OAM interface
  readOAM(address: u16): u8;
  writeOAM(address: u16, value: u8): void;

  // Register interface
  readRegister(address: u16): u8;
  writeRegister(address: u16, value: u8): void;

  // State management
  getState(): PPUState;
  setState(state: PPUState): void;

  // Debugging/testing
  getTileData(tileIndex: u8): Uint8Array; // Get tile data for testing
  getPixel(x: u8, y: u8): u32; // Get specific pixel color
}

/**
 * PPU mode enumeration
 */
enum PPUMode {
  HBLANK = 0, // Horizontal blank - CPU can access VRAM/OAM
  VBLANK = 1, // Vertical blank - CPU can access VRAM/OAM
  OAM_SEARCH = 2, // OAM search - CPU blocked from OAM
  PIXEL_TRANSFER = 3, // Pixel transfer - CPU blocked from VRAM/OAM
}

/**
 * PPU state for save/restore
 */
interface PPUState {
  mode: PPUMode;
  scanline: u8;
  scanlineCycle: u16;
  frameReady: boolean;
  lcdc: u8; // LCD control register
  stat: u8; // LCD status register
  scy: u8; // Scroll Y
  scx: u8; // Scroll X
  ly: u8; // Current scanline
  lyc: u8; // LY compare
  wy: u8; // Window Y
  wx: u8; // Window X
  bgp: u8; // Background palette
  obp0: u8; // Object palette 0
  obp1: u8; // Object palette 1
  currentCycle: u32;
}

/**
 * Sprite attribute structure
 */
interface SpriteAttribute {
  y: u8; // Y position + 16
  x: u8; // X position + 8
  tileIndex: u8; // Tile number
  attributes: u8; // Priority, flip, palette flags
}
```

## Memory Controller Interface

### Memory Management Interface

```typescript
/**
 * Central memory controller interface
 * Handles address decoding, banking, and access restrictions
 */
interface MemoryController extends ClockableComponent {
  // Core memory operations
  read(address: u16): u8;
  write(address: u16, value: u8): void;

  // Direct memory access (performance-critical paths)
  readDirect(address: u16): u8; // Bypass access checks
  writeDirect(address: u16, value: u8): void; // Bypass access checks

  // Access control
  isAddressAccessible(address: u16, accessor: ComponentType): boolean;
  setAccessRestriction(region: MemoryRegion, accessor: ComponentType, blocked: boolean): void;

  // Banking operations
  switchROMBank(bank: u8): void;
  switchRAMBank(bank: u8): void;
  enableRAM(enabled: boolean): void;
  getCurrentROMBank(): u8;
  getCurrentRAMBank(): u8;

  // Component connections
  attachCartridge(cartridge: CartridgeController): void;
  connectPPU(ppu: PPU): void;
  connectDMA(dma: DMAController): void;

  // Memory regions
  getWRAM(): Uint8Array; // Work RAM access
  getHRAM(): Uint8Array; // High RAM access

  // State management
  getState(): MemoryState;
  setState(state: MemoryState): void;
}

/**
 * Memory region enumeration
 */
enum MemoryRegion {
  ROM_BANK_0 = 0, // 0x0000-0x3FFF
  ROM_BANK_N = 1, // 0x4000-0x7FFF
  VRAM = 2, // 0x8000-0x9FFF
  EXTERNAL_RAM = 3, // 0xA000-0xBFFF
  WRAM = 4, // 0xC000-0xDFFF
  ECHO_RAM = 5, // 0xE000-0xFDFF
  OAM = 6, // 0xFE00-0xFE9F
  IO_REGISTERS = 7, // 0xFF00-0xFF7F
  HRAM = 8, // 0xFF80-0xFFFE
  IE_REGISTER = 9, // 0xFFFF
}

/**
 * Component type enumeration for access control
 */
enum ComponentType {
  CPU = 0,
  PPU = 1,
  DMA = 2,
  TIMER = 3,
}

/**
 * Memory controller state
 */
interface MemoryState {
  currentROMBank: u8;
  currentRAMBank: u8;
  ramEnabled: boolean;
  accessRestrictions: Map<MemoryRegion, Set<ComponentType>>;
  currentCycle: u32;
}
```

## Cartridge Controller Interface

### Cartridge and MBC Interface

```typescript
/**
 * Cartridge controller interface
 * Handles ROM/RAM access, banking, and save data management
 */
interface CartridgeController {
  // ROM operations
  readROM(address: u16): u8; // Read from current ROM banks
  writeROM(address: u16, value: u8): void; // Banking register writes

  // RAM operations
  readRAM(address: u16): u8; // Read from current RAM bank
  writeRAM(address: u16, value: u8): void; // Write to current RAM bank

  // Banking control
  switchROMBank(bank: u8): void;
  switchRAMBank(bank: u8): void;
  enableRAM(enabled: boolean): void;
  getCurrentROMBank(): u8;
  getCurrentRAMBank(): u8;

  // Cartridge information
  getHeader(): CartridgeHeader;
  getMBCType(): MBCType;
  getROMSize(): u32;
  getRAMSize(): u32;
  hasRAM(): boolean;
  hasBattery(): boolean;
  hasRTC(): boolean;

  // Save data management
  getSaveData(): Uint8Array | null;
  loadSaveData(data: Uint8Array): void;

  // RTC support (MBC3)
  getRTCData(): RTCData | null;
  setRTCData(rtc: RTCData): void;

  // State management
  getState(): CartridgeState;
  setState(state: CartridgeState): void;
  reset(): void;
}

/**
 * Cartridge header structure
 */
interface CartridgeHeader {
  readonly title: string; // Game title
  readonly manufacturerCode: string; // Manufacturer code
  readonly cgbFlag: u8; // CGB compatibility
  readonly newLicenseeCode: string; // New licensee code
  readonly sgbFlag: u8; // SGB compatibility
  readonly cartridgeType: u8; // MBC type identifier
  readonly romSize: u8; // ROM size code
  readonly ramSize: u8; // RAM size code
  readonly destinationCode: u8; // Region code
  readonly oldLicenseeCode: u8; // Old licensee code
  readonly versionNumber: u8; // ROM version
  readonly headerChecksum: u8; // Header checksum
  readonly globalChecksum: u16; // Global checksum
}

/**
 * Memory Bank Controller types
 */
enum MBCType {
  NONE = 0, // No MBC (32KB ROM max)
  MBC1 = 1, // MBC1 (2MB ROM, 32KB RAM)
  MBC2 = 2, // MBC2 (256KB ROM, 512x4-bit RAM)
  MBC3 = 3, // MBC3 (2MB ROM, 32KB RAM, RTC)
  MBC5 = 5, // MBC5 (8MB ROM, 128KB RAM)
}

/**
 * Real-time clock data (MBC3)
 */
interface RTCData {
  seconds: u8; // Seconds (0-59)
  minutes: u8; // Minutes (0-59)
  hours: u8; // Hours (0-23)
  days: u16; // Days (0-511)
  halted: boolean; // Clock halted flag
  dayCarry: boolean; // Day counter overflow
}

/**
 * Cartridge state
 */
interface CartridgeState {
  currentROMBank: u8;
  currentRAMBank: u8;
  ramEnabled: boolean;
  rtcData: RTCData | null;
  mbcRegisters: Uint8Array; // MBC-specific register state
}
```

## System Timer Interface

### Timer System Interface

```typescript
/**
 * System timer interface
 * Handles DIV, TIMA counters and timer interrupts
 */
interface TimerSystem extends ClockableComponent {
  // Core timer operations
  step(cycles: u32): void; // Advance timer by T-states

  // Register interface
  readRegister(address: u16): u8; // Read timer register
  writeRegister(address: u16, value: u8): void; // Write timer register

  // DIV register (0xFF04)
  getDIV(): u8;
  resetDIV(): void; // Any write resets DIV to 0

  // TIMA register (0xFF05)
  getTIMA(): u8;
  setTIMA(value: u8): void;

  // TMA register (0xFF06)
  getTMA(): u8;
  setTMA(value: u8): void;

  // TAC register (0xFF07)
  getTAC(): u8;
  setTAC(value: u8): void;
  getTimerEnabled(): boolean;
  getTimerFrequency(): u32; // Get current TIMA frequency

  // Interrupt handling
  hasTimerInterrupt(): boolean;
  clearTimerInterrupt(): void;

  // State management
  getState(): TimerState;
  setState(state: TimerState): void;
}

/**
 * Timer state structure
 */
interface TimerState {
  divCounter: u16; // Internal DIV counter
  timaCounter: u16; // Internal TIMA counter
  div: u8; // DIV register value
  tima: u8; // TIMA register value
  tma: u8; // TMA register value
  tac: u8; // TAC register value
  timerInterrupt: boolean; // Timer interrupt pending
  currentCycle: u32;
}
```

## Input Controller Interface

### Joypad Input Interface

```typescript
/**
 * Input controller interface
 * Handles joypad input processing and interrupts
 */
interface InputController extends ClockableComponent {
  // Input state
  setButtonState(button: JoypadButton, pressed: boolean): void;
  getButtonState(button: JoypadButton): boolean;
  getAllButtonStates(): JoypadState;

  // Register interface
  readJoypadRegister(): u8; // Read P1 register (0xFF00)
  writeJoypadRegister(value: u8): void; // Write P1 register

  // Interrupt handling
  hasJoypadInterrupt(): boolean;
  clearJoypadInterrupt(): void;

  // State management
  getState(): InputState;
  setState(state: InputState): void;
}

/**
 * Joypad button enumeration
 */
enum JoypadButton {
  RIGHT = 0,
  LEFT = 1,
  UP = 2,
  DOWN = 3,
  A = 4,
  B = 5,
  SELECT = 6,
  START = 7,
}

/**
 * Joypad state structure
 */
interface JoypadState {
  right: boolean;
  left: boolean;
  up: boolean;
  down: boolean;
  a: boolean;
  b: boolean;
  select: boolean;
  start: boolean;
}

/**
 * Input controller state
 */
interface InputState {
  buttonStates: JoypadState;
  p1Register: u8;
  joypadInterrupt: boolean;
  currentCycle: u32;
}
```

## DMA Controller Interface

### Direct Memory Access Interface

```typescript
/**
 * DMA controller interface
 * Handles OAM DMA transfers and memory access blocking
 */
interface DMAController extends ClockableComponent {
  // DMA operations
  startDMATransfer(sourceAddress: u8): void; // Start DMA from source page
  isDMAActive(): boolean; // DMA transfer in progress
  getRemainingCycles(): u32; // Cycles left in transfer

  // Memory access control
  isCPUMemoryBlocked(): boolean; // CPU blocked from most memory
  isHRAMAccessible(): boolean; // HRAM still accessible during DMA

  // Register interface
  readDMARegister(): u8; // Read DMA register (0xFF46)
  writeDMARegister(value: u8): void; // Write DMA register (starts transfer)

  // State management
  getState(): DMAState;
  setState(state: DMAState): void;
}

/**
 * DMA controller state
 */
interface DMAState {
  active: boolean;
  sourceAddress: u16;
  currentByte: u8;
  remainingCycles: u32;
  currentCycle: u32;
}
```

## Main System Interface

### Game Boy System Interface

```typescript
/**
 * Main Game Boy system interface
 * Coordinates all components and provides unified system access
 */
interface GameBoySystem {
  // System lifecycle
  initialize(): Promise<void>;
  reset(): void;
  step(): void; // Execute one system step
  stepFrame(): void; // Execute complete frame

  // ROM management
  loadROM(romData: Uint8Array): Promise<void>;
  unloadROM(): void;
  isROMLoaded(): boolean;

  // Component access
  getCPU(): CPU;
  getPPU(): PPU;
  getMemoryController(): MemoryController;
  getCartridge(): CartridgeController | null;
  getTimerSystem(): TimerSystem;
  getInputController(): InputController;
  getDMAController(): DMAController;
  getSystemClock(): SystemClock;

  // System state
  isRunning(): boolean;
  pause(): void;
  resume(): void;

  // Frame management
  isFrameReady(): boolean;
  getFrameBuffer(): Uint32Array;
  getFrameRate(): f32;

  // Save state management
  saveState(): GameBoyState;
  loadState(state: GameBoyState): void;

  // Save data management
  getSaveData(): Uint8Array | null;
  loadSaveData(data: Uint8Array): void;

  // Debugging interface
  getExecutionStats(): ExecutionStats;
  enableDebugging(enabled: boolean): void;
  setBreakpoint(address: u16): void;
  removeBreakpoint(address: u16): void;
}

/**
 * Complete system state
 */
interface GameBoyState {
  cpuState: CPUState;
  ppuState: PPUState;
  memoryState: MemoryState;
  cartridgeState: CartridgeState | null;
  timerState: TimerState;
  inputState: InputState;
  dmaState: DMAState;
  systemCycle: u32;
  frameCount: u32;
}

/**
 * System execution statistics
 */
interface ExecutionStats {
  totalCycles: u32;
  totalFrames: u32;
  averageFrameRate: f32;
  instructionsPerSecond: u32;
  cyclesPerSecond: u32;
}
```

## Type Definitions

### Common Types

```typescript
// Primitive types for clarity
type u8 = number; // 8-bit unsigned integer (0-255)
type u16 = number; // 16-bit unsigned integer (0-65535)
type u32 = number; // 32-bit unsigned integer
type f32 = number; // 32-bit float

// Memory address type
type Address = u16;

// Color type for display
type Color = u32; // RGBA color value

// Cycle count type
type Cycles = u32;
```

## Interface Implementation Guidelines

### 1. Performance Considerations

- Use direct array access for memory operations in hot paths
- Implement lookup tables for complex operations (instruction decoding, memory mapping)
- Minimize function call overhead in critical timing loops
- Use typed arrays (Uint8Array, Uint16Array, Uint32Array) for memory buffers

### 2. Testing Requirements

- All interfaces must be mockable for unit testing
- Component interactions must be observable at interface boundaries
- State getters/setters enable comprehensive testing without implementation exposure
- Debug interfaces provide testing hooks without affecting production performance

### 3. Error Handling

- Invalid memory access returns 0xFF (matches real hardware)
- Unsupported operations throw descriptive errors
- State validation in debug builds, direct access in production
- Graceful degradation for unsupported cartridge types

### 4. Memory Management

- No dynamic allocation during emulation execution
- Pre-allocated buffers for all memory regions
- Object pooling for frequently created/destroyed objects
- Efficient copy operations for save state management

## Validation Requirements

### Interface Compliance

All implementations must:

1. **Implement complete interface contracts** - No partial implementations
2. **Maintain timing accuracy** - Exact cycle counting for all operations
3. **Support state save/restore** - Complete state serialization capability
4. **Pass hardware test ROMs** - Blargg and Mealybug test compatibility
5. **Enable comprehensive testing** - Mockable interfaces with observable side effects

### Documentation Standards

- All public methods require JSDoc documentation
- Interface contracts specify exact behavior expectations
- Error conditions and edge cases clearly documented
- Performance characteristics noted for critical methods

This interface specification establishes the complete contract system for the Game Boy DMG emulator, ensuring component isolation, testability, and performance while maintaining architectural integrity.
