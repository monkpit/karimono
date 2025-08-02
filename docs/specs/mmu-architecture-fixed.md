# Memory Management Unit (MMU) - Performance-Optimized Architecture Specification

> **Performance Decision**: This architecture removes PPU mode access checking to eliminate ~1 million function calls per second overhead. This aligns with performance-focused emulators like GameBoy Online and maintains hardware accuracy for memory mapping and bank switching.

## Executive Summary

This document provides the simplified MMU architecture that prioritizes performance by removing PPU mode access checking. This design decision aligns with performance-focused emulators like GameBoy Online and eliminates the overhead of 1 million+ access control checks per second. The MMU now focuses on core functionality: address decoding, memory mapping, and bank switching.

## Performance Optimization Applied

### 1. Removed PPU Mode Access Checking ✅

Eliminated the `isAddressAccessible()` method and all associated PPU/DMA state queries:
- ❌ `connectPPU()` - No longer needed
- ❌ `connectDMA()` - No longer needed
- ❌ `isAddressAccessible()` - Removes 1M+ calls per second overhead
- ❌ PPU mode blocking logic - Simplifies memory access path

### 2. Simplified Component Dependencies ✅

Removed circular dependencies entirely:
- MMU no longer queries PPU/DMA state
- No late binding complexity needed
- Cleaner component initialization
- Faster memory access with direct path

### 3. Performance-First Design ✅

Aligns with GameBoy Online and other performance-focused emulators:
- Direct memory access without access control overhead
- Simplified address decoding
- Reduced function call overhead
- Hardware accuracy maintained for banking and address mapping

### 4. Maintained Core Functionality ✅

Essential MMU features preserved:
- Address decoding and memory mapping
- ROM/RAM bank switching
- Boot ROM overlay mechanism
- Cartridge integration
- State snapshot for testing

## MBC Implementation Requirements

Based on the Game Boy Enhanced Development Guide (GBEDG), our MMU must properly handle MBC detection and banking:

### MBC Detection and Initialization

```typescript
/**
 * MBC detection using cartridge header byte at 0x0147
 * Aligns with GBEDG specifications for proper MBC identification
 */
export enum MBCType {
  NONE = 0x00,          // 32KB ROM only
  MBC1 = 0x01,          // Basic banking
  MBC1_RAM = 0x02,      // MBC1 + RAM
  MBC1_RAM_BATTERY = 0x03, // MBC1 + RAM + Battery
  MBC2 = 0x05,          // MBC2 + integrated RAM
  MBC2_BATTERY = 0x06,  // MBC2 + Battery
  MBC3 = 0x11,          // MBC3 + Timer + RAM + Battery
  MBC3_TIMER_BATTERY = 0x0F, // MBC3 + Timer + Battery
  MBC3_RAM = 0x12,      // MBC3 + RAM
  MBC3_RAM_BATTERY = 0x13,  // MBC3 + RAM + Battery
  MBC5 = 0x19,          // MBC5
  MBC5_RAM = 0x1A,      // MBC5 + RAM  
  MBC5_RAM_BATTERY = 0x1B, // MBC5 + RAM + Battery
}

/**
 * ROM/RAM size detection from cartridge header
 */
export class CartridgeCapabilities {
  static getROMBankCount(headerByte: number): number {
    // ROM size mapping: 0x00=32KB(2 banks), 0x01=64KB(4 banks), etc.
    return 2 << headerByte; // 2^(headerByte+1) banks
  }

  static getRAMBankCount(headerByte: number): number {
    const ramSizes = [0, 1, 1, 4, 16, 8]; // Banks: None, 1, 1, 4, 16, 8
    return ramSizes[headerByte] || 0;
  }

  static hasRTC(mbcType: MBCType): boolean {
    return mbcType === MBCType.MBC3 || mbcType === MBCType.MBC3_TIMER_BATTERY;
  }
}
```

## Component Architecture Overview

### MMU Component Interface

```typescript
/**
 * Memory Management Unit implementing performance-optimized DMG memory system
 * Extends MemoryComponent interface for seamless integration
 */
export interface MMUComponent extends MemoryComponent {
  // MemoryComponent methods (inherited):
  // readByte(address: number): number
  // writeByte(address: number, value: number): void  
  // readWord(address: number): number
  // writeWord(address: number, value: number): void
  // getSize(): number
  // reset(): void

  /**
   * Load cartridge for ROM/RAM bank switching
   */
  loadCartridge(cartridge: CartridgeComponent | undefined): void;

  /**
   * Get read-only snapshot of MMU state for testing/debugging
   */
  getSnapshot(): MMUSnapshot;
}
```

### Simplified Component Creation

