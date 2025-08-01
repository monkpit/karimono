# Game Boy DMG PPU (Picture Processing Unit) Specifications

## Overview

The Game Boy DMG PPU generates video output at 160×144 pixels with 4 shades of gray. Operating in perfect synchronization with the 4.194304 MHz system clock, the PPU follows precise timing constraints that are critical for game compatibility.

## PPU Architecture

### Display Specifications
- **Resolution**: 160×144 pixels (visible area)
- **Color Depth**: 2 bits per pixel (4 shades of gray)  
- **Refresh Rate**: ~59.7 FPS (70,224 cycles per frame)
- **Scanlines**: 154 total (144 visible + 10 VBlank)
- **Horizontal Timing**: 456 cycles per scanline

### PPU Modes and State Machine

The PPU operates in 4 distinct modes during each scanline:

```
Mode 0 - HBLANK: Horizontal blank period
Mode 1 - VBLANK: Vertical blank period (scanlines 144-153)
Mode 2 - OAM Search: Scanning OAM for sprites on current line
Mode 3 - Pixel Transfer: Generating and outputting pixels
```

#### Mode Timing Details
```
Mode 2 (OAM Search): 80 cycles (fixed)
  - Scans OAM for sprites overlapping current scanline
  - CPU cannot access OAM during this period
  - Finds up to 10 sprites for rendering

Mode 3 (Pixel Transfer): 172-289 cycles (variable)
  - Base duration: 172 cycles (no sprites)
  - +6 cycles per sprite pixel rendered
  - CPU cannot access VRAM or OAM during this period
  - Actually generates pixel data for display

Mode 0 (HBLANK): 204-287 cycles (variable)  
  - Remaining cycles after Mode 3 completes
  - Total scanline always equals 456 cycles
  - CPU can access all video memory freely

Mode 1 (VBLANK): 4560 cycles (10 scanlines)
  - Scanlines 144-153 (10 scanlines × 456 cycles)
  - CPU can access all video memory freely
  - VBlank interrupt triggered at start of scanline 144
```

### VRAM Memory Layout

#### Tile Data Areas
```
Area 1: 0x8000-0x8FFF (4096 bytes)
  - Tiles 0-255 (unsigned addressing)
  - Used when LCDC bit 4 = 1
  - Each tile: 16 bytes (8×8 pixels, 2 bits per pixel)

Area 2: 0x8800-0x97FF (3840 bytes)  
  - Tiles -128 to 127 (signed addressing)
  - Used when LCDC bit 4 = 0
  - Overlaps with Area 1 from 0x8800-0x8FFF
```

#### Tile Maps
```
Map 1: 0x9800-0x9BFF (1024 bytes)
  - 32×32 tile indices
  - Background map when LCDC bit 3 = 0
  - Window map when LCDC bit 6 = 0

Map 2: 0x9C00-0x9FFF (1024 bytes)
  - 32×32 tile indices  
  - Background map when LCDC bit 3 = 1
  - Window map when LCDC bit 6 = 1
```

#### Tile Format
```
Each tile: 16 bytes representing 8×8 pixels
Bytes 0-1: Row 0 pixels
Bytes 2-3: Row 1 pixels
...
Bytes 14-15: Row 7 pixels

Pixel Color Calculation:
For each pixel position (x,y):
  bit0 = (tile_data[y*2] >> (7-x)) & 1
  bit1 = (tile_data[y*2+1] >> (7-x)) & 1  
  color = (bit1 << 1) | bit0
```

## PPU Registers

