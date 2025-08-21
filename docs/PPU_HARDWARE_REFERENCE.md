# PPU Hardware Reference - Game Boy DMG Graphics Hardware

**Document Version**: 1.0  
**Created**: 2025-08-11  
**Purpose**: Comprehensive hardware reference for Game Boy DMG PPU implementation  
**Target Audience**: All implementation teams, Hardware researchers, Documentation reference  
**Authority**: Derived from authoritative sources and hardware-validated test ROMs  

## Document Authority and Sources

### Primary Authoritative Sources

**MANDATORY PRIMARY REFERENCE (NON-NEGOTIABLE):**
- **RGBDS GBZ80 Reference**: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 
  - **Required for all PPU timing coordination with CPU instructions**
  - **Definitive source for instruction cycle timing affecting PPU coordination**

**Hardware-Validated References:**
- **Mealybug Tearoom Tests**: `/home/pittm/karimono-v2/tests/resources/mealybug/`
  - **Status**: Pass on real DMG hardware - any failure indicates emulator bug
  - **Coverage**: Mid-scanline register changes, exact timing, edge cases
  - **Authority**: Infallible - real hardware tested

### Secondary References (Cross-Validation)

- **Pan Docs**: https://gbdev.io/pandocs/ - Complete hardware reference
- **GB Dev Wiki**: https://gbdev.gg8.se/wiki/articles/Video_Display - Technical specifications  
- **GameBoy Online Implementation**: https://github.com/taisel/GameBoy-Online/tree/master/js - Reference implementation
- **Comprehensive PPU Documentation**: `/home/pittm/karimono-v2/tests/resources/mealybug/the-comprehensive-game-boy-ppu-documentation.md`

## PPU Hardware Overview

### Display System Specifications

```
Display Resolution:     160×144 pixels (visible area)
Total Frame Size:       160×154 scanlines (144 visible + 10 VBlank)
Color Depth:            2 bits per pixel (4 shades of gray)
Refresh Rate:          59.7275 Hz (70,224 CPU cycles per frame)
Scanline Duration:     456 CPU cycles (fixed)
Pixel Clock:           4.194304 MHz (same as CPU clock)
```

### Memory Architecture

```
VRAM (Video RAM):      8KB at 0x8000-0x9FFF
  - Tile Data:         0x8000-0x97FF (384 tiles × 16 bytes each)
  - Tile Maps:         0x9800-0x9FFF (2 maps × 1024 bytes each)

OAM (Object Attribute Memory):  160 bytes at 0xFE00-0xFE9F
  - Sprite Capacity:   40 sprites × 4 bytes each
  - Per-Scanline Limit: Maximum 10 sprites visible per scanline

PPU Registers:         12 registers at 0xFF40-0xFF4B
  - Control:           LCDC, STAT
  - Positioning:       SCX, SCY, LY, LYC, WX, WY  
  - Palettes:          BGP, OBP0, OBP1
  - DMA:               DMA transfer control
```

### Rendering Layer Architecture

```
Layer Priority (Back to Front):
1. Background Layer:   32×32 tile grid with scrolling (SCX/SCY)
2. Window Layer:       Fixed overlay with independent tile map
3. Sprite Layer:       40 moveable objects, priority system
```

## Complete PPU Register Specifications

### LCDC Register (0xFF40) - LCD Control

