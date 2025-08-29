import { PPUComponent, PPUModeType, PPUMode, InterruptCallback } from '../../types';

export class PPU implements PPUComponent {
  private ly = 0; // Current scanline (0-153)
  private cycles = 0; // Cycle counter for timing
  private currentMode: PPUModeType = PPUMode.OAMScan;
  private running = false;
  private frameBuffer: Uint8Array | null = null;
  private frameReady = false;
  private interruptCallback?: InterruptCallback;
  private lcdc = 0x91; // LCD Control register ($FF40) - post-boot value
  private stat = 0x80; // LCD Status register ($FF41) - post-boot value
  private scy = 0x00; // Scroll Y register ($FF42)
  private scx = 0x00; // Scroll X register ($FF43)
  private lyc = 0x00; // LY Compare register ($FF45)
  private bgp = 0xfc; // Background Palette register ($FF47) - post-boot value
  private vram = new Uint8Array(0x2000); // 8KB VRAM ($8000-$9FFF)

  constructor(interruptCallback?: InterruptCallback) {
    this.interruptCallback = interruptCallback;
    this.frameBuffer = new Uint8Array(160 * 144); // GB screen is 160x144 pixels
    this.reset();
  }

  reset(): void {
    this.ly = 0;
    this.cycles = 0;
    this.currentMode = PPUMode.OAMScan;
    this.running = false;
    this.frameReady = false;
    if (this.frameBuffer) {
      this.frameBuffer.fill(0);
    }
    this.vram.fill(0);
  }

