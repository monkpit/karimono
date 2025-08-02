/**
 * Integration test for EmulatorContainer
 *
 * Verifies that EmulatorContainer works correctly with EmulatorDisplay
 * and follows TDD GREEN phase validation.
 */

import { EmulatorContainer } from '../../src/emulator/EmulatorContainer';
import { EmulatorDisplay } from '../../src/emulator/display/EmulatorDisplay';

describe('EmulatorContainer Integration', () => {
  let parentElement: HTMLDivElement;
  let container: EmulatorContainer;

  beforeEach(() => {
    parentElement = document.createElement('div');
    document.body.appendChild(parentElement);
  });

  afterEach(() => {
    container?.stop();
    parentElement?.remove();
  });

  it('should integrate with EmulatorDisplay correctly', () => {
    container = new EmulatorContainer(parentElement);

    // Should have display component
    const display = container.getDisplay();
    expect(display).toBeInstanceOf(EmulatorDisplay);

    // Should create canvas in DOM
    const canvas = parentElement.querySelector('canvas');
    expect(canvas).toBeTruthy();
    expect(canvas?.width).toBe(480); // 160 * 3 (default scale)
    expect(canvas?.height).toBe(432); // 144 * 3 (default scale)
  });

  it('should manage lifecycle state correctly', () => {
    container = new EmulatorContainer(parentElement);

    // Initial state
    expect(container.isRunning()).toBe(false);
    expect(container.getFrameCount()).toBe(0);
    expect(container.getCycleCount()).toBe(0);

    // Start emulation
    container.start();
    expect(container.isRunning()).toBe(true);

    // Stop emulation
    container.stop();
    expect(container.isRunning()).toBe(false);

    // Reset emulation
    container.reset();
    expect(container.isRunning()).toBe(false);
    expect(container.getFrameCount()).toBe(0);
    expect(container.getCycleCount()).toBe(0);
  });

  it('should provide access to future components', () => {
    container = new EmulatorContainer(parentElement);

    // Future components should be undefined until implemented
    expect(container.getCPU()).toBeUndefined();
    expect(container.getPPU()).toBeUndefined();
    expect(container.getMemory()).toBeUndefined();

    // But methods should exist
    expect(typeof container.getCPU).toBe('function');
    expect(typeof container.getPPU).toBe('function');
    expect(typeof container.getMemory).toBe('function');
  });

  it('should use mutable state architecture', () => {
    container = new EmulatorContainer(parentElement);

    const initialState = container.getState();
    expect(initialState.running).toBe(false);
    expect(initialState.frameCount).toBe(0);

    container.start();
    const runningState = container.getState();
    expect(runningState.running).toBe(true);

    // State should be read-only snapshot (frozen)
    expect(Object.isFrozen(runningState)).toBe(true);
  });

  it('should handle configuration options', () => {
    const config = {
      display: { scale: 2 },
      debug: true,
      frameRate: 30,
    };

    container = new EmulatorContainer(parentElement, config);

    // Should apply display configuration
    const canvas = parentElement.querySelector('canvas');
    expect(canvas?.width).toBe(320); // 160 * 2 (custom scale)
    expect(canvas?.height).toBe(288); // 144 * 2 (custom scale)

    // Should store configuration
    const storedConfig = container.getConfig();
    expect(storedConfig.debug).toBe(true);
    expect(storedConfig.frameRate).toBe(30);
    expect(Object.isFrozen(storedConfig)).toBe(true);
  });
});
