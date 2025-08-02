/**
 * MMU Component Test Suite
 *
 * Tests define behavioral contracts for Memory Management Unit implementation.
 * Follows strict TDD principles - tests written BEFORE implementation exists.
 * Tests focus on observable behavior at component boundaries, not internal implementation.
 *
 * Hardware References:
 * - Pan Docs: https://gbdev.io/pandocs/Memory_Map.html
 * - GB Dev Wiki: https://gbdev.gg8.se/wiki/articles/Memory_Bank_Controllers
 * - Blargg Test ROMs: /tests/resources/blargg/mem_timing.gb
 */

import { MMUComponent, CartridgeComponent, CartridgeHeader } from '../../../src/emulator/types';
import { MMU } from '../../../src/emulator/mmu';

describe('MMU Component', () => {
  let mmu: MMUComponent;

  beforeEach(() => {
    // This will fail until implementation exists - that's the RED phase
    mmu = new MMU();
  });

  afterEach(() => {
    if (mmu) {
      mmu.reset();
    }
  });

  describe('Basic Construction', () => {
    it('should be constructible', () => {
      // Test that MMU can be constructed
      expect(mmu).toBeDefined();
    });
  });

  describe('Basic Memory Access', () => {
    it('should read from WRAM region 0xC000', () => {
      // Test reading from WRAM (working memory)
      // Initially should return zero (memory initialized to zero)
      const value = mmu.readByte(0xc000);
      expect(value).toBe(0x00);
    });

    it('should write and read back from WRAM region', () => {
      // Test basic write/read functionality in WRAM
      mmu.writeByte(0xc000, 0x42);
      const value = mmu.readByte(0xc000);
      expect(value).toBe(0x42);
    });
  });

  describe('16-bit Word Operations (Little-Endian)', () => {
    it('should read 16-bit word from two consecutive bytes in little-endian order', () => {
      // Setup: Write low byte (0x34) then high byte (0x12) to consecutive addresses
      mmu.writeByte(0xc000, 0x34); // Low byte at base address
      mmu.writeByte(0xc001, 0x12); // High byte at base address + 1

      // Test: Read word should return 0x1234 (high byte in MSB, low byte in LSB)
      const word = mmu.readWord(0xc000);
      expect(word).toBe(0x1234);
    });

    it('should write 16-bit word to two consecutive bytes in little-endian order', () => {
      // Test: Write word 0xABCD should store low byte first, then high byte
      mmu.writeWord(0xc000, 0xabcd);

      // Verify: Low byte (0xCD) at base address, high byte (0xAB) at base address + 1
      expect(mmu.readByte(0xc000)).toBe(0xcd); // Low byte
      expect(mmu.readByte(0xc001)).toBe(0xab); // High byte
    });

    it('should handle word operations at address boundary 0xFFFF', () => {
      // Test: Word operations at boundary should wrap around to address 0x0000
      mmu.writeWord(0xffff, 0x1234);

      // Verify: Low byte at 0xFFFF, high byte wraps to 0x0000
      expect(mmu.readByte(0xffff)).toBe(0x34); // Low byte
      expect(mmu.readByte(0x0000)).toBe(0x12); // High byte wraps around

      // Test reading back the word
      const word = mmu.readWord(0xffff);
      expect(word).toBe(0x1234);
    });
  });

  describe('Echo RAM Mirroring (0xE000-0xFDFF)', () => {
    it('should mirror WRAM reads from Echo RAM region', () => {
      // Setup: Write to WRAM region
      mmu.writeByte(0xc123, 0x42);

      // Test: Reading from corresponding Echo RAM address should return same value
      // Echo RAM (0xE000-0xFDFF) mirrors WRAM (0xC000-0xDDFF)
      // Offset: 0xE123 - 0xE000 = 0x123, so maps to 0xC000 + 0x123 = 0xC123
      const echoValue = mmu.readByte(0xe123);
      expect(echoValue).toBe(0x42);
    });

    it('should mirror WRAM writes from Echo RAM region', () => {
      // Test: Write to Echo RAM region should modify corresponding WRAM location
      mmu.writeByte(0xe456, 0x99);

      // Verify: Reading from corresponding WRAM address should return same value
      // Offset: 0xE456 - 0xE000 = 0x456, so maps to 0xC000 + 0x456 = 0xC456
      const wramValue = mmu.readByte(0xc456);
      expect(wramValue).toBe(0x99);
    });
  });

  describe('Prohibited Memory Region (0xFEA0-0xFEFF)', () => {
    it('should return 0xFF for all reads from prohibited region', () => {
      // Test: Reading from prohibited region should always return 0xFF
      // regardless of what might be stored there
      expect(mmu.readByte(0xfea0)).toBe(0xff);
      expect(mmu.readByte(0xfeb5)).toBe(0xff);
      expect(mmu.readByte(0xfeff)).toBe(0xff);
    });

    it('should ignore all writes to prohibited region', () => {
      // Test: Writes to prohibited region should be ignored
      // and reads should still return 0xFF
      mmu.writeByte(0xfea0, 0x42);
      mmu.writeByte(0xfeb5, 0x99);
      mmu.writeByte(0xfeff, 0xaa);

      // Verify: Reads should still return 0xFF, not the written values
      expect(mmu.readByte(0xfea0)).toBe(0xff);
      expect(mmu.readByte(0xfeb5)).toBe(0xff);
      expect(mmu.readByte(0xfeff)).toBe(0xff);
    });

    it('should handle word read from prohibited region correctly', () => {
      // Test: Word read from prohibited region should return 0xFFFF
      const word = mmu.readWord(0xfea0);
      expect(word).toBe(0xffff);
    });
  });

  /**
   * BOOT ROM SYSTEM TESTS
   *
   * Tests the critical boot ROM overlay behavior for test ROM compatibility.
   * Boot ROM must overlay cartridge ROM in region 0x0000-0x00FF until disabled.
   *
   * Hardware Reference: Pan Docs - Boot ROM overlay behavior
   * Test ROM Requirement: Blargg and Mealybug ROMs expect proper boot sequence
   */
  describe('Boot ROM System (0x0000-0x00FF)', () => {
    // Mock boot ROM data for testing - represents actual DMG boot ROM pattern
    const mockBootROMData = new Uint8Array(256).fill(0).map((_, i) => {
      // Create recognizable pattern different from cartridge data
      return (0x31 + (i % 16)) & 0xff; // Pattern: 0x31, 0x32, ..., 0x40, repeating
    });

    // Mock cartridge ROM data that should be hidden by boot ROM initially
    const mockCartridgeROMData = new Uint8Array(32768).fill(0).map((_, i) => {
      // Create different pattern to verify boot ROM overlay works
      return (0xa0 + (i % 16)) & 0xff; // Pattern: 0xA0, 0xA1, ..., 0xAF, repeating
    });

    it('should have boot ROM overlay active immediately after construction', () => {
      // RED PHASE: This test will FAIL until boot ROM system is implemented
      // Test: MMU should start with boot ROM overlay enabled
      // Expected: Boot ROM data is returned instead of cartridge ROM data

      // First verify we have access to boot ROM overlay state
      expect(() => mmu.getSnapshot()).not.toThrow();

      const snapshot = mmu.getSnapshot();
      expect(snapshot).toHaveProperty('bootROMEnabled');
      expect(snapshot.bootROMEnabled).toBe(true);
    });

    it('should return boot ROM data from 0x0000-0x00FF when overlay is active', () => {
      // RED PHASE: This test will FAIL until boot ROM overlay reading is implemented
      // Test: Reading from boot ROM region should return boot ROM data, not cartridge data

      // Load mock cartridge with recognizable data
      const mockCartridge = createMockCartridge(mockCartridgeROMData);
      mmu.loadCartridge(mockCartridge);

      // Load mock boot ROM (this method doesn't exist yet - will drive implementation)
      expect(() => mmu.loadBootROM(mockBootROMData)).not.toThrow();

      // Verify boot ROM overlay is active
      expect(mmu.getSnapshot().bootROMEnabled).toBe(true);

      // Test: Reading from boot ROM region should return boot ROM data
      expect(mmu.readByte(0x0000)).toBe(0x31); // Boot ROM pattern, not cartridge
      expect(mmu.readByte(0x0010)).toBe(0x31); // Boot ROM pattern continues
      expect(mmu.readByte(0x00ff)).toBe(0x40); // Last byte of boot ROM pattern (0x31 + 15)

      // Test: Reading just outside boot ROM region should return cartridge data
      expect(mmu.readByte(0x0100)).toBe(0xa0); // Cartridge pattern starts here
    });

    it('should disable boot ROM overlay when 0xFF50 register is written to', () => {
      // RED PHASE: This test will FAIL until boot ROM disable mechanism is implemented
      // Test: Writing to 0xFF50 should disable boot ROM overlay permanently

      // Setup: Load both boot ROM and cartridge
      const mockCartridge = createMockCartridge(mockCartridgeROMData);
      mmu.loadCartridge(mockCartridge);
      mmu.loadBootROM(mockBootROMData);

      // Verify boot ROM is initially active
      expect(mmu.getSnapshot().bootROMEnabled).toBe(true);
      expect(mmu.readByte(0x0000)).toBe(0x31); // Boot ROM data

      // Test: Write to boot ROM disable register (any non-zero value disables)
      mmu.writeByte(0xff50, 0x01);

      // Verify: Boot ROM overlay should now be disabled
      const snapshot = mmu.getSnapshot();
      expect(snapshot.bootROMEnabled).toBe(false);

      // Verify: Now reading from 0x0000-0x00FF should return cartridge data
      expect(mmu.readByte(0x0000)).toBe(0xa0); // Cartridge data, not boot ROM
      expect(mmu.readByte(0x0010)).toBe(0xa0); // Cartridge pattern
      expect(mmu.readByte(0x00ff)).toBe(0xaf); // Cartridge pattern continues
    });

    it('should make boot ROM disable irreversible - cannot re-enable', () => {
      // RED PHASE: This test will FAIL until irreversible disable is implemented
      // Test: Once boot ROM is disabled, it cannot be re-enabled (hardware behavior)

      // Setup: Load boot ROM and cartridge
      const mockCartridge = createMockCartridge(mockCartridgeROMData);
      mmu.loadCartridge(mockCartridge);
      mmu.loadBootROM(mockBootROMData);

      // Disable boot ROM
      mmu.writeByte(0xff50, 0x01);
      expect(mmu.getSnapshot().bootROMEnabled).toBe(false);

      // Test: Attempting to write 0x00 to 0xFF50 should NOT re-enable boot ROM
      mmu.writeByte(0xff50, 0x00);
      expect(mmu.getSnapshot().bootROMEnabled).toBe(false);

      // Test: Reset should re-enable boot ROM (only way to get it back)
      mmu.reset();
      expect(mmu.getSnapshot().bootROMEnabled).toBe(true);
    });

    it('should handle word reads correctly across boot ROM disable boundary', () => {
      // RED PHASE: This test will FAIL until proper word read handling is implemented
      // Test: Word reads that span boot ROM and cartridge regions work correctly

      // Setup cartridge with specific pattern at boundary
      const cartridgeData = new Uint8Array(32768).fill(0);
      cartridgeData[0x00fe] = 0xee; // Low byte at boot ROM boundary
      cartridgeData[0x00ff] = 0xff; // High byte at boot ROM boundary
      cartridgeData[0x0100] = 0x01; // First byte after boot ROM
      cartridgeData[0x0101] = 0x02; // Second byte after boot ROM

      const mockCartridge = createMockCartridge(cartridgeData);
      mmu.loadCartridge(mockCartridge);

      // Create boot ROM with specific boundary pattern
      const bootData = new Uint8Array(256).fill(0);
      bootData[0x00fe] = 0xbe; // Boot ROM low byte
      bootData[0x00ff] = 0xef; // Boot ROM high byte
      mmu.loadBootROM(bootData);

      // Test: Word read from boot ROM region (both bytes from boot ROM)
      expect(mmu.readWord(0x00fe)).toBe(0xefbe); // Boot ROM data

      // Test: Word read across boundary (low from boot ROM, high from cartridge)
      expect(mmu.readWord(0x00ff)).toBe(0x01ef); // Mixed: boot ROM + cartridge

      // Disable boot ROM
      mmu.writeByte(0xff50, 0x01);

      // Test: Same reads now return cartridge data
      expect(mmu.readWord(0x00fe)).toBe(0xffee); // Cartridge data
      expect(mmu.readWord(0x00ff)).toBe(0x01ff); // Cartridge data
    });
  });

  /**
   * I/O REGISTER SYSTEM TESTS
   *
   * Tests critical I/O registers needed for test ROM execution.
   * Serial port registers enable test output capture.
   * Boot ROM control register enables proper boot sequence.
   *
   * Hardware Reference: Pan Docs - I/O Register specifications
   * Test ROM Requirement: Blargg ROMs output results via serial port
   */
  describe('I/O Register System (0xFF00-0xFF7F)', () => {
    it('should provide access to boot ROM control register (0xFF50)', () => {
      // RED PHASE: This test will FAIL until I/O register system is implemented
      // Test: 0xFF50 register should be readable and writable

      // Initial state: Boot ROM should be enabled (register reads as 0x00)
      expect(mmu.readByte(0xff50)).toBe(0x00);

      // Test: Writing non-zero value should disable boot ROM
      mmu.writeByte(0xff50, 0x01);
      expect(mmu.readByte(0xff50)).toBe(0x01);
      expect(mmu.getSnapshot().bootROMEnabled).toBe(false);

      // Test: Register should retain written value
      expect(mmu.readByte(0xff50)).toBe(0x01);
    });

    it('should provide access to serial data register (0xFF01)', () => {
      // RED PHASE: This test will FAIL until serial port registers are implemented
      // Test: Serial data register should be readable and writable
      // Critical for test ROM output capture

      // Test: Should be able to write and read back data
      mmu.writeByte(0xff01, 0x42);
      expect(mmu.readByte(0xff01)).toBe(0x42);

      // Test: Different values should work
      mmu.writeByte(0xff01, 0x99);
      expect(mmu.readByte(0xff01)).toBe(0x99);

      // Test: Should handle ASCII values (common in test ROM output)
      const testMessage = 'PASS';
      for (let i = 0; i < testMessage.length; i++) {
        const charCode = testMessage.charCodeAt(i);
        mmu.writeByte(0xff01, charCode);
        expect(mmu.readByte(0xff01)).toBe(charCode);
      }
    });

    it('should provide access to serial control register (0xFF02)', () => {
      // RED PHASE: This test will FAIL until serial control register is implemented
      // Test: Serial control register controls transfer initiation
      // Bit 7 set = start transfer, bit 0 = clock source

      // Test: Should be able to write and read control values
      mmu.writeByte(0xff02, 0x81); // Start transfer, internal clock
      expect(mmu.readByte(0xff02)).toBe(0x81);

      // Test: Should handle different control combinations
      mmu.writeByte(0xff02, 0x00); // No transfer, external clock
      expect(mmu.readByte(0xff02)).toBe(0x00);

      // Test: Transfer start bit behavior (simplified for MMU testing)
      mmu.writeByte(0xff01, 0x42); // Set data
      mmu.writeByte(0xff02, 0x81); // Start transfer
      // Note: Full transfer simulation would be handled by serial component
      // MMU just needs to store/retrieve register values correctly
    });

    it('should isolate I/O registers from other memory regions', () => {
      // RED PHASE: This test will FAIL until proper I/O register isolation is implemented
      // Test: I/O register writes should not affect other memory regions
      // Critical for preventing memory corruption

      // Setup: Write to WRAM region
      mmu.writeByte(0xc000, 0x11);
      expect(mmu.readByte(0xc000)).toBe(0x11);

      // Test: Writing to I/O registers should not affect WRAM
      mmu.writeByte(0xff01, 0x99);
      mmu.writeByte(0xff02, 0x81);
      mmu.writeByte(0xff50, 0x01);

      // Verify: WRAM data should be unchanged
      expect(mmu.readByte(0xc000)).toBe(0x11);

      // Verify: I/O registers should retain their values
      expect(mmu.readByte(0xff01)).toBe(0x99);
      expect(mmu.readByte(0xff02)).toBe(0x81);
      expect(mmu.readByte(0xff50)).toBe(0x01);
    });

    it('should handle undefined I/O register reads correctly', () => {
      // RED PHASE: This test will FAIL until undefined register handling is implemented
      // Test: Reading from unimplemented I/O registers should return 0xFF
      // Matches real hardware behavior for undefined registers

      // Test: Various undefined I/O register addresses
      expect(mmu.readByte(0xff03)).toBe(0xff); // Undefined register
      expect(mmu.readByte(0xff08)).toBe(0xff); // Undefined register
      expect(mmu.readByte(0xff15)).toBe(0xff); // Undefined register (sound)
      expect(mmu.readByte(0xff7f)).toBe(0xff); // Last I/O register slot

      // Test: Writing to undefined registers should be ignored
      mmu.writeByte(0xff03, 0x42);
      expect(mmu.readByte(0xff03)).toBe(0xff); // Should still return 0xFF
    });

    it('should reset I/O registers to default values on reset', () => {
      // RED PHASE: This test will FAIL until I/O register reset is implemented
      // Test: Reset should restore I/O registers to initial state

      // Setup: Modify I/O registers from default state
      mmu.writeByte(0xff01, 0x99);
      mmu.writeByte(0xff02, 0x81);
      mmu.writeByte(0xff50, 0x01); // Disable boot ROM

      // Verify modified state
      expect(mmu.readByte(0xff01)).toBe(0x99);
      expect(mmu.readByte(0xff02)).toBe(0x81);
      expect(mmu.readByte(0xff50)).toBe(0x01);
      expect(mmu.getSnapshot().bootROMEnabled).toBe(false);

      // Test: Reset should restore defaults
      mmu.reset();

      // Verify: Registers should return to initial state
      expect(mmu.readByte(0xff01)).toBe(0x00); // Serial data cleared
      expect(mmu.readByte(0xff02)).toBe(0x00); // Serial control cleared
      expect(mmu.readByte(0xff50)).toBe(0x00); // Boot ROM re-enabled
      expect(mmu.getSnapshot().bootROMEnabled).toBe(true);
    });
  });

  /**
   * ROM LOADING AND BANKING SYSTEM TESTS
   *
   * Tests cartridge ROM integration and bank switching for MBC compatibility.
   * ROM Bank 0 is fixed, Bank 1+ are switchable via MBC registers.
   * Critical for multi-bank ROM execution and test ROM compatibility.
   *
   * Hardware Reference: GB Dev Wiki - Memory Bank Controllers
   * Test ROM Requirement: Large ROMs use banking for code/data access
   */
  describe('ROM Loading and Banking System', () => {
    it('should access ROM Bank 0 (0x0000-0x3FFF) when cartridge is loaded', () => {
      // RED PHASE: This test will FAIL until ROM Bank 0 access is implemented
      // Test: Fixed ROM bank should be accessible immediately after cartridge load

      // Create cartridge with recognizable Bank 0 pattern
      const romData = new Uint8Array(65536); // 4 banks (256KB)
      for (let i = 0; i < 16384; i++) {
        // Bank 0: 0x0000-0x3FFF
        romData[i] = (0x10 + (i % 16)) & 0xff; // Pattern: 0x10-0x1F repeating
      }

      const mockCartridge = createMockCartridge(romData);

      // Test: Loading cartridge should enable ROM Bank 0 access
      mmu.loadCartridge(mockCartridge);

      // Verify: Can read from ROM Bank 0 region (boot ROM disabled for this test)
      mmu.writeByte(0xff50, 0x01); // Disable boot ROM to access cartridge

      expect(mmu.readByte(0x0000)).toBe(0x10); // Bank 0 pattern start
      expect(mmu.readByte(0x0010)).toBe(0x10); // Pattern repeats
      expect(mmu.readByte(0x3fff)).toBe(0x1f); // Bank 0 pattern end
    });

    it('should access ROM Bank 1 (0x4000-0x7FFF) by default', () => {
      // RED PHASE: This test will FAIL until ROM Bank 1 access is implemented
      // Test: Switchable ROM bank should default to Bank 1

      // Create cartridge with different patterns per bank
      const romData = new Uint8Array(65536); // 4 banks

      // Bank 0 pattern (0x0000-0x3FFF)
      for (let i = 0; i < 16384; i++) {
        romData[i] = (0x10 + (i % 16)) & 0xff;
      }

      // Bank 1 pattern (0x4000-0x7FFF)
      for (let i = 16384; i < 32768; i++) {
        romData[i] = (0x20 + (i % 16)) & 0xff;
      }

      // Bank 2 pattern (0x8000-0xBFFF)
      for (let i = 32768; i < 49152; i++) {
        romData[i] = (0x30 + (i % 16)) & 0xff;
      }

      const mockCartridge = createMockCartridge(romData);
      mmu.loadCartridge(mockCartridge);

      // Test: Bank 1 should be accessible by default in switchable region
      expect(mmu.readByte(0x4000)).toBe(0x20); // Bank 1 pattern
      expect(mmu.readByte(0x4010)).toBe(0x20); // Pattern continues
      expect(mmu.readByte(0x7fff)).toBe(0x2f); // Bank 1 pattern end
    });

    it('should delegate MBC register writes to cartridge component', () => {
      // RED PHASE: This test will FAIL until MBC register delegation is implemented
      // Test: Writing to MBC control regions should be delegated to cartridge
      // This enables bank switching without MMU needing MBC-specific logic

      const mockCartridge = createMockCartridge(new Uint8Array(65536));

      // Track MBC register writes using spy
      const mbcWriteSpy = jest.spyOn(mockCartridge, 'writeMBCRegister');

      mmu.loadCartridge(mockCartridge);

      // Test: Writing to ROM bank select register (typical MBC1 behavior)
      mmu.writeByte(0x2000, 0x02); // Select ROM bank 2
      expect(mbcWriteSpy).toHaveBeenCalledWith(0x2000, 0x02);

      // Test: Writing to RAM enable register
      mmu.writeByte(0x0000, 0x0a); // Enable RAM
      expect(mbcWriteSpy).toHaveBeenCalledWith(0x0000, 0x0a);

      // Test: Writing to RAM bank select register
      mmu.writeByte(0x4000, 0x01); // Select RAM bank 1
      expect(mbcWriteSpy).toHaveBeenCalledWith(0x4000, 0x01);

      // Verify: All MBC writes were delegated correctly
      expect(mbcWriteSpy).toHaveBeenCalledTimes(3);
    });

    it('should reflect cartridge bank switching in memory reads', () => {
      // RED PHASE: This test will FAIL until cartridge banking integration is implemented
      // Test: MMU should return current bank data as determined by cartridge

      // Create multi-bank ROM with distinct patterns
      const romData = new Uint8Array(65536); // 4 banks

      // Bank 0 pattern (0x0000-0x3FFF) - fixed bank
      for (let i = 0; i < 16384; i++) {
        romData[i] = (0x10 + (i % 16)) & 0xff; // Pattern: 0x10-0x1F repeating
      }

      // Bank 1 pattern (default)
      for (let i = 16384; i < 32768; i++) {
        romData[i] = 0x11;
      }

      // Bank 2 pattern
      for (let i = 32768; i < 49152; i++) {
        romData[i] = 0x22;
      }

      // Bank 3 pattern
      for (let i = 49152; i < 65536; i++) {
        romData[i] = 0x33;
      }

      const mockCartridge = createMockCartridge(romData);
      mmu.loadCartridge(mockCartridge);

      // Test: Initially should read Bank 1 data
      expect(mmu.readByte(0x4000)).toBe(0x11);

      // Test: Simulate cartridge switching to Bank 2
      mockCartridge.switchToBank(2);
      expect(mmu.readByte(0x4000)).toBe(0x22);

      // Test: Switch to Bank 3
      mockCartridge.switchToBank(3);
      expect(mmu.readByte(0x4000)).toBe(0x33);

      // Test: Bank 0 region should remain unchanged during bank switches
      mmu.writeByte(0xff50, 0x01); // Disable boot ROM
      expect(mmu.readByte(0x0000)).toBe(0x10); // Bank 0 data unchanged
    });

    it('should handle cartridge RAM access when enabled', () => {
      // RED PHASE: This test will FAIL until cartridge RAM delegation is implemented
      // Test: External RAM region should delegate to cartridge component

      const mockCartridge = createMockCartridge(new Uint8Array(32768));
      mmu.loadCartridge(mockCartridge);

      // Setup: Enable cartridge RAM
      mmu.writeByte(0x0000, 0x0a); // Standard RAM enable command

      // Test: Reading from external RAM should delegate to cartridge
      const ramReadSpy = jest.spyOn(mockCartridge, 'readRAM');
      mmu.readByte(0xa000);
      expect(ramReadSpy).toHaveBeenCalledWith(0xa000 - 0xa000); // Offset within RAM region

      // Test: Writing to external RAM should delegate to cartridge
      const ramWriteSpy = jest.spyOn(mockCartridge, 'writeRAM');
      mmu.writeByte(0xa000, 0x42);
      expect(ramWriteSpy).toHaveBeenCalledWith(0xa000 - 0xa000, 0x42);
    });

    it('should return 0xFF for ROM regions when no cartridge is loaded', () => {
      // RED PHASE: This test will FAIL until undefined cartridge handling is implemented
      // Test: Reading from cartridge regions without cartridge should return 0xFF
      // Matches hardware behavior when no cartridge is inserted

      // Ensure no cartridge is loaded
      mmu.loadCartridge(undefined);

      // Disable boot ROM to test cartridge region access
      mmu.writeByte(0xff50, 0x01);

      // Test: ROM regions should return 0xFF
      expect(mmu.readByte(0x0000)).toBe(0xff); // ROM Bank 0
      expect(mmu.readByte(0x3fff)).toBe(0xff); // ROM Bank 0 end
      expect(mmu.readByte(0x4000)).toBe(0xff); // ROM Bank 1
      expect(mmu.readByte(0x7fff)).toBe(0xff); // ROM Bank 1 end

      // Test: External RAM region should return 0xFF
      expect(mmu.readByte(0xa000)).toBe(0xff); // Cartridge RAM
      expect(mmu.readByte(0xbfff)).toBe(0xff); // Cartridge RAM end

      // Test: Writes to cartridge regions should be ignored
      expect(() => mmu.writeByte(0x2000, 0x42)).not.toThrow();
      expect(() => mmu.writeByte(0xa000, 0x99)).not.toThrow();
    });

    it('should track current ROM and RAM bank state in snapshot', () => {
      // RED PHASE: This test will FAIL until banking state tracking is implemented
      // Test: MMU snapshot should reflect current banking state for debugging

      const mockCartridge = createMockCartridge(new Uint8Array(65536));
      mmu.loadCartridge(mockCartridge);

      // Test: Initial banking state
      let snapshot = mmu.getSnapshot();
      expect(snapshot).toHaveProperty('currentROMBank');
      expect(snapshot).toHaveProperty('currentRAMBank');
      expect(snapshot).toHaveProperty('ramEnabled');

      expect(snapshot.currentROMBank).toBe(1); // Default ROM bank
      expect(snapshot.currentRAMBank).toBe(0); // Default RAM bank
      expect(snapshot.ramEnabled).toBe(false); // RAM disabled by default

      // Test: Banking state changes should be reflected via MBC register writes
      mmu.writeByte(0x0000, 0x0a); // Enable RAM (write 0x0A to 0x0000-0x1FFF)
      mmu.writeByte(0x2000, 0x02); // Switch to ROM bank 2 (write to 0x2000-0x3FFF)
      mmu.writeByte(0x4000, 0x01); // Switch to RAM bank 1 (write to 0x4000-0x5FFF)

      snapshot = mmu.getSnapshot();
      expect(snapshot.currentROMBank).toBe(2);
      expect(snapshot.currentRAMBank).toBe(1);
      expect(snapshot.ramEnabled).toBe(true);
    });
  });
});

