# Game Boy DMG Cartridge Loading Specifications

## Overview

The Game Boy DMG cartridge loading system handles ROM file processing, header validation, MBC detection, and memory initialization. This specification defines the exact process for loading ROM files into the emulator's memory system with hardware-accurate behavior.

## Cartridge Header Structure

### Header Location and Format (0x0100-0x014F)
```
0100-0103: Entry Point (4 bytes)
  - Typical: 0x00 0xC3 0x50 0x01 (NOP; JP 0150h)
  - Alternative: Direct code execution starting at 0x0100
  
0104-0133: Nintendo Logo (48 bytes)
  - Fixed compressed bitmap data
  - Must match exact Nintendo logo pattern
  - Boot ROM validates this data

0134-0143: Title (16 bytes, older cartridges 11 bytes)
  - ASCII characters, uppercase preferred
  - Null-padded or space-padded
  - Later cartridges use bytes 0x013F-0x0142 for manufacturer code

0144-0145: Manufacturer Code (2 bytes, newer cartridges only)
  - Two ASCII characters identifying publisher
  - Only present in newer cartridges

0146: CGB Flag (1 byte)
  - 0x80: CGB enhanced (backward compatible)
  - 0xC0: CGB only (not compatible with DMG)
  - Other: DMG only

0147: Cartridge Type (1 byte)
  - Specifies MBC type and additional hardware
  - See MBC type table below

0148: ROM Size (1 byte)
  - 0x00: 32KB (2 banks)
  - 0x01: 64KB (4 banks)
  - 0x02: 128KB (8 banks) 
  - 0x03: 256KB (16 banks)
  - 0x04: 512KB (32 banks)
  - 0x05: 1MB (64 banks)
  - 0x06: 2MB (128 banks)
  - 0x07: 4MB (256 banks)
  - 0x08: 8MB (512 banks)

0149: RAM Size (1 byte)
  - 0x00: No RAM
  - 0x01: 2KB (unused in practice)
  - 0x02: 8KB (1 bank)
  - 0x03: 32KB (4 banks)
  - 0x04: 128KB (16 banks)
  - 0x05: 64KB (8 banks)

014A: Destination Code (1 byte)
  - 0x00: Japan
  - 0x01: Overseas (rest of world)

014B: Old Licensee Code (1 byte)
  - 0x33: Use new licensee code at 0x0144-0x0145
  - Other: Old-style licensee identification

014C: Mask ROM Version (1 byte)
  - Version number of the ROM (usually 0x00)

014D: Header Checksum (1 byte)
  - Checksum of header bytes 0x0134-0x014C
  - Formula: 0x19 + sum of bytes, then NOT result

014E-014F: Global Checksum (2 bytes, big-endian)
  - Checksum of entire ROM except these 2 bytes
  - Often incorrect in practice, should not be enforced
```

### Cartridge Type Codes (0x0147)
```
Common Types:
0x00: ROM Only (no MBC)
0x01: MBC1
0x02: MBC1 + RAM
0x03: MBC1 + RAM + Battery
0x05: MBC2
0x06: MBC2 + Battery
0x08: ROM + RAM
0x09: ROM + RAM + Battery
0x0B: MMM01
0x0C: MMM01 + RAM
0x0D: MMM01 + RAM + Battery
0x0F: MBC3 + Timer + Battery
0x10: MBC3 + Timer + RAM + Battery
0x11: MBC3
0x12: MBC3 + RAM
0x13: MBC3 + RAM + Battery
0x19: MBC5
0x1A: MBC5 + RAM
0x1B: MBC5 + RAM + Battery
0x1C: MBC5 + Rumble
0x1D: MBC5 + Rumble + RAM
0x1E: MBC5 + Rumble + RAM + Battery
0x20: MBC6
0x22: MBC7 + Sensor + Rumble + RAM + Battery
```

## ROM Loading Process

