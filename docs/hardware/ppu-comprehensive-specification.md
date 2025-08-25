# Game Boy DMG PPU - Comprehensive Hardware Specifications

**Document Purpose**: Complete technical specification for PPU implementation in the Karimono-v2 emulator, providing engineering-ready requirements derived from authoritative sources.

**Validation Strategy**: All implementations MUST pass Mealybug Tearoom PPU tests for DMG hardware accuracy.

## 1. Hardware Architecture Overview

### Core Display System
- **Resolution**: 160×144 pixels (visible area)
- **Total Frame Size**: 160×154 scanlines (144 visible + 10 VBlank)
- **Color Depth**: 2 bits per pixel (4 shades of gray)
- **Refresh Rate**: 59.7 FPS (70,224 CPU cycles per frame)
- **Scanline Duration**: 456 CPU cycles (fixed)

### Memory Architecture
- **VRAM**: 8KB at 0x8000-0x9FFF
  - Tile Data: 0x8000-0x97FF (384 tiles × 16 bytes)
  - Tile Maps: 0x9800-0x9FFF (2 maps × 1024 bytes)
- **OAM**: 160 bytes at 0xFE00-0xFE9F (40 sprites × 4 bytes)
- **Registers**: 0xFF40-0xFF4B (12 registers)

### Rendering Layers (Back to Front)
1. **Background Layer**: Scrollable 32×32 tile grid
2. **Window Layer**: Fixed overlay with independent tile map
3. **Sprite Layer**: 40 moveable objects, max 10 per scanline

## 2. Complete PPU Register Specifications (0xFF40-0xFF4B)

### LCDC Register (0xFF40) - LCD Control
```
Bit 7: LCD Display Enable
  - 0: LCD off, screen blank, full VRAM/OAM access
  - 1: LCD on, normal operation
  - WARNING: Only disable during VBlank to prevent hardware damage

Bit 6: Window Tile Map Select
  - 0: Window uses tile map at 0x9800-0x9BFF
  - 1: Window uses tile map at 0x9C00-0x9FFF

Bit 5: Window Enable
  - 0: Window hidden
  - 1: Window visible (when scanline >= WY)

Bit 4: BG & Window Tile Data Select
  - 0: Tiles at 0x8800-0x97FF (signed addressing, base 0x9000)
  - 1: Tiles at 0x8000-0x8FFF (unsigned addressing)
  - NOTE: Sprites always use 0x8000-0x8FFF regardless

Bit 3: BG Tile Map Select
  - 0: Background uses tile map at 0x9800-0x9BFF
  - 1: Background uses tile map at 0x9C00-0x9FFF

Bit 2: Sprite Size
  - 0: 8×8 pixels
  - 1: 8×16 pixels (uses consecutive tile pairs)

Bit 1: Sprite Enable
  - 0: No sprites displayed
  - 1: Sprites visible

Bit 0: BG & Window Enable (DMG Priority)
  - 0: Background off, sprites render over white
  - 1: Background on
```

### STAT Register (0xFF41) - LCD Status
```
Bit 6: LYC=LY Interrupt Enable
  - 0: Disabled
  - 1: Interrupt when LY matches LYC

Bit 5: Mode 2 (OAM Search) Interrupt Enable
Bit 4: Mode 1 (VBlank) Interrupt Enable
Bit 3: Mode 0 (HBlank) Interrupt Enable

Bit 2: LYC=LY Flag (Read-Only)
  - 0: LY ≠ LYC
  - 1: LY = LYC

Bits 1-0: PPU Mode (Read-Only)
  - 00: HBlank (Mode 0)
  - 01: VBlank (Mode 1)
  - 10: OAM Search (Mode 2)
  - 11: Pixel Transfer (Mode 3)

CRITICAL DMG BUG: Writing to STAT can trigger spurious interrupts
```