```
Bit 7: LCD Display Enable
  Value 0: LCD off, screen blank
    - Full VRAM/OAM access available
    - PPU consumes no power
    - Screen shows white
  Value 1: LCD on, normal operation
    - PPU operates in 4-mode state machine
    - Memory access restrictions apply
  
  CRITICAL SAFETY NOTE: Only disable LCD during VBlank period
  Disabling LCD outside VBlank can damage hardware on real Game Boy

Bit 6: Window Tile Map Select
  Value 0: Window uses tile map at 0x9800-0x9BFF
  Value 1: Window uses tile map at 0x9C00-0x9FFF

Bit 5: Window Enable
  Value 0: Window layer hidden
  Value 1: Window layer visible
    - Activates when current scanline ≥ WY register
    - Window X position controlled by WX register

Bit 4: BG & Window Tile Data Select
  Value 0: Tiles sourced from 0x8800-0x97FF
    - Signed tile indexing: -128 to +127
    - Base address: 0x9000
    - Address calculation: 0x9000 + (signed_index × 16)
  Value 1: Tiles sourced from 0x8000-0x8FFF  
    - Unsigned tile indexing: 0 to 255
    - Address calculation: 0x8000 + (index × 16)
  
  NOTE: Sprites always use unsigned addressing (0x8000-0x8FFF) regardless

Bit 3: BG Tile Map Select
  Value 0: Background uses tile map at 0x9800-0x9BFF
  Value 1: Background uses tile map at 0x9C00-0x9FFF

Bit 2: Sprite Size
  Value 0: 8×8 pixel sprites
  Value 1: 8×16 pixel sprites
    - Uses consecutive tile pairs (N and N+1)
    - Tile index bit 0 ignored in 8×16 mode

Bit 1: Sprite Enable
  Value 0: No sprites displayed
  Value 1: Sprites visible according to OAM data

Bit 0: BG & Window Enable/Priority (DMG Behavior)
  Value 0: Background and window disabled
    - Sprites render over white background
    - Priority system modified
  Value 1: Background and window enabled
    - Full priority system active
```

### STAT Register (0xFF41) - LCD Status

```
Bit 6: LYC=LY Interrupt Enable
  Value 0: LYC=LY interrupt disabled
  Value 1: LYC=LY interrupt enabled
    - Triggers when LY register equals LYC register
    - Checked at start of each scanline

Bit 5: Mode 2 (OAM Search) Interrupt Enable
  Value 0: Mode 2 interrupt disabled
  Value 1: Mode 2 interrupt enabled
    - Triggers when entering Mode 2 (OAM Search)
    - Occurs at start of each visible scanline

Bit 4: Mode 1 (VBlank) Interrupt Enable  
  Value 0: Mode 1 interrupt disabled
  Value 1: Mode 1 interrupt enabled
    - Triggers when entering Mode 1 (VBlank)
    - Occurs at scanline 144

Bit 3: Mode 0 (HBlank) Interrupt Enable
  Value 0: Mode 0 interrupt disabled
  Value 1: Mode 0 interrupt enabled
    - Triggers when entering Mode 0 (HBlank)
    - Occurs after pixel transfer completes

Bit 2: LYC=LY Flag (Read-Only)
  Value 0: LY ≠ LYC
  Value 1: LY = LYC
    - Updated automatically by PPU
    - Reflects current comparison state

Bits 1-0: PPU Mode (Read-Only)
  Value 00: Mode 0 - HBlank
  Value 01: Mode 1 - VBlank  
  Value 10: Mode 2 - OAM Search
  Value 11: Mode 3 - Pixel Transfer

CRITICAL DMG BUG: Writing to STAT register can trigger spurious interrupts
  - Occurs when interrupt conditions are already met during write
  - Affects timing-sensitive software
  - Must be emulated for hardware accuracy
```

### Scroll and Position Registers

```
SCY (0xFF42): Background Scroll Y
  Range: 0-255 (wraps at 256)
  Effect: Vertical scroll offset for background layer
  Timing: Read during tile fetch - mid-scanline changes affect rendering
  Hardware: Changes during pixel transfer can cause visual glitches

SCX (0xFF43): Background Scroll X  
  Range: 0-255 (wraps at 256)
  Effect: Horizontal scroll offset for background layer
  Timing: Affects Mode 3 duration - adds (SCX & 7) cycle penalty
  Hardware: Fine scrolling impacts pixel transfer timing

LY (0xFF44): Current Scanline (Read-Only)
  Range: 0-153 during normal operation
    - 0-143: Visible scanlines
    - 144-153: VBlank scanlines
  Timing: Increments at beginning of scanline (cycle 0)
  Hardware: Attempts to write are ignored

LYC (0xFF45): Scanline Compare
  Range: 0-255
  Function: Comparison target for LY register
  Interrupt: Triggers STAT interrupt when LY = LYC (if enabled)
  Timing: Comparison occurs at scanline start

WY (0xFF4A): Window Y Position
  Range: 0-255  
  Function: Y coordinate where window becomes visible
  Condition: Window activates when current scanline ≥ WY
  Counter: Internal window line counter separate from LY

WX (0xFF4B): Window X Position
  Range: 0-255
  Function: X coordinate of window left edge
  Calculation: Effective X position = WX - 7
  Visible: Window visible when WX ∈ [7, 166]
  Timing: WX values 0-6 can cause timing issues
```

