/**
 * PPU Integration Tests - EmulatorContainer Architecture
 *
 * Tests the integration of PPU rendering pipeline with the existing
 * EmulatorContainer component architecture, focusing on component coordination,
 * frame synchronization, and system-wide rendering flow.
 *
 * Focus: Container integration, component coordination, frame lifecycle
 */

import { EmulatorContainer } from '../../../src/emulator/EmulatorContainer';
import type { EmulatorContainerConfig } from '../../../src/emulator/types';

// Mock localStorage for testing
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('PPUIntegration', () => {
  let parentElement: HTMLDivElement;
  let emulatorContainer: EmulatorContainer;

  beforeEach(() => {
    parentElement = document.createElement('div');
    document.body.appendChild(parentElement);

    // Clear localStorage mocks
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  afterEach(() => {
    if (emulatorContainer) {
      emulatorContainer.stop();
      emulatorContainer.reset();
    }
    parentElement?.remove();
  });

  describe('PPU rendering pipeline integration', () => {
    it('should create emulator with integrated PPU rendering pipeline', () => {
      const config: EmulatorContainerConfig = {
        display: { scale: 2 },
        debug: false,
      };

      emulatorContainer = new EmulatorContainer(parentElement, config);

      expect(emulatorContainer).toBeDefined();
      expect(emulatorContainer.getDisplay()).toBeDefined();

      // Should have rendering pipeline integrated
      const renderingPipeline = emulatorContainer.getRenderingPipeline();
      expect(renderingPipeline).toBeDefined();
      expect(renderingPipeline.isReady()).toBe(true);
    });

    it('should provide access to display control panel', () => {
      emulatorContainer = new EmulatorContainer(parentElement);

      const controlPanel = emulatorContainer.getDisplayControls();
      expect(controlPanel).toBeDefined();

      // Control panel should be connected to pipeline
      expect(controlPanel.isVisible()).toBe(false); // Hidden by default
      expect(controlPanel.getCurrentPalette()).toBe('dmg-green');
      expect(controlPanel.getCurrentScale()).toBe(3); // Default scale
    });

    it('should coordinate between display components', () => {
      emulatorContainer = new EmulatorContainer(parentElement);

      const display = emulatorContainer.getDisplay();
      const pipeline = emulatorContainer.getRenderingPipeline();
      const controls = emulatorContainer.getDisplayControls();

      // Components should be properly connected
      expect(display).toBeDefined();
      expect(pipeline).toBeDefined();
      expect(controls).toBeDefined();

      // Controls should be able to affect pipeline
      controls.setPalette('grayscale');
      expect(pipeline.getCurrentPaletteName()).toBe('grayscale');

      controls.setScale(4);
      expect(controls.getCurrentScale()).toBe(4);
    });
  });

  describe('frame rendering coordination', () => {
    beforeEach(() => {
      emulatorContainer = new EmulatorContainer(parentElement);
    });

    it('should render PPU frame buffer to display', () => {
      const pipeline = emulatorContainer.getRenderingPipeline();
      const display = emulatorContainer.getDisplay();

      // Mock frame buffer from PPU component
      const mockFrameBuffer = new Uint8Array(160 * 144);
      mockFrameBuffer.fill(1); // Light gray

      // Spy on display.draw to verify rendering
      const drawSpy = jest.spyOn(display, 'draw');

      // Render frame through pipeline
      pipeline.renderFrame(mockFrameBuffer);

      expect(drawSpy).toHaveBeenCalledTimes(1);
      expect(drawSpy).toHaveBeenCalledWith(expect.any(Uint8ClampedArray));

      // Verify RGBA conversion
      const rgbaData = drawSpy.mock.calls[0][0] as Uint8ClampedArray;
      expect(rgbaData.length).toBe(160 * 144 * 4);
    });

    it('should provide frame rendering method on container', () => {
      const mockFrameBuffer = new Uint8Array(160 * 144);
      mockFrameBuffer.fill(2); // Dark gray

      // Container should provide high-level rendering method
      expect(() => emulatorContainer.renderFrame(mockFrameBuffer)).not.toThrow();

      // Should delegate to pipeline
      const stats = emulatorContainer.getRenderingStats();
      expect(stats.framesRendered).toBe(1);
    });

    it('should handle frame rendering errors gracefully', () => {
      const invalidFrameBuffer = new Uint8Array(100 * 100); // Wrong size

      // Should not crash the container
      expect(() => emulatorContainer.renderFrame(invalidFrameBuffer)).not.toThrow();

      // Should track error in statistics
      const stats = emulatorContainer.getRenderingStats();
      expect(stats.errorCount).toBeGreaterThan(0);
    });

    it('should support frame rate monitoring', () => {
      const controls = emulatorContainer.getDisplayControls();

      // Enable frame rate monitoring
      controls.setFrameRateMonitorEnabled(true);
      expect(controls.isFrameRateMonitorEnabled()).toBe(true);

      // Render multiple frames
      const frameBuffer = new Uint8Array(160 * 144);
      for (let i = 0; i < 5; i++) {
        emulatorContainer.renderFrame(frameBuffer);
      }

      const stats = emulatorContainer.getRenderingStats();
      expect(stats.framesRendered).toBe(5);
      expect(stats.averageFrameTime).toBeGreaterThan(0);
    });
  });

  describe('display settings persistence', () => {
    it('should load display settings on container creation', () => {
      const testSettings = {
        scale: 2,
        palette: 'high-contrast',
        frameRateMonitorEnabled: true,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(testSettings));

      emulatorContainer = new EmulatorContainer(parentElement);

      const controls = emulatorContainer.getDisplayControls();
      expect(controls.getCurrentScale()).toBe(2);
      expect(controls.getCurrentPalette()).toBe('high-contrast');
      expect(controls.isFrameRateMonitorEnabled()).toBe(true);
    });

    it('should save display settings when changed', () => {
      emulatorContainer = new EmulatorContainer(parentElement);

      const controls = emulatorContainer.getDisplayControls();

      // Change settings
      controls.setScale(4);
      controls.setPalette('grayscale');
      controls.setFrameRateMonitorEnabled(true);

      // Save settings
      emulatorContainer.saveDisplaySettings();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'emulator-display-settings',
        expect.stringContaining('"scale":4')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'emulator-display-settings',
        expect.stringContaining('"palette":"grayscale"')
      );
    });

    it('should auto-save settings when container stops', () => {
      emulatorContainer = new EmulatorContainer(parentElement);
      emulatorContainer.start();

      const controls = emulatorContainer.getDisplayControls();
      controls.setScale(2);

      // Stop container should auto-save
      emulatorContainer.stop();

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should reset display settings', () => {
      emulatorContainer = new EmulatorContainer(parentElement);

      const controls = emulatorContainer.getDisplayControls();

      // Change settings
      controls.setScale(4);
      controls.setPalette('high-contrast');

      // Reset should restore defaults
      emulatorContainer.resetDisplaySettings();

      expect(controls.getCurrentScale()).toBe(3);
      expect(controls.getCurrentPalette()).toBe('dmg-green');
    });
  });

  describe('PPU-CPU coordination', () => {
    beforeEach(() => {
      emulatorContainer = new EmulatorContainer(parentElement);
      emulatorContainer.start();
    });

    it('should render frame during CPU step cycle', () => {
      const display = emulatorContainer.getDisplay();

      // Mock PPU component providing frame buffer
      const mockPPU = {
        step: jest.fn((_cycles: number) => {
          /* PPU step implementation */
        }),
        reset: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        render: jest.fn(),
        getMode: jest.fn().mockReturnValue(0),
        isFrameReady: jest.fn().mockReturnValue(true),
        getFrameBuffer: jest.fn().mockReturnValue(new Uint8Array(160 * 144).fill(1)),
      };

      // Simulate PPU integration (this would be done in actual PPU implementation)
      emulatorContainer.setPPUComponent(mockPPU as any);

      const drawSpy = jest.spyOn(display, 'draw');

      // Execute CPU step (should trigger frame rendering if frame ready)
      emulatorContainer.step();

      expect(mockPPU.isFrameReady).toHaveBeenCalled();
      expect(mockPPU.getFrameBuffer).toHaveBeenCalled();
      expect(drawSpy).toHaveBeenCalled();
    });

    it('should coordinate frame rate with CPU timing', () => {
      const targetFPS = 59.7;

      // Configure for frame rate coordination
      emulatorContainer.setFrameRateTarget(targetFPS);
      expect(emulatorContainer.getFrameRateTarget()).toBe(targetFPS);

      // Render frame and check timing
      const frameBuffer = new Uint8Array(160 * 144);
      const startTime = performance.now();

      emulatorContainer.renderFrame(frameBuffer);

      const actualTime = performance.now() - startTime;

      // Should complete within reasonable time for test environment
      expect(actualTime).toBeLessThan(50); // Generous timeout for CI compatibility
    });

    it('should handle PPU-less mode gracefully', () => {
      // Container should work without PPU for CPU-only testing
      expect(() => emulatorContainer.step()).not.toThrow();

      // Should not attempt rendering without PPU
      const stats = emulatorContainer.getRenderingStats();
      expect(stats.framesRendered).toBe(0);
    });
  });

  describe('performance optimization', () => {
    beforeEach(() => {
      emulatorContainer = new EmulatorContainer(parentElement);
    });

    it('should provide performance monitoring', () => {
      const performanceStats = emulatorContainer.getPerformanceStats();

      expect(performanceStats).toBeDefined();
      expect(performanceStats.frameRenderTime).toBeDefined();
      expect(performanceStats.bufferReuses).toBeDefined();
      expect(performanceStats.allocations).toBeDefined();
    });

    it('should optimize rendering pipeline for frame rate', () => {
      // Render multiple frames to test optimization
      const frameBuffer = new Uint8Array(160 * 144);

      const renderTimes: number[] = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        emulatorContainer.renderFrame(frameBuffer);
        const renderTime = performance.now() - startTime;
        renderTimes.push(renderTime);
      }

      // Should show buffer reuse optimization
      const stats = emulatorContainer.getPerformanceStats();
      expect(stats.bufferReuses).toBeGreaterThan(0);

      // Verify reasonable performance for all frames
      const avgTime = renderTimes.reduce((a, b) => a + b) / renderTimes.length;
      const maxTime = Math.max(...renderTimes);

      expect(avgTime).toBeLessThan(50); // Generous average time limit
      expect(maxTime).toBeLessThan(100); // Generous maximum time limit
    });

    it('should provide performance recommendations', () => {
      // Render some frames to generate data
      const frameBuffer = new Uint8Array(160 * 144);
      for (let i = 0; i < 5; i++) {
        emulatorContainer.renderFrame(frameBuffer);
      }

      const recommendations = emulatorContainer.getPerformanceRecommendations();
      expect(recommendations).toBeInstanceOf(Array);

      // Should have at least one recommendation
      expect(recommendations.length).toBeGreaterThan(0);

      // Recommendations should have proper structure
      recommendations.forEach(rec => {
        expect(rec.type).toMatch(/^(success|info|warning)$/);
        expect(rec.message).toBeTruthy();
      });
    });
  });

  describe('component lifecycle integration', () => {
    it('should initialize display components in correct order', () => {
      emulatorContainer = new EmulatorContainer(parentElement);

      // Display should be available immediately
      expect(emulatorContainer.getDisplay()).toBeDefined();

      // Pipeline should be initialized with display
      const pipeline = emulatorContainer.getRenderingPipeline();
      expect(pipeline).toBeDefined();
      expect(pipeline.isReady()).toBe(true);

      // Controls should be connected to pipeline
      const controls = emulatorContainer.getDisplayControls();
      expect(controls).toBeDefined();
      expect(controls.getCurrentPalette()).toBe(pipeline.getCurrentPaletteName());
    });

    it('should clean up display resources on reset', () => {
      emulatorContainer = new EmulatorContainer(parentElement);

      const controls = emulatorContainer.getDisplayControls();
      controls.show();
      expect(controls.isVisible()).toBe(true);

      // Reset should clean up resources
      emulatorContainer.reset();

      // Controls should be hidden after reset
      expect(controls.isVisible()).toBe(false);
    });

    it('should handle display component errors gracefully', () => {
      emulatorContainer = new EmulatorContainer(parentElement);

      // Simulate display error
      const pipeline = emulatorContainer.getRenderingPipeline();
      const invalidFrameBuffer = new Uint8Array(50 * 50); // Invalid size

      expect(() => pipeline.renderFrame(invalidFrameBuffer)).not.toThrow();

      // Container should continue functioning
      expect(emulatorContainer.isRunning()).toBe(false); // Not started yet
      expect(() => emulatorContainer.start()).not.toThrow();
    });
  });
});
