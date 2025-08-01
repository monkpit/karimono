# Game Boy DMG Technical Specifications

## Overview

This document consolidates technical specifications from Pan Docs and GB Dev Wiki to provide precise hardware requirements for accurate Game Boy DMG emulation.

## CPU Specifications (SM83)

### Register Organization

```
16-bit Registers (can be accessed as 8-bit pairs):
AF - Accumulator & Flags (A=accumulator, F=flags)
BC - General purpose register pair
DE - General purpose register pair
HL - General purpose register pair

Special 16-bit Registers:
SP - Stack Pointer (points to top of stack)
PC - Program Counter (points to next instruction)
```

### Flags Register (F)

```
Bit 7: Z (Zero Flag)
  - Set when result of operation is zero
  - Used for conditional jumps and operations

Bit 6: N (Subtraction Flag)
  - Set when last operation was subtraction
  - Used by DAA instruction for BCD operations

Bit 5: H (Half Carry Flag)
  - Set when carry occurs from bit 3 to bit 4
  - Used for BCD operations and some arithmetic

Bit 4: C (Carry Flag)
  - Set when carry occurs from bit 7
  - Set when borrow occurs in subtraction
  - Used for rotate/shift operations

Bits 3-0: Unused (always 0)
```

### CPU Timing

- **Clock Speed**: 4.194304 MHz (2^22 Hz)
- **Instruction Timing**: 1-6 machine cycles per instruction
- **Machine Cycle**: 4 clock cycles (T-states)
- **Frame Timing**: 70,224 cycles per frame (~59.7 FPS)

## Memory Map

### Address Space Layout

```
0000-3FFF: 16KB ROM Bank 00 (fixed, non-switchable)
4000-7FFF: 16KB ROM Bank 01-NN (switchable via MBC)
8000-9FFF: 8KB Video RAM (VRAM)
A000-BFFF: 8KB External RAM (cartridge RAM, switchable)
C000-CFFF: 4KB Work RAM Bank 0 (WRAM)
D000-DFFF: 4KB Work RAM Bank 1 (WRAM)
E000-FDFF: Echo RAM (mirror of C000-DDFF, prohibited)
FE00-FE9F: Object Attribute Memory (OAM, sprite data)
FEA0-FEFF: Not Usable (behavior varies by hardware)
FF00-FF7F: I/O Registers
FF80-FFFE: High RAM (HRAM, 127 bytes)
FFFF:       Interrupt Enable Register
```

### Memory Access Restrictions

- **Echo RAM (E000-FDFF)**: Should not be used, mirrors C000-DDFF
- **FEA0-FEFF**: Behavior varies between DMG revisions
- **OAM Access**: Restricted during PPU Mode 2 and 3
- **VRAM Access**: Restricted during PPU Mode 3

### Memory Bank Controllers (MBC)

#### MBC1 (Most Common)

```
Banking Registers:
0000-1FFF: RAM Enable (0x0A = enable, other = disable)
2000-3FFF: ROM Bank Number (5 bits, 0 treated as 1)
4000-5FFF: RAM Bank Number / Upper ROM Bank Bits
6000-7FFF: Banking Mode Select (0 = ROM, 1 = RAM)

ROM Banks: 1-125 (2MB maximum)
RAM Banks: 0-3 (32KB maximum)
```

#### MBC2

```
Banking Registers:
0000-3FFF: ROM Bank Number (bit 8 of address determines function)
  - A8=0: RAM Enable (0x0A = enable)
  - A8=1: ROM Bank (4 bits, 0 treated as 1)

ROM Banks: 1-15 (256KB maximum)
Built-in RAM: 256 x 4-bit (512 bytes effective)
```

#### MBC3 (With RTC)

```
Banking Registers:
0000-1FFF: RAM and Timer Enable
2000-3FFF: ROM Bank Number (7 bits, 0 treated as 1)
4000-5FFF: RAM Bank Number or RTC Register Select
6000-7FFF: Latch Clock Data

ROM Banks: 1-127 (2MB maximum)
RAM Banks: 0-3 (32KB maximum)
RTC Registers: Seconds, Minutes, Hours, Days
```

