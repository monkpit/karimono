# PPU API Reference - Complete Interface Specifications

**Document Version**: 1.0  
**Created**: 2025-08-11  
**Purpose**: Complete API reference for PPU implementation interfaces  
**Target Audience**: Backend TypeScript Engineer, Implementation Teams, Integration Developers  
**Prerequisites**: `/home/pittm/karimono-v2/docs/PPU_TECHNICAL_ARCHITECTURE.md`

## API Overview

### Core PPU Interface

The PPU component provides a comprehensive interface for Game Boy DMG graphics emulation with hardware-accurate timing and memory access control.

```typescript
/**
 * Main PPU Interface - Hardware-accurate Game Boy DMG Picture Processing Unit
 * 
 * Implements cycle-accurate PPU behavior including:
 * - Four-mode state machine (HBlank, VBlank, OAM Search, Pixel Transfer)
 * - Hardware-accurate memory access restrictions
 * - Background, window, and sprite rendering
 * - Interrupt generation (VBlank, STAT)
 * 
 * Reference: RGBDS GBZ80 Reference https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 * Hardware Validation: Mealybug Tearoom test ROMs
 */
export interface PPU {
  // Core execution
  step(cycles: number): PPUEvents;
  reset(): void;
  
  // Memory access (mode-aware)
  readVRAM(address: number): number;
  writeVRAM(address: number, value: number): void;
  readOAM(address: number): number;
  writeOAM(address: number, value: number): void;
  
  // Register access
  readRegister(address: number): number;
  writeRegister(address: number, value: number): void;
  
  // Display output
  getFrameBuffer(): Uint8Array; // 160×144 2-bit pixels
  isFrameReady(): boolean;
  acknowledgeFrame(): void;
  
  // State queries
  getCurrentMode(): PPUMode;
  getCurrentScanline(): number;
  getScanlineCycle(): number;
  getFrameCycle(): number;
  
  // Memory access control
  isVRAMAccessible(): boolean;
  isOAMAccessible(): boolean;
  isDMAActive(): boolean;
}
```

### PPU Events Interface

```typescript
/**
 * PPU Events - Returned from step() method
 * 
 * Provides information about PPU state changes and interrupt requests
 * to coordinate with CPU and interrupt controller.
 */
export interface PPUEvents {
  /** VBlank interrupt should be requested */
  vblankInterrupt: boolean;
  
  /** STAT interrupt should be requested */
  statInterrupt: boolean;
  
  /** Frame rendering complete - frame buffer ready */
  frameComplete: boolean;
  
  /** Current scanline complete - LY incremented */
  scanlineComplete: boolean;
  
  /** PPU mode changed - STAT updated */
  modeChanged: boolean;
}
```

### PPU Mode Enumeration

```typescript
/**
 * PPU Operating Modes
 * 
 * Hardware-accurate four-mode state machine matching DMG timing:
 * - Mode 0: HBlank (CPU can access VRAM/OAM)
 * - Mode 1: VBlank (CPU can access VRAM/OAM, VBlank interrupt)
 * - Mode 2: OAM Search (CPU blocked from OAM, 80 cycles fixed)
 * - Mode 3: Pixel Transfer (CPU blocked from VRAM/OAM, 172-289 cycles)
 */
export enum PPUMode {
  HBlank = 0,        // Mode 0: Horizontal blank
  VBlank = 1,        // Mode 1: Vertical blank
  OAMSearch = 2,     // Mode 2: OAM search
  PixelTransfer = 3, // Mode 3: Pixel transfer
}
```

## Memory Management APIs

### VRAM Access Interface

