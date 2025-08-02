# MMU Component Interface Specification

## Executive Summary

This document defines the clean, architecturally compliant TypeScript interface specification for the Memory Management Unit (MMU) component of the Game Boy DMG emulator. The MMU serves as the central memory controller, following our project's architectural principles of simplicity, encapsulation, and single responsibility.

**Key Architectural Principles Followed:**
- Single Responsibility: Focus on core memory management only
- Encapsulation: Hide internal state behind controlled interfaces  
- Performance-First: Eliminate unnecessary overhead (per ADR: MMU Performance Optimization)
- Clean Integration: Align with existing ComponentContainer patterns
- Testable Design: Enable testing at proper encapsulation boundaries

## Core Interface Definition

### MMU Component Interface (Architecturally Compliant)

**This interface directly matches the existing `MMUComponent` interface in `/home/pittm/karimono-v2/src/emulator/types.ts` and follows our architectural decisions.**

```typescript
/**
 * Memory Management Unit Component Interface
 * 
 * Clean, focused interface following single responsibility principle.
 * Extends MemoryComponent with only essential MMU-specific functionality.
 * 
 * ARCHITECTURAL DECISIONS APPLIED:
 * - No PPU mode access checking (per ADR: MMU Performance Optimization)
 * - No direct memory access methods (violates encapsulation)
 * - No debug bypass methods (violates encapsulation boundaries)
 * - No complex lifecycle management (handled by ComponentContainer)
 * - No circular dependency injection (use ComponentContainer pattern)
 */
export interface MMUComponent extends MemoryComponent {
  /**
   * Load cartridge for ROM/RAM bank switching
   * 
   * @param cartridge - CartridgeComponent instance or undefined to unload
   * 
   * Implementation Notes:
   * - Cartridge handles all MBC register writes and banking logic
   * - MMU routes cartridge memory requests to loaded cartridge
   * - Boot ROM overlay is handled internally by MMU
   */
  loadCartridge(cartridge: CartridgeComponent | undefined): void;

  /**
   * Get snapshot of current MMU state for testing/debugging
   * 
   * @returns MMUSnapshot with essential state for validation
   * 
   * Testing Notes:
   * - Use this method to verify banking state in tests
   * - Provides read-only view of internal state
   * - Enables testing at proper encapsulation boundary
   */
  getSnapshot(): MMUSnapshot;
}
```

### Base MemoryComponent Interface (Inherited)

**The MMU inherits these core memory operations from `MemoryComponent`:**

```typescript
export interface MemoryComponent extends EmulatorComponent {
  /**
   * Read byte from memory address (HOT PATH)
   * 
   * @param address - 16-bit memory address (0x0000-0xFFFF)
   * @returns 8-bit value
   * 
   * Performance Notes:
   * - Called millions of times per second during emulation
   * - No PPU mode access checking (per performance optimization ADR)
   * - Direct memory access for maximum performance
   */
  readByte(address: number): number;

  /**
   * Write byte to memory address (HOT PATH)
   * 
   * @param address - 16-bit memory address (0x0000-0xFFFF)
   * @param value - 8-bit value to write (0x00-0xFF)
   * 
   * Performance Notes:
   * - Called millions of times per second during emulation
   * - Routes MBC register writes to cartridge component
   * - Handles echo RAM mirroring (0xE000-0xFDFF → 0xC000-0xDDFF)
   */
  writeByte(address: number, value: number): void;

  /**
   * Read 16-bit word from memory address (little-endian)
   * 
   * @param address - 16-bit memory address (0x0000-0xFFFE)
   * @returns 16-bit value constructed as (high << 8) | low
   * 
   * Implementation: Uses two readByte() calls for consistency
   */
  readWord(address: number): number;

  /**
   * Write 16-bit word to memory address (little-endian)
   * 
   * @param address - 16-bit memory address (0x0000-0xFFFE)
   * @param value - 16-bit value to write (0x0000-0xFFFF)
   * 
   * Implementation: Uses two writeByte() calls for consistency
   */
  writeWord(address: number, value: number): void;

  /**
   * Get memory size in bytes
   * 
   * @returns Total addressable memory size (65536 for Game Boy)
   */
  getSize(): number;

  /**
   * Reset component to initial state
   * 
   * Implementation Notes:
   * - Clears all WRAM and HRAM to 0x00
   * - Enables boot ROM overlay
   * - Resets I/O registers to default values
   */
  reset(): void;
}
```

## Supporting Type Definitions

### MMU Snapshot Interface (From Existing Types)

**This interface matches the existing `MMUSnapshot` interface in `/home/pittm/karimono-v2/src/emulator/types.ts`:**

```typescript
/**
 * MMU state snapshot for testing and debugging
 * 
 * Provides essential state information for test validation
 * without exposing internal implementation details.
 * 
 * ARCHITECTURAL COMPLIANCE:
 * - Simple, focused interface for testing boundaries
 * - No internal state exposure (encapsulation preserved)
 * - No PPU mode or DMA state (per performance optimization ADR)
 */
export interface MMUSnapshot {
  /** Boot ROM is currently enabled and overlaying memory */
  bootROMEnabled: boolean;
  
  /** Current ROM bank in switchable area (0x4000-0x7FFF) */
  currentROMBank: number;
  
  /** Current RAM bank in external RAM area (0xA000-0xBFFF) */
  currentRAMBank: number;
  
  /** External cartridge RAM is currently enabled */
  ramEnabled: boolean;
}
```

