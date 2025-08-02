# Game Boy DMG Emulator Testing Isolation Strategies

> **⚠️ OUTDATED DOCUMENT NOTICE**  
> **Performance Optimization (2025-08-02)**: This document contains outdated testing patterns that include PPU mode access control testing. The current implementation uses simplified testing approaches for performance-optimized components. See `/home/pittm/karimono-v2/docs/specs/mmu-architecture-fixed.md` for current testing patterns.

## Overview

This document defines comprehensive testing isolation strategies that enable each component to be tested independently while ensuring the complete system achieves cycle-accurate Game Boy DMG emulation. The strategies balance thorough testing coverage with maintainable, fast-executing test suites.

## Core Testing Principles

### 1. Boundary Observation Testing

- **Test observable side effects** at component boundaries, not internal implementation
- **Mock dependencies** through well-defined interfaces
- **Verify timing accuracy** through cycle counting and state changes
- **Validate hardware compliance** using authoritative test ROMs

### 2. Component Isolation Requirements

- Each component must be testable **without its dependencies**
- Dependencies are **injected through interfaces** that can be mocked
- Tests observe **only public interface behavior** and side effects
- Internal state access is **limited to debugging interfaces**

### 3. Testing Architecture Goals

- **Fast execution**: Unit tests run in milliseconds, not seconds
- **Atomic tests**: Each test validates exactly one behavior
- **Debuggable failures**: Test failures clearly indicate the root cause
- **Hardware validation**: Integration tests verify against real hardware behavior

## Component Testing Strategies

### 1. CPU Component Testing

#### CPU Interface Mocking Strategy

```typescript
/**
 * Mock memory controller for CPU testing
 * Provides controllable, observable memory interface
 */
class MockMemoryController implements MemoryController {
  private memory = new Map<u16, u8>();
  private readLog: Array<{ address: u16; value: u8 }> = [];
  private writeLog: Array<{ address: u16; value: u8 }> = [];

  read(address: u16): u8 {
    const value = this.memory.get(address) || 0xff;
    this.readLog.push({ address, value });
    return value;
  }

  write(address: u16, value: u8): void {
    this.memory.set(address, value);
    this.writeLog.push({ address, value });
  }

  // Testing utilities
  setMemory(address: u16, value: u8): void {
    this.memory.set(address, value);
  }

  getReadLog(): Array<{ address: u16; value: u8 }> {
    return [...this.readLog];
  }

  getWriteLog(): Array<{ address: u16; value: u8 }> {
    return [...this.writeLog];
  }

  clearLogs(): void {
    this.readLog = [];
    this.writeLog = [];
  }

  // Implement other MemoryController interface methods with mocks
  step(cycles: u32): void {
    /* mock implementation */
  }
  getCurrentCycle(): u32 {
    return 0;
  }
  reset(): void {
    /* mock implementation */
  }
}
```

#### CPU Instruction Testing