## PPU Specifications

### LCD Control Register (LCDC - FF40)

```
Bit 7: LCD Display Enable (0=Off, 1=On)
Bit 6: Window Tile Map Display Select (0=9800-9BFF, 1=9C00-9FFF)
Bit 5: Window Display Enable (0=Off, 1=On)
Bit 4: BG & Window Tile Data Select (0=8800-97FF, 1=8000-8FFF)
Bit 3: BG Tile Map Display Select (0=9800-9BFF, 1=9C00-9FFF)
Bit 2: OBJ (Sprite) Size (0=8x8, 1=8x16)
Bit 1: OBJ (Sprite) Display Enable (0=Off, 1=On)
Bit 0: BG Display (0=Off, 1=On)
```

### PPU Modes and Timing

```
Mode 0 (HBLANK): 204-207 cycles (depends on sprite count)
Mode 1 (VBLANK): 4560 cycles (10 scanlines * 456 cycles)
Mode 2 (OAM Search): 80 cycles
Mode 3 (Pixel Transfer): 172-289 cycles (depends on sprites)

Total Scanline: 456 cycles
Total Frame: 70,224 cycles (154 scanlines * 456 cycles)
Visible Scanlines: 0-143 (144 lines)
VBlank Scanlines: 144-153 (10 lines)
```

### VRAM Organization

```
Tile Data Area 1: 8000-8FFF (tiles 0-255, signed addressing)
Tile Data Area 2: 8800-97FF (tiles -128 to 127, unsigned addressing)

Background Map 1: 9800-9BFF (32x32 tile map)
Background Map 2: 9C00-9FFF (32x32 tile map)

Tile Format: 8x8 pixels, 2 bits per pixel, 16 bytes per tile
```

### OAM Structure (4 bytes per sprite, 40 sprites total)

```
Byte 0: Y Position (sprite Y + 16)
Byte 1: X Position (sprite X + 8)
Byte 2: Tile Number
Byte 3: Attributes
  Bit 7: OBJ-to-BG Priority (0=OBJ Above BG, 1=OBJ Behind BG)
  Bit 6: Y Flip (0=Normal, 1=Vertically Mirrored)
  Bit 5: X Flip (0=Normal, 1=Horizontally Mirrored)
  Bit 4: Palette Number (0=OBP0, 1=OBP1)
```

## Audio Processing Unit (APU)

### Sound Channels

```
Channel 1 (FF10-FF14): Tone & Sweep
Channel 2 (FF16-FF19): Tone
Channel 3 (FF1A-FF1E): Wave
Channel 4 (FF20-FF23): Noise
```

### Master Volume Control (FF24)

```
Bit 7: Output Vin to SO2 terminal
Bit 6-4: SO2 output level (volume)
Bit 3: Output Vin to SO1 terminal
Bit 2-0: SO1 output level (volume)
```

### Sound Timing

- **Sample Rate**: 4.194304 MHz / 95 ≈ 44.1 kHz
- **Frame Sequencer**: 512 Hz (updates length counters, envelopes, sweep)
- **Channel Updates**: Varies by channel type

## Interrupt System

### Interrupt Enable Register (FFFF)

```
Bit 4: Joypad Interrupt Enable
Bit 3: Serial Interrupt Enable
Bit 2: Timer Interrupt Enable
Bit 1: LCD STAT Interrupt Enable
Bit 0: VBlank Interrupt Enable
```

### Interrupt Flag Register (FF0F)

```
Same bit layout as Interrupt Enable Register
Set by hardware, cleared by software or interrupt handling
```

### Interrupt Vectors

```
0040: VBlank Interrupt
0048: LCD STAT Interrupt
0050: Timer Interrupt
0058: Serial Interrupt
0060: Joypad Interrupt
```