```typescript
/**
 * VRAM Memory Management
 * 
 * Provides mode-aware access to Video RAM with hardware-accurate restrictions:
 * - 8KB VRAM at 0x8000-0x9FFF
 * - Tile data area: 0x8000-0x97FF (384 tiles × 16 bytes)
 * - Tile maps: 0x9800-0x9FFF (2 maps × 1024 bytes)
 * - Access blocked during Mode 3 (Pixel Transfer)
 */
interface VRAMAccess {
  /**
   * Read byte from VRAM
   * @param address - VRAM address (0x8000-0x9FFF)
   * @returns Byte value or 0xFF if access blocked
   * @throws Error if address out of VRAM range
   */
  readVRAM(address: number): number;
  
  /**
   * Write byte to VRAM
   * @param address - VRAM address (0x8000-0x9FFF)
   * @param value - Byte value to write
   * @throws Error if address out of VRAM range
   * @note Writes ignored if access blocked during Mode 3
   */
  writeVRAM(address: number, value: number): void;
  
  /**
   * Check if VRAM is accessible to CPU
   * @returns true if CPU can access VRAM (not in Mode 3)
   */
  isVRAMAccessible(): boolean;
}
```

### OAM Access Interface

```typescript
/**
 * OAM (Object Attribute Memory) Management
 * 
 * Provides mode-aware access to sprite attribute memory:
 * - 160 bytes at 0xFE00-0xFE9F (40 sprites × 4 bytes)
 * - Access blocked during Mode 2 (OAM Search) and Mode 3 (Pixel Transfer)
 * - Additional blocking during DMA transfer
 */
interface OAMAccess {
  /**
   * Read byte from OAM
   * @param address - OAM address (0xFE00-0xFE9F)
   * @returns Byte value or 0xFF if access blocked
   * @throws Error if address out of OAM range
   */
  readOAM(address: number): number;
  
  /**
   * Write byte to OAM
   * @param address - OAM address (0xFE00-0xFE9F)
   * @param value - Byte value to write
   * @throws Error if address out of OAM range
   * @note Writes ignored if access blocked
   */
  writeOAM(address: number, value: number): void;
  
  /**
   * Check if OAM is accessible to CPU
   * @returns true if CPU can access OAM (not in Mode 2, 3, or DMA active)
   */
  isOAMAccessible(): boolean;
}
```

## Register Management APIs

### PPU Registers Interface

```typescript
/**
 * PPU Register Bank Interface
 * 
 * Complete implementation of all PPU registers with hardware-accurate behavior:
 * - LCDC (0xFF40): LCD Control register
 * - STAT (0xFF41): LCD Status register with special write behavior
 * - Scroll registers: SCY, SCX
 * - Position registers: LY (read-only), LYC
 * - Palette registers: BGP, OBP0, OBP1
 * - Window position: WY, WX
 * - DMA register: DMA transfer trigger
 */
interface PPURegisters {
  /**
   * Read PPU register
   * @param address - Register address (0xFF40-0xFF4B)
   * @returns Register value
   * @throws Error if address is not valid PPU register
   */
  read(address: number): number;
  
  /**
   * Write PPU register
   * @param address - Register address (0xFF40-0xFF4B)
   * @param value - Value to write
   * @returns true if DMA transfer triggered
   * @throws Error if address is not valid PPU register
   * @note LY register (0xFF44) is read-only, writes ignored
   */
  write(address: number, value: number): boolean;
  
  /**
   * Reset all registers to power-on state
   */
  reset(): void;
  
  // Register access convenience properties
  readonly LCDC: number;    // 0xFF40 - LCD Control
  readonly STAT: number;    // 0xFF41 - LCD Status  
  readonly SCY: number;     // 0xFF42 - Scroll Y
  readonly SCX: number;     // 0xFF43 - Scroll X
  readonly LY: number;      // 0xFF44 - Current scanline (read-only)
  readonly LYC: number;     // 0xFF45 - Scanline compare
  readonly BGP: number;     // 0xFF47 - Background palette
  readonly OBP0: number;    // 0xFF48 - Object palette 0
  readonly OBP1: number;    // 0xFF49 - Object palette 1
  readonly WY: number;      // 0xFF4A - Window Y position
  readonly WX: number;      // 0xFF4B - Window X position
  
  // LCDC bit checking helpers
  isLCDEnabled(): boolean;
  getWindowTileMapBase(): number;
  isWindowEnabled(): boolean;
  getTileDataBase(): number;
  isTileDataUnsigned(): boolean;
  getBackgroundTileMapBase(): number;
  getSpriteSize(): 8 | 16;
  isSpritesEnabled(): boolean;
  isBackgroundEnabled(): boolean;
}
```

