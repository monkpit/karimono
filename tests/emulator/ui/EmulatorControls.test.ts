/**
 * EmulatorControls Component Tests
 *
 * Tests the emulator control interface including play/pause/reset
 * functionality and ROM loading integration.
 */

import { EmulatorControls } from '../../../src/emulator/ui/EmulatorControls';

// Mock EmulatorContainer
class MockEmulatorContainer {
  private running = false;
  private state = {
    running: false,
    frameCount: 0,
    cycleCount: 0,
    lastFrameTime: 0,
  };

  start(): void {
    this.running = true;
    this.state.running = true;
  }

  stop(): void {
    this.running = false;
    this.state.running = false;
  }

  reset(): void {
    this.running = false;
    this.state = {
      running: false,
      frameCount: 0,
      cycleCount: 0,
      lastFrameTime: 0,
    };
  }

  isRunning(): boolean {
    return this.running;
  }

  getState(): typeof this.state {
    return { ...this.state };
  }

  loadROM = jest.fn();
}

describe('EmulatorControls', () => {
  let container: HTMLElement;
  let emulatorContainer: MockEmulatorContainer;
  let emulatorControls: EmulatorControls;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    emulatorContainer = new MockEmulatorContainer();
  });

  afterEach(() => {
    document.body.removeChild(container);
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should create emulator controls with all buttons', () => {
      emulatorControls = new EmulatorControls(container, emulatorContainer as any);

      expect(container.children).toHaveLength(2); // controls container + status element

      // Check for controls container
      const controlsContainer = container.children[0];
      expect(controlsContainer.className).toBe('emulator-controls');

      // Check for all buttons
      expect(controlsContainer.children.length).toBeGreaterThanOrEqual(3);

      // Find specific buttons by checking their content
      let playButton = null;
      let resetButton = null;
      let loadROMButton = null;

      for (let i = 0; i < controlsContainer.children.length; i++) {
        const child = controlsContainer.children[i] as any;
        if (child.textContent?.includes('Play')) playButton = child;
        if (child.textContent?.includes('Reset')) resetButton = child;
        if (child.textContent?.includes('Load ROM')) loadROMButton = child;
      }

      expect(playButton).toBeTruthy();
      expect(resetButton).toBeTruthy();
      expect(loadROMButton).toBeTruthy();
    });

    test('should throw error with null container', () => {
      expect(() => new EmulatorControls(null, emulatorContainer as any)).toThrow(
        'Container element is required'
      );
    });

    test('should throw error with null emulator', () => {
      expect(() => new EmulatorControls(container, null)).toThrow('Emulator container is required');
    });
  });

  describe('Play/Pause Functionality', () => {
    beforeEach(() => {
      emulatorControls = new EmulatorControls(container, emulatorContainer as any);
    });

    test('should show Play button when emulator is stopped', () => {
      emulatorContainer.stop();
      emulatorControls.updateControlStates();

      const controlsContainer = container.children[0];
      let playButton = null;

      for (let i = 0; i < controlsContainer.children.length; i++) {
        const child = controlsContainer.children[i] as any;
        if (child.textContent?.includes('Play')) {
          playButton = child;
          break;
        }
      }

      expect(playButton).toBeTruthy();
      expect(playButton.textContent).toBe('▶ Play');
    });

    test('should show Pause button when emulator is running', () => {
      emulatorContainer.start();
      emulatorControls.updateControlStates();

      const controlsContainer = container.children[0];
      let pauseButton = null;

      for (let i = 0; i < controlsContainer.children.length; i++) {
        const child = controlsContainer.children[i] as any;
        if (child.textContent?.includes('Pause')) {
          pauseButton = child;
          break;
        }
      }

      expect(pauseButton).toBeTruthy();
      expect(pauseButton.textContent).toBe('⏸ Pause');
    });

    test('should call emulator.start() when play button is clicked', () => {
      const startSpy = jest.spyOn(emulatorContainer, 'start');

      const controlsContainer = container.children[0];
      let playButton = null;

      for (let i = 0; i < controlsContainer.children.length; i++) {
        const child = controlsContainer.children[i] as any;
        if (child.textContent?.includes('Play')) {
          playButton = child;
          break;
        }
      }

      // Simulate click
      const clickHandler = (playButton as any)._listeners?.click?.[0];
      if (clickHandler) {
        clickHandler({ type: 'click', target: playButton });
      }

      expect(startSpy).toHaveBeenCalled();
    });

    test('should call emulator.stop() when pause button is clicked', () => {
      emulatorContainer.start();
      emulatorControls.updateControlStates();

      const stopSpy = jest.spyOn(emulatorContainer, 'stop');

      const controlsContainer = container.children[0];
      let pauseButton = null;

      for (let i = 0; i < controlsContainer.children.length; i++) {
        const child = controlsContainer.children[i] as any;
        if (child.textContent?.includes('Pause')) {
          pauseButton = child;
          break;
        }
      }

      // Simulate click
      const clickHandler = (pauseButton as any)._listeners?.click?.[0];
      if (clickHandler) {
        clickHandler({ type: 'click', target: pauseButton });
      }

      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('Reset Functionality', () => {
    beforeEach(() => {
      emulatorControls = new EmulatorControls(container, emulatorContainer as any);
    });

    test('should call emulator.reset() when reset button is clicked', () => {
      const resetSpy = jest.spyOn(emulatorContainer, 'reset');

      const controlsContainer = container.children[0];
      let resetButton = null;

      for (let i = 0; i < controlsContainer.children.length; i++) {
        const child = controlsContainer.children[i] as any;
        if (child.textContent?.includes('Reset')) {
          resetButton = child;
          break;
        }
      }

      // Simulate click
      const clickHandler = (resetButton as any)._listeners?.click?.[0];
      if (clickHandler) {
        clickHandler({ type: 'click', target: resetButton });
      }

      expect(resetSpy).toHaveBeenCalled();
    });

    test('should update control states after reset', () => {
      emulatorContainer.start();
      emulatorControls.updateControlStates();

      // Reset should stop the emulator and update controls
      const controlsContainer = container.children[0];
      let resetButton = null;

      for (let i = 0; i < controlsContainer.children.length; i++) {
        const child = controlsContainer.children[i] as any;
        if (child.textContent?.includes('Reset')) {
          resetButton = child;
          break;
        }
      }

      // Simulate click
      const clickHandler = (resetButton as any)._listeners?.click?.[0];
      if (clickHandler) {
        clickHandler({ type: 'click', target: resetButton });
      }

      // After reset, should show Play button
      let playButton = null;
      for (let i = 0; i < controlsContainer.children.length; i++) {
        const child = controlsContainer.children[i] as any;
        if (child.textContent?.includes('Play')) {
          playButton = child;
          break;
        }
      }

      expect(playButton).toBeTruthy();
    });
  });

  describe('ROM Loading Integration', () => {
    beforeEach(() => {
      emulatorControls = new EmulatorControls(container, emulatorContainer as any);
    });

    test('should show ROM loader when Load ROM button is clicked', () => {
      const controlsContainer = container.children[0];
      let loadROMButton = null;

      for (let i = 0; i < controlsContainer.children.length; i++) {
        const child = controlsContainer.children[i] as any;
        if (child.textContent?.includes('Load ROM')) {
          loadROMButton = child;
          break;
        }
      }

      // Initially ROM loader should not be visible
      let romLoaderContainer = null;
      for (let i = 0; i < container.children.length; i++) {
        if (container.children[i].className === 'rom-loader-container') {
          romLoaderContainer = container.children[i];
          break;
        }
      }
      expect(romLoaderContainer).toBeFalsy();

      // Click Load ROM button
      const clickHandler = (loadROMButton as any)._listeners?.click?.[0];
      if (clickHandler) {
        clickHandler({ type: 'click', target: loadROMButton });
      }

      // ROM loader should now be visible
      romLoaderContainer = null;
      for (let i = 0; i < container.children.length; i++) {
        if (container.children[i].className === 'rom-loader-container') {
          romLoaderContainer = container.children[i];
          break;
        }
      }
      expect(romLoaderContainer).toBeTruthy();
    });

    test('should handle ROM loading', async () => {
      const testROM = new Uint8Array(32768);
      const filename = 'test.gb';

      // Directly call the ROM load handler
      await emulatorControls.handleROMLoad(testROM, filename);

      expect(emulatorContainer.loadROM).toHaveBeenCalledWith(testROM, filename);
    });

    test('should hide ROM loader after successful load', async () => {
      const testROM = new Uint8Array(32768);
      const filename = 'test.gb';

      // Show ROM loader first
      emulatorControls.showROMLoader();

      // Load ROM
      await emulatorControls.handleROMLoad(testROM, filename);

      // ROM loader should be hidden
      let romLoaderContainer = null;
      for (let i = 0; i < container.children.length; i++) {
        if (container.children[i].className === 'rom-loader-container') {
          romLoaderContainer = container.children[i];
          break;
        }
      }
      expect(romLoaderContainer).toBeFalsy();
    });
  });

  describe('Status Display', () => {
    beforeEach(() => {
      emulatorControls = new EmulatorControls(container, emulatorContainer as any);
    });

    test('should show emulator status', () => {
      emulatorControls.updateStatus();

      // Check for status display
      let statusElement = null;
      for (let i = 0; i < container.children.length; i++) {
        if (container.children[i].className === 'emulator-status') {
          statusElement = container.children[i];
          break;
        }
      }

      expect(statusElement).toBeTruthy();
      expect(statusElement?.textContent).toContain('Status:');
    });

    test('should update status text based on emulator state', () => {
      emulatorContainer.start();
      emulatorControls.updateStatus();

      let statusElement = null;
      for (let i = 0; i < container.children.length; i++) {
        if (container.children[i].className === 'emulator-status') {
          statusElement = container.children[i];
          break;
        }
      }

      expect(statusElement?.textContent).toContain('Running');
    });
  });

  describe('Public API', () => {
    beforeEach(() => {
      emulatorControls = new EmulatorControls(container, emulatorContainer as any);
    });

    test('should expose showROMLoader method', () => {
      expect(typeof emulatorControls.showROMLoader).toBe('function');

      // Should not throw when called
      expect(() => emulatorControls.showROMLoader()).not.toThrow();
    });

    test('should expose hideROMLoader method', () => {
      expect(typeof emulatorControls.hideROMLoader).toBe('function');

      // Should not throw when called
      expect(() => emulatorControls.hideROMLoader()).not.toThrow();
    });

    test('should expose handleROMLoad method', () => {
      expect(typeof emulatorControls.handleROMLoad).toBe('function');

      // Should be async function
      const result = emulatorControls.handleROMLoad(new Uint8Array(1024), 'test.gb');
      expect(result).toBeInstanceOf(Promise);
    });

    test('should expose updateControlStates method', () => {
      expect(typeof emulatorControls.updateControlStates).toBe('function');

      // Should not throw when called
      expect(() => emulatorControls.updateControlStates()).not.toThrow();
    });

    test('should expose updateStatus method', () => {
      expect(typeof emulatorControls.updateStatus).toBe('function');

      // Should not throw when called
      expect(() => emulatorControls.updateStatus()).not.toThrow();
    });
  });
});
