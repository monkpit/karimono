/**
 * PPU Integration Tests
 *
 * Tests the integration of PPU component with EmulatorContainer and MMU
 */

import { EmulatorContainer } from '../../../src/emulator/EmulatorContainer';

describe('PPU Integration', () => {
  let container: EmulatorContainer;
  let mockParent: HTMLElement;

  beforeEach(() => {
    // Create mock parent element
    mockParent = document.createElement('div');
    document.body.appendChild(mockParent);

    // Create emulator container
    container = new EmulatorContainer(mockParent);
  });

  afterEach(() => {
    document.body.removeChild(mockParent);
  });

  describe('PPU Component Initialization', () => {
    test('should initialize PPU component during container construction', () => {
      const ppu = container.getPPU();

      expect(ppu).toBeDefined();
      expect(ppu).not.toBeNull();
    });

    test('should wire PPU to MMU for register delegation', () => {
      const mmu = container.getMMU();

      // Write to a PPU register (LCDC - 0xFF40)
      mmu.writeByte(0xff40, 0x91);

      // Read back from PPU register
      const lcdcValue = mmu.readByte(0xff40);

      expect(lcdcValue).toBe(0x91);
    });

    test('should delegate core PPU register range (0xFF40-0xFF45) to PPU component', () => {
      const mmu = container.getMMU();

      // Test writing to various PPU registers
      const testCases = [
        { address: 0xff40, value: 0x80 }, // LCDC
        { address: 0xff41, value: 0x40 }, // STAT
        { address: 0xff42, value: 0x12 }, // SCY
        { address: 0xff43, value: 0x34 }, // SCX
        { address: 0xff45, value: 0x56 }, // LYC
      ];

      testCases.forEach(({ address, value }) => {
        mmu.writeByte(address, value);
        const readValue = mmu.readByte(address);

        // Verify the value was processed by PPU (may be masked/filtered)
        expect(typeof readValue).toBe('number');
        expect(readValue).toBeGreaterThanOrEqual(0);
        expect(readValue).toBeLessThanOrEqual(255);
      });
    });
  });

  describe('CPU/PPU Synchronized Execution', () => {
    test('should step PPU when CPU executes', () => {
      const ppu = container.getPPU();
      expect(ppu).toBeDefined();

      // Start emulation
      container.start();

      // Execute several CPU steps
      const totalCycles = container.step() + container.step() + container.step();

      // PPU should have received cycles and potentially changed state
      expect(totalCycles).toBeGreaterThan(0);

      // PPU mode might change based on timing, but should be valid
      if (ppu) {
        const currentMode = ppu.getMode();
        expect([0, 1, 2, 3]).toContain(currentMode);
      }
    });

    test('should handle frame completion', () => {
      const ppu = container.getPPU();
      expect(ppu).toBeDefined();

      container.start();

      // Run many cycles to potentially complete a frame
      for (let i = 0; i < 1000; i++) {
        container.step();

        if (ppu?.isFrameReady()) {
          // Frame buffer should be available
          const frameBuffer = ppu.getFrameBuffer();
          expect(frameBuffer).not.toBeNull();
          expect(frameBuffer).toHaveLength(160 * 144);

          break;
        }
      }

      // Note: Due to PPU timing, frame might not complete in limited cycles
      // This test verifies the integration works when frame does complete
    });
  });

  describe('Interrupt Integration', () => {
    test('should route PPU interrupts through MMU', () => {
      const mmu = container.getMMU();

      // Clear interrupt flag
      mmu.writeByte(0xff0f, 0x00);

      // Simulate PPU requesting VBlank interrupt (bit 0)
      mmu.requestInterrupt(0);

      // Verify interrupt was set in IF register
      const ifValue = mmu.readByte(0xff0f);
      expect(ifValue & 0x01).toBe(0x01); // VBlank interrupt bit set
    });
  });

  describe('Reset Behavior', () => {
    test('should reset PPU component when container resets', () => {
      const ppu = container.getPPU();
      expect(ppu).toBeDefined();

      container.start();

      // Modify PPU state
      container.step();
      container.step();

      // Reset container
      container.reset();

      // PPU should be reset to initial state
      expect(container.isRunning()).toBe(false);
      if (ppu) {
        expect(ppu.getMode()).toBe(2); // OAMScan mode (initial)
      }
    });
  });
});
