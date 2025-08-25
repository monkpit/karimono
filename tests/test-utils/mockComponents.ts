/**
 * Mock components for testing
 * Provides lightweight mocks for emulator components to enable isolated testing
 */

/**
 * Creates a mock display component for testing
 * Returns a minimal implementation for MMU construction
 */
export function createMockDisplayComponent(): {
  reset: () => void;
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
  step: () => number;
  render: () => void;
  getFrameBuffer: () => Uint8Array;
  screenshot: () => Uint8Array;
} {
  return {
    reset: (): void => {},
    start: (): void => {},
    stop: (): void => {},
    isRunning: (): boolean => false,
    step: (): number => 0,
    render: (): void => {},
    getFrameBuffer: (): Uint8Array => new Uint8Array(160 * 144 * 4),
    screenshot: (): Uint8Array => new Uint8Array(160 * 144 * 4),
  };
}
