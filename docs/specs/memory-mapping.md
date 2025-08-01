# Game Boy DMG Memory Mapping and MMU Specifications

## Overview

The Game Boy DMG uses a 16-bit address space (64KB) with sophisticated memory management including bank switching, hardware registers, and access restrictions. The Memory Management Unit (MMU) coordinates all memory access between the CPU, PPU, and cartridge hardware.

## Memory Map Layout

### Complete Address Space (0x0000-0xFFFF)

```
0000-3FFF: 16KB ROM Bank 00 (Fixed, non-switchable)
4000-7FFF: 16KB ROM Bank 01-NN (Switchable via MBC)
8000-9FFF: 8KB Video RAM (VRAM)
A000-BFFF: 8KB External RAM (Cartridge RAM, switchable)
C000-CFFF: 4KB Work RAM Bank 0 (WRAM)
D000-DFFF: 4KB Work RAM Bank 1 (WRAM)
E000-FDFF: Echo RAM (Mirror of C000-DDFF, prohibited area)
FE00-FE9F: Object Attribute Memory (OAM, sprite data)
FEA0-FEFF: Not Usable (varies by hardware revision)
FF00-FF7F: I/O Hardware Registers
FF80-FFFE: High RAM (HRAM, 127 bytes zero-page memory)
FFFF:       Interrupt Enable Register (IE)
```

## Memory Regions Detailed Specifications

### ROM Areas (0x0000-0x7FFF)

#### Fixed ROM Bank 00 (0x0000-0x3FFF)

```
Purpose: Contains cartridge header, interrupt vectors, and core game code
Size: 16KB (16,384 bytes)
Access: Read-only, always accessible
Contents:
  0000-00FF: Interrupt and reset vectors
  0100-014F: Cartridge header with title, checksums, hardware info
  0150-3FFF: Game code and data (non-switchable)

Critical Addresses:
  0000: RST 00 (restart vector)
  0008: RST 08 (restart vector)
  0010: RST 10 (restart vector)
  0018: RST 18 (restart vector)
  0020: RST 20 (restart vector)
  0028: RST 28 (restart vector)
  0030: RST 30 (restart vector)
  0038: RST 38 (restart vector)
  0040: VBlank interrupt vector
  0048: LCD STAT interrupt vector
  0050: Timer interrupt vector
  0058: Serial interrupt vector
  0060: Joypad interrupt vector
  0100: Entry point (typically NOP; JP 0150)
```

#### Switchable ROM Bank (0x4000-0x7FFF)

```
Purpose: Bank-switched ROM for larger games
Size: 16KB per bank
Access: Read-only, bank controlled by MBC
Default: Bank 1 on power-up
Banking: Controlled by writes to 0x2000-0x3FFF (MBC1)

Bank Selection Rules:
- Bank 0 redirected to Bank 1 (cannot select bank 0)
- Maximum banks depend on MBC type and ROM size
- Invalid bank numbers wrap or truncate based on MBC
```

### Video Memory (0x8000-0x9FFF)

#### VRAM Structure

```
Size: 8KB (8,192 bytes)
Access Restrictions: CPU blocked during PPU Mode 3
Clear Value: Random on power-up, not guaranteed to be 0x00

Memory Layout:
  8000-87FF: Tile Data Block 0 (128 tiles)
  8800-8FFF: Tile Data Block 1 (128 tiles)
  9000-97FF: Tile Data Block 2 (128 tiles)
  9800-9BFF: Background Tile Map 0 (32×32 = 1024 bytes)
  9C00-9FFF: Background Tile Map 1 (32×32 = 1024 bytes)

Addressing Modes:
  LCDC.4=1: Unsigned addressing (0x8000 base, tiles 0-255)
  LCDC.4=0: Signed addressing (0x9000 base, tiles -128 to 127)
```

### External RAM (0xA000-0xBFFF)

#### Cartridge RAM

```
Purpose: Save game data, high scores, battery-backed storage
Size: 0-32KB depending on cartridge type
Access: Controlled by MBC RAM enable register
Default: Disabled (reads return random values)

Access Control:
  Write 0x0A to 0x0000-0x1FFF: Enable RAM
  Write other values to 0x0000-0x1FFF: Disable RAM

Bank Switching (if multiple RAM banks):
  Write bank number to 0x4000-0x5FFF (MBC-dependent)
```

