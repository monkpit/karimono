# GameBoy Online MMU Interface Analysis

## Executive Summary

This document provides a comprehensive analysis of the Memory Management Unit (MMU) interface requirements based on the GameBoy Online JavaScript implementation. The analysis reveals the essential public methods, properties, and integration patterns needed for our TypeScript MMU implementation.

## Core MMU Interface Requirements

### Primary Public Methods

#### Memory Access (Hot Path - Critical Performance)
```typescript
// Core memory read/write - called every CPU instruction
memoryRead(address: number): number
memoryWrite(address: number, data: number): void

// High memory (0xFF00-0xFFFF) optimized access
memoryHighRead(address: number): number  
memoryHighWrite(address: number, data: number): void
```

#### ROM/Cartridge Management
```typescript
// ROM loading and initialization
loadROM(romData: Uint8Array): void
getROMImage(): Uint8Array

// Cartridge information access
getCartridgeType(): number
getGameTitle(): string
getGameCode(): string
getNumROMBanks(): number
getNumRAMBanks(): number
```

#### System Lifecycle
```typescript
// Core lifecycle methods
initialize(): void
reset(): void
setupRAM(): void

// Boot ROM management
disableBootROM(): void
```

#### Save State Management
```typescript
// State serialization
saveState(): any[]
loadState(state: any[]): void
saveSRAMState(): number[]
saveRTCState(): number[]
```

### Essential Public Properties

#### Memory Arrays (Direct Access for Performance)
```typescript
// Core memory regions - exposed for direct access in hot paths
readonly memory: Uint8Array        // Main memory (0x0000-0xFFFF)
readonly ROM: Uint8Array          // Full ROM data
readonly MBCRam: Uint8Array       // Switchable MBC RAM
readonly VRAM: Uint8Array         // Video RAM (GBC only)
readonly GBCMemory: Uint8Array    // GBC work RAM banks
```

#### Banking State (Read-Only Access)
```typescript
// Current banking configuration
readonly currentROMBank: number
readonly currMBCRAMBank: number
readonly currVRAMBank: number    // GBC only
readonly MBCRAMBanksEnabled: boolean
```

#### Cartridge Information (Read-Only)
```typescript
readonly cartridgeType: number
readonly name: string
readonly gameCode: string
readonly cGBC: boolean           // GameBoy Color mode
readonly numROMBanks: number
readonly numRAMBanks: number
```

#### MBC Type Flags (Read-Only)
```typescript
readonly cMBC1: boolean
readonly cMBC2: boolean  
readonly cMBC3: boolean
readonly cMBC5: boolean
readonly cMBC7: boolean
readonly cSRAM: boolean
readonly cBATT: boolean
readonly cTIMER: boolean         // RTC support
```

## Implementation Architecture

### Function Pointer Arrays (Performance Optimization)

GameBoy Online uses pre-compiled function pointer arrays for maximum performance:

```typescript
// Memory access function arrays (internal implementation detail)
private memoryReader: Array<(address: number) => number>
private memoryWriter: Array<(address: number, data: number) => void>
private memoryHighReader: Array<(address: number) => number> 
private memoryHighWriter: Array<(address: number, data: number) => void>
```

### Compilation Methods (Internal)
```typescript
// Jump table compilation for performance
private memoryReadJumpCompile(): void
private memoryWriteJumpCompile(): void
```

## Integration Points

### CPU Integration
- CPU calls `memoryRead(address)` and `memoryWrite(address, data)` for all memory access
- High-frequency methods must be highly optimized (called every instruction)
- No complex logic in hot path methods

### PPU Integration  
- PPU accesses VRAM through standard memory interface
- Mode-based access restrictions handled internally
- Graphics subsystem triggers through memory writes to specific addresses

### Cartridge Loading Integration
```typescript
// Integration with main emulator
const emulator = new GameBoyCore(canvas, romData);
emulator.initialize();
emulator.start();
```

### Save System Integration
```typescript
// External save/load integration
const saveData = emulator.saveSRAMState();
// ... store saveData externally ...
emulator.loadSRAMState(saveData);
```

## Banking and MBC Support

### MBC Write Handler Methods (Internal)
```typescript
// Bank switching handlers - internal implementation
private MBCWriteEnable(address: number, data: number): void
private MBC1WriteROMBank(address: number, data: number): void
private MBC1WriteRAMBank(address: number, data: number): void
private MBC3WriteROMBank(address: number, data: number): void
// ... etc for all MBC types
```

### ROM Bank Calculation Methods (Internal)
```typescript
private setCurrentMBC1ROMBank(): void
private setCurrentMBC2AND3ROMBank(): void  
private setCurrentMBC5ROMBank(): void
```

## Performance Considerations

### Hot Path Optimization
- `memoryRead()` and `memoryWrite()` are called millions of times per second
- Function pointer arrays eliminate conditional branching
- Direct array access for maximum speed
- Pre-compilation of memory handlers based on cartridge type

### Memory Layout Optimization
- Typed arrays (Uint8Array) for all memory regions
- Bank position offsets pre-calculated and cached
- Minimal object property access in hot paths

### Address Range Handling
- Memory map divided into segments with specialized handlers
- 0xFF00-0xFFFF range gets dedicated fast path
- Different handlers for ROM, RAM, VRAM, I/O regions

## Test Integration Requirements

### Memory State Inspection
```typescript
// For testing - read-only access to internal state
getMemoryValue(address: number): number
getROMBankOffset(): number
getRAMBankOffset(): number
getCurrentBankingState(): BankingState
```

### Debug Interface  
```typescript
// Debug/test support
dumpMemoryRegion(start: number, length: number): Uint8Array
validateMemoryState(): boolean
```

## Critical Implementation Notes

### Function Pointer Pattern
GameBoy Online's key performance optimization is pre-compiling memory access into function pointer arrays. This eliminates conditional branching in hot paths.

### Address Masking
- Addresses are masked appropriately (e.g., `address & 0xFFFF`)
- High memory uses `0xFF00 | address` pattern
- Bank calculations use bit shifting for performance

### Error Handling
- Invalid memory access returns 0xFF (hardware behavior)
- Disabled RAM access returns 0xFF
- No exceptions thrown from hot path methods

### Memory Mirroring
- Echo RAM ranges handled through address translation
- Some regions mirror to multiple address ranges
- Address mapping handled in jump table compilation

## Conclusion

The MMU interface design should prioritize:

1. **Performance**: Hot path methods must be extremely fast
2. **Simplicity**: Clean interface hiding complex internal banking logic  
3. **Compatibility**: Support all MBC types with proper banking
4. **Testability**: Expose necessary state for validation
5. **Integration**: Clean integration with CPU, PPU, and save systems

The function pointer array pattern from GameBoy Online should be adapted to TypeScript while maintaining the performance characteristics and clean public interface.