# Game Boy DMG Memory Management Unit (MMU) Specification

> **⚠️ ARCHITECTURE UPDATE NOTICE**  
> **Performance Optimization (2025-08-02)**: PPU mode access restrictions have been removed from the MMU implementation for performance reasons. This document describes the theoretical hardware behavior but the actual emulator implementation uses direct memory access for ~80x performance improvement. See `/home/pittm/karimono-v2/docs/decisions/mmu-performance-optimization.md` for details.

## Executive Summary

The Game Boy DMG Memory Management Unit (MMU) manages the complete 16-bit address space (0x0000-0xFFFF) and coordinates all memory access between system components. The MMU enables bank switching to expand addressable memory beyond 64KB and handles critical operations like ROM/RAM bank switching and boot ROM overlay.

**Core Responsibilities (Implementation Focus):**
- Memory address decoding and routing to appropriate components
- Memory Bank Controller (MBC) coordination for ROM/RAM bank switching  
- Boot ROM overlay and switching mechanism
- Echo RAM mirroring and hardware register routing

**Hardware Behavior (Reference Only):**
- PPU mode-based access restrictions (VRAM/OAM blocking) - *Not implemented for performance*
- DMA transfer management with CPU access restrictions - *Simplified implementation*

**Implementation Standards:**
- All memory access must complete in exactly 4 T-states (1 machine cycle)
- Bank switching takes effect immediately on register write
- PPU mode changes block access immediately with no delay
- DMA transfers block CPU access for exactly 160 machine cycles

## Complete Memory Map with Hardware-Accurate Specifications

### Address Space Layout (0x0000-0xFFFF)

| Address Range | Size    | Purpose                    | Access Control                    | Timing |
|---------------|---------|----------------------------|-----------------------------------|--------|
| 0x0000-0x3FFF | 16,384B | ROM Bank 00 (Fixed)       | Read-only, always accessible     | 4 T-states |
| 0x4000-0x7FFF | 16,384B | ROM Bank 01-NN (Switch)   | Read-only, MBC-controlled        | 4 T-states |
| 0x8000-0x9FFF | 8,192B  | Video RAM (VRAM)          | Blocked during PPU Mode 3        | 4 T-states |
| 0xA000-0xBFFF | 8,192B  | External RAM (Cartridge)  | MBC enable/bank controlled       | 4 T-states |
| 0xC000-0xDFFF | 8,192B  | Work RAM (WRAM)           | Always accessible                | 4 T-states |
| 0xE000-0xFDFF | 7,680B  | Echo RAM (WRAM Mirror)    | Mirrors C000-DDFF, prohibited   | 4 T-states |
| 0xFE00-0xFE9F | 160B    | Object Attribute Memory   | Blocked during PPU Mode 2+3, DMA| 4 T-states |
| 0xFEA0-0xFEFF | 96B     | Unused Memory Region      | Returns 0xFF, writes ignored    | 4 T-states |
| 0xFF00-0xFF7F | 128B    | I/O Hardware Registers    | Component-specific routing       | 4 T-states |
| 0xFF80-0xFFFE | 127B    | High RAM (HRAM)           | Always accessible (even DMA)    | 4 T-states |
| 0xFFFF        | 1B      | Interrupt Enable Register | Always accessible                | 4 T-states |

### Memory Region Detailed Specifications

#### ROM Banks (0x0000-0x7FFF) - 32KB Total

**Fixed ROM Bank 00 (0x0000-0x3FFF) - 16,384 bytes**
- Contains cartridge header (0x0100-0x014F) with title, MBC type, ROM/RAM size
- Includes Nintendo logo data (0x0104-0x0133) for boot validation
- Houses interrupt vectors (0x0000-0x00FF) and initial program code
- Always mapped to physical ROM bank 0, cannot be switched
- Access: Read-only, no timing restrictions, always accessible

**Switchable ROM Bank (0x4000-0x7FFF) - 16,384 bytes**
- Initially mapped to ROM bank 1 at power-on
- Bank selection controlled by Memory Bank Controller (MBC) registers
- Bank count determined by cartridge header byte 0x0148 (32KB to 8MB)
- Access: Read-only, immediate bank switch on MBC register write
- Critical: Bank 0 cannot be mapped here (automatically becomes bank 1)

#### Video RAM - VRAM (0x8000-0x9FFF) - 8,192 bytes

**Organization:**
- 0x8000-0x87FF: Tile data area 0 (256 tiles, 16 bytes each)
- 0x8800-0x8FFF: Tile data area 1 (256 tiles, 16 bytes each) 
- 0x9000-0x97FF: Tile data area 2 (256 tiles, 16 bytes each)
- 0x9800-0x9BFF: Background tile map 0 (32x32 tiles, 1024 bytes)
- 0x9C00-0x9FFF: Background tile map 1 (32x32 tiles, 1024 bytes)

**Access Control:**
- Accessible: PPU Mode 0 (HBlank), Mode 1 (VBlank), Mode 2 (OAM Search)
- Blocked: PPU Mode 3 (Pixel Transfer) - returns 0xFF, writes ignored
- Duration: Mode 3 lasts 172-289 T-states (variable based on sprites)
- Implementation: Check STAT register bits 0-1 before access

#### External RAM (0xA000-0xBFFF) - 8,192 bytes addressable

**Cartridge RAM Specifications:**
- Physical size varies: 0KB (none), 2KB, 8KB, 32KB, 128KB
- Banking: MBC-controlled bank switching for >8KB configurations
- Enable/Disable: Controlled by MBC register writes
- Persistence: Battery-backed for save data in some cartridges
- Access: Read/Write when enabled, returns 0xFF when disabled

