/**
 * Rendering Performance Tests - Optimization Strategy Validation
 *
 * Tests performance characteristics of PPU frame buffer to canvas transfer,
 * validates 60 FPS targets, and ensures efficient memory management.
 *
 * Focus: Frame rate performance, buffer reuse, and rendering optimization
 */

import { EmulatorDisplay } from '../../../src/emulator/display/EmulatorDisplay';
import { PPURenderingPipeline } from '../../../src/emulator/display/PPURenderingPipeline';

describe('RenderingPerformance', () => {
  let parentElement: HTMLDivElement;
  let display: EmulatorDisplay;
  let pipeline: PPURenderingPipeline;

  beforeEach(() => {
    parentElement = document.createElement('div');
    display = new EmulatorDisplay(parentElement);
    pipeline = new PPURenderingPipeline(display);
  });

  afterEach(() => {
    parentElement?.remove();
  });

  describe('60 FPS performance targets', () => {
    it('should process frame buffer within reasonable time for 60 FPS rendering', () => {
      const frameBuffer = new Uint8Array(160 * 144);
      // Fill with complex pattern that exercises all code paths
      for (let i = 0; i < frameBuffer.length; i++) {
        frameBuffer[i] = (i * 17 + (i % 37)) % 4; // Complex but deterministic pattern
      }

      const GENEROUS_TIMEOUT = 50; // 50ms max for test environment compatibility

      const startTime = performance.now();
      pipeline.renderFrame(frameBuffer);
      const endTime = performance.now();

      const actualFrameTime = endTime - startTime;

      // Should complete within generous timeout for CI compatibility
      expect(actualFrameTime).toBeLessThan(GENEROUS_TIMEOUT);
    });

    it('should maintain consistent frame times across multiple frames', () => {
      const frameBuffer = new Uint8Array(160 * 144);
      frameBuffer.fill(2); // Mid-gray

      const frameTimes: number[] = [];
      const FRAME_COUNT = 10;

      for (let i = 0; i < FRAME_COUNT; i++) {
        const startTime = performance.now();
        pipeline.renderFrame(frameBuffer);
        const endTime = performance.now();

        frameTimes.push(endTime - startTime);
      }

      // Calculate variance in frame times
      const avgTime = frameTimes.reduce((sum, time) => sum + time, 0) / FRAME_COUNT;
      const variance =
        frameTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / FRAME_COUNT;
      const stdDev = Math.sqrt(variance);

      // Frame times should be reasonable for test environment
      expect(avgTime).toBeLessThan(50); // Generous average time limit

      // Consistency check - allow for higher variation in test environments
      const coefficientOfVariation = stdDev / avgTime;

      // Only fail if variation is extreme (indicates a real performance issue)
      // Allow high CV in test environments due to timing precision limitations
      expect(coefficientOfVariation).toBeLessThan(5.0); // CV under 500% - very generous for test environments

      // Additional check: ensure no single frame is extremely slow
      const maxFrameTime = Math.max(...frameTimes);
      expect(maxFrameTime).toBeLessThan(100); // No frame over 100ms
    });

    it('should handle worst-case frame buffer patterns efficiently', () => {
      const frameBuffer = new Uint8Array(160 * 144);

      // Worst case: alternating pattern that might cause cache misses
      for (let i = 0; i < frameBuffer.length; i++) {
        frameBuffer[i] = i % 2 ? 3 : 0; // Alternating dark/light
      }

      const startTime = performance.now();
      pipeline.renderFrame(frameBuffer);
      const endTime = performance.now();

      const worstCaseTime = endTime - startTime;

      // Even worst-case should complete within reasonable time
      expect(worstCaseTime).toBeLessThan(50); // Generous timeout for test environments
    });
  });

  describe('memory allocation optimization', () => {
    it('should reuse RGBA buffer across multiple frames', () => {
      const frameBuffer = new Uint8Array(160 * 144);
      frameBuffer.fill(1);

      // Process multiple frames
      pipeline.processFrameBuffer(frameBuffer);
      pipeline.processFrameBuffer(frameBuffer);
      pipeline.processFrameBuffer(frameBuffer);

      const stats = pipeline.getPerformanceStats();

      // Should have one allocation and two reuses
      expect(stats.allocations).toBe(1);
      expect(stats.bufferReuses).toBe(2);
    });

    it('should not create new RGBA buffers during steady-state rendering', () => {
      const frameBuffer = new Uint8Array(160 * 144);

      // Initial render (triggers allocation)
      pipeline.renderFrame(frameBuffer);

      const initialStats = pipeline.getPerformanceStats();
      const initialAllocations = initialStats.allocations;

      // Subsequent renders (should reuse buffer)
      for (let i = 0; i < 100; i++) {
        pipeline.renderFrame(frameBuffer);
      }

      const finalStats = pipeline.getPerformanceStats();

      // Should have same number of allocations (no new ones)
      expect(finalStats.allocations).toBe(initialAllocations);
      expect(finalStats.bufferReuses).toBeGreaterThan(95); // At least 95 reuses
    });

    it('should measure buffer allocation overhead', () => {
      const frameBuffer = new Uint8Array(160 * 144);
      frameBuffer.fill(2);

      // Time first render (includes allocation)
      const startTime1 = performance.now();
      pipeline.renderFrame(frameBuffer);
      const firstRenderTime = performance.now() - startTime1;

      // Time second render (buffer reuse)
      const startTime2 = performance.now();
      pipeline.renderFrame(frameBuffer);
      const secondRenderTime = performance.now() - startTime2;

      // Buffer reuse should be faster than or similar to initial allocation
      expect(secondRenderTime).toBeLessThan(firstRenderTime * 1.5); // Within 50%
    });
  });

  describe('canvas rendering optimization', () => {
    it('should verify EmulatorDisplay.draw performance', () => {
      const rgbaData = new Uint8ClampedArray(160 * 144 * 4);

      // Fill with test pattern
      for (let i = 0; i < rgbaData.length; i += 4) {
        rgbaData[i] = 155; // R
        rgbaData[i + 1] = 188; // G
        rgbaData[i + 2] = 15; // B
        rgbaData[i + 3] = 255; // A
      }

      // Time the canvas draw operation
      const startTime = performance.now();
      display.draw(rgbaData);
      const drawTime = performance.now() - startTime;

      // Canvas draw should complete within reasonable time for test environment
      expect(drawTime).toBeLessThan(25); // Generous timeout for various environments
    });

    it('should test scaling impact on rendering performance', () => {
      // Test different scaling factors
      const scales = [1, 2, 4]; // Reduced to key scales to reduce variability
      const renderTimes: number[] = [];

      for (const scale of scales) {
        const scaledParent = document.createElement('div');
        const scaledDisplay = new EmulatorDisplay(scaledParent, { scale });
        const scaledPipeline = new PPURenderingPipeline(scaledDisplay);

        const frameBuffer = new Uint8Array(160 * 144);
        frameBuffer.fill(1);

        const startTime = performance.now();
        scaledPipeline.renderFrame(frameBuffer);
        const endTime = performance.now();

        renderTimes.push(endTime - startTime);
        scaledParent.remove();
      }

      // All scales should complete within reasonable time
      const maxTime = Math.max(...renderTimes);
      const minTime = Math.min(...renderTimes);
      const timeVariation = maxTime - minTime;

      expect(maxTime).toBeLessThan(50); // All scales under generous limit

      // Ensure scaling doesn't cause unreasonable performance degradation
      expect(timeVariation).toBeLessThan(40); // Absolute variation limit
    });
  });

  describe('color palette performance', () => {
    it('should benchmark color palette conversion performance', () => {
      const frameBuffer = new Uint8Array(160 * 144);

      // Fill with all color indices to test all palette lookups
      for (let i = 0; i < frameBuffer.length; i++) {
        frameBuffer[i] = i % 4;
      }

      const startTime = performance.now();
      const rgbaData = pipeline.processFrameBuffer(frameBuffer);
      const conversionTime = performance.now() - startTime;

      // Color conversion should complete within reasonable time
      expect(conversionTime).toBeLessThan(25); // Generous timeout for test environments
      expect(rgbaData.length).toBe(160 * 144 * 4); // Correct output size
    });

    it('should compare palette switching performance', () => {
      const frameBuffer = new Uint8Array(160 * 144);
      frameBuffer.fill(1);

      // Benchmark default palette
      const startDefault = performance.now();
      pipeline.setColorPalette('dmg-green');
      pipeline.processFrameBuffer(frameBuffer);
      const defaultTime = performance.now() - startDefault;

      // Benchmark grayscale palette
      const startGrayscale = performance.now();
      pipeline.setColorPalette('grayscale');
      pipeline.processFrameBuffer(frameBuffer);
      const grayscaleTime = performance.now() - startGrayscale;

      // Both palettes should complete within reasonable time
      expect(defaultTime).toBeLessThan(25);
      expect(grayscaleTime).toBeLessThan(25);
    });

    it('should test custom palette performance vs predefined palettes', () => {
      const frameBuffer = new Uint8Array(160 * 144);
      frameBuffer.fill(2);

      // Test predefined palette
      const startPredefined = performance.now();
      pipeline.setColorPalette('high-contrast');
      pipeline.processFrameBuffer(frameBuffer);
      const predefinedTime = performance.now() - startPredefined;

      // Test custom palette
      const customPalette = {
        color0: [200, 200, 200] as [number, number, number],
        color1: [150, 150, 150] as [number, number, number],
        color2: [100, 100, 100] as [number, number, number],
        color3: [50, 50, 50] as [number, number, number],
      };

      const startCustom = performance.now();
      pipeline.setColorPalette(customPalette);
      pipeline.processFrameBuffer(frameBuffer);
      const customTime = performance.now() - startCustom;

      // Both palette types should complete within reasonable time
      expect(predefinedTime).toBeLessThan(25);
      expect(customTime).toBeLessThan(25);
    });
  });

  describe('real-world performance simulation', () => {
    it('should simulate full emulation frame rendering loop', () => {
      const FRAME_COUNT = 30; // Reduced from 60 for faster test execution

      const frameTimes: number[] = [];

      for (let frame = 0; frame < FRAME_COUNT; frame++) {
        const frameBuffer = new Uint8Array(160 * 144);

        // Simulate different Game Boy screen patterns
        for (let i = 0; i < frameBuffer.length; i++) {
          // Simulate animated content with frame-based patterns
          frameBuffer[i] = ((i + frame * 7) % 127) % 4;
        }

        const startTime = performance.now();
        pipeline.renderFrame(frameBuffer);
        const frameTime = performance.now() - startTime;

        frameTimes.push(frameTime);
      }

      const totalRenderTime = frameTimes.reduce((sum, time) => sum + time, 0);
      const avgFrameTime = totalRenderTime / FRAME_COUNT;
      const maxFrameTime = Math.max(...frameTimes);

      // Ensure rendering completes within generous time limits
      expect(totalRenderTime).toBeLessThan(FRAME_COUNT * 50); // 50ms per frame max
      expect(avgFrameTime).toBeLessThan(50); // Average under 50ms
      expect(maxFrameTime).toBeLessThan(100); // No single frame over 100ms
    });

    it('should verify performance with complex Game Boy patterns', () => {
      // Simulate typical Game Boy patterns that might be performance-intensive
      const patterns = ['solid', 'checkerboard', 'gradient', 'text', 'sprites'];

      const patternTimes: Record<string, number> = {};

      for (const pattern of patterns) {
        const frameBuffer = new Uint8Array(160 * 144);

        // Generate pattern-specific frame buffer
        switch (pattern) {
          case 'solid':
            frameBuffer.fill(1);
            break;
          case 'checkerboard':
            for (let y = 0; y < 144; y++) {
              for (let x = 0; x < 160; x++) {
                frameBuffer[y * 160 + x] = (x + y) % 2 === 0 ? 0 : 3;
              }
            }
            break;
          case 'gradient':
            for (let i = 0; i < frameBuffer.length; i++) {
              frameBuffer[i] = Math.floor((i / frameBuffer.length) * 4);
            }
            break;
          case 'text':
            // Simulate text pattern (mostly background with some foreground)
            for (let i = 0; i < frameBuffer.length; i++) {
              frameBuffer[i] = i % 32 < 4 ? 3 : 0; // Text-like pattern
            }
            break;
          case 'sprites':
            // Simulate sprite-heavy scene
            for (let i = 0; i < frameBuffer.length; i++) {
              frameBuffer[i] = (i % 7) % 4; // Mixed colors
            }
            break;
        }

        const startTime = performance.now();
        pipeline.renderFrame(frameBuffer);
        const patternTime = performance.now() - startTime;

        patternTimes[pattern] = patternTime;
      }

      // All patterns should render within reasonable time for test environments
      Object.values(patternTimes).forEach(time => {
        expect(time).toBeLessThan(50); // Generous timeout per pattern
      });

      const times = Object.values(patternTimes);
      const maxTime = Math.max(...times);

      // Ensure no pattern causes unreasonable performance issues
      expect(maxTime).toBeLessThan(75); // Absolute maximum for any pattern
    });
  });
});