### Palette Registers (DMG Only)

```
BGP (0xFF47): Background Palette
  Format: 2 bits per color, 4 colors total
  Bits 7-6: Palette entry for color index 3 (darkest)
  Bits 5-4: Palette entry for color index 2  
  Bits 3-2: Palette entry for color index 1
  Bits 1-0: Palette entry for color index 0 (lightest)

OBP0 (0xFF48): Object Palette 0
OBP1 (0xFF49): Object Palette 1  
  Format: Same as BGP
  Special: Color index 0 is always transparent for sprites
  Usage: Sprite attribute bit 4 selects between OBP0 and OBP1

Palette Value Encoding:
  00: White       (Lightest shade)
  01: Light Gray  (Light shade) 
  10: Dark Gray   (Dark shade)
  11: Black       (Darkest shade)

Hardware Colors (Original DMG):
  White:      RGB(155, 188, 15)  - Light green
  Light Gray: RGB(139, 172, 15)  - Medium green  
  Dark Gray:  RGB(48, 98, 48)    - Dark green
  Black:      RGB(15, 56, 15)    - Darkest green
```

### DMA Register (0xFF46) - OAM DMA Transfer

```
DMA (0xFF46): DMA Source Address High Byte
  Function: Triggers OAM DMA transfer
  Source: 0xXX00-0xXX9F (where XX is written value)
  Destination: OAM at 0xFE00-0xFE9F
  Size: 160 bytes (exactly fills OAM)
  Duration: 160 CPU cycles (640 dots at 4× CPU frequency)

DMA Transfer Process:
  1. Write source high byte to 0xFF46
  2. PPU begins transfer immediately  
  3. CPU blocked from all memory except HRAM (0xFF80-0xFFFE)
  4. Transfer proceeds at 1 byte per CPU cycle
  5. CPU access restored after 160 cycles

Memory Access During DMA:
  Accessible: HRAM (0xFF80-0xFFFE), IE register (0xFFFF)
  Blocked: All other memory regions
  Reads: Return unpredictable values (often 0xFF)
  Writes: Ignored or cause bus conflicts

Timing Considerations:
  - DMA should be initiated during VBlank for stable operation
  - Interrupts can occur during DMA but limited by memory access
  - Critical for games that update sprites every frame
```

## PPU State Machine and Timing

### Four-Mode State Machine

```
Mode 0 - HBlank (Horizontal Blank):
  Duration: 87-204 CPU cycles (variable)
  Memory: CPU can access VRAM and OAM freely
  Function: Horizontal blanking period after line rendering
  Calculation: Duration = 456 - (Mode 2 + Mode 3) cycles
  
Mode 1 - VBlank (Vertical Blank):  
  Duration: 4560 CPU cycles (10 scanlines × 456 cycles)
  Memory: CPU can access VRAM and OAM freely
  Function: Vertical blanking period between frames
  Interrupts: VBlank interrupt triggered at scanline 144 start
  
Mode 2 - OAM Search:
  Duration: 80 CPU cycles (fixed)
  Memory: CPU blocked from OAM, VRAM accessible
  Function: Scan OAM for sprites overlapping current scanline
  Process: Examines all 40 sprites, selects first 10 that overlap
  
Mode 3 - Pixel Transfer:
  Duration: 172-289 CPU cycles (variable)  
  Memory: CPU blocked from both VRAM and OAM
  Function: Generate pixel data for current scanline
  Timing: Variable duration based on rendering complexity
```

### Detailed Timing Specifications

```
Frame Timing (Total: 70,224 cycles):
  Visible Area: 65,664 cycles (144 scanlines × 456 cycles)
  VBlank Period: 4,560 cycles (10 scanlines × 456 cycles)
  Frame Rate: 4,194,304 Hz ÷ 70,224 = 59.7275 Hz

Scanline Timing (Total: 456 cycles):
  Mode 2 (OAM Search): 80 cycles (fixed)
  Mode 3 (Pixel Transfer): 172-289 cycles (variable)  
  Mode 0 (HBlank): 87-204 cycles (remainder to 456)

Mode 3 Variable Timing:
  Base Duration: 172 cycles (no sprites, no penalties)
  SCX Penalty: +(SCX & 7) cycles for horizontal scrolling
  Window Penalty: +6 cycles when window activates on scanline  
  Sprite Penalty: +6 cycles per sprite pixel rendered
  
Maximum Mode 3 Duration Calculation:
  Base (172) + SCX max (7) + Window (6) + Max sprites (10×8×6) = 665 cycles
  Hardware Reality: Maximum observed ~289 cycles
```