#### Work RAM - WRAM (0xC000-0xDFFF) - 8,192 bytes

**Memory Layout:**
- 0xC000-0xCFFF: WRAM Bank 0 (4,096 bytes) - always accessible
- 0xD000-0xDFFF: WRAM Bank 1 (4,096 bytes) - DMG fixed, GBC switchable
- Purpose: General program data, variables, stack space
- Performance: Fastest memory region for CPU operations
- Access: Always accessible, no restrictions, 4 T-states per access

#### Echo RAM (0xE000-0xFDFF) - 7,680 bytes

**Mirror Specification:**
- Source: WRAM addresses 0xC000-0xDDFF (7,680 bytes)
- Formula: Echo[addr] = WRAM[addr - 0x2000]
- Examples: 0xE000→0xC000, 0xE123→0xC123, 0xFDFF→0xDDFF
- Behavior: Perfect bidirectional mirroring
- Official Status: Prohibited by Nintendo, may not work on all hardware
- Implementation: Support mirroring but log usage for debugging

#### Object Attribute Memory - OAM (0xFE00-0xFE9F) - 160 bytes

**Sprite Data Structure (40 sprites × 4 bytes each):**
```
Sprite N (4 bytes at 0xFE00 + N*4):
  Byte 0: Y Position (0-255, display Y = value - 16)
  Byte 1: X Position (0-255, display X = value - 8) 
  Byte 2: Tile Number (0-255)
  Byte 3: Attributes (Priority, Y-flip, X-flip, Palette)
```

**Access Control:**
- Accessible: PPU Mode 0 (HBlank), Mode 1 (VBlank)
- Blocked: PPU Mode 2 (OAM Search, 80 T-states), Mode 3 (Pixel Transfer)
- Blocked during: DMA transfer (returns 0xFF)
- Critical: Used by DMA for high-speed sprite data transfer

#### High RAM - HRAM (0xFF80-0xFFFE) - 127 bytes

**Special Properties:**
- Zero-page addressing: Can use shorter LDH instructions
- DMA Safe: Only memory accessible during DMA transfer
- Interrupt Safe: Ideal for interrupt handler code
- Performance: Same speed as WRAM but with addressing advantages
- Usage Pattern: DMA routines, critical interrupt handlers, temporary variables

#### Unused Memory Region (0xFEA0-0xFEFF) - 96 bytes

**Hardware Behavior (varies by DMG revision):**
- DMG-CPU-01: Returns random/previous bus values
- DMG-CPU-04/06: Returns 0xFF consistently  
- DMG-CPU-08: Returns 0x00
- Implementation: Return 0xFF (most common), ignore writes, log access

## Memory Bank Controllers (MBC) Complete Specifications

### MBC Type Detection and Capabilities

**Detection Method:**
- Location: Cartridge header byte 0x0147 (MBC type)
- Additional info: Byte 0x0148 (ROM size), 0x0149 (RAM size)
- Timing: MBC type determined at cartridge initialization

**Supported MBC Types:**
```
MBC Type  Value  ROM Banks  RAM Banks  Special Features
────────  ─────  ─────────  ─────────  ─────────────────
No MBC    0x00   2 (32KB)   None       Basic ROM only
MBC1      0x01   2-125      0-4        Advanced banking
MBC1+RAM  0x02   2-125      0-4        Battery backup
MBC2      0x05   2-16       Built-in   512×4-bit RAM
MBC3      0x11   2-128      0-4        Real-time clock
MBC3+RTC  0x0F   2-128      0-4        RTC + battery
```

### MBC1 - Advanced Banking Controller

**Hardware Capabilities:**
- ROM Banks: 2-125 usable banks (2MB maximum)
- RAM Banks: 0-4 banks (32KB maximum)
- Banking Modes: ROM Banking Mode (default), RAM Banking Mode
- Timing: Bank switches take effect immediately

**Register Layout:**
```
Address Range  Function               Valid Values    Effect
─────────────  ─────────────────────  ─────────────   ──────────────────
0x0000-0x1FFF  RAM Enable            0x0A=Enable     Enable/disable RAM access
                                     Other=Disable   
                                     
0x2000-0x3FFF  ROM Bank Low 5 bits   0x01-0x1F       ROM bank selection
                                     0x00→0x01       Bank 0 redirect
                                     
0x4000-0x5FFF  RAM Bank / ROM High   0x00-0x03       Banking mode dependent
                                     
0x6000-0x7FFF  Banking Mode          0x00=ROM Mode   ROM/RAM banking mode
                                     0x01=RAM Mode   
```

**Banking Mode Effects:**

*ROM Banking Mode (0x6000-0x7FFF = 0x00):*
- ROM Bank 00: Always mapped to 0x0000-0x3FFF
- ROM Bank XX: Selected by 0x2000-0x3FFF + upper bits from 0x4000-0x5FFF
- RAM Bank: Fixed at bank 0
- Max ROM: 2MB (125 banks), Max RAM: 8KB

*RAM Banking Mode (0x6000-0x7FFF = 0x01):*
- ROM Bank 00: Can be bank 0x00, 0x20, 0x40, or 0x60 (via 0x4000-0x5FFF)
- ROM Bank XX: Limited to banks 0x01-0x1F only
- RAM Bank: Selected by 0x4000-0x5FFF register
- Max ROM: 512KB (31 banks), Max RAM: 32KB