### Work RAM (0xC000-0xDFFF)

#### WRAM Banks

```
Bank 0 (0xC000-0xCFFF): 4KB, always accessible
Bank 1 (0xD000-0xDFFF): 4KB, always accessible
Total: 8KB internal RAM

Characteristics:
- Fastest memory access (no wait states)
- Used for game variables, stack, temporary data
- Retains data until power off (no battery backup)
- Initialize to random values on power-up
```

### Echo RAM (0xE000-0xFDFF)

#### Prohibited Memory Region

```
Size: 7,680 bytes (mirrors 0xC000-0xDDFF)
Behavior: Mirrors WRAM but should not be used
Reason: May not work on all hardware revisions
Implementation: Mirror reads/writes to WRAM - 0x2000

Access Pattern:
  Read from 0xE000 → Read from 0xC000
  Write to 0xE000 → Write to 0xC000
  Read from 0xFDFF → Read from 0xDDFF
```

### Object Attribute Memory (0xFE00-0xFE9F)

#### OAM Structure

```
Size: 160 bytes (40 sprites × 4 bytes each)
Access Restrictions:
  - CPU blocked during PPU Mode 2 and Mode 3
  - CPU blocked during DMA transfer
  - Returns 0xFF when blocked

Sprite Data Format (4 bytes per sprite):
  Byte 0: Y Position (sprite Y + 16)
  Byte 1: X Position (sprite X + 8)
  Byte 2: Tile Number
  Byte 3: Attributes (priority, flip, palette)
```

### Unusable Memory (0xFEA0-0xFEFF)

#### Hardware-Dependent Region

```
Size: 96 bytes
Behavior: Varies by DMG revision
  - Some revisions: Returns 0xFF
  - Other revisions: Returns random/garbage values
  - Should never be used by games

Implementation Recommendation:
  - Return 0xFF for reads
  - Ignore writes
  - Log access attempts for debugging
```

## I/O Hardware Registers (0xFF00-0xFF7F)

### Core System Registers

```
FF00: JOYP - Joypad input register
FF01: SB - Serial transfer data
FF02: SC - Serial transfer control
FF04: DIV - Divider register (timer)
FF05: TIMA - Timer counter
FF06: TMA - Timer modulo
FF07: TAC - Timer control
FF0F: IF - Interrupt flag register
```

### PPU Registers

```
FF40: LCDC - LCD control register
FF41: STAT - LCD status register
FF42: SCY - Background scroll Y
FF43: SCX - Background scroll X
FF44: LY - LCD Y coordinate (current scanline)
FF45: LYC - LY compare register
FF46: DMA - DMA transfer and start address
FF47: BGP - Background palette data
FF48: OBP0 - Object palette 0 data
FF49: OBP1 - Object palette 1 data
FF4A: WY - Window Y position
FF4B: WX - Window X position
```

### Audio Registers

```
FF10-FF14: Channel 1 (tone & sweep)
FF16-FF19: Channel 2 (tone)
FF1A-FF1E: Channel 3 (wave)
FF20-FF23: Channel 4 (noise)
FF24: NR50 - Master volume control
FF25: NR51 - Sound panning control
FF26: NR52 - Sound on/off control
FF30-FF3F: Wave pattern RAM (Channel 3)
```

### Unused I/O Space

```
FF03, FF08-FF0E, FF15, FF1F, FF27-FF2F: Unused
Behavior: Return 0xFF for reads, ignore writes
Purpose: Reserved for future hardware expansion
```

### High RAM (0xFF80-0xFFFE)

#### Zero-Page Memory

```
Size: 127 bytes (0xFF80-0xFFFE)
Purpose: High-speed memory for critical code/data
Characteristics:
  - Fastest memory access (zero-page addressing)
  - Always accessible (no PPU restrictions)
  - Often used for DMA routine, interrupt handlers
  - Cleared to 0x00 on some hardware, random on others
```

### Interrupt Enable Register (0xFFFF)

```
Single byte controlling interrupt system
Bit 4: Joypad interrupt enable
Bit 3: Serial interrupt enable
Bit 2: Timer interrupt enable
Bit 1: LCD STAT interrupt enable
Bit 0: VBlank interrupt enable
Bits 7-5: Unused (always 0)
```