### Position and Scroll Registers
```
SCY (0xFF42): Background Scroll Y
  - Range: 0-255, wraps at tile map boundaries
  - Read during tile fetch - mid-scanline changes affect rendering

SCX (0xFF43): Background Scroll X
  - Range: 0-255, wraps at tile map boundaries
  - Fine scroll affects Mode 3 timing penalties

LY (0xFF44): Current Scanline (Read-Only)
  - Range: 0-153 (0-143 visible, 144-153 VBlank)
  - Increments at scanline start (cycle 0)

LYC (0xFF45): Scanline Compare
  - Range: 0-255
  - Triggers interrupt when LY = LYC (if enabled)

WY (0xFF4A): Window Y Position
  - Window activates when current scanline >= WY
  - Internal window line counter separate from LY

WX (0xFF4B): Window X Position
  - Effective X coordinate = WX - 7
  - Range: 7-166 for visible window area
```

### Palette Registers (DMG Only)
```
BGP (0xFF47): Background Palette
  Bits 7-6: Color for palette index 3 (darkest)
  Bits 5-4: Color for palette index 2
  Bits 3-2: Color for palette index 1
  Bits 1-0: Color for palette index 0 (lightest)

OBP0 (0xFF48): Sprite Palette 0
OBP1 (0xFF49): Sprite Palette 1
  Same format as BGP
  Index 0 is always transparent for sprites

Color Encoding:
  00: White
  01: Light Gray
  10: Dark Gray
  11: Black
```

### DMA Register (0xFF46) - OAM DMA Transfer
```
DMA Source Address High Byte
  - Copies 160 bytes from 0xXX00-0xXX9F to OAM (0xFE00-0xFE9F)
  - Transfer takes 160 CPU cycles (640 dots)
  - CPU can only access HRAM during transfer
  - Should be performed during VBlank for stability
```

## 3. PPU Mode State Machine and Timing

### Mode Transitions Per Scanline (456 cycles total)
```
Scanlines 0-143 (Visible):
  Mode 2 (OAM Search): 80 cycles (fixed)
  Mode 3 (Pixel Transfer): 172-289 cycles (variable)
  Mode 0 (HBlank): 87-204 cycles (remaining to 456)

Scanlines 144-153 (VBlank):
  Mode 1 (VBlank): 456 cycles per scanline
```

### Mode-Specific Behavior

#### Mode 2 - OAM Search (80 cycles)
**Purpose**: Scan OAM for sprites overlapping current scanline

**Process**:
1. Examine all 40 sprites in OAM
2. Select sprites where: `scanline >= sprite.y - 16` AND `scanline < sprite.y - 16 + sprite_height`
3. Limit to first 10 sprites found (by OAM address order)
4. Store selected sprites for Mode 3 rendering

**Memory Access**:
- CPU blocked from OAM (0xFE00-0xFE9F)
- CPU can access VRAM freely
- Blocked OAM reads return 0xFF, writes ignored

#### Mode 3 - Pixel Transfer (172-289 cycles)
**Purpose**: Generate and output pixel data for current scanline

**Base Duration**: 172 cycles (no sprites, no penalties)

**Timing Penalties**:
- **SCX Penalty**: `(SCX % 8) != 0` adds `SCX % 8` cycles
- **Window Penalty**: Window activation adds 6 cycles
- **Sprite Penalty**: 6 additional cycles per sprite pixel rendered

**Memory Access**:
- CPU blocked from VRAM (0x8000-0x9FFF) and OAM
- Blocked reads return 0xFF, writes ignored
- Critical for games that use VRAM access timing

#### Mode 0 - HBlank (87-204 cycles)
**Purpose**: Horizontal blanking period

**Duration**: `456 - (Mode 2 + Mode 3) cycles`

**Memory Access**:
- CPU has full access to VRAM and OAM
- Common time for game VRAM updates

#### Mode 1 - VBlank (4560 cycles total)
**Purpose**: Vertical blanking period

**Duration**: 10 scanlines (144-153) × 456 cycles each