### Register-Specific APIs

#### LCDC Register (0xFF40)

```typescript
/**
 * LCDC Register Bit Definitions
 */
interface LCDCRegister {
  /** Bit 7: LCD Display Enable (0=off, 1=on) */
  readonly lcdEnable: boolean;
  
  /** Bit 6: Window Tile Map Select (0=9800-9BFF, 1=9C00-9FFF) */
  readonly windowTileMapArea: 0x9800 | 0x9C00;
  
  /** Bit 5: Window Enable (0=off, 1=on) */
  readonly windowEnable: boolean;
  
  /** Bit 4: BG & Window Tile Data Select (0=8800-97FF signed, 1=8000-8FFF unsigned) */
  readonly tileDataArea: 0x8000 | 0x8800;
  readonly tileDataSigned: boolean;
  
  /** Bit 3: BG Tile Map Select (0=9800-9BFF, 1=9C00-9FFF) */
  readonly backgroundTileMapArea: 0x9800 | 0x9C00;
  
  /** Bit 2: Sprite Size (0=8x8, 1=8x16) */
  readonly spriteSize: 8 | 16;
  
  /** Bit 1: Sprite Enable (0=off, 1=on) */
  readonly spriteEnable: boolean;
  
  /** Bit 0: BG & Window Enable/Priority (0=off, 1=on) */
  readonly backgroundEnable: boolean;
}
```

#### STAT Register (0xFF41)

```typescript
/**
 * STAT Register Interface
 * 
 * Special handling required for DMG STAT register quirks:
 * - Writing can trigger spurious interrupts
 * - Bits 0-2 are read-only (mode and LYC=LY flag)
 * - Interrupt enable bits in upper nibble
 */
interface STATRegister {
  /** Bit 6: LYC=LY Interrupt Enable */
  lycInterruptEnable: boolean;
  
  /** Bit 5: Mode 2 (OAM Search) Interrupt Enable */
  mode2InterruptEnable: boolean;
  
  /** Bit 4: Mode 1 (VBlank) Interrupt Enable */
  mode1InterruptEnable: boolean;
  
  /** Bit 3: Mode 0 (HBlank) Interrupt Enable */
  mode0InterruptEnable: boolean;
  
  /** Bit 2: LYC=LY Flag (Read-Only) */
  readonly lycEqualsLY: boolean;
  
  /** Bits 1-0: PPU Mode (Read-Only) */
  readonly mode: PPUMode;
  
  /**
   * Handle STAT register write with DMG quirk behavior
   * @param value - Value being written
   * @note May trigger spurious interrupt if conditions met
   */
  handleWrite(value: number): void;
  
  /**
   * Update mode bits (internal use only)
   * @param mode - New PPU mode
   */
  updateMode(mode: PPUMode): void;
  
  /**
   * Update LYC comparison flag (internal use only)
   * @param ly - Current scanline
   * @param lyc - LYC register value
   */
  updateLYCComparison(ly: number, lyc: number): void;
}
```

## Rendering Pipeline APIs

### Rendering Interface

```typescript
/**
 * PPU Rendering Pipeline Interface
 * 
 * Handles scanline-based rendering with proper layer mixing:
 * - Background layer with scrolling
 * - Window layer with independent positioning
 * - Sprite layer with priority system
 */
interface PPURenderingPipeline {
  /**
   * Render complete frame to frame buffer
   * @note Called automatically during PPU operation
   */
  renderFrame(): void;
  
  /**
   * Render single scanline
   * @param scanline - Scanline number (0-143)
   */
  renderScanline(scanline: number): void;
  
  /**
   * Get rendered frame buffer
   * @returns 160×144 array of 2-bit color indices
   */
  getFrameBuffer(): Uint8Array;
  
  /**
   * Check if frame rendering is complete
   * @returns true if frame buffer contains complete frame
   */
  isFrameComplete(): boolean;
}
```

### Background Rendering