**Critical MBC1 Behaviors:**
- Bank 0 Redirection: Writing 0x00 to 0x2000-0x3FFF selects bank 0x01
- Unavailable Banks: 0x20, 0x40, 0x60 cannot be directly selected
- Bank Calculation: Final bank = (high_bits << 5) | low_bits
- Write-Only Registers: Reads from MBC registers return open bus values

### MBC2 - Integrated RAM Controller  

**Hardware Capabilities:**
- ROM Banks: 2-16 banks (256KB maximum)
- RAM: Integrated 512×4-bit RAM (256 bytes effective storage)
- Address Detection: Uses address bit 8 to distinguish register functions

**Register Layout:**
```
Address Range  Address Bit 8  Function                Valid Values
─────────────  ─────────────  ─────────────────────   ─────────────
0x0000-0x3FFF  A8=0 (even)    RAM Enable             0x0A=Enable
0x0000-0x3FFF  A8=1 (odd)     ROM Bank Select        0x01-0x0F
```

**RAM Characteristics:**
- Physical: 256 addresses × 8 bits, only lower 4 bits used
- Read Pattern: Upper 4 bits always return 0xF (0xF0-0xFF range)
- Write Pattern: Only lower 4 bits stored, upper 4 bits ignored
- Total Storage: 256 × 4 bits = 1,024 bits (128 bytes effective)

### MBC3 - Real-Time Clock Controller

**Hardware Capabilities:**
- ROM Banks: 2-128 banks (2MB maximum) 
- RAM Banks: 0-4 banks (32KB maximum)
- Real-Time Clock: Battery-backed RTC with latching mechanism
- Register Banking: RAM banks 0x00-0x03, RTC registers 0x08-0x0C

**Register Layout:**
```
Address Range  Function               Valid Values    Effect
─────────────  ─────────────────────  ─────────────   ──────────────────
0x0000-0x1FFF  RAM/Timer Enable      0x0A=Enable     Enable RAM and RTC
                                     Other=Disable   
                                     
0x2000-0x3FFF  ROM Bank Number       0x01-0x7F       ROM bank selection
                                     0x00→0x01       Bank 0 redirect
                                     
0x4000-0x5FFF  RAM Bank/RTC Select   0x00-0x03       RAM bank 0-3
                                     0x08-0x0C       RTC registers
                                     
0x6000-0x7FFF  Latch Clock Data      0x00→0x01       Latch RTC for reading
```

**RTC Register Mapping (accessed via 0xA000-0xBFFF when 0x4000-0x5FFF = 0x08-0x0C):**
```
Register  Address  Range    Description                Format
────────  ───────  ───────  ─────────────────────────  ──────────────
0x08      0xA000   0-59     Seconds                   Binary (0x00-0x3B)
0x09      0xA000   0-59     Minutes                   Binary (0x00-0x3B) 
0x0A      0xA000   0-23     Hours                     Binary (0x00-0x17)
0x0B      0xA000   0-255    Day Counter (low 8 bits)  Binary (0x00-0xFF)
0x0C      0xA000   Flags    Day high bit + control    See bit layout below
```

**RTC Control Register (0x0C) Bit Layout:**
```
Bit 7: Day Counter Carry Flag (1 = overflow past 511 days)
Bit 6: Halt Flag (1 = RTC halted, 0 = RTC running)
Bit 5-1: Unused (always read as 0)
Bit 0: Day Counter Upper Bit (bit 8 of day counter)
```

**RTC Latch Mechanism:**
- Purpose: Provides atomic read of all RTC registers
- Trigger: Write 0x00 then 0x01 to 0x6000-0x7FFF
- Effect: Freezes RTC values for consistent reading
- Duration: Values remain latched until next latch operation
- Usage: Essential for reading multi-byte time values

## DMA (Direct Memory Access) Detailed Specifications

### OAM DMA Transfer Mechanism

**DMA Register (0xFF46) - OAM DMA Control**
- Purpose: Initiates high-speed transfer to Object Attribute Memory
- Trigger: Write source address high byte to 0xFF46
- Valid Range: 0x00-0xDF (source pages 0x0000-0xDF00)
- Invalid Range: 0xE0-0xFF (would access restricted memory)

**Transfer Specifications:**
```
Source Address: 0xXX00-0xXX9F (XX = value written to 0xFF46)
Destination:    0xFE00-0xFE9F (OAM, 160 bytes)
Transfer Size:  160 bytes (40 sprites × 4 bytes each)
Transfer Time:  160 machine cycles (640 T-states)
Sprite Order:   Sequential (sprite 0-39)
```

**CPU Memory Access During DMA:**
```
Accessible Memory During DMA:
- 0xFF80-0xFFFE (HRAM) - Returns actual data
- 0xFFFF (IE register) - Returns actual data

Blocked Memory During DMA:
- 0x0000-0xFF7F (all other memory) - Returns 0xFF
- Writes to blocked memory are ignored
- No bus conflicts or corruption occurs
```

**DMA Transfer Timing:**
- Initiation: DMA starts on the cycle after writing to 0xFF46
- Duration: Exactly 160 machine cycles, no variation
- CPU Blocking: CPU cannot access main memory for full duration
- Interrupt Impact: Interrupts can occur but handlers must be in HRAM

