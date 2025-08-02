/**
 * Tests for EmulatorContainer component
 *
 * This component manages the lifecycle of all emulator components (CPU, PPU, Memory, Display, etc.)
 * and enables inter-component communication through constructor dependency injection.
 * Uses mutable state architecture for optimal performance.
 */

import { EmulatorContainer } from '../../src/emulator/EmulatorContainer';
import { EmulatorDisplay } from '../../src/emulator/display/EmulatorDisplay';

describe('EmulatorContainer', () => {
  let parentElement: HTMLDivElement;
  let container: EmulatorContainer;

  beforeEach(() => {
    // Create a mock parent element for each test
    parentElement = document.createElement('div');
    // Add to document body to avoid DOM issues
    document.body.appendChild(parentElement);
  });

  afterEach(() => {
    // Clean up container first
    try {
      container?.stop();
    } catch (error) {
      // Ignore cleanup errors
    }

    // Clean up DOM elements to prevent memory leaks
    if (parentElement?.parentNode) {
      parentElement.parentNode.removeChild(parentElement);
    }

    // Clear any lingering references
    (parentElement as any) = null;
  });

  describe('constructor', () => {
    it('should create emulator container with required parent element', () => {
      container = new EmulatorContainer(parentElement);

      expect(container).toBeTruthy();
      expect(typeof container).toBe('object');
    });

    it('should throw error when parent element is null', () => {
      expect(() => new EmulatorContainer(null as any)).toThrow('Parent element is required');
    });

    it('should initialize all emulator components on construction', () => {
      container = new EmulatorContainer(parentElement);

      // Should create display component
      expect(container.getDisplay()).toBeTruthy();
      expect(container.getDisplay()).toBeInstanceOf(EmulatorDisplay);
    });

    it('should create display component as child of parent element', () => {
      container = new EmulatorContainer(parentElement);

      // Should append a canvas to the parent element via display component
      const canvas = parentElement.querySelector('canvas');
      expect(canvas).toBeTruthy();
    });
  });

  describe('component lifecycle management', () => {
    beforeEach(() => {
      container = new EmulatorContainer(parentElement);
    });

    it('should start emulation and track running state', () => {
      expect(container.isRunning()).toBe(false);

      container.start();

      expect(container.isRunning()).toBe(true);
    });

    it('should stop emulation and track running state', () => {
      container.start();
      expect(container.isRunning()).toBe(true);

      container.stop();

      expect(container.isRunning()).toBe(false);
    });

    it('should reset emulation state', () => {
      container.start();
      container.reset();

      expect(container.isRunning()).toBe(false);
    });

    it('should handle multiple start calls without issues', () => {
      container.start();
      expect(container.isRunning()).toBe(true);

      // Multiple starts should not cause issues
      container.start();
      expect(container.isRunning()).toBe(true);
    });

    it('should handle multiple stop calls without issues', () => {
      container.start();
      container.stop();
      expect(container.isRunning()).toBe(false);

      // Multiple stops should not cause issues
      container.stop();
      expect(container.isRunning()).toBe(false);
    });
  });

  describe('component access and composition', () => {
    beforeEach(() => {
      container = new EmulatorContainer(parentElement);
    });

    it('should provide access to display component', () => {
      const display = container.getDisplay();

      expect(display).toBeTruthy();
      expect(display).toBeInstanceOf(EmulatorDisplay);
    });

    it('should return same display instance on multiple calls', () => {
      const display1 = container.getDisplay();
      const display2 = container.getDisplay();

      expect(display1).toBe(display2); // Should be same instance
    });

    it('should prepare for future CPU component access', () => {
      // This method should exist but return undefined until CPU is implemented
      expect(container.getCPU).toBeDefined();
      expect(container.getCPU()).toBeUndefined();
    });

    it('should prepare for future PPU component access', () => {
      // This method should exist but return undefined until PPU is implemented
      expect(container.getPPU).toBeDefined();
      expect(container.getPPU()).toBeUndefined();
    });

    it('should prepare for future Memory component access', () => {
      // This method should exist but return undefined until Memory is implemented
      expect(container.getMemory).toBeDefined();
      expect(container.getMemory()).toBeUndefined();
    });
  });

  describe('inter-component communication', () => {
    beforeEach(() => {
      container = new EmulatorContainer(parentElement);
    });

    it('should enable components to communicate through references', () => {
      const display = container.getDisplay();

      // Display should be accessible for inter-component communication
      expect(display).toBeTruthy();

      // Future components should be able to get display reference for rendering
      // Example: PPU should be able to call display.draw() with pixel data
    });

    it('should manage component initialization order and dependencies', () => {
      // Display should be created first as it has no dependencies
      const display = container.getDisplay();
      expect(display).toBeTruthy();

      // Future tests will verify:
      // - Memory is created before CPU (CPU depends on Memory)
      // - PPU is created after Memory (PPU depends on Memory)
      // - PPU is injected with Display reference (PPU renders to Display)
    });
  });

  describe('mutable state architecture', () => {
    beforeEach(() => {
      container = new EmulatorContainer(parentElement);
    });

    it('should use mutable state for performance', () => {
      // Container should manage mutable state internally
      // This follows the performance POC validation showing mutable state is faster
      expect(container.isRunning()).toBe(false); // Initial state

      container.start();
      expect(container.isRunning()).toBe(true); // Mutated state
    });

    it('should provide controlled access to mutable state', () => {
      // State changes should only be possible through container methods
      // Direct state mutation should not be exposed externally
      expect(typeof container.isRunning).toBe('function');
      expect(typeof container.start).toBe('function');
      expect(typeof container.stop).toBe('function');
      expect(typeof container.reset).toBe('function');
    });
  });

  describe('component encapsulation', () => {
    beforeEach(() => {
      container = new EmulatorContainer(parentElement);
    });

    it('should not expose internal component implementation details', () => {
      // Should not have direct access to private components
      expect((container as any).display).toBeUndefined();
      expect((container as any).cpu).toBeUndefined();
      expect((container as any).ppu).toBeUndefined();
      expect((container as any).memory).toBeUndefined();
    });

    it('should provide clean public interface for component access', () => {
      // Only public getter methods should be available
      expect(typeof container.getDisplay).toBe('function');
      expect(typeof container.getCPU).toBe('function');
      expect(typeof container.getPPU).toBe('function');
      expect(typeof container.getMemory).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should handle component initialization failures gracefully', () => {
      // Test error handling when canvas context cannot be obtained
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(null);

      expect(() => new EmulatorContainer(parentElement)).toThrow(
        'Failed to get 2D rendering context'
      );

      // Restore original getContext
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    });
  });
});