```typescript
/**
 * Background Layer Rendering
 * 
 * Implements scrollable 32×32 tile background with proper wrapping
 */
interface BackgroundRenderer {
  /**
   * Render background pixels for scanline
   * @param scanline - Current scanline (0-143)
   * @returns Array of 160 background color indices
   */
  renderBackground(scanline: number): Uint8Array;
  
  /**
   * Calculate effective background coordinates with scrolling
   * @param pixelX - Screen pixel X coordinate
   * @param scanline - Current scanline
   * @returns Effective background coordinates
   */
  calculateBackgroundCoordinates(pixelX: number, scanline: number): {
    bgX: number;
    bgY: number;
  };
  
  /**
   * Get tile index from tile map
   * @param tileX - Tile X coordinate (0-31)
   * @param tileY - Tile Y coordinate (0-31)
   * @returns Tile index from tile map
   */
  getTileIndex(tileX: number, tileY: number): number;
  
  /**
   * Extract pixel color from tile data
   * @param tileIndex - Tile index
   * @param pixelX - Pixel X within tile (0-7)
   * @param pixelY - Pixel Y within tile (0-7)
   * @returns 2-bit color index
   */
  extractPixelColor(tileIndex: number, pixelX: number, pixelY: number): number;
}
```

### Sprite Rendering

```typescript
/**
 * Sprite Attributes Structure
 * 
 * 4 bytes per sprite in OAM:
 * - Byte 0: Y position (screen position = Y - 16)
 * - Byte 1: X position (screen position = X - 8)
 * - Byte 2: Tile index
 * - Byte 3: Attribute flags
 */
interface SpriteAttributes {
  /** Y position byte (screen Y = y - 16) */
  y: number;
  
  /** X position byte (screen X = x - 8) */
  x: number;
  
  /** Tile index (always uses unsigned addressing 0x8000-0x8FFF) */
  tileIndex: number;
  
  /** Attribute flags byte */
  attributes: number;
  
  // Attribute flag accessors
  readonly priority: boolean;      // Bit 7: BG/Window over OBJ Priority
  readonly yFlip: boolean;         // Bit 6: Y Flip
  readonly xFlip: boolean;         // Bit 5: X Flip
  readonly palette: 0 | 1;         // Bit 4: DMG Palette (OBP0/OBP1)
}

/**
 * Sprite Rendering System
 * 
 * Implements hardware-accurate sprite rendering:
 * - OAM search during Mode 2 (80 cycles)
 * - Maximum 10 sprites per scanline
 * - Proper sprite priority resolution
 * - 8×8 and 8×16 sprite support
 */
interface SpriteRenderer {
  /**
   * Select sprites for current scanline (Mode 2 operation)
   * @param scanline - Current scanline
   * @returns Array of up to 10 sprites overlapping scanline
   */
  selectSpritesForScanline(scanline: number): SpriteAttributes[];
  
  /**
   * Render sprites for scanline (Mode 3 operation)
   * @param scanline - Current scanline
   * @param selectedSprites - Sprites selected in Mode 2
   * @returns Array of 160 sprite pixels with transparency
   */
  renderSprites(scanline: number, selectedSprites: SpriteAttributes[]): Uint8Array;
  
  /**
   * Read sprite attributes from OAM
   * @param spriteIndex - Sprite index (0-39)
   * @returns Sprite attributes structure
   */
  readSpriteAttributes(spriteIndex: number): SpriteAttributes;
  
  /**
   * Check if sprite overlaps scanline
   * @param sprite - Sprite attributes
   * @param scanline - Current scanline
   * @returns true if sprite is visible on scanline
   */
  spriteOverlapsScanline(sprite: SpriteAttributes, scanline: number): boolean;
  
  /**
   * Resolve sprite priority for overlapping sprites
   * @param sprites - Array of sprites at same pixel
   * @returns Highest priority sprite or null if all transparent
   */
  resolveSpritePriority(sprites: SpriteAttributes[]): SpriteAttributes | null;
}
```

### Layer Mixing

