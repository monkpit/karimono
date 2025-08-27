/**
 * PPURenderingPipeline - Processes PPU frame buffer for display rendering
 *
 * Handles conversion from Game Boy 2-bit color format to RGBA canvas data,
 * applies color palettes, and coordinates with EmulatorDisplay for rendering.
 *
 * Architecture:
 * - Receives 160×144 frame buffer from Backend PPU component
 * - Applies Game Boy color palette (DMG green, grayscale, custom)
 * - Converts to RGBA format for canvas rendering
 * - Optimizes buffer reuse for 60 FPS performance
 */

import type { DisplayComponent } from '../types';

/**
 * Color palette definition for Game Boy colors
 */
export interface ColorPalette {
  color0: [number, number, number]; // White/Lightest
  color1: [number, number, number]; // Light Gray
  color2: [number, number, number]; // Dark Gray
  color3: [number, number, number]; // Black/Darkest
}

/**
 * Rendering statistics for performance monitoring
 */
export interface RenderingStats {
  framesRendered: number;
  lastFrameTime: number;
  averageFrameTime: number;
  errorCount: number;
}

/**
 * Performance statistics for buffer management
 */
export interface PerformanceStats {
  bufferReuses: number;
  allocations: number;
}

/**
 * PPU Rendering Pipeline - Frontend component for PPU display integration
 */
export class PPURenderingPipeline {
  private display: DisplayComponent;
  private rgbaBuffer: Uint8ClampedArray | null = null;
  private currentPalette: ColorPalette;
  private currentPaletteName = 'dmg-green';

  // Statistics tracking
  private framesRendered = 0;
  private lastFrameTime = 0;
  private frameTimes: number[] = [];
  private errorCount = 0;
  private bufferReuses = 0;
  private allocations = 0;

  // Predefined color palettes
  private static readonly PALETTES: Record<string, ColorPalette> = {
    'dmg-green': {
      color0: [155, 188, 15], // DMG Light Green
      color1: [139, 172, 15], // DMG Medium Green
      color2: [48, 98, 48], // DMG Dark Green
      color3: [15, 56, 15], // DMG Darkest Green
    },
    grayscale: {
      color0: [255, 255, 255], // White
      color1: [170, 170, 170], // Light Gray
      color2: [85, 85, 85], // Dark Gray
      color3: [0, 0, 0], // Black
    },
    'high-contrast': {
      color0: [255, 255, 255], // Pure White
      color1: [192, 192, 192], // Light Gray
      color2: [64, 64, 64], // Dark Gray
      color3: [0, 0, 0], // Pure Black
    },
  };

  constructor(display: DisplayComponent) {
    if (!display) {
      throw new Error('Display component is required');
    }

    this.display = display;
    this.currentPalette = PPURenderingPipeline.PALETTES['dmg-green'];
  }

  /**
   * Check if pipeline is ready for rendering
   */
  public isReady(): boolean {
    return !!this.display;
  }

  /**
   * Process PPU frame buffer (160×144) to RGBA format
   */
  public processFrameBuffer(ppuFrameBuffer: Uint8Array): Uint8ClampedArray {
    if (ppuFrameBuffer.length === 0) {
      return new Uint8ClampedArray(0);
    }

    // Validate frame buffer size
    if (ppuFrameBuffer.length !== 160 * 144) {
      throw new Error('Invalid frame buffer size. Expected 160x144 pixels');
    }

    // Allocate or reuse RGBA buffer
    if (!this.rgbaBuffer) {
      this.rgbaBuffer = new Uint8ClampedArray(160 * 144 * 4);
      this.allocations++;
    } else {
      this.bufferReuses++;
    }

    // Convert each Game Boy pixel to RGBA
    for (let i = 0; i < ppuFrameBuffer.length; i++) {
      const gbColor = ppuFrameBuffer[i];

      // Validate Game Boy color index
      if (gbColor < 0 || gbColor > 3) {
        throw new Error(`Invalid Game Boy color index: ${gbColor}`);
      }

      // Get RGB color from palette
      const [r, g, b] = this.getColorFromPalette(gbColor);

      // Set RGBA values
      const rgbaIndex = i * 4;
      this.rgbaBuffer[rgbaIndex] = r; // Red
      this.rgbaBuffer[rgbaIndex + 1] = g; // Green
      this.rgbaBuffer[rgbaIndex + 2] = b; // Blue
      this.rgbaBuffer[rgbaIndex + 3] = 255; // Alpha (opaque)
    }

    return this.rgbaBuffer;
  }

  /**
   * Render frame to display component
   */
  public renderFrame(ppuFrameBuffer: Uint8Array): void {
    const startTime = performance.now();

    try {
      const rgbaData = this.processFrameBuffer(ppuFrameBuffer);
      this.display.draw(rgbaData);

      this.framesRendered++;
      const frameTime = performance.now() - startTime;
      this.updateFrameTimingStats(frameTime);
    } catch {
      this.errorCount++;
      // Don't re-throw - handle gracefully to maintain frame rate
    }
  }

  /**
   * Set color palette by name or custom palette
   */
  public setColorPalette(palette: string | ColorPalette): void {
    if (typeof palette === 'string') {
      if (!PPURenderingPipeline.PALETTES[palette]) {
        throw new Error(`Unknown color palette: ${palette}`);
      }
      this.currentPalette = PPURenderingPipeline.PALETTES[palette];
      this.currentPaletteName = palette;
    } else {
      this.currentPalette = palette;
      this.currentPaletteName = 'custom';
    }
  }

  /**
   * Get current palette name
   */
  public getCurrentPaletteName(): string {
    return this.currentPaletteName;
  }

  /**
   * Get rendering statistics
   */
  public getRenderingStats(): RenderingStats {
    return {
      framesRendered: this.framesRendered,
      lastFrameTime: this.lastFrameTime,
      averageFrameTime: this.calculateAverageFrameTime(),
      errorCount: this.errorCount,
    };
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): PerformanceStats {
    return {
      bufferReuses: this.bufferReuses,
      allocations: this.allocations,
    };
  }

  /**
   * Get RGB color from current palette
   */
  private getColorFromPalette(gbColor: number): [number, number, number] {
    switch (gbColor) {
      case 0:
        return this.currentPalette.color0;
      case 1:
        return this.currentPalette.color1;
      case 2:
        return this.currentPalette.color2;
      case 3:
        return this.currentPalette.color3;
      default:
        return [0, 0, 0]; // Should not reach here due to validation
    }
  }

  /**
   * Update frame timing statistics
   */
  private updateFrameTimingStats(frameTime: number): void {
    this.lastFrameTime = frameTime;

    // Keep rolling window of last 60 frame times
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }
  }

  /**
   * Calculate average frame time from recent frames
   */
  private calculateAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;

    const sum = this.frameTimes.reduce((acc, time) => acc + time, 0);
    return sum / this.frameTimes.length;
  }
}