### Mode Transition Details

```
Scanline 0-143 (Visible) Transitions:
  Cycle 0: Mode 2 begins (OAM Search)
  Cycle 80: Mode 3 begins (Pixel Transfer)  
  Cycle 80+Variable: Mode 0 begins (HBlank)
  Cycle 456: Advance to next scanline

Scanline 144-153 (VBlank) Transitions:
  Cycle 0 of scanline 144: Mode 1 begins (VBlank interrupt)
  All cycles: Remain in Mode 1
  End of scanline 153: Return to scanline 0, Mode 2

Frame Boundary Transition:
  End of scanline 153 → scanline 0
  Mode 1 (VBlank) → Mode 2 (OAM Search)
  Frame cycle counter resets to 0
```

## Memory Layout and Organization

### VRAM Memory Map

```
VRAM Layout (8KB, 0x8000-0x9FFF):

Tile Data Area 1: 0x8000-0x8FFF (4096 bytes)
  - Tile indices 0-255 (unsigned addressing)
  - Each tile: 16 bytes (8×8 pixels, 2 bits per pixel)
  - Address calculation: 0x8000 + (tile_index × 16)
  - Used by: Sprites (always), BG/Window (when LCDC.4=1)

Tile Data Area 2: 0x8800-0x97FF (3840 bytes)  
  - Tile indices -128 to +127 (signed addressing)
  - Each tile: 16 bytes (8×8 pixels, 2 bits per pixel)
  - Base address: 0x9000
  - Address calculation: 0x9000 + (signed_tile_index × 16)
  - Used by: BG/Window (when LCDC.4=0)

Tile Map 1: 0x9800-0x9BFF (1024 bytes)
  - 32×32 tile indices (1024 tiles total)
  - Each byte: tile index for 8×8 pixel area
  - Row calculation: 0x9800 + (row × 32) + column
  - Used by: BG (when LCDC.3=0), Window (when LCDC.6=0)

Tile Map 2: 0x9C00-0x9FFF (1024 bytes)
  - Same format as Tile Map 1
  - Row calculation: 0x9C00 + (row × 32) + column  
  - Used by: BG (when LCDC.3=1), Window (when LCDC.6=1)
```

### Tile Format Specification

```
Tile Structure (16 bytes per tile):
  Byte 0-1:   Row 0 pixel data (2 bytes per row)
  Byte 2-3:   Row 1 pixel data
  Byte 4-5:   Row 2 pixel data  
  Byte 6-7:   Row 3 pixel data
  Byte 8-9:   Row 4 pixel data
  Byte 10-11: Row 5 pixel data
  Byte 12-13: Row 6 pixel data
  Byte 14-15: Row 7 pixel data

Pixel Color Extraction (for pixel at position x,y in tile):
  1. Calculate row offset: row_offset = y × 2
  2. Read two bytes: 
     - low_byte = tile_data[row_offset]
     - high_byte = tile_data[row_offset + 1]  
  3. Extract bits:
     - bit_position = 7 - x
     - bit0 = (low_byte >> bit_position) & 1
     - bit1 = (high_byte >> bit_position) & 1
  4. Combine: color_index = (bit1 << 1) | bit0

Example Tile Data:
  Solid White Tile: All bytes = 0x00 (color index 0)
  Solid Black Tile: All bytes = 0xFF (color index 3)  
  Checkerboard: Alternating 0xAA, 0x55 pattern
```

### OAM Memory Organization