```typescript
/**
 * Layer Mixing System
 * 
 * Combines background, window, and sprite layers according to Game Boy priority rules
 */
interface LayerMixer {
  /**
   * Mix all layers for scanline
   * @param backgroundPixels - Background layer pixels
   * @param windowPixels - Window layer pixels (null if window not active)
   * @param spritePixels - Sprite layer pixels
   * @returns Final mixed pixel array
   */
  mixLayers(
    backgroundPixels: Uint8Array,
    windowPixels: Uint8Array | null,
    spritePixels: Uint8Array
  ): Uint8Array;
  
  /**
   * Apply palette to color indices
   * @param pixels - Array of 2-bit color indices
   * @param palette - Palette register value
   * @returns Array of final colors
   */
  applyPalette(pixels: Uint8Array, palette: number): Uint8Array;
  
  /**
   * Resolve pixel priority
   * @param bgPixel - Background pixel
   * @param windowPixel - Window pixel (if active)
   * @param spritePixel - Sprite pixel
   * @param spritePriority - Sprite priority flag
   * @returns Final pixel color
   */
  resolvePixelPriority(
    bgPixel: number,
    windowPixel: number | null,
    spritePixel: number,
    spritePriority: boolean
  ): number;
}
```

## State Machine APIs

### State Machine Interface

```typescript
/**
 * PPU State Machine
 * 
 * Implements cycle-accurate four-mode state machine:
 * - Handles mode transitions with proper timing
 * - Calculates variable Mode 3 duration
 * - Manages scanline and frame cycle counters
 */
interface PPUStateMachine {
  /**
   * Advance state machine by cycles
   * @param cycles - Number of CPU cycles to advance
   * @returns PPU events generated during step
   */
  step(cycles: number): PPUEvents;
  
  /**
   * Reset state machine to initial state
   */
  reset(): void;
  
  /**
   * Get current PPU mode
   */
  getCurrentMode(): PPUMode;
  
  /**
   * Get current scanline (0-153)
   */
  getCurrentScanline(): number;
  
  /**
   * Get current cycle within scanline (0-455)
   */
  getScanlineCycle(): number;
  
  /**
   * Get current cycle within frame (0-70223)
   */
  getFrameCycle(): number;
  
  /**
   * Force PPU mode (for testing only)
   * @param mode - Mode to force
   * @note Only use in test environments
   */
  forceMode(mode: PPUMode): void;
}
```

### Timing Constants

```typescript
/**
 * PPU Timing Constants
 * 
 * Hardware-accurate timing values for all PPU operations
 */
export const PPUTiming = {
  // Basic timing
  SCANLINE_CYCLES: 456,         // Total cycles per scanline
  VISIBLE_SCANLINES: 144,       // Scanlines 0-143
  VBLANK_SCANLINES: 10,         // Scanlines 144-153
  TOTAL_SCANLINES: 154,         // Total scanlines per frame
  FRAME_CYCLES: 70224,          // Total cycles per frame (154 × 456)
  
  // Mode durations
  MODE_2_CYCLES: 80,            // OAM Search - fixed duration
  MODE_3_BASE_CYCLES: 172,      // Pixel Transfer - base duration
  MODE_3_MAX_CYCLES: 289,       // Pixel Transfer - maximum duration
  
  // Timing penalties
  SCX_PENALTY_MAX: 7,           // Maximum SCX scroll penalty
  WINDOW_ACTIVATION_PENALTY: 6,  // Window activation penalty
  SPRITE_PENALTY_PER_PIXEL: 6,  // Additional cycles per sprite pixel
  
  // Target frame rate
  TARGET_FPS: 59.7,             // Game Boy frame rate
  FRAME_TIME_MS: 16.75,         // Target frame time (1000 / 59.7)
} as const;
```

## Integration APIs

### MMU Integration Interface

