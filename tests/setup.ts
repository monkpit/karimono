// Jest setup file for global test configuration

// Mock Canvas API for EmulatorDisplay testing
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn((contextType: string) => {
    if (contextType === '2d') {
      return {
        clearRect: jest.fn(),
        drawImage: jest.fn(),
        putImageData: jest.fn(),
        getImageData: jest.fn(() => ({
          data: new Uint8ClampedArray(4),
          width: 1,
          height: 1,
        })),
        imageSmoothingEnabled: false,
      };
    }
    return null;
  }),
});

// Mock ImageData constructor for canvas testing
global.ImageData = class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(data: Uint8ClampedArray, width: number, height?: number) {
    this.data = data;
    this.width = width;
    this.height = height ?? data.length / (4 * width);
  }
} as any;

export {};