**Required DMA Routine (HRAM Implementation):**
```assembly
; Place this routine in HRAM (0xFF80-0xFFFE)
; Call with source page in register A
dma_transfer:
    ldh [0xFF46], a        ; Start DMA (4 T-states)
    ld a, 40               ; Loop counter (8 T-states)
.wait_loop:
    dec a                  ; Decrement counter (4 T-states)
    jr nz, .wait_loop      ; Branch if not zero (12/8 T-states)
    ret                    ; Return when complete (16 T-states)
    
; Total timing: 4 + 8 + (40 × 16) = 652 T-states
; Slightly longer than 640 T-states DMA to ensure completion
```

### DMA Timing Critical Behaviors

**Cycle-by-Cycle DMA Process:**
```
Cycle 0:   Write to 0xFF46 triggers DMA
Cycle 1:   DMA begins, CPU memory access blocked
Cycle 2-161: DMA transfers 1 byte per cycle (160 bytes total)
Cycle 162: DMA complete, CPU memory access restored
```

**DMA and PPU Interaction:**
- DMA can occur during any PPU mode
- PPU continues normal operation during DMA
- DMA does not affect PPU timing or scanline progression
- OAM becomes accessible to PPU immediately after DMA completion

**DMA Implementation Requirements:**
- Must block CPU memory access for exactly 160 cycles
- HRAM and IE register must remain accessible
- Transfer must be atomic (no interruption possible)
- Invalid source addresses (0xE000-0xFFFF) should be handled gracefully
- Multiple DMA triggers should restart the transfer

## Memory Access Timing and PPU Integration

### PPU Mode-Based Memory Access Control

**Complete PPU Mode Timing (456 T-states per scanline):**
```
Mode  Name           Duration     VRAM Access  OAM Access   CPU Impact
────  ─────────────  ───────────  ───────────  ──────────   ──────────────
0     HBlank         87-204 T     Accessible   Accessible   Normal access
1     VBlank         456 T        Accessible   Accessible   Normal access  
2     OAM Search     80 T         Accessible   BLOCKED      Returns 0xFF
3     Pixel Transfer 172-289 T    BLOCKED      BLOCKED      Returns 0xFF
```

**Mode 3 Variable Timing:**
- Base Duration: 172 T-states (no sprites)
- Sprite Penalty: +6 T-states per sprite on scanline (max 10 sprites)
- Window Penalty: +6 T-states if window is activated
- Maximum Duration: 172 + (10 × 6) + 6 = 238 T-states
- Real Hardware: Can extend up to 289 T-states in extreme cases

**Memory Access Implementation:**
```typescript
// Check PPU mode before memory access
function readVRAM(address: number): number {
  if (this.ppu.getMode() === PPUMode.PixelTransfer) {
    return 0xFF; // Blocked access
  }
  return this.vram[address & 0x1FFF];
}

function readOAM(address: number): number {
  const mode = this.ppu.getMode();
  if (mode === PPUMode.OAMSearch || mode === PPUMode.PixelTransfer) {
    return 0xFF; // Blocked access
  }
  return this.oam[address & 0xFF];
}
```

**Critical Timing Requirements:**
- Mode changes take effect immediately (same T-state)
- No delays or transition periods between modes
- Access blocking is instantaneous when mode changes
- STAT register must reflect current mode accurately

### VBlank Period Specifications

**VBlank Timing (10 scanlines, 4,560 T-states total):**
```
Scanline  LY Value  Duration    Memory Access
────────  ────────  ──────────  ──────────────
144       144       456 T       All accessible
145       145       456 T       All accessible
146       146       456 T       All accessible
147       147       456 T       All accessible
148       148       456 T       All accessible
149       149       456 T       All accessible
150       150       456 T       All accessible
151       151       456 T       All accessible
152       152       456 T       All accessible
153       153       456 T       All accessible
```

**VBlank Characteristics:**
- Total Duration: 4,560 T-states (1,140 machine cycles)
- Memory Access: All regions accessible throughout VBlank
- Common Usage: DMA transfers, memory copies, game logic updates
- Interrupt: VBlank interrupt typically triggered at start of line 144

### Boot ROM Mechanism

**Boot ROM Overlay System:**
```
Address Range: 0x0000-0x00FF (256 bytes)
Initial State: Boot ROM overlaid at power-on
Switch Trigger: Any write to register 0xFF50
Post-Switch: Cartridge ROM visible at 0x0000-0x00FF
Reversibility: Cannot re-enable boot ROM (hardware limitation)
```

**Boot ROM Contents:**
- Nintendo Logo: Scrolling animation and logo display
- Logo Validation: Checks cartridge header logo data
- Hardware Setup: Initializes PPU, APU, and memory state
- Jump to Cartridge: Transfer control to 0x0100 in cartridge ROM

**Boot ROM Switch Implementation:**
```typescript
function writeBootROMDisable(value: number): void {
  // Any write value disables boot ROM permanently
  this.bootROMEnabled = false;
  // 0x0000-0x00FF now maps to cartridge ROM bank 0
}

function readLowROM(address: number): number {
  if (address <= 0x00FF && this.bootROMEnabled) {
    return this.bootROM[address];
  }
  return this.cartridge.readROM(address);
}
```

### Memory Access Performance Specifications

**Standard Memory Access Timing:**
- All regions: Exactly 4 T-states per access (1 machine cycle)
- No region should exceed this timing
- No additional wait states or delays
- Timing consistency required across all memory types

**Memory Region Performance:**
```
Region           Access Time    Notes
───────────────  ─────────────  ──────────────────────
WRAM (internal)  4 T-states     Fastest, always accessible
HRAM             4 T-states     Zero-page addressing benefit
ROM (cartridge)  4 T-states     Cartridge-dependent
RAM (cartridge)  4 T-states     MBC-controlled
VRAM             4 T-states     When accessible
OAM              4 T-states     When accessible
I/O Registers    4 T-states     Component routing
```