```typescript
/**
 * Direct component creation without late binding complexity
 * No circular dependencies to resolve
 */
export class ComponentFactory {
  /**
   * Create MMU component with direct dependencies
   */
  createMMU(): MMUComponent {
    return new MMU();
  }

  /**
   * Create complete emulator component set
   */
  createComponents(parentElement: HTMLElement): ComponentSet {
    const display = new EmulatorDisplay(parentElement);
    const mmu = new MMU();
    const dma = new DMAController();
    const ppu = new PPU();
    const cpu = new CPU();
    
    return { display, mmu, dma, ppu, cpu };
  }
}
```

### Simplified Component Initialization

```typescript
/**
 * Direct component initialization without circular dependency complexity
 */
export class EmulatorInitializer {
  private factory = new ComponentFactory();

  initializeComponents(parentElement: HTMLElement): ComponentContainer {
    // Create all components
    const components = this.factory.createComponents(parentElement);
    
    // Simple dependency injection
    components.ppu.connectDisplay(components.display);
    components.cpu.connectMMU(components.mmu);
    
    // Return container with all components
    return new EmulatorContainer(
      components.display, 
      components.cpu, 
      components.ppu, 
      components.mmu, 
      components.dma, 
      undefined // cartridge loaded separately
    );
  }
}
```

## MMU Implementation Architecture

### Direct Memory Access (Performance Optimized)

```typescript
/**
 * MMU implementation optimized for performance without access control overhead
 */
export class MMU implements MMUComponent {
  // Mutable state for performance
  private state = {
    bootROMEnabled: true,
    currentROMBank: 1,
    currentRAMBank: 0,
    ramEnabled: false,
  };

  // Internal memory regions (private for encapsulation)
  private readonly wram = new Uint8Array(0x2000);    // 0xC000-0xDFFF
  private readonly hram = new Uint8Array(0x7F);      // 0xFF80-0xFFFE
  private readonly ioRegisters = new Uint8Array(0x80); // 0xFF00-0xFF7F
  private readonly vram = new Uint8Array(0x2000);    // 0x8000-0x9FFF
  private readonly oam = new Uint8Array(0xA0);       // 0xFE00-0xFE9F

  // Cartridge reference (simple dependency)
  private cartridge: CartridgeComponent | undefined;

  /**
   * Read byte from memory address (4 T-states)
   * Direct access for maximum performance
   */
  readByte(address: number): number {
    // Direct address decoding with optimized switch
    switch (address >> 12) {
      case 0x0: case 0x1: case 0x2: case 0x3:
        return this.readROMRegion(address);
      case 0x4: case 0x5: case 0x6: case 0x7:
        return this.readROMBankRegion(address);
      case 0x8: case 0x9:
        return this.readVRAMRegion(address);
      case 0xA: case 0xB:
        return this.readCartridgeRAMRegion(address);
      case 0xC: case 0xD:
        return this.readWRAMRegion(address);
      case 0xE: case 0xF:
        return this.readHighRegion(address);
      default:
        return 0xFF;
    }
  }

  /**
   * Write byte to memory address (4 T-states)
   * Direct access for maximum performance
   */
  writeByte(address: number, value: number): void {
    // Direct address decoding with optimized switch
    switch (address >> 12) {
      case 0x0: case 0x1:
        this.writeMBCRegister(address, value);
        break;
      case 0x2: case 0x3:
        this.writeMBCRegister(address, value);
        break;
      case 0x8: case 0x9:
        this.writeVRAMRegion(address, value);
        break;
      case 0xA: case 0xB:
        this.writeCartridgeRAMRegion(address, value);
        break;
      case 0xC: case 0xD:
        this.writeWRAMRegion(address, value);
        break;
      case 0xE: case 0xF:
        this.writeHighRegion(address, value);
        break;
    }
  }

  /**
   * Get state snapshot for testing
   */
  getSnapshot(): MMUSnapshot {
    return {
      bootROMEnabled: this.state.bootROMEnabled,
      currentROMBank: this.state.currentROMBank,
      currentRAMBank: this.state.currentRAMBank,
      ramEnabled: this.state.ramEnabled,
    };
  }

  /**
   * Load cartridge component
   */
  loadCartridge(cartridge: CartridgeComponent | undefined): void {
    this.cartridge = cartridge;
  }

  // Private methods for memory region handling
  private readVRAMRegion(address: number): number {
    return this.vram[address - 0x8000];
  }

  private writeVRAMRegion(address: number, value: number): void {
    this.vram[address - 0x8000] = value;
  }

  private readWRAMRegion(address: number): number {
    return this.wram[address - 0xC000];
  }

  private writeWRAMRegion(address: number, value: number): void {
    this.wram[address - 0xC000] = value;
  }

  // Additional private methods for other memory regions...
}
```

