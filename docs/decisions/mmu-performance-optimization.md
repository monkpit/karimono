# ADR: MMU Performance Optimization - Remove PPU Mode Access Checking

## Status
**Accepted** - 2025-08-02

## Context

The original MMU architecture included PPU mode access checking to accurately simulate Game Boy hardware behavior where:
- VRAM is inaccessible during PPU Mode 3 (Drawing)
- OAM is inaccessible during PPU Mode 2 (OAM Scan) and Mode 3 (Drawing)

However, performance analysis revealed this creates significant overhead:
- ~1 million `isAddressAccessible()` calls per second
- Associated PPU/DMA state queries for each memory access
- Complex circular dependency management between MMU, PPU, and DMA components
- Late binding complexity to resolve component initialization order

Research into performance-focused emulators (GameBoy Online, BGB, etc.) shows that most production emulators skip strict PPU mode access restrictions in favor of performance.

## Decision

**Remove PPU mode access checking from the MMU architecture** to prioritize performance while maintaining hardware accuracy for core memory management functions.

### Changes Made

1. **Simplified MMU Interface** (`/home/pittm/karimono-v2/src/emulator/types.ts`):
   - Removed `isAddressAccessible()` method
   - Removed `connectPPU()` and `connectDMA()` methods  
   - Simplified `MMUSnapshot` interface (removed `dmaActive` and `ppuMode` fields)

2. **Updated Architecture Documentation** (`/home/pittm/karimono-v2/docs/specs/mmu-architecture-fixed.md`):
   - Renamed to "Performance-Optimized Architecture"
   - Removed late binding complexity
   - Simplified component initialization
   - Updated test specifications to focus on direct memory access
   - Removed access control test cases

3. **Updated Performance Documentation** (`/home/pittm/karimono-v2/docs/architecture/performance-optimization.md`):
   - Documented the performance decision
   - Updated memory access patterns to show direct access
   - Removed PPU mode access control optimizations

### Core MMU Functionality Preserved

- Address decoding and memory mapping
- ROM/RAM bank switching (MBC support)
- Boot ROM overlay mechanism
- Cartridge integration
- Memory region handlers (VRAM, WRAM, HRAM, OAM, I/O registers)

## Consequences

### Positive
- **Major Performance Improvement**: Eliminates ~1 million function calls per second
- **Simplified Architecture**: No circular dependencies or late binding complexity
- **Faster Development**: Easier testing and debugging without access control edge cases
- **Industry Alignment**: Matches approach used by GameBoy Online and other performance emulators
- **Cleaner Code**: Direct memory access paths with minimal indirection

### Negative
- **Minor Hardware Accuracy Loss**: CPU can access VRAM/OAM during restricted PPU modes
- **Test Compatibility**: Some hardware test ROMs that rely on strict access timing may behave differently

### Neutral
- **Essential Accuracy Maintained**: Core Game Boy functionality (instruction execution, rendering, timing) remains hardware-accurate
- **Test ROM Coverage**: Most compatibility test ROMs focus on CPU instruction accuracy and basic PPU behavior, not strict access timing

## Implementation Impact

### Before (Complex)
```typescript
interface MMUComponent extends MemoryComponent {
  connectPPU(ppu: PPUComponent | undefined): void;
  connectDMA(dma: DMAComponent | undefined): void;
  isAddressAccessible(address: number): boolean;
  // ... other methods
}

readByte(address: number): number {
  if (!this.isAddressAccessible(address)) {
    return 0xFF; // Blocked access
  }
  // ... actual memory access
}
```

### After (Simple)
```typescript
interface MMUComponent extends MemoryComponent {
  loadCartridge(cartridge: CartridgeComponent | undefined): void;
  getSnapshot(): MMUSnapshot;
}

readByte(address: number): number {
  // Direct memory access
  switch (address >> 12) {
    case 0x8: case 0x9:
      return this.vram[address - 0x8000];
    // ... other regions
  }
}
```

## Alternatives Considered

1. **Optimized Access Control**: Keep PPU mode checking but optimize with bit masks and lookup tables
   - **Rejected**: Still requires component queries and maintains circular dependencies

2. **Configurable Access Control**: Make PPU mode checking optional via configuration
   - **Rejected**: Adds complexity without clear benefit; most users would disable it for performance

3. **Lazy Access Control**: Only check access for specific memory regions during specific operations
   - **Rejected**: Partial implementation creates inconsistent behavior and testing complexity

## References

- GameBoy Online implementation: https://github.com/taisel/GameBoy-Online
- Performance POC results showing 80x improvement with mutable state patterns
- Pan Docs PPU timing documentation: https://gbdev.io/pandocs/Rendering.html
- GBDev community discussions on emulator performance vs accuracy trade-offs

## Validation

The simplified MMU architecture has been validated through:
- Interface compatibility with existing `MemoryComponent` contracts
- Performance analysis showing elimination of hot path overhead
- Architecture review confirming removal of circular dependencies
- Documentation updates ensuring implementation clarity

This decision enables immediate development of a high-performance MMU while maintaining the essential accuracy needed for Game Boy emulation.