### 1. File Validation and Reading
```
File Loading Steps:
1. Verify file exists and is readable
2. Check file size is valid ROM size (32KB - 8MB)
3. Read entire file into memory buffer
4. Verify file size matches power-of-2 requirement
5. Ensure minimum size of 32KB (2 banks)

File Size Validation:
- Must be power of 2 (32KB, 64KB, 128KB, etc.)
- Maximum practical size: 8MB (though 2MB most common)
- Pad smaller files to minimum 32KB if needed
```

### 2. Header Parsing and Validation  
```
Header Validation Process:
1. Extract header from bytes 0x0100-0x014F
2. Parse title string (handle both old 11-byte and new 16-byte formats)
3. Identify MBC type from cartridge type byte
4. Calculate ROM/RAM sizes from size bytes
5. Validate header checksum (optional, warn if incorrect)
6. Extract additional flags (CGB compatibility, destination, etc.)

Critical Validations:
- Nintendo logo presence (bytes 0x0104-0x0133)
- Valid cartridge type code
- ROM size consistency with file size
- RAM size within reasonable bounds
```

### 3. MBC Detection and Initialization
```
MBC Initialization Process:
1. Decode cartridge type to MBC variant and features
2. Initialize MBC-specific register set
3. Set up ROM/RAM banking defaults
4. Configure additional features (RTC, rumble, etc.)
5. Establish memory access patterns

Default MBC States:
- ROM Bank 0: Always at 0x0000-0x3FFF
- ROM Bank 1: Initially at 0x4000-0x7FFF (never bank 0)
- RAM: Disabled by default (requires 0x0A write to enable)
- Banking Mode: ROM mode (for MBC1)
```

### 4. Memory System Integration
```
Memory Integration Steps:
1. Install ROM data into memory system
2. Configure MBC banking registers
3. Set up RAM allocation (if present)
4. Initialize memory access routing
5. Configure PPU/CPU memory restrictions
6. Set up save file handling (if battery-backed)

Memory Layout After Loading:
- 0x0000-0x3FFF: ROM Bank 0 (fixed)
- 0x4000-0x7FFF: ROM Bank 1+ (switchable)
- 0xA000-0xBFFF: External RAM (if present)
- MBC registers: Mapped to ROM write areas
```

## MBC-Specific Loading Requirements

### MBC1 Cartridge Loading
```
ROM Banks: 2-125 (32KB-2MB)
RAM Banks: 0, 1, or 4 banks (0KB, 8KB, or 32KB)

Initialization:
- ROM bank register: 0x01 (bank 1 active at 0x4000)
- RAM bank register: 0x00
- Banking mode: 0x00 (ROM banking mode)
- RAM enable: 0x00 (disabled)

Special Handling:
- Bank 0 cannot be selected at 0x4000 (redirects to bank 1)
- Large ROMs (>1MB) require special bank bit handling
- RAM banking affects both ROM and RAM in different modes
```

### MBC2 Cartridge Loading
```
ROM Banks: 2-16 (32KB-256KB)
Built-in RAM: 256 × 4-bit values (512 bytes total)

Initialization:
- ROM bank register: 0x01
- RAM enable: 0x00 (disabled)
- Built-in RAM: Cleared to 0x00 (or random values)

Special Handling:
- Uses address line A8 to distinguish register functions
- Built-in RAM only uses lower 4 bits of each byte
- No separate RAM banking (single fixed bank)
```

### MBC3 Cartridge Loading
```
ROM Banks: 2-128 (32KB-2MB)  
RAM Banks: 0-4 (0KB-32KB)
RTC Support: Real-time clock registers

Initialization:
- ROM bank register: 0x01
- RAM bank register: 0x00
- RAM/RTC enable: 0x00 (disabled)
- RTC registers: Initialize to 0 or load from save file

Special Handling:
- RTC registers accessible through RAM bank selection
- Clock latching mechanism for atomic reads
- Battery backup for both RAM and RTC data
```

### MBC5 Cartridge Loading
```
ROM Banks: 2-512 (32KB-8MB)
RAM Banks: 0-16 (0KB-128KB)

Initialization:
- ROM bank low register: 0x01
- ROM bank high register: 0x00
- RAM bank register: 0x00
- RAM enable: 0x00 (disabled)

Special Handling:
- 9-bit ROM bank number (split across two registers)
- 4-bit RAM bank number (16 banks maximum)
- Optional rumble support (affects register mapping)
```