```typescript
describe('CPU Instruction Execution', () => {
  let cpu: CPU;
  let mockMemory: MockMemoryController;

  beforeEach(() => {
    mockMemory = new MockMemoryController();
    cpu = new CPU(mockMemory);
  });

  describe('8-bit Load Instructions', () => {
    test('LD B,n should load immediate value into B register', () => {
      // Setup: LD B,0x42 instruction
      mockMemory.setMemory(0x0000, 0x06); // LD B,n opcode
      mockMemory.setMemory(0x0001, 0x42); // Immediate value

      // Execute instruction
      const cycles = cpu.step();

      // Verify side effects at boundary
      expect(cpu.getRegisters().B).toBe(0x42);
      expect(cpu.getProgramCounter()).toBe(0x0002);
      expect(cycles).toBe(8); // 2 M-cycles

      // Verify memory access pattern
      const readLog = mockMemory.getReadLog();
      expect(readLog).toEqual([
        { address: 0x0000, value: 0x06 }, // Fetch opcode
        { address: 0x0001, value: 0x42 }, // Fetch immediate
      ]);
    });

    test('LD (HL),A should store accumulator at HL address', () => {
      // Setup
      cpu.setRegisters({ ...cpu.getRegisters(), A: 0x5a, H: 0x80, L: 0x00 });
      mockMemory.setMemory(0x0000, 0x77); // LD (HL),A opcode

      // Execute
      const cycles = cpu.step();

      // Verify memory write occurred
      const writeLog = mockMemory.getWriteLog();
      expect(writeLog).toContainEqual({ address: 0x8000, value: 0x5a });
      expect(cycles).toBe(8);
    });
  });

  describe('Flag Operations', () => {
    test('ADD A,B should set carry flag on overflow', () => {
      // Setup for overflow condition
      cpu.setRegisters({ ...cpu.getRegisters(), A: 0xff, B: 0x01 });
      mockMemory.setMemory(0x0000, 0x80); // ADD A,B opcode

      // Execute
      cpu.step();

      // Verify flags set correctly
      expect(cpu.getFlag(CPUFlag.ZERO)).toBe(true); // Result is 0x00
      expect(cpu.getFlag(CPUFlag.CARRY)).toBe(true); // Overflow occurred
      expect(cpu.getFlag(CPUFlag.HALF_CARRY)).toBe(true); // Half carry from bit 3
      expect(cpu.getFlag(CPUFlag.NEGATIVE)).toBe(false); // Addition clears N
      expect(cpu.getRegisters().A).toBe(0x00); // Wrapped result
    });
  });

  describe('Interrupt Handling', () => {
    test('should process VBlank interrupt with correct timing', () => {
      // Setup interrupt conditions
      cpu.setInterruptMasterEnable(true);
      cpu.setInterruptEnable(InterruptType.VBLANK);
      cpu.requestInterrupt(InterruptType.VBLANK);
      cpu.setProgramCounter(0x1000);
      cpu.setStackPointer(0xfffe);

      // Execute interrupt processing
      const cycles = cpu.processInterrupts();

      // Verify interrupt handling side effects
      expect(cycles).toBe(20); // 5 M-cycles for interrupt
      expect(cpu.getProgramCounter()).toBe(0x0040); // VBlank vector
      expect(cpu.getInterruptMasterEnable()).toBe(false); // IME disabled

      // Verify stack operations
      const writeLog = mockMemory.getWriteLog();
      expect(writeLog).toContainEqual({ address: 0xfffd, value: 0x10 }); // PCH
      expect(writeLog).toContainEqual({ address: 0xfffc, value: 0x00 }); // PCL
      expect(cpu.getStackPointer()).toBe(0xfffc);
    });
  });
});
```

#### CPU Timing Validation

```typescript
describe('CPU Timing Accuracy', () => {
  test('should execute instructions with exact cycle counts', () => {
    const testCases = [
      { opcode: 0x00, name: 'NOP', expectedCycles: 4 },
      { opcode: 0x06, name: 'LD B,n', expectedCycles: 8, setup: [0x42] },
      {
        opcode: 0x20,
        name: 'JR NZ,e',
        expectedCycles: 12,
        setup: [0x10],
        preCondition: () => cpu.setFlag(CPUFlag.ZERO, false),
      },
      {
        opcode: 0x20,
        name: 'JR NZ,e (not taken)',
        expectedCycles: 8,
        setup: [0x10],
        preCondition: () => cpu.setFlag(CPUFlag.ZERO, true),
      },
    ];

    testCases.forEach(({ opcode, name, expectedCycles, setup = [], preCondition }) => {
      test(`${name} should execute in ${expectedCycles} cycles`, () => {
        // Setup instruction in memory
        mockMemory.setMemory(0x0000, opcode);
        setup.forEach((byte, index) => {
          mockMemory.setMemory(0x0001 + index, byte);
        });

        // Setup preconditions
        if (preCondition) preCondition();

        // Execute and verify timing
        const actualCycles = cpu.step();
        expect(actualCycles).toBe(expectedCycles);
      });
    });
  });
});
```

### 2. PPU Component Testing

#### PPU Dependency Mocking