### LCD Control Register (LCDC - 0xFF40)
```
Bit 7: LCD Display Enable
  - 0: LCD off (saves power, screen blank)
  - 1: LCD on (normal operation)
  
Bit 6: Window Tile Map Display Select  
  - 0: Use tile map at 0x9800-0x9BFF
  - 1: Use tile map at 0x9C00-0x9FFF

Bit 5: Window Display Enable
  - 0: Window off
  - 1: Window on (if scanline >= WY)

Bit 4: BG & Window Tile Data Select
  - 0: Use tiles at 0x8800-0x97FF (signed addressing)
  - 1: Use tiles at 0x8000-0x8FFF (unsigned addressing)

Bit 3: BG Tile Map Display Select
  - 0: Use tile map at 0x9800-0x9BFF  
  - 1: Use tile map at 0x9C00-0x9FFF

Bit 2: OBJ (Sprite) Size
  - 0: 8×8 pixels
  - 1: 8×16 pixels (uses two consecutive tiles)

Bit 1: OBJ (Sprite) Display Enable
  - 0: Sprites off
  - 1: Sprites on

Bit 0: BG Display
  - 0: Background off (sprites still render over white)
  - 1: Background on
```

### LCD Status Register (STAT - 0xFF41)
```
Bit 6: LYC=LY Interrupt Source Enable
Bit 5: Mode 2 OAM Interrupt Source Enable  
Bit 4: Mode 1 VBlank Interrupt Source Enable
Bit 3: Mode 0 HBLANK Interrupt Source Enable
Bit 2: LYC=LY Flag (read-only, 1 when LY matches LYC)
Bits 1-0: PPU Mode (read-only)
  - 00: HBLANK (Mode 0)
  - 01: VBLANK (Mode 1)  
  - 10: OAM Search (Mode 2)
  - 11: Pixel Transfer (Mode 3)
```

### Scroll and Position Registers
```
SCY (0xFF42): Background Scroll Y
SCX (0xFF43): Background Scroll X
LY (0xFF44): LCD Y Coordinate (current scanline, read-only)
LYC (0xFF45): LY Compare (triggers interrupt when LY=LYC)
WY (0xFF4A): Window Y Position  
WX (0xFF4B): Window X Position (actual X = WX - 7)
```

### Palette Registers
```
BGP (0xFF47): Background Palette Data
  Bits 7-6: Color for palette index 3
  Bits 5-4: Color for palette index 2
  Bits 3-2: Color for palette index 1  
  Bits 1-0: Color for palette index 0

OBP0 (0xFF48): Object Palette 0 Data (same format as BGP)
OBP1 (0xFF49): Object Palette 1 Data (same format as BGP)

Color Values:
  00: White
  01: Light Gray
  10: Dark Gray  
  11: Black
```

## Sprite System (OAM)

### OAM Structure
```
Location: 0xFE00-0xFE9F (160 bytes)
Capacity: 40 sprites (4 bytes each)
Per-scanline limit: 10 sprites maximum
Per-pixel limit: 3 sprites maximum (DMG hardware limitation)
```

### Sprite Attributes (4 bytes per sprite)
```
Byte 0: Y Position
  - Sprite Y coordinate on screen
  - Range: 0-255, visible when 16 ≤ Y ≤ 159
  - Y=0 moves sprite off-screen (above)

Byte 1: X Position  
  - Sprite X coordinate on screen
  - Range: 0-255, visible when 8 ≤ X ≤ 167
  - X=0 moves sprite off-screen (left)

Byte 2: Tile Number
  - For 8×8 sprites: tile index in 0x8000-0x8FFF
  - For 8×16 sprites: uses tiles N and N+1, bit 0 ignored

Byte 3: Attributes/Flags
  Bit 7: Priority (0=above BG, 1=behind BG colors 1-3)
  Bit 6: Y Flip (0=normal, 1=vertically mirrored)
  Bit 5: X Flip (0=normal, 1=horizontally mirrored)
  Bit 4: Palette (0=OBP0, 1=OBP1)
  Bits 3-0: Unused (CGB only)
```

### Sprite Priority Rules
1. **Sprite-to-Background**: Controlled by priority bit and BG pixel color
2. **Sprite-to-Sprite**: Lower OAM address has higher priority
3. **X-coordinate Priority**: When X coordinates equal, lower OAM address wins

## Rendering Pipeline