**Events**:
- VBlank interrupt triggered at start of scanline 144
- Full CPU access to VRAM and OAM
- Primary time for large VRAM transfers and OAM DMA

## 4. Memory Layout and Organization

### VRAM Tile Data Areas

#### Unsigned Addressing (LCDC.4 = 1)
```
Area: 0x8000-0x8FFF (4096 bytes)
Tiles: 0-255
Each tile: 16 bytes (8×8 pixels, 2bpp)
Calculation: tile_address = 0x8000 + (tile_index × 16)
```

#### Signed Addressing (LCDC.4 = 0)
```
Area: 0x8800-0x97FF (3840 bytes)
Tiles: -128 to +127
Base pointer: 0x9000
Calculation: tile_address = 0x9000 + (signed_tile_index × 16)
```

### Tile Maps
```
Map 1: 0x9800-0x9BFF (1024 bytes)
Map 2: 0x9C00-0x9FFF (1024 bytes)
Organization: 32×32 tile indices
Row calculation: map_address + (row × 32) + column
```

### Tile Format Specification
```
Tile Structure (16 bytes):
  Bytes 0-1:   Row 0 pixel data
  Bytes 2-3:   Row 1 pixel data
  ...
  Bytes 14-15: Row 7 pixel data

Pixel Color Extraction:
  For pixel (x,y) in tile:
    bit0 = (tile_data[y*2] >> (7-x)) & 1
    bit1 = (tile_data[y*2+1] >> (7-x)) & 1
    color_index = (bit1 << 1) | bit0
```

## 5. OAM (Object Attribute Memory) Structure

### OAM Organization
```
Location: 0xFE00-0xFE9F (160 bytes)
Capacity: 40 sprites (4 bytes each)
Per-scanline limit: 10 sprites maximum (hardware enforced)
Selection: First 10 sprites found during OAM search
```

### Sprite Attributes (4 bytes per sprite)
```
Byte 0: Y Position
  - Sprite top edge Y coordinate
  - Screen position = Y - 16
  - Visible range: Y ∈ [16, 159] for 8×8 sprites
  - Y ∈ [16, 151] for 8×16 sprites

Byte 1: X Position
  - Sprite left edge X coordinate
  - Screen position = X - 8
  - Visible range: X ∈ [8, 167]
  - X = 0 hides sprite (off-screen left)

Byte 2: Tile Index
  - 8×8 mode: Direct tile index in 0x8000-0x8FFF
  - 8×16 mode: Uses tiles N and N+1 (bit 0 ignored)
  - Always uses unsigned addressing regardless of LCDC.4

Byte 3: Attribute Flags
  Bit 7: BG/Window over OBJ Priority
    - 0: Sprite above BG/Window
    - 1: Sprite behind BG/Window colors 1-3 (color 0 still transparent)
  
  Bit 6: Y Flip
    - 0: Normal
    - 1: Vertically mirrored
  
  Bit 5: X Flip
    - 0: Normal
    - 1: Horizontally mirrored
  
  Bit 4: DMG Palette Selection
    - 0: Use OBP0 palette
    - 1: Use OBP1 palette
  
  Bits 3-0: Unused in DMG (CGB color palette in CGB mode)
```

### Sprite Priority System
```
Priority Resolution Order:
1. BG/Window Priority (Attribute bit 7)
   - Priority=0: Sprite renders above all BG/Window pixels
   - Priority=1: Sprite renders behind BG/Window colors 1-3, above color 0

2. Sprite-to-Sprite Priority (DMG)
   - Lower X coordinate has higher priority
   - When X coordinates equal: lower OAM address wins
   - When overlapping: higher priority sprite pixels shown

3. Transparency Rules
   - Sprite color index 0 is always transparent
   - Transparent pixels don't affect priority calculations
```

## 6. Rendering Pipeline Technical Details

