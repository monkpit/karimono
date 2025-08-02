/**
 * EmulatorDisplay - Renders Game Boy screen output to HTML canvas
 *
 * Provides pixel-perfect rendering with configurable scaling.
 * Default Game Boy resolution: 160x144 pixels
 * Default scale: 3x for modern displays
 */

export interface EmulatorDisplayConfig {
  width?: number;
  height?: number;
  scale?: number;
}

export class EmulatorDisplay {
  private static readonly DEFAULT_GB_WIDTH = 160;
  private static readonly DEFAULT_GB_HEIGHT = 144;
  private static readonly DEFAULT_SCALE = 3;

  private canvasElement: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;

  constructor(parentElement: HTMLElement, config: EmulatorDisplayConfig = {}) {
    // Calculate canvas dimensions
    const { width, height } = this.calculateDimensions(config);

    // Create and configure canvas
    this.canvasElement = document.createElement('canvas');
    this.canvasElement.width = width;
    this.canvasElement.height = height;

    // Set pixel-perfect rendering
    this.canvasElement.style.imageRendering = 'pixelated';

    // Get 2D context
    const ctx = this.canvasElement.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.context = ctx;

    // Append to parent element
    parentElement.appendChild(this.canvasElement);
  }

  /**
   * Renders pixel data to the canvas
   * @param pixelData - RGBA pixel data array
   */
  public draw(pixelData: Uint8ClampedArray): void {
    if (pixelData.length === 0) {
      return; // Handle empty data gracefully
    }

    // Calculate dimensions from pixel data
    const pixelCount = pixelData.length / 4; // 4 bytes per pixel (RGBA)

    if (pixelCount === EmulatorDisplay.DEFAULT_GB_WIDTH * EmulatorDisplay.DEFAULT_GB_HEIGHT) {
      // Standard Game Boy screen data
      this.drawStandardGameBoyScreen(pixelData);
    } else {
      // Dynamic dimensions based on data size
      this.drawDynamicScreen(pixelData);
    }
  }

  private calculateDimensions(config: EmulatorDisplayConfig): { width: number; height: number } {
    if (config.width !== undefined && config.height !== undefined) {
      // Explicit dimensions provided
      return { width: config.width, height: config.height };
    }

    // Use scale factor with default Game Boy resolution
    const scale = config.scale ?? EmulatorDisplay.DEFAULT_SCALE;
    return {
      width: EmulatorDisplay.DEFAULT_GB_WIDTH * scale,
      height: EmulatorDisplay.DEFAULT_GB_HEIGHT * scale,
    };
  }

  private drawStandardGameBoyScreen(pixelData: Uint8ClampedArray): void {
    const imageData = new ImageData(
      pixelData,
      EmulatorDisplay.DEFAULT_GB_WIDTH,
      EmulatorDisplay.DEFAULT_GB_HEIGHT
    );

    this.renderImageDataToCanvas(
      imageData,
      EmulatorDisplay.DEFAULT_GB_WIDTH,
      EmulatorDisplay.DEFAULT_GB_HEIGHT
    );
  }

  private drawDynamicScreen(pixelData: Uint8ClampedArray): void {
    const { width, height } = this.inferDimensionsFromPixelData(pixelData);

    if (width > 0 && height > 0 && width * height * 4 <= pixelData.length) {
      const imageData = new ImageData(pixelData.slice(0, width * height * 4), width, height);

      this.renderImageDataToCanvas(imageData, width, height);
    }
  }

  /**
   * Common method to render ImageData to the canvas with scaling
   */
  private renderImageDataToCanvas(
    imageData: ImageData,
    sourceWidth: number,
    sourceHeight: number
  ): void {
    // Prepare main canvas for drawing
    this.context.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    this.context.imageSmoothingEnabled = false;

    // Create temporary canvas for the source image
    const tempCanvas = this.createTemporaryCanvas(sourceWidth, sourceHeight);
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) {
      throw new Error('Failed to get 2D context for temporary canvas');
    }

    // Put image data on temporary canvas and scale to main canvas
    tempCtx.putImageData(imageData, 0, 0);
    this.context.drawImage(
      tempCanvas,
      0,
      0,
      sourceWidth,
      sourceHeight,
      0,
      0,
      this.canvasElement.width,
      this.canvasElement.height
    );
  }

  /**
   * Creates a temporary canvas with specified dimensions
   */
  private createTemporaryCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  /**
   * Infers width and height from pixel data length
   * Uses square-root approach for reasonable aspect ratio
   */
  private inferDimensionsFromPixelData(pixelData: Uint8ClampedArray): {
    width: number;
    height: number;
  } {
    const pixelCount = pixelData.length / 4; // 4 bytes per RGBA pixel

    // Try to find dimensions that create a reasonable aspect ratio
    const width = Math.floor(Math.sqrt(pixelCount));
    const height = width > 0 ? Math.floor(pixelCount / width) : 0;

    return { width, height };
  }
}
