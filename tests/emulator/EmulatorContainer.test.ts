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

    it('should initialize CPU component with MMU dependency', () => {
      // CPU component should be initialized and accessible
      const cpu = container.getCPU();
      expect(cpu).toBeTruthy();
      expect(typeof cpu.step).toBe('function');
      expect(typeof cpu.getPC).toBe('function');
      expect(typeof cpu.reset).toBe('function');
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

    it('should provide access to MMU component', () => {
      // MMU should be implemented and accessible
      const mmu = container.getMMU();
      expect(mmu).toBeTruthy();
      expect(typeof mmu.readByte).toBe('function');
      expect(typeof mmu.writeByte).toBe('function');
      expect(typeof mmu.setPostBootState).toBe('function');
    });

    it('should initialize MMU to post-boot state during construction', () => {
      // Test: MMU should be automatically set to post-boot state during container initialization
      // This implements ADR-001 requirement for components to default to post-boot state

      const mmu = container.getMMU();

      // Verify: Boot ROM should be disabled
      expect(mmu.getSnapshot().bootROMEnabled).toBe(false);

      // Verify: Critical I/O registers should be set to post-boot values
      expect(mmu.readByte(0xff40)).toBe(0x91); // LCDC - LCD Control
      expect(mmu.readByte(0xff47)).toBe(0xfc); // BGP - Background Palette
      expect(mmu.readByte(0xff50)).toBe(0x01); // Boot ROM disabled
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

    it('should throw error when accessing uninitialized MMU', () => {
      // Create container but don't initialize properly
      const badContainer = Object.create(EmulatorContainer.prototype);
      badContainer.mmuComponent = null;

      expect(() => badContainer.getMMU()).toThrow('MMU component not initialized');
    });

    it('should handle step when emulator is not running', () => {
      container = new EmulatorContainer(parentElement);
      container.stop(); // Ensure not running

      // Step should return without error when not running
      expect(() => container.step()).not.toThrow();
    });

    it('should execute CPU instructions during step() calls', () => {
      container = new EmulatorContainer(parentElement);
      container.start();

      const cpu = container.getCPU();
      const mmu = container.getMMU();

      // Set up a simple NOP instruction at PC location
      mmu.writeByte(0x0100, 0x00); // NOP instruction

      const initialPC = cpu.getPC();
      const initialCycleCount = container.getCycleCount();

      // Execute one step
      container.step();

      // CPU PC should have advanced after executing the instruction
      expect(cpu.getPC()).toBe((initialPC + 1) & 0xffff);

      // System cycle count should have increased by NOP instruction cycles (4)
      expect(container.getCycleCount()).toBe(initialCycleCount + 4);
    });

    it('should correctly propagate CPU cycle counts to system state', () => {
      container = new EmulatorContainer(parentElement);
      container.start();

      const mmu = container.getMMU();

      // Set up two instructions: NOP (4 cycles), INC A (4 cycles)
      mmu.writeByte(0x0100, 0x00); // NOP - 4 cycles
      mmu.writeByte(0x0101, 0x3c); // INC A - 4 cycles

      const initialCycles = container.getCycleCount();

      // Execute two steps
      container.step(); // Should execute NOP
      container.step(); // Should execute INC A

      // System should have accumulated 8 cycles total
      expect(container.getCycleCount()).toBe(initialCycles + 8);
    });

    it('should return undefined for unimplemented components', () => {
      container = new EmulatorContainer(parentElement);

      // These components return undefined until implemented
      expect(container.getDMA()).toBeUndefined();
      expect(container.getCartridge()).toBeUndefined();
    });
  });
});