### Background Rendering Process
```
Per-Pixel Process:
1. Calculate effective coordinates:
   bg_x = (pixel_x + SCX) & 0xFF
   bg_y = (current_scanline + SCY) & 0xFF

2. Calculate tile map position:
   tile_x = bg_x >> 3
   tile_y = bg_y >> 3
   map_address = tile_map_base + (tile_y << 5) + tile_x

3. Fetch tile index:
   tile_index = VRAM[map_address]

4. Convert to tile data address:
   if (LCDC.4): tile_address = 0x8000 + (tile_index << 4)
   else: tile_address = 0x9000 + (signed(tile_index) << 4)

5. Extract pixel color:
   pixel_y = bg_y & 7
   pixel_x = bg_x & 7
   byte0 = VRAM[tile_address + (pixel_y << 1)]
   byte1 = VRAM[tile_address + (pixel_y << 1) + 1]
   bit0 = (byte0 >> (7 - pixel_x)) & 1
   bit1 = (byte1 >> (7 - pixel_x)) & 1
   color_index = (bit1 << 1) | bit0

6. Apply background palette:
   final_color = (BGP >> (color_index << 1)) & 3
```

### Window Rendering Process
```
Window Activation Conditions:
- LCDC.5 = 1 (Window enabled)
- Current scanline >= WY
- Current pixel >= (WX - 7)

Window Coordinate Calculation:
- window_x = pixel_x - (WX - 7)
- window_y = internal_window_line_counter

Window Line Counter:
- Separate from LY register
- Increments each scanline when window is active
- Persists when window disabled, resumes from last value
- Only resets when WY condition fails
```

### Sprite Rendering Process
```
OAM Search Phase (Mode 2):
1. Scan all 40 OAM entries sequentially
2. For each sprite, check Y range:
   if (scanline >= sprite.y - 16 && 
       scanline < sprite.y - 16 + sprite_height):
     select sprite
3. Limit to first 10 sprites found
4. Store selected sprites for pixel transfer

Pixel Transfer Phase (Mode 3):
1. For each horizontal pixel position:
   a. Check all selected sprites at this X coordinate
   b. Find highest-priority visible sprite pixel
   c. If sprite pixel non-transparent, use sprite color
   d. Apply sprite palette (OBP0 or OBP1)
   e. Check priority against BG/Window pixel
   f. Output final pixel color
```

## 7. Timing Specifications and Hardware Constraints

### Critical Timing Requirements
```
Frame Timing:
- Total cycles per frame: 70,224 (154 scanlines × 456 cycles)
- Visible area: 65,664 cycles (144 scanlines × 456 cycles)
- VBlank period: 4,560 cycles (10 scanlines × 456 cycles)
- Target frame rate: 59.7 FPS

Scanline Timing Constraints:
- Mode 2 duration: Exactly 80 cycles
- Mode 3 duration: 172 cycles minimum, up to 289 cycles maximum
- Mode 0 duration: Remaining cycles to reach 456 total
- Total scanline: Always exactly 456 cycles
```

### Mode 3 Timing Penalties
```
Base Duration: 172 cycles (ideal case)

SCX Scroll Penalty:
if (SCX & 7) != 0:
  penalty += (SCX & 7) cycles

Window Activation Penalty:
if window activates on scanline:
  penalty += 6 cycles

Sprite Rendering Penalty:
penalty += sum(sprite_pixel_counts × 6)

Maximum Mode 3 Duration:
172 + 7 + 6 + (10 sprites × 8 pixels × 6) = 665 cycles (theoretical)
Hardware limit: 289 cycles maximum observed
```

### Memory Access Windows
```
VRAM Access Timing:
- Available: Modes 0, 1, 2
- Blocked: Mode 3
- Access during Mode 3: Read = 0xFF, Write = ignored

OAM Access Timing:
- Available: Modes 0, 1
- Blocked: Modes 2, 3
- Additional block: During DMA transfer
- Access when blocked: Read = 0xFF, Write = ignored
```

## 8. Integration Points with Existing Systems