```typescript
/**
 * MMU-PPU Integration
 * 
 * Provides memory routing and access control for PPU memory regions
 */
interface MMUPPUIntegration {
  /**
   * Check if address should be routed to PPU
   * @param address - Memory address
   * @returns true if PPU should handle this address
   */
  shouldRouteToPPU(address: number): boolean;
  
  /**
   * Handle memory read from PPU region
   * @param address - Memory address
   * @returns Value read or 0xFF if blocked
   */
  handlePPURead(address: number): number;
  
  /**
   * Handle memory write to PPU region
   * @param address - Memory address
   * @param value - Value to write
   * @returns true if DMA triggered
   */
  handlePPUWrite(address: number, value: number): boolean;
  
  /**
   * Get PPU memory access status
   * @param address - Memory address
   * @returns Access status information
   */
  getPPUAccessStatus(address: number): {
    accessible: boolean;
    region: 'VRAM' | 'OAM' | 'REGISTERS';
    mode: PPUMode;
    blockedReason?: string;
  };
}
```

### CPU Coordination Interface

```typescript
/**
 * CPU-PPU Coordination
 * 
 * Handles timing synchronization and interrupt generation
 */
interface CPUPPUCoordination {
  /**
   * Step PPU with CPU cycles
   * @param cycles - CPU cycles executed
   * @returns PPU events for interrupt handling
   */
  stepPPU(cycles: number): PPUEvents;
  
  /**
   * Handle PPU interrupts
   * @param events - PPU events from step
   */
  handlePPUInterrupts(events: PPUEvents): void;
  
  /**
   * Check if CPU memory access is allowed
   * @param address - Memory address
   * @returns true if access allowed
   */
  isMemoryAccessAllowed(address: number): boolean;
  
  /**
   * Get PPU status for CPU coordination
   * @returns Current PPU status
   */
  getPPUStatus(): {
    mode: PPUMode;
    scanline: number;
    frameReady: boolean;
    vramAccessible: boolean;
    oamAccessible: boolean;
  };
}
```

## Performance and Diagnostics APIs

### Performance Monitoring

```typescript
/**
 * PPU Performance Statistics
 */
interface PPUPerformanceStats {
  /** Frame rendering statistics */
  frameStats: {
    framesRendered: number;
    averageFrameTime: number;
    lastFrameTime: number;
    frameTimeVariance: number;
  };
  
  /** Timing accuracy */
  timingStats: {
    cycleAccuracy: number;        // Percentage of accurate cycle timing
    modeTransitionAccuracy: number;
    scanlineTimingErrors: number;
  };
  
  /** Memory performance */
  memoryStats: {
    vramAccessCount: number;
    oamAccessCount: number;
    blockedAccessCount: number;
    bufferReuses: number;
  };
  
  /** Rendering performance */
  renderingStats: {
    backgroundPixelsRendered: number;
    spritePixelsRendered: number;
    layerMixingOperations: number;
    paletteApplications: number;
  };
}

/**
 * Performance Monitoring Interface
 */
interface PPUPerformanceMonitor {
  /**
   * Get current performance statistics
   */
  getPerformanceStats(): PPUPerformanceStats;
  
  /**
   * Reset performance counters
   */
  resetStats(): void;
  
  /**
   * Enable/disable performance monitoring
   * @param enabled - Enable monitoring
   */
  setMonitoringEnabled(enabled: boolean): void;
  
  /**
   * Get performance recommendations
   * @returns Array of performance improvement suggestions
   */
  getPerformanceRecommendations(): Array<{
    type: 'info' | 'warning' | 'error';
    category: 'timing' | 'memory' | 'rendering';
    message: string;
    impact: 'low' | 'medium' | 'high';
  }>;
}
```

### Diagnostic Interface

