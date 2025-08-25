/**
 * EmulatorContainer - Central component manager for Game Boy emulator
 *
 * Manages lifecycle of all emulator components (CPU, PPU, Memory, Display, etc.)
 * and enables inter-component communication through constructor dependency injection.
 * Uses mutable state architecture for optimal performance as validated in performance POC.
 */

import { EmulatorDisplay } from './display/EmulatorDisplay';
import { PPURenderingPipeline } from './display/PPURenderingPipeline';
import { DisplayControlPanel } from './display/DisplayControlPanel';
import { MMU } from './mmu/MMU';
import { SerialInterface } from './mmu/SerialInterface';
import { Timer } from './mmu/Timer';
import { CPU } from './cpu/CPU';
import type {
  ComponentContainer,
  CPUComponent,
  PPUComponent,
  MemoryComponent,
  MMUComponent,
  DMAComponent,
  CartridgeComponent,
  DisplayComponent,
  SerialInterfaceComponent,
  TimerComponent,
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
  private renderingPipeline!: PPURenderingPipeline; // Definite assignment assertion - initialized in constructor
  private displayControls!: DisplayControlPanel; // Definite assignment assertion - initialized in constructor
  private cpuComponent!: CPUComponent; // Definite assignment assertion - initialized in constructor
  private ppuComponent: PPUComponent | undefined;
  private memoryComponent: MemoryComponent | undefined;
  private mmuComponent: MMUComponent | undefined;
  private dmaComponent: DMAComponent | undefined;
  private cartridgeComponent: CartridgeComponent | undefined;
  private serialInterfaceComponent: SerialInterfaceComponent | undefined;
  private timerComponent: TimerComponent | undefined;

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

    // 2. Initialize PPU rendering pipeline with display component
    this.renderingPipeline = new PPURenderingPipeline(this.displayComponent);

    // 3. Initialize display control panel with display and pipeline
    this.displayControls = new DisplayControlPanel(this.displayComponent, this.renderingPipeline);

    // 4. Load display settings from localStorage
    this.displayControls.loadSettings();

    // 5. Initialize MMU component (needed for interrupt requests)
    this.mmuComponent = new MMU();

    // 6. Initialize Serial Interface component with interrupt callback
    this.serialInterfaceComponent = new SerialInterface(this.config.debug, (interrupt: number) =>
      this.mmuComponent?.requestInterrupt(interrupt)
    );

    // 7. Initialize Timer component with interrupt callback
    this.timerComponent = new Timer((interrupt: number) =>
      this.mmuComponent?.requestInterrupt(interrupt)
    );

    // 8. Wire Serial Interface and Timer to MMU for register delegation
    this.mmuComponent.setSerialInterface(this.serialInterfaceComponent);
    this.mmuComponent.setTimer(this.timerComponent);

    // 9. Set MMU to post-boot state (implements ADR-001)
    this.mmuComponent.setPostBootState();

    // 10. Initialize CPU component with MMU dependency
    this.cpuComponent = new CPU(this.mmuComponent);

    // Other components remain undefined until implemented
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

    // Auto-save display settings when stopping
    this.saveDisplaySettings();
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
    this.serialInterfaceComponent?.reset();
    this.timerComponent?.reset();
    this.cpuComponent?.reset();
    this.ppuComponent?.reset();
    this.memoryComponent?.reset();
    this.dmaComponent?.reset();
    this.cartridgeComponent?.reset();

    // Hide display controls after reset
    this.displayControls.hide();
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
   * Get CPU component instance
   */
  public getCPU(): CPUComponent {
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
   * Get Serial Interface component instance
   */
  public getSerialInterface(): SerialInterfaceComponent | undefined {
    return this.serialInterfaceComponent;
  }

  /**
   * Get Timer component instance
   */
  public getTimer(): TimerComponent | undefined {
    return this.timerComponent;
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
   * @returns Number of CPU cycles executed
   */
  public step(): number {
    if (!this.state.running) {
      return 0;
    }

    // Execute CPU instruction and get cycles consumed
    const cycles = this.cpuComponent.step();

    // Update system cycle count
    this.state.cycleCount += cycles;

    // Update Serial Interface with cycles for timing-based operations
    if (this.serialInterfaceComponent) {
      // Pass CPU cycles to Serial Interface for hardware-accurate timing
      this.serialInterfaceComponent.step(cycles);
    }

    // Update Timer with cycles for hardware-accurate timing
    if (this.timerComponent) {
      // Pass CPU cycles to Timer for DIV and TIMA updates
      this.timerComponent.step(cycles);
    }

    // Update PPU and check for frame rendering
    if (this.ppuComponent) {
      // Step PPU with CPU cycles for timing synchronization
      this.ppuComponent.step(cycles);

      // Check if frame is ready for rendering
      if (this.ppuComponent.isFrameReady()) {
        const frameBuffer = this.ppuComponent.getFrameBuffer();
        if (frameBuffer) {
          // Convert raw PPU frame buffer to RGBA through rendering pipeline
          this.renderingPipeline.renderFrame(frameBuffer);
        }
      }
    }

    return cycles;
  }

  /**
   * Get configuration
   */
  public getConfig(): Readonly<EmulatorContainerConfig> {
    return Object.freeze({ ...this.config });
  }

  // ===============================
  // PPU Rendering Pipeline Methods
  // ===============================

  /**
   * Get PPU rendering pipeline component
   */
  public getRenderingPipeline(): PPURenderingPipeline {
    return this.renderingPipeline;
  }

  /**
   * Get display control panel component
   */
  public getDisplayControls(): DisplayControlPanel {
    return this.displayControls;
  }

  /**
   * Render frame buffer to display
   */
  public renderFrame(frameBuffer: Uint8Array): void {
    this.renderingPipeline.renderFrame(frameBuffer);
  }

  /**
   * Get rendering statistics
   */
  public getRenderingStats(): import('./display/PPURenderingPipeline').RenderingStats {
    return this.renderingPipeline.getRenderingStats();
  }

  /**
   * Save display settings to localStorage
   */
  public saveDisplaySettings(): void {
    this.displayControls.saveSettings();
  }

  /**
   * Reset display settings to defaults
   */
  public resetDisplaySettings(): void {
    this.displayControls.resetSettings();
  }

  /**
   * Set PPU component for integration
   */
  public setPPUComponent(ppu?: PPUComponent): void {
    this.ppuComponent = ppu;
  }

  /**
   * Set frame rate target for rendering coordination
   */
  private frameRateTarget = 59.7; // Default Game Boy frame rate

  public setFrameRateTarget(fps: number): void {
    this.frameRateTarget = fps;
  }

  /**
   * Get frame rate target
   */
  public getFrameRateTarget(): number {
    return this.frameRateTarget;
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    frameRenderTime: number;
    bufferReuses: number;
    allocations: number;
  } {
    const pipelineStats = this.renderingPipeline.getPerformanceStats();
    const renderingStats = this.renderingPipeline.getRenderingStats();

    return {
      frameRenderTime: renderingStats.averageFrameTime,
      bufferReuses: pipelineStats.bufferReuses,
      allocations: pipelineStats.allocations,
    };
  }

  /**
   * Get performance recommendations
   */
  public getPerformanceRecommendations(): import('./display/DisplayControlPanel').PerformanceRecommendation[] {
    return this.displayControls.getPerformanceRecommendations();
  }
}
