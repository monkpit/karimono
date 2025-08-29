/**
 * EmulatorControls - Game Boy emulator control interface
 *
 * Provides play/pause/reset functionality and ROM loading interface
 * for the Game Boy emulator with clean integration to EmulatorContainer.
 */

import { ROMLoader } from './ROMLoader';

export interface EmulatorContainerInterface {
  start(): void;
  stop(): void;
  reset(): void;
  isRunning(): boolean;
  getState(): {
    running: boolean;
    frameCount: number;
    cycleCount: number;
    lastFrameTime: number;
  };
  // eslint-disable-next-line no-unused-vars
  loadROM?(romData: Uint8Array, filename: string): void;
}

/**
 * Emulator controls component with play/pause/reset and ROM loading
 */
export class EmulatorControls {
  private container: HTMLElement;
  private emulator: EmulatorContainerInterface;
  private controlsContainer!: HTMLElement; // Definite assignment - initialized in createUI()
  private playPauseButton!: HTMLButtonElement; // Definite assignment - initialized in createUI()
  private resetButton!: HTMLButtonElement; // Definite assignment - initialized in createUI()
  private loadROMButton!: HTMLButtonElement; // Definite assignment - initialized in createUI()
  private statusElement!: HTMLElement; // Definite assignment - initialized in createUI()
  private romLoaderContainer: HTMLElement | null = null;
  private romLoader: ROMLoader | null = null;

  /**
   * Create emulator controls component
   */
  constructor(container: HTMLElement | null, emulator: EmulatorContainerInterface | null) {
    if (!container) {
      throw new Error('Container element is required');
    }
    if (!emulator) {
      throw new Error('Emulator container is required');
    }

    this.container = container;
    this.emulator = emulator;

    this.createUI();
    this.setupEventListeners();
    this.updateControlStates();
    this.updateStatus();
  }

  /**
   * Create the controls UI elements
   */
  private createUI(): void {
    // Create main controls container
    this.controlsContainer = document.createElement('div');
    this.controlsContainer.className = 'emulator-controls';

    // Create play/pause button
    this.playPauseButton = document.createElement('button');
    this.playPauseButton.className = 'control-button play-pause';
    this.playPauseButton.textContent = '▶ Play';

    // Create reset button
    this.resetButton = document.createElement('button');
    this.resetButton.className = 'control-button reset';
    this.resetButton.textContent = '🔄 Reset';

    // Create load ROM button
    this.loadROMButton = document.createElement('button');
    this.loadROMButton.className = 'control-button load-rom';
    this.loadROMButton.textContent = '📁 Load ROM';

    // Add buttons to controls container
    this.controlsContainer.appendChild(this.playPauseButton);
    this.controlsContainer.appendChild(this.resetButton);
    this.controlsContainer.appendChild(this.loadROMButton);

    // Create status element
    this.statusElement = document.createElement('div');
    this.statusElement.className = 'emulator-status';

    // Add all elements to main container
    this.container.appendChild(this.controlsContainer);
    this.container.appendChild(this.statusElement);

    // Add styles
    this.addStyles();
  }

