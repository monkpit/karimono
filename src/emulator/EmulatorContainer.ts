/**
 * EmulatorContainer - Central component manager for Game Boy emulator
 *
 * Manages lifecycle of all emulator components (CPU, PPU, Memory, Display, etc.)
 * and enables inter-component communication through constructor dependency injection.
 * Uses mutable state architecture for optimal performance as validated in performance POC.
 */

import { EmulatorDisplay } from './display/EmulatorDisplay';
import { MMU } from './mmu/MMU';
import type {
  ComponentContainer,
  CPUComponent,
  PPUComponent,
  MemoryComponent,
  MMUComponent,
  DMAComponent,
  CartridgeComponent,
  DisplayComponent,
  EmulatorContainerConfig,
  EmulatorState,
  RunnableComponent,
} from './types';

/**
 * Central emulator container that manages all components using composition pattern
 */
export class EmulatorContainer implements RunnableComponent, ComponentContainer {
  // Component instances (private for encapsulation)
  private displayComponent!: EmulatorDisplay; // Definite assignment assertion - initialized in constructor
  private cpuComponent: CPUComponent | undefined;
  private ppuComponent: PPUComponent | undefined;
  private memoryComponent: MemoryComponent | undefined;
  private mmuComponent: MMUComponent | undefined;
  private dmaComponent: DMAComponent | undefined;
  private cartridgeComponent: CartridgeComponent | undefined;

  // Mutable state for performance (following performance POC findings)
  private state: EmulatorState;

  // Configuration
  private config: EmulatorContainerConfig;

  /**
   * Create emulator container with specified parent element for display
   */
  constructor(parentElement: HTMLElement | null, config: EmulatorContainerConfig = {}) {
    if (!parentElement) {
      throw new Error('Parent element is required');
    }

    this.config = config;

    // Initialize mutable state
    this.state = {
      running: false,
      frameCount: 0,
      cycleCount: 0,
      lastFrameTime: 0,
    };

    // Initialize components in dependency order
    this.initializeComponents(parentElement);
  }

  /**
   * Initialize all emulator components in correct dependency order
   */
  private initializeComponents(parentElement: HTMLElement): void {
    // 1. Initialize Display component first (no dependencies)
    this.displayComponent = new EmulatorDisplay(parentElement, this.config.display);

    // 2. Initialize MMU component (no dependencies, needed by CPU)
    this.mmuComponent = new MMU();

    // Other components remain undefined until implemented
    this.cpuComponent = undefined;
    this.ppuComponent = undefined;
    this.memoryComponent = undefined;
    this.dmaComponent = undefined;
    this.cartridgeComponent = undefined;
  }

  /**
   * Start emulation
   */
  public start(): void {
    if (this.state.running) {
      // Already running, no need to start again
      return;
    }

    this.state.running = true;
    this.state.lastFrameTime = performance.now();
  }

  /**
   * Stop emulation
   */
  public stop(): void {
    if (!this.state.running) {
      // Already stopped, no need to stop again
      return;
    }

    this.state.running = false;
  }

  /**
   * Reset emulation to initial state
   */
  public reset(): void {
    // Stop emulation first
    this.stop();

    // Reset mutable state
    this.state.running = false;
    this.state.frameCount = 0;
    this.state.cycleCount = 0;
    this.state.lastFrameTime = 0;

    // Reset all components
    this.resetDisplayComponent();
    this.mmuComponent?.reset();
    this.cpuComponent?.reset();
    this.ppuComponent?.reset();
    this.memoryComponent?.reset();
    this.dmaComponent?.reset();
    this.cartridgeComponent?.reset();
  }

  /**
   * Reset display component by clearing the screen
   */
  private resetDisplayComponent(): void {
    const emptyPixelData = new Uint8ClampedArray(160 * 144 * 4);
    this.displayComponent.draw(emptyPixelData);
  }

  /**
   * Check if emulator is currently running
   */
  public isRunning(): boolean {
    return this.state.running;
  }

  /**
   * Get display component instance
   */
  public getDisplay(): DisplayComponent {
    return this.displayComponent;
  }

  /**
   * Get CPU component instance (undefined until implemented)
   */
  public getCPU(): CPUComponent | undefined {
    return this.cpuComponent;
  }

  /**
   * Get PPU component instance (undefined until implemented)
   */
  public getPPU(): PPUComponent | undefined {
    return this.ppuComponent;
  }

  /**
   * Get Memory component instance (undefined until implemented)
   */
  public getMemory(): MemoryComponent | undefined {
    return this.memoryComponent;
  }

  /**
   * Get MMU component instance
   */
  public getMMU(): MMUComponent {
    if (!this.mmuComponent) {
      throw new Error('MMU component not initialized');
    }
    return this.mmuComponent;
  }

  /**
   * Get DMA component instance (undefined until implemented)
   */
  public getDMA(): DMAComponent | undefined {
    return this.dmaComponent;
  }

  /**
   * Get Cartridge component instance (undefined until implemented)
   */
  public getCartridge(): CartridgeComponent | undefined {
    return this.cartridgeComponent;
  }

  /**
   * Get current emulator state (read-only snapshot)
   */
  public getState(): Readonly<EmulatorState> {
    // Return read-only view of mutable state
    return Object.freeze({ ...this.state });
  }

  /**
   * Get current frame count
   */
  public getFrameCount(): number {
    return this.state.frameCount;
  }

  /**
   * Get current cycle count
   */
  public getCycleCount(): number {
    return this.state.cycleCount;
  }

  /**
   * Execute single emulation step (for manual stepping/debugging)
   */
  public step(): void {
    if (!this.state.running) {
      return;
    }

    this.state.cycleCount++;
  }

  /**
   * Get configuration
   */
  public getConfig(): Readonly<EmulatorContainerConfig> {
    return Object.freeze({ ...this.config });
  }
}