### CPU Integration Requirements
```
Memory Interface:
- PPU must intercept VRAM reads/writes (0x8000-0x9FFF)
- PPU must intercept OAM reads/writes (0xFE00-0xFE9F)
- PPU must intercept register reads/writes (0xFF40-0xFF4B)
- Return appropriate values based on current PPU mode

Interrupt Generation:
- VBlank interrupt at scanline 144 start
- STAT interrupts based on register configuration
- LYC=LY interrupt when scanlines match
- Mode-specific interrupts (HBlank, VBlank, OAM)
```

### MMU Integration Points
```
Address Space Mapping:
0x8000-0x9FFF: VRAM (PPU managed, mode-based access)
0xFE00-0xFE9F: OAM (PPU managed, mode-based access)
0xFF40-0xFF4B: PPU Registers (direct PPU access)

DMA Integration:
0xFF46: DMA register triggers OAM transfer
During DMA: Block all OAM access regardless of PPU mode
DMA duration: 160 cycles (must coordinate with PPU timing)
```

### Timer Integration
```
PPU Clock Source:
- PPU runs at system clock frequency (4.194304 MHz)
- PPU step() called for each CPU cycle
- Independent timing from Timer/Divider registers

Timing Synchronization:
- PPU provides cycle-accurate mode transitions
- CPU instruction timing must account for memory access blocks
- Critical for games using precise PPU timing
```

## 9. Test ROM Validation Strategy

### Mealybug Tearoom Test Coverage
```
Critical PPU Tests (tests/resources/mealybug/src/ppu/):

Timing Tests:
- m3_window_timing.asm: Window activation timing
- m3_scx_low_3_bits.asm: Fine scroll timing effects
- m2_win_en_toggle.asm: Window enable/disable behavior

Register Change Tests:
- m3_bgp_change.asm: Mid-scanline palette changes
- m3_lcdc_tile_sel_change.asm: Tile data area switching
- m3_lcdc_bg_map_change.asm: Background map switching
- m3_obp0_change.asm: Sprite palette changes

Rendering Tests:
- m3_wx_4_change_sprites.asm: Window/sprite interaction
- m3_lcdc_obj_size_change.asm: Sprite size changes
- m3_scy_change.asm: Background scroll updates

Expected Results:
- All test ROMs in tests/resources/mealybug/expected/DMG-blob/
- Pixel-perfect output matching required
- Any deviation indicates emulator bug
```

### Validation Requirements
```
Test Execution:
1. Load Mealybug test ROM
2. Run to completion (test self-terminates)
3. Capture final PPU output as PNG
4. Compare against expected DMG-blob result
5. Require exact pixel match (zero tolerance)

Integration Testing:
- PPU tests must pass with full system integration
- CPU, MMU, Timer, and PPU coordination required
- Test timing-sensitive register access patterns
- Validate interrupt generation timing
```

## 10. Implementation Priority Matrix

### Phase 1: Core Infrastructure (Critical)
```
Priority 1 (MVP Requirements):
1. Basic PPU register implementation (LCDC, STAT, scroll)
2. Mode state machine with correct timing
3. Simple background rendering (no sprites)
4. Memory access restriction enforcement
5. Basic interrupt generation (VBlank)

Validation: Basic display output, Mode transitions
Time Estimate: 2-3 implementation cycles
```

### Phase 2: Complete Rendering (High)
```
Priority 2 (Core Functionality):
1. Complete background rendering with scrolling
2. Window layer implementation
3. Basic sprite rendering (8×8, no priority)
4. Palette system implementation
5. OAM search and sprite selection

Validation: Simple games display correctly
Time Estimate: 2-3 implementation cycles
```

### Phase 3: Hardware Accuracy (High)
```
Priority 3 (Compatibility):
1. Sprite priority system
2. Mid-scanline register changes
3. Exact timing penalties (SCX, window, sprites)
4. Complete OAM DMA implementation
5. All memory access edge cases

Validation: Mealybug tests pass
Time Estimate: 3-4 implementation cycles
```