```typescript
/**
 * Mock VRAM controller for PPU testing
 * Provides controllable video memory with access tracking
 */
class MockVRAMController {
  private vram = new Uint8Array(0x2000);
  private oam = new Uint8Array(0xa0);
  private accessBlocked = false;

  readVRAM(address: u16): u8 {
    if (this.accessBlocked) return 0xff;
    return this.vram[address - 0x8000];
  }

  writeVRAM(address: u16, value: u8): void {
    if (!this.accessBlocked) {
      this.vram[address - 0x8000] = value;
    }
  }

  readOAM(address: u16): u8 {
    if (this.accessBlocked) return 0xff;
    return this.oam[address - 0xfe00];
  }

  writeOAM(address: u16, value: u8): void {
    if (!this.accessBlocked) {
      this.oam[address - 0xfe00] = value;
    }
  }

  // Testing controls
  setVRAMData(offset: u16, data: Uint8Array): void {
    this.vram.set(data, offset);
  }

  setOAMData(offset: u16, data: Uint8Array): void {
    this.oam.set(data, offset);
  }

  setAccessBlocked(blocked: boolean): void {
    this.accessBlocked = blocked;
  }

  getVRAMSnapshot(): Uint8Array {
    return new Uint8Array(this.vram);
  }
}
```

#### PPU Mode Transition Testing

```typescript
describe('PPU Mode Transitions', () => {
  let ppu: PPU;
  let mockVRAM: MockVRAMController;

  beforeEach(() => {
    mockVRAM = new MockVRAMController();
    ppu = new PPU(mockVRAM);
  });

  test('should transition through modes with correct timing', () => {
    // Start at beginning of scanline
    ppu.reset();
    expect(ppu.getCurrentMode()).toBe(PPUMode.OAM_SEARCH);
    expect(ppu.getCurrentScanline()).toBe(0);

    // Mode 2 → Mode 3 transition (80 cycles)
    ppu.step(80);
    expect(ppu.getCurrentMode()).toBe(PPUMode.PIXEL_TRANSFER);
    expect(ppu.getCurrentScanline()).toBe(0);

    // Mode 3 → Mode 0 transition (minimum 172 cycles)
    ppu.step(172);
    expect(ppu.getCurrentMode()).toBe(PPUMode.HBLANK);
    expect(ppu.getCurrentScanline()).toBe(0);

    // Complete scanline (456 total cycles)
    ppu.step(456 - 80 - 172);
    expect(ppu.getCurrentMode()).toBe(PPUMode.OAM_SEARCH);
    expect(ppu.getCurrentScanline()).toBe(1);
  });

  test('should generate VBlank interrupt at scanline 144', () => {
    let vblankInterruptRequested = false;

    // Mock interrupt system
    const mockInterruptHandler = {
      requestVBlankInterrupt: () => {
        vblankInterruptRequested = true;
      },
    };

    ppu.setInterruptHandler(mockInterruptHandler);

    // Fast-forward to scanline 143 end
    ppu.forceState({ scanline: 143, mode: PPUMode.HBLANK, scanlineCycle: 455 });

    // Step to scanline 144
    ppu.step(1);

    expect(ppu.getCurrentScanline()).toBe(144);
    expect(ppu.getCurrentMode()).toBe(PPUMode.VBLANK);
    expect(vblankInterruptRequested).toBe(true);
  });
});
```

#### PPU Rendering Testing