```typescript
/**
 * PPU Diagnostic System
 * 
 * Provides debugging and inspection capabilities
 */
interface PPUDiagnostics {
  /**
   * Get complete PPU state snapshot
   */
  getStateSnapshot(): PPUStateSnapshot;
  
  /**
   * Get memory dump
   * @param region - Memory region to dump
   * @param start - Start address (optional)
   * @param length - Length in bytes (optional)
   */
  getMemoryDump(
    region: 'VRAM' | 'OAM',
    start?: number,
    length?: number
  ): Uint8Array;
  
  /**
   * Enable execution tracing
   * @param enabled - Enable tracing
   */
  setTracingEnabled(enabled: boolean): void;
  
  /**
   * Get execution trace
   * @param maxEntries - Maximum trace entries to return
   */
  getExecutionTrace(maxEntries?: number): PPUTraceEntry[];
  
  /**
   * Validate PPU state consistency
   * @returns Validation results
   */
  validateState(): PPUValidationResult;
}

interface PPUStateSnapshot {
  timestamp: number;
  mode: PPUMode;
  scanline: number;
  scanlineCycle: number;
  frameCycle: number;
  registers: Record<string, number>;
  frameBufferChecksum: string;
  memoryAccessCounts: Record<string, number>;
}

interface PPUTraceEntry {
  timestamp: number;
  operation: string;
  address?: number;
  value?: number;
  mode: PPUMode;
  scanline: number;
  cycle: number;
}

interface PPUValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  checks: {
    timingConsistency: boolean;
    memoryBounds: boolean;
    registerStates: boolean;
    frameBufferIntegrity: boolean;
  };
}
```

## Error Handling APIs

### Error Types

```typescript
/**
 * PPU-specific error types
 */
export enum PPUErrorType {
  InvalidRegisterAccess = 'INVALID_REGISTER_ACCESS',
  MemoryAccessViolation = 'MEMORY_ACCESS_VIOLATION',
  TimingViolation = 'TIMING_VIOLATION',
  RenderingError = 'RENDERING_ERROR',
  StateMachineError = 'STATE_MACHINE_ERROR',
  IntegrationError = 'INTEGRATION_ERROR',
}

/**
 * PPU Error Class
 */
export class PPUError extends Error {
  constructor(
    public readonly type: PPUErrorType,
    public readonly context: any,
    public readonly recoverable: boolean = true
  ) {
    super(`PPU Error [${type}]: ${JSON.stringify(context)}`);
    this.name = 'PPUError';
  }
}
```

### Error Handler Interface

```typescript
/**
 * PPU Error Handling System
 */
interface PPUErrorHandler {
  /**
   * Handle PPU error
   * @param error - PPU error instance
   * @returns true if error was handled and execution can continue
   */
  handleError(error: PPUError): boolean;
  
  /**
   * Register error callback
   * @param callback - Error handling callback
   */
  onError(callback: (error: PPUError) => void): void;
  
  /**
   * Get error history
   * @param maxEntries - Maximum number of entries to return
   */
  getErrorHistory(maxEntries?: number): PPUError[];
  
  /**
   * Clear error history
   */
  clearErrorHistory(): void;
  
  /**
   * Set error recovery strategy
   * @param strategy - Recovery strategy configuration
   */
  setRecoveryStrategy(strategy: PPUErrorRecoveryStrategy): void;
}

interface PPUErrorRecoveryStrategy {
  /** Attempt automatic recovery for recoverable errors */
  autoRecover: boolean;
  
  /** Reset PPU state on critical errors */
  resetOnCritical: boolean;
  
  /** Log errors to console */
  logErrors: boolean;
  
  /** Maximum number of errors before giving up */
  maxErrorCount: number;
}
```

## Usage Examples

### Basic PPU Usage

```typescript
// Create PPU instance
const ppu = new PPUImpl();

// Step PPU with CPU cycles
const cycles = 4;
const events = ppu.step(cycles);

// Handle events
if (events.vblankInterrupt) {
  interruptController.requestInterrupt(InterruptType.VBlank);
}

if (events.frameComplete) {
  const frameBuffer = ppu.getFrameBuffer();
  renderingPipeline.renderFrame(frameBuffer);
  ppu.acknowledgeFrame();
}

// Check memory access
if (ppu.isVRAMAccessible()) {
  ppu.writeVRAM(0x8000, 0xFF);
}

// Read register
const lcdcValue = ppu.readRegister(0xFF40);
```

### Integration with MMU