  start(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  step(cycles: number): void {
    if (!this.running) {
      return;
    }

    this.cycles += cycles;

    // Handle PPU timing based on current mode
    this.updatePPUState();
  }

  render(): void {
    // Minimal render implementation - just clear frame ready flag
    this.frameReady = false;
  }

  getMode(): PPUModeType {
    return this.currentMode;
  }

  isFrameReady(): boolean {
    return this.frameReady;
  }

  getFrameBuffer(): Uint8Array | null {
    return this.frameBuffer;
  }

  // Register access methods for MMU integration
  readRegister(address: number): number {
    switch (address) {
      case 0xff40:
        return this.lcdc;
      case 0xff41:
        return (this.stat & 0xfc) | this.currentMode; // Mode in bits 0-1
      case 0xff42:
        return this.scy;
      case 0xff43:
        return this.scx;
      case 0xff44:
        return this.ly;
      case 0xff45:
        return this.lyc;
      case 0xff47:
        return this.bgp;
      default:
        return 0xff; // Unmapped registers return 0xFF
    }
  }

  writeRegister(address: number, value: number): void {
    switch (address) {
      case 0xff40:
        this.lcdc = value & 0xff;
        // Bit 7 controls PPU enable/disable
        if (!(value & 0x80)) {
          // PPU disabled - reset to scanline 0, mode 0
          this.ly = 0;
          this.currentMode = PPUMode.HBlank;
          this.cycles = 0;
        }
        break;
      case 0xff41:
        // Only bits 3-6 are writable, bits 0-2 are read-only (mode and LYC=LY)
        this.stat = (this.stat & 0x07) | (value & 0x78);
        break;
      case 0xff42:
        this.scy = value & 0xff;
        break;
      case 0xff43:
        this.scx = value & 0xff;
        break;
      case 0xff44:
        // LY register: writing resets to 0 (hardware behavior)
        this.ly = 0;
        this.cycles = 0;
        break;
      case 0xff45:
        this.lyc = value & 0xff;
        break;
      case 0xff47:
        this.bgp = value & 0xff;
        break;
    }
  }

  // VRAM Access Methods
  /**
   * Read from VRAM address range $8000-$9FFF
   * @param address VRAM address ($8000-$9FFF)
   * @returns byte value at address
   */
  readVRAM(address: number): number {
    // Convert absolute address to VRAM offset
    const vramOffset = (address - 0x8000) & 0x1fff;
    return this.vram[vramOffset];
  }

  /**
   * Write to VRAM address range $8000-$9FFF
   * @param address VRAM address ($8000-$9FFF)
   * @param value byte value to write
   */
  writeVRAM(address: number, value: number): void {
    // Convert absolute address to VRAM offset
    const vramOffset = (address - 0x8000) & 0x1fff;
    this.vram[vramOffset] = value & 0xff;
  }

  // Tile Decoding Methods
  /**
   * Decode a 2bpp tile from VRAM into 4-color pixel indices
   * @param tileAddress Starting address of tile data in VRAM
   * @returns array of 64 pixel values (8x8 tile)
   */
  decodeTile(tileAddress: number): number[] {
    const pixels: number[] = new Array(64);

    // Each tile is 8x8 pixels, 16 bytes (2 bytes per row)
    for (let row = 0; row < 8; row++) {
      const lowByte = this.readVRAM(tileAddress + row * 2);
      const highByte = this.readVRAM(tileAddress + row * 2 + 1);

      // Process each pixel in the row (8 pixels)
      for (let col = 0; col < 8; col++) {
        const bitPos = 7 - col; // MSB is leftmost pixel
        const lowBit = (lowByte >> bitPos) & 1;
        const highBit = (highByte >> bitPos) & 1;
        const colorIndex = (highBit << 1) | lowBit; // 2-bit color index

        pixels[row * 8 + col] = colorIndex;
      }
    }

    return pixels;
  }

  // Palette Mapping Methods
  /**
   * Apply palette mapping to convert 4-color index to Game Boy shade
   * @param colorIndex 2-bit color index (0-3)
   * @returns Game Boy shade value (0-3)
   */
  applyPalette(colorIndex: number): number {
    // Extract 2-bit palette entry from BGP register
    const paletteShift = colorIndex * 2;
    const paletteEntry = (this.bgp >> paletteShift) & 0x03;
    return paletteEntry;
  }

  // Tile Addressing Methods
  /**
   * Get tile map base address based on LCDC bit 3
   * @returns tile map address ($9800 or $9C00)
   */
  getTileMapAddress(): number {
    // LCDC bit 3: 0 = $9800-$9BFF, 1 = $9C00-$9FFF
    return this.lcdc & 0x08 ? 0x9c00 : 0x9800;
  }

  /**
   * Get tile data address for given tile ID based on LCDC bit 4
   * @param tileId tile identifier (0-255)
   * @returns absolute address of tile data in VRAM
   */
  getTileDataAddress(tileId: number): number {
    if (this.lcdc & 0x10) {
      // LCDC bit 4 = 1: unsigned mode, $8000-$8FFF
      return 0x8000 + tileId * 16;
    } else {
      // LCDC bit 4 = 0: signed mode, $8800-$97FF
      // Tile 0 is at $9000, tiles 1-127 go up, tiles 128-255 wrap to $8800
      if (tileId < 128) {
        return 0x9000 + tileId * 16;
      } else {
        return 0x8800 + (tileId - 128) * 16;
      }
    }
  }

  // Background Rendering Methods
  /**
   * Render the current scanline to framebuffer during Drawing mode
   */
  renderCurrentScanline(): void {
    if (this.currentMode !== PPUMode.Drawing || !this.frameBuffer || this.ly >= 144) {
      return;
    }

    const scanlineStart = this.ly * 160;

    // Check LCDC bit 0 for background enable/disable
    if (!(this.lcdc & 0x01)) {
      // Background disabled - fill with color 0 (white)
      for (let x = 0; x < 160; x++) {
        this.frameBuffer[scanlineStart + x] = 0;
      }
      return;
    }

    // Background enabled - render actual background tiles
    this.renderBackgroundScanline(scanlineStart);
  }

  /**
   * Render background tiles for the current scanline
   * @param scanlineStart Starting index in framebuffer for current scanline
   */
  private renderBackgroundScanline(scanlineStart: number): void {
    const tileMapBase = this.getTileMapAddress();

    // Apply scroll offset to current scanline
    const scrolledY = (this.ly + this.scy) & 0xff;
    const tileY = Math.floor(scrolledY / 8); // Which row of tiles
    const tileRowOffset = scrolledY % 8; // Which row within the tile

    // Render each pixel across the scanline (160 pixels)
    for (let x = 0; x < 160; x++) {
      // Apply horizontal scroll
      const scrolledX = (x + this.scx) & 0xff;
      const tileX = Math.floor(scrolledX / 8); // Which column of tiles
      const tileColOffset = scrolledX % 8; // Which column within the tile

      // Get tile ID from tile map (32x32 tiles, wrapping)
      const tileMapOffset = (tileY & 31) * 32 + (tileX & 31);
      const tileMapAddress = tileMapBase + tileMapOffset;
      const tileId = this.readVRAM(tileMapAddress);

      // Get tile data address for this tile
      const tileDataAddress = this.getTileDataAddress(tileId);

      // Get the specific byte addresses for this row of the tile
      const tileRowAddress = tileDataAddress + tileRowOffset * 2;
      const lowByte = this.readVRAM(tileRowAddress);
      const highByte = this.readVRAM(tileRowAddress + 1);

      // Extract the specific pixel from this tile
      const bitPos = 7 - tileColOffset; // MSB is leftmost pixel
      const lowBit = (lowByte >> bitPos) & 1;
      const highBit = (highByte >> bitPos) & 1;
      const colorIndex = (highBit << 1) | lowBit; // 2-bit color index

      // Apply palette and set pixel
      const finalColor = this.applyPalette(colorIndex);
      if (this.frameBuffer) {
        this.frameBuffer[scanlineStart + x] = finalColor;
      }
    }
  }

  private updatePPUState(): void {
    // V-Blank period (scanlines 144-153)
    if (this.ly >= 144) {
      this.currentMode = PPUMode.VBlank;
      if (this.cycles >= 456) {
        this.cycles -= 456;
        this.ly++;
        if (this.ly > 153) {
          this.ly = 0;
          this.currentMode = PPUMode.OAMScan;
        }
      }
      return;
    }

    // Scanline rendering period (LY 0-143)
    // These must be sequential checks, not a switch with breaks.
    // This allows the PPU to transition through multiple modes within a single
    // step if enough cycles have passed.
    if (this.currentMode === PPUMode.OAMScan && this.cycles >= 80) {
      this.currentMode = PPUMode.Drawing;
    }

    if (this.currentMode === PPUMode.Drawing && this.cycles >= 252) {
      // Render current scanline during Drawing mode
      this.renderCurrentScanline();

      // 80 + 172
      this.currentMode = PPUMode.HBlank;
    }

    if (this.currentMode === PPUMode.HBlank && this.cycles >= 456) {
      this.cycles -= 456;
      this.ly++;

      if (this.ly === 144) {
        this.currentMode = PPUMode.VBlank;
        this.frameReady = true;

        // Frame ready - triggering VBlank interrupt

        // Trigger VBlank interrupt (bit 0)
        this.interruptCallback?.(0);
      } else {
        this.currentMode = PPUMode.OAMScan;
      }
    }
  }
}