## I/O Hardware Registers Complete Specification

### Core Memory Control Registers

```
Address  Name   Purpose                     Access  Reset   Bits/Function
───────  ─────  ─────────────────────────   ──────  ─────   ─────────────────────
0xFF46   DMA    OAM DMA Source Address     W       0xFF    Source page (0x00-0xDF)
0xFF50   BANK   Boot ROM Disable           W       0xFF    Any write disables ROM
0xFF41   STAT   PPU Status/Control         R/W     0x85    Mode in bits 0-1
0xFF44   LY     Current Scanline           R       0x00    PPU scanline (0-153)
0xFF40   LCDC   LCD Control Register       R/W     0x91    PPU enable/config
```

### Complete I/O Register Map (0xFF00-0xFF7F)

**System Control Registers:**
```
Address  Name   Description                Access  Reset   Critical Bits
───────  ─────  ────────────────────────   ──────  ─────   ─────────────────────
0xFF00   JOYP   Joypad Input              R/W     0xCF    Button/direction select
0xFF01   SB     Serial Transfer Data      R/W     0x00    8-bit data buffer
0xFF02   SC     Serial Transfer Control   R/W     0x7E    Transfer start/clock
0xFF04   DIV    Divider Register          R/W     0xAB    System timer divider
0xFF05   TIMA   Timer Counter             R/W     0x00    Programmable timer
0xFF06   TMA    Timer Modulo              R/W     0x00    Timer reload value
0xFF07   TAC    Timer Control             R/W     0xF8    Timer enable/frequency
0xFF0F   IF     Interrupt Flag            R/W     0xE1    Pending interrupts
```

**PPU Control and Status:**
```
Address  Name   Description                Access  Reset   Critical Bits
───────  ─────  ────────────────────────   ──────  ─────   ─────────────────────
0xFF40   LCDC   LCD Control               R/W     0x91    PPU enable, window, BG
0xFF41   STAT   LCD Status                R/W     0x85    Mode, LYC=LY, interrupts
0xFF42   SCY    Background Scroll Y       R/W     0x00    BG vertical offset
0xFF43   SCX    Background Scroll X       R/W     0x00    BG horizontal offset
0xFF44   LY     LCD Y Coordinate          R       0x00    Current scanline (0-153)
0xFF45   LYC    LY Compare                R/W     0x00    Scanline compare target
0xFF46   DMA    DMA Transfer              W       0xFF    OAM DMA source page
0xFF47   BGP    Background Palette        R/W     0xFC    4-color BG palette
0xFF48   OBP0   Object Palette 0          R/W     0x00    4-color sprite palette 0
0xFF49   OBP1   Object Palette 1          R/W     0x00    4-color sprite palette 1
0xFF4A   WY     Window Y Position         R/W     0x00    Window top edge
0xFF4B   WX     Window X Position         R/W     0x00    Window left edge + 7
```

**Audio Control Registers:**
```
Address  Name   Description                Access  Reset   Critical Bits
───────  ─────  ────────────────────────   ──────  ─────   ─────────────────────
0xFF10   NR10   Channel 1 Sweep           R/W     0x80    Frequency sweep control
0xFF11   NR11   Channel 1 Pattern/Length  R/W     0xBF    Wave duty, sound length
0xFF12   NR12   Channel 1 Envelope        R/W     0xF3    Volume envelope
0xFF13   NR13   Channel 1 Frequency Low   W       0xFF    Frequency low 8 bits
0xFF14   NR14   Channel 1 Frequency High  R/W     0xBF    Frequency high, trigger
0xFF16   NR21   Channel 2 Pattern/Length  R/W     0x3F    Wave duty, sound length
0xFF17   NR22   Channel 2 Envelope        R/W     0x00    Volume envelope
0xFF18   NR23   Channel 2 Frequency Low   W       0xFF    Frequency low 8 bits
0xFF19   NR24   Channel 2 Frequency High  R/W     0xBF    Frequency high, trigger
0xFF1A   NR30   Channel 3 Enable          R/W     0x7F    Wave channel on/off
0xFF1B   NR31   Channel 3 Length          W       0xFF    Sound length timer
0xFF1C   NR32   Channel 3 Output Level    R/W     0x9F    Volume control
0xFF1D   NR33   Channel 3 Frequency Low   W       0xFF    Frequency low 8 bits
0xFF1E   NR34   Channel 3 Frequency High  R/W     0xBF    Frequency high, trigger
0xFF20   NR41   Channel 4 Length          W       0xFF    Noise length timer
0xFF21   NR42   Channel 4 Envelope        R/W     0x00    Volume envelope
0xFF22   NR43   Channel 4 Polynomial      R/W     0x00    Noise parameters
0xFF23   NR44   Channel 4 Control         R/W     0xBF    Length enable, trigger
0xFF24   NR50   Master Volume             R/W     0x77    Left/right volume
0xFF25   NR51   Sound Panning             R/W     0xF3    Channel output select
0xFF26   NR52   Sound Control             R/W     0xF1    APU enable, channel status
```

**Wave Pattern RAM (Channel 3):**
```
Address Range: 0xFF30-0xFF3F (16 bytes)
Purpose: 32 4-bit wave samples for channel 3
Access: R/W when channel 3 disabled, blocked when enabled
Format: Two 4-bit samples per byte (upper/lower nibbles)
```

