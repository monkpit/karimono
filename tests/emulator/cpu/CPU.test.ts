/**
 * SM83 CPU Component Test Suite
 *
 * Tests define behavioral contracts for Sharp SM83 CPU implementation.
 * Follows strict TDD principles - tests written BEFORE implementation exists.
 * Tests focus on observable behavior at component boundaries, not internal implementation.
 *
 * REFACTOR NOTE: Some tests still use getRegisters() from CPUTestingComponent.
 * These will be progressively updated to use proper boundary observation patterns
 * as instruction implementations are added (LD (nn),A, etc.).
 *
 * Hardware References:
 * - Pan Docs: https://gbdev.io/pandocs/CPU_Registers_and_Flags.html
 * - GB Dev Wiki: https://gbdev.gg8.se/wiki/articles/CPU
 * - Opcodes Reference: /tests/resources/opcodes.json
 * - Hardware Test ROMs: /tests/resources/mealybug, /tests/resources/blargg
 */

import { CPUTestingComponent, MMUComponent } from '../../../src/emulator/types';
import { CPU } from '../../../src/emulator/cpu';
import { MMU } from '../../../src/emulator/mmu';

describe('SM83 CPU Component', () => {
  let cpu: CPUTestingComponent;
  let mmu: MMUComponent;

  beforeEach(() => {
    // RED PHASE: This will fail until implementation exists
    // Create MMU first as CPU depends on it for memory access
    mmu = new MMU();

    // CPU constructor should accept MMU dependency
    cpu = new CPU(mmu);

    // Set MMU to post-boot state for consistent test environment
    mmu.setPostBootState();
  });

  afterEach(() => {
    if (cpu) {
      cpu.reset();
    }
    if (mmu) {
      mmu.reset();
    }
  });

  describe('Basic Construction and State', () => {
    it('should be constructible with MMU dependency', () => {
      // RED PHASE: This test will FAIL until CPU class exists
      // Test: CPU should be constructible and accept MMU dependency
      expect(cpu).toBeDefined();
      expect(typeof cpu.step).toBe('function');
      expect(typeof cpu.getPC).toBe('function');
    });

    it('should initialize to post-boot hardware state', () => {
      // RED PHASE: This test will FAIL until register initialization is implemented
      // Test: CPU should initialize to documented DMG post-boot values
      // Hardware Reference: Pan Docs - DMG boot sequence results
      // Observe CPU state through boundary methods only

      // Test: Program counter should be at post-boot location
      expect(cpu.getPC()).toBe(0x0100); // DMG post-boot: PC = 0x0100 (after boot ROM)

      // Test: Flag states should match post-boot values
      expect(cpu.getZeroFlag()).toBe(true); // Z=1 in post-boot state
      expect(cpu.getSubtractFlag()).toBe(false); // N=0 in post-boot state
      expect(cpu.getHalfCarryFlag()).toBe(true); // H=1 in post-boot state
      expect(cpu.getCarryFlag()).toBe(true); // C=1 in post-boot state
    });

    it('should provide access to program counter independently', () => {
      // RED PHASE: This test will FAIL until PC access is implemented
      // Test: getPC() should return current program counter value
      expect(cpu.getPC()).toBe(0x0100); // Post-boot PC value
    });

    it('should implement RunnableComponent interface correctly', () => {
      // RED PHASE: This test will FAIL until lifecycle methods are implemented
      // Test: CPU should properly implement start/stop/isRunning lifecycle

      // Initial state: CPU should not be running
      expect(cpu.isRunning()).toBe(false);

      // Test: start() should set running state
      cpu.start();
      expect(cpu.isRunning()).toBe(true);

      // Test: stop() should clear running state
      cpu.stop();
      expect(cpu.isRunning()).toBe(false);

      // Test: reset() should also stop CPU
      cpu.start();
      cpu.reset();
      expect(cpu.isRunning()).toBe(false);
    });
  });

  /**
   * FLAG REGISTER CALCULATIONS
   *
   * Tests the critical flag register (F) bit layout and calculation behavior.
   * Flag register layout: Z(bit7), N(bit6), H(bit5), C(bit4), bits 3-0 unused (always 0)
   * Hardware accuracy is critical for proper instruction emulation.
   */
  describe('Flag Register Calculations', () => {
    it('should have correct flag register bit layout', () => {
      // RED PHASE: This test will FAIL until flag register utilities are implemented
      // Test: Flag register should follow hardware bit layout exactly
      // Observe flag states through individual flag access methods

      // Test: Flag access methods should reflect post-boot state
      // Using post-boot state: F = 0xB0 = 10110000b = Z=1, N=0, H=1, C=1
      expect(cpu.getZeroFlag()).toBe(true); // Z flag set (bit 7)
      expect(cpu.getSubtractFlag()).toBe(false); // N flag clear (bit 6)
      expect(cpu.getHalfCarryFlag()).toBe(true); // H flag set (bit 5)
      expect(cpu.getCarryFlag()).toBe(true); // C flag set (bit 4)
    });

    it('should provide flag state access methods', () => {
      // RED PHASE: This test will FAIL until flag access methods are implemented
      // Test: CPU should provide methods to check individual flag states
      // These methods are critical for instruction implementation and debugging

      // Note: Implementation should provide flag checking methods like:
      // cpu.getZeroFlag(), cpu.getSubtractFlag(), cpu.getHalfCarryFlag(), cpu.getCarryFlag()
      expect(typeof cpu.getZeroFlag).toBe('function');
      expect(typeof cpu.getSubtractFlag).toBe('function');
      expect(typeof cpu.getHalfCarryFlag).toBe('function');
      expect(typeof cpu.getCarryFlag).toBe('function');

      // Test initial post-boot flag states
      expect(cpu.getZeroFlag()).toBe(true); // Z=1 in post-boot state
      expect(cpu.getSubtractFlag()).toBe(false); // N=0 in post-boot state
      expect(cpu.getHalfCarryFlag()).toBe(true); // H=1 in post-boot state
      expect(cpu.getCarryFlag()).toBe(true); // C=1 in post-boot state
    });

    it('should calculate zero flag correctly for arithmetic results', () => {
      // RED PHASE: This test will FAIL until zero flag calculation is implemented
      // Test: Zero flag should be set when arithmetic result equals zero

      // Setup: Place test program in memory (ADD A,B that results in zero)
      // A=0x80, B=0x80 → A=0x00 (with carry), Z flag should be set
      mmu.writeByte(0x0100, 0x80); // ADD A,B instruction

      // Setup registers for zero result test
      cpu.setRegisterA(0x80);
      cpu.setRegisterB(0x80);

      // Execute ADD A,B
      cpu.step();

      // Verify: Zero flag should be set when result is zero
      expect(cpu.getZeroFlag()).toBe(true);
    });

    it('should calculate half-carry flag correctly for ADD operations', () => {
      // RED PHASE: This test will FAIL until half-carry calculation is implemented
      // Test: Half-carry flag should be set when carry occurs from bit 3 to bit 4

      // Setup: Test case that generates half-carry (0x0F + 0x01 = 0x10)
      mmu.writeByte(0x0100, 0x80); // ADD A,B instruction

      cpu.setRegisterA(0x0f);
      cpu.setRegisterB(0x01);

      // Execute ADD A,B
      cpu.step();

      // Verify: Half-carry flag should be set (carry from bit 3 to 4)
      expect(cpu.getHalfCarryFlag()).toBe(true);
    });

    it('should calculate carry flag correctly for ADD operations', () => {
      // RED PHASE: This test will FAIL until carry flag calculation is implemented
      // Test: Carry flag should be set when result exceeds 8-bit range

      // Setup: Test case that generates carry (0xFF + 0x01 = 0x00 with carry)
      mmu.writeByte(0x0100, 0x80); // ADD A,B instruction

      cpu.setRegisterA(0xff);
      cpu.setRegisterB(0x01);

      // Execute ADD A,B
      cpu.step();

      // Verify: Carry flag should be set, zero flag should be set
      expect(cpu.getCarryFlag()).toBe(true);
      expect(cpu.getZeroFlag()).toBe(true);
    });

    it('should clear subtract flag for ADD operations', () => {
      // RED PHASE: This test will FAIL until subtract flag handling is implemented
      // Test: Subtract flag should always be cleared for ADD operations

      // Setup: Any ADD operation should clear N flag
      mmu.writeByte(0x0100, 0x80); // ADD A,B instruction

      cpu.setRegisterA(0x05);
      cpu.setRegisterB(0x03);

      // Execute ADD A,B
      cpu.step();

      // Verify: Subtract flag should be clear for ADD
      expect(cpu.getSubtractFlag()).toBe(false);
    });
  });

  /**
   * INDIVIDUAL INSTRUCTION UNIT TESTS
   *
   * Tests for each required instruction from Product Owner specification.
   * Each test verifies exact hardware behavior including register effects,
   * flag calculations, cycle counts, and PC increments.
   */
  describe('Instruction Unit Tests', () => {
    describe('NOP (0x00) - No Operation', () => {
      it('should execute NOP instruction correctly', () => {
        // RED PHASE: This test will FAIL until NOP instruction is implemented
        // Test: NOP should increment PC and take 4 cycles, no other effects
        // Hardware Reference: opcodes.json - NOP: 1 byte, 4 cycles, no flag changes

        // Setup: Place NOP instruction at current PC
        mmu.writeByte(0x0100, 0x00); // NOP instruction

        const initialPC = cpu.getPC();
        // Execute NOP instruction
        const cyclesExecuted = cpu.step();

        // Verify: Only PC should change, 4 cycles executed
        expect(cpu.getPC()).toBe(initialPC + 1);
        expect(cyclesExecuted).toBe(4);

        // Verify: No flag changes (test individual flag states)
        expect(cpu.getZeroFlag()).toBe(true); // Should remain unchanged from post-boot
        expect(cpu.getSubtractFlag()).toBe(false); // Should remain unchanged from post-boot
        expect(cpu.getHalfCarryFlag()).toBe(true); // Should remain unchanged from post-boot
        expect(cpu.getCarryFlag()).toBe(true); // Should remain unchanged from post-boot
      });
    });

    describe('LD B,n8 (0x06) - Load 8-bit immediate into B register', () => {
      it('should load immediate 8-bit value into B register', () => {
        // RED PHASE: This test will FAIL until LD B,n8 instruction is implemented
        // Test: LD B,n8 should load next byte into B register
        // Hardware Reference: opcodes.json - LD B,n8: 2 bytes, 8 cycles, no flag changes

        // Setup: Place LD B,n8 instruction with immediate value
        mmu.writeByte(0x0100, 0x06); // LD B,n8 instruction
        mmu.writeByte(0x0101, 0x42); // Immediate value n8 = 0x42

        const initialPC = cpu.getPC();

        // Execute LD B,n8 instruction
        const cyclesExecuted = cpu.step();

        // Verify: B register loaded with immediate value, PC advanced by 2
        // Observe B register through LD B,(HL) + LD (nn),B pattern
        // Setup HL to point to a memory location, then LD (nn),B to observe B
        cpu.setRegisterH(0xc0);
        cpu.setRegisterL(0x00);

        // Setup LD (nn),B instruction to write B to memory for observation
        mmu.writeByte(0x0102, 0x70); // LD (HL),B instruction

        // Execute LD (HL),B to write B register to memory
        cpu.step();

        // Verify B register value through memory observation
        expect(mmu.readByte(0xc000)).toBe(0x42);
        expect(cpu.getPC()).toBe(initialPC + 3); // PC should be at 0x0103 now
        expect(cyclesExecuted).toBe(8);

        // Verify: No flag changes (all flags should remain unchanged)
        const flags = cpu.getRegisters().f;
        expect(flags).toBe(0xb0); // Post-boot flag state unchanged
      });

      it('should handle loading zero value correctly', () => {
        // RED PHASE: This test will FAIL until edge case handling is implemented
        // Test: Loading zero should work correctly and not affect flags

        mmu.writeByte(0x0100, 0x06); // LD B,n8 instruction
        mmu.writeByte(0x0101, 0x00); // Immediate value n8 = 0x00

        cpu.step();

        expect(cpu.getRegisters().b).toBe(0x00);
        expect(cpu.getRegisters().f).toBe(0xb0); // Flags unchanged
      });

      it('should handle loading maximum value correctly', () => {
        // RED PHASE: This test will FAIL until boundary value handling is implemented
        // Test: Loading 0xFF should work correctly

        mmu.writeByte(0x0100, 0x06); // LD B,n8 instruction
        mmu.writeByte(0x0101, 0xff); // Immediate value n8 = 0xFF

        cpu.step();

        expect(cpu.getRegisters().b).toBe(0xff);
        expect(cpu.getRegisters().f).toBe(0xb0); // Flags unchanged
      });
    });

    describe('LD C,n8 (0x0E) - Load 8-bit immediate into C register', () => {
      it('should load immediate 8-bit value into C register', () => {
        // RED PHASE: This test will FAIL until LD C,n8 instruction is implemented
        // Test: LD C,n8 should load next byte into C register
        // Hardware Reference: opcodes.json - LD C,n8: 2 bytes, 8 cycles, no flag changes

        // Setup: Place LD C,n8 instruction with immediate value
        mmu.writeByte(0x0100, 0x0e); // LD C,n8 instruction
        mmu.writeByte(0x0101, 0x99); // Immediate value n8 = 0x99

        const initialPC = cpu.getPC();

        // Execute LD C,n8 instruction
        const cyclesExecuted = cpu.step();

        // Verify: C register loaded with immediate value, PC advanced by 2
        expect(cpu.getRegisters().c).toBe(0x99);
        expect(cpu.getPC()).toBe(initialPC + 2);
        expect(cyclesExecuted).toBe(8);

        // Verify: No flag changes
        expect(cpu.getRegisters().f).toBe(0xb0);
      });

      it('should not affect other registers during load', () => {
        // RED PHASE: This test will FAIL until register isolation is implemented
        // Test: Loading C should not affect other registers

        const initialRegisters = cpu.getRegisters();

        mmu.writeByte(0x0100, 0x0e); // LD C,n8 instruction
        mmu.writeByte(0x0101, 0x77); // Immediate value

        cpu.step();

        const finalRegisters = cpu.getRegisters();
        expect(finalRegisters.a).toBe(initialRegisters.a);
        expect(finalRegisters.b).toBe(initialRegisters.b);
        expect(finalRegisters.c).toBe(0x77); // Only C should change
        expect(finalRegisters.d).toBe(initialRegisters.d);
        expect(finalRegisters.e).toBe(initialRegisters.e);
        expect(finalRegisters.h).toBe(initialRegisters.h);
        expect(finalRegisters.l).toBe(initialRegisters.l);
        expect(finalRegisters.sp).toBe(initialRegisters.sp);
        expect(finalRegisters.f).toBe(initialRegisters.f);
      });
    });

    describe('ADD A,B (0x80) - Add B to A', () => {
      it('should add B register to A register with correct flag handling', () => {
        // RED PHASE: This test will FAIL until ADD A,B instruction is implemented
        // Test: ADD A,B should add B to A and set flags correctly
        // Hardware Reference: opcodes.json - ADD A,B: 1 byte, 4 cycles, sets Z,N,H,C flags

        // Setup: Place ADD A,B instruction
        mmu.writeByte(0x0100, 0x80); // ADD A,B instruction

        // Setup registers for basic addition test (5 + 3 = 8)
        cpu.setRegisterA(0x05);
        cpu.setRegisterB(0x03);

        const initialPC = cpu.getPC();

        // Execute ADD A,B instruction
        const cyclesExecuted = cpu.step();

        // Verify: A = A + B, PC incremented, correct cycles
        // Observe A register through memory: LD (0xC001),A
        mmu.writeByte(0x0101, 0xea); // LD (nn),A instruction
        mmu.writeByte(0x0102, 0x01); // Low byte of address 0xC001
        mmu.writeByte(0x0103, 0xc0); // High byte of address 0xC001

        // Execute LD (0xC001),A to write result to memory
        cpu.step();

        // Verify result through memory read
        expect(mmu.readByte(0xc001)).toBe(0x08);
        expect(cpu.getPC()).toBe(initialPC + 4); // ADD A,B (1 byte) + LD (a16),A (3 bytes) = 4 bytes total
        expect(cyclesExecuted).toBe(4);

        // Verify: Flags set correctly for this operation
        expect(cpu.getZeroFlag()).toBe(false); // Result is not zero
        expect(cpu.getSubtractFlag()).toBe(false); // ADD clears N flag
        expect(cpu.getHalfCarryFlag()).toBe(false); // No half-carry in this case
        expect(cpu.getCarryFlag()).toBe(false); // No carry in this case
      });

      it('should set zero flag when addition results in zero', () => {
        // RED PHASE: This test will FAIL until zero flag logic is implemented
        // Test: A + B = 0 should set zero flag

        mmu.writeByte(0x0100, 0x80); // ADD A,B instruction

        cpu.setRegisterA(0x80);
        cpu.setRegisterB(0x80);

        cpu.step();

        expect(cpu.getRegisters().a).toBe(0x00); // 0x80 + 0x80 = 0x00 (with carry)
        expect(cpu.getZeroFlag()).toBe(true);
        expect(cpu.getCarryFlag()).toBe(true);
      });

      it('should set half-carry flag correctly', () => {
        // RED PHASE: This test will FAIL until half-carry logic is implemented
        // Test: Addition that causes carry from bit 3 to bit 4

        mmu.writeByte(0x0100, 0x80); // ADD A,B instruction

        cpu.setRegisterA(0x0f);
        cpu.setRegisterB(0x01);

        cpu.step();

        expect(cpu.getRegisters().a).toBe(0x10);
        expect(cpu.getHalfCarryFlag()).toBe(true);
        expect(cpu.getCarryFlag()).toBe(false);
      });

      it('should set carry flag when result exceeds 8-bit range', () => {
        // RED PHASE: This test will FAIL until carry flag logic is implemented
        // Test: Addition that exceeds 255 should set carry flag

        mmu.writeByte(0x0100, 0x80); // ADD A,B instruction

        cpu.setRegisterA(0xff);
        cpu.setRegisterB(0x01);

        cpu.step();

        expect(cpu.getRegisters().a).toBe(0x00);
        expect(cpu.getCarryFlag()).toBe(true);
      });
    });

    describe('ADD A,C (0x81) - Add C to A', () => {
      it('should add C register to A register with correct behavior', () => {
        // RED PHASE: This test will FAIL until ADD A,C instruction is implemented
        // Test: ADD A,C should behave identically to ADD A,B but use C register
        // Hardware Reference: opcodes.json - ADD A,C: 1 byte, 4 cycles, sets Z,N,H,C flags

        // Setup: Place ADD A,C instruction
        mmu.writeByte(0x0100, 0x81); // ADD A,C instruction

        // Setup registers (7 + 2 = 9)
        cpu.setRegisterA(0x07);
        cpu.setRegisterC(0x02);

        const initialPC = cpu.getPC();

        // Execute ADD A,C instruction
        const cyclesExecuted = cpu.step();

        // Verify: A = A + C, correct timing and PC increment
        expect(cpu.getRegisters().a).toBe(0x09);
        expect(cpu.getPC()).toBe(initialPC + 1);
        expect(cyclesExecuted).toBe(4);

        // Verify: Flags for normal addition
        expect(cpu.getZeroFlag()).toBe(false);
        expect(cpu.getSubtractFlag()).toBe(false);
        expect(cpu.getHalfCarryFlag()).toBe(false);
        expect(cpu.getCarryFlag()).toBe(false);
      });

      it('should not affect other registers during ADD A,C', () => {
        // RED PHASE: This test will FAIL until register isolation is implemented
        // Test: ADD A,C should only modify A register and flags

        mmu.writeByte(0x0100, 0x81); // ADD A,C instruction

        const initialRegisters = cpu.getRegisters();
        cpu.setRegisterA(0x10);
        cpu.setRegisterC(0x05);

        cpu.step();

        const finalRegisters = cpu.getRegisters();
        expect(finalRegisters.a).toBe(0x15); // A modified
        expect(finalRegisters.b).toBe(initialRegisters.b); // B unchanged
        expect(finalRegisters.c).toBe(0x05); // C unchanged (source preserved)
        expect(finalRegisters.d).toBe(initialRegisters.d);
        expect(finalRegisters.e).toBe(initialRegisters.e);
        expect(finalRegisters.h).toBe(initialRegisters.h);
        expect(finalRegisters.l).toBe(initialRegisters.l);
        expect(finalRegisters.sp).toBe(initialRegisters.sp);
      });
    });

    describe('HALT (0x76) - Halt until interrupt', () => {
      it('should halt CPU execution until interrupt', () => {
        // RED PHASE: This test will FAIL until HALT instruction is implemented
        // Test: HALT should stop CPU execution but remain responsive to interrupts
        // Hardware Reference: opcodes.json - HALT: 1 byte, 4 cycles, no flag changes

        // Setup: Place HALT instruction
        mmu.writeByte(0x0100, 0x76); // HALT instruction

        const initialPC = cpu.getPC();

        // Execute HALT instruction
        const cyclesExecuted = cpu.step();

        // Verify: PC incremented normally, correct cycles, CPU enters halt state
        expect(cpu.getPC()).toBe(initialPC + 1);
        expect(cyclesExecuted).toBe(4);
        expect(cpu.isHalted()).toBe(true);

        // Verify: No flag changes during HALT
        expect(cpu.getRegisters().f).toBe(0xb0);
      });

      it('should remain halted on subsequent step() calls', () => {
        // RED PHASE: This test will FAIL until halt state persistence is implemented
        // Test: Once halted, CPU should remain halted until interrupt

        mmu.writeByte(0x0100, 0x76); // HALT instruction

        // Execute HALT
        cpu.step();
        expect(cpu.isHalted()).toBe(true);

        const haltedPC = cpu.getPC();

        // Test: Subsequent steps should not advance PC while halted
        cpu.step();
        expect(cpu.getPC()).toBe(haltedPC);
        expect(cpu.isHalted()).toBe(true);
      });

      it('should exit halt state when interrupt occurs', () => {
        // RED PHASE: This test will FAIL until interrupt handling is implemented
        // Test: HALT should exit when interrupt is triggered
        // Note: This is a simplified test - full interrupt system will be implemented later

        mmu.writeByte(0x0100, 0x76); // HALT instruction

        // Execute HALT
        cpu.step();
        expect(cpu.isHalted()).toBe(true);

        // Simulate interrupt (simplified for CPU testing)
        cpu.triggerInterrupt(0x40); // V-Blank interrupt

        // Test: CPU should exit halt state
        expect(cpu.isHalted()).toBe(false);
      });
    });

    describe('JP a16 (0xC3) - Jump to 16-bit address', () => {
      it('should jump to 16-bit immediate address', () => {
        // RED PHASE: This test will FAIL until JP a16 instruction is implemented
        // Test: JP a16 should set PC to immediate 16-bit address
        // Hardware Reference: opcodes.json - JP a16: 3 bytes, 16 cycles, no flag changes

        // Setup: Place JP a16 instruction with target address
        mmu.writeByte(0x0100, 0xc3); // JP a16 instruction
        mmu.writeByte(0x0101, 0x34); // Low byte of address (little-endian)
        mmu.writeByte(0x0102, 0x12); // High byte of address
        // Target address = 0x1234

        // Execute JP a16 instruction
        const cyclesExecuted = cpu.step();

        // Verify: PC set to target address, correct cycle count
        expect(cpu.getPC()).toBe(0x1234);
        expect(cyclesExecuted).toBe(4); // RGBDS GBZ80: JP nn takes 4 cycles

        // Verify: No flag changes during jump
        expect(cpu.getRegisters().f).toBe(0xb0);
      });

      it('should handle jump to zero address correctly', () => {
        // RED PHASE: This test will FAIL until edge case handling is implemented
        // Test: Jump to address 0x0000 should work correctly

        mmu.writeByte(0x0100, 0xc3); // JP a16 instruction
        mmu.writeByte(0x0101, 0x00); // Low byte
        mmu.writeByte(0x0102, 0x00); // High byte

        cpu.step();

        expect(cpu.getPC()).toBe(0x0000);
      });

      it('should handle jump to maximum address correctly', () => {
        // RED PHASE: This test will FAIL until boundary handling is implemented
        // Test: Jump to address 0xFFFF should work correctly

        mmu.writeByte(0x0100, 0xc3); // JP a16 instruction
        mmu.writeByte(0x0101, 0xff); // Low byte
        mmu.writeByte(0x0102, 0xff); // High byte

        cpu.step();

        expect(cpu.getPC()).toBe(0xffff);
      });

      it('should not affect any registers during jump', () => {
        // RED PHASE: This test will FAIL until register preservation is implemented
        // Test: JP should only affect PC, no other registers

        const initialRegisters = cpu.getRegisters();

        mmu.writeByte(0x0100, 0xc3); // JP a16 instruction
        mmu.writeByte(0x0101, 0x00); // Low byte
        mmu.writeByte(0x0102, 0x80); // High byte (target = 0x8000)

        cpu.step();

        const finalRegisters = cpu.getRegisters();
        expect(finalRegisters.a).toBe(initialRegisters.a);
        expect(finalRegisters.b).toBe(initialRegisters.b);
        expect(finalRegisters.c).toBe(initialRegisters.c);
        expect(finalRegisters.d).toBe(initialRegisters.d);
        expect(finalRegisters.e).toBe(initialRegisters.e);
        expect(finalRegisters.f).toBe(initialRegisters.f);
        expect(finalRegisters.h).toBe(initialRegisters.h);
        expect(finalRegisters.l).toBe(initialRegisters.l);
        expect(finalRegisters.sp).toBe(initialRegisters.sp);
        expect(finalRegisters.pc).toBe(0x8000); // Only PC changes
      });
    });
  });

  /**
   * CPU-MMU INTEGRATION TEST
   *
   * Tests complete CPU-MMU integration using a real program.
   * Implements the 2+2 arithmetic program as specified by Product Owner.
   * This test verifies that CPU can fetch, decode, and execute instructions
   * from memory while properly updating state.
   */
  describe('CPU-MMU Integration Test', () => {
    it('should execute complete 2+2 arithmetic program correctly', () => {
      // RED PHASE: This test will FAIL until complete CPU-MMU integration works
      // Test: CPU should execute multi-instruction program using MMU for memory access
      // Program: Load 2 into B, Load 2 into C, Add B to A, Add C to A, Halt
      // Expected result: A = 0 + 2 + 2 = 4

      // Program assembly:
      // 0x0100: LD B,0x02    ; Load 2 into B register
      // 0x0102: LD C,0x02    ; Load 2 into C register
      // 0x0104: ADD A,B      ; Add B to A (A = 0 + 2 = 2)
      // 0x0105: ADD A,C      ; Add C to A (A = 2 + 2 = 4)
      // 0x0106: HALT         ; Stop execution

      // Load program into memory via MMU
      mmu.writeByte(0x0100, 0x06); // LD B,n8
      mmu.writeByte(0x0101, 0x02); // Immediate value 2
      mmu.writeByte(0x0102, 0x0e); // LD C,n8
      mmu.writeByte(0x0103, 0x02); // Immediate value 2
      mmu.writeByte(0x0104, 0x80); // ADD A,B
      mmu.writeByte(0x0105, 0x81); // ADD A,C
      mmu.writeByte(0x0106, 0x76); // HALT

      // Set A register to 0 for clean arithmetic
      cpu.setRegisterA(0x00);

      // Execute program step by step
      const stepResults = [];

      // Step 1: LD B,0x02
      stepResults.push(cpu.step());
      expect(cpu.getRegisters().b).toBe(0x02);
      expect(cpu.getPC()).toBe(0x0102);

      // Step 2: LD C,0x02
      stepResults.push(cpu.step());
      expect(cpu.getRegisters().c).toBe(0x02);
      expect(cpu.getPC()).toBe(0x0104);

      // Step 3: ADD A,B (A = 0 + 2 = 2)
      stepResults.push(cpu.step());
      expect(cpu.getRegisters().a).toBe(0x02);
      expect(cpu.getPC()).toBe(0x0105);

      // Step 4: ADD A,C (A = 2 + 2 = 4)
      stepResults.push(cpu.step());
      expect(cpu.getRegisters().a).toBe(0x04);
      expect(cpu.getPC()).toBe(0x0106);

      // Step 5: HALT
      stepResults.push(cpu.step());
      expect(cpu.isHalted()).toBe(true);
      expect(cpu.getPC()).toBe(0x0107);

      // Verify: Final state shows successful 2+2=4 calculation
      const finalState = cpu.getRegisters();
      expect(finalState.a).toBe(0x04); // Result: 2 + 2 = 4
      expect(finalState.b).toBe(0x02); // B register preserved
      expect(finalState.c).toBe(0x02); // C register preserved

      // Verify: Correct cycle counts for each instruction
      expect(stepResults[0]).toBe(8); // LD B,n8: 8 cycles
      expect(stepResults[1]).toBe(8); // LD C,n8: 8 cycles
      expect(stepResults[2]).toBe(4); // ADD A,B: 4 cycles
      expect(stepResults[3]).toBe(4); // ADD A,C: 4 cycles
      expect(stepResults[4]).toBe(4); // HALT: 4 cycles

      // Total cycles: 8 + 8 + 4 + 4 + 4 = 28 cycles
      const totalCycles = stepResults.reduce((sum, cycles) => sum + cycles, 0);
      expect(totalCycles).toBe(28);

      // Verify: Flags set correctly by final ADD operation
      expect(cpu.getZeroFlag()).toBe(false); // Result (4) is not zero
      expect(cpu.getSubtractFlag()).toBe(false); // ADD clears subtract flag
      expect(cpu.getHalfCarryFlag()).toBe(false); // No half-carry in 2+2
      expect(cpu.getCarryFlag()).toBe(false); // No carry in 2+2
    });

    it('should handle memory access patterns correctly during execution', () => {
      // RED PHASE: This test will FAIL until memory access tracking is implemented
      // Test: CPU should access memory in correct patterns during instruction execution

      // Setup: Simple program that exercises different memory access patterns
      mmu.writeByte(0x0100, 0x06); // LD B,n8 (reads opcode + immediate)
      mmu.writeByte(0x0101, 0xff); // Immediate value
      mmu.writeByte(0x0102, 0x80); // ADD A,B (reads opcode only)

      // Track memory read calls using spy
      const readSpy = jest.spyOn(mmu, 'readByte');

      // Execute first instruction: LD B,n8
      cpu.step();

      // Verify: CPU should read opcode at PC, then immediate at PC+1
      expect(readSpy).toHaveBeenCalledWith(0x0100); // Opcode fetch
      expect(readSpy).toHaveBeenCalledWith(0x0101); // Immediate fetch
      expect(readSpy).toHaveBeenCalledTimes(2);

      readSpy.mockClear();

      // Execute second instruction: ADD A,B
      cpu.step();

      // Verify: CPU should only read opcode (no immediate)
      expect(readSpy).toHaveBeenCalledWith(0x0102); // Opcode fetch only
      expect(readSpy).toHaveBeenCalledTimes(1);
    });

    it('should maintain correct timing across multi-instruction sequences', () => {
      // RED PHASE: This test will FAIL until accurate timing is implemented
      // Test: CPU should maintain accurate cycle timing across instruction sequences

      // Setup: Program with known cycle counts
      mmu.writeByte(0x0100, 0x00); // NOP (4 cycles)
      mmu.writeByte(0x0101, 0x06); // LD B,n8 (8 cycles)
      mmu.writeByte(0x0102, 0x42); // Immediate value
      mmu.writeByte(0x0103, 0x80); // ADD A,B (4 cycles)
      mmu.writeByte(0x0104, 0x76); // HALT (4 cycles)

      // Execute and track timing
      const timings = [];
      while (!cpu.isHalted()) {
        timings.push(cpu.step());
      }

      // Verify: Exact cycle counts for each instruction
      expect(timings).toEqual([4, 8, 4, 4]); // NOP, LD B,n8, ADD A,B, HALT

      // Total: 20 cycles
      const total = timings.reduce((sum, cycles) => sum + cycles, 0);
      expect(total).toBe(20);
    });
  });

  /**
   * REGISTER STATE MANAGEMENT TESTS
   *
   * Tests CPU register access and manipulation methods.
   * Verifies that register state can be set and retrieved correctly
   * for testing and debugging purposes.
   */
  describe('Register State Management', () => {
    it('should provide individual register setter methods for testing', () => {
      // RED PHASE: This test will FAIL until register setters are implemented
      // Test: CPU should provide methods to set individual registers for testing
      // These methods are critical for setting up test scenarios

      expect(typeof cpu.setRegisterA).toBe('function');
      expect(typeof cpu.setRegisterB).toBe('function');
      expect(typeof cpu.setRegisterC).toBe('function');
      expect(typeof cpu.setRegisterD).toBe('function');
      expect(typeof cpu.setRegisterE).toBe('function');
      expect(typeof cpu.setRegisterF).toBe('function');
      expect(typeof cpu.setRegisterH).toBe('function');
      expect(typeof cpu.setRegisterL).toBe('function');
      expect(typeof cpu.setStackPointer).toBe('function');
      expect(typeof cpu.setProgramCounter).toBe('function');
    });

    it('should set and retrieve individual registers correctly', () => {
      // RED PHASE: This test will FAIL until register manipulation is implemented
      // Test: Register setters should update state immediately

      cpu.setRegisterA(0x12);
      expect(cpu.getRegisters().a).toBe(0x12);

      cpu.setRegisterB(0x34);
      expect(cpu.getRegisters().b).toBe(0x34);

      cpu.setRegisterC(0x56);
      expect(cpu.getRegisters().c).toBe(0x56);

      cpu.setStackPointer(0x8000);
      expect(cpu.getRegisters().sp).toBe(0x8000);

      cpu.setProgramCounter(0x4000);
      expect(cpu.getPC()).toBe(0x4000);
    });

    it('should provide flag manipulation methods for testing', () => {
      // RED PHASE: This test will FAIL until flag setters are implemented
      // Test: CPU should provide methods to set individual flags for test setup

      expect(typeof cpu.setZeroFlag).toBe('function');
      expect(typeof cpu.setSubtractFlag).toBe('function');
      expect(typeof cpu.setHalfCarryFlag).toBe('function');
      expect(typeof cpu.setCarryFlag).toBe('function');
    });

    it('should set and retrieve individual flags correctly', () => {
      // RED PHASE: This test will FAIL until flag manipulation is implemented
      // Test: Flag setters should update F register bits correctly

      // Clear all flags first
      cpu.setRegisterF(0x00);

      // Set individual flags and verify
      cpu.setZeroFlag(true);
      expect(cpu.getZeroFlag()).toBe(true);
      expect(cpu.getRegisters().f & 0x80).toBe(0x80);

      cpu.setCarryFlag(true);
      expect(cpu.getCarryFlag()).toBe(true);
      expect(cpu.getRegisters().f & 0x10).toBe(0x10);

      // Clear individual flags and verify
      cpu.setZeroFlag(false);
      expect(cpu.getZeroFlag()).toBe(false);
      expect(cpu.getRegisters().f & 0x80).toBe(0x00);
    });

    it('should preserve lower 4 bits of F register during flag operations', () => {
      // Test: Lower 4 bits of F register are preserved during flag operations
      // This allows hardware-accurate behavior where undefined bits retain their values

      // Set all bits including lower 4 bits
      cpu.setRegisterF(0xff);
      expect(cpu.getRegisters().f & 0x0f).toBe(0x0f); // Lower 4 bits preserved

      // Verify upper 4 bits are also set correctly
      expect(cpu.getRegisters().f & 0xf0).toBe(0xf0);
    });
  });

  /**
   * ERROR HANDLING AND EDGE CASES
   *
   * Tests CPU behavior in error conditions and edge cases.
   * Ensures robust operation under invalid conditions.
   */
  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid opcode gracefully', () => {
      // RED PHASE: This test will FAIL until invalid opcode handling is implemented
      // Test: CPU should handle undefined opcodes without crashing

      // Place invalid opcode in memory (opcodes that don't exist in SM83)
      mmu.writeByte(0x0100, 0xd3); // Invalid opcode example

      // CPU should either:
      // 1. Throw specific error for invalid opcode, OR
      // 2. Handle gracefully with defined behavior
      expect(() => cpu.step()).toThrow('Invalid opcode: 0xD3');
    });

    it('should detect and handle infinite loops in test scenarios', () => {
      // RED PHASE: This test will FAIL until loop detection is implemented
      // Test: CPU should provide mechanism to detect infinite loops during testing

      // Create infinite loop: JP to self
      mmu.writeByte(0x0100, 0xc3); // JP a16
      mmu.writeByte(0x0101, 0x00); // Low byte of 0x0100
      mmu.writeByte(0x0102, 0x01); // High byte of 0x0100

      // Execute with step limit to prevent actual infinite loop
      let steps = 0;
      const maxSteps = 1000;

      while (steps < maxSteps && !cpu.isHalted()) {
        cpu.step();
        steps++;
      }

      // Verify: Loop was detected (PC keeps returning to same address)
      expect(steps).toBe(maxSteps);
      expect(cpu.getPC()).toBe(0x0100);
    });

    it('should reset to consistent state after any operation', () => {
      // RED PHASE: This test will FAIL until reset consistency is implemented
      // Test: reset() should always return CPU to exact same state

      // Execute some operations to modify state
      cpu.setRegisterA(0x99);
      cpu.setRegisterB(0x88);
      cpu.setProgramCounter(0x5000);
      cpu.setCarryFlag(true);
      cpu.start();

      // Reset CPU
      cpu.reset();

      // Verify: State matches fresh construction
      const resetRegisters = cpu.getRegisters();
      expect(resetRegisters.a).toBe(0x01); // Post-boot state
      expect(resetRegisters.b).toBe(0x00);
      expect(resetRegisters.c).toBe(0x13);
      expect(resetRegisters.pc).toBe(0x0100);
      expect(resetRegisters.f).toBe(0xb0);
      expect(cpu.isRunning()).toBe(false);
      expect(cpu.isHalted()).toBe(false);
    });

    describe('JP NZ,a16 (0xC2) - Conditional jump if not zero', () => {
      it('should jump when Z flag is clear (not zero condition true)', () => {
        // RED PHASE: This test will FAIL until JP NZ,a16 instruction is implemented
        // Test: JP NZ,a16 should jump when Z flag is clear (0)
        // Hardware Reference: RGBDS GBZ80 - JP cc,n16: 4 cycles taken, 3 cycles untaken
        // opcodes.json - JP NZ,a16: 3 bytes, [16, 12] cycles, condition check

        // Setup: Clear Z flag (set to not zero condition)
        cpu.setZeroFlag(false); // Clear Z flag for NZ condition

        // Place JP NZ,a16 instruction with target address
        mmu.writeByte(0x0100, 0xc2); // JP NZ,a16 instruction
        mmu.writeByte(0x0101, 0x34); // Low byte of address (little-endian)
        mmu.writeByte(0x0102, 0x12); // High byte of address
        // Target address = 0x1234

        // Execute JP NZ,a16 instruction
        const cyclesExecuted = cpu.step();

        // Verify: PC set to target address (jump taken), correct cycle count
        expect(cpu.getPC()).toBe(0x1234);
        expect(cyclesExecuted).toBe(4); // RGBDS GBZ80: JP taken takes 4 cycles

        // Verify: No flag changes during conditional jump
        expect(cpu.getZeroFlag()).toBe(false);
      });

      it('should not jump when Z flag is set (not zero condition false)', () => {
        // RED PHASE: This test will FAIL until conditional logic is implemented
        // Test: JP NZ,a16 should not jump when Z flag is set (1)

        // Setup: Clear all flags, then set only Z flag (zero condition - NZ is false)
        cpu.setSubtractFlag(false);
        cpu.setHalfCarryFlag(false);
        cpu.setCarryFlag(false);
        cpu.setZeroFlag(true); // Set Z flag to make NZ condition false

        // Place JP NZ,a16 instruction with target address
        mmu.writeByte(0x0100, 0xc2); // JP NZ,a16 instruction
        mmu.writeByte(0x0101, 0x34); // Low byte of address
        mmu.writeByte(0x0102, 0x12); // High byte of address

        // Execute JP NZ,a16 instruction
        const cyclesExecuted = cpu.step();

        // Verify: PC continues to next instruction (jump not taken), correct cycle count
        expect(cpu.getPC()).toBe(0x0103); // PC should be at next instruction
        expect(cyclesExecuted).toBe(3); // RGBDS GBZ80: JP not taken takes 3 cycles

        // Verify: No flag changes during conditional jump
        expect(cpu.getZeroFlag()).toBe(true);
        expect(cpu.getSubtractFlag()).toBe(false);
        expect(cpu.getHalfCarryFlag()).toBe(false);
        expect(cpu.getCarryFlag()).toBe(false);
      });

      it('should handle edge case flags correctly', () => {
        // RED PHASE: This test will FAIL until flag handling is implemented
        // Test: JP NZ should only check Z flag, ignore other flags

        // Setup: Clear Z flag but set other flags
        cpu.setZeroFlag(false);
        cpu.setSubtractFlag(true);
        cpu.setHalfCarryFlag(true);
        cpu.setCarryFlag(true);

        mmu.writeByte(0x0100, 0xc2); // JP NZ,a16 instruction
        mmu.writeByte(0x0101, 0x00); // Target address 0x8000
        mmu.writeByte(0x0102, 0x80);

        const cyclesExecuted = cpu.step();

        // Verify: Jump taken because Z=0 (regardless of other flags)
        expect(cpu.getPC()).toBe(0x8000);
        expect(cyclesExecuted).toBe(4); // RGBDS GBZ80: JP taken takes 4 cycles
        // Verify: No flag changes - only Z should be false, others true
        expect(cpu.getZeroFlag()).toBe(false);
        expect(cpu.getSubtractFlag()).toBe(true);
        expect(cpu.getHalfCarryFlag()).toBe(true);
        expect(cpu.getCarryFlag()).toBe(true);
      });
    });

    describe('JP Z,a16 (0xCA) - Conditional jump if zero', () => {
      it('should jump when Z flag is set (zero condition true)', () => {
        // RED PHASE: This test will FAIL until JP Z,a16 instruction is implemented
        // Test: JP Z,a16 should jump when Z flag is set (1)
        // Hardware Reference: RGBDS GBZ80 - JP cc,n16: 4 cycles taken, 3 cycles untaken
        // opcodes.json - JP Z,a16: 3 bytes, [16, 12] cycles, condition check

        // Setup: Clear all flags, then set only Z flag (zero condition)
        cpu.setSubtractFlag(false);
        cpu.setHalfCarryFlag(false);
        cpu.setCarryFlag(false);
        cpu.setZeroFlag(true); // Set Z flag

        // Place JP Z,a16 instruction with target address
        mmu.writeByte(0x0100, 0xca); // JP Z,a16 instruction
        mmu.writeByte(0x0101, 0x56); // Low byte of address (little-endian)
        mmu.writeByte(0x0102, 0x34); // High byte of address
        // Target address = 0x3456

        // Execute JP Z,a16 instruction
        const cyclesExecuted = cpu.step();

        // Verify: PC set to target address (jump taken), correct cycle count
        expect(cpu.getPC()).toBe(0x3456);
        expect(cyclesExecuted).toBe(4); // RGBDS GBZ80: JP taken takes 4 cycles

        // Verify: No flag changes during conditional jump
        expect(cpu.getZeroFlag()).toBe(true);
        expect(cpu.getSubtractFlag()).toBe(false);
        expect(cpu.getHalfCarryFlag()).toBe(false);
        expect(cpu.getCarryFlag()).toBe(false);
      });

      it('should not jump when Z flag is clear (zero condition false)', () => {
        // RED PHASE: This test will FAIL until conditional logic is implemented
        // Test: JP Z,a16 should not jump when Z flag is clear (0)

        // Setup: Clear Z flag (not zero condition - Z is false)
        cpu.setZeroFlag(false);
        cpu.setSubtractFlag(false);
        cpu.setHalfCarryFlag(false);
        cpu.setCarryFlag(false);

        // Place JP Z,a16 instruction with target address
        mmu.writeByte(0x0100, 0xca); // JP Z,a16 instruction
        mmu.writeByte(0x0101, 0x56); // Low byte of address
        mmu.writeByte(0x0102, 0x34); // High byte of address

        // Execute JP Z,a16 instruction
        const cyclesExecuted = cpu.step();

        // Verify: PC continues to next instruction (jump not taken), correct cycle count
        expect(cpu.getPC()).toBe(0x0103); // PC should be at next instruction
        expect(cyclesExecuted).toBe(3); // RGBDS GBZ80: JP not taken takes 3 cycles

        // Verify: No flag changes during conditional jump
        expect(cpu.getZeroFlag()).toBe(false);
        expect(cpu.getSubtractFlag()).toBe(false);
        expect(cpu.getHalfCarryFlag()).toBe(false);
        expect(cpu.getCarryFlag()).toBe(false);
      });
    });

    describe('JP NC,a16 (0xD2) - Conditional jump if not carry', () => {
      it('should jump when C flag is clear (not carry condition true)', () => {
        // RED PHASE: This test will FAIL until JP NC,a16 instruction is implemented
        // Test: JP NC,a16 should jump when C flag is clear (0)
        // Hardware Reference: RGBDS GBZ80 - JP cc,n16: 4 cycles taken, 3 cycles untaken
        // opcodes.json - JP NC,a16: 3 bytes, [16, 12] cycles, condition check

        // Setup: Clear C flag (not carry condition)
        cpu.setZeroFlag(true);
        cpu.setSubtractFlag(false);
        cpu.setHalfCarryFlag(false);
        cpu.setCarryFlag(false); // Clear C flag

        // Place JP NC,a16 instruction with target address
        mmu.writeByte(0x0100, 0xd2); // JP NC,a16 instruction
        mmu.writeByte(0x0101, 0x78); // Low byte of address (little-endian)
        mmu.writeByte(0x0102, 0x56); // High byte of address
        // Target address = 0x5678

        // Execute JP NC,a16 instruction
        const cyclesExecuted = cpu.step();

        // Verify: PC set to target address (jump taken), correct cycle count
        expect(cpu.getPC()).toBe(0x5678);
        expect(cyclesExecuted).toBe(4); // RGBDS GBZ80: JP taken takes 4 cycles

        // Verify: No flag changes during conditional jump
        expect(cpu.getZeroFlag()).toBe(true);
        expect(cpu.getSubtractFlag()).toBe(false);
        expect(cpu.getHalfCarryFlag()).toBe(false);
        expect(cpu.getCarryFlag()).toBe(false);
      });

      it('should not jump when C flag is set (not carry condition false)', () => {
        // RED PHASE: This test will FAIL until conditional logic is implemented
        // Test: JP NC,a16 should not jump when C flag is set (1)

        // Setup: Set C flag (carry condition - NC is false)
        cpu.setCarryFlag(true); // Set C flag

        // Place JP NC,a16 instruction with target address
        mmu.writeByte(0x0100, 0xd2); // JP NC,a16 instruction
        mmu.writeByte(0x0101, 0x78); // Low byte of address
        mmu.writeByte(0x0102, 0x56); // High byte of address

        // Execute JP NC,a16 instruction
        const cyclesExecuted = cpu.step();

        // Verify: PC continues to next instruction (jump not taken), correct cycle count
        expect(cpu.getPC()).toBe(0x0103); // PC should be at next instruction
        expect(cyclesExecuted).toBe(3); // RGBDS GBZ80: JP not taken takes 3 cycles

        // Verify: No flag changes during conditional jump
        expect(cpu.getCarryFlag()).toBe(true);
      });
    });

    describe('JP C,a16 (0xDA) - Conditional jump if carry', () => {
      it('should jump when C flag is set (carry condition true)', () => {
        // RED PHASE: This test will FAIL until JP C,a16 instruction is implemented
        // Test: JP C,a16 should jump when C flag is set (1)
        // Hardware Reference: RGBDS GBZ80 - JP cc,n16: 4 cycles taken, 3 cycles untaken
        // opcodes.json - JP C,a16: 3 bytes, [16, 12] cycles, condition check

        // Setup: Set C flag (carry condition)
        cpu.setZeroFlag(false);
        cpu.setSubtractFlag(false);
        cpu.setHalfCarryFlag(false);
        cpu.setCarryFlag(true); // Set C flag

        // Place JP C,a16 instruction with target address
        mmu.writeByte(0x0100, 0xda); // JP C,a16 instruction
        mmu.writeByte(0x0101, 0x9a); // Low byte of address (little-endian)
        mmu.writeByte(0x0102, 0x78); // High byte of address
        // Target address = 0x789a

        // Execute JP C,a16 instruction
        const cyclesExecuted = cpu.step();

        // Verify: PC set to target address (jump taken), correct cycle count
        expect(cpu.getPC()).toBe(0x789a);
        expect(cyclesExecuted).toBe(4); // RGBDS GBZ80: JP taken takes 4 cycles

        // Verify: No flag changes during conditional jump
        expect(cpu.getZeroFlag()).toBe(false);
        expect(cpu.getSubtractFlag()).toBe(false);
        expect(cpu.getHalfCarryFlag()).toBe(false);
        expect(cpu.getCarryFlag()).toBe(true);
      });

      it('should not jump when C flag is clear (carry condition false)', () => {
        // RED PHASE: This test will FAIL until conditional logic is implemented
        // Test: JP C,a16 should not jump when C flag is clear (0)

        // Setup: Clear C flag (not carry condition - C is false)
        cpu.setZeroFlag(true);
        cpu.setSubtractFlag(false);
        cpu.setHalfCarryFlag(false);
        cpu.setCarryFlag(false); // Clear C flag

        // Place JP C,a16 instruction with target address
        mmu.writeByte(0x0100, 0xda); // JP C,a16 instruction
        mmu.writeByte(0x0101, 0x9a); // Low byte of address
        mmu.writeByte(0x0102, 0x78); // High byte of address

        // Execute JP C,a16 instruction
        const cyclesExecuted = cpu.step();

        // Verify: PC continues to next instruction (jump not taken), correct cycle count
        expect(cpu.getPC()).toBe(0x0103); // PC should be at next instruction
        expect(cyclesExecuted).toBe(3); // RGBDS GBZ80: JP not taken takes 3 cycles

        // Verify: No flag changes during conditional jump
        expect(cpu.getZeroFlag()).toBe(true);
        expect(cpu.getSubtractFlag()).toBe(false);
        expect(cpu.getHalfCarryFlag()).toBe(false);
        expect(cpu.getCarryFlag()).toBe(false);
      });
    });

    describe('JP (HL) (0xE9) - Jump to address in HL register', () => {
      it('should jump to address stored in HL register', () => {
        // RED PHASE: This test will FAIL until JP (HL) instruction is implemented
        // Test: JP (HL) should jump to address contained in HL register
        // Hardware Reference: RGBDS GBZ80 - JP HL: 1 cycle, 1 byte
        // opcodes.json - JP (HL): 1 byte, 4 cycles, no condition check

        // Setup: Set HL register to target address
        cpu.setRegisterH(0xab);
        cpu.setRegisterL(0xcd);
        // HL = 0xabcd

        // Place JP (HL) instruction
        mmu.writeByte(0x0100, 0xe9); // JP (HL) instruction

        // Execute JP (HL) instruction
        const cyclesExecuted = cpu.step();

        // Verify: PC set to address in HL register, correct cycle count
        expect(cpu.getPC()).toBe(0xabcd);
        expect(cyclesExecuted).toBe(1); // RGBDS GBZ80: JP (HL) takes 1 cycle

        // Verify: HL register unchanged, no flag changes
        expect(cpu.getRegisters().h).toBe(0xab);
        expect(cpu.getRegisters().l).toBe(0xcd);
        expect(cpu.getRegisters().f).toBe(0xb0); // Initial flag state
      });

      it('should handle jump to zero address via HL', () => {
        // RED PHASE: This test will FAIL until edge case handling is implemented
        // Test: JP (HL) with HL=0x0000 should work correctly

        cpu.setRegisterH(0x00);
        cpu.setRegisterL(0x00);

        mmu.writeByte(0x0100, 0xe9); // JP (HL) instruction

        const cyclesExecuted = cpu.step();

        expect(cpu.getPC()).toBe(0x0000);
        expect(cyclesExecuted).toBe(1); // RGBDS GBZ80: JP (HL) takes 1 cycle
      });

      it('should handle jump to maximum address via HL', () => {
        // RED PHASE: This test will FAIL until boundary handling is implemented
        // Test: JP (HL) with HL=0xFFFF should work correctly

        cpu.setRegisterH(0xff);
        cpu.setRegisterL(0xff);

        mmu.writeByte(0x0100, 0xe9); // JP (HL) instruction

        const cyclesExecuted = cpu.step();

        expect(cpu.getPC()).toBe(0xffff);
        expect(cyclesExecuted).toBe(1); // RGBDS GBZ80: JP (HL) takes 1 cycle
      });

      it('should not affect any registers except PC', () => {
        // RED PHASE: This test will FAIL until register preservation is implemented
        // Test: JP (HL) should only affect PC, leaving HL and other registers unchanged

        // Set HL register to test value
        cpu.setRegisterH(0x12);
        cpu.setRegisterL(0x34);
        const initialRegisters = cpu.getRegisters();

        mmu.writeByte(0x0100, 0xe9); // JP (HL) instruction

        cpu.step();

        const finalRegisters = cpu.getRegisters();
        expect(finalRegisters.a).toBe(initialRegisters.a);
        expect(finalRegisters.b).toBe(initialRegisters.b);
        expect(finalRegisters.c).toBe(initialRegisters.c);
        expect(finalRegisters.d).toBe(initialRegisters.d);
        expect(finalRegisters.e).toBe(initialRegisters.e);
        expect(finalRegisters.f).toBe(initialRegisters.f);
        expect(finalRegisters.h).toBe(0x12); // HL unchanged
        expect(finalRegisters.l).toBe(0x34);
        expect(finalRegisters.sp).toBe(initialRegisters.sp);
        expect(finalRegisters.pc).toBe(0x1234); // Only PC changes to HL value
      });
    });
  });

  /**
   * JR (Jump Relative) Instructions Test Suite - Phase 7
   *
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - JR n16
   * Tests relative jumps with signed 8-bit offsets.
   * All JR instructions: unconditional JR and 4 conditional variants
   *
   * Hardware behavior:
   * - JR e8: 12 cycles unconditional
   * - JR cc,e8: 12 cycles if taken, 8 cycles if not taken
   * - Signed 8-bit offset range: -128 to +127
   * - PC advances by 2 before adding offset
   * - No flags are affected by JR instructions
   */
  describe('JR (Jump Relative) Instructions - Phase 7', () => {
    describe('JR e8 (0x18) - Unconditional Relative Jump', () => {
      it('should jump forward by positive offset', () => {
        // RED PHASE: This test will FAIL until JR e8 implementation exists
        // Test: JR +10 should set PC = current_pc + 2 + 10

        cpu.setProgramCounter(0x0100);
        mmu.writeByte(0x0100, 0x18); // JR e8 instruction
        mmu.writeByte(0x0101, 0x0a); // offset +10

        const cyclesExecuted = cpu.step();

        expect(cpu.getPC()).toBe(0x010c); // 0x0100 + 2 + 10 = 0x010c
        expect(cyclesExecuted).toBe(12);
      });

      it('should jump backward by negative offset', () => {
        // RED PHASE: This test will FAIL until JR e8 signed offset handling exists
        // Test: JR -5 should set PC = current_pc + 2 - 5

        cpu.setProgramCounter(0x0100);
        mmu.writeByte(0x0100, 0x18); // JR e8 instruction
        mmu.writeByte(0x0101, 0xfb); // offset -5 (signed 8-bit: 251 = -5)

        const cyclesExecuted = cpu.step();

        expect(cpu.getPC()).toBe(0x00fd); // 0x0100 + 2 - 5 = 0x00fd
        expect(cyclesExecuted).toBe(12);
      });

      it('should handle maximum positive offset (+127)', () => {
        // RED PHASE: This test will FAIL until boundary handling exists
        // Test: JR +127 should work correctly

        cpu.setProgramCounter(0x0100);
        mmu.writeByte(0x0100, 0x18); // JR e8 instruction
        mmu.writeByte(0x0101, 0x7f); // offset +127

        const cyclesExecuted = cpu.step();

        expect(cpu.getPC()).toBe(0x0181); // 0x0100 + 2 + 127 = 0x0181
        expect(cyclesExecuted).toBe(12);
      });

      it('should handle maximum negative offset (-128)', () => {
        // RED PHASE: This test will FAIL until boundary handling exists
        // Test: JR -128 should work correctly

        cpu.setProgramCounter(0x0200);
        mmu.writeByte(0x0200, 0x18); // JR e8 instruction
        mmu.writeByte(0x0201, 0x80); // offset -128 (signed 8-bit: 128 = -128)

        const cyclesExecuted = cpu.step();

        expect(cpu.getPC()).toBe(0x0182); // 0x0200 + 2 - 128 = 0x0182
        expect(cyclesExecuted).toBe(12);
      });

      it('should handle PC wrapping at 16-bit boundary', () => {
        // RED PHASE: This test will FAIL until PC wrapping is implemented
        // Test: JR from near end of address space should wrap correctly

        cpu.setProgramCounter(0xfffe);
        mmu.writeByte(0xfffe, 0x18); // JR e8 instruction
        mmu.writeByte(0xffff, 0x05); // offset +5

        const cyclesExecuted = cpu.step();

        expect(cpu.getPC()).toBe(0x0005); // 0xfffe + 2 + 5 = 0x10005 & 0xffff = 0x0005
        expect(cyclesExecuted).toBe(12);
      });

      it('should not affect any flags or registers except PC', () => {
        // RED PHASE: This test will FAIL until register preservation is implemented
        // Test: JR should only affect PC, leaving all other registers and flags unchanged

        const initialRegisters = cpu.getRegisters();
        cpu.setProgramCounter(0x0100);

        mmu.writeByte(0x0100, 0x18); // JR e8 instruction
        mmu.writeByte(0x0101, 0x10); // offset +16

        cpu.step();

        const finalRegisters = cpu.getRegisters();
        expect(finalRegisters.a).toBe(initialRegisters.a);
        expect(finalRegisters.b).toBe(initialRegisters.b);
        expect(finalRegisters.c).toBe(initialRegisters.c);
        expect(finalRegisters.d).toBe(initialRegisters.d);
        expect(finalRegisters.e).toBe(initialRegisters.e);
        expect(finalRegisters.f).toBe(initialRegisters.f); // Flags unchanged
        expect(finalRegisters.h).toBe(initialRegisters.h);
        expect(finalRegisters.l).toBe(initialRegisters.l);
        expect(finalRegisters.sp).toBe(initialRegisters.sp);
        expect(finalRegisters.pc).toBe(0x0112); // Only PC changes
      });
    });

    describe('JR NZ,e8 (0x20) - Jump Relative if Not Zero', () => {
      it('should jump when zero flag is clear', () => {
        // RED PHASE: This test will FAIL until JR NZ,e8 implementation exists
        // Test: JR NZ,+8 with Z=0 should jump and take 12 cycles

        cpu.setProgramCounter(0x0100);
        cpu.setZeroFlag(false); // Clear zero flag
        mmu.writeByte(0x0100, 0x20); // JR NZ,e8 instruction
        mmu.writeByte(0x0101, 0x08); // offset +8

        const cyclesExecuted = cpu.step();

        expect(cpu.getPC()).toBe(0x010a); // 0x0100 + 2 + 8 = 0x010a
        expect(cyclesExecuted).toBe(12); // Taken branch
      });

      it('should not jump when zero flag is set', () => {
        // RED PHASE: This test will FAIL until JR NZ,e8 conditional logic exists
        // Test: JR NZ,+8 with Z=1 should not jump and take 8 cycles

        cpu.setProgramCounter(0x0100);
        cpu.setZeroFlag(true); // Set zero flag
        mmu.writeByte(0x0100, 0x20); // JR NZ,e8 instruction
        mmu.writeByte(0x0101, 0x08); // offset +8

        const cyclesExecuted = cpu.step();

        expect(cpu.getPC()).toBe(0x0102); // PC advances by 2 only
        expect(cyclesExecuted).toBe(8); // Not taken branch
      });

      it('should handle negative offset when condition is met', () => {
        // RED PHASE: This test will FAIL until negative offset handling exists
        // Test: JR NZ,-10 with Z=0 should jump backward

        cpu.setProgramCounter(0x0100);
        cpu.setZeroFlag(false); // Clear zero flag
        mmu.writeByte(0x0100, 0x20); // JR NZ,e8 instruction
        mmu.writeByte(0x0101, 0xf6); // offset -10 (signed 8-bit: 246 = -10)

        const cyclesExecuted = cpu.step();

        expect(cpu.getPC()).toBe(0x00f8); // 0x0100 + 2 - 10 = 0x00f8
        expect(cyclesExecuted).toBe(12); // Taken branch
      });
    });

    describe('JR Z,e8 (0x28) - Jump Relative if Zero', () => {
      it('should jump when zero flag is set', () => {
        // RED PHASE: This test will FAIL until JR Z,e8 implementation exists
        // Test: JR Z,+6 with Z=1 should jump and take 12 cycles

        cpu.setProgramCounter(0x0100);
        cpu.setZeroFlag(true); // Set zero flag
        mmu.writeByte(0x0100, 0x28); // JR Z,e8 instruction
        mmu.writeByte(0x0101, 0x06); // offset +6

        const cyclesExecuted = cpu.step();

        expect(cpu.getPC()).toBe(0x0108); // 0x0100 + 2 + 6 = 0x0108
        expect(cyclesExecuted).toBe(12); // Taken branch
      });

      it('should not jump when zero flag is clear', () => {
        // RED PHASE: This test will FAIL until JR Z,e8 conditional logic exists
        // Test: JR Z,+6 with Z=0 should not jump and take 8 cycles

        cpu.setProgramCounter(0x0100);
        cpu.setZeroFlag(false); // Clear zero flag
        mmu.writeByte(0x0100, 0x28); // JR Z,e8 instruction
        mmu.writeByte(0x0101, 0x06); // offset +6

        const cyclesExecuted = cpu.step();

        expect(cpu.getPC()).toBe(0x0102); // PC advances by 2 only
        expect(cyclesExecuted).toBe(8); // Not taken branch
      });
    });

    describe('JR NC,e8 (0x30) - Jump Relative if Not Carry', () => {
      it('should jump when carry flag is clear', () => {
        // RED PHASE: This test will FAIL until JR NC,e8 implementation exists
        // Test: JR NC,+12 with C=0 should jump and take 12 cycles

        cpu.setProgramCounter(0x0100);
        cpu.setCarryFlag(false); // Clear carry flag
        mmu.writeByte(0x0100, 0x30); // JR NC,e8 instruction
        mmu.writeByte(0x0101, 0x0c); // offset +12

        const cyclesExecuted = cpu.step();

        expect(cpu.getPC()).toBe(0x010e); // 0x0100 + 2 + 12 = 0x010e
        expect(cyclesExecuted).toBe(12); // Taken branch
      });

      it('should not jump when carry flag is set', () => {
        // RED PHASE: This test will FAIL until JR NC,e8 conditional logic exists
        // Test: JR NC,+12 with C=1 should not jump and take 8 cycles

        cpu.setProgramCounter(0x0100);
        cpu.setCarryFlag(true); // Set carry flag
        mmu.writeByte(0x0100, 0x30); // JR NC,e8 instruction
        mmu.writeByte(0x0101, 0x0c); // offset +12

        const cyclesExecuted = cpu.step();

        expect(cpu.getPC()).toBe(0x0102); // PC advances by 2 only
        expect(cyclesExecuted).toBe(8); // Not taken branch
      });
    });

    describe('JR C,e8 (0x38) - Jump Relative if Carry', () => {
      it('should jump when carry flag is set', () => {
        // RED PHASE: This test will FAIL until JR C,e8 implementation exists
        // Test: JR C,+4 with C=1 should jump and take 12 cycles

        cpu.setProgramCounter(0x0100);
        cpu.setCarryFlag(true); // Set carry flag
        mmu.writeByte(0x0100, 0x38); // JR C,e8 instruction
        mmu.writeByte(0x0101, 0x04); // offset +4

        const cyclesExecuted = cpu.step();

        expect(cpu.getPC()).toBe(0x0106); // 0x0100 + 2 + 4 = 0x0106
        expect(cyclesExecuted).toBe(12); // Taken branch
      });

      it('should not jump when carry flag is clear', () => {
        // RED PHASE: This test will FAIL until JR C,e8 conditional logic exists
        // Test: JR C,+4 with C=0 should not jump and take 8 cycles

        cpu.setProgramCounter(0x0100);
        cpu.setCarryFlag(false); // Clear carry flag
        mmu.writeByte(0x0100, 0x38); // JR C,e8 instruction
        mmu.writeByte(0x0101, 0x04); // offset +4

        const cyclesExecuted = cpu.step();

        expect(cpu.getPC()).toBe(0x0102); // PC advances by 2 only
        expect(cyclesExecuted).toBe(8); // Not taken branch
      });
    });
  });
});

/**
 * MOCK UTILITIES AND HELPERS
 *
 * Helper functions and mocks to support CPU testing without implementation complexity.
 * Focus on testing CPU behavior at proper encapsulation boundaries.
 */

// Note: Additional mock utilities can be added here as needed for CPU testing
// following the same patterns as the MMU test file.