```
OAM Layout (160 bytes, 0xFE00-0xFE9F):
  40 sprites × 4 bytes each = 160 bytes total

Sprite Entry Format (4 bytes):
  Byte 0: Y Position
    - Screen Y coordinate = Y - 16
    - Range for visibility: 16 ≤ Y ≤ 159 (8×8 sprites)
    - Range for 8×16 sprites: 16 ≤ Y ≤ 151
    - Y = 0: Sprite hidden (off-screen top)

  Byte 1: X Position  
    - Screen X coordinate = X - 8
    - Range for visibility: 8 ≤ X ≤ 167
    - X = 0: Sprite hidden (off-screen left)
    - X ≥ 168: Sprite hidden (off-screen right)

  Byte 2: Tile Index
    - 8×8 mode: Direct tile index (0-255)
    - 8×16 mode: Upper tile index (bit 0 ignored)
      - Uses tiles N and N+1 vertically
      - N = tile_index & 0xFE (force even)
    - Always uses unsigned addressing (0x8000 base)

  Byte 3: Attribute Flags
    - Bit 7: BG/Window over OBJ Priority
      - 0: Sprite renders above all BG/Window pixels
      - 1: Sprite renders behind BG/Window colors 1-3
           (still renders above BG/Window color 0)
    - Bit 6: Y Flip
      - 0: Normal vertical orientation
      - 1: Vertically mirrored  
    - Bit 5: X Flip
      - 0: Normal horizontal orientation
      - 1: Horizontally mirrored
    - Bit 4: DMG Palette Selection
      - 0: Use OBP0 palette register
      - 1: Use OBP1 palette register
    - Bits 3-0: Unused in DMG (CGB palette in CGB mode)
```

## Rendering Pipeline Technical Details

### Background Rendering Process

```
Per-Pixel Background Rendering:

1. Calculate Effective Coordinates:
   effective_x = (pixel_x + SCX) & 0xFF
   effective_y = (current_scanline + SCY) & 0xFF

2. Determine Tile Position:
   tile_x = effective_x >> 3  // Divide by 8
   tile_y = effective_y >> 3  // Divide by 8

3. Calculate Tile Map Address:
   map_base = (LCDC.3) ? 0x9C00 : 0x9800
   map_address = map_base + (tile_y << 5) + tile_x

4. Read Tile Index:
   tile_index = VRAM[map_address - 0x8000]

5. Calculate Tile Data Address:
   if (LCDC.4 == 1):  // Unsigned mode
     tile_address = 0x8000 + (tile_index << 4)
   else:  // Signed mode
     signed_index = (tile_index < 128) ? tile_index : tile_index - 256
     tile_address = 0x9000 + (signed_index << 4)

6. Extract Pixel Color:
   pixel_x_in_tile = effective_x & 7
   pixel_y_in_tile = effective_y & 7
   
   row_offset = pixel_y_in_tile << 1
   low_byte = VRAM[tile_address - 0x8000 + row_offset]
   high_byte = VRAM[tile_address - 0x8000 + row_offset + 1]
   
   bit_position = 7 - pixel_x_in_tile
   bit0 = (low_byte >> bit_position) & 1
   bit1 = (high_byte >> bit_position) & 1
   color_index = (bit1 << 1) | bit0

7. Apply Background Palette:
   palette_shift = color_index << 1
   final_color = (BGP >> palette_shift) & 3
```

### Window Rendering Process

```
Window Activation Conditions:
  1. LCDC.5 = 1 (Window enabled in LCD control)
  2. current_scanline ≥ WY (Scanline within window Y range)
  3. current_pixel ≥ (WX - 7) (Pixel within window X range)

Window Coordinate System:
  - Window has independent coordinate system
  - window_x = current_pixel - (WX - 7)
  - window_y = internal_window_line_counter

Window Line Counter Behavior:
  - Separate from LY register
  - Increments only when window is active on scanline
  - Persists when window disabled
  - Only resets when WY condition fails (scanline < WY)

Window Priority:
  - Window pixels always have priority over background
  - Window and background share same tile data area
  - Window uses separate tile map (selected by LCDC.6)

Window Edge Cases:
  - WX values 0-6: Can cause timing issues
  - WX = 7: Window starts at left edge of screen
  - WX > 166: Window not visible on screen
  - Mid-scanline WX changes: Affect current scanline
```

### Sprite Rendering Process

