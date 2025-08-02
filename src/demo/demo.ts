/**
 * Emulator Demo - Integration showcase for EmulatorContainer and EmulatorDisplay
 *
 * Demonstrates the complete integration of the emulator components with
 * visually appealing test patterns that showcase Game Boy rendering capabilities.
 */

import { EmulatorContainer } from '../emulator/EmulatorContainer';

class EmulatorDemo {
  private container: EmulatorContainer;
  private startButton: HTMLButtonElement;
  private stopButton: HTMLButtonElement;
  private resetButton: HTMLButtonElement;
  private statusElement: HTMLElement;

  constructor() {
    // Get DOM elements
    const displayElement = document.getElementById('emulator-display');
    this.startButton = document.getElementById('start-btn') as HTMLButtonElement;
    this.stopButton = document.getElementById('stop-btn') as HTMLButtonElement;
    this.resetButton = document.getElementById('reset-btn') as HTMLButtonElement;
    this.statusElement = document.getElementById('status') as HTMLElement;

    if (
      !displayElement ||
      !this.startButton ||
      !this.stopButton ||
      !this.resetButton ||
      !this.statusElement
    ) {
      throw new Error('Required DOM elements not found');
    }

    // Initialize emulator container with debug enabled
    this.container = new EmulatorContainer(displayElement, {
      debug: true,
      display: {
        scale: 3, // 3x scaling for modern displays (480x432)
      },
    });

    this.setupEventListeners();
    this.updateStatus();

    // Show initial checkerboard pattern
    this.drawCheckerboardPattern();
  }

  private setupEventListeners(): void {
    // Lifecycle controls
    this.startButton.addEventListener('click', () => this.startEmulator());
    this.stopButton.addEventListener('click', () => this.stopEmulator());
    this.resetButton.addEventListener('click', () => this.resetEmulator());

    // Pattern demonstration buttons
    document
      .getElementById('pattern-checkerboard')
      ?.addEventListener('click', () => this.drawCheckerboardPattern());
    document
      .getElementById('pattern-gradient')
      ?.addEventListener('click', () => this.drawGradientPattern());
    document
      .getElementById('pattern-stripes')
      ?.addEventListener('click', () => this.drawStripesPattern());
    document
      .getElementById('pattern-noise')
      ?.addEventListener('click', () => this.drawNoisePattern());
    document.getElementById('pattern-clear')?.addEventListener('click', () => this.clearDisplay());
  }

  private startEmulator(): void {
    this.container.start();
    this.updateStatus();
  }

  private stopEmulator(): void {
    this.container.stop();
    this.updateStatus();
  }

  private resetEmulator(): void {
    this.container.reset();
    this.updateStatus();

    // Show checkerboard pattern after reset
    setTimeout(() => this.drawCheckerboardPattern(), 100);
  }

  private updateStatus(): void {
    const isRunning = this.container.isRunning();
    const state = this.container.getState();

    this.statusElement.textContent = `Status: ${isRunning ? 'Running' : 'Stopped'} | Frames: ${state.frameCount} | Cycles: ${state.cycleCount}`;
    this.statusElement.className = `status ${isRunning ? 'status-running' : 'status-stopped'}`;

    // Update button states
    this.startButton.disabled = isRunning;
    this.stopButton.disabled = !isRunning;
  }

  /**
   * Create Game Boy-style checkerboard pattern
   */
  private drawCheckerboardPattern(): void {
    const pixelData = new Uint8ClampedArray(160 * 144 * 4);

    for (let y = 0; y < 144; y++) {
      for (let x = 0; x < 160; x++) {
        const index = (y * 160 + x) * 4;
        const isLight = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0;

        if (isLight) {
          // Light green (Game Boy light)
          pixelData[index] = 155; // R
          pixelData[index + 1] = 188; // G
          pixelData[index + 2] = 15; // B
          pixelData[index + 3] = 255; // A
        } else {
          // Dark green (Game Boy dark)
          pixelData[index] = 15; // R
          pixelData[index + 1] = 56; // G
          pixelData[index + 2] = 15; // B
          pixelData[index + 3] = 255; // A
        }
      }
    }

    this.container.getDisplay().draw(pixelData);
  }

  /**
   * Create horizontal gradient from Game Boy green shades
   */
  private drawGradientPattern(): void {
    const pixelData = new Uint8ClampedArray(160 * 144 * 4);

    for (let y = 0; y < 144; y++) {
      for (let x = 0; x < 160; x++) {
        const index = (y * 160 + x) * 4;
        const intensity = x / 159; // 0 to 1

        // Interpolate between dark and light Game Boy green
        const r = Math.floor(15 + (155 - 15) * intensity);
        const g = Math.floor(56 + (188 - 56) * intensity);
        const b = 15;

        pixelData[index] = r; // R
        pixelData[index + 1] = g; // G
        pixelData[index + 2] = b; // B
        pixelData[index + 3] = 255; // A
      }
    }

    this.container.getDisplay().draw(pixelData);
  }

  /**
   * Create colorful vertical stripes
   */
  private drawStripesPattern(): void {
    const pixelData = new Uint8ClampedArray(160 * 144 * 4);
    const stripeWidth = 16;
    const colors = [
      [155, 188, 15], // Game Boy light green
      [107, 160, 15], // Medium green
      [57, 112, 15], // Medium-dark green
      [15, 56, 15], // Dark green
      [139, 172, 15], // Variant light
      [82, 138, 15], // Variant medium
    ];

    for (let y = 0; y < 144; y++) {
      for (let x = 0; x < 160; x++) {
        const index = (y * 160 + x) * 4;
        const stripeIndex = Math.floor(x / stripeWidth) % colors.length;
        const color = colors[stripeIndex];

        pixelData[index] = color[0]; // R
        pixelData[index + 1] = color[1]; // G
        pixelData[index + 2] = color[2]; // B
        pixelData[index + 3] = 255; // A
      }
    }

    this.container.getDisplay().draw(pixelData);
  }

  /**
   * Create colorful noise pattern
   */
  private drawNoisePattern(): void {
    const pixelData = new Uint8ClampedArray(160 * 144 * 4);
    const baseColors = [
      [155, 188, 15], // Light green
      [107, 160, 15], // Medium green
      [57, 112, 15], // Medium-dark green
      [15, 56, 15], // Dark green
    ];

    for (let i = 0; i < pixelData.length; i += 4) {
      const colorIndex = Math.floor(Math.random() * baseColors.length);
      const color = baseColors[colorIndex];
      const brightness = 0.7 + Math.random() * 0.3; // Add some brightness variation

      pixelData[i] = Math.floor(color[0] * brightness); // R
      pixelData[i + 1] = Math.floor(color[1] * brightness); // G
      pixelData[i + 2] = Math.floor(color[2] * brightness); // B
      pixelData[i + 3] = 255; // A
    }

    this.container.getDisplay().draw(pixelData);
  }

  /**
   * Clear display to black
   */
  private clearDisplay(): void {
    const pixelData = new Uint8ClampedArray(160 * 144 * 4);
    // All pixels default to black (0, 0, 0, 0)
    this.container.getDisplay().draw(pixelData);
  }
}

// Initialize demo when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    new EmulatorDemo();
  } catch (error) {
    throw new Error(`Failed to initialize emulator demo: ${error}`);
  }
});
