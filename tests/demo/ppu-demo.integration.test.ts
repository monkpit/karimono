/**
 * PPU Demo Integration Tests
 *
 * Tests that the PPU demo can be initialized and basic functionality works
 */

import { EmulatorContainer } from '../../src/emulator/EmulatorContainer';

describe('PPU Demo Integration', () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Mock DOM elements for testing
    container = {
      appendChild: jest.fn(),
      querySelector: jest.fn(),
    } as unknown as HTMLElement;
  });

  describe('EmulatorContainer Initialization', () => {
    test('should create emulator container successfully', () => {
      const emulatorContainer = new EmulatorContainer(container, {
        display: {
          width: 160 * 3,
          height: 144 * 3,
          scale: 3,
        },
        debug: true,
      });

      expect(emulatorContainer).toBeDefined();
      expect(emulatorContainer.isRunning()).toBe(false);
      expect(emulatorContainer.getFrameCount()).toBe(0);
      expect(emulatorContainer.getCycleCount()).toBe(0);
    });

    test('should initialize all required components', () => {
      const emulatorContainer = new EmulatorContainer(container);

      expect(emulatorContainer.getCPU()).toBeDefined();
      expect(emulatorContainer.getPPU()).toBeDefined();
      expect(emulatorContainer.getMMU()).toBeDefined();
      expect(emulatorContainer.getDisplay()).toBeDefined();
      expect(emulatorContainer.getRenderingPipeline()).toBeDefined();
    });
  });

  describe('VRAM Pattern Loading', () => {
    let emulatorContainer: EmulatorContainer;

    beforeEach(() => {
      emulatorContainer = new EmulatorContainer(container);
    });

    test('should load VRAM patterns without errors', () => {
      const mmu = emulatorContainer.getMMU();

      expect(() => {
        // Test solid color pattern loading (simulated)
        for (let addr = 0x8000; addr <= 0x8010; addr++) {
          mmu.writeByte(addr, 0xff);
        }

        // Configure LCDC
        mmu.writeByte(0xff40, 0x91);
        mmu.writeByte(0xff47, 0xe4);
        mmu.writeByte(0xff42, 0);
        mmu.writeByte(0xff43, 0);
      }).not.toThrow();
    });

    test('should configure PPU registers correctly', () => {
      const mmu = emulatorContainer.getMMU();

      // Configure display registers
      mmu.writeByte(0xff40, 0x91); // LCDC
      mmu.writeByte(0xff47, 0xe4); // BGP
      mmu.writeByte(0xff42, 0); // SCY
      mmu.writeByte(0xff43, 0); // SCX

      // Verify registers were written
      expect(mmu.readByte(0xff40)).toBe(0x91);
      expect(mmu.readByte(0xff47)).toBe(0xe4);
      expect(mmu.readByte(0xff42)).toBe(0);
      expect(mmu.readByte(0xff43)).toBe(0);
    });
  });

  describe('Emulation Control', () => {
    let emulatorContainer: EmulatorContainer;

    beforeEach(() => {
      emulatorContainer = new EmulatorContainer(container);
    });

    test('should start and stop emulation', () => {
      expect(emulatorContainer.isRunning()).toBe(false);

      emulatorContainer.start();
      expect(emulatorContainer.isRunning()).toBe(true);

      emulatorContainer.stop();
      expect(emulatorContainer.isRunning()).toBe(false);
    });

    test('should execute emulation steps', () => {
      emulatorContainer.start();

      const initialCycles = emulatorContainer.getCycleCount();
      const cycles = emulatorContainer.step();

      expect(cycles).toBeGreaterThanOrEqual(0);
      expect(emulatorContainer.getCycleCount()).toBeGreaterThanOrEqual(initialCycles);

      emulatorContainer.stop();
    });

    test('should reset emulation state', () => {
      emulatorContainer.start();
      emulatorContainer.step();
      emulatorContainer.step();

      const cycleCount = emulatorContainer.getCycleCount();
      expect(cycleCount).toBeGreaterThan(0);

      emulatorContainer.reset();

      expect(emulatorContainer.isRunning()).toBe(false);
      expect(emulatorContainer.getFrameCount()).toBe(0);
      expect(emulatorContainer.getCycleCount()).toBe(0);
    });
  });

  describe('PPU Integration', () => {
    let emulatorContainer: EmulatorContainer;

    beforeEach(() => {
      emulatorContainer = new EmulatorContainer(container);
    });

    test('should have PPU component available', () => {
      const ppu = emulatorContainer.getPPU();
      expect(ppu).toBeDefined();
    });

    test('should coordinate PPU with CPU execution', () => {
      emulatorContainer.start();

      // Execute several steps to allow PPU-CPU coordination
      for (let i = 0; i < 10; i++) {
        emulatorContainer.step();
      }

      // PPU should have processed some cycles
      expect(emulatorContainer.getCycleCount()).toBeGreaterThan(0);

      emulatorContainer.stop();
    });

    test('should render frames through PPU pipeline', () => {
      const renderingPipeline = emulatorContainer.getRenderingPipeline();
      expect(renderingPipeline).toBeDefined();

      const stats = emulatorContainer.getRenderingStats();
      expect(stats).toBeDefined();
      expect(typeof stats.framesRendered).toBe('number');
      expect(typeof stats.averageFrameTime).toBe('number');
    });
  });

  describe('Display Integration', () => {
    let emulatorContainer: EmulatorContainer;

    beforeEach(() => {
      emulatorContainer = new EmulatorContainer(container);
    });

    test('should create display component in DOM', () => {
      const display = emulatorContainer.getDisplay();
      expect(display).toBeDefined();

      // Check that appendChild was called on the container (canvas was added)
      expect(container.appendChild).toHaveBeenCalled();
    });

    test('should handle frame rendering', () => {
      const display = emulatorContainer.getDisplay();

      // Create test frame data (160x144 RGBA)
      const frameData = new Uint8ClampedArray(160 * 144 * 4);

      // Fill with test pattern (should not throw)
      expect(() => {
        display.draw(frameData);
      }).not.toThrow();
    });

    test('should provide performance statistics', () => {
      const stats = emulatorContainer.getPerformanceStats();
      expect(stats).toBeDefined();
      expect(typeof stats.frameRenderTime).toBe('number');
      expect(typeof stats.bufferReuses).toBe('number');
      expect(typeof stats.allocations).toBe('number');
    });
  });
});