```
OAM Search Phase (Mode 2 - 80 cycles):

1. Initialize:
   sprites_found = 0
   selected_sprites = []

2. Scan All OAM Entries:
   for sprite_index = 0 to 39:
     sprite = read_sprite_from_oam(sprite_index)
     
     // Check Y range overlap
     sprite_height = (LCDC.2) ? 16 : 8
     if (current_scanline >= sprite.y - 16 AND
         current_scanline < sprite.y - 16 + sprite_height):
       
       selected_sprites.add(sprite)
       sprites_found++
       
       // Hardware limit: maximum 10 sprites per scanline
       if sprites_found >= 10:
         break

3. Store Selected Sprites:
   // Store for use in Mode 3 (Pixel Transfer)

Pixel Transfer Phase (Mode 3):

1. For Each Horizontal Pixel Position:
   sprite_pixel_color = 0  // Transparent
   sprite_priority = false
   
   for each sprite in selected_sprites:
     if pixel overlaps with sprite:
       pixel_color = extract_sprite_pixel_color(sprite, pixel_x, pixel_y)
       
       if pixel_color != 0:  // Not transparent
         // Apply sprite priority rules
         if no_previous_sprite_pixel OR sprite_has_higher_priority:
           sprite_pixel_color = pixel_color
           sprite_priority = sprite.priority_flag

2. Apply Sprite Palette:
   palette = (sprite.palette_flag) ? OBP1 : OBP0
   final_sprite_color = apply_palette(sprite_pixel_color, palette)

Sprite Priority Resolution:
  1. Lower X coordinate = higher priority
  2. Equal X coordinate: lower OAM address = higher priority  
  3. Transparent pixels (color 0) don't participate in priority
  4. Only first non-transparent pixel is rendered per screen position
```

### Layer Priority System

```
Final Pixel Priority Resolution:

1. Background/Window Layer:
   - Background pixel from background rendering
   - Window pixel overrides background if window active
   - bg_pixel = window_active ? window_pixel : background_pixel

2. Sprite Layer Evaluation:
   - sprite_pixel from sprite rendering (0 = transparent)
   - sprite_priority from sprite attribute flags

3. Final Priority Decision:
   if sprite_pixel == 0:  // Sprite transparent
     final_pixel = bg_pixel
   else if bg_pixel == 0:  // BG transparent (color 0)
     final_pixel = sprite_pixel
   else if sprite_priority == 0:  // Sprite above BG
     final_pixel = sprite_pixel
   else:  // Sprite behind BG colors 1-3
     final_pixel = bg_pixel

4. Palette Application:
   // Already applied during layer rendering
   // Final pixel is ready for display

Special Cases:
  - LCDC.0 = 0: Background disabled, sprites render over white
  - All layers transparent: Pixel displays as background color 0
  - Multiple sprites: Only highest priority non-transparent pixel used
```

## Timing Penalties and Performance Impact

### Mode 3 Timing Penalties

```
Base Mode 3 Duration: 172 cycles

SCX Scroll Penalty:
  Penalty = SCX & 7  // Low 3 bits of SCX register
  Range: 0-7 additional cycles
  Cause: Fine horizontal scrolling requires partial tile fetches
  Total: 172 + (SCX & 7) cycles

Window Activation Penalty:
  Penalty = 6 cycles (when window activates)
  Condition: Window becomes visible on current scanline
  Occurs: When scanline ≥ WY and window enabled
  Total: Base + SCX penalty + 6 cycles

Sprite Rendering Penalty:  
  Penalty = 6 cycles per sprite pixel rendered
  Maximum theoretical: 10 sprites × 8 pixels × 6 cycles = 480 cycles
  Hardware reality: Complex timing reduces practical maximum
  Typical: 50-100 additional cycles for sprite-heavy scanlines

Practical Mode 3 Duration Range:
  Minimum: 172 cycles (no sprites, no penalties)
  Typical: 200-250 cycles (average game content)
  Maximum observed: ~289 cycles (hardware limit)
```

### Memory Access Timing Windows

```
VRAM Access (0x8000-0x9FFF):
  Accessible Modes: 0 (HBlank), 1 (VBlank), 2 (OAM Search)
  Blocked Mode: 3 (Pixel Transfer)
  
  Access during Mode 3:
    - Read operations return 0xFF
    - Write operations ignored
    - No bus conflicts or crashes

  Timing Impact:
    - Critical for games using VRAM as working memory
    - Mid-frame VRAM updates must be timed carefully

OAM Access (0xFE00-0xFE9F):  
  Accessible Modes: 0 (HBlank), 1 (VBlank)
  Blocked Modes: 2 (OAM Search), 3 (Pixel Transfer)
  Additional Block: During DMA transfer
  
  Access during blocked modes:
    - Read operations return 0xFF  
    - Write operations ignored
    - Corrupted sprite data if accessed improperly

  Timing Impact:
    - Sprite updates typically done during VBlank
    - DMA transfer preferred for sprite animation

PPU Register Access:
  Always accessible (no timing restrictions)  
  Special behaviors:
    - LY register read-only
    - STAT register write can trigger spurious interrupts
    - DMA register triggers transfer
```

