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
    it('should process frame buffer within 16.75ms target (59.7 FPS)', () => {
      const frameBuffer = new Uint8Array(160 * 144);
      // Fill with complex pattern that exercises all code paths
      for (let i = 0; i < frameBuffer.length; i++) {
        frameBuffer[i] = (i * 17 + (i % 37)) % 4; // Complex but deterministic pattern
      }

      const TARGET_FRAME_TIME = 1000 / 59.7; // ~16.75ms

      const startTime = performance.now();
      pipeline.renderFrame(frameBuffer);
      const endTime = performance.now();

      const actualFrameTime = endTime - startTime;

      // Processing should be significantly faster than the frame time budget
      expect(actualFrameTime).toBeLessThan(TARGET_FRAME_TIME * 0.8); // 80% of budget

      // Verify it's fast enough for real-time rendering
      expect(actualFrameTime).toBeLessThan(15); // Should be under 15ms for safety margin
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

      // Frame times should be consistent (low standard deviation)
      expect(stdDev).toBeLessThan(avgTime * 2.0); // Within 200% of average
      expect(avgTime).toBeLessThan(15); // Average under 15ms
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

      // Even worst-case should be fast enough
      expect(endTime - startTime).toBeLessThan(10); // 10ms max for worst case
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

      // Canvas draw should be very fast
      expect(drawTime).toBeLessThan(5); // Under 5ms
    });

    it('should test scaling impact on rendering performance', () => {
      // Test different scaling factors
      const scales = [1, 2, 3, 4];
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

      // Scaling should not significantly impact render performance
      // (Canvas handles scaling efficiently)
      const maxTime = Math.max(...renderTimes);
      const minTime = Math.min(...renderTimes);
      const timeVariation = (maxTime - minTime) / minTime;

      expect(timeVariation).toBeLessThan(2.0); // Less than 200% variation
      expect(maxTime).toBeLessThan(10); // Even largest scale under 10ms
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

      // Color conversion should be very fast
      expect(conversionTime).toBeLessThan(5); // Under 5ms
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

      // Palette switching should have minimal impact
      const timeDifference = Math.abs(grayscaleTime - defaultTime);
      expect(timeDifference).toBeLessThan(2); // Under 2ms difference
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

      // Custom and predefined palettes should have similar performance
      const timeDifference = Math.abs(customTime - predefinedTime);
      expect(timeDifference).toBeLessThan(1); // Under 1ms difference
    });
  });

  describe('real-world performance simulation', () => {
    it('should simulate full emulation frame rendering loop', () => {
      const FRAMES_PER_SECOND = 59.7;
      const FRAME_COUNT = 60; // 1 second worth
      const TARGET_TOTAL_TIME = 1000; // 1 second total

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

      // Rendering should use only a small fraction of available frame time
      expect(totalRenderTime).toBeLessThan(TARGET_TOTAL_TIME * 0.1); // 10% of CPU time
      expect(avgFrameTime).toBeLessThan((1000 / FRAMES_PER_SECOND) * 0.1); // 10% of frame budget
      expect(maxFrameTime).toBeLessThan(5); // No single frame over 5ms
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

      // All patterns should render within acceptable time
      Object.values(patternTimes).forEach(time => {
        expect(time).toBeLessThan(5); // Under 5ms for any pattern
      });

      // Performance should be consistent across different patterns
      const times = Object.values(patternTimes);
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      const variation = (maxTime - minTime) / minTime;

      expect(variation).toBeLessThan(5.0); // Less than 500% variation
    });
  });
});