  /**
   * Add CSS styles for the controls
   */
  private addStyles(): void {
    // Skip style injection in test environment
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    // Only add styles if document.head is available (browser environment)
    if (!document.head) {
      return;
    }

    // Check if styles already exist
    if (document.head.querySelector('[data-emulator-controls-styles]')) {
      return;
    }

    const style = document.createElement('style');
    style.setAttribute('data-emulator-controls-styles', 'true');
    style.textContent = `
      .emulator-controls {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        justify-content: center;
        flex-wrap: wrap;
      }

      .control-button {
        background: #333;
        color: #00ff00;
        border: 1px solid #00ff00;
        padding: 10px 20px;
        cursor: pointer;
        border-radius: 5px;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        transition: all 0.3s;
        min-width: 100px;
      }

      .control-button:hover {
        background: #00ff00;
        color: #000;
      }

      .control-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .control-button:disabled:hover {
        background: #333;
        color: #00ff00;
      }

      .emulator-status {
        text-align: center;
        font-family: 'Courier New', monospace;
        color: #00ff00;
        background: #1a1a1a;
        padding: 10px;
        border-radius: 5px;
        border: 1px solid #444;
        margin-bottom: 20px;
      }

      .rom-loader-container {
        margin-top: 20px;
        padding: 20px;
        background: #2a2a2a;
        border-radius: 10px;
        border: 1px solid #444;
      }

      .rom-loader-header {
        text-align: center;
        color: #00ff00;
        font-family: 'Courier New', monospace;
        font-size: 18px;
        margin-bottom: 15px;
      }

      .rom-loader-actions {
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-top: 15px;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Set up event listeners for controls
   */
  private setupEventListeners(): void {
    // Play/pause button
    this.playPauseButton.addEventListener('click', this.handlePlayPause.bind(this));

    // Reset button
    this.resetButton.addEventListener('click', this.handleReset.bind(this));

    // Load ROM button
    this.loadROMButton.addEventListener('click', this.handleLoadROM.bind(this));
  }

  /**
   * Handle play/pause button click
   */
  private handlePlayPause(): void {
    if (this.emulator.isRunning()) {
      this.emulator.stop();
    } else {
      this.emulator.start();
    }
    this.updateControlStates();
    this.updateStatus();
  }

  /**
   * Handle reset button click
   */
  private handleReset(): void {
    this.emulator.reset();
    this.updateControlStates();
    this.updateStatus();
  }

  /**
   * Handle load ROM button click
   */
  private handleLoadROM(): void {
    this.showROMLoader();
  }

  /**
   * Update control button states based on emulator state
   */
  public updateControlStates(): void {
    const isRunning = this.emulator.isRunning();

    if (isRunning) {
      this.playPauseButton.textContent = '⏸ Pause';
      this.playPauseButton.className = 'control-button pause';
    } else {
      this.playPauseButton.textContent = '▶ Play';
      this.playPauseButton.className = 'control-button play';
    }
  }

  /**
   * Update status display
   */
  public updateStatus(): void {
    const state = this.emulator.getState();
    const isRunning = this.emulator.isRunning();

    this.statusElement.textContent = `Status: ${isRunning ? 'Running' : 'Stopped'} | Frames: ${state.frameCount} | Cycles: ${state.cycleCount}`;
  }

  /**
   * Show ROM loader interface
   */
  public showROMLoader(): void {
    if (!this.romLoaderContainer) {
      this.createROMLoader();
    }

    if (this.romLoaderContainer) {
      this.container.appendChild(this.romLoaderContainer);
    }
  }

  /**
   * Hide ROM loader interface
   */
  public hideROMLoader(): void {
    if (this.romLoaderContainer && this.container.contains(this.romLoaderContainer)) {
      this.container.removeChild(this.romLoaderContainer);
    }
  }

  /**
   * Create ROM loader interface
   */
  private createROMLoader(): void {
    this.romLoaderContainer = document.createElement('div');
    this.romLoaderContainer.className = 'rom-loader-container';

    const header = document.createElement('div');
    header.className = 'rom-loader-header';
    header.textContent = 'Load Game Boy ROM';

    const romLoaderElement = document.createElement('div');

    const actions = document.createElement('div');
    actions.className = 'rom-loader-actions';

    const cancelButton = document.createElement('button');
    cancelButton.className = 'control-button';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', () => this.hideROMLoader());

    actions.appendChild(cancelButton);

    this.romLoaderContainer.appendChild(header);
    this.romLoaderContainer.appendChild(romLoaderElement);
    this.romLoaderContainer.appendChild(actions);

    // Create ROMLoader instance
    this.romLoader = new ROMLoader(romLoaderElement, this.handleROMLoad.bind(this));

    // Keep reference for potential cleanup
    void this.romLoader;
  }

  /**
   * Handle ROM loading
   */
  public async handleROMLoad(romData: Uint8Array, filename: string): Promise<void> {
    try {
      if (this.emulator.loadROM) {
        this.emulator.loadROM(romData, filename);
      }

      // Hide ROM loader after successful load
      this.hideROMLoader();

      // Update controls after ROM load
      this.updateControlStates();
      this.updateStatus();
    } catch {
      // Error handling - could display error message to user
      // For now, silently handle the error
    }
  }
}