### Unused I/O Register Regions

**Unused Addresses:**
```
Single Bytes: 0xFF03, 0xFF08-0xFF0E, 0xFF15, 0xFF1F, 0xFF27-0xFF2F
Range: 0xFF4C-0xFF4F, 0xFF51-0xFF7F
```

**Unused Register Behavior:**
- Reads: Return 0xFF consistently
- Writes: Ignored, no side effects
- Purpose: Reserved for potential hardware expansion
- Implementation: Log access for debugging

### MBC Register Behavior Standards

**Write-Only Characteristics:**
- All MBC registers are write-only
- Reads from MBC address ranges return open bus values
- Open bus typically returns last value on data bus
- Implementation: Return 0xFF for predictable behavior

**Address Decoding Rules:**
- Only upper address bits used for MBC register decoding
- Lower bits (A0-A7) typically ignored
- Examples: 0x2000 and 0x20FF both write to same MBC register
- Bank switching granularity: 4KB (0x1000) address blocks

**Immediate Effect Requirements:**
- Bank switches take effect on same cycle as register write
- No latency or delay in bank switching
- Subsequent memory access uses new bank immediately
- Critical for timing-sensitive code

## Critical Implementation Requirements and Edge Cases

### Memory Access Priority System

**Access Priority Hierarchy (highest to lowest):**
1. **DMA Transfer**: Blocks all CPU memory access except HRAM
2. **PPU Memory Access**: Blocks CPU during Mode 2 (OAM) and Mode 3 (VRAM)
3. **CPU Memory Access**: Standard operation when not blocked

**Priority Implementation:**
```typescript
function readMemory(address: number): number {
  // Highest priority: DMA blocking
  if (this.dma.isActive() && !this.isHRAMOrIE(address)) {
    return 0xFF;
  }
  
  // PPU priority: Mode-based blocking
  if (this.isPPUBlocked(address)) {
    return 0xFF;
  }
  
  // Normal CPU access
  return this.doMemoryRead(address);
}
```

### Error Conditions and Edge Case Handling

**Invalid MBC Register Writes:**
- Behavior: Silently ignored, no effect on current banking state
- Examples: Writing invalid bank numbers, writing to non-existent MBC registers
- Implementation: Validate bank numbers against cartridge ROM/RAM size
- Logging: Optional debug logging for invalid access attempts

**Bank 0 Selection Redirection:**
- Trigger: Writing 0x00 to ROM bank select register (0x2000-0x3FFF)
- Effect: Automatically selects bank 0x01 instead
- Reason: Bank 0 is always fixed at 0x0000-0x3FFF
- Application: Applies to MBC1 and MBC3, not MBC2

**Restricted Memory Access Patterns:**
```
Condition                    Read Result    Write Effect    Implementation
──────────────────────────   ───────────    ────────────    ──────────────
VRAM during PPU Mode 3      0xFF           Ignored         Check PPU mode
OAM during PPU Mode 2/3     0xFF           Ignored         Check PPU mode
Any memory during DMA       0xFF           Ignored         Check DMA status
Disabled external RAM       0xFF           Ignored         Check MBC enable
Unused memory regions       0xFF           Ignored         Address decode
```

**Echo RAM Implementation Requirements:**
- Function: Must perfectly mirror WRAM addresses 0xC000-0xDDFF
- Formula: EchoRAM[0xE000+n] = WRAM[0xC000+n] for n=0 to 0x1DFF
- Official Status: Prohibited by Nintendo, may not work on all hardware
- Implementation: Support mirroring but log usage for debugging
- Testing: Verify bidirectional mirroring (write to echo, read from WRAM)

### Timing-Critical Implementation Constraints

**Bank Switching Immediate Effect:**
```
Cycle N:   Write bank number to MBC register
Cycle N+1: Memory read from switchable region returns new bank data
Cycle N+2: Continue with new bank active
```

**DMA Transfer Atomic Operation:**
- Duration: Exactly 160 machine cycles, no variation
- Interruption: Cannot be interrupted or paused
- Memory Access: CPU blocked from all memory except HRAM and IE register
- Completion: All 160 bytes transferred before CPU access resumes

**PPU Mode Change Immediate Effect:**
```
Mode Change Event:     Memory access restriction applies immediately
No Transition Period:  No delay between mode change and access blocking
Access Check Timing:   Must check mode before every VRAM/OAM access
```

**Interrupt Timing During DMA:**
- Interrupt Occurrence: Interrupts can be triggered during DMA
- Handler Location: Interrupt handlers must be in HRAM or use HALT
- Stack Access: Stack operations blocked if stack not in HRAM
- Implementation: Provide HRAM-based interrupt handler templates

### Hardware Accuracy Standards

**Memory Region Behavior Consistency:**
- All memory access must complete in exactly 4 T-states
- No memory region should add wait states or delays
- Timing must match real DMG hardware exactly
- Regional variations should be documented but not implemented

**MBC Compatibility Requirements:**
- Support MBC1, MBC2, MBC3 with full feature sets
- Handle all documented edge cases and banking modes
- Validate against known test ROMs (Mealybug, Blargg)
- Implement exact bank selection algorithms

**Error Recovery and Debugging:**
- Log unusual memory access patterns for debugging
- Provide clear error messages for invalid operations
- Maintain state consistency even with invalid inputs
- Support save state functionality for debugging

## TDD-Ready Test Case Specifications

### 1. Basic Memory Access Tests

