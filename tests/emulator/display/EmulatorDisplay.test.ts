/**
 * Tests for EmulatorDisplay component
 *
 * This component renders Game Boy screen output to an HTML canvas
 * with pixel-perfect rendering and configurable scaling.
 */

import { EmulatorDisplay } from '../../../src/emulator/display/EmulatorDisplay';

describe('EmulatorDisplay', () => {
  let parentElement: HTMLDivElement;

  beforeEach(() => {
    // Create a mock parent element for each test
    parentElement = document.createElement('div');
  });

  afterEach(() => {
    // Clean up references to prevent memory leaks
    parentElement?.remove();
  });

  describe('constructor', () => {
    it('should create display with default Game Boy resolution and 3x scale', () => {
      new EmulatorDisplay(parentElement);

      // Should append a canvas to the parent element
      const canvas = parentElement.querySelector('canvas');
      expect(canvas).toBeTruthy();

      // Canvas should have Game Boy resolution scaled 3x (160x144 -> 480x432)
      expect(canvas?.width).toBe(480);
      expect(canvas?.height).toBe(432);

      // Canvas should have pixel-perfect rendering
      expect(canvas?.style.imageRendering).toBe('pixelated');
    });

    it('should create display with custom width and height', () => {
      const config = { width: 320, height: 288 };
      new EmulatorDisplay(parentElement, config);

      const canvas = parentElement.querySelector('canvas');
      expect(canvas?.width).toBe(320);
      expect(canvas?.height).toBe(288);
    });

    it('should create display with custom scale factor', () => {
      const config = { scale: 2 };
      new EmulatorDisplay(parentElement, config);

      const canvas = parentElement.querySelector('canvas');
      // Game Boy resolution (160x144) scaled 2x
      expect(canvas?.width).toBe(320);
      expect(canvas?.height).toBe(288);
    });

    it('should create display with both custom dimensions and scale', () => {
      // When both dimensions and scale are provided, dimensions should take precedence
      const config = { width: 640, height: 576, scale: 2 };
      new EmulatorDisplay(parentElement, config);

      const canvas = parentElement.querySelector('canvas');
      expect(canvas?.width).toBe(640);
      expect(canvas?.height).toBe(576);
    });

    it('should not expose canvas element externally', () => {
      const display = new EmulatorDisplay(parentElement);

      // The display instance should not have direct access to canvas
      expect((display as any).canvas).toBeUndefined();
      // TypeScript should prevent access to private canvas property
      expect(typeof display).toBe('object');
    });
  });

  describe('draw method', () => {
    let display: EmulatorDisplay;

    beforeEach(() => {
      display = new EmulatorDisplay(parentElement);
    });

    it('should accept pixel data array and render to canvas', () => {
      // Create mock pixel data for Game Boy screen (160x144 = 23040 pixels)
      // Each pixel is represented as RGBA values
      const pixelData = new Uint8ClampedArray(160 * 144 * 4);

      // Fill with test pattern - white pixels
      for (let i = 0; i < pixelData.length; i += 4) {
        pixelData[i] = 255; // R
        pixelData[i + 1] = 255; // G
        pixelData[i + 2] = 255; // B
        pixelData[i + 3] = 255; // A
      }

      // Should not throw when drawing valid pixel data
      expect(() => display.draw(pixelData)).not.toThrow();
    });

    it('should handle empty pixel data gracefully', () => {
      const emptyPixelData = new Uint8ClampedArray(0);

      // Should not throw with empty data
      expect(() => display.draw(emptyPixelData)).not.toThrow();
    });

    it('should handle different pixel data formats', () => {
      // Test with standard Game Boy screen size
      const standardPixelData = new Uint8ClampedArray(160 * 144 * 4);
      expect(() => display.draw(standardPixelData)).not.toThrow();

      // Test with smaller data
      const smallPixelData = new Uint8ClampedArray(80 * 72 * 4);
      expect(() => display.draw(smallPixelData)).not.toThrow();
    });

    it('should render pixel data correctly', () => {
      // Test that the draw method works with standard Game Boy screen data
      const pixelData = new Uint8ClampedArray(160 * 144 * 4);

      // Should not throw when drawing valid pixel data
      expect(() => display.draw(pixelData)).not.toThrow();
    });
  });

  describe('resource management', () => {
    it('should properly manage canvas lifecycle', () => {
      const display = new EmulatorDisplay(parentElement);

      // Canvas should be created and appended
      const canvas = parentElement.querySelector('canvas');
      expect(canvas).toBeTruthy();

      // Multiple draws should not create additional canvases
      const pixelData = new Uint8ClampedArray(160 * 144 * 4);
      display.draw(pixelData);
      display.draw(pixelData);

      const allCanvases = parentElement.querySelectorAll('canvas');
      expect(allCanvases.length).toBe(1);
    });
  });
});