## Hardware Quirks and Edge Cases

### STAT Register Interrupt Bug

```
DMG Hardware Bug: STAT Write Spurious Interrupt

Condition: Writing to STAT register when interrupt condition already true
Result: Extra STAT interrupt triggered immediately

Example Scenario:
  1. PPU in Mode 0 (HBlank)
  2. STAT register has Mode 0 interrupt enabled
  3. Software writes to STAT register  
  4. Spurious STAT interrupt triggered (even if no change)

Emulation Requirement:
  - Must check current interrupt conditions during STAT write
  - Generate extra interrupt if any enabled condition is true
  - Critical for timing-sensitive software compatibility

Implementation:
  on_stat_write(value):
    old_stat = stat_register
    stat_register = (stat_register & 0x07) | (value & 0xF8)
    
    if any_stat_interrupt_condition_met():
      request_stat_interrupt()
```

### LCD Disable Safety

```
Critical Hardware Behavior: LCD Disable Timing

Safe Disable: Only during VBlank (Mode 1)
  - Screen goes white immediately
  - PPU stops operation cleanly
  - No hardware damage

Unsafe Disable: During active display (Modes 0, 2, 3)
  - Can damage real Game Boy LCD
  - Causes display artifacts
  - May corrupt PPU internal state

Emulation Approach:
  - Warn when LCD disabled outside VBlank
  - Simulate immediate white screen
  - Reset PPU state to safe defaults

Implementation:
  on_lcdc_write(value):
    old_enabled = lcd_enabled
    new_enabled = (value & 0x80) != 0
    
    if old_enabled and not new_enabled:
      if current_mode != VBlank:
        warning("LCD disabled outside VBlank - unsafe on real hardware")
      
      // Immediate LCD off behavior
      set_screen_white()
      reset_ppu_state()
```

### DMA Transfer Quirks

```
DMA Transfer Edge Cases:

Source Address Restrictions:
  - Source must be in range 0x0000-0xF100 (approximately)
  - Sources 0xE000-0xF100 may access echo RAM or prohibited regions
  - High addresses (0xF200+) can cause bus conflicts

Timing Interactions:
  - DMA blocks CPU memory access for exactly 160 cycles
  - Interrupts can occur during DMA but with limited handler capability
  - DMA + PPU memory access can create complex timing scenarios

Memory Access During DMA:
  - HRAM (0xFF80-0xFFFE): Always accessible
  - IE Register (0xFFFF): Accessible  
  - All other memory: Blocked (returns 0xFF or undefined)

Implementation Considerations:
  - Track DMA progress cycle by cycle
  - Block CPU memory access appropriately
  - Handle interrupt service during DMA restriction
```

### Mid-Scanline Register Changes

```
Register Change Timing Effects:

SCX/SCY Mid-Scanline Changes:
  - Take effect immediately for remaining pixels
  - Can create visual artifacts (intended by some games)
  - Testing: Mealybug tests validate exact behavior

LCDC Mid-Scanline Changes:
  - Tile data area changes affect current scanline
  - Tile map changes affect current scanline
  - Sprite enable/disable immediate effect

Window Register Changes:
  - WX changes affect current scanline
  - WY changes affect current scanline  
  - Window enable/disable immediate effect

Palette Register Changes:
  - BGP/OBP0/OBP1 changes take effect immediately
  - Affect remaining pixels on current scanline
  - Used for color cycling effects

Critical for Hardware Accuracy:
  - Games rely on mid-scanline register effects
  - Mealybug tests specifically validate this behavior
  - Timing must be cycle-accurate for compatibility
```

## Performance Optimization Considerations

### Hardware Performance Characteristics