**Test: "Memory read/write basic functionality"**
- **Preconditions**: MMU initialized with test data
- **Test Steps**:
  1. Write 0x42 to WRAM address 0xC000
  2. Read from 0xC000
  3. Verify read returns 0x42
- **Pass Criteria**: Read value equals written value
- **Fail Criteria**: Read value differs from written value
- **Edge Cases**: Test boundary addresses (0xC000, 0xDFFF)

**Test: "Memory access timing accuracy"**
- **Preconditions**: Cycle-accurate timing system active
- **Test Steps**:
  1. Execute memory read instruction
  2. Measure elapsed T-states
  3. Verify exactly 4 T-states elapsed
- **Pass Criteria**: All memory access completes in exactly 4 T-states
- **Fail Criteria**: Any access takes more or less than 4 T-states
- **Test Data**: All memory regions (ROM, RAM, VRAM, OAM, I/O)

### 2. PPU Mode Restriction Tests

**Test: "VRAM access blocked during PPU Mode 3"**
- **Preconditions**: 
  - VRAM contains known data (0x55 at 0x8000)
  - PPU forced into Mode 3 (Pixel Transfer)
- **Test Steps**:
  1. Read from VRAM address 0x8000
  2. Verify result equals 0xFF (not 0x55)
  3. Switch PPU to Mode 0 (HBlank)
  4. Read from 0x8000 again
  5. Verify result equals 0x55 (actual data)
- **Pass Criteria**: Mode 3 returns 0xFF, Mode 0 returns actual data
- **Fail Criteria**: Mode 3 returns actual data or Mode 0 returns 0xFF

**Test: "OAM access blocked during PPU Mode 2 and 3"**
- **Preconditions**:
  - OAM contains known sprite data
  - PPU mode controllable for testing
- **Test Steps**:
  1. Set PPU to Mode 2 (OAM Search), read OAM → expect 0xFF
  2. Set PPU to Mode 3 (Pixel Transfer), read OAM → expect 0xFF  
  3. Set PPU to Mode 0 (HBlank), read OAM → expect actual data
  4. Set PPU to Mode 1 (VBlank), read OAM → expect actual data
- **Pass Criteria**: Blocked modes return 0xFF, accessible modes return data
- **Fail Criteria**: Any incorrect return value for any mode

### 3. DMA Transfer Tests

**Test: "DMA transfer copies data correctly"**
- **Preconditions**:
  - Source data at 0xC000-0xC09F with known pattern
  - OAM cleared to 0x00
  - DMA not active
- **Test Steps**:
  1. Write 0xC0 to DMA register (0xFF46)
  2. Wait exactly 160 machine cycles
  3. Compare OAM content with source data
- **Pass Criteria**: All 160 bytes copied correctly
- **Fail Criteria**: Any byte differs between source and destination

**Test: "CPU memory access blocked during DMA except HRAM"**
- **Preconditions**:
  - Test values in WRAM (0xAA) and HRAM (0x55)
  - DMA transfer active
- **Test Steps**:
  1. Initiate DMA transfer
  2. Immediately read from WRAM → expect 0xFF
  3. Immediately read from HRAM → expect 0x55
  4. Wait for DMA completion
  5. Read from WRAM → expect 0xAA
- **Pass Criteria**: WRAM blocked during DMA, HRAM accessible
- **Fail Criteria**: WRAM accessible during DMA or HRAM blocked

### 4. Bank Switching Tests

**Test: "MBC1 ROM bank switching immediate effect"**
- **Preconditions**:
  - MBC1 cartridge with different data in banks 1 and 2
  - ROM bank 1 currently selected
- **Test Steps**:
  1. Read from 0x4000 → expect bank 1 data
  2. Write 0x02 to 0x2000 (select bank 2)
  3. Read from 0x4000 → expect bank 2 data
- **Pass Criteria**: Bank switch takes effect immediately
- **Fail Criteria**: Bank switch delayed or incorrect data returned

**Test: "MBC1 bank 0 redirection to bank 1"**
- **Preconditions**:
  - MBC1 cartridge with different data in banks 0 and 1
  - ROM bank 1 currently selected
- **Test Steps**:
  1. Write 0x00 to 0x2000 (attempt bank 0 selection)
  2. Read from 0x4000
  3. Verify data matches bank 1, not bank 0
- **Pass Criteria**: Bank 0 write selects bank 1
- **Fail Criteria**: Bank 0 actually selected in switchable region

### 5. Echo RAM Mirroring Tests

**Test: "Echo RAM mirrors WRAM perfectly"**
- **Preconditions**: WRAM cleared to 0x00
- **Test Steps**:
  1. Write 0x42 to WRAM address 0xC123
  2. Read from Echo RAM address 0xE123 → expect 0x42
  3. Write 0x84 to Echo RAM address 0xE456
  4. Read from WRAM address 0xC456 → expect 0x84
- **Pass Criteria**: Perfect bidirectional mirroring
- **Fail Criteria**: Any mismatch between WRAM and Echo RAM

### 6. Hardware Register Tests

**Test: "I/O register immediate write effect"**
- **Preconditions**: System initialized normally
- **Test Steps**:
  1. Read current value from 0xFF47 (BGP)
  2. Write 0xE4 to 0xFF47
  3. Read from 0xFF47 → expect 0xE4
- **Pass Criteria**: Register value changed immediately
- **Fail Criteria**: Register value unchanged or delayed

