/**
 * TypeScript interfaces and types for emulator components
 *
 * Defines the contracts and interfaces for inter-component communication
 * and dependency injection patterns used throughout the emulator.
 */

/* eslint-disable no-unused-vars */

/**
 * Base interface for all emulator components
 * Provides common lifecycle and state management methods
 */
export interface EmulatorComponent {
  /**
   * Reset component to initial state
   */
  reset(): void;
}

/**
 * Interface for components that can be started and stopped
 */
export interface RunnableComponent extends EmulatorComponent {
  /**
   * Start component operation
   */
  start(): void;

  /**
   * Stop component operation
   */
  stop(): void;

  /**
   * Check if component is currently running
   */
  isRunning(): boolean;
}

/**
 * CPU component interface - defines contract for future CPU implementation
 */
export interface CPUComponent extends RunnableComponent {
  /**
   * Execute a single CPU instruction
   * @returns Number of cycles consumed by the instruction
   */
  step(): number;

  /**
   * Get current program counter value
   */
  getPC(): number;

  /**
   * Check if CPU is currently halted
   */
  isHalted(): boolean;

  /**
   * Trigger an interrupt (simplified for testing)
   */
  triggerInterrupt(address: number): void;
  /**
   * Get debug information about current CPU state
   */
  getDebugInfo(): string;

  // Flag register access methods
  /**
   * Get zero flag state (bit 7 of F register)
   */
  getZeroFlag(): boolean;

  /**
   * Get subtract flag state (bit 6 of F register)
   */
  getSubtractFlag(): boolean;

  /**
   * Get half-carry flag state (bit 5 of F register)
   */
  getHalfCarryFlag(): boolean;

  /**
   * Get carry flag state (bit 4 of F register)
   */
  getCarryFlag(): boolean;
}

/**
 * CPU testing interface - extends CPUComponent with testing-specific methods
 * Used for test setup and verification without polluting production interface
 */
export interface CPUTestingComponent extends CPUComponent {
  /**
   * Get CPU register values (TEMPORARY - for refactor transition)
   * TODO: Remove when all tests use proper boundary observation patterns
   */
  getRegisters(): CPURegisters;

  /**
   * Get A register value (for test setup convenience)
   * @deprecated Prefer getRegisters().a for clarity. To be removed.
   */
  getRegisterA(): number;

  // Register manipulation methods for testing
  /**
   * Set A register value (for test setup)
   */
  setRegisterA(value: number): void;

  /**
   * Set B register value (for test setup)
   */
  setRegisterB(value: number): void;

  /**
   * Set C register value (for test setup)
   */
  setRegisterC(value: number): void;

  /**
   * Set D register value (for test setup)
   */
  setRegisterD(value: number): void;

  /**
   * Set E register value (for test setup)
   */
  setRegisterE(value: number): void;

  /**
   * Set F register value (for test setup)
   */
  setRegisterF(value: number): void;

  /**
   * Set H register value (for test setup)
   */
  setRegisterH(value: number): void;

  /**
   * Set L register value (for test setup)
   */
  setRegisterL(value: number): void;

  /**
   * Set stack pointer value (for test setup)
   */
  setStackPointer(value: number): void;

  /**
   * Set program counter value (for test setup)
   */
  setProgramCounter(value: number): void;

  // Flag manipulation methods for testing
  /**
   * Set zero flag state (for test setup)
   */
  setZeroFlag(state: boolean): void;

  /**
   * Set subtract flag state (for test setup)
   */
  setSubtractFlag(state: boolean): void;

  /**
   * Set half-carry flag state (for test setup)
   */
  setHalfCarryFlag(state: boolean): void;

  /**
   * Set carry flag state (for test setup)
   */
  setCarryFlag(state: boolean): void;
}

/**
 * CPU register state
 */
export interface CPURegisters {
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
  setHL?: (value: number) => void; // Testing helper method
}

/**
 * PPU (Picture Processing Unit) component interface
 */
export interface PPUComponent extends RunnableComponent {
  /**
   * Update PPU state for the given number of CPU cycles
   * @param cycles Number of CPU cycles to advance PPU timing
   */
  step(cycles: number): void;

  /**
   * Render current frame to display
   */
  render(): void;

  /**
   * Get current PPU mode
   */
  getMode(): PPUModeType;

  /**
   * Check if a frame is ready for rendering
   */
  isFrameReady(): boolean;

  /**
   * Get the current frame buffer (raw PPU data - will be processed by rendering pipeline)
   */
  getFrameBuffer(): Uint8Array | null;
}