### Interrupt Handling Process

1. Check if interrupts enabled (IME flag)
2. Check for pending interrupts (IE & IF)
3. Push PC to stack
4. Clear IME flag
5. Jump to interrupt vector
6. Clear corresponding IF bit

## Timer System

### Timer Registers

```
FF04: DIV - Divider Register (increments at 16384 Hz)
FF05: TIMA - Timer Counter
FF06: TMA - Timer Modulo
FF07: TAC - Timer Control
```

### Timer Control (TAC)

```
Bit 2: Timer Enable (0=Stop, 1=Start)
Bits 1-0: Clock Select
  00: 4096 Hz (CPU Clock / 1024)
  01: 262144 Hz (CPU Clock / 16)
  10: 65536 Hz (CPU Clock / 64)
  11: 16384 Hz (CPU Clock / 256)
```

## Input System

### Joypad Register (FF00)

```
Bit 7-6: Not used
Bit 5: P15 Select Button Keys (0=Select)
Bit 4: P14 Select Direction Keys (0=Select)
Bit 3: P13 Input Down or Start button (0=Pressed)
Bit 2: P12 Input Up or Select button (0=Pressed)
Bit 1: P11 Input Left or Button B (0=Pressed)
Bit 0: P10 Input Right or Button A (0=Pressed)
```

### Button Matrix

```
P14 Selected (Direction):
  Bit 3: Down
  Bit 2: Up
  Bit 1: Left
  Bit 0: Right

P15 Selected (Buttons):
  Bit 3: Start
  Bit 2: Select
  Bit 1: B
  Bit 0: A
```

## Cartridge Header

### Header Layout (0100-014F)

```
0100-0103: Entry Point (NOP; JP 0150)
0104-0133: Nintendo Logo (compressed bitmap)
0134-0143: Title (11 characters, uppercase ASCII)
0144-0145: Manufacturer Code (new cartridges only)
0146:      CGB Flag (80=CGB, C0=CGB only, other=DMG)
0147:      Cartridge Type (MBC type and features)
0148:      ROM Size (32KB << value)
0149:      RAM Size (see RAM size table)
014A:      Destination Code (00=Japan, 01=Overseas)
014B:      Old Licensee Code (33=use new licensee)
014C:      Mask ROM Version Number
014D:      Header Checksum
014E-014F: Global Checksum
```

### Cartridge Types (Common)

```
00: ROM Only
01: MBC1
02: MBC1 + RAM
03: MBC1 + RAM + Battery
05: MBC2
06: MBC2 + Battery
0F: MBC3 + Timer + Battery
10: MBC3 + Timer + RAM + Battery
11: MBC3
12: MBC3 + RAM
13: MBC3 + RAM + Battery
19: MBC5
1A: MBC5 + RAM
1B: MBC5 + RAM + Battery
1C: MBC5 + Rumble
1D: MBC5 + Rumble + RAM
1E: MBC5 + Rumble + RAM + Battery
```

## Emulation Requirements

### Accuracy Considerations

1. **Cycle Accuracy**: All operations must consume correct number of cycles
2. **Memory Access Timing**: PPU memory access restrictions must be enforced
3. **Interrupt Timing**: Precise interrupt handling and timing
4. **PPU Mode Timing**: Accurate PPU mode transitions and durations
5. **Audio Timing**: Proper audio channel timing and mixing

### Performance Targets

- **Native Speed**: Maintain 4.194304 MHz CPU speed
- **Frame Rate**: Stable 59.7 FPS output
- **Audio**: Consistent 44.1 kHz audio output without dropouts
- **Input Latency**: Minimal delay between input and response

### Testing Requirements

1. **Blargg Test ROMs**: CPU instruction and timing validation
2. **Mealybug Tests**: PPU accuracy and timing validation
3. **DMG Acid Test**: Comprehensive system behavior validation
4. **Real Hardware Comparison**: Behavior matching with actual DMG