## Save Data Handling

### Battery-Backed RAM
```
Save File Format:
- Raw binary dump of all RAM banks
- File size equals total RAM size (8KB, 32KB, etc.)
- No header or metadata, just raw RAM content

Loading Process:
1. Check if cartridge has battery backup
2. Generate save file name from ROM file name
3. Load save file if it exists
4. Initialize RAM with save data or zeros
5. Configure save-on-exit behavior

Save File Naming:
- ROM: "game.gb" → Save: "game.sav"
- ROM: "folder/game.gb" → Save: "folder/game.sav"
```

### RTC Save Data (MBC3)
```
RTC Save Format:
- Standard RAM data followed by RTC data
- RTC data: 48 bytes (4 bytes per RTC register × 12 values)
- Includes both current and latched RTC values
- Timestamp for calculating elapsed time

RTC Loading Process:
1. Load standard RAM data
2. Load RTC register values  
3. Load last-saved timestamp
4. Calculate elapsed time since save
5. Update RTC registers accordingly
```

## Error Handling and Validation

### ROM File Errors
```
Invalid File Size:
- Error: File size not power of 2
- Action: Reject loading, display error message
- Recovery: None (user must provide valid ROM)

Corrupted Header:
- Error: Invalid Nintendo logo
- Action: Warning message, continue loading
- Recovery: Emulation may still work

Missing ROM File:
- Error: File not found or not readable
- Action: Display error dialog
- Recovery: Prompt user to select different file
```

### MBC Configuration Errors
```
Unknown MBC Type:
- Error: Cartridge type code not recognized
- Action: Default to ROM-only behavior with warning
- Recovery: Basic functionality may work

RAM Size Mismatch:
- Error: Save file size doesn't match header RAM size
- Action: Truncate or pad save data with warning
- Recovery: May lose save data or have corrupted saves

Invalid Bank Numbers:
- Error: Game attempts to select non-existent bank
- Action: Wrap or truncate bank number
- Recovery: Game may glitch but continue running
```

## Test Case Specifications

### 1. Basic ROM Loading
**Test**: "Valid ROM file loads with correct header parsing"
- Input: Valid 32KB ROM file with proper header
- Execute: Load ROM through cartridge loading system
- Expected result: ROM data accessible at 0x0000-0x7FFF, header parsed correctly
- Validation: Title string extracted, MBC type identified, memory accessible

### 2. MBC1 Bank Switching
**Test**: "MBC1 ROM loads with functional bank switching"
- Input: 128KB MBC1 ROM (8 banks)
- Execute: Load ROM, switch to bank 2, read from 0x4000
- Expected result: Bank 2 data visible at 0x4000-0x7FFF
- Validation: Different data than bank 1, correct bank selection

### 3. Header Checksum Validation
**Test**: "Header checksum validation works correctly"
- Input: ROM with deliberately incorrect header checksum
- Execute: Load ROM with checksum validation enabled
- Expected result: Warning message about checksum, ROM still loads
- Validation: Error reported but loading continues

### 4. RAM Initialization  
**Test**: "Cartridge RAM initializes correctly with save data"
- Input: MBC1 ROM with 32KB RAM, existing save file
- Execute: Load ROM and save file
- Expected result: RAM contains save file data, accessible at 0xA000-0xBFFF
- Validation: Save data readable after enabling RAM

### 5. MBC3 RTC Loading
**Test**: "MBC3 RTC data loads and updates correctly"
- Input: MBC3 ROM with RTC, save file with timestamp
- Execute: Load ROM, wait 10 seconds, read RTC
- Expected result: RTC seconds register increments correctly
- Validation: Time progression matches elapsed real time

### 6. File Size Validation
**Test**: "Invalid ROM file sizes rejected appropriately"
- Input: ROM file with non-power-of-2 size (e.g., 33KB)
- Execute: Attempt to load invalid ROM
- Expected result: Error message, loading fails
- Validation: No memory corruption, clear error message