```typescript
describe('PPU Rendering', () => {
  test('should render solid color tile correctly', () => {
    // Setup solid white tile (color 3)
    const tileData = new Uint8Array([
      0xff,
      0xff, // Row 0: 11111111 (all pixels color 3)
      0xff,
      0xff, // Row 1: 11111111
      0xff,
      0xff, // Row 2: 11111111
      0xff,
      0xff, // Row 3: 11111111
      0xff,
      0xff, // Row 4: 11111111
      0xff,
      0xff, // Row 5: 11111111
      0xff,
      0xff, // Row 6: 11111111
      0xff,
      0xff, // Row 7: 11111111
    ]);

    mockVRAM.setVRAMData(0x0000, tileData); // Tile 0 data
    mockVRAM.setVRAMData(0x1800, new Uint8Array([0x00])); // Tile map entry

    // Configure PPU for rendering
    ppu.writeRegister(0xff40, 0x91); // LCDC: LCD on, BG on, tile data at 0x8000
    ppu.writeRegister(0xff47, 0xe4); // BGP: 3=black, 2=dark, 1=light, 0=white

    // Render scanline 0
    ppu.forceState({ scanline: 0, mode: PPUMode.PIXEL_TRANSFER, scanlineCycle: 80 });
    ppu.step(172); // Complete pixel transfer

    // Verify rendered pixels
    const frameBuffer = ppu.getFrameBuffer();
    for (let x = 0; x < 8; x++) {
      expect(frameBuffer[x]).toBe(0xff000000); // Black pixels (color 3 → palette 0)
    }
  });

  test('should handle sprite rendering with priority', () => {
    // Setup background tile (color 1)
    mockVRAM.setVRAMData(0x0000, new Uint8Array(16).fill(0x55)); // Color 1 pattern
    mockVRAM.setVRAMData(0x1800, new Uint8Array([0x00])); // BG tile map

    // Setup sprite tile (color 2)
    mockVRAM.setVRAMData(0x0010, new Uint8Array(16).fill(0xaa)); // Color 2 pattern

    // Setup sprite in OAM
    const spriteData = new Uint8Array([
      16,
      8,
      1,
      0x00, // Y=0, X=0, Tile=1, Attrs=priority 0
    ]);
    mockVRAM.setOAMData(0x00, spriteData);

    // Configure PPU
    ppu.writeRegister(0xff40, 0x93); // LCDC: LCD on, BG on, OBJ on
    ppu.writeRegister(0xff47, 0xe4); // BGP palette
    ppu.writeRegister(0xff48, 0xe4); // OBP0 palette

    // Render scanline with sprite
    ppu.renderScanline(0);

    // Verify sprite pixels override background
    const frameBuffer = ppu.getFrameBuffer();
    expect(frameBuffer[0]).toBe(0xff555555); // Sprite color 2
  });
});
```

#### PPU Memory Access Control Testing

```typescript
describe('PPU Memory Access Control', () => {
  test('should block CPU VRAM access during pixel transfer', () => {
    ppu.forceMode(PPUMode.PIXEL_TRANSFER);

    expect(ppu.isVRAMAccessible()).toBe(false);
    expect(ppu.isOAMAccessible()).toBe(false);

    // Verify blocked access returns 0xFF
    expect(ppu.readVRAM(0x8000)).toBe(0xff);
    expect(ppu.readOAM(0xfe00)).toBe(0xff);
  });

  test('should allow CPU access during HBLANK and VBLANK', () => {
    const modes = [PPUMode.HBLANK, PPUMode.VBLANK];

    modes.forEach(mode => {
      ppu.forceMode(mode);

      expect(ppu.isVRAMAccessible()).toBe(true);
      expect(ppu.isOAMAccessible()).toBe(true);

      // Verify actual memory access works
      mockVRAM.setVRAMData(0x0000, new Uint8Array([0x42]));
      expect(ppu.readVRAM(0x8000)).toBe(0x42);
    });
  });
});
```

### 3. Memory Controller Testing

#### Memory Controller Isolation

```typescript
/**
 * Mock cartridge for memory controller testing
 */
class MockCartridge implements CartridgeController {
  private romBanks: Uint8Array[] = [];
  private ramBanks: Uint8Array[] = [];
  private currentROMBank = 1;
  private currentRAMBank = 0;
  private ramEnabled = false;

  constructor(romData: Uint8Array) {
    // Split ROM into 16KB banks
    const bankCount = Math.ceil(romData.length / 0x4000);
    for (let i = 0; i < bankCount; i++) {
      const start = i * 0x4000;
      const end = Math.min(start + 0x4000, romData.length);
      this.romBanks[i] = romData.slice(start, end);
    }

    // Initialize RAM banks
    this.ramBanks = [new Uint8Array(0x2000)]; // 8KB RAM
  }

  readROM(address: u16): u8 {
    if (address < 0x4000) {
      return this.romBanks[0][address] || 0xff;
    } else {
      return this.romBanks[this.currentROMBank][address - 0x4000] || 0xff;
    }
  }

  writeROM(address: u16, value: u8): void {
    // Mock MBC1 banking
    if (address >= 0x2000 && address < 0x4000) {
      this.currentROMBank = Math.max(1, value & 0x1f);
    }
  }

  readRAM(address: u16): u8 {
    if (!this.ramEnabled) return 0xff;
    return this.ramBanks[this.currentRAMBank][address - 0xa000] || 0xff;
  }

  writeRAM(address: u16, value: u8): void {
    if (this.ramEnabled) {
      this.ramBanks[this.currentRAMBank][address - 0xa000] = value;
    }
  }

  // Testing utilities
  enableRAM(enabled: boolean): void {
    this.ramEnabled = enabled;
  }
  getCurrentROMBank(): u8 {
    return this.currentROMBank;
  }
  setROMBank(bank: u8): void {
    this.currentROMBank = bank;
  }

  // Implement other interface methods...
}
```

