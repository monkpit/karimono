# Road to MVP - Karimono-v2 Game Boy DMG Emulator

This document outlines the core tasks required to achieve a Minimal Viable Product (MVP) for the Karimono-v2 Game Boy DMG emulator. Tasks are numbered for easy reference in commits (e.g., "Implement MVP-001: Basic SM83 CPU structure").

## MVP Definition

A minimal viable Game Boy emulator capable of:
- Running simple homebrew ROMs
- Basic graphics rendering (background, sprites)
- Input handling (D-pad, A/B buttons)
- Audio output (at least 2 channels)
- Accurate CPU instruction execution
- Memory banking (MBC1 minimum)

## Phase 1: Core Infrastructure (MVP-001 to MVP-020)

### CPU Foundation
- **MVP-001**: Implement basic SM83 CPU structure with registers
- **MVP-002**: Implement 8-bit load instructions (LD r8, n8)
- **MVP-003**: Implement 16-bit load instructions (LD r16, n16)
- **MVP-004**: Implement 8-bit arithmetic instructions (ADD, SUB, INC, DEC)
- **MVP-005**: Implement 16-bit arithmetic instructions (ADD HL, r16)
- **MVP-006**: Implement bitwise operations (AND, OR, XOR, CPL)
- **MVP-007**: Implement bit operations (SET, RES, BIT)
- **MVP-008**: Implement rotate/shift instructions (RLC, RRC, RL, RR, SLA, SRA, SRL)
- **MVP-009**: Implement jump instructions (JP, JR with conditions)
- **MVP-010**: Implement call/return instructions (CALL, RET, RST)

### Memory Management
- **MVP-011**: Implement basic memory map structure
- **MVP-012**: Implement ROM bank switching (MBC1)
- **MVP-013**: Implement RAM bank switching (MBC1)
- **MVP-014**: Implement memory-mapped I/O registers
- **MVP-015**: Implement DMA transfer functionality

### Interrupt System
- **MVP-016**: Implement interrupt handling (IME, IE, IF registers)
- **MVP-017**: Implement V-Blank interrupt
- **MVP-018**: Implement LCD STAT interrupt
- **MVP-019**: Implement Timer interrupt
- **MVP-020**: Implement Joypad interrupt

## Phase 2: Graphics System (MVP-021 to MVP-040)

### PPU Core
- **MVP-021**: Implement PPU register structure (LCDC, STAT, SCY, SCX, etc.)
- **MVP-022**: Implement LCD timing and modes (Mode 0-3)
- **MVP-023**: Implement VRAM access timing restrictions
- **MVP-024**: Implement background tile fetching
- **MVP-025**: Implement background rendering pipeline

### Tile System
- **MVP-026**: Implement tile data decoding (8x8 2bpp)
- **MVP-027**: Implement tile map addressing
- **MVP-028**: Implement background scrolling (SCX, SCY)
- **MVP-029**: Implement window layer rendering
- **MVP-030**: Implement window positioning (WX, WY)

### Sprite System
- **MVP-031**: Implement OAM structure and access
- **MVP-032**: Implement sprite attribute parsing
- **MVP-033**: Implement 8x8 sprite rendering
- **MVP-034**: Implement 8x16 sprite rendering
- **MVP-035**: Implement sprite priority handling
- **MVP-036**: Implement sprite-background priority
- **MVP-037**: Implement 10-sprite-per-line limit
- **MVP-038**: Implement sprite X-coordinate timing

### Display Integration
- **MVP-039**: Implement pixel pipeline composition (BG + Window + Sprites)
- **MVP-040**: Implement LCD disable/enable functionality

## Phase 3: Audio System (MVP-041 to MVP-055)

### Audio Infrastructure
- **MVP-041**: Implement audio register structure (NR10-NR52)
- **MVP-042**: Implement master audio control
- **MVP-043**: Implement channel enable/disable logic
- **MVP-044**: Implement audio timing and sample rate

### Sound Channels
- **MVP-045**: Implement Channel 1 (Square wave with sweep)
- **MVP-046**: Implement Channel 2 (Square wave)
- **MVP-047**: Implement Channel 3 (Wave pattern)
- **MVP-048**: Implement Channel 4 (Noise)
- **MVP-049**: Implement envelope functions (volume fade)
- **MVP-050**: Implement frequency sweep (Channel 1)

### Audio Output
- **MVP-051**: Implement left/right panning
- **MVP-052**: Implement master volume control
- **MVP-053**: Implement audio mixing
- **MVP-054**: Implement Web Audio API integration
- **MVP-055**: Implement audio buffer management

## Phase 4: Input System (MVP-056 to MP-065)

### Joypad Implementation
- **MVP-056**: Implement joypad register (P1/FF00)
- **MVP-057**: Implement direction keys (Up, Down, Left, Right)
- **MVP-058**: Implement action buttons (A, B, Select, Start)
- **MVP-059**: Implement joypad interrupt generation
- **MVP-060**: Implement keyboard mapping