**Test: "Unused memory region returns 0xFF"**
- **Preconditions**: System initialized normally
- **Test Steps**:
  1. Read from multiple addresses in 0xFEA0-0xFEFF range
  2. Verify all reads return 0xFF
  3. Write test values to same addresses
  4. Read again → verify still 0xFF (writes ignored)
- **Pass Criteria**: All reads return 0xFF, writes ignored
- **Fail Criteria**: Any non-0xFF value or writes have effect

### 7. Boot ROM Tests

**Test: "Boot ROM overlay and disable"**
- **Preconditions**:
  - Boot ROM active with known data
  - Cartridge ROM has different data at 0x0000-0x00FF
- **Test Steps**:
  1. Read from 0x0000 → expect boot ROM data
  2. Write any value to 0xFF50
  3. Read from 0x0000 → expect cartridge ROM data
  4. Write to 0xFF50 again
  5. Read from 0x0000 → expect cartridge ROM data (no re-enable)
- **Pass Criteria**: Boot ROM disabled permanently on first write
- **Fail Criteria**: Boot ROM re-enables or switch fails

## Component Interface Requirements

⚠️ **DEPRECATED**: This interface specification has been superseded by the fixed architecture.

**See**: `/home/pittm/karimono-v2/docs/specs/mmu-architecture-fixed.md` for the corrected MMU architecture that:
- ✅ Extends existing MemoryComponent interface
- ✅ Eliminates encapsulation breaches  
- ✅ Resolves circular dependencies via late binding
- ✅ Aligns with EmulatorContainer mutable state architecture
- ✅ Defines clear component boundaries

### MMU Interface (Architecture Fixed)

```typescript
// See mmu-architecture-fixed.md for complete implementation
interface MMUComponent extends MemoryComponent {
  // Inherits: readByte, writeByte, readWord, writeWord, getSize, reset
  connectPPU(ppu: PPUComponent | undefined): void;
  connectDMA(dma: DMAComponent | undefined): void;  
  loadCartridge(cartridge: CartridgeComponent | undefined): void;
  getSnapshot(): MMUSnapshot; // Replaces direct memory access
  isAddressAccessible(address: number): boolean;
}
```

### Access Control Interface

```typescript
interface AccessController {
  // PPU integration
  setPPUMode(mode: PPUMode): void;
  isVRAMAccessible(): boolean;
  isOAMAccessible(): boolean;
  
  // DMA integration
  setDMAActive(active: boolean): void;
  isDMABlocking(address: number): boolean;
  
  // Access validation
  validateAccess(address: number, isWrite: boolean): AccessResult;
}
```

### Memory Bank Controller Interface

```typescript
abstract class MemoryBankController {
  abstract handleWrite(address: number, value: number): void;
  abstract readROM(address: number): number;
  abstract readRAM(address: number): number;
  abstract writeRAM(address: number, value: number): void;
  abstract getCurrentROMBank(): number;
  abstract getCurrentRAMBank(): number;
  abstract isRAMEnabled(): boolean;
}
```

## Performance and Accuracy Standards

### Timing Requirements
- **Memory Access**: Exactly 4 T-states per operation
- **Bank Switching**: Takes effect same cycle as register write
- **DMA Transfer**: Exactly 160 machine cycles
- **PPU Mode Changes**: Block access immediately

### Accuracy Validation
- **Must Pass**: All Blargg memory timing tests
- **Must Pass**: Mealybug tearoom PPU timing tests
- **Must Support**: MBC1, MBC2, MBC3 with all documented behaviors
- **Must Handle**: All edge cases and error conditions correctly

### Test ROM Validation Requirements
```
Test ROM Category        Required Results
────────────────────     ──────────────────────────
Blargg mem_timing        All tests pass
Blargg instr_timing      All tests pass
Mealybug m3_lcdc_timing  All tests pass
Mealybug m2_win_en_toggle All tests pass
MBC test ROMs            Banking behavior correct
```

## References and Validation Sources

### Primary Technical References
- **Pan Docs**: https://gbdev.io/pandocs/ - Authoritative memory specifications
- **GB Dev Wiki**: https://gbdev.gg8.se/wiki - Community technical documentation
- **Opcodes.json**: ./tests/resources/opcodes.json - SM83 instruction reference

### Hardware Test ROM Resources
- **Blargg Test Suite**: ./tests/resources/blargg/ - Memory and CPU timing validation
- **Mealybug Tearoom**: ./tests/resources/mealybug/ - PPU timing and behavior tests
- **MBC Test ROMs**: Various homebrew ROMs testing bank switching behavior

### Detailed Documentation Links
- **Memory Map**: https://gbdev.io/pandocs/Memory_Map.html
- **MBC1**: https://gbdev.io/pandocs/MBC1.html  
- **MBC2**: https://gbdev.io/pandocs/MBC2.html
- **MBC3**: https://gbdev.io/pandocs/MBC3.html
- **OAM DMA**: https://gbdev.io/pandocs/OAM_DMA_Transfer.html
- **PPU Timing**: https://gbdev.io/pandocs/Pixel_FIFO.html

### Implementation Guidelines
- **Architecture**: Follow project encapsulation and composition principles
- **Testing**: Implement TDD with atomic, fast, debuggable tests
- **Performance**: Optimize for cycle-accurate timing
- **Compatibility**: Validate against real hardware test ROMs

---

**Last Updated**: 2025-08-02  
**Specification Version**: 2.0 (Consolidated)  
**Target Hardware**: Game Boy DMG (Original Game Boy)  
**Validation Status**: TDD-Ready with Complete Test Specifications