#### Memory Controller Testing

```typescript
describe('Memory Controller', () => {
  let memory: MemoryController;
  let mockCartridge: MockCartridge;
  let mockPPU: MockPPU;

  beforeEach(() => {
    const romData = new Uint8Array(0x8000); // 32KB ROM
    romData.fill(0x42, 0x0000, 0x4000); // Bank 0
    romData.fill(0x84, 0x4000, 0x8000); // Bank 1

    mockCartridge = new MockCartridge(romData);
    mockPPU = new MockPPU();
    memory = new MemoryController();

    memory.attachCartridge(mockCartridge);
    memory.connectPPU(mockPPU);
  });

  describe('Address Decoding', () => {
    test('should route ROM reads to cartridge', () => {
      expect(memory.read(0x0000)).toBe(0x42); // Bank 0
      expect(memory.read(0x4000)).toBe(0x84); // Bank 1
    });

    test('should handle WRAM access directly', () => {
      memory.write(0xc000, 0x55);
      expect(memory.read(0xc000)).toBe(0x55);

      memory.write(0xdfff, 0xaa);
      expect(memory.read(0xdfff)).toBe(0xaa);
    });

    test('should handle Echo RAM mirroring', () => {
      memory.write(0xc000, 0x33);
      expect(memory.read(0xe000)).toBe(0x33); // Echo mirror

      memory.write(0xe100, 0x77);
      expect(memory.read(0xc100)).toBe(0x77); // Reverse mirror
    });
  });

  describe('Access Restrictions', () => {
    test('should block VRAM access when PPU busy', () => {
      mockPPU.setMode(PPUMode.PIXEL_TRANSFER);

      const value = memory.read(0x8000);
      expect(value).toBe(0xff); // Blocked access
    });

    test('should allow VRAM access when PPU idle', () => {
      mockPPU.setMode(PPUMode.HBLANK);
      mockPPU.setVRAMData(0x0000, 0x99);

      const value = memory.read(0x8000);
      expect(value).toBe(0x99); // Normal access
    });
  });

  describe('Banking Operations', () => {
    test('should switch ROM banks via cartridge writes', () => {
      // Switch to bank 2 (if available)
      memory.write(0x2000, 0x02);
      expect(mockCartridge.getCurrentROMBank()).toBe(2);
    });

    test('should enable/disable external RAM', () => {
      // Enable RAM
      memory.write(0x0000, 0x0a);
      memory.write(0xa000, 0x55);
      expect(memory.read(0xa000)).toBe(0x55);

      // Disable RAM
      memory.write(0x0000, 0x00);
      expect(memory.read(0xa000)).toBe(0xff); // Blocked
    });
  });
});
```

### 4. System Integration Testing

#### Component Interaction Testing