## Memory Bank Controllers (MBC)

### MBC1 Specifications

```
ROM Banks: 1-125 (2MB maximum)
RAM Banks: 0-3 (32KB maximum)
Banking Registers:
  0000-1FFF: RAM Enable (0x0A enables, others disable)
  2000-3FFF: ROM Bank Number (5 bits, bank 0 → bank 1)
  4000-5FFF: RAM Bank / Upper ROM Bank bits
  6000-7FFF: Banking Mode (0=ROM mode, 1=RAM mode)

Banking Mode Effects:
  ROM Mode: 4000-5FFF affects ROM banks 20h,40h,60h
  RAM Mode: 4000-5FFF selects RAM bank, ROM locked to 0-1Fh
```

### MBC2 Specifications

```
ROM Banks: 1-15 (256KB maximum)
Built-in RAM: 256 × 4-bit values (512 bytes effective)
Banking Registers:
  0000-3FFF: ROM Bank / RAM Enable (determined by bit 8 of address)
    A8=0: RAM Enable (0x0A enables RAM)
    A8=1: ROM Bank Select (4 bits, bank 0 → bank 1)

RAM Characteristics:
  - Only lower 4 bits of each byte used
  - Upper 4 bits always read as 1111
  - Total effective storage: 256 × 4 bits = 1024 bits
```

### MBC3 Specifications

```
ROM Banks: 1-127 (2MB maximum)
RAM Banks: 0-3 (32KB maximum)
RTC Support: Real-time clock with battery backup
Banking Registers:
  0000-1FFF: RAM and Timer Enable
  2000-3FFF: ROM Bank Number (7 bits, bank 0 → bank 1)
  4000-5FFF: RAM Bank / RTC Register Select
  6000-7FFF: Latch Clock Data

RTC Registers (selected via 4000-5FFF):
  08h: RTC Seconds (0-59)
  09h: RTC Minutes (0-59)
  0Ah: RTC Hours (0-23)
  0Bh: RTC Days Lower 8 bits
  0Ch: RTC Days Upper 1 bit + Carry/Stop flags
```

## Memory Access Timing and Restrictions

### PPU Mode-Based Restrictions

```
Mode 0 (HBLANK): All memory accessible
Mode 1 (VBLANK): All memory accessible
Mode 2 (OAM Search): OAM blocked, VRAM accessible
Mode 3 (Pixel Transfer): VRAM and OAM blocked

Blocked Access Behavior:
  - Reads return 0xFF
  - Writes are ignored
  - No bus conflicts or corruption
```

### DMA Transfer Restrictions

```
During DMA (triggered by write to FF46):
  - CPU can only access HRAM (FF80-FFFE)
  - All other memory returns 0xFF / ignores writes
  - DMA takes 160 machine cycles (640 T-states)
  - Transfers 160 bytes from source to OAM
```

### Memory Access Performance

```
Internal RAM (WRAM, HRAM): 1 cycle access
External ROM: 1 cycle access
External RAM: 1 cycle access
VRAM: 1 cycle (when accessible)
OAM: 1 cycle (when accessible)
I/O Registers: 1 cycle
```

## Test Case Specifications

### 1. Bank Switching Validation

**Test**: "MBC1 ROM bank switching affects correct address range"

- Initial state: ROM bank 1 selected (default)
- Execute: Write 0x02 to 0x2000 (select ROM bank 2)
- Access: Read from 0x4000
- Expected result: Data from ROM bank 2, not bank 1
- Validation: Bank switching must be immediate and affect entire 0x4000-0x7FFF range

### 2. VRAM Access Restriction

**Test**: "VRAM access blocked during PPU Mode 3 returns 0xFF"

- Initial state: PPU in Mode 3, VRAM contains known pattern
- Execute: CPU read from 0x8000
- Expected result: Read returns 0xFF regardless of actual VRAM content
- Validation: Critical for game compatibility, PPU has priority over CPU

### 3. Echo RAM Mirroring

**Test**: "Echo RAM properly mirrors WRAM addresses"

- Initial state: WRAM cleared, write 0x42 to 0xC100
- Execute: Read from 0xE100 (echo RAM)
- Expected result: Read returns 0x42 (mirrored from 0xC100)
- Validation: Echo RAM must mirror exactly, despite being prohibited

### 4. OAM DMA Transfer