```typescript
class MMU {
  constructor(private ppu: PPU) {}
  
  read(address: number): number {
    // Route PPU memory access
    if (address >= 0x8000 && address <= 0x9FFF) {
      return this.ppu.readVRAM(address);
    }
    
    if (address >= 0xFE00 && address <= 0xFE9F) {
      return this.ppu.readOAM(address);
    }
    
    if (address >= 0xFF40 && address <= 0xFF4B) {
      return this.ppu.readRegister(address);
    }
    
    // Handle other memory regions...
  }
  
  write(address: number, value: number): void {
    // Similar routing for writes
    if (address >= 0x8000 && address <= 0x9FFF) {
      this.ppu.writeVRAM(address, value);
      return;
    }
    
    if (address >= 0xFE00 && address <= 0xFE9F) {
      this.ppu.writeOAM(address, value);
      return;
    }
    
    if (address >= 0xFF40 && address <= 0xFF4B) {
      const dmaTriggered = this.ppu.writeRegister(address, value);
      if (dmaTriggered) {
        this.startDMATransfer(value);
      }
      return;
    }
    
    // Handle other memory regions...
  }
}
```

### Performance Monitoring

```typescript
// Enable performance monitoring
const perfMonitor = ppu.getPerformanceMonitor();
perfMonitor.setMonitoringEnabled(true);

// Run emulation
for (let frame = 0; frame < 60; frame++) {
  for (let cycle = 0; cycle < 70224; cycle += 4) {
    const events = ppu.step(4);
    // Handle events...
  }
}

// Get performance statistics
const stats = perfMonitor.getPerformanceStats();
console.log(`Average frame time: ${stats.frameStats.averageFrameTime}ms`);
console.log(`Cycle accuracy: ${stats.timingStats.cycleAccuracy}%`);

// Get recommendations
const recommendations = perfMonitor.getPerformanceRecommendations();
recommendations.forEach(rec => {
  console.log(`[${rec.type.toUpperCase()}] ${rec.message}`);
});
```

### Error Handling

```typescript
const errorHandler = ppu.getErrorHandler();

// Set error recovery strategy
errorHandler.setRecoveryStrategy({
  autoRecover: true,
  resetOnCritical: false,
  logErrors: true,
  maxErrorCount: 100
});

// Register error callback
errorHandler.onError(error => {
  if (error.type === PPUErrorType.TimingViolation) {
    console.warn('PPU timing issue detected:', error.context);
  }
});

// Error handling in main loop
try {
  const events = ppu.step(4);
  // Process events...
} catch (error) {
  if (error instanceof PPUError) {
    const handled = errorHandler.handleError(error);
    if (!handled) {
      throw error; // Re-throw if unhandleable
    }
  }
}
```

## Implementation Notes

### Memory Access Patterns

1. **VRAM Access**: Always check `isVRAMAccessible()` before access
2. **OAM Access**: Consider both PPU mode and DMA status
3. **Register Access**: Handle special cases (LY read-only, STAT quirks)
4. **DMA Integration**: Coordinate with CPU timing

### Performance Considerations

1. **Hot Paths**: Mode 3 rendering is most performance-critical
2. **Buffer Management**: Reuse allocated buffers when possible
3. **Memory Layout**: Use typed arrays for optimal performance
4. **Direct Access**: Minimize function call overhead in tight loops

### Hardware Accuracy

1. **Timing**: All timing values must match DMG hardware
2. **Memory Blocking**: Respect PPU mode memory access restrictions
3. **Register Behavior**: Implement all register special behaviors
4. **Interrupt Timing**: Generate interrupts at correct cycle boundaries

### Testing Integration

1. **Boundary Testing**: Test memory access at mode boundaries
2. **Timing Validation**: Verify cycle-accurate timing
3. **Hardware Tests**: Use Mealybug test ROMs for validation
4. **Performance Tests**: Ensure target frame rate maintenance

---

**References**:
- RGBDS GBZ80 Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 (Required primary source)
- `/home/pittm/karimono-v2/docs/hardware/ppu-comprehensive-specification.md` - Hardware specifications
- `/home/pittm/karimono-v2/docs/PPU_TECHNICAL_ARCHITECTURE.md` - System architecture
- `/home/pittm/karimono-v2/tests/resources/mealybug/` - Hardware validation test suite