/**
 * PPU modes according to Game Boy specifications
 */
export const PPUMode = {
  HBlank: 0,
  VBlank: 1,
  OAMScan: 2,
  Drawing: 3,
} as const;

export type PPUModeType = (typeof PPUMode)[keyof typeof PPUMode];

/**
 * Memory component interface
 */
export interface MemoryComponent extends EmulatorComponent {
  /**
   * Read byte from memory address
   */
  readByte(_address: number): number;

  /**
   * Write byte to memory address
   */
  writeByte(_address: number, _value: number): void;

  /**
   * Read 16-bit word from memory address (little-endian)
   */
  readWord(_address: number): number;

  /**
   * Write 16-bit word to memory address (little-endian)
   */
  writeWord(_address: number, _value: number): void;

  /**
   * Get memory size in bytes
   */
  getSize(): number;
}

/**
 * MMU state snapshot for testing and debugging
 */
export interface MMUSnapshot {
  /** Boot ROM is currently enabled and overlaying memory */
  bootROMEnabled: boolean;
  /** Current ROM bank in switchable area (0x4000-0x7FFF) */
  currentROMBank: number;
  /** Current RAM bank in external RAM area (0xA000-0xBFFF) */
  currentRAMBank: number;
  /** External cartridge RAM is currently enabled */
  ramEnabled: boolean;
  /** MBC1 banking mode: 0 = simple banking, 1 = advanced banking */
  bankingMode: number;
}

/**
 * Memory Management Unit interface
 * Extends MemoryComponent with MMU-specific functionality
 */
export interface MMUComponent extends MemoryComponent {
  /**
   * Load cartridge for ROM/RAM bank switching
   */
  loadCartridge(_cartridge: CartridgeComponent | undefined): void;

  /**
   * Get snapshot of current MMU state for testing/debugging
   */
  getSnapshot(): MMUSnapshot;

  /**
   * Load boot ROM data for boot sequence
   */
  loadBootROM(_bootROMData: Uint8Array): void;

  /**
   * Set MMU to post-boot hardware state
   * Implements ADR-001 requirement for components to initialize to post-boot state
   * Sets boot ROM disabled and initializes I/O registers to exact hardware values
   */
  setPostBootState(): void;

  /**
   * Set Serial Interface component for register delegation
   */
  setSerialInterface(_serialInterface: SerialInterfaceComponent): void;

  /**
   * Set Timer component for register delegation
   */
  setTimer(_timer: TimerComponent): void;

  /**
   * Request an interrupt to be raised
   * @param interrupt Interrupt bit (0-4: VBlank, LCDC, Timer, Serial, Joypad)
   */
  requestInterrupt(interrupt: number): void;

  /**
   * Advance MMU timing by specified CPU cycles
   * Updates LCD timing (LY register) and other hardware state
   * @param cycles Number of CPU cycles to advance
   */
  step(cycles: number): void;
}

/**
 * DMA component interface for memory transfers
 */
export interface DMAComponent extends EmulatorComponent {
  /**
   * Check if DMA transfer is currently active
   */
  isActive(): boolean;

  /**
   * Start DMA transfer from source page to OAM
   */
  startTransfer(_sourcePage: number): void;

  /**
   * Step DMA transfer by one cycle
   */
  step(): void;
}

/**
 * Cartridge component interface for ROM/RAM management
 */
export interface CartridgeComponent extends EmulatorComponent {
  /**
   * Read from ROM at address
   */
  readROM(_address: number): number;

  /**
   * Read from cartridge RAM at address
   */
  readRAM(_address: number): number;

  /**
   * Write to cartridge RAM at address
   */
  writeRAM(_address: number, _value: number): void;

  /**
   * Handle MBC register write
   */
  writeMBCRegister(_address: number, _value: number): void;

  /**
   * Get cartridge header information
   */
  getHeader(): CartridgeHeader;

  /**
   * Get current cartridge state for debugging and MMU snapshot
   */
  getState(): {
    rom: Uint8Array;
    ram: Uint8Array;
    banking: {
      currentROMBank: number;
      currentRAMBank: number;
      ramEnabled: boolean;
      bankingMode: number;
    };
  };
}

/**
 * Cartridge header information
 */
export interface CartridgeHeader {
  title: string;
  mbcType: number;
  romSize: number;
  ramSize: number;
  checksumValid: boolean;
}

/**
 * Component access pattern for dependency resolution
 */