**Test**: "DMA transfer correctly copies data to OAM"

- Initial state: Source data at 0xC000-0xC09F, OAM cleared
- Execute: Write 0xC0 to FF46 (start DMA from 0xC000)
- Expected result: OAM contains copied data, CPU blocked for 160 cycles
- Validation: DMA must transfer exactly 160 bytes with correct timing

### 5. RAM Banking (MBC1)

**Test**: "MBC1 RAM banking selects correct RAM bank"

- Initial state: RAM enabled, write distinct values to banks 0 and 1
- Execute: Switch between RAM banks via 0x4000-0x5FFF
- Expected result: Different data visible at 0xA000 based on selected bank
- Validation: RAM banking must be independent of ROM banking

### 6. Hardware Register Access

**Test**: "I/O register writes take effect immediately"

- Initial state: LCDC = 0x91 (LCD on, BG on)
- Execute: Write 0x80 to FF40 (disable background)
- Expected result: LCDC reads as 0x80, background rendering disabled
- Validation: Register changes must be immediate and visible

### 7. High RAM Accessibility

**Test**: "HRAM accessible during DMA transfer"

- Initial state: DMA active, HRAM contains test pattern
- Execute: CPU read from 0xFF80 during DMA
- Expected result: Read succeeds and returns correct HRAM data
- Validation: HRAM must remain accessible during DMA for interrupt handlers

### 8. Bank 0 Redirection

**Test**: "MBC1 bank 0 selection redirects to bank 1"

- Initial state: ROM bank 1 selected
- Execute: Write 0x00 to 0x2000 (attempt to select bank 0)
- Access: Read from 0x4000
- Expected result: Data from ROM bank 1, not bank 0
- Validation: Bank 0 cannot be selected in switchable area

### 9. Memory Timing Accuracy

**Test**: "Memory access completes in exactly 1 cycle"

- Initial state: CPU executing known instruction sequence
- Execute: Series of memory reads from different regions
- Expected result: Each access takes exactly 4 T-states (1 machine cycle)
- Validation: Blargg mem_timing tests validate exact memory timing

### 10. Invalid Address Access

**Test**: "Access to unusable memory region behaves consistently"

- Initial state: System initialized normally
- Execute: Read from 0xFEA0-0xFEFF range
- Expected result: Returns 0xFF, no side effects
- Validation: Unused regions must not cause crashes or corruption

## Implementation Requirements

### MMU Component Interface

```
MMU Component Interface:
- read(address): Read byte with all restrictions applied
- write(address, value): Write byte with all restrictions applied
- loadCartridge(rom_data): Initialize cartridge and MBC state
- getMBCState(): Return MBC registers for save states
- setMBCState(state): Restore MBC state from save states
- getDMAStatus(): Return DMA progress and restrictions
```

### Memory Access Control

```
Access control must handle:
- PPU mode-based restrictions (VRAM/OAM blocking)
- DMA transfer restrictions (HRAM-only access)
- MBC register decoding and banking
- Echo RAM mirroring to WRAM
- Hardware register dispatch to correct components
```

### Performance Requirements

- All memory access in exactly 1 machine cycle (4 T-states)
- Bank switching takes effect immediately (same cycle)
- DMA transfer blocks CPU for exactly 160 cycles
- No memory access should exceed 1 cycle latency

### Accuracy Standards

- Pass all Blargg memory timing tests (mem_timing.gb)
- Support all common MBC types (MBC1, MBC2, MBC3)
- Handle edge cases in bank switching and RAM access
- Maintain exact DMG hardware behavior for restricted access

## References

### Primary Test Sources

- **Blargg Test ROMs**: Memory timing and access validation
  - `mem_timing.gb`: Memory access timing validation
  - `mem_timing-2.gb`: Additional memory timing tests
- **Game Compatibility**: Real cartridges for MBC validation

### Documentation Sources

- **Pan Docs**: https://gbdev.io/pandocs/Memory_Map.html
- **GB Dev Wiki**: https://gbdev.gg8.se/wiki/articles/Memory_Bank_Controllers
- **Technical Specifications**: /tests/resources/reference-implementations/technical-specifications.md

### Critical Validation Requirements

All memory implementations MUST pass Blargg memory timing tests and support loading/running real Game Boy cartridges with correct MBC behavior to ensure compatibility.