### Background Rendering Process
1. **Tile Map Lookup**: Calculate tile map address from scroll and scanline
2. **Tile Data Fetch**: Get tile index, convert to tile data address  
3. **Pixel Generation**: Extract 2-bit color values from tile data
4. **Palette Application**: Apply BGP palette to convert to display colors

### Window Rendering Process  
1. **Window Activation**: Check if scanline ≥ WY and window enabled
2. **Window Coordinate**: Calculate window-relative coordinates
3. **Tile Rendering**: Same as background but with window tile map
4. **Pixel Priority**: Window pixels always override background pixels

### Sprite Rendering Process
1. **OAM Search** (Mode 2): Find sprites overlapping current scanline
2. **Sprite Evaluation**: Limit to 10 sprites, sort by X coordinate
3. **Pixel Generation**: Render sprite pixels with attribute processing
4. **Priority Resolution**: Apply sprite-to-BG and sprite-to-sprite priority

### Pixel Pipeline Timing
```
For each visible pixel (160 per scanline):
1. Background pixel fetch: 2 cycles
2. Window pixel check: +0-2 cycles (if enabled)
3. Sprite pixel evaluation: +0-6 cycles per sprite
4. Priority resolution: 1 cycle
5. Palette application: 1 cycle

Total Mode 3 duration: 172 + sprite_penalty cycles
```

## PPU Memory Access Restrictions

### Mode-Based Access Control
```
Mode 0 (HBLANK): Full CPU access to VRAM and OAM
Mode 1 (VBLANK): Full CPU access to VRAM and OAM  
Mode 2 (OAM Search): CPU blocked from OAM, VRAM accessible
Mode 3 (Pixel Transfer): CPU blocked from VRAM and OAM
```

### Blocked Access Behavior
- **OAM Blocked**: Reads return 0xFF, writes ignored
- **VRAM Blocked**: Reads return 0xFF, writes ignored  
- **DMA Active**: CPU blocked from OAM regardless of PPU mode

## Test Case Specifications

### 1. PPU Mode Transitions
**Test**: "PPU transitions between modes with correct timing"
- Initial state: LCDC enabled, LY = 0, Mode = 2
- Monitor: Mode transitions over complete scanline
- Expected result: Mode 2 (80 cycles) → Mode 3 (≥172 cycles) → Mode 0 (remaining cycles to 456)
- Validation: Total scanline exactly 456 cycles, Mealybug timing tests validate precise transitions

### 2. VRAM Access Restrictions  
**Test**: "CPU VRAM access blocked during Mode 3"
- Initial state: PPU in Mode 3, CPU attempts read from 0x8000
- Execute: `LD A,(0x8000)` during pixel transfer
- Expected result: A = 0xFF, memory read blocked
- Validation: Critical for game compatibility, many games rely on this behavior

### 3. Background Scrolling Accuracy
**Test**: "Background scrolling wraps correctly at tile map boundaries"
- Initial state: SCX = 248, SCY = 248, background enabled
- Render: Complete frame with maximum scroll values
- Expected result: Proper tile wrapping, no visual artifacts
- Validation: Mealybug tests verify pixel-perfect scrolling behavior

### 4. Window Activation Timing
**Test**: "Window activates on correct scanline and X position"
- Initial state: WY = 50, WX = 87 (effective X = 80), window enabled
- Render: Scanlines 49-51 
- Expected result: Window starts rendering at scanline 50, X coordinate 80
- Validation: Mealybug m3_window_timing.asm validates exact timing

### 5. Sprite Priority Resolution
**Test**: "Sprite priorities resolve correctly with background interaction"
- Initial state: Sprite at (16,16) with priority=1, BG pixel color=2
- Render: Overlapping area
- Expected result: Background pixel visible (sprite behind non-zero BG)
- Validation: Sprite priority bit affects rendering only for BG colors 1-3

### 6. OAM Search Sprite Limits
**Test**: "Maximum 10 sprites selected per scanline"
- Initial state: 20 sprites with Y coordinates on same scanline
- Execute: OAM search for that scanline
- Expected result: First 10 sprites (by OAM address) selected for rendering
- Validation: Hardware limitation enforced by OAM search phase

