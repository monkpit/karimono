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
   */
  step(): void;

  /**
   * Get current program counter value
   */
  getPC(): number;

  /**
   * Get CPU register values
   */
  getRegisters(): CPURegisters;
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
}

/**
 * PPU (Picture Processing Unit) component interface
 */
export interface PPUComponent extends RunnableComponent {
  /**
   * Render current frame to display
   */
  render(): void;

  /**
   * Get current PPU mode
   */
  getMode(): PPUModeType;
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
}
