/**
 * PPU Rendering Pipeline Tests - Frontend Display Integration
 *
 * Tests the integration between Backend PPU component and Frontend display system.
 * Focuses on frame buffer processing, color palette application, and canvas rendering.
 *
 * RED Phase: These tests define the desired behavior for PPU-Display integration
 */

import { EmulatorDisplay } from '../../../src/emulator/display/EmulatorDisplay';
import { PPURenderingPipeline } from '../../../src/emulator/display/PPURenderingPipeline';

describe('PPURenderingPipeline', () => {
  let parentElement: HTMLDivElement;
  let display: EmulatorDisplay;

  beforeEach(() => {
    parentElement = document.createElement('div');
    display = new EmulatorDisplay(parentElement);
  });

  afterEach(() => {
    parentElement?.remove();
  });

  describe('constructor', () => {
    it('should initialize rendering pipeline with display component', () => {
      const pipeline = new PPURenderingPipeline(display);

      expect(pipeline).toBeDefined();
      expect(pipeline.isReady()).toBe(true);
    });

    it('should throw error if display component is null', () => {
      expect(() => new PPURenderingPipeline(null as any)).toThrow('Display component is required');
    });
  });

  describe('frame buffer processing', () => {
    let pipeline: PPURenderingPipeline;

    beforeEach(() => {
      pipeline = new PPURenderingPipeline(display);
    });

    it('should process PPU frame buffer (160x144) to RGBA canvas data', () => {
      // PPU frame buffer: 160x144 pixels, 2 bits per pixel (Game Boy format)
      const ppuFrameBuffer = new Uint8Array(160 * 144);

      // Fill with test pattern - different Game Boy gray levels (0-3)
      for (let i = 0; i < ppuFrameBuffer.length; i++) {
        ppuFrameBuffer[i] = i % 4; // Cycle through GB color indices 0,1,2,3
      }

      const result = pipeline.processFrameBuffer(ppuFrameBuffer);

      // Should convert to RGBA format for canvas
      expect(result).toBeInstanceOf(Uint8ClampedArray);
      expect(result.length).toBe(160 * 144 * 4); // RGBA format

      // First pixel should be converted from GB color 0 to RGBA
      expect(result[0]).toBeDefined(); // R
      expect(result[1]).toBeDefined(); // G
      expect(result[2]).toBeDefined(); // B
      expect(result[3]).toBe(255); // A (always opaque)
    });

    it('should handle empty frame buffer gracefully', () => {
      const emptyBuffer = new Uint8Array(0);

      const result = pipeline.processFrameBuffer(emptyBuffer);

      expect(result).toBeInstanceOf(Uint8ClampedArray);
      expect(result.length).toBe(0);
    });

    it('should validate frame buffer dimensions', () => {
      // Invalid size - not 160x144
      const invalidBuffer = new Uint8Array(100 * 100);

      expect(() => pipeline.processFrameBuffer(invalidBuffer)).toThrow(
        'Invalid frame buffer size. Expected 160x144 pixels'
      );
    });
  });

  describe('Game Boy color palette system', () => {
    let pipeline: PPURenderingPipeline;

    beforeEach(() => {
      pipeline = new PPURenderingPipeline(display);
    });

    it('should apply default DMG green palette', () => {
      const gbColors = new Uint8Array(160 * 144); // Proper frame buffer size
      // Fill with pattern of all 4 Game Boy colors
      for (let i = 0; i < gbColors.length; i++) {
        gbColors[i] = i % 4;
      }

      const result = pipeline.processFrameBuffer(gbColors);

      // Check that each Game Boy color maps to distinct RGB values
      const color0 = [result[0], result[1], result[2]]; // White
      const color1 = [result[4], result[5], result[6]]; // Light Gray
      const color2 = [result[8], result[9], result[10]]; // Dark Gray
      const color3 = [result[12], result[13], result[14]]; // Black

      // DMG green palette should produce distinct values
      expect(color0).not.toEqual(color1);
      expect(color1).not.toEqual(color2);
      expect(color2).not.toEqual(color3);

      // Verify green tint characteristic of DMG
      expect(color0[1]).toBeGreaterThan(color0[0]); // Green > Red for lightest
      expect(color0[1]).toBeGreaterThan(color0[2]); // Green > Blue for lightest
    });

    it('should support custom color palettes', () => {
      const customPalette = {
        color0: [255, 255, 255] as [number, number, number], // White
        color1: [192, 192, 192] as [number, number, number], // Silver
        color2: [128, 128, 128] as [number, number, number], // Gray
        color3: [0, 0, 0] as [number, number, number], // Black
      };

      pipeline.setColorPalette(customPalette);

      const gbColors = new Uint8Array(160 * 144);
      // Fill with test pattern for custom palette testing
      for (let i = 0; i < gbColors.length; i++) {
        gbColors[i] = i % 4;
      }
      const result = pipeline.processFrameBuffer(gbColors);

      // Verify custom colors are applied
      expect([result[0], result[1], result[2]]).toEqual([255, 255, 255]);
      expect([result[4], result[5], result[6]]).toEqual([192, 192, 192]);
      expect([result[8], result[9], result[10]]).toEqual([128, 128, 128]);
      expect([result[12], result[13], result[14]]).toEqual([0, 0, 0]);
    });

    it('should provide predefined palette options', () => {
      // DMG Green
      pipeline.setColorPalette('dmg-green');
      expect(pipeline.getCurrentPaletteName()).toBe('dmg-green');

      // Grayscale
      pipeline.setColorPalette('grayscale');
      expect(pipeline.getCurrentPaletteName()).toBe('grayscale');

      // High Contrast
      pipeline.setColorPalette('high-contrast');
      expect(pipeline.getCurrentPaletteName()).toBe('high-contrast');
    });

    it('should throw error for invalid palette', () => {
      expect(() => pipeline.setColorPalette('invalid-palette')).toThrow(
        'Unknown color palette: invalid-palette'
      );
    });
  });

  describe('frame rendering coordination', () => {
    let pipeline: PPURenderingPipeline;

    beforeEach(() => {
      pipeline = new PPURenderingPipeline(display);
    });

    it('should render frame to display component', () => {
      const ppuFrameBuffer = new Uint8Array(160 * 144);
      // Fill with test pattern
      ppuFrameBuffer.fill(1); // Light gray

      // Spy on display.draw to verify it's called
      const drawSpy = jest.spyOn(display, 'draw');

      pipeline.renderFrame(ppuFrameBuffer);

      expect(drawSpy).toHaveBeenCalledTimes(1);
      expect(drawSpy).toHaveBeenCalledWith(expect.any(Uint8ClampedArray));

      // Verify the RGBA data passed to display
      const calledWith = drawSpy.mock.calls[0][0] as Uint8ClampedArray;
      expect(calledWith.length).toBe(160 * 144 * 4);
    });

    it('should track frame rendering statistics', () => {
      const frameBuffer = new Uint8Array(160 * 144);
      frameBuffer.fill(2);

      // Render multiple frames
      pipeline.renderFrame(frameBuffer);
      pipeline.renderFrame(frameBuffer);
      pipeline.renderFrame(frameBuffer);

      const stats = pipeline.getRenderingStats();
      expect(stats.framesRendered).toBe(3);
      expect(stats.lastFrameTime).toBeGreaterThan(0);
      expect(stats.averageFrameTime).toBeGreaterThan(0);
    });

    it('should handle frame buffer processing errors gracefully', () => {
      const invalidBuffer = new Uint8Array(100); // Wrong size

      // Should not throw, but should not render
      expect(() => pipeline.renderFrame(invalidBuffer)).not.toThrow();

      const stats = pipeline.getRenderingStats();
      expect(stats.framesRendered).toBe(0);
      expect(stats.errorCount).toBe(1);
    });
  });

  describe('performance optimization', () => {
    let pipeline: PPURenderingPipeline;

    beforeEach(() => {
      pipeline = new PPURenderingPipeline(display);
    });

    it('should reuse RGBA buffer to avoid allocations', () => {
      const frameBuffer1 = new Uint8Array(160 * 144);
      const frameBuffer2 = new Uint8Array(160 * 144);

      frameBuffer1.fill(1);
      frameBuffer2.fill(2);

      const result1 = pipeline.processFrameBuffer(frameBuffer1);
      const result2 = pipeline.processFrameBuffer(frameBuffer2);

      // Should reuse the same buffer instance
      expect(result1).toBe(result2);
    });

    it('should track buffer reuse statistics', () => {
      const frameBuffer = new Uint8Array(160 * 144);

      pipeline.processFrameBuffer(frameBuffer);
      pipeline.processFrameBuffer(frameBuffer);
      pipeline.processFrameBuffer(frameBuffer);

      const stats = pipeline.getPerformanceStats();
      expect(stats.bufferReuses).toBe(2); // First allocation, then 2 reuses
      expect(stats.allocations).toBe(1);
    });
  });

  describe('Game Boy hardware accuracy', () => {
    let pipeline: PPURenderingPipeline;

    beforeEach(() => {
      pipeline = new PPURenderingPipeline(display);
    });

    it('should maintain exact 160x144 resolution', () => {
      const frameBuffer = new Uint8Array(160 * 144);
      const result = pipeline.processFrameBuffer(frameBuffer);

      // Canvas data must be exactly Game Boy resolution
      expect(result.length).toBe(160 * 144 * 4);
    });

    it('should preserve pixel-perfect rendering', () => {
      // Create checkerboard pattern
      const frameBuffer = new Uint8Array(160 * 144);
      for (let y = 0; y < 144; y++) {
        for (let x = 0; x < 160; x++) {
          frameBuffer[y * 160 + x] = (x + y) % 2 === 0 ? 0 : 3;
        }
      }

      const result = pipeline.processFrameBuffer(frameBuffer);

      // Verify pattern is preserved in RGBA conversion
      // Check first row alternating pattern
      const firstPixel = [result[0], result[1], result[2]];
      const secondPixel = [result[4], result[5], result[6]];

      expect(firstPixel).not.toEqual(secondPixel);
    });

    it('should handle all 4 Game Boy color indices', () => {
      const frameBuffer = new Uint8Array(160 * 144);
      // Fill with all Game Boy color values to test all indices
      for (let i = 0; i < frameBuffer.length; i += 4) {
        frameBuffer[i] = 0; // White
        frameBuffer[i + 1] = 1; // Light Gray
        frameBuffer[i + 2] = 2; // Dark Gray
        frameBuffer[i + 3] = 3; // Black
      }

      expect(() => pipeline.processFrameBuffer(frameBuffer)).not.toThrow();
    });

    it('should reject invalid color indices', () => {
      const frameBuffer = new Uint8Array(160 * 144);
      frameBuffer.fill(0); // Fill with valid values first
      frameBuffer[0] = 4; // Invalid - only 0-3 allowed

      expect(() => pipeline.processFrameBuffer(frameBuffer)).toThrow(
        'Invalid Game Boy color index: 4'
      );
    });
  });

  describe('frame rate optimization', () => {
    let pipeline: PPURenderingPipeline;

    beforeEach(() => {
      pipeline = new PPURenderingPipeline(display);
    });

    it('should track frame timing for 59.7 FPS target', () => {
      const frameBuffer = new Uint8Array(160 * 144);
      const targetFrameTime = 1000 / 59.7; // ~16.75ms

      const startTime = performance.now();
      pipeline.renderFrame(frameBuffer);
      const endTime = performance.now();

      const actualFrameTime = endTime - startTime;

      // Frame processing should be much faster than target
      expect(actualFrameTime).toBeLessThan(targetFrameTime);

      const stats = pipeline.getRenderingStats();
      expect(stats.lastFrameTime).toBeGreaterThan(0);
    });

    it('should detect frame rate issues', () => {
      const frameBuffer = new Uint8Array(160 * 144);

      // Simulate slow rendering by processing many frames quickly
      for (let i = 0; i < 10; i++) {
        pipeline.renderFrame(frameBuffer);
      }

      const stats = pipeline.getRenderingStats();
      expect(stats.averageFrameTime).toBeGreaterThan(0);

      // Should not exceed reasonable frame time even with multiple renders
      expect(stats.averageFrameTime).toBeLessThan(100); // 100ms max
    });
  });
});