```typescript
describe('System Integration', () => {
  let system: GameBoySystem;

  beforeEach(async () => {
    system = new GameBoySystem();
    await system.initialize();
  });

  test('should coordinate CPU and PPU timing correctly', () => {
    const cpu = system.getCPU();
    const ppu = system.getPPU();

    // Execute one CPU instruction (4 cycles)
    const cpuCycles = cpu.step();

    // Verify PPU advanced same amount
    expect(ppu.getCurrentCycle()).toBe(cpuCycles);

    // Verify system clock synchronized
    expect(system.getSystemClock().getCurrentCycle()).toBe(cpuCycles);
  });

  test('should handle VBlank interrupt timing', () => {
    const cpu = system.getCPU();
    const ppu = system.getPPU();

    // Enable VBlank interrupt
    cpu.setInterruptEnable(InterruptType.VBLANK);
    cpu.setInterruptMasterEnable(true);

    // Fast-forward to VBlank
    ppu.forceState({ scanline: 144, mode: PPUMode.VBLANK });

    // Process interrupt
    const cycles = cpu.processInterrupts();

    expect(cycles).toBe(20); // 5 M-cycles
    expect(cpu.getProgramCounter()).toBe(0x0040); // VBlank vector
  });

  test('should maintain frame timing accuracy', () => {
    const startCycle = system.getSystemClock().getCurrentCycle();

    // Execute complete frame
    system.stepFrame();

    const endCycle = system.getSystemClock().getCurrentCycle();
    const frameCycles = endCycle - startCycle;

    expect(frameCycles).toBe(70224); // Exact frame duration
  });
});
```

### 5. Hardware Test ROM Validation

#### Blargg Test Integration

```typescript
describe('Hardware Test ROM Validation', () => {
  let system: GameBoySystem;

  beforeEach(async () => {
    system = new GameBoySystem();
    await system.initialize();
  });

  test('should pass Blargg CPU instruction tests', async () => {
    // Load Blargg CPU test ROM
    const testROM = await loadTestROM('blargg/cpu_instrs.gb');
    await system.loadROM(testROM);

    // Run until test completion
    let cycles = 0;
    const maxCycles = 10000000; // 10M cycle timeout

    while (cycles < maxCycles && !isTestComplete(system)) {
      system.step();
      cycles++;
    }

    // Verify test passed
    const result = extractTestResult(system);
    expect(result.status).toBe('PASSED');
    expect(result.failedTests).toEqual([]);
  });

  test('should pass Blargg instruction timing tests', async () => {
    const testROM = await loadTestROM('blargg/instr_timing.gb');
    await system.loadROM(testROM);

    // Run timing test
    let testComplete = false;
    const startTime = performance.now();

    while (!testComplete && performance.now() - startTime < 5000) {
      system.step();
      testComplete = isTestComplete(system);
    }

    const result = extractTestResult(system);
    expect(result.status).toBe('PASSED');
    expect(result.timingErrors).toBe(0);
  });

  test('should pass Mealybug PPU tests', async () => {
    const testROM = await loadTestROM('mealybug/m3_bgp_change.gb');
    await system.loadROM(testROM);

    // Run until frame ready
    while (!system.getPPU().isFrameReady()) {
      system.step();
    }

    // Compare with expected baseline
    const actualFrame = system.getPPU().getFrameBuffer();
    const expectedFrame = await loadExpectedFrame('mealybug/m3_bgp_change.png');

    const pixelDifferences = compareFrames(actualFrame, expectedFrame);
    expect(pixelDifferences).toBe(0); // Pixel-perfect match required
  });
});

// Test utilities
function isTestComplete(system: GameBoySystem): boolean {
  // Check for test completion marker in serial output or memory
  const serialOutput = system.getSerialOutput();
  return serialOutput.includes('Passed') || serialOutput.includes('Failed');
}

function extractTestResult(system: GameBoySystem): TestResult {
  const serialOutput = system.getSerialOutput();

  if (serialOutput.includes('Passed')) {
    return { status: 'PASSED', failedTests: [], timingErrors: 0 };
  } else {
    return {
      status: 'FAILED',
      failedTests: parseFailedTests(serialOutput),
      timingErrors: parseTimingErrors(serialOutput),
    };
  }
}

function compareFrames(actual: Uint32Array, expected: Uint32Array): number {
  let differences = 0;
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      differences++;
    }
  }
  return differences;
}
```

## Mock Implementation Patterns

### 1. Comprehensive Mock Interfaces

#### Base Mock Pattern