### Phase 4: Advanced Features (Medium)
```
Priority 4 (Polish):
1. 8×16 sprite support
2. Sprite attribute flags (flip, priority)
3. Window line counter edge cases
4. STAT interrupt quirks
5. Performance optimization

Validation: Complex games work correctly
Time Estimate: 2-3 implementation cycles
```

## 11. Component Interface Specifications

### PPU Class Interface
```typescript
interface PPU {
  // Core execution
  step(cycles: number): PPUEvents;
  
  // Memory access (mode-aware)
  readVRAM(address: number): number;
  writeVRAM(address: number, value: number): void;
  readOAM(address: number): number;
  writeOAM(address: number, value: number): void;
  
  // Register access
  readRegister(address: number): number;
  writeRegister(address: number, value: number): void;
  
  // Display output
  getFrameBuffer(): Uint8Array; // 160×144 pixels
  isFrameReady(): boolean;
  
  // Status/debugging
  getCurrentMode(): PPUMode;
  getCurrentScanline(): number;
  getState(): PPUState;
}

interface PPUEvents {
  vblankInterrupt: boolean;
  statInterrupt: boolean;
  frameComplete: boolean;
}
```

### Memory Access Behavior
```typescript
// VRAM access (0x8000-0x9FFF)
readVRAM(address: number): number {
  if (this.currentMode === PPUMode.PixelTransfer) {
    return 0xFF; // Blocked during Mode 3
  }
  return this.vram[address - 0x8000];
}

// OAM access (0xFE00-0xFE9F)
readOAM(address: number): number {
  if (this.currentMode === PPUMode.OAMSearch || 
      this.currentMode === PPUMode.PixelTransfer ||
      this.dmaActive) {
    return 0xFF; // Blocked during modes 2, 3, or DMA
  }
  return this.oam[address - 0xFE00];
}
```

## 12. Hardware References and Documentation

### Primary Sources (Authoritative)
```
1. Mealybug Tearoom Tests (Hardware Validated)
   Location: tests/resources/mealybug/
   Status: Pass on real DMG hardware - any failure = emulator bug
   Coverage: Mid-scanline register changes, exact timing

2. RGBDS GBZ80 Reference
   URL: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   Status: Required primary source per CLAUDE.md
   Coverage: CPU integration, instruction timing

3. Local Opcodes Database
   Location: tests/resources/opcodes.json
   Usage: CPU instruction timing coordination
   Access: Use jq/grep for specific instruction lookup
```

### Secondary References (Validation)
```
1. Pan Docs
   URL: https://gbdev.io/pandocs/
   Coverage: Complete hardware reference
   Usage: Cross-validate behaviors, implementation details

2. GB Dev Wiki
   URL: https://gbdev.gg8.se/wiki/articles/Video_Display
   Coverage: Technical hardware specifications
   Usage: Understand hardware rationale, edge cases

3. Comprehensive PPU Documentation
   Location: tests/resources/mealybug/the-comprehensive-game-boy-ppu-documentation.md
   Coverage: Real hardware testing results
   Usage: Understand hardware quirks and timing
```

### Implementation Reference
```
GameBoy Online Implementation
URL: https://github.com/taisel/GameBoy-Online/tree/master/js
Status: DMG-compatible reference implementation
Usage: Validate implementation patterns (ignore GBC features)
```

## Summary

This specification provides complete PPU implementation requirements derived from hardware-validated test ROMs and authoritative documentation. All implementation must prioritize Mealybug test ROM compatibility as the ultimate measure of hardware accuracy.

**Key Success Criteria:**
1. All Mealybug PPU tests produce pixel-perfect output
2. Integration with existing CPU/MMU/Timer systems
3. Cycle-accurate timing for game compatibility
4. Memory access restrictions properly enforced
5. Complete register and rendering functionality

**Next Steps:**
1. Human review and feedback on specification completeness
2. Architecture review for integration requirements
3. Test Engineer validation of test case specifications
4. Implementation planning with priority matrix