### 7. Palette Changes During Rendering
**Test**: "Mid-scanline palette changes affect subsequent pixels"
- Initial state: BGP = 0xE4, rendering scanline with mixed colors
- Execute: Change BGP to 0x1B during Mode 3
- Expected result: Pixels rendered after change use new palette
- Validation: Mealybug m3_bgp_change.asm validates exact timing behavior

### 8. LCDC Register Changes
**Test**: "LCDC changes during Mode 3 affect rendering immediately"
- Initial state: BG enabled, rendering tiles from area 0x8000
- Execute: Change LCDC bit 4 during pixel transfer
- Expected result: Subsequent tiles fetched from area 0x8800
- Validation: Mealybug m3_lcdc_tile_sel_change.asm validates timing

### 9. LYC Interrupt Timing
**Test**: "LYC=LY interrupt triggered at exact scanline start"
- Initial state: LYC = 50, LYC interrupt enabled
- Monitor: Interrupt timing when LY changes from 49 to 50
- Expected result: Interrupt triggered at cycle 0 of scanline 50
- Validation: Interrupt timing critical for many games' synchronization

### 10. Window Line Counter
**Test**: "Window internal line counter increments correctly"
- Initial state: Window enabled mid-frame, WY = 100
- Execute: Enable window at scanline 100, disable at 110, re-enable at 120
- Expected result: Window resumes at internal line 10, not line 0
- Validation: Window has internal line counter separate from LY

## Implementation Requirements

### Performance Requirements
- Complete Mode 2+3 processing within 252-369 cycles per scanline
- Maintain 59.7 FPS frame rate (70,224 cycles per frame)
- Support mid-scanline register changes with cycle accuracy
- Process all 10 sprites per scanline within timing constraints

### Accuracy Standards
- Pass all Mealybug PPU timing tests for DMG hardware
- Support pixel-perfect rendering for all test ROMs
- Handle edge cases in window/background interaction
- Implement exact sprite priority resolution rules

### Component Interface Requirements
```
PPU Component Interface:
- step(cycles): Advance PPU by specified cycles, return events
- readVRAM(address): Read VRAM with mode-based access control
- writeVRAM(address, value): Write VRAM with mode-based access control
- readOAM(address): Read OAM with mode-based access control  
- writeOAM(address, value): Write OAM with mode-based access control
- getPixelData(): Return current frame buffer for display
- getState(): Return complete PPU state for debugging
```

### Memory Access Interface
```
Memory access must be cycle-accurate:
- Return 0xFF for blocked VRAM/OAM reads
- Ignore blocked VRAM/OAM writes
- Provide access status for debugger/CPU
- Support DMA-initiated OAM access restrictions
```

## References

### Primary Test Sources
- **Mealybug Tearoom Tests**: Hardware-validated PPU behavior tests
  - All tests in `tests/resources/mealybug/src/ppu/` validate specific PPU behaviors
  - Expected results in `tests/resources/mealybug/expected/DMG-blob/`
  - Tests validate exact mid-scanline register change behaviors

### Documentation Sources  
- **Pan Docs**: https://gbdev.io/pandocs/Pixel_FIFO.html
- **GB Dev Wiki**: https://gbdev.gg8.se/wiki/articles/Video_Display
- **PPU Documentation**: tests/resources/mealybug/the-comprehensive-game-boy-ppu-documentation.md

### Critical Test ROMs for Validation
- **m3_bgp_change.asm**: Background palette mid-scanline changes
- **m3_window_timing.asm**: Window activation timing  
- **m3_lcdc_tile_sel_change.asm**: LCDC register changes during rendering
- **m3_scx_low_3_bits.asm**: Scroll register fine-grained timing
- **m2_win_en_toggle.asm**: Window enable/disable behavior

All PPU implementations MUST produce pixel-perfect output matching the Mealybug expected results for DMG hardware to ensure game compatibility.