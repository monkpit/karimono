import { PPU } from '../../../../src/emulator/core/graphics/PPU';
import { PPUMode } from '../../../../src/emulator/types';

describe('PPU', () => {
  let ppu: PPU;

  beforeEach(() => {
    ppu = new PPU();
  });

  /**
   * @see {@link https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#Hardware_Regs}
   * @see {@link https://gbdev.io/pandocs/LCD_Registers.html#ff44--ly-lcdc-y-coordinate}
   */
  it('should initialize with LY register at 0', () => {
    // The LY register indicates the current horizontal line being drawn.
    // It ranges from 0 to 153. 0-143 are visible lines, 144-153 are V-blank.
    // On power-up, LY is 0.
    expect(ppu.readRegister(0xff44)).toBe(0);
  });

  it('should be able to be instantiated', () => {
    expect(ppu).toBeInstanceOf(PPU);
  });

  it('should initialize to OAMScan mode', () => {
    expect(ppu.getMode()).toBe(PPUMode.OAMScan);
  });

  it('should not be running initially', () => {
    expect(ppu.isRunning()).toBe(false);
  });

  it('should have frame buffer initialized', () => {
    const frameBuffer = ppu.getFrameBuffer();
    expect(frameBuffer).not.toBeNull();
    expect(frameBuffer?.length).toBe(160 * 144); // GB screen dimensions
  });

  /**
   * @see {@link https://gbdev.io/pandocs/Pixel_FIFO.html#ppu-modes}
   * PPU timing: Mode 2 (OAM Scan) -> Mode 3 (Drawing) -> Mode 0 (HBlank)
   * Each scanline takes ~456 cycles. After 144 scanlines, enters Mode 1 (VBlank).
   */
  it('should increment LY after ~456 cycles', () => {
    ppu.start();

    expect(ppu.readRegister(0xff44)).toBe(0);

    // Step through one scanline worth of cycles
    ppu.step(456);

    expect(ppu.readRegister(0xff44)).toBe(1);
  });

  it('should enter VBlank mode when LY reaches 144', () => {
    ppu.start();

    // Step through 144 scanlines (144 * 456 cycles)
    for (let i = 0; i < 144; i++) {
      ppu.step(456);
    }

    expect(ppu.readRegister(0xff44)).toBe(144);
    expect(ppu.getMode()).toBe(PPUMode.VBlank);
    expect(ppu.isFrameReady()).toBe(true);
  });

  it('should cycle LY from 0-153', () => {
    ppu.start();

    // Step through complete frame cycle (154 scanlines)
    for (let i = 0; i < 154; i++) {
      ppu.step(456);
    }

    // Should wrap back to 0
    expect(ppu.readRegister(0xff44)).toBe(0);
    expect(ppu.getMode()).toBe(PPUMode.OAMScan);
  });

  describe('PPU Mode Transitions', () => {
    it('should transition through modes correctly within scanline', () => {
      ppu.start();

      // Initially in Mode 2 (OAM Scan)
      expect(ppu.getMode()).toBe(PPUMode.OAMScan);

      // After 80 cycles, should enter Mode 3 (Drawing)
      ppu.step(80);
      expect(ppu.getMode()).toBe(PPUMode.Drawing);

      // After additional 172 cycles, should enter Mode 0 (HBlank)
      ppu.step(172);
      expect(ppu.getMode()).toBe(PPUMode.HBlank);

      // After remaining cycles, should start next scanline
      ppu.step(204);
      expect(ppu.getMode()).toBe(PPUMode.OAMScan);
      expect(ppu.readRegister(0xff44)).toBe(1);
    });
  });

  describe('VBlank Interrupt Generation', () => {
    it('should trigger VBlank interrupt when entering VBlank mode', () => {
      const mockInterruptCallback = jest.fn();
      const ppuWithInterrupts = new PPU(mockInterruptCallback);
      ppuWithInterrupts.start();

      // Step through 144 scanlines to trigger VBlank
      for (let i = 0; i < 144; i++) {
        ppuWithInterrupts.step(456);
      }

      // Should have called interrupt callback with VBlank bit (0)
      expect(mockInterruptCallback).toHaveBeenCalledWith(0);
      expect(ppuWithInterrupts.getMode()).toBe(PPUMode.VBlank);
      expect(ppuWithInterrupts.readRegister(0xff44)).toBe(144);
    });

    it('should not trigger interrupt if callback is not provided', () => {
      const ppuWithoutCallback = new PPU(); // No callback provided
      ppuWithoutCallback.start();

      // This should not throw an error
      for (let i = 0; i < 144; i++) {
        ppuWithoutCallback.step(456);
      }

      expect(ppuWithoutCallback.getMode()).toBe(PPUMode.VBlank);
    });
  });

  describe('VRAM Access', () => {
    /**
     * @see {@link https://gbdev.io/pandocs/Memory_Map.html#8000-9fff-video-ram-vram}
     * VRAM contains tile data ($8000-$97FF) and tile maps ($9800-$9FFF)
     */
    it('should read VRAM tile data from $8000-$97FF range', () => {
      // PPU should have access to VRAM through MMU during certain modes
      // For now, test that PPU can access VRAM addresses
      expect(() => ppu.readVRAM(0x8000)).not.toThrow();
      expect(() => ppu.readVRAM(0x97ff)).not.toThrow();
    });

    it('should read VRAM tile maps from $9800-$9FFF range', () => {
      // Test background tile map access
      expect(() => ppu.readVRAM(0x9800)).not.toThrow(); // Tile map 0
      expect(() => ppu.readVRAM(0x9c00)).not.toThrow(); // Tile map 1
      expect(() => ppu.readVRAM(0x9fff)).not.toThrow(); // End of VRAM
    });

    it('should write VRAM data during appropriate times', () => {
      // PPU should be able to write to VRAM for testing purposes
      expect(() => ppu.writeVRAM(0x8000, 0x00)).not.toThrow();
      expect(() => ppu.writeVRAM(0x9800, 0x01)).not.toThrow();
    });

    it('should return 0x00 for uninitialized VRAM', () => {
      expect(ppu.readVRAM(0x8000)).toBe(0x00);
      expect(ppu.readVRAM(0x9800)).toBe(0x00);
    });

    it('should store and retrieve VRAM data correctly', () => {
      ppu.writeVRAM(0x8000, 0x42);
      expect(ppu.readVRAM(0x8000)).toBe(0x42);

      ppu.writeVRAM(0x9800, 0x1a);
      expect(ppu.readVRAM(0x9800)).toBe(0x1a);
    });
  });

  describe('Tile Decoding', () => {
    /**
     * @see {@link https://gbdev.io/pandocs/Tile_Data.html}
     * Game Boy uses 2bpp (2 bits per pixel) tile format
     * Each tile is 8x8 pixels = 16 bytes (2 bytes per row)
     */
    it('should decode 2bpp tile data to 4-color pixel indices', () => {
      // Set up a simple tile pattern in VRAM
      // Row 0: low byte 0xFF, high byte 0x00 = pattern 0,0,0,0,0,0,0,0 -> all color 1
      ppu.writeVRAM(0x8000, 0xff); // Low byte of row 0
      ppu.writeVRAM(0x8001, 0x00); // High byte of row 0

      const pixels = ppu.decodeTile(0x8000);

      // Should return array of pixel values for 8x8 tile (64 pixels)
      expect(pixels).toHaveLength(64);

      // First row should be all color 1 (0xFF low byte, 0x00 high byte)
      for (let i = 0; i < 8; i++) {
        expect(pixels[i]).toBe(1);
      }
    });

    it('should handle different 2bpp color combinations', () => {
      // Row with different color patterns
      ppu.writeVRAM(0x8000, 0b10101010); // Low byte alternating pattern
      ppu.writeVRAM(0x8001, 0b01010101); // High byte opposite pattern

      const pixels = ppu.decodeTile(0x8000);

      // Expected pattern: high bit 0, low bit 1 = color 1
      //                   high bit 1, low bit 0 = color 2
      expect(pixels[0]).toBe(1); // low=1, high=0
      expect(pixels[1]).toBe(2); // low=0, high=1
      expect(pixels[2]).toBe(1); // low=1, high=0
      expect(pixels[3]).toBe(2); // low=0, high=1
    });
  });

  describe('Palette Mapping', () => {
    /**
     * @see {@link https://gbdev.io/pandocs/Palettes.html#ff47--bgp-non-cgb-mode-only}
     * BGP register maps 4-color indices to actual Game Boy shades
     */
    it('should apply palette mapping from BGP register', () => {
      // Set a test palette: 0b11100100 = colors 3,2,1,0 -> shades 3,2,1,0
      ppu.writeRegister(0xff47, 0b11100100); // BGP register

      expect(ppu.applyPalette(0)).toBe(0); // Color 0 -> shade 0
      expect(ppu.applyPalette(1)).toBe(1); // Color 1 -> shade 1
      expect(ppu.applyPalette(2)).toBe(2); // Color 2 -> shade 2
      expect(ppu.applyPalette(3)).toBe(3); // Color 3 -> shade 3
    });

    it('should handle different palette configurations', () => {
      // Reverse palette: 0b00011011 = colors 0,1,2,3 -> shades 3,2,1,0
      ppu.writeRegister(0xff47, 0b00011011);

      expect(ppu.applyPalette(0)).toBe(3); // Color 0 -> shade 3
      expect(ppu.applyPalette(1)).toBe(2); // Color 1 -> shade 2
      expect(ppu.applyPalette(2)).toBe(1); // Color 2 -> shade 1
      expect(ppu.applyPalette(3)).toBe(0); // Color 3 -> shade 0
    });
  });

  describe('Background Tile Addressing', () => {
    /**
     * @see {@link https://gbdev.io/pandocs/LCDC.html#lcdc3--bg-tile-map-area}
     * LCDC bit 3: Background tile map area (0: $9800-$9BFF, 1: $9C00-$9FFF)
     */
    it('should select tile map based on LCDC bit 3', () => {
      // LCDC bit 3 = 0: use tile map at $9800-$9BFF
      ppu.writeRegister(0xff40, 0x91 & ~0x08); // Clear bit 3
      expect(ppu.getTileMapAddress()).toBe(0x9800);

      // LCDC bit 3 = 1: use tile map at $9C00-$9FFF
      ppu.writeRegister(0xff40, 0x91 | 0x08); // Set bit 3
      expect(ppu.getTileMapAddress()).toBe(0x9c00);
    });

    /**
     * @see {@link https://gbdev.io/pandocs/LCDC.html#lcdc4--bg--window-tile-data-area}
     * LCDC bit 4: Tile data area (0: $8800-$97FF signed, 1: $8000-$8FFF unsigned)
     */
    it('should select tile data addressing mode based on LCDC bit 4', () => {
      // LCDC bit 4 = 1: unsigned mode, tile 0 starts at $8000
      ppu.writeRegister(0xff40, 0x91 | 0x10); // Set bit 4
      expect(ppu.getTileDataAddress(0)).toBe(0x8000);
      expect(ppu.getTileDataAddress(1)).toBe(0x8010); // 16 bytes per tile
      expect(ppu.getTileDataAddress(255)).toBe(0x8ff0);

      // LCDC bit 4 = 0: signed mode, tile 0 starts at $9000
      ppu.writeRegister(0xff40, 0x91 & ~0x10); // Clear bit 4
      expect(ppu.getTileDataAddress(0)).toBe(0x9000);
      expect(ppu.getTileDataAddress(1)).toBe(0x9010);
      expect(ppu.getTileDataAddress(128)).toBe(0x8800); // Signed wrap-around
    });
  });

  describe('Background Rendering', () => {
    /**
     * @see {@link https://gbdev.io/pandocs/Scrolling.html}
     * Background rendering with scroll registers SCX/SCY
     */
    it('should render background with scroll offset', () => {
      ppu.start();

      // Set up a simple test pattern in tile map
      ppu.writeVRAM(0x9800, 0x01); // Tile ID 1 at map position (0,0)

      // Set up tile data for tile ID 1 - checkerboard pattern
      ppu.writeVRAM(0x8010, 0b10101010); // Row 0: alternating pattern
      ppu.writeVRAM(0x8011, 0b00000000); // Row 0: all low bits
      ppu.writeVRAM(0x8012, 0b01010101); // Row 1: inverted pattern
      ppu.writeVRAM(0x8013, 0b00000000); // Row 1: all low bits

      // Set scroll registers
      ppu.writeRegister(0xff42, 0); // SCY = 0
      ppu.writeRegister(0xff43, 0); // SCX = 0

      // Set a palette that makes color differences visible
      ppu.writeRegister(0xff47, 0b11100100); // BGP: colors 0,1,2,3 -> shades 0,1,2,3

      // Trigger background rendering during Drawing mode
      ppu.step(80); // Enter Drawing mode
      expect(ppu.getMode()).toBe(PPUMode.Drawing);

      // Step through Drawing mode to complete scanline rendering
      ppu.step(172); // Complete Drawing mode (80 + 172 = 252)
      expect(ppu.getMode()).toBe(PPUMode.HBlank);

      // PPU should have rendered background to framebuffer during Drawing mode
      const frameBuffer = ppu.getFrameBuffer();
      expect(frameBuffer).not.toBeNull();

      // Check that actual tile pattern is rendered (not just solid color)
      // First 8 pixels of scanline 0 should reflect tile pattern
      if (frameBuffer) {
        // Row 0 of tile: 10101010 (color 1,0,1,0,1,0,1,0) with palette 0b11100100
        expect(frameBuffer[0]).toBe(1); // Color 1 -> shade 1
        expect(frameBuffer[1]).toBe(0); // Color 0 -> shade 0
        expect(frameBuffer[2]).toBe(1); // Color 1 -> shade 1
        expect(frameBuffer[3]).toBe(0); // Color 0 -> shade 0
      }
    });

    it('should handle background rendering during Mode 3 (Drawing)', () => {
      ppu.start();

      // PPU should only render background during Drawing mode
      expect(ppu.getMode()).toBe(PPUMode.OAMScan);

      // Step to Drawing mode
      ppu.step(80);
      expect(ppu.getMode()).toBe(PPUMode.Drawing);

      // Background should be rendered during this mode
      // (Implementation will handle actual rendering)
      expect(() => ppu.renderCurrentScanline()).not.toThrow();
    });

    it('should respect LCDC bit 0 for background enable/disable', () => {
      ppu.start();

      // LCDC bit 0 = 1: background enabled (default)
      ppu.writeRegister(0xff40, 0x91); // Bit 0 = 1
      ppu.step(80); // Enter Drawing mode

      // LCDC bit 0 = 0: background disabled
      ppu.writeRegister(0xff40, 0x90); // Bit 0 = 0
      ppu.reset();
      ppu.start();
      ppu.step(80); // Enter Drawing mode

      // Background should be blank (all pixels 0)
      const frameBufferDisabled = ppu.getFrameBuffer();
      expect(frameBufferDisabled?.every(pixel => pixel === 0)).toBe(true);
    });
  });

  describe('PPU Register Access', () => {
    it('should return post-boot values for registers', () => {
      expect(ppu.readRegister(0xff40)).toBe(0x91); // LCDC
      // STAT includes current mode (OAMScan = 2) in lower bits
      expect(ppu.readRegister(0xff41)).toBe(0x80 | PPUMode.OAMScan); // STAT
      expect(ppu.readRegister(0xff42)).toBe(0x00); // SCY
      expect(ppu.readRegister(0xff43)).toBe(0x00); // SCX
      expect(ppu.readRegister(0xff44)).toBe(0x00); // LY
      expect(ppu.readRegister(0xff45)).toBe(0x00); // LYC
    });

    it('should handle writing to registers', () => {
      ppu.writeRegister(0xff40, 0b10000011);
      expect(ppu.readRegister(0xff40)).toBe(0b10000011);

      ppu.writeRegister(0xff42, 0x12);
      expect(ppu.readRegister(0xff42)).toBe(0x12);

      ppu.writeRegister(0xff43, 0x34);
      expect(ppu.readRegister(0xff43)).toBe(0x34);

      ppu.writeRegister(0xff45, 0x56);
      expect(ppu.readRegister(0xff45)).toBe(0x56);
    });

    it('should reset LY to 0 when PPU is disabled via LCDC', () => {
      ppu.start();
      // Advance PPU to a non-zero scanline - let's go scanline by scanline
      for (let i = 0; i < 5; i++) {
        ppu.step(456);
      }
      expect(ppu.readRegister(0xff44)).toBe(5);

      // Disable PPU by writing to LCDC (bit 7 = 0)
      ppu.writeRegister(0xff40, 0x11); // Bit 7 is 0

      expect(ppu.readRegister(0xff44)).toBe(0); // LY should reset
      expect(ppu.getMode()).toBe(PPUMode.HBlank); // Mode should reset
    });

    it('should reset LY to 0 when 0xFF44 is written to', () => {
      ppu.start();
      // Advance PPU to a non-zero scanline - let's go scanline by scanline
      for (let i = 0; i < 10; i++) {
        ppu.step(456);
      }
      expect(ppu.readRegister(0xff44)).toBe(10);

      // Write to LY register
      ppu.writeRegister(0xff44, 1); // Value doesn't matter, it should reset

      expect(ppu.readRegister(0xff44)).toBe(0);
    });

    it('should only allow writing to writable bits of STAT register', () => {
      // Initial STAT: 0x80, mode is OAMScan (2), so read is 0x82
      ppu.start();
      ppu.step(1); // enter OAMScan
      expect(ppu.readRegister(0xff41)).toBe(0x80 | ppu.getMode());

      // Try to write to all bits (0xFF)
      ppu.writeRegister(0xff41, 0xff);

      // Per implementation, only bits 3-6 are writable from value.
      // this.stat becomes (0x80 & 0x07) | (0xFF & 0x78) = 0x78
      // On read, we get (0x78 & 0xfc) | currentMode
      expect(ppu.readRegister(0xff41)).toBe(0x78 | ppu.getMode());
    });
  });
});