## Testing Strategy with Proper Boundaries

### Component Isolation Testing

```typescript
describe('MMU Component', () => {
  describe('Interface Compliance', () => {
    it('implements MemoryComponent interface correctly', () => {
      const mmu = new MMU();
      
      // Test MemoryComponent interface methods
      expect(typeof mmu.readByte).toBe('function');
      expect(typeof mmu.writeByte).toBe('function');
      expect(typeof mmu.readWord).toBe('function');
      expect(typeof mmu.writeWord).toBe('function');
      expect(typeof mmu.getSize).toBe('function');
      expect(typeof mmu.reset).toBe('function');
    });

    it('implements MMUComponent interface correctly', () => {
      const mmu = new MMU();
      
      // Test MMU-specific interface methods
      expect(typeof mmu.connectPPU).toBe('function');
      expect(typeof mmu.connectDMA).toBe('function');
      expect(typeof mmu.loadCartridge).toBe('function');
      expect(typeof mmu.getSnapshot).toBe('function');
      expect(typeof mmu.isAddressAccessible).toBe('function');
    });
  });

  describe('Direct Memory Access', () => {
    it('provides direct VRAM access for performance', () => {
      const mmu = new MMU();
      
      // Test: VRAM access is always direct and fast
      mmu.writeByte(0x8000, 0x42);
      const result = mmu.readByte(0x8000);
      expect(result).toBe(0x42); // Direct access returns actual data
    });

    it('provides direct WRAM access', () => {
      const mmu = new MMU();
      
      // Test: WRAM access is direct
      mmu.writeByte(0xC000, 0x99);
      const result = mmu.readByte(0xC000);
      expect(result).toBe(0x99);
    });

    it('handles all memory regions without access control overhead', () => {
      const mmu = new MMU();
      
      // Test various memory regions
      const testCases = [
        { address: 0x8000, value: 0x11 }, // VRAM
        { address: 0xC000, value: 0x22 }, // WRAM
        { address: 0xFF80, value: 0x33 }, // HRAM
      ];
      
      testCases.forEach(({ address, value }) => {
        mmu.writeByte(address, value);
        expect(mmu.readByte(address)).toBe(value);
      });
    });
  });

  describe('State Management', () => {
    it('provides controlled state access via snapshot', () => {
      const mmu = new MMU();
      
      // Get initial snapshot
      const snapshot = mmu.getSnapshot();
      
      // Verify simplified snapshot structure
      expect(snapshot).toHaveProperty('bootROMEnabled');
      expect(snapshot).toHaveProperty('currentROMBank');
      expect(snapshot).toHaveProperty('currentRAMBank');
      expect(snapshot).toHaveProperty('ramEnabled');
    });

    it('snapshot is read-only and does not expose internal state', () => {
      const mmu = new MMU();
      const snapshot1 = mmu.getSnapshot();
      const snapshot2 = mmu.getSnapshot();
      
      // Snapshots should be separate objects
      expect(snapshot1).not.toBe(snapshot2);
      
      // Modifying snapshot should not affect MMU state
      snapshot1.bootROMEnabled = false;
      expect(mmu.getSnapshot().bootROMEnabled).toBe(true);
    });
  });

  describe('Component Integration', () => {
    it('handles undefined cartridge gracefully', () => {
      const mmu = new MMU();
      
      // Connect undefined cartridge
      mmu.loadCartridge(undefined);
      
      // Should not throw errors
      expect(() => mmu.readByte(0x8000)).not.toThrow();
      expect(() => mmu.writeByte(0x8000, 0x42)).not.toThrow();
    });

    it('integrates with cartridge when loaded', () => {
      const mmu = new MMU();
      const mockCartridge = createMockCartridge();
      
      // Load cartridge
      mmu.loadCartridge(mockCartridge);
      
      // Should be able to access cartridge regions
      expect(() => mmu.readByte(0x0000)).not.toThrow();
      expect(() => mmu.writeByte(0x2000, 0x42)).not.toThrow(); // MBC register
    });
  });
});
```

### Integration Testing