### 7. Large ROM Support
**Test**: "Large ROM files (2MB+) load correctly"
- Input: 2MB MBC5 ROM file
- Execute: Load ROM, test bank switching across all banks
- Expected result: All 128 banks accessible through bank switching
- Validation: Each bank contains different data, no aliasing

### 8. Save File Generation
**Test**: "Save files created correctly for battery-backed games"
- Input: MBC1 ROM with battery-backed RAM
- Execute: Load ROM, write data to RAM, trigger save
- Expected result: Save file created with correct RAM contents
- Validation: Save file matches RAM size, contains written data

### 9. Missing Save File Handling
**Test**: "Games with battery backup handle missing save files"
- Input: Battery-backed ROM without existing save file
- Execute: Load ROM, attempt to read RAM
- Expected result: RAM initialized to zero (or random), no errors
- Validation: Game functions normally with blank save data

### 10. MBC Type Detection
**Test**: "All common MBC types detected and initialized correctly"
- Input: Set of ROMs with different MBC types (1, 2, 3, 5)
- Execute: Load each ROM and verify MBC behavior
- Expected result: Each MBC exhibits correct banking behavior
- Validation: Banking registers respond according to MBC specifications

## Implementation Requirements

### Cartridge Loader Interface
```
CartridgeLoader Interface:
- loadROM(filename): Load ROM file and return cartridge object
- validateHeader(rom_data): Parse and validate cartridge header
- detectMBC(cartridge_type): Identify MBC type and features
- initializeMBC(mbc_type, rom_size, ram_size): Set up MBC state
- loadSaveData(filename): Load battery-backed save data
- saveSaveData(filename): Save battery-backed RAM data

Cartridge Object Interface:
- getTitle(): Return cartridge title string
- getMBCType(): Return MBC type identifier
- getROMSize(): Return ROM size in bytes
- getRAMSize(): Return RAM size in bytes
- hasBattery(): Return true if battery-backed
- hasRTC(): Return true if RTC present
```

### Memory System Integration
```
Integration Requirements:
- Install ROM data into memory system's ROM banks
- Configure MBC banking registers and handlers
- Set up RAM allocation and access control
- Initialize save/load functionality for battery backup
- Provide clean error handling for invalid cartridges

Performance Requirements:
- ROM loading must complete in reasonable time (<1 second for 8MB ROM)
- Bank switching must be immediate (same cycle)
- Save file I/O should not block emulation
- Memory access patterns must match real hardware
```

### Error Handling Requirements
```
Error Handling Standards:
- Clear error messages for common problems
- Graceful degradation for minor issues
- No crashes or memory corruption for invalid files
- Logging of all loading steps for debugging
- User-friendly recovery suggestions

Defensive Programming Patterns:
- Validate all file operations before attempting access
- Check file existence and permissions before reading
- Verify buffer sizes before memory operations
- Sanitize all header values before using as array indices
- Use bounds checking for all memory access operations
- Implement comprehensive input validation at service boundaries
- Log all significant operations with context for debugging
- Provide detailed error context for troubleshooting
```

## References

### Primary Sources
- **Pan Docs**: https://gbdev.io/pandocs/The_Cartridge_Header.html
- **GB Dev Wiki**: https://gbdev.gg8.se/wiki/articles/The_Cartridge_Header
- **MBC Documentation**: https://gbdev.gg8.se/wiki/articles/Memory_Bank_Controllers

### Validation Sources
- **Real Cartridges**: Test with actual Game Boy cartridges for accuracy
- **ROM Databases**: No-Intro and GoodGBX databases for header validation
- **Homebrew ROMs**: Modern homebrew for edge case testing

### Critical Implementation Notes
- Header checksum validation should warn but not block loading
- Bank 0 redirection in MBC1 is critical for compatibility
- Save file timing should not interfere with real-time emulation
- All MBC behaviors must match hardware exactly for game compatibility

This specification ensures accurate cartridge loading that matches real Game Boy hardware behavior while providing robust error handling for invalid or corrupted ROM files.