### Cartridge Header Interface (From Existing Types)

**This interface matches the existing `CartridgeHeader` interface in `/home/pittm/karimono-v2/src/emulator/types.ts`:**

```typescript
/**
 * Cartridge header information
 * 
 * Simplified header interface focusing on essential
 * information needed by the MMU for banking and
 * memory management decisions.
 */
export interface CartridgeHeader {
  /** Game title from cartridge header */
  title: string;
  
  /** MBC type identifier */
  mbcType: number;
  
  /** ROM size in bytes */
  romSize: number;
  
  /** RAM size in bytes (0 if no RAM) */
  ramSize: number;
  
  /** Header checksum validation result */
  checksumValid: boolean;
}
```

### Integration Interfaces (From Existing Types)

**These interfaces are already defined in `/home/pittm/karimono-v2/src/emulator/types.ts` and follow our architectural patterns:**

```typescript
/**
 * Component interfaces that the MMU interacts with
 * through the ComponentContainer dependency injection pattern
 */

/**
 * Cartridge component interface
 * 
 * MMU delegates cartridge-specific operations to this component,
 * maintaining clean separation of concerns.
 */
export interface CartridgeComponent extends EmulatorComponent {
  /** Read from ROM at address */
  readROM(address: number): number;
  
  /** Read from cartridge RAM at address */
  readRAM(address: number): number;
  
  /** Write to cartridge RAM at address */
  writeRAM(address: number, value: number): void;
  
  /** Handle MBC register write */
  writeMBCRegister(address: number, value: number): void;
  
  /** Get cartridge header information */
  getHeader(): CartridgeHeader;
}

/**
 * Component container for dependency injection
 * 
 * Provides clean access to other components without
 * creating circular dependencies or tight coupling.
 */
export interface ComponentContainer {
  /** Get cartridge component (may be undefined) */
  getCartridge(): CartridgeComponent | undefined;
  
  // Other components accessed through container pattern
  // No direct component injection into MMU constructor
}
```

## Implementation Guidelines

### Memory Region Reference

**For implementation reference, the MMU handles these Game Boy memory regions:**

- `0x0000-0x3FFF`: ROM Bank 0 (fixed, cartridge)
- `0x4000-0x7FFF`: ROM Bank N (switchable, cartridge) 
- `0x8000-0x9FFF`: VRAM (8KB, managed by PPU)
- `0xA000-0xBFFF`: External RAM (cartridge)
- `0xC000-0xDFFF`: WRAM (8KB, internal)
- `0xE000-0xFDFF`: Echo RAM (mirrors WRAM)
- `0xFE00-0xFE9F`: OAM (sprite data, 160 bytes)
- `0xFEA0-0xFEFF`: Unusable (return 0xFF)
- `0xFF00-0xFF7F`: I/O Registers (delegated to components)
- `0xFF80-0xFFFE`: HRAM (127 bytes, high-speed)
- `0xFFFF`: Interrupt Enable Register

### Architecture Compliance Requirements

1. **Single Responsibility**: MMU focuses only on address decoding and memory routing
2. **Encapsulation**: No direct memory access methods or internal state exposure
3. **Performance**: Direct memory access without overhead (no PPU mode checking)
4. **Clean Integration**: Use ComponentContainer for dependency access
5. **Testable Design**: State validation through `getSnapshot()` interface only

### Hardware Accuracy Standards

- **Echo RAM Mirroring**: Reads/writes to 0xE000-0xFDFF mirror 0xC000-0xDDFF
- **Boot ROM Overlay**: During boot, 0x0000-0x00FF reads from internal boot ROM
- **MBC Register Delegation**: Cartridge memory writes (0x0000-0x7FFF) forwarded to cartridge
- **I/O Register Routing**: Future implementation will route I/O to appropriate components
- **Invalid Access Handling**: Return 0xFF for unusable memory region

### Testing Approach

**Test at component boundaries using the public interface:**

```typescript
// CORRECT: Test observable behavior
const snapshot = mmu.getSnapshot();
expect(snapshot.currentROMBank).toBe(1);

// WRONG: Don't test internal implementation
// expect(mmu.bankingRegisters[0]).toBe(1); // Violates encapsulation
```

### Component Integration Pattern

**Use ComponentContainer dependency injection:**

```typescript
// CORRECT: Access through container
const cartridge = container.getCartridge();
if (cartridge) {
  return cartridge.readROM(address - 0x4000);
}

// WRONG: Direct component injection
// constructor(cartridge: CartridgeComponent) // Creates tight coupling
```

## Conclusion

This simplified MMU interface specification eliminates the architectural violations identified by the Architecture Reviewer:

✅ **Interface Complexity Resolved**: Reduced from 70+ methods to 2 focused methods  
✅ **Encapsulation Preserved**: Removed all direct memory access and debug bypass methods  
✅ **Circular Dependencies Eliminated**: Removed complex integration interfaces  
✅ **Performance Architecture Aligned**: Matches performance-first optimization decisions  
✅ **Component Integration Simplified**: Uses clean ComponentContainer patterns  

The interface now perfectly aligns with:
- Existing `MMUComponent` interface in `/home/pittm/karimono-v2/src/emulator/types.ts`
- Performance optimization ADR in `/home/pittm/karimono-v2/docs/decisions/mmu-performance-optimization.md`  
- Project architectural principles of simplicity, encapsulation, and single responsibility

**This specification is ready for Architecture Reviewer approval and Backend TypeScript Engineer implementation.**