```
PPU Performance Profile:

Most Expensive Operations:
  1. Mode 3 (Pixel Transfer): 172-289 cycles per scanline
     - Tile data fetching
     - Sprite rendering  
     - Layer composition
  
  2. OAM Search (Mode 2): 80 cycles per scanline
     - Sprite selection
     - Y-coordinate comparison

  3. Memory Access Coordination:
     - VRAM/OAM access blocking
     - DMA transfer management

Performance Critical Paths:
  - 144 Mode 3 operations per frame (pixel transfer)  
  - 23,040 pixel calculations per frame (160×144)
  - Up to 1,440 sprite evaluations per frame (10×144)

Timing Constraints:
  - Target: 59.7275 Hz frame rate
  - Budget: 16.75ms per frame maximum
  - PPU must coordinate with CPU timing exactly
```

### Implementation Optimization Strategies

```
Memory Layout Optimization:
  - Use typed arrays for VRAM/OAM storage
  - Pre-allocate frame buffer and working arrays  
  - Optimize tile data access patterns

Rendering Pipeline Optimization:
  - Minimize function call overhead in hot loops
  - Use lookup tables for palette conversion
  - Cache frequently accessed tile data

State Machine Optimization:
  - Minimize per-cycle overhead
  - Batch mode transition calculations
  - Optimize timing penalty calculations

Integration Optimization:  
  - Efficient CPU-PPU cycle coordination
  - Optimized memory access checking
  - Streamlined interrupt generation
```

## Validation and Testing Requirements

### Hardware Accuracy Validation

```
Required Test Coverage:

Mealybug Tearoom Tests:
  ✓ m3_window_timing.asm
  ✓ m3_scx_low_3_bits.asm  
  ✓ m2_win_en_toggle.asm
  ✓ m3_bgp_change.asm
  ✓ m3_lcdc_tile_sel_change.asm
  ✓ m3_lcdc_bg_map_change.asm
  ✓ m3_obp0_change.asm
  ✓ m3_wx_4_change_sprites.asm
  ✓ m3_lcdc_obj_size_change.asm
  ✓ m3_scy_change.asm

Validation Criteria:
  - Pixel-perfect output matching expected results
  - Zero tolerance for visual differences
  - Timing-accurate register behavior
  - Proper interrupt generation

Additional Test Requirements:
  - Complex ROM compatibility testing
  - Performance benchmarking  
  - Edge case behavior validation
  - Integration stability testing
```

### Critical Success Criteria

```
Hardware Accuracy Requirements:
  1. 100% pass rate on Mealybug PPU test suite
  2. Pixel-perfect output matching DMG hardware
  3. Cycle-accurate timing for all operations
  4. Proper memory access restrictions

Performance Requirements:
  1. Sustained 59.7 FPS frame rate
  2. <16.75ms frame time budget
  3. Efficient memory utilization
  4. Minimal garbage collection impact

Integration Requirements:  
  1. Seamless CPU-PPU coordination
  2. Proper interrupt timing
  3. No regression in existing CPU tests
  4. Stable multi-frame operation

Code Quality Requirements:
  1. TypeScript strict mode compliance
  2. Complete JSDoc documentation
  3. Comprehensive test coverage
  4. Clean architectural boundaries
```

## Summary

This hardware reference provides the definitive specification for Game Boy DMG PPU implementation in the Karimono-v2 emulator. All implementation must prioritize:

1. **Hardware Accuracy**: Verified by Mealybug test ROM suite
2. **Timing Precision**: Cycle-accurate coordination with CPU
3. **Memory Correctness**: Proper access restrictions and DMA behavior
4. **Performance Excellence**: Target frame rate with efficiency
5. **Integration Quality**: Seamless system coordination

The combination of authoritative sources, hardware-validated test ROMs, and comprehensive specifications ensures implementation success while maintaining our established engineering standards.

---

**Implementation Authority Chain**:
1. **RGBDS GBZ80 Reference** (CPU timing coordination) - MANDATORY
2. **Mealybug Test ROMs** (Hardware validation) - DEFINITIVE  
3. **This Hardware Reference** (Implementation guidance) - AUTHORITATIVE
4. **Pan Docs / GB Dev Wiki** (Cross-validation) - SUPPORTIVE

**Quality Gate**: All PPU implementation MUST pass 100% of Mealybug hardware validation tests with pixel-perfect accuracy.