```typescript
/**
 * Base mock class with common testing utilities
 */
abstract class BaseMock {
  protected callLog: Array<{ method: string; args: any[]; timestamp: number }> = [];

  protected logCall(method: string, ...args: any[]): void {
    this.callLog.push({
      method,
      args: [...args],
      timestamp: performance.now(),
    });
  }

  getCallLog(): Array<{ method: string; args: any[]; timestamp: number }> {
    return [...this.callLog];
  }

  clearCallLog(): void {
    this.callLog = [];
  }

  getCallCount(method: string): number {
    return this.callLog.filter(call => call.method === method).length;
  }

  wasMethodCalled(method: string): boolean {
    return this.callLog.some(call => call.method === method);
  }

  getLastCall(method: string): { method: string; args: any[]; timestamp: number } | null {
    const calls = this.callLog.filter(call => call.method === method);
    return calls.length > 0 ? calls[calls.length - 1] : null;
  }
}
```

#### Configurable Mock Behavior

```typescript
/**
 * Mock with configurable behavior for different test scenarios
 */
class ConfigurableMockMemory extends BaseMock implements MemoryController {
  private memory = new Map<u16, u8>();
  private accessRestrictions = new Set<u16>();
  private readBehavior: 'normal' | 'blocked' | 'random' = 'normal';

  // Configure mock behavior
  setReadBehavior(behavior: 'normal' | 'blocked' | 'random'): void {
    this.readBehavior = behavior;
  }

  blockAddress(address: u16): void {
    this.accessRestrictions.add(address);
  }

  unblockAddress(address: u16): void {
    this.accessRestrictions.delete(address);
  }

  read(address: u16): u8 {
    this.logCall('read', address);

    if (this.accessRestrictions.has(address)) {
      return 0xff;
    }

    switch (this.readBehavior) {
      case 'blocked':
        return 0xff;
      case 'random':
        return Math.floor(Math.random() * 256);
      case 'normal':
      default:
        return this.memory.get(address) || 0xff;
    }
  }

  write(address: u16, value: u8): void {
    this.logCall('write', address, value);

    if (!this.accessRestrictions.has(address)) {
      this.memory.set(address, value);
    }
  }

  // Test utilities
  setMemory(address: u16, value: u8): void {
    this.memory.set(address, value);
  }

  getMemorySnapshot(): Map<u16, u8> {
    return new Map(this.memory);
  }
}
```

### 2. State Verification Utilities

#### Component State Assertions

```typescript
/**
 * Utility functions for asserting component states
 */
class ComponentAssertions {
  static assertCPUState(cpu: CPU, expectedState: Partial<CPUState>): void {
    const actualState = cpu.getState();

    if (expectedState.registers) {
      Object.entries(expectedState.registers).forEach(([reg, value]) => {
        expect(actualState.registers[reg as keyof CPURegisters]).toBe(value);
      });
    }

    if (expectedState.interruptMasterEnable !== undefined) {
      expect(actualState.interruptMasterEnable).toBe(expectedState.interruptMasterEnable);
    }

    if (expectedState.halted !== undefined) {
      expect(actualState.halted).toBe(expectedState.halted);
    }
  }

  static assertPPUState(ppu: PPU, expectedState: Partial<PPUState>): void {
    const actualState = ppu.getState();

    if (expectedState.mode !== undefined) {
      expect(actualState.mode).toBe(expectedState.mode);
    }

    if (expectedState.scanline !== undefined) {
      expect(actualState.scanline).toBe(expectedState.scanline);
    }

    if (expectedState.lcdc !== undefined) {
      expect(actualState.lcdc).toBe(expectedState.lcdc);
    }
  }

  static assertMemoryPattern(memory: MemoryController, address: u16, pattern: u8[]): void {
    pattern.forEach((expectedByte, offset) => {
      const actualByte = memory.read(address + offset);
      expect(actualByte).toBe(expectedByte);
    });
  }
}
```

## Test Organization Strategies

### 1. Test Suite Structure

#### Hierarchical Test Organization