```typescript
describe('MMU Integration', () => {
  it('integrates properly with EmulatorContainer', () => {
    const parentElement = document.createElement('div');
    const container = new EmulatorContainer(parentElement);
    
    // MMU should be available through container
    const mmu = container.getMMU();
    expect(mmu).toBeDefined();
    expect(mmu).toBeInstanceOf(MMU);
  });

  it('provides direct memory access to other components', () => {
    const initializer = new EmulatorInitializer();
    const container = initializer.initializeComponents(document.createElement('div'));
    
    const mmu = container.getMMU()!;
    
    // Test direct memory access
    mmu.writeByte(0x8000, 0x42);
    expect(mmu.readByte(0x8000)).toBe(0x42); // Direct VRAM access
    
    mmu.writeByte(0xC000, 0x99);
    expect(mmu.readByte(0xC000)).toBe(0x99); // Direct WRAM access
  });
});
```

## Component Integration with EmulatorContainer

### Updated EmulatorContainer

```typescript
/**
 * Simplified EmulatorContainer with direct MMU integration
 */
export class EmulatorContainer implements RunnableComponent, ComponentContainer {
  // Component instances
  private displayComponent!: EmulatorDisplay;
  private cpuComponent: CPUComponent | undefined;
  private ppuComponent: PPUComponent | undefined;
  private mmuComponent: MMUComponent | undefined;
  private dmaComponent: DMAComponent | undefined;
  private cartridgeComponent: CartridgeComponent | undefined;

  // Mutable state (consistent with existing architecture)
  private state: EmulatorState;

  constructor(parentElement: HTMLElement | null, config: EmulatorContainerConfig = {}) {
    if (!parentElement) {
      throw new Error('Parent element is required');
    }

    this.config = config;
    this.state = {
      running: false,
      frameCount: 0,
      cycleCount: 0,
      lastFrameTime: 0,
    };

    this.initializeComponents(parentElement);
  }

  private initializeComponents(parentElement: HTMLElement): void {
    const initializer = new EmulatorInitializer();
    const components = initializer.initializeComponents(parentElement);
    
    // Assign components from initializer
    this.displayComponent = components.getDisplay();
    this.cpuComponent = components.getCPU();
    this.ppuComponent = components.getPPU();
    this.mmuComponent = components.getMMU();
    this.dmaComponent = components.getDMA();
    this.cartridgeComponent = components.getCartridge();
  }

  // ComponentContainer interface implementation
  public getMMU(): MMUComponent | undefined {
    return this.mmuComponent;
  }

  public getDMA(): DMAComponent | undefined {
    return this.dmaComponent;
  }

  public getCartridge(): CartridgeComponent | undefined {
    return this.cartridgeComponent;
  }

  // Existing methods remain unchanged...
  public getDisplay(): DisplayComponent { return this.displayComponent; }
  public getCPU(): CPUComponent | undefined { return this.cpuComponent; }
  public getPPU(): PPUComponent | undefined { return this.ppuComponent; }
  
  // Rest of EmulatorContainer implementation...
}
```

## Performance Characteristics

### Memory Access Performance

- **Direct Array Access**: Internal memory regions use typed arrays for optimal performance
- **Address Decoding**: Switch-based decoding with bit shifting for speed
- **No Access Control Overhead**: Direct memory access without function call overhead
- **Simplified Code Path**: Straight-line execution for maximum performance

### State Management Performance

- **Mutable Internal State**: Aligned with EmulatorContainer's performance architecture
- **Snapshot Generation**: On-demand creation, no continuous overhead
- **Direct Component Access**: No late binding overhead during normal operation
- **Minimal Dependencies**: Only cartridge integration needed

## Implementation Timeline

### Phase 1: Interface Implementation (Week 1)
- Implement MMUComponent interface extending MemoryComponent
- Create ComponentRegistry for late binding
- Implement basic memory access without restrictions
- Update EmulatorContainer integration

### Phase 2: Memory Regions (Week 2)
- Implement all memory region handlers (VRAM, WRAM, HRAM, OAM)
- Add I/O register mapping
- Create snapshot mechanism for testing
- Optimize memory access performance

### Phase 3: Banking System (Week 3)
- Implement MBC register handling
- Add ROM/RAM bank switching
- Integrate cartridge component
- Add boot ROM overlay mechanism

### Phase 4: Testing and Validation (Week 4)
- Complete unit test suite
- Integration testing with other components
- Hardware test ROM validation
- Performance optimization and profiling

## Conclusion

This performance-optimized MMU architecture provides significant benefits:

✅ **Performance First**: Eliminates 1 million+ access control calls per second
✅ **Simplified Architecture**: No circular dependencies or late binding complexity
✅ **Clean Interfaces**: MMUComponent focuses on core memory management
✅ **Hardware Accuracy**: Maintains accurate address decoding and bank switching
✅ **Easy Testing**: Simple snapshot mechanism for state inspection

This design aligns with performance-focused emulators like GameBoy Online while maintaining the essential MMU functionality needed for accurate Game Boy emulation. The architecture is ready for immediate implementation.