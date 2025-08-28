/**
 * ROM Loading Demo - Complete emulator interface with ROM loading
 *
 * Demonstrates the full integration of EmulatorContainer with ROM loading,
 * EmulatorControls, and InputHandler for a complete Game Boy emulator experience.
 */

import { EmulatorContainer } from '../emulator/EmulatorContainer';
import { EmulatorControls } from '../emulator/ui/EmulatorControls';
import { InputHandler, GameBoyButton } from '../emulator/ui/InputHandler';

class ROMLoadingDemo {
  private container: EmulatorContainer;
  private controls: EmulatorControls;
  private inputHandler: InputHandler;

  constructor() {
    // Get DOM elements
    const displayElement = document.getElementById('emulator-display');
    const controlsElement = document.getElementById('emulator-controls');

    if (!displayElement || !controlsElement) {
      throw new Error('Required DOM elements not found');
    }

    // Initialize emulator container
    this.container = new EmulatorContainer(displayElement, {
      debug: false,
      display: {
        scale: 3, // 3x scaling for modern displays
      },
    });

    // Initialize emulator controls with ROM loading capability
    this.controls = new EmulatorControls(controlsElement, this.container);

    // Initialize input handler for keyboard controls
    this.inputHandler = new InputHandler({
      // eslint-disable-next-line no-unused-vars
      setButtonPressed: (_button: GameBoyButton, _pressed: boolean): void => {
        // For now, just log the button presses until we have a proper input system
        // TODO: Implement proper input handling
      },
    });

    // Update status periodically
    this.startStatusUpdater();
  }

  /**
   * Start periodic status updates
   */
  private startStatusUpdater(): void {
    const updateInterval = 100; // Update every 100ms

    setInterval(() => {
      this.controls.updateStatus();
      this.controls.updateControlStates();
    }, updateInterval);
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.inputHandler?.destroy();
  }
}

// Initialize demo when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    const demo = new ROMLoadingDemo();

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      demo.destroy();
    });
  } catch (error) {
    // Handle initialization error silently or display to user
    const errorElement = document.createElement('div');
    errorElement.textContent = `Failed to initialize ROM loading demo: ${error}`;
    errorElement.style.color = 'red';
    document.body.appendChild(errorElement);
  }
});