export interface ComponentAccessPattern {
  /**
   * Request component access with late binding
   */
  requestComponent<T>(_type: string): T | undefined;

  /**
   * Register component for late binding resolution
   */
  registerComponent<T>(_type: string, _component: T): void;
}

/**
 * Display component interface (satisfied by EmulatorDisplay)
 */
export interface DisplayComponent {
  /**
   * Draw pixel data to display
   */
  draw(_pixelData: Uint8ClampedArray): void;
}

/**
 * Configuration for EmulatorContainer initialization
 */
export interface EmulatorContainerConfig {
  /**
   * Display configuration options
   */
  display?: {
    width?: number;
    height?: number;
    scale?: number;
  };

  /**
   * Enable debug mode for additional logging and validation
   */
  debug?: boolean;

  /**
   * Frame rate limit for emulation (default: 60 FPS)
   */
  frameRate?: number;
}

/**
 * Emulator state representation using mutable architecture
 */
export interface EmulatorState {
  /**
   * Is emulator currently running
   */
  running: boolean;

  /**
   * Current frame count since start
   */
  frameCount: number;

  /**
   * Current CPU cycle count
   */
  cycleCount: number;

  /**
   * Timestamp of last frame render
   */
  lastFrameTime: number;
}

/**
 * Serial Interface component for hardware-accurate Game Boy serial communication
 */
export interface SerialInterfaceComponent extends EmulatorComponent {
  /**
   * Read serial data register (SB - 0xFF01)
   */
  readSB(): number;

  /**
   * Write serial data register (SB - 0xFF01)
   */
  writeSB(value: number): void;

  /**
   * Read serial control register (SC - 0xFF02)
   */
  readSC(): number;

  /**
   * Write serial control register (SC - 0xFF02)
   */
  writeSC(value: number): void;

  /**
   * Check if serial transfer is currently active
   */
  isTransferActive(): boolean;

  /**
   * Process serial timing during CPU execution
   * @param cpuCycles Number of CPU cycles to advance
   */
  step(cpuCycles: number): void;

  /**
   * Get captured serial output for test ROM validation
   */
  getOutputBuffer(): string;

  /**
   * Clear the serial output buffer
   */
  clearOutputBuffer(): void;
}

/**
 * Timer component for hardware-accurate Game Boy timer system
 * Implements DIV, TIMA, TMA, and TAC registers with cycle-accurate timing
 */
export interface TimerComponent extends EmulatorComponent {
  /**
   * Advance timer system by specified CPU cycles
   * @param cycles Number of CPU cycles to advance
   */
  step(cycles: number): void;

  /**
   * Read DIV register (0xFF04) - Divider
   */
  readDIV(): number;

  /**
   * Write DIV register (0xFF04) - resets internal counter
   */
  writeDIV(value: number): void;

  /**
   * Read TIMA register (0xFF05) - Timer Counter
   */
  readTIMA(): number;

  /**
   * Write TIMA register (0xFF05) - Timer Counter
   */
  writeTIMA(value: number): void;

  /**
   * Read TMA register (0xFF06) - Timer Modulo
   */
  readTMA(): number;

  /**
   * Write TMA register (0xFF06) - Timer Modulo
   */
  writeTMA(value: number): void;

  /**
   * Read TAC register (0xFF07) - Timer Control
   */
  readTAC(): number;

  /**
   * Write TAC register (0xFF07) - Timer Control
   */
  writeTAC(value: number): void;
}

/**
 * Component dependency injection container
 * Manages creation order and inter-component references
 */
export interface ComponentContainer {
  /**
   * Get display component instance
   */
  getDisplay(): DisplayComponent;

  /**
   * Get CPU component instance (undefined until implemented)
   */
  getCPU(): CPUComponent | undefined;

  /**
   * Get PPU component instance (undefined until implemented)
   */
  getPPU(): PPUComponent | undefined;

  /**
   * Get MMU component instance (undefined until implemented)
   */
  getMMU(): MMUComponent | undefined;

  /**
   * Get DMA component instance (undefined until implemented)
   */
  getDMA(): DMAComponent | undefined;

  /**
   * Get Cartridge component instance (undefined until implemented)
   */
  getCartridge(): CartridgeComponent | undefined;

  /**
   * Get Serial Interface component instance (undefined until implemented)
   */
  getSerialInterface(): SerialInterfaceComponent | undefined;

  /**
   * Get Timer component instance (undefined until implemented)
   */
  getTimer(): TimerComponent | undefined;
}