```
tests/
├── unit/
│   ├── cpu/
│   │   ├── instructions/
│   │   │   ├── arithmetic.test.ts
│   │   │   ├── load-store.test.ts
│   │   │   └── control-flow.test.ts
│   │   ├── interrupts.test.ts
│   │   ├── timing.test.ts
│   │   └── registers.test.ts
│   ├── ppu/
│   │   ├── modes.test.ts
│   │   ├── rendering.test.ts
│   │   ├── memory-access.test.ts
│   │   └── registers.test.ts
│   ├── memory/
│   │   ├── address-decoding.test.ts
│   │   ├── banking.test.ts
│   │   └── access-control.test.ts
│   └── cartridge/
│       ├── mbc1.test.ts
│       ├── mbc3.test.ts
│       └── header-parsing.test.ts
├── integration/
│   ├── cpu-ppu-timing.test.ts
│   ├── interrupt-coordination.test.ts
│   ├── memory-arbitration.test.ts
│   └── frame-timing.test.ts
├── hardware/
│   ├── blargg/
│   │   ├── cpu-instrs.test.ts
│   │   ├── instr-timing.test.ts
│   │   └── mem-timing.test.ts
│   └── mealybug/
│       ├── ppu-mode-timing.test.ts
│       ├── rendering-accuracy.test.ts
│       └── register-behavior.test.ts
└── performance/
    ├── cpu-benchmark.test.ts
    ├── ppu-rendering.test.ts
    └── memory-throughput.test.ts
```

### 2. Test Configuration and Utilities

#### Test Configuration

```typescript
/**
 * Global test configuration
 */
export const TestConfig = {
  // Timing tolerances
  TIMING_TOLERANCE_CYCLES: 0, // Zero tolerance for cycle accuracy
  FRAME_RATE_TOLERANCE: 0.1, // 0.1 FPS tolerance

  // Test execution limits
  MAX_TEST_CYCLES: 10000000, // 10M cycle limit for hardware tests
  MAX_TEST_TIME_MS: 10000, // 10 second timeout

  // Performance targets
  MIN_CPU_PERFORMANCE: 4000000, // 4MHz minimum
  MIN_FRAME_RATE: 58.0, // 58 FPS minimum

  // Hardware test ROM paths
  BLARGG_ROMS: {
    CPU_INSTRS: './tests/resources/blargg/cpu_instrs.gb',
    INSTR_TIMING: './tests/resources/blargg/instr_timing.gb',
    MEM_TIMING: './tests/resources/blargg/mem_timing.gb',
  },

  MEALYBUG_ROMS: {
    BGP_CHANGE: './tests/resources/mealybug/src/ppu/m3_bgp_change.gb',
    WINDOW_TIMING: './tests/resources/mealybug/src/ppu/m3_window_timing.gb',
  },
};
```

#### Custom Jest Matchers

```typescript
/**
 * Custom Jest matchers for Game Boy testing
 */
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveCycleCount(expected: number): R;
      toMatchFrameBuffer(expected: Uint32Array): R;
      toBeInCPUState(expected: Partial<CPUState>): R;
      toBeInPPUMode(expected: PPUMode): R;
    }
  }
}

expect.extend({
  toHaveCycleCount(received: { step(): number }, expected: number) {
    const actualCycles = received.step();
    const pass = actualCycles === expected;

    return {
      message: () => `Expected ${expected} cycles, but got ${actualCycles}`,
      pass,
    };
  },

  toMatchFrameBuffer(received: Uint32Array, expected: Uint32Array) {
    if (received.length !== expected.length) {
      return {
        message: () => `Frame buffer size mismatch: ${received.length} vs ${expected.length}`,
        pass: false,
      };
    }

    let differences = 0;
    for (let i = 0; i < received.length; i++) {
      if (received[i] !== expected[i]) {
        differences++;
      }
    }

    const pass = differences === 0;
    return {
      message: () => `Frame buffer differs in ${differences} pixels`,
      pass,
    };
  },
});
```

## Conclusion

These testing isolation strategies ensure comprehensive validation of the Game Boy DMG emulator while maintaining fast, reliable test execution. The key principles are:

1. **Component Isolation**: Each component tested independently through mocked dependencies
2. **Boundary Observation**: Tests verify observable side effects, not internal implementation
3. **Hardware Validation**: Integration tests verify accuracy against real hardware test ROMs
4. **Performance Verification**: Automated benchmarks ensure timing requirements are met
5. **Maintainable Structure**: Clear test organization and reusable mock patterns

By implementing these strategies systematically, the emulator achieves both comprehensive testing coverage and confidence in cycle-accurate Game Boy DMG emulation behavior.