### Input Integration
- **MVP-061**: Implement input state management
- **MVP-062**: Implement gamepad API support
- **MVP-063**: Implement touch controls (mobile)
- **MVP-064**: Implement input configuration
- **MVP-065**: Implement input polling timing

## Phase 5: Timer System (MVP-066 to MVP-075)

### Timer Implementation
- **MVP-066**: Implement timer registers (DIV, TIMA, TMA, TAC)
- **MVP-067**: Implement DIV register (16384 Hz increment)
- **MVP-068**: Implement TIMA counter with configurable frequency
- **MVP-069**: Implement timer overflow and TMA reload
- **MP-070**: Implement timer interrupt generation

### Timing Accuracy
- **MVP-071**: Implement accurate timer timing
- **MVP-072**: Implement timer enable/disable functionality
- **MVP-073**: Implement timer frequency selection
- **MVP-074**: Implement timer-CPU synchronization
- **MVP-075**: Implement timer edge cases and quirks

## Phase 6: Integration & Testing (MVP-076 to MVP-095)

### System Integration
- **MVP-076**: Implement main emulator loop
- **MVP-077**: Implement component synchronization
- **MVP-078**: Implement save state functionality
- **MVP-079**: Implement ROM loading
- **MVP-080**: Implement battery-backed RAM saving

### Performance & Optimization
- **MP-081**: Implement frame rate limiting (59.7 FPS)
- **MVP-082**: Implement audio-video synchronization
- **MVP-083**: Implement performance profiling
- **MVP-084**: Optimize hot code paths
- **MVP-085**: Implement efficient rendering pipeline

### Testing & Validation
- **MVP-086**: Integrate Blargg test ROM suite
- **MVP-087**: Integrate Mealybug Tearoom tests
- **MVP-088**: Implement automated test running
- **MVP-089**: Implement screenshot comparison testing
- **MVP-090**: Validate against known good outputs

### User Interface
- **MVP-091**: Implement ROM file loading UI
- **MVP-092**: Implement basic emulator controls (pause, reset)
- **MVP-093**: Implement settings panel
- **MVP-094**: Implement responsive design
- **MVP-095**: Implement error handling and user feedback

## Phase 7: MVP Completion (MVP-096 to MVP-100)

### Final Integration
- **MVP-096**: Comprehensive integration testing
- **MVP-097**: Performance benchmarking and optimization
- **MVP-098**: Documentation completion
- **MVP-099**: Cross-browser compatibility testing
- **MVP-100**: MVP release preparation and deployment

## Task Dependencies

### Critical Path
1. CPU Foundation (MVP-001 to MVP-010) → Memory Management (MVP-011 to MVP-015)
2. Memory Management → Interrupt System (MVP-016 to MVP-020)
3. PPU Core (MVP-021 to MVP-025) → Tile System (MVP-026 to MVP-030)
4. Tile System → Sprite System (MVP-031 to MVP-038)
5. All graphics components → Display Integration (MVP-039 to MVP-040)
6. Audio Infrastructure (MVP-041 to MVP-044) → Sound Channels (MVP-045 to MVP-050)
7. Sound Channels → Audio Output (MVP-051 to MVP-055)
8. All core systems → Integration & Testing (MVP-076 to MVP-095)

### Parallel Development Opportunities
- Audio System (MVP-041 to MVP-055) can be developed in parallel with Graphics System
- Input System (MVP-056 to MVP-065) can be developed in parallel with Audio/Graphics
- Timer System (MVP-066 to MVP-075) can be developed in parallel with other systems
- User Interface (MVP-091 to MVP-095) can be developed alongside core systems

## Commit Reference Format

When committing changes related to these tasks, use the following format:
```
[MVP-XXX] Brief description of the change

More detailed description if needed.

Refs: MVP-XXX
```

Example:
```
[MVP-001] Implement basic SM83 CPU structure with registers

- Add CPU class with 8-bit and 16-bit registers
- Implement register getters and setters
- Add basic CPU state management

Refs: MVP-001
```

## Success Criteria

The MVP is considered complete when:
- All MVP tasks (MVP-001 to MP-100) are implemented
- Basic homebrew ROMs run correctly
- Blargg CPU instruction tests pass
- Mealybug Tearoom PPU tests pass
- Audio output is functional
- Input handling works across devices
- Performance target of 60fps is achieved
- Cross-browser compatibility is verified

## Post-MVP Enhancements

Future enhancements beyond MVP scope:
- Additional MBC types (MBC2, MBC3, MBC5)
- Game Boy Color compatibility
- Serial link communication
- Advanced audio features
- Save state management
- Debugging tools
- Performance profiling
- Mobile optimization