/**
 * MOCK UTILITIES FOR TDD TESTING
 *
 * These mocks focus on testing MMU behavior at proper encapsulation boundaries.
 * They simulate cartridge component behavior without testing cartridge internals.
 *
 * ARCHITECTURAL COMPLIANCE:
 * - Test observable behavior only (memory reads/writes)
 * - Mock cartridge interface methods properly
 * - Don't expose internal cartridge state
 * - Enable proper delegation testing
 */

/**
 * Extended mock cartridge interface for testing
 */
interface MockCartridgeComponent extends CartridgeComponent {
  // Test utility methods
  switchToBank(bank: number): void;
  enableRAM(): void;
  switchRAMBank(bank: number): void;
}

/**
 * Create mock cartridge component for testing MMU integration
 * Simulates real cartridge behavior without implementation complexity
 */
function createMockCartridge(romData: Uint8Array): jest.Mocked<MockCartridgeComponent> {
  // Simple banking state for testing
  let currentROMBank = 1;
  let currentRAMBank = 0;
  let ramEnabled = false;
  const ramData = new Uint8Array(32768); // 4 banks of 8KB each

  const mockCartridge = {
    // EmulatorComponent interface
    reset: jest.fn(() => {
      currentROMBank = 1;
      currentRAMBank = 0;
      ramEnabled = false;
      ramData.fill(0);
    }),

    // CartridgeComponent interface
    readROM: jest.fn((address: number): number => {
      if (address < 0x4000) {
        // ROM Bank 0 (fixed)
        return romData[address] || 0xff;
      } else {
        // ROM Bank N (switchable)
        const bankOffset = currentROMBank * 0x4000;
        const romAddress = bankOffset + (address - 0x4000);
        return romData[romAddress] || 0xff;
      }
    }),

    readRAM: jest.fn((address: number): number => {
      if (!ramEnabled) return 0xff;
      const bankOffset = currentRAMBank * 0x2000;
      return ramData[bankOffset + address] || 0xff;
    }),

    writeRAM: jest.fn((address: number, value: number): void => {
      if (!ramEnabled) return;
      const bankOffset = currentRAMBank * 0x2000;
      ramData[bankOffset + address] = value & 0xff;
    }),

    writeMBCRegister: jest.fn((address: number, value: number): void => {
      // Simplified MBC1-like behavior for testing
      if (address >= 0x0000 && address <= 0x1fff) {
        // RAM enable
        ramEnabled = (value & 0x0f) === 0x0a;
      } else if (address >= 0x2000 && address <= 0x3fff) {
        // ROM bank select (lower 5 bits)
        currentROMBank = Math.max(1, value & 0x1f);
      } else if (address >= 0x4000 && address <= 0x5fff) {
        // RAM bank select or upper ROM bank bits
        currentRAMBank = value & 0x03;
      }
    }),

    getHeader: jest.fn(
      (): CartridgeHeader => ({
        title: 'TEST ROM',
        mbcType: 1, // MBC1
        romSize: romData.length,
        ramSize: ramData.length,
        checksumValid: true,
      })
    ),

    // Test utilities (not part of interface)
    switchToBank: jest.fn((bank: number) => {
      currentROMBank = bank;
    }),

    enableRAM: jest.fn(() => {
      ramEnabled = true;
    }),

    switchRAMBank: jest.fn((bank: number) => {
      currentRAMBank = bank;
    }),
  } as unknown as jest.Mocked<MockCartridgeComponent>;

  return mockCartridge;
}
