# PPU Integration Requirements - Engineering Summary

**Target Audience**: Backend TypeScript Engineer, Architecture Reviewer, Tech Lead  
**Purpose**: Key integration points and technical requirements for PPU implementation

## Critical Integration Points

### 1. Memory Interface Requirements

**VRAM Access (0x8000-0x9FFF)**
```typescript
// MMU must route to PPU for mode-based access control
interface VRAMAccess {
  // Returns 0xFF during Mode 3, actual data during Modes 0,1,2
  read(address: number): number;
  
  // Ignored during Mode 3, written during Modes 0,1,2
  write(address: number, value: number): void;
}
```

**OAM Access (0xFE00-0xFE9F)**
```typescript
// MMU must route to PPU for mode and DMA-based access control
interface OAMAccess {
  // Returns 0xFF during Modes 2,3 or DMA active
  read(address: number): number;
  
  // Ignored during Modes 2,3 or DMA active
  write(address: number, value: number): void;
}
```

### 2. CPU Coordination Requirements

**Memory Access Blocking**
- CPU memory reads/writes must check PPU mode before accessing VRAM/OAM
- Blocked access behavior must return 0xFF for reads, ignore writes
- Critical for game compatibility - many games rely on this timing

**Interrupt Generation**
```typescript
interface PPUInterrupts {
  vblank: boolean;    // Triggered at scanline 144 start
  stat: boolean;      // Configurable via STAT register
}
```

### 3. Timer System Coordination

**Clock Synchronization**
- PPU steps once per CPU cycle (4.194304 MHz)
- Independent from Timer/Divider registers
- Must maintain exact 59.7 FPS frame rate (70,224 cycles/frame)

### 4. Existing Component Modifications Required

**MMU Changes**
```typescript
// Add PPU instance and route memory access
class MMU {
  private ppu: PPU;
  
  read(address: number): number {
    if (address >= 0x8000 && address <= 0x9FFF) {
      return this.ppu.readVRAM(address);
    }
    if (address >= 0xFE00 && address <= 0xFE9F) {
      return this.ppu.readOAM(address);
    }
    if (address >= 0xFF40 && address <= 0xFF4B) {
      return this.ppu.readRegister(address);
    }
    // existing logic...
  }
}
```

**CPU Changes**
```typescript
// CPU must step PPU and handle interrupts
class CPU {
  step(): void {
    const cycles = this.executeInstruction();
    const ppuEvents = this.ppu.step(cycles);
    
    if (ppuEvents.vblankInterrupt) {
      this.requestInterrupt(InterruptType.VBlank);
    }
    if (ppuEvents.statInterrupt) {
      this.requestInterrupt(InterruptType.STAT);
    }
  }
}
```

## Implementation Architecture

### Component Hierarchy
```
EmulatorContainer
├── CPU (existing)
├── MMU (existing - requires PPU integration)
├── Timer (existing)
└── PPU (new component)
    ├── Registers (LCDC, STAT, SCX, SCY, etc.)
    ├── VRAM (8KB tile data + tile maps)
    ├── OAM (160 bytes sprite attributes)
    └── Renderer (background, window, sprite pipeline)
```

### Data Flow Requirements
```
1. CPU executes instruction
2. CPU steps PPU with cycle count
3. PPU advances state machine
4. PPU generates interrupts if needed
5. CPU handles interrupts
6. MMU routes memory access through PPU
7. PPU enforces mode-based access restrictions
```

## Test Integration Strategy

### Mealybug Test ROM Execution
```typescript
// Test runner must support PPU output capture
interface TestExecution {
  loadROM(path: string): void;
  runToCompletion(): void;
  captureDisplay(): Uint8Array; // 160×144 pixels
  compareToExpected(expectedPath: string): boolean;
}
```

### Expected Test Results Location
```
tests/resources/mealybug/expected/DMG-blob/
├── m2_win_en_toggle.png
├── m3_bgp_change.png
├── m3_window_timing.png
└── ... (all PPU test expected outputs)
```

## Performance Requirements

### Timing Constraints
- Complete frame rendering: 70,224 cycles maximum
- Mode 3 processing: 172-289 cycles per scanline
- Memory access decision: Single-cycle response
- Interrupt generation: Same-cycle as trigger event

### Memory Efficiency
- VRAM: 8KB (direct array access)
- OAM: 160 bytes (direct array access)  
- Frame buffer: 23,040 bytes (160×144 pixels)
- Minimal object allocation in rendering hot paths

## Critical Implementation Notes

### Hardware Accuracy Requirements
1. **Exact Timing**: All mode transitions must match hardware cycle counts
2. **Memory Access**: Block patterns must exactly match DMG behavior
3. **Register Behavior**: Mid-scanline changes affect rendering immediately
4. **Sprite Limits**: 10 sprites per scanline, hardware-enforced selection
5. **Window Counter**: Independent counter separate from LY register

### Common Pitfalls to Avoid
1. **Mode 3 Duration**: Variable timing based on scroll and sprite penalties
2. **DMA Timing**: Must block OAM access regardless of PPU mode
3. **STAT Interrupts**: DMG has spurious interrupt bug on STAT writes
4. **Palette Changes**: Mid-scanline updates affect subsequent pixels
5. **Window Activation**: Complex timing rules for enable/disable

## Validation Criteria

### Definition of Done
1. All Mealybug PPU tests produce pixel-perfect output
2. No regression in existing Blargg CPU tests
3. Full system integration with CPU/MMU/Timer
4. Performance maintains target frame rate
5. TypeScript strict mode compliance

### Test Execution
```bash
# Run PPU-specific tests
npm test -- src/emulator/display/PPU.test.ts

# Run integration tests with Mealybug ROMs
npm test -- tests/emulator/integration/mealybug-ppu.test.ts

# Validate full system with Blargg tests
npm test -- tests/emulator/integration/blargg-cpu-instrs.test.ts
```

## Next Steps

1. **Architecture Review**: Validate integration approach with Architecture Reviewer
2. **MMU Updates**: Add PPU routing to memory access methods
3. **PPU Implementation**: Begin with Phase 1 (core infrastructure)  
4. **Test Framework**: Create Mealybug test runner with PNG comparison
5. **Performance Testing**: Validate timing requirements with full system

## Reference Files

- **Complete Specification**: `/home/pittm/karimono-v2/docs/hardware/ppu-comprehensive-specification.md`
- **Existing PPU Docs**: `/home/pittm/karimono-v2/docs/specs/ppu.md`
- **Mealybug Tests**: `/home/pittm/karimono-v2/tests/resources/mealybug/`
- **Expected Results**: `/home/pittm/karimono-v2/tests/resources/mealybug/expected/DMG-blob/`