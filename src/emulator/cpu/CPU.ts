/**
 * SM83 CPU Implementation
 *
 * Following TDD principles - minimal implementation to pass failing tests.
 * Implements Sharp SM83 CPU instruction set with cycle-accurate timing.
 *
 * Hardware References:
 * - Pan Docs: https://gbdev.io/pandocs/CPU_Registers_and_Flags.html
 * - GB Dev Wiki: https://gbdev.gg8.se/wiki/articles/CPU
 * - GameBoy Online implementation for reference patterns
 * - opcodes.json for exact instruction specifications
 */

import { CPUTestingComponent, CPURegisters, MMUComponent } from '../types';

/**
 * SM83 CPU Component Implementation
 * Minimal implementation to pass failing tests following TDD workflow
 */
export class CPU implements CPUTestingComponent {
  private mmu: MMUComponent;
  private registers: CPURegisters;
  private running = false;
  private halted = false;
  private ime = false; // Interrupt Master Enable
  private ime_pending_enable = false; // EI instruction has 1-cycle delay

  constructor(mmu: MMUComponent) {
    this.mmu = mmu;

    // Initialize registers to DMG post-boot state per ADR-001
    this.registers = {
      a: 0x01, // DMG post-boot: A = 0x01
      b: 0x00, // DMG post-boot: B = 0x00
      c: 0x13, // DMG post-boot: C = 0x13
      d: 0x00, // DMG post-boot: D = 0x00
      e: 0xd8, // DMG post-boot: E = 0xD8
      f: 0xb0, // DMG post-boot: F = 0xB0 (Z=1, N=0, H=1, C=1)
      h: 0x01, // DMG post-boot: H = 0x01
      l: 0x4d, // DMG post-boot: L = 0x4D
      sp: 0xfffe, // DMG post-boot: SP = 0xFFFE
      pc: 0x0100, // DMG post-boot: PC = 0x0100 (after boot ROM)
    };
  }

  // RunnableComponent interface implementation
  start(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  reset(): void {
    this.running = false;
    this.halted = false;
    this.ime = false;
    this.ime_pending_enable = false;

    // Reset to DMG post-boot state
    this.registers = {
      a: 0x01,
      b: 0x00,
      c: 0x13,
      d: 0x00,
      e: 0xd8,
      f: 0xb0,
      h: 0x01,
      l: 0x4d,
      sp: 0xfffe,
      pc: 0x0100,
    };
  }

  // CPUComponent interface implementation
  step(): number {
    // Handle pending IME enable from EI instruction
    if (this.ime_pending_enable) {
      this.ime = true;
      this.ime_pending_enable = false;
    }

    // Check for and service interrupts
    const interruptCycles = this.handleInterrupts();
    if (interruptCycles > 0) {
      // An interrupt was serviced, consuming cycles
      return interruptCycles;
    }

    // If halted, CPU does not execute instructions but still consumes cycles
    if (this.halted) {
      return 4; // HALT consumes 4 cycles per step when halted
    }

    // Fetch instruction from memory at PC
    const opcode = this.mmu.readByte(this.registers.pc);

    // Increment PC after instruction fetch, before execution (hardware behavior)
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Execute instruction and return cycle count
    return this.executeInstruction(opcode);
  }

  getPC(): number {
    return this.registers.pc;
  }

  getRegisters(): CPURegisters {
    return { ...this.registers }; // Return copy to prevent external mutation
  }

  isHalted(): boolean {
    return this.halted;
  }

  // Full interrupt handling is now implemented via the handleInterrupts() method.
  triggerInterrupt(address: number): void {
    // Legacy method for testing compatibility
    // Modern interrupt handling uses MMU.requestInterrupt()
    // Address parameter preserved for interface compatibility but not used
    void address; // Explicitly mark as intentionally unused
    this.halted = false;
  }

  getDebugInfo(): string {
    const { a, b, c, d, e, f, h, l, sp, pc } = this.registers;
    const flags = {
      Z: (f & 0x80) !== 0 ? 1 : 0,
      N: (f & 0x40) !== 0 ? 1 : 0,
      H: (f & 0x20) !== 0 ? 1 : 0,
      C: (f & 0x10) !== 0 ? 1 : 0,
    };

    return (
      `CPU State - PC: 0x${pc.toString(16).padStart(4, '0').toUpperCase()}, SP: 0x${sp.toString(16).padStart(4, '0').toUpperCase()}, ` +
      `A: 0x${a.toString(16).padStart(2, '0').toUpperCase()}, BC: 0x${b.toString(16).padStart(2, '0').toUpperCase()}${c.toString(16).padStart(2, '0').toUpperCase()}, ` +
      `DE: 0x${d.toString(16).padStart(2, '0').toUpperCase()}${e.toString(16).padStart(2, '0').toUpperCase()}, HL: 0x${h.toString(16).padStart(2, '0').toUpperCase()}${l.toString(16).padStart(2, '0').toUpperCase()}, ` +
      `F: Z=${flags.Z} N=${flags.N} H=${flags.H} C=${flags.C}, Halted: ${this.halted}`
    );
  }

  /**
   * Diagnostic method to identify unimplemented opcodes by examining switch statement
   * Used for systematic testing and coverage analysis during development
   */
  public getUnimplementedOpcodes(): number[] {
    const unimplemented: number[] = [];

    // Test each possible opcode (0x00-0xFF) by attempting execution in a safe way
    for (let opcode = 0x00; opcode <= 0xff; opcode++) {
      try {
        // Save current state
        const savedPC = this.registers.pc;
        const savedA = this.registers.a;
        const savedF = this.registers.f;

        // Set up test conditions
        this.registers.pc = 0x8000; // Safe memory area

        // Create a minimal test - we can't actually execute but we can check the switch cases
        const isImplemented = this.isOpcodeImplemented(opcode);

        if (!isImplemented) {
          unimplemented.push(opcode);
        }

        // Restore state
        this.registers.pc = savedPC;
        this.registers.a = savedA;
        this.registers.f = savedF;
      } catch (error) {
        // If error contains "Invalid opcode", it's unimplemented
        if (error instanceof Error && error.message.includes('Invalid opcode')) {
          unimplemented.push(opcode);
        }
      }
    }

    return unimplemented;
  }

  /**
   * Check if a specific opcode is implemented by examining the switch statement
   */
  private isOpcodeImplemented(opcode: number): boolean {
    // This checks our switch statement for implemented opcodes
    // We manually list known implemented opcodes to avoid execution issues
    const implementedOpcodes = new Set([
      // Basic operations
      0x00, // NOP

      // LD instructions
      0x01,
      0x06,
      0x0e,
      0x11,
      0x16,
      0x1e,
      0x21,
      0x26,
      0x2e,
      0x31,
      0x36,
      0x3e,
      0x40,
      0x41,
      0x42,
      0x43,
      0x44,
      0x45,
      0x46,
      0x47,
      0x48,
      0x49,
      0x4a,
      0x4b,
      0x4c,
      0x4d,
      0x4e,
      0x4f,
      0x50,
      0x51,
      0x52,
      0x53,
      0x54,
      0x55,
      0x56,
      0x57,
      0x58,
      0x59,
      0x5a,
      0x5b,
      0x5c,
      0x5d,
      0x5e,
      0x5f,
      0x60,
      0x61,
      0x62,
      0x63,
      0x64,
      0x65,
      0x66,
      0x67,
      0x68,
      0x69,
      0x6a,
      0x6b,
      0x6c,
      0x6d,
      0x6e,
      0x6f,
      0x70,
      0x71,
      0x72,
      0x73,
      0x74,
      0x75,
      0x77,
      0x78,
      0x79,
      0x7a,
      0x7b,
      0x7c,
      0x7d,
      0x7e,
      0x7f,
      0x02,
      0x12,
      0x22,
      0x32,
      0x0a,
      0x1a,
      0x2a,
      0x3a,
      0x08,
      0xe2,
      0xf2,
      0xe0,
      0xf0,
      0xea,
      0xfa,
      0xf8,
      0xf9, // Now implemented: LD HL,SP+e8 and LD SP,HL

      // ADD instructions
      0x80,
      0x81,
      0x82,
      0x83,
      0x84,
      0x85,
      0x86,
      0x87,
      0xc6,
      0x09,
      0x19,
      0x29,
      0x39,
      0xe8,

      // SUB instructions
      0x90,
      0x91,
      0x92,
      0x93,
      0x94,
      0x95,
      0x96,
      0x97,
      0xd6,

      // Logical operations
      0xa0,
      0xa1,
      0xa2,
      0xa3,
      0xa4,
      0xa5,
      0xa6,
      0xa7,
      0xe6, // AND
      0xb0,
      0xb1,
      0xb2,
      0xb3,
      0xb4,
      0xb5,
      0xb6,
      0xb7,
      0xf6, // OR
      0xa8,
      0xa9,
      0xaa,
      0xab,
      0xac,
      0xad,
      0xae,
      0xaf,
      0xee, // XOR
      0xb8,
      0xb9,
      0xba,
      0xbb,
      0xbc,
      0xbd,
      0xbe,
      0xbf,
      0xfe, // CP

      // INC/DEC instructions
      0x03,
      0x13,
      0x23,
      0x33, // INC rp
      0x0b,
      0x1b,
      0x2b,
      0x3b, // DEC rp
      0x04,
      0x0c,
      0x14,
      0x1c,
      0x24,
      0x2c,
      0x34,
      0x3c, // INC r8
      0x05,
      0x0d,
      0x15,
      0x1d,
      0x25,
      0x2d,
      0x35,
      0x3d, // DEC r8

      // Control flow
      0x18,
      0x20,
      0x28,
      0x30,
      0x38, // JR
      0xc3,
      0xc2,
      0xca,
      0xd2,
      0xda,
      0xe9, // JP
      0xcd,
      0xc4,
      0xcc,
      0xd4,
      0xdc, // CALL
      0xc9,
      0xc0,
      0xc8,
      0xd0,
      0xd8, // RET
      0xc7,
      0xcf,
      0xd7,
      0xdf,
      0xe7,
      0xef,
      0xf7,
      0xff, // RST

      // Stack operations
      0xc1,
      0xd1,
      0xe1,
      0xf1, // POP
      0xc5,
      0xd5,
      0xe5,
      0xf5, // PUSH

      // Miscellaneous
      0x76, // HALT
      0x10, // STOP
      0x27, // DAA
      0x2f, // CPL
      0x3f, // CCF
      0x37, // SCF
      0xf3, // DI
      0xfb, // EI
      0x07,
      0x17,
      0x0f,
      0x1f, // Rotate A
      0xcb, // CB prefix
      0xd9, // RETI

      // ADC/SBC
      0x88,
      0x89,
      0x8a,
      0x8b,
      0x8c,
      0x8d,
      0x8e,
      0x8f,
      0xce, // ADC
      0x98,
      0x99,
      0x9a,
      0x9b,
      0x9c,
      0x9d,
      0x9e,
      0x9f,
      0xde, // SBC
    ]);

    return implementedOpcodes.has(opcode);
  }

  private handleInterrupts(): number {
    const ie = this.mmu.readByte(0xffff); // Interrupt Enable Register
    const ifReg = this.mmu.readByte(0xff0f); // Interrupt Flag Register
    const requestedInterrupts = ie & ifReg;

    if (requestedInterrupts === 0) {
      return 0; // No pending and enabled interrupts
    }

    // An interrupt is pending, so CPU exits HALT mode
    if (this.halted) {
      this.halted = false;
    }

    // If IME is disabled, interrupts exit HALT but are not serviced
    if (!this.ime) {
      return 0;
    }

    // Interrupts are enabled, service the highest-priority interrupt
    this.ime = false; // Disable interrupts during service routine

    // Push current PC to stack (takes 2 machine cycles)
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, (this.registers.pc >> 8) & 0xff); // High byte
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, this.registers.pc & 0xff); // Low byte

    // Interrupt handling takes 20 cycles total
    const INTERRUPT_SERVICE_CYCLES = 20;

    // Determine which interrupt to service based on priority (0 > 1 > 2 > 3 > 4)
    for (let i = 0; i < 5; i++) {
      if ((requestedInterrupts & (1 << i)) !== 0) {
        // Reset the serviced interrupt flag in IF register
        this.mmu.writeByte(0xff0f, ifReg & ~(1 << i));

        // Jump to the corresponding interrupt vector address
        const interruptVectors = [0x0040, 0x0048, 0x0050, 0x0058, 0x0060];
        this.registers.pc = interruptVectors[i];

        // Return cycle cost of interrupt handling
        return INTERRUPT_SERVICE_CYCLES;
      }
    }

    return 0; // Should not be reached
  }

  // Flag register access methods
  getZeroFlag(): boolean {
    return (this.registers.f & 0x80) !== 0;
  }

  getSubtractFlag(): boolean {
    return (this.registers.f & 0x40) !== 0;
  }

  getHalfCarryFlag(): boolean {
    return (this.registers.f & 0x20) !== 0;
  }

  getCarryFlag(): boolean {
    return (this.registers.f & 0x10) !== 0;
  }

  // Register manipulation methods for testing
  setRegisterA(value: number): void {
    this.registers.a = value & 0xff;
  }

  setRegisterB(value: number): void {
    this.registers.b = value & 0xff;
  }

  setRegisterC(value: number): void {
    this.registers.c = value & 0xff;
  }

  setRegisterD(value: number): void {
    this.registers.d = value & 0xff;
  }

  setRegisterE(value: number): void {
    this.registers.e = value & 0xff;
  }

  setRegisterF(value: number): void {
    // Store all 8 bits, preserving lower 4 bits for flag operations
    this.registers.f = value & 0xff;
  }

  setRegisterH(value: number): void {
    this.registers.h = value & 0xff;
  }

  setRegisterL(value: number): void {
    this.registers.l = value & 0xff;
  }

  setStackPointer(value: number): void {
    this.registers.sp = value & 0xffff;
  }

  getStackPointer(): number {
    return this.registers.sp;
  }

  setProgramCounter(value: number): void {
    this.registers.pc = value & 0xffff;
  }

  // Flag manipulation methods for testing
  setZeroFlag(state: boolean): void {
    if (state) {
      this.registers.f |= 0x80;
    } else {
      this.registers.f &= ~0x80;
    }
  }

  setSubtractFlag(state: boolean): void {
    if (state) {
      this.registers.f |= 0x40;
    } else {
      this.registers.f &= ~0x40;
    }
  }

  setHalfCarryFlag(state: boolean): void {
    if (state) {
      this.registers.f |= 0x20;
    } else {
      this.registers.f &= ~0x20;
    }
  }

  setCarryFlag(state: boolean): void {
    if (state) {
      this.registers.f |= 0x10;
    } else {
      this.registers.f &= ~0x10;
    }
  }

  /**
   * Execute a single instruction based on opcode
   * Returns the number of cycles consumed
   */
  private executeInstruction(opcode: number): number {
    switch (opcode) {
      case 0x00: // NOP - No Operation
        return this.executeNOP();

      case 0x01: // LD BC,n16 - Load 16-bit immediate into BC register pair (Phase 1)
        return this.executeLDBCn1601();

      case 0x02: // LD (BC),A - Store A into memory pointed by BC (Phase 1)
        return this.executeLDBCA02();

      case 0x07: // RLCA - Rotate A left circular
        return this.executeRLCA07();

      case 0x0f: // RRCA - Rotate A right circular
        return this.executeRRCA0F();

      case 0x17: // RLA - Rotate A left through carry
        return this.executeRLA17();

      case 0x1f: // RRA - Rotate A right through carry
        return this.executeRRA1F();

      // GROUP 3: MEMORY VIA REGISTER PAIRS (Phase 2)
      case 0x0a: // LD A,(BC) - Load A from memory address BC
        return this.executeLDABC0A();
      case 0x12: // LD (DE),A - Store A into memory pointed by DE
        return this.executeLDDEA12();
      case 0x1a: // LD A,(DE) - Load A from memory address DE
        return this.executeLDADE1A();
      case 0x22: // LD (HL+),A - Store A to (HL) then increment HL
        return this.executeLDHLIA22();
      case 0x2a: // LD A,(HL+) - Load A from (HL) then increment HL
        return this.executeLDAHLI2A();
      case 0x32: // LD (HL-),A - Store A to (HL) then decrement HL
        return this.executeLDHLDA32();
      case 0x3a: // LD A,(HL-) - Load A from (HL) then decrement HL
        return this.executeLDAHLD3A();

      case 0x06: // LD B,n8 - Load 8-bit immediate into B register
        return this.executeLDBn8();

      case 0x0e: // LD C,n8 - Load 8-bit immediate into C register
        return this.executeLDCn8();

      // GROUP 2: IMMEDIATE-TO-REGISTER LD INSTRUCTIONS (Phase 2)
      case 0x16: // LD D,n8 - Load 8-bit immediate into D register
        return this.executeLDDn816();
      case 0x18: // JR e8 - Unconditional relative jump (Phase 7)
        return this.executeJRe8();
      case 0x1e: // LD E,n8 - Load 8-bit immediate into E register
        return this.executeLDEn81E();
      case 0x20: // JR NZ,e8 - Jump relative if not zero (Phase 7)
        return this.executeJRNZe8();
      case 0x26: // LD H,n8 - Load 8-bit immediate into H register
        return this.executeLDHn826();
      case 0x28: // JR Z,e8 - Jump relative if zero (Phase 7)
        return this.executeJRZe8();
      case 0x2e: // LD L,n8 - Load 8-bit immediate into L register
        return this.executeLDLn82E();
      case 0x30: // JR NC,e8 - Jump relative if not carry (Phase 7)
        return this.executeJRNCe8();
      case 0x36: // LD (HL),n8 - Store 8-bit immediate to memory address HL
        return this.executeLDHLn836();
      case 0x38: // JR C,e8 - Jump relative if carry (Phase 7)
        return this.executeJRCe8();
      case 0x3e: // LD A,n8 - Load 8-bit immediate into A register
        return this.executeLDAn83E();

      // GROUP 5: 16-BIT AND SPECIAL OPERATIONS (Phase 2)
      case 0x08: // LD (a16),SP - Store SP to 16-bit memory address
        return this.executeLDa16SP08();

      case 0x09: // ADD HL,BC - Add BC to HL (Phase 3)
        return this.executeADDHLBC09();

      case 0x11: // LD DE,n16 - Load 16-bit immediate into DE register pair
        return this.executeLDDEn1611();

      case 0x19: // ADD HL,DE - Add DE to HL (Phase 3)
        return this.executeADDHLDE19();

      case 0x21: // LD HL,n16 - Load 16-bit immediate into HL register pair
        return this.executeLDHLn1621();

      case 0x29: // ADD HL,HL - Add HL to itself (Phase 3)
        return this.executeADDHLHL29();

      case 0x31: // LD SP,n16 - Load 16-bit immediate into SP register
        return this.executeLDSPn1631();

      case 0x39: // ADD HL,SP - Add SP to HL (Phase 3)
        return this.executeADDHLSP39();

      case 0xe8: // ADD SP,e8 - Add signed immediate offset to Stack Pointer (Phase 3)
        return this.executeADDSPe8();

      case 0xf8: // LD HL,SP+e8 - Load SP+signed offset into HL with flag effects
        return this.executeLDHLSPe8F8();
      case 0xf9: // LD SP,HL - Copy HL register pair to SP
        return this.executeLDSPHLF9();
      case 0xfa: // LD A,(a16) - Load A from 16-bit memory address
        return this.executeLDAa16FA();

      // GROUP 4: ADVANCED MEMORY OPERATIONS - LDH INSTRUCTIONS (Phase 2)
      case 0xe0: // LDH (a8),A - Store A at $FF00+a8
        return this.executeLDHa8AE0();
      case 0xe2: // LDH (C),A - Store A at $FF00+C
        return this.executeLDHCAE2();
      case 0xf0: // LDH A,(a8) - Load A from $FF00+a8
        return this.executeLDHAa8F0();
      case 0xf2: // LDH A,(C) - Load A from $FF00+C
        return this.executeLDHACF2();

      case 0x76: // HALT - Halt until interrupt
        return this.executeHALT();

      case 0x80: // ADD A,B - Add B to A
        return this.executeADDAB();

      case 0x81: // ADD A,C - Add C to A
        return this.executeADDAC();

      case 0x82: // ADD A,D - Add D to A (Phase 1)
        return this.executeADDAD82();

      case 0x83: // ADD A,E - Add E to A (Phase 1)
        return this.executeADDAE83();

      case 0x84: // ADD A,H - Add H to A (Phase 3)
        return this.executeADDAH84();

      case 0x85: // ADD A,L - Add L to A (Phase 3)
        return this.executeADDAL85();

      case 0x86: // ADD A,(HL) - Add memory value at HL to A (Phase 3)
        return this.executeADDAHL86();

      case 0x87: // ADD A,A - Add A to itself (Phase 3)
        return this.executeADDAA87();
      case 0x8e: // ADC A,(HL) - Add memory value at HL to A with carry
        return this.executeADCAHL8E();

      case 0x88: // ADC A,B - Add B to A with carry (Phase 3)
        return this.executeADCAB88();

      case 0x89: // ADC A,C - Add C to A with carry (Phase 3)
        return this.executeADCAC89();

      case 0x8a: // ADC A,D - Add D to A with carry (Phase 3)
        return this.executeADCAD8A();

      case 0x8b: // ADC A,E - Add E to A with carry (Phase 3)
        return this.executeADCAE8B();

      case 0x8c: // ADC A,H - Add H to A with carry (Phase 3)
        return this.executeADCAH8C();

      case 0x8d: // ADC A,L - Add L to A with carry (Phase 3)
        return this.executeADCAL8D();

      case 0x8f: // ADC A,A - Add A to itself with carry (Phase 3)
        return this.executeADCAA8F();

      case 0x90: // SUB A,B - Subtract B from A (Phase 1)
        return this.executeSUBAB90();

      case 0x91: // SUB A,C - Subtract C from A (Phase 4)
        return this.executeSUBAC91();

      case 0x92: // SUB A,D - Subtract D from A (Phase 4)
        return this.executeSUBAD92();

      case 0x93: // SUB A,E - Subtract E from A (Phase 4)
        return this.executeSUBAE93();

      case 0x94: // SUB A,H - Subtract H from A (Phase 4)
        return this.executeSUBAH94();

      case 0x95: // SUB A,L - Subtract L from A (Phase 4)
        return this.executeSUBAL95();

      case 0x96: // SUB A,(HL) - Subtract value at HL from A (Phase 4)
        return this.executeSUBAHL96();

      case 0x97: // SUB A,A - Subtract A from itself (Phase 4)
        return this.executeSUBAA97();
      case 0x9e: // SBC A,(HL) - Subtract value at HL from A with carry
        return this.executeSBCAHL9E();

      case 0x98: // SBC A,B - Subtract B from A with carry (Phase 4)
        return this.executeSBCAB98();

      case 0x99: // SBC A,C - Subtract C from A with carry (Phase 4)
        return this.executeSBCAC99();

      case 0x9a: // SBC A,D - Subtract D from A with carry (Phase 4)
        return this.executeSBCAD9A();

      case 0x9b: // SBC A,E - Subtract E from A with carry (Phase 4)
        return this.executeSBCAE9B();

      case 0x9c: // SBC A,H - Subtract H from A with carry (Phase 4)
        return this.executeSBCAH9C();

      case 0x9d: // SBC A,L - Subtract L from A with carry (Phase 4)
        return this.executeSBCAL9D();

      case 0x9f: // SBC A,A - Subtract A from itself with carry (Phase 4)
        return this.executeSBCAA9F();

      // GROUP 1: REGISTER-TO-REGISTER LD INSTRUCTIONS (Phase 2)
      // LD B,r instructions (0x40-0x47)
      case 0x40: // LD B,B - Copy B register to itself
        return this.executeLDBB40();
      case 0x41: // LD B,C - Copy C register to B register
        return this.executeLDBC41();
      case 0x42: // LD B,D - Copy D register to B register
        return this.executeLDBD42();
      case 0x43: // LD B,E - Copy E register to B register
        return this.executeLDBE43();
      case 0x44: // LD B,H - Copy H register to B register
        return this.executeLDBH44();
      case 0x45: // LD B,L - Copy L register to B register
        return this.executeLDBL45();
      case 0x46: // LD B,(HL) - Load B from memory address HL
        return this.executeLDBHL46();
      case 0x47: // LD B,A - Copy A register to B register
        return this.executeLDBA47();

      // LD C,r instructions (0x48-0x4F)
      case 0x48: // LD C,B - Copy B register to C register
        return this.executeLDCB48();
      case 0x49: // LD C,C - Copy C register to itself
        return this.executeLDCC49();
      case 0x4a: // LD C,D - Copy D register to C register
        return this.executeLDCD4A();
      case 0x4b: // LD C,E - Copy E register to C register
        return this.executeLDCE4B();
      case 0x4c: // LD C,H - Copy H register to C register
        return this.executeLDCH4C();
      case 0x4d: // LD C,L - Copy L register to C register
        return this.executeLDCL4D();
      case 0x4e: // LD C,(HL) - Load C from memory address HL
        return this.executeLDCHL4E();
      case 0x4f: // LD C,A - Copy A register to C register
        return this.executeLDCA4F();

      // LD D,r instructions (0x50-0x57)
      case 0x50: // LD D,B - Copy B register to D register
        return this.executeLDDB50();
      case 0x51: // LD D,C - Copy C register to D register
        return this.executeLDDC51();
      case 0x52: // LD D,D - Copy D register to itself
        return this.executeLDDD52();
      case 0x53: // LD D,E - Copy E register to D register
        return this.executeLDDE53();
      case 0x54: // LD D,H - Copy H register to D register
        return this.executeLDDH54();
      case 0x55: // LD D,L - Copy L register to D register
        return this.executeLDDL55();
      case 0x56: // LD D,(HL) - Load D from memory address HL
        return this.executeLDDHL56();
      case 0x57: // LD D,A - Copy A register to D register
        return this.executeLDDA57();

      // LD E,r instructions (0x58-0x5F)
      case 0x58: // LD E,B - Copy B register to E register
        return this.executeLDEB58();
      case 0x59: // LD E,C - Copy C register to E register
        return this.executeLDEC59();
      case 0x5a: // LD E,D - Copy D register to E register
        return this.executeLDED5A();
      case 0x5b: // LD E,E - Copy E register to itself
        return this.executeLDEE5B();
      case 0x5c: // LD E,H - Copy H register to E register
        return this.executeLDEH5C();
      case 0x5d: // LD E,L - Copy L register to E register
        return this.executeLDEL5D();
      case 0x5e: // LD E,(HL) - Load E from memory address HL
        return this.executeLDEHL5E();
      case 0x5f: // LD E,A - Copy A register to E register
        return this.executeLDEA5F();

      // LD H,r instructions (0x60-0x67)
      case 0x60: // LD H,B - Copy B register to H register
        return this.executeLDHB60();
      case 0x61: // LD H,C - Copy C register to H register
        return this.executeLDHC61();
      case 0x62: // LD H,D - Copy D register to H register
        return this.executeLDHD62();
      case 0x63: // LD H,E - Copy E register to H register
        return this.executeLDHE63();
      case 0x64: // LD H,H - Copy H register to itself
        return this.executeLDHH64();
      case 0x65: // LD H,L - Copy L register to H register
        return this.executeLDHL65();
      case 0x66: // LD H,(HL) - Load H from memory address HL
        return this.executeLDHHL66();
      case 0x67: // LD H,A - Copy A register to H register
        return this.executeLDHA67();

      // LD L,r instructions (0x68-0x6F)
      case 0x68: // LD L,B - Copy B register to L register
        return this.executeLDLB68();
      case 0x69: // LD L,C - Copy C register to L register
        return this.executeLDLC69();
      case 0x6a: // LD L,D - Copy D register to L register
        return this.executeLDLD6A();
      case 0x6b: // LD L,E - Copy E register to L register
        return this.executeLDLE6B();
      case 0x6c: // LD L,H - Copy H register to L register
        return this.executeLDLH6C();
      case 0x6d: // LD L,L - Copy L register to itself
        return this.executeLDLL6D();
      case 0x6e: // LD L,(HL) - Load L from memory address HL
        return this.executeLDLHL6E();
      case 0x6f: // LD L,A - Copy A register to L register
        return this.executeLDLA6F();

      // LD (HL),r instructions (0x71-0x75, 0x77)
      case 0x71: // LD (HL),C - Store C into memory address HL
        return this.executeLDHLC71();
      case 0x72: // LD (HL),D - Store D into memory address HL
        return this.executeLDHLD72();
      case 0x73: // LD (HL),E - Store E into memory address HL
        return this.executeLDHLE73();
      case 0x74: // LD (HL),H - Store H into memory address HL
        return this.executeLDHLH74();
      case 0x75: // LD (HL),L - Store L into memory address HL
        return this.executeLDHLL75();
      case 0x77: // LD (HL),A - Store A into memory address HL
        return this.executeLDHLA77();

      // LD A,r instructions (0x78-0x7F)
      case 0x78: // LD A,B - Copy B register to A register
        return this.executeLDAB78();
      case 0x79: // LD A,C - Copy C register to A register
        return this.executeLDAC79();
      case 0x7a: // LD A,D - Copy D register to A register
        return this.executeLDAD7A();
      case 0x7b: // LD A,E - Copy E register to A register
        return this.executeLDAE7B();
      case 0x7c: // LD A,H - Copy H register to A register
        return this.executeLDAH7C();
      case 0x7d: // LD A,L - Copy L register to A register
        return this.executeLDAL7D();
      case 0x7e: // LD A,(HL) - Load A from memory address HL
        return this.executeLDAHL7E();
      case 0x7f: // LD A,A - Copy A register to itself
        return this.executeLDAA7F();

      case 0x70: // LD (HL),B - Store B into memory address pointed to by HL
        return this.executeLDHLB();

      case 0xc2: // JP NZ,a16 - Jump if not zero to 16-bit address (Phase 1)
        return this.executeJPNZa16C2();

      case 0xc3: // JP a16 - Jump to 16-bit address
        return this.executeJPa16();

      case 0xca: // JP Z,a16 - Conditional jump if zero (Phase 5)
        return this.executeJPZa16CA();

      case 0xc6: // ADD A,n8 - Add immediate 8-bit value to A (Phase 3)
        return this.executeADDAn8C6();

      case 0xce: // ADC A,n8 - Add immediate 8-bit value to A with carry (Phase 3)
        return this.executeADCAn8CE();

      case 0xd2: // JP NC,a16 - Conditional jump if not carry (Phase 5)
        return this.executeJPNCa16D2();

      case 0xd6: // SUB A,n8 - Subtract immediate 8-bit value from A (Phase 4)
        return this.executeSUBAn8D6();

      case 0xda: // JP C,a16 - Conditional jump if carry (Phase 5)
        return this.executeJPCa16DA();

      case 0xde: // SBC A,n8 - Subtract immediate 8-bit value from A with carry (Phase 4)
        return this.executeSBCAn8DE();

      case 0xe9: // JP (HL) - Jump to address in HL register (Phase 5)
        return this.executeJPHLE9();

      case 0xea: // LD (a16),A - Store A into 16-bit immediate address
        return this.executeLDa16A();

      case 0xcb: {
        // CB prefix - extended instruction set
        const cbOpcode = this.mmu.readByte(this.registers.pc);
        this.registers.pc = (this.registers.pc + 1) & 0xffff;
        switch (cbOpcode) {
          // RLC instructions (0x00-0x07) - Rotate Left Circular
          case 0x00: // RLC B
            return this.executeCB_RLCB00();
          case 0x01: // RLC C
            return this.executeCB_RLCC01();
          case 0x02: // RLC D
            return this.executeCB_RLCD02();
          case 0x03: // RLC E
            return this.executeCB_RLCE03();
          case 0x04: // RLC H
            return this.executeCB_RLCH04();
          case 0x05: // RLC L
            return this.executeCB_RLCL05();
          case 0x06: // RLC (HL)
            return this.executeCB_RLCHL06();
          case 0x07: // RLC A
            return this.executeCB_RLCA07();

          // RRC instructions (0x08-0x0F)
          case 0x08: // RRC B
            return this.executeCB_RRCB08();
          case 0x09: // RRC C
            return this.executeCB_RRCC09();
          case 0x0a: // RRC D
            return this.executeCB_RRCD0A();
          case 0x0b: // RRC E
            return this.executeCB_RRCE0B();
          case 0x0c: // RRC H
            return this.executeCB_RRCH0C();
          case 0x0d: // RRC L
            return this.executeCB_RRCL0D();
          case 0x0e: // RRC (HL)
            return this.executeCB_RRCHL0E();
          case 0x0f: // RRC A
            return this.executeCB_RRCA0F();

          // RL instructions (0x10-0x17)
          case 0x10: // RL B
            return this.executeCB_RLB10();
          case 0x11: // RL C
            return this.executeCB_RLC11();
          case 0x12: // RL D
            return this.executeCB_RLD12();
          case 0x13: // RL E
            return this.executeCB_RLE13();
          case 0x14: // RL H
            return this.executeCB_RLH14();
          case 0x15: // RL L
            return this.executeCB_RLL15();
          case 0x16: // RL (HL)
            return this.executeCB_RLHL16();
          case 0x17: // RL A
            return this.executeCB_RLA17();

          // SWAP instructions (0x30-0x37)
          case 0x30: // SWAP B
            return this.executeSWAPB30();
          case 0x31: // SWAP C
            return this.executeSWAPC31();
          case 0x32: // SWAP D
            return this.executeSWAPD32();
          case 0x33: // SWAP E
            return this.executeSWAPE33();
          case 0x34: // SWAP H
            return this.executeSWAPH34();
          case 0x35: // SWAP L
            return this.executeSWAPL35();
          case 0x36: // SWAP (HL)
            return this.executeSWAPHL36();
          case 0x37: // SWAP A
            return this.executeSWAPA37();

          // SRL instructions (0x38-0x3F)
          case 0x38: // SRL B
            return this.executeCB_SRLB_38();
          case 0x39: // SRL C
            return this.executeCB_SRLC_39();
          case 0x3a: // SRL D
            return this.executeCB_SRLD_3A();
          case 0x3b: // SRL E
            return this.executeCB_SRLE_3B();
          case 0x3c: // SRL H
            return this.executeCB_SRLH_3C();
          case 0x3d: // SRL L
            return this.executeCB_SRLL_3D();
          case 0x3e: // SRL (HL)
            return this.executeCB_SRLHL_3E();
          case 0x3f: // SRL A
            return this.executeCB_SRLA_3F();
          // RR instructions (0x18-0x1F) - Rotate Right through Carry
          case 0x18: // RR B - Rotate B right through carry
            return this.executeCB_RRB_18();
          case 0x19: // RR C - Rotate C right through carry
            return this.executeCB_RRC_19();
          case 0x1a: // RR D - Rotate D right through carry
            return this.executeCB_RRC_1A();
          case 0x1b: // RR E - Rotate E right through carry
            return this.executeCB_RRE_1B();
          case 0x1c: // RR H - Rotate H right through carry
            return this.executeCB_RRH_1C();
          case 0x1d: // RR L - Rotate L right through carry
            return this.executeCB_RRL_1D();
          case 0x1e: // RR (HL) - Rotate memory at HL right through carry
            return this.executeCB_RRHL_1E();
          case 0x1f: // RR A - Rotate A right through carry
            return this.executeCB_RRA_1F();

          // Shift instructions (0x20-0x2F)
          case 0x20: // SLA B
            return this.executeCB_SLAB_20();
          case 0x21: // SLA C
            return this.executeCB_SLAC_21();
          case 0x22: // SLA D
            return this.executeCB_SLAD_22();
          case 0x23: // SLA E
            return this.executeCB_SLAE_23();
          case 0x24: // SLA H
            return this.executeCB_SLAH_24();
          case 0x25: // SLA L
            return this.executeCB_SLAL_25();
          case 0x26: // SLA (HL)
            return this.executeCB_SLAHL_26();
          case 0x27: // SLA A
            return this.executeCB_SLAA_27();
          case 0x28: // SRA B
            return this.executeCB_SRAB_28();
          case 0x29: // SRA C
            return this.executeCB_SRAC_29();
          case 0x2a: // SRA D
            return this.executeCB_SRAD_2A();
          case 0x2b: // SRA E
            return this.executeCB_SRAE_2B();
          case 0x2c: // SRA H
            return this.executeCB_SRAH_2C();
          case 0x2d: // SRA L
            return this.executeCB_SRAL_2D();
          case 0x2e: // SRA (HL)
            return this.executeCB_SRAHL_2E();
          case 0x2f: // SRA A
            return this.executeCB_SRAA_2F();

          // BIT instructions (0x40-0x7F)
          case 0x40: // BIT 0,B
            return this.executeCB_BIT0B40();
          case 0x41: // BIT 0,C
            return this.executeCB_BIT0C41();
          case 0x42: // BIT 0,D
            return this.executeCB_BIT0D42();
          case 0x43: // BIT 0,E
            return this.executeCB_BIT0E43();
          case 0x44: // BIT 0,H
            return this.executeCB_BIT0H44();
          case 0x45: // BIT 0,L
            return this.executeCB_BIT0L45();
          case 0x46: // BIT 0,(HL)
            return this.executeCB_BIT0HL46();
          case 0x47: // BIT 0,A
            return this.executeCB_BIT0A47();
          case 0x48: // BIT 1,B
            return this.executeCB_BIT1B48();
          case 0x49: // BIT 1,C
            return this.executeCB_BIT1C49();
          case 0x4a: // BIT 1,D
            return this.executeCB_BIT1D4A();
          case 0x4b: // BIT 1,E
            return this.executeCB_BIT1E4B();
          case 0x4c: // BIT 1,H
            return this.executeCB_BIT1H4C();
          case 0x4d: // BIT 1,L
            return this.executeCB_BIT1L4D();
          case 0x4e: // BIT 1,(HL)
            return this.executeCB_BIT1HL4E();
          case 0x4f: // BIT 1,A
            return this.executeCB_BIT1A4F();
          case 0x50: // BIT 2,B
            return this.executeCB_BIT2B50();
          case 0x51: // BIT 2,C
            return this.executeCB_BIT2C51();
          case 0x52: // BIT 2,D
            return this.executeCB_BIT2D52();
          case 0x53: // BIT 2,E
            return this.executeCB_BIT2E53();
          case 0x54: // BIT 2,H
            return this.executeCB_BIT2H54();
          case 0x55: // BIT 2,L
            return this.executeCB_BIT2L55();
          case 0x56: // BIT 2,(HL)
            return this.executeCB_BIT2HL56();
          case 0x57: // BIT 2,A
            return this.executeCB_BIT2A57();
          case 0x58: // BIT 3,B
            return this.executeCB_BIT3B58();
          case 0x59: // BIT 3,C
            return this.executeCB_BIT3C59();
          case 0x5a: // BIT 3,D
            return this.executeCB_BIT3D5A();
          case 0x5b: // BIT 3,E
            return this.executeCB_BIT3E5B();
          case 0x5c: // BIT 3,H
            return this.executeCB_BIT3H5C();
          case 0x5d: // BIT 3,L
            return this.executeCB_BIT3L5D();
          case 0x5e: // BIT 3,(HL)
            return this.executeCB_BIT3HL5E();
          case 0x5f: // BIT 3,A
            return this.executeCB_BIT3A5F();
          case 0x60: // BIT 4,B
            return this.executeCB_BIT4B60();
          case 0x61: // BIT 4,C
            return this.executeCB_BIT4C61();
          case 0x62: // BIT 4,D
            return this.executeCB_BIT4D62();
          case 0x63: // BIT 4,E
            return this.executeCB_BIT4E63();
          case 0x64: // BIT 4,H
            return this.executeCB_BIT4H64();
          case 0x65: // BIT 4,L
            return this.executeCB_BIT4L65();
          case 0x66: // BIT 4,(HL)
            return this.executeCB_BIT4HL66();
          case 0x67: // BIT 4,A
            return this.executeCB_BIT4A67();
          case 0x68: // BIT 5,B
            return this.executeCB_BIT5B68();
          case 0x69: // BIT 5,C
            return this.executeCB_BIT5C69();
          case 0x6a: // BIT 5,D
            return this.executeCB_BIT5D6A();
          case 0x6b: // BIT 5,E
            return this.executeCB_BIT5E6B();
          case 0x6c: // BIT 5,H
            return this.executeCB_BIT5H6C();
          case 0x6d: // BIT 5,L
            return this.executeCB_BIT5L6D();
          case 0x6e: // BIT 5,(HL)
            return this.executeCB_BIT5HL6E();
          case 0x6f: // BIT 5,A
            return this.executeCB_BIT5A6F();
          case 0x70: // BIT 6,B
            return this.executeCB_BIT6B70();
          case 0x71: // BIT 6,C
            return this.executeCB_BIT6C71();
          case 0x72: // BIT 6,D
            return this.executeCB_BIT6D72();
          case 0x73: // BIT 6,E
            return this.executeCB_BIT6E73();
          case 0x74: // BIT 6,H
            return this.executeCB_BIT6H74();
          case 0x75: // BIT 6,L
            return this.executeCB_BIT6L75();
          case 0x76: // BIT 6,(HL)
            return this.executeCB_BIT6HL76();
          case 0x77: // BIT 6,A
            return this.executeCB_BIT6A77();
          case 0x78: // BIT 7,B
            return this.executeCB_BIT7B78();
          case 0x79: // BIT 7,C
            return this.executeCB_BIT7C79();
          case 0x7a: // BIT 7,D
            return this.executeCB_BIT7D7A();
          case 0x7b: // BIT 7,E
            return this.executeCB_BIT7E7B();
          case 0x7c: // BIT 7,H
            return this.executeCB_BIT7H7C();
          case 0x7d: // BIT 7,L
            return this.executeCB_BIT7L7D();
          case 0x7e: // BIT 7,(HL)
            return this.executeCB_BIT7HL7E();
          case 0x7f: // BIT 7,A
            return this.executeCB_BIT7A7F();

          // RES instructions (0x80-0xBF)
          case 0x80:
            return this.executeCB_RES0B_80();
          case 0x81:
            return this.executeCB_RES0C_81();
          case 0x82:
            return this.executeCB_RES0D_82();
          case 0x83:
            return this.executeCB_RES0E_83();
          case 0x84:
            return this.executeCB_RES0H_84();
          case 0x85:
            return this.executeCB_RES0L_85();
          case 0x86:
            return this.executeCB_RES0HL_86();
          case 0x87:
            return this.executeCB_RES0A_87();
          case 0x88:
            return this.executeCB_RES1B_88();
          case 0x89:
            return this.executeCB_RES1C_89();
          case 0x8a:
            return this.executeCB_RES1D_8A();
          case 0x8b:
            return this.executeCB_RES1E_8B();
          case 0x8c:
            return this.executeCB_RES1H_8C();
          case 0x8d:
            return this.executeCB_RES1L_8D();
          case 0x8e:
            return this.executeCB_RES1HL_8E();
          case 0x8f:
            return this.executeCB_RES1A_8F();
          case 0x90:
            return this.executeCB_RES2B_90();
          case 0x91:
            return this.executeCB_RES2C_91();
          case 0x92:
            return this.executeCB_RES2D_92();
          case 0x93:
            return this.executeCB_RES2E_93();
          case 0x94:
            return this.executeCB_RES2H_94();
          case 0x95:
            return this.executeCB_RES2L_95();
          case 0x96:
            return this.executeCB_RES2HL_96();
          case 0x97:
            return this.executeCB_RES2A_97();
          case 0x98:
            return this.executeCB_RES3B_98();
          case 0x99:
            return this.executeCB_RES3C_99();
          case 0x9a:
            return this.executeCB_RES3D_9A();
          case 0x9b:
            return this.executeCB_RES3E_9B();
          case 0x9c:
            return this.executeCB_RES3H_9C();
          case 0x9d:
            return this.executeCB_RES3L_9D();
          case 0x9e:
            return this.executeCB_RES3HL_9E();
          case 0x9f:
            return this.executeCB_RES3A_9F();
          case 0xa0:
            return this.executeCB_RES4B_A0();
          case 0xa1:
            return this.executeCB_RES4C_A1();
          case 0xa2:
            return this.executeCB_RES4D_A2();
          case 0xa3:
            return this.executeCB_RES4E_A3();
          case 0xa4:
            return this.executeCB_RES4H_A4();
          case 0xa5:
            return this.executeCB_RES4L_A5();
          case 0xa6:
            return this.executeCB_RES4HL_A6();
          case 0xa7:
            return this.executeCB_RES4A_A7();
          case 0xa8:
            return this.executeCB_RES5B_A8();
          case 0xa9:
            return this.executeCB_RES5C_A9();
          case 0xaa:
            return this.executeCB_RES5D_AA();
          case 0xab:
            return this.executeCB_RES5E_AB();
          case 0xac:
            return this.executeCB_RES5H_AC();
          case 0xad:
            return this.executeCB_RES5L_AD();
          case 0xae:
            return this.executeCB_RES5HL_AE();
          case 0xaf:
            return this.executeCB_RES5A_AF();
          case 0xb0:
            return this.executeCB_RES6B_B0();
          case 0xb1:
            return this.executeCB_RES6C_B1();
          case 0xb2:
            return this.executeCB_RES6D_B2();
          case 0xb3:
            return this.executeCB_RES6E_B3();
          case 0xb4:
            return this.executeCB_RES6H_B4();
          case 0xb5:
            return this.executeCB_RES6L_B5();
          case 0xb6:
            return this.executeCB_RES6HL_B6();
          case 0xb7:
            return this.executeCB_RES6A_B7();
          case 0xb8:
            return this.executeCB_RES7B_B8();
          case 0xb9:
            return this.executeCB_RES7C_B9();
          case 0xba:
            return this.executeCB_RES7D_BA();
          case 0xbb:
            return this.executeCB_RES7E_BB();
          case 0xbc:
            return this.executeCB_RES7H_BC();
          case 0xbd:
            return this.executeCB_RES7L_BD();
          case 0xbe:
            return this.executeCB_RES7HL_BE();
          case 0xbf:
            return this.executeCB_RES7A_BF();

          // SET instructions (0xC0-0xFF)
          case 0xc0:
            return this.executeCB_SET0B_C0();
          case 0xc1:
            return this.executeCB_SET0C_C1();
          case 0xc2:
            return this.executeCB_SET0D_C2();
          case 0xc3:
            return this.executeCB_SET0E_C3();
          case 0xc4:
            return this.executeCB_SET0H_C4();
          case 0xc5:
            return this.executeCB_SET0L_C5();
          case 0xc6:
            return this.executeCB_SET0HL_C6();
          case 0xc7:
            return this.executeCB_SET0A_C7();
          case 0xc8:
            return this.executeCB_SET1B_C8();
          case 0xc9:
            return this.executeCB_SET1C_C9();
          case 0xca:
            return this.executeCB_SET1D_CA();
          case 0xcb:
            return this.executeCB_SET1E_CB();
          case 0xcc:
            return this.executeCB_SET1H_CC();
          case 0xcd:
            return this.executeCB_SET1L_CD();
          case 0xce:
            return this.executeCB_SET1HL_CE();
          case 0xcf:
            return this.executeCB_SET1A_CF();
          case 0xd0:
            return this.executeCB_SET2B_D0();
          case 0xd1:
            return this.executeCB_SET2C_D1();
          case 0xd2:
            return this.executeCB_SET2D_D2();
          case 0xd3:
            return this.executeCB_SET2E_D3();
          case 0xd4:
            return this.executeCB_SET2H_D4();
          case 0xd5:
            return this.executeCB_SET2L_D5();
          case 0xd6:
            return this.executeCB_SET2HL_D6();
          case 0xd7:
            return this.executeCB_SET2A_D7();
          case 0xd8:
            return this.executeCB_SET3B_D8();
          case 0xd9:
            return this.executeCB_SET3C_D9();
          case 0xda:
            return this.executeCB_SET3D_DA();
          case 0xdb:
            return this.executeCB_SET3E_DB();
          case 0xdc:
            return this.executeCB_SET3H_DC();
          case 0xdd:
            return this.executeCB_SET3L_DD();
          case 0xde:
            return this.executeCB_SET3HL_DE();
          case 0xdf:
            return this.executeCB_SET3A_DF();
          case 0xe0:
            return this.executeCB_SET4B_E0();
          case 0xe1:
            return this.executeCB_SET4C_E1();
          case 0xe2:
            return this.executeCB_SET4D_E2();
          case 0xe3:
            return this.executeCB_SET4E_E3();
          case 0xe4:
            return this.executeCB_SET4H_E4();
          case 0xe5:
            return this.executeCB_SET4L_E5();
          case 0xe6:
            return this.executeCB_SET4HL_E6();
          case 0xe7:
            return this.executeCB_SET4A_E7();
          case 0xe8:
            return this.executeCB_SET5B_E8();
          case 0xe9:
            return this.executeCB_SET5C_E9();
          case 0xea:
            return this.executeCB_SET5D_EA();
          case 0xeb:
            return this.executeCB_SET5E_EB();
          case 0xec:
            return this.executeCB_SET5H_EC();
          case 0xed:
            return this.executeCB_SET5L_ED();
          case 0xee:
            return this.executeCB_SET5HL_EE();
          case 0xef:
            return this.executeCB_SET5A_EF();
          case 0xf0:
            return this.executeCB_SET6B_F0();
          case 0xf1:
            return this.executeCB_SET6C_F1();
          case 0xf2:
            return this.executeCB_SET6D_F2();
          case 0xf3:
            return this.executeCB_SET6E_F3();
          case 0xf4:
            return this.executeCB_SET6H_F4();
          case 0xf5:
            return this.executeCB_SET6L_F5();
          case 0xf6:
            return this.executeCB_SET6HL_F6();
          case 0xf7:
            return this.executeCB_SET6A_F7();
          case 0xf8:
            return this.executeCB_SET7B_F8();
          case 0xf9:
            return this.executeCB_SET7C_F9();
          case 0xfa:
            return this.executeCB_SET7D_FA();
          case 0xfb:
            return this.executeCB_SET7E_FB();
          case 0xfc:
            return this.executeCB_SET7H_FC();
          case 0xfd:
            return this.executeCB_SET7L_FD();
          case 0xfe:
            return this.executeCB_SET7HL_FE();
          case 0xff:
            return this.executeCB_SET7A_FF();

          default:
            throw new Error(`Invalid CB opcode: 0x${cbOpcode.toString(16).toUpperCase()}`);
        }
      }

      // ===== PHASE 6: INC/DEC INSTRUCTION FAMILY (24 instructions) =====
      // 16-bit register INC instructions
      case 0x03: // INC BC - Increment BC register pair (8 cycles, no flags)
        return this.executeINCBC03();
      case 0x13: // INC DE - Increment DE register pair (8 cycles, no flags)
        return this.executeINCDE13();
      case 0x23: // INC HL - Increment HL register pair (8 cycles, no flags)
        return this.executeINCHL23();
      case 0x33: // INC SP - Increment SP register (8 cycles, no flags)
        return this.executeINCSP33();

      // 8-bit register INC instructions
      case 0x04: // INC B - Increment B register (4 cycles, Z/N/H flags)
        return this.executeINCB04();
      case 0x0c: // INC C - Increment C register (4 cycles, Z/N/H flags)
        return this.executeINCC0C();
      case 0x14: // INC D - Increment D register (4 cycles, Z/N/H flags)
        return this.executeINCD14();
      case 0x1c: // INC E - Increment E register (4 cycles, Z/N/H flags)
        return this.executeINCE1C();
      case 0x24: // INC H - Increment H register (4 cycles, Z/N/H flags)
        return this.executeINCH24();
      case 0x2c: // INC L - Increment L register (4 cycles, Z/N/H flags)
        return this.executeINCL2C();
      case 0x3c: // INC A - Increment A register (4 cycles, Z/N/H flags)
        return this.executeINCA3C();

      // Memory INC instruction
      case 0x34: // INC (HL) - Increment memory at HL address (12 cycles, Z/N/H flags)
        return this.executeINCHL34();

      // 16-bit register DEC instructions
      case 0x0b: // DEC BC - Decrement BC register pair (8 cycles, no flags)
        return this.executeDECBC0B();
      case 0x1b: // DEC DE - Decrement DE register pair (8 cycles, no flags)
        return this.executeDECDE1B();
      case 0x2b: // DEC HL - Decrement HL register pair (8 cycles, no flags)
        return this.executeDECHL2B();
      case 0x3b: // DEC SP - Decrement SP register (8 cycles, no flags)
        return this.executeDECSP3B();

      // 8-bit register DEC instructions
      case 0x05: // DEC B - Decrement B register (4 cycles, Z/N/H flags)
        return this.executeDECB05();
      case 0x0d: // DEC C - Decrement C register (4 cycles, Z/N/H flags)
        return this.executeDECC0D();
      case 0x15: // DEC D - Decrement D register (4 cycles, Z/N/H flags)
        return this.executeDECD15();
      case 0x1d: // DEC E - Decrement E register (4 cycles, Z/N/H flags)
        return this.executeDECE1D();
      case 0x25: // DEC H - Decrement H register (4 cycles, Z/N/H flags)
        return this.executeDECH25();
      case 0x2d: // DEC L - Decrement L register (4 cycles, Z/N/H flags)
        return this.executeDECL2D();
      case 0x3d: // DEC A - Decrement A register (4 cycles, Z/N/H flags)
        return this.executeDECA3D();

      // Memory DEC instruction
      case 0x35: // DEC (HL) - Decrement memory at HL address (12 cycles, Z/N/H flags)
        return this.executeDECHL35();

      // ===== PHASE 8: LOGICAL OPERATIONS FAMILY (36 instructions) =====
      // AND family instructions
      case 0xa0: // AND A,B - Logical AND with B register (4 cycles, Z/N/H/C flags)
        return this.executeANDABA0();
      case 0xa1: // AND A,C - Logical AND with C register (4 cycles, Z/N/H/C flags)
        return this.executeANDACA1();
      case 0xa2: // AND A,D - Logical AND with D register (4 cycles, Z/N/H/C flags)
        return this.executeANDADA2();
      case 0xa3: // AND A,E - Logical AND with E register (4 cycles, Z/N/H/C flags)
        return this.executeANDAEA3();
      case 0xa4: // AND A,H - Logical AND with H register (4 cycles, Z/N/H/C flags)
        return this.executeANDAHA4();
      case 0xa5: // AND A,L - Logical AND with L register (4 cycles, Z/N/H/C flags)
        return this.executeANDALA5();
      case 0xa6: // AND A,(HL) - Logical AND with memory at HL (8 cycles, Z/N/H/C flags)
        return this.executeANDAHLA6();
      case 0xa7: // AND A,A - Logical AND with A register (4 cycles, Z/N/H/C flags)
        return this.executeANDAAA7();
      case 0xe6: // AND A,n8 - Logical AND with immediate value (8 cycles, Z/N/H/C flags)
        return this.executeANDAn8E6();

      // OR family instructions
      case 0xb0: // OR A,B - Logical OR with B register (4 cycles, Z/N/H/C flags)
        return this.executeORABB0();
      case 0xb1: // OR A,C - Logical OR with C register (4 cycles, Z/N/H/C flags)
        return this.executeORACB1();
      case 0xb2: // OR A,D - Logical OR with D register (4 cycles, Z/N/H/C flags)
        return this.executeORADB2();
      case 0xb3: // OR A,E - Logical OR with E register (4 cycles, Z/N/H/C flags)
        return this.executeORAEB3();
      case 0xb4: // OR A,H - Logical OR with H register (4 cycles, Z/N/H/C flags)
        return this.executeORAHB4();
      case 0xb5: // OR A,L - Logical OR with L register (4 cycles, Z/N/H/C flags)
        return this.executeORALB5();
      case 0xb6: // OR A,(HL) - Logical OR with memory at HL (8 cycles, Z/N/H/C flags)
        return this.executeORAHLB6();
      case 0xb7: // OR A,A - Logical OR with A register (4 cycles, Z/N/H/C flags)
        return this.executeORAAB7();
      case 0xf6: // OR A,n8 - Logical OR with immediate value (8 cycles, Z/N/H/C flags)
        return this.executeORAn8F6();

      // XOR family instructions
      case 0xa8: // XOR A,B - Logical XOR with B register (4 cycles, Z/N/H/C flags)
        return this.executeXORABA8();
      case 0xa9: // XOR A,C - Logical XOR with C register (4 cycles, Z/N/H/C flags)
        return this.executeXORACA9();
      case 0xaa: // XOR A,D - Logical XOR with D register (4 cycles, Z/N/H/C flags)
        return this.executeXORADAA();
      case 0xab: // XOR A,E - Logical XOR with E register (4 cycles, Z/N/H/C flags)
        return this.executeXORAEAB();
      case 0xac: // XOR A,H - Logical XOR with H register (4 cycles, Z/N/H/C flags)
        return this.executeXORAHAC();
      case 0xad: // XOR A,L - Logical XOR with L register (4 cycles, Z/N/H/C flags)
        return this.executeXORALAD();
      case 0xae: // XOR A,(HL) - Logical XOR with memory at HL (8 cycles, Z/N/H/C flags)
        return this.executeXORAHLAE();
      case 0xaf: // XOR A,A - Logical XOR with A register (4 cycles, Z/N/H/C flags)
        return this.executeXORAAAAF();
      case 0xee: // XOR A,n8 - Logical XOR with immediate value (8 cycles, Z/N/H/C flags)
        return this.executeXORAn8EE();

      // CP family instructions
      case 0xb8: // CP A,B - Compare A with B register (4 cycles, Z/N/H/C flags)
        return this.executeCPABB8();
      case 0xb9: // CP A,C - Compare A with C register (4 cycles, Z/N/H/C flags)
        return this.executeCPACB9();
      case 0xba: // CP A,D - Compare A with D register (4 cycles, Z/N/H/C flags)
        return this.executeCPADBA();
      case 0xbb: // CP A,E - Compare A with E register (4 cycles, Z/N/H/C flags)
        return this.executeCPAEBB();
      case 0xbc: // CP A,H - Compare A with H register (4 cycles, Z/N/H/C flags)
        return this.executeCPAHBC();
      case 0xbd: // CP A,L - Compare A with L register (4 cycles, Z/N/H/C flags)
        return this.executeCPALBD();
      case 0xbe: // CP A,(HL) - Compare A with memory at HL (8 cycles, Z/N/H/C flags)
        return this.executeCPAHLBE();
      case 0xbf: // CP A,A - Compare A with A register (4 cycles, Z/N/H/C flags)
        return this.executeCPAABF();
      case 0xfe: // CP A,n8 - Compare A with immediate value (8 cycles, Z/N/H/C flags)
        return this.executeCPAn8FE();

      // PHASE 9: CONTROL FLOW AND STACK MANAGEMENT INSTRUCTIONS

      // CALL FAMILY (9 instructions)
      case 0xcd: // CALL nn - Unconditional call to 16-bit address (24 cycles)
        return this.executeCALLnn();
      case 0xc4: // CALL NZ,nn - Call if not zero (24/12 cycles)
        return this.executeCALLNZnn();
      case 0xcc: // CALL Z,nn - Call if zero (24/12 cycles)
        return this.executeCALLZnn();
      case 0xd4: // CALL NC,nn - Call if not carry (24/12 cycles)
        return this.executeCALLNCnn();
      case 0xdc: // CALL C,nn - Call if carry (24/12 cycles)
        return this.executeCALLCnn();

      // RET FAMILY (6 instructions)
      case 0xc9: // RET - Unconditional return (16 cycles)
        return this.executeRET();
      case 0xc0: // RET NZ - Return if not zero (20/8 cycles)
        return this.executeRETNZ();
      case 0xc8: // RET Z - Return if zero (20/8 cycles)
        return this.executeRETZ();
      case 0xd0: // RET NC - Return if not carry (20/8 cycles)
        return this.executeRETNC();
      case 0xd8: // RET C - Return if carry (20/8 cycles)
        return this.executeRETC();
      case 0xd9: // RETI - Return and enable interrupts (16 cycles)
        return this.executeRETI();

      // RST FAMILY (8 instructions)
      case 0xc7: // RST 00H - Call to address 0x0000 (16 cycles)
        return this.executeRST00H();
      case 0xcf: // RST 08H - Call to address 0x0008 (16 cycles)
        return this.executeRST08H();
      case 0xd7: // RST 10H - Call to address 0x0010 (16 cycles)
        return this.executeRST10H();
      case 0xdf: // RST 18H - Call to address 0x0018 (16 cycles)
        return this.executeRST18H();
      case 0xe7: // RST 20H - Call to address 0x0020 (16 cycles)
        return this.executeRST20H();
      case 0xef: // RST 28H - Call to address 0x0028 (16 cycles)
        return this.executeRST28H();
      case 0xf7: // RST 30H - Call to address 0x0030 (16 cycles)
        return this.executeRST30H();
      case 0xff: // RST 38H - Call to address 0x0038 (16 cycles)
        return this.executeRST38H();

      // PUSH FAMILY (4 instructions)
      case 0xc5: // PUSH BC - Push BC onto stack (16 cycles)
        return this.executePUSHBC();
      case 0xd5: // PUSH DE - Push DE onto stack (16 cycles)
        return this.executePUSHDE();
      case 0xe5: // PUSH HL - Push HL onto stack (16 cycles)
        return this.executePUSHHL();
      case 0xf5: // PUSH AF - Push AF onto stack (16 cycles)
        return this.executePUSHAF();

      // POP FAMILY (4 instructions)
      case 0xc1: // POP BC - Pop BC from stack (12 cycles)
        return this.executePOPBC();
      case 0xd1: // POP DE - Pop DE from stack (12 cycles)
        return this.executePOPDE();
      case 0xe1: // POP HL - Pop HL from stack (12 cycles)
        return this.executePOPHL();
      case 0xf1: // POP AF - Pop AF from stack (12 cycles)
        return this.executePOPAF();

      // ===== PHASE 10: MISCELLANEOUS OPERATIONS FAMILY (7 remaining instructions) =====
      case 0x10: // STOP - Stop CPU and LCD (2-byte instruction)
        return this.executeSTOP();
      case 0x27: // DAA - Decimal adjust accumulator
        return this.executeDAA();
      case 0x2f: // CPL - Complement accumulator
        return this.executeCPL();
      case 0x37: // SCF - Set carry flag
        return this.executeSCF();
      case 0x3f: // CCF - Complement carry flag
        return this.executeCCF();
      case 0xf3: // DI - Disable interrupts
        return this.executeDI();
      case 0xfb: // EI - Enable interrupts
        return this.executeEI();

      default: {
        // Log detailed error for unimplemented opcodes to aid debugging
        const pc_at_fault = this.registers.pc - 1; // PC has already been incremented
        // eslint-disable-next-line no-console
        console.error(
          `Unimplemented opcode: 0x${opcode.toString(16).toUpperCase()} at PC: 0x${pc_at_fault.toString(16).toUpperCase()}`
        );
        // eslint-disable-next-line no-console
        console.error(`CPU State: ${this.getDebugInfo()}`);
        throw new Error(`Invalid opcode: 0x${opcode.toString(16).toUpperCase()}`);
      }
    }
  }

  /**
   * NOP (0x00) - No Operation
   * Hardware: 1 byte, 4 cycles, no flag changes
   */
  private executeNOP(): number {
    // No operation - just consume cycles
    return 4;
  }

  /**
   * LD B,n8 (0x06) - Load 8-bit immediate into B register
   * Hardware: 2 bytes, 8 cycles, no flag changes
   */
  private executeLDBn8(): number {
    // Read immediate 8-bit value from PC
    const immediateValue = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Load value into B register
    this.registers.b = immediateValue;

    return 8;
  }

  /**
   * LD C,n8 (0x0E) - Load 8-bit immediate into C register
   * Hardware: 2 bytes, 8 cycles, no flag changes
   */
  private executeLDCn8(): number {
    // Read immediate 8-bit value from PC
    const immediateValue = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Load value into C register
    this.registers.c = immediateValue;

    return 8;
  }

  /**
   * HALT (0x76) - Halt until interrupt
   * Hardware: 1 byte, 4 cycles, no flag changes
   */
  private executeHALT(): number {
    // Set halt state
    this.halted = true;

    return 4;
  }

  /**
   * ADD A,B (0x80) - Add B to A
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   */
  private executeADDAB(): number {
    this.executeADD(this.registers.b);
    return 4;
  }

  /**
   * ADD A,C (0x81) - Add C to A
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   */
  private executeADDAC(): number {
    this.executeADD(this.registers.c);
    return 4;
  }

  /**
   * JP a16 (0xC3) - Jump to 16-bit address
   * Hardware: 3 bytes, 16 cycles, no flag changes
   */
  private executeJPa16(): number {
    // Read 16-bit address from PC (little-endian)
    const lowByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const highByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Construct target address (little-endian)
    const targetAddress = (highByte << 8) | lowByte;

    // Jump to target address
    this.registers.pc = targetAddress & 0xffff;

    return 4; // RGBDS GBZ80: JP nn takes 4 cycles
  }

  /**
   * LD (HL),B (0x70) - Store B into memory address pointed to by HL
   * Hardware: 1 byte, 8 cycles, no flag changes
   */
  private executeLDHLB(): number {
    // Get HL register pair value as 16-bit address
    const hlAddress = this.getHL();

    // Store B register value at address pointed to by HL
    this.mmu.writeByte(hlAddress, this.registers.b);

    return 8;
  }

  /**
   * LD (a16),A (0xEA) - Store A into 16-bit immediate address
   * Hardware: 3 bytes, 16 cycles, no flag changes
   */
  private executeLDa16A(): number {
    // Read 16-bit address from PC (little-endian)
    const lowByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const highByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Construct target address (little-endian)
    const targetAddress = (highByte << 8) | lowByte;

    // Store A register value at target address
    this.mmu.writeByte(targetAddress, this.registers.a);

    return 16;
  }

  /**
   * Get HL register pair as 16-bit value
   * H is high byte, L is low byte
   */
  private getHL(): number {
    return (this.registers.h << 8) | this.registers.l;
  }

  private setHL(value: number): void {
    this.registers.h = (value >> 8) & 0xff;
    this.registers.l = value & 0xff;
  }

  private getBC(): number {
    return (this.registers.b << 8) | this.registers.c;
  }

  private getDE(): number {
    return (this.registers.d << 8) | this.registers.e;
  }

  /**
   * Common ADD operation logic
   * Handles flag calculations for ADD instructions
   */
  private executeADD(value: number): void {
    const a = this.registers.a;
    const result = a + value;

    // Update A register with result (8-bit overflow wraps)
    this.registers.a = result & 0xff;

    // Calculate flags
    // Z flag: set if result is zero
    const zFlag = (result & 0xff) === 0;

    // N flag: always clear for ADD operations
    const nFlag = false;

    // H flag: set if carry occurred from bit 3 to bit 4
    const hFlag = (a & 0x0f) + (value & 0x0f) > 0x0f;

    // C flag: set if carry occurred from bit 7 (result > 255)
    const cFlag = result > 0xff;

    // Update flag register
    this.setZeroFlag(zFlag);
    this.setSubtractFlag(nFlag);
    this.setHalfCarryFlag(hFlag);
    this.setCarryFlag(cFlag);
  }

  /**
   * BIT 0,(HL) (CB 0x46) - Test bit 0 of memory at HL address
   * Hardware: 2 bytes, 12 cycles, sets Z,N,H flags (C unchanged)
   */
  private executeCB_BIT0HL46(): number {
    // Read value from memory at HL address
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);

    // Test bit 0 (least significant bit)
    const bitSet = (value & 0x01) !== 0;

    // Set flags according to BIT instruction behavior
    // Z flag: set if tested bit is 0 (opposite of bit state)
    this.setZeroFlag(!bitSet);

    // N flag: always cleared for BIT instructions
    this.setSubtractFlag(false);

    // H flag: always set for BIT instructions
    this.setHalfCarryFlag(true);

    // C flag: unchanged by BIT instructions

    return 12; // Memory access takes 12 cycles
  }

  /**
   * BIT 7,H (CB 0x7C) - Test bit 7 of H register
   * Hardware: 2 bytes, 8 cycles, sets Z,N,H flags (C unchanged)
   */
  private executeCB_BIT7H7C(): number {
    // Read value from H register
    const value = this.registers.h;

    // Test bit 7 (most significant bit)
    const bitSet = (value & 0x80) !== 0;

    // Set flags according to BIT instruction behavior
    // Z flag: set if tested bit is 0 (opposite of bit state)
    this.setZeroFlag(!bitSet);

    // N flag: always cleared for BIT instructions
    this.setSubtractFlag(false);

    // H flag: always set for BIT instructions
    this.setHalfCarryFlag(true);

    // C flag: unchanged by BIT instructions

    return 8; // Register access takes 8 cycles
  }

  /**
   * BIT 7,B (CB 0x78) - Test bit 7 of B register
   * Hardware: 2 bytes, 8 cycles, sets Z,N,H flags (C unchanged)
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT7B78(): number {
    // Read value from B register
    const value = this.registers.b;

    // Test bit 7 (most significant bit)
    const bitSet = (value & 0x80) !== 0;

    // Set flags according to BIT instruction behavior
    // Z flag: set if tested bit is 0 (opposite of bit state)
    this.setZeroFlag(!bitSet);

    // N flag: always cleared for BIT instructions
    this.setSubtractFlag(false);

    // H flag: always set for BIT instructions
    this.setHalfCarryFlag(true);

    // C flag: unchanged by BIT instructions

    return 8; // Register access takes 8 cycles
  }

  /**
   * BIT 7,C (CB 0x79) - Test bit 7 of C register
   * Hardware: 2 bytes, 8 cycles, sets Z,N,H flags (C unchanged)
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT7C79(): number {
    // Read value from C register
    const value = this.registers.c;

    // Test bit 7 (most significant bit)
    const bitSet = (value & 0x80) !== 0;

    // Set flags according to BIT instruction behavior
    // Z flag: set if tested bit is 0 (opposite of bit state)
    this.setZeroFlag(!bitSet);

    // N flag: always cleared for BIT instructions
    this.setSubtractFlag(false);

    // H flag: always set for BIT instructions
    this.setHalfCarryFlag(true);

    // C flag: unchanged by BIT instructions

    return 8; // Register access takes 8 cycles
  }

  /**
   * BIT 7,D (CB 0x7A) - Test bit 7 of D register
   * Hardware: 2 bytes, 8 cycles, sets Z,N,H flags (C unchanged)
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT7D7A(): number {
    // Read value from D register
    const value = this.registers.d;

    // Test bit 7 (most significant bit)
    const bitSet = (value & 0x80) !== 0;

    // Set flags according to BIT instruction behavior
    // Z flag: set if tested bit is 0 (opposite of bit state)
    this.setZeroFlag(!bitSet);

    // N flag: always cleared for BIT instructions
    this.setSubtractFlag(false);

    // H flag: always set for BIT instructions
    this.setHalfCarryFlag(true);

    // C flag: unchanged by BIT instructions

    return 8; // Register access takes 8 cycles
  }

  /**
   * BIT 7,E (CB 0x7B) - Test bit 7 of E register
   * Hardware: 2 bytes, 8 cycles, sets Z,N,H flags (C unchanged)
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT7E7B(): number {
    // Read value from E register
    const value = this.registers.e;

    // Test bit 7 (most significant bit)
    const bitSet = (value & 0x80) !== 0;

    // Set flags according to BIT instruction behavior
    // Z flag: set if tested bit is 0 (opposite of bit state)
    this.setZeroFlag(!bitSet);

    // N flag: always cleared for BIT instructions
    this.setSubtractFlag(false);

    // H flag: always set for BIT instructions
    this.setHalfCarryFlag(true);

    // C flag: unchanged by BIT instructions

    return 8; // Register access takes 8 cycles
  }

  /**
   * BIT 7,L (CB 0x7D) - Test bit 7 of L register
   * Hardware: 2 bytes, 8 cycles, sets Z,N,H flags (C unchanged)
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT7L7D(): number {
    // Read value from L register
    const value = this.registers.l;

    // Test bit 7 (most significant bit)
    const bitSet = (value & 0x80) !== 0;

    // Set flags according to BIT instruction behavior
    // Z flag: set if tested bit is 0 (opposite of bit state)
    this.setZeroFlag(!bitSet);

    // N flag: always cleared for BIT instructions
    this.setSubtractFlag(false);

    // H flag: always set for BIT instructions
    this.setHalfCarryFlag(true);

    // C flag: unchanged by BIT instructions

    return 8; // Register access takes 8 cycles
  }

  /**
   * BIT 7,A (CB 0x7F) - Test bit 7 of A register
   * Hardware: 2 bytes, 8 cycles, sets Z,N,H flags (C unchanged)
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT7A7F(): number {
    // Read value from A register
    const value = this.registers.a;

    // Test bit 7 (most significant bit)
    const bitSet = (value & 0x80) !== 0;

    // Set flags according to BIT instruction behavior
    // Z flag: set if tested bit is 0 (opposite of bit state)
    this.setZeroFlag(!bitSet);

    // N flag: always cleared for BIT instructions
    this.setSubtractFlag(false);

    // H flag: always set for BIT instructions
    this.setHalfCarryFlag(true);

    // C flag: unchanged by BIT instructions

    return 8; // Register access takes 8 cycles
  }

  /**
   * BIT 0,B - Test bit 0 in register B
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Flags: Z=Z (set if bit is 0), N=0, H=1, C=- (unchanged)
   * Cycles: 8
   */
  private executeCB_BIT0B40(): number {
    // Read value from B register
    const value = this.registers.b;

    // Test bit 0 (least significant bit)
    const bitSet = (value & 0x01) !== 0;

    // Set flags according to BIT instruction behavior
    // Z flag: set if tested bit is 0 (opposite of bit state)
    this.setZeroFlag(!bitSet);

    // N flag: always cleared for BIT instructions
    this.setSubtractFlag(false);

    // H flag: always set for BIT instructions
    this.setHalfCarryFlag(true);

    // C flag: unchanged by BIT instructions

    return 8; // Register access takes 8 cycles
  }

  /**
   * BIT 0,C - Test bit 0 in register C
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Flags: Z=Z (set if bit is 0), N=0, H=1, C=- (unchanged)
   * Cycles: 8
   */
  private executeCB_BIT0C41(): number {
    const value = this.registers.c;
    const bitSet = (value & 0x01) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 0,D - Test bit 0 in register D
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT0D42(): number {
    const value = this.registers.d;
    const bitSet = (value & 0x01) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 0,E - Test bit 0 in register E
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT0E43(): number {
    const value = this.registers.e;
    const bitSet = (value & 0x01) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 0,H - Test bit 0 in register H
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT0H44(): number {
    const value = this.registers.h;
    const bitSet = (value & 0x01) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 0,L - Test bit 0 in register L
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT0L45(): number {
    const value = this.registers.l;
    const bitSet = (value & 0x01) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 0,A - Test bit 0 in register A
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT0A47(): number {
    const value = this.registers.a;
    const bitSet = (value & 0x01) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 1,B - Test bit 1 in register B
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT1B48(): number {
    const value = this.registers.b;
    const bitSet = (value & 0x02) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 1,C (CB 0x49) - Test bit 1 in register C
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit1==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT1C49(): number {
    const value = this.registers.c;
    const bitSet = (value & 0x02) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 1,D (CB 0x4A) - Test bit 1 in register D
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit1==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT1D4A(): number {
    const value = this.registers.d;
    const bitSet = (value & 0x02) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 1,E (CB 0x4B) - Test bit 1 in register E
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit1==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT1E4B(): number {
    const value = this.registers.e;
    const bitSet = (value & 0x02) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 1,H (CB 0x4C) - Test bit 1 in register H
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit1==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT1H4C(): number {
    const value = this.registers.h;
    const bitSet = (value & 0x02) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 1,L (CB 0x4D) - Test bit 1 in register L
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit1==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT1L4D(): number {
    const value = this.registers.l;
    const bitSet = (value & 0x02) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 1,(HL) (CB 0x4E) - Test bit 1 in memory at HL address
   * Hardware: 2 bytes, 12 cycles
   * Flags: Z=(bit1==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT1HL4E(): number {
    const address = this.getHL();
    const value = this.mmu.readByte(address);
    const bitSet = (value & 0x02) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 12;
  }

  /**
   * BIT 1,A (CB 0x4F) - Test bit 1 in register A
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit1==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT1A4F(): number {
    const value = this.registers.a;
    const bitSet = (value & 0x02) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 2,B (CB 0x50) - Test bit 2 in register B
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit2==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT2B50(): number {
    const value = this.registers.b;
    const bitSet = (value & 0x04) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 2,C (CB 0x51) - Test bit 2 in register C
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit2==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT2C51(): number {
    const value = this.registers.c;
    const bitSet = (value & 0x04) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 2,D (CB 0x52) - Test bit 2 in register D
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit2==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT2D52(): number {
    const value = this.registers.d;
    const bitSet = (value & 0x04) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 2,E (CB 0x53) - Test bit 2 in register E
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit2==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT2E53(): number {
    const value = this.registers.e;
    const bitSet = (value & 0x04) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 2,H (CB 0x54) - Test bit 2 in register H
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit2==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT2H54(): number {
    const value = this.registers.h;
    const bitSet = (value & 0x04) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 2,L (CB 0x55) - Test bit 2 in register L
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit2==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT2L55(): number {
    const value = this.registers.l;
    const bitSet = (value & 0x04) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 2,(HL) (CB 0x56) - Test bit 2 in memory at HL address
   * Hardware: 2 bytes, 12 cycles
   * Flags: Z=(bit2==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT2HL56(): number {
    const address = this.getHL();
    const value = this.mmu.readByte(address);
    const bitSet = (value & 0x04) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 12;
  }

  /**
   * BIT 2,A (CB 0x57) - Test bit 2 in register A
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit2==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT2A57(): number {
    const value = this.registers.a;
    const bitSet = (value & 0x04) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 3,B (CB 0x58) - Test bit 3 in register B
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit3==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT3B58(): number {
    const value = this.registers.b;
    const bitSet = (value & 0x08) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 3,C (CB 0x59) - Test bit 3 in register C
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit3==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT3C59(): number {
    const value = this.registers.c;
    const bitSet = (value & 0x08) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 3,E (CB 0x5B) - Test bit 3 in register E
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit3==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT3E5B(): number {
    const value = this.registers.e;
    const bitSet = (value & 0x08) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 3,H (CB 0x5C) - Test bit 3 in register H
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit3==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT3H5C(): number {
    const value = this.registers.h;
    const bitSet = (value & 0x08) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 3,L (CB 0x5D) - Test bit 3 in register L
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit3==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT3L5D(): number {
    const value = this.registers.l;
    const bitSet = (value & 0x08) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 3,(HL) (CB 0x5E) - Test bit 3 in memory at HL address
   * Hardware: 2 bytes, 12 cycles
   * Flags: Z=(bit3==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT3HL5E(): number {
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    const bitSet = (value & 0x08) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 12;
  }

  /**
   * BIT 3,A (CB 0x5F) - Test bit 3 in register A
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit3==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT3A5F(): number {
    const value = this.registers.a;
    const bitSet = (value & 0x08) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 3,D (CB 0x5A) - Test bit 3 in register D
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit3==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT3D5A(): number {
    const value = this.registers.d;
    const bitSet = (value & 0x08) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 4,B (CB 0x60) - Test bit 4 in register B
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit4==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT4B60(): number {
    const bitSet = (this.registers.b & (1 << 4)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 4,C (CB 0x61) - Test bit 4 in register C
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit4==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT4C61(): number {
    const bitSet = (this.registers.c & (1 << 4)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 4,D (CB 0x62) - Test bit 4 in register D
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit4==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT4D62(): number {
    const bitSet = (this.registers.d & (1 << 4)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 4,E (CB 0x63) - Test bit 4 in register E
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit4==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT4E63(): number {
    const bitSet = (this.registers.e & (1 << 4)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 4,H (CB 0x64) - Test bit 4 in register H
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit4==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT4H64(): number {
    const bitSet = (this.registers.h & (1 << 4)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 4,L (CB 0x65) - Test bit 4 in register L
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit4==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT4L65(): number {
    const bitSet = (this.registers.l & (1 << 4)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 4,(HL) (CB 0x66) - Test bit 4 in memory at HL address
   * Hardware: 2 bytes, 12 cycles
   * Flags: Z=(bit4==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT4HL66(): number {
    const address = this.getHL();
    const value = this.mmu.readByte(address);
    const bitSet = (value & (1 << 4)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 12;
  }

  /**
   * BIT 4,A (CB 0x67) - Test bit 4 in register A
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit4==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT4A67(): number {
    const bitSet = (this.registers.a & (1 << 4)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 5,B (CB 0x68) - Test bit 5 in register B
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit5==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT5B68(): number {
    const bitSet = (this.registers.b & (1 << 5)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 5,C (CB 0x69) - Test bit 5 in register C
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit5==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT5C69(): number {
    const bitSet = (this.registers.c & (1 << 5)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 5,D (CB 0x6A) - Test bit 5 in register D
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit5==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT5D6A(): number {
    const bitSet = (this.registers.d & (1 << 5)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 5,E (CB 0x6B) - Test bit 5 in register E
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit5==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT5E6B(): number {
    const bitSet = (this.registers.e & (1 << 5)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 5,H (CB 0x6C) - Test bit 5 in register H
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit5==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT5H6C(): number {
    const bitSet = (this.registers.h & (1 << 5)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 5,L (CB 0x6D) - Test bit 5 in register L
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit5==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT5L6D(): number {
    const bitSet = (this.registers.l & (1 << 5)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 5,(HL) (CB 0x6E) - Test bit 5 in memory at HL address
   * Hardware: 2 bytes, 12 cycles
   * Flags: Z=(bit5==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT5HL6E(): number {
    const address = this.getHL();
    const value = this.mmu.readByte(address);
    const bitSet = (value & (1 << 5)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 12;
  }

  /**
   * BIT 5,A (CB 0x6F) - Test bit 5 in register A
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit5==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT5A6F(): number {
    const bitSet = (this.registers.a & (1 << 5)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 6,B (CB 0x70) - Test bit 6 in register B
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit6==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT6B70(): number {
    const bitSet = (this.registers.b & (1 << 6)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 6,C (CB 0x71) - Test bit 6 in register C
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit6==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT6C71(): number {
    const bitSet = (this.registers.c & (1 << 6)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 6,D (CB 0x72) - Test bit 6 in register D
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit6==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT6D72(): number {
    const bitSet = (this.registers.d & (1 << 6)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 6,E (CB 0x73) - Test bit 6 in register E
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit6==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT6E73(): number {
    const bitSet = (this.registers.e & (1 << 6)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 6,H (CB 0x74) - Test bit 6 in register H
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit6==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT6H74(): number {
    const bitSet = (this.registers.h & (1 << 6)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 6,L (CB 0x75) - Test bit 6 in register L
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit6==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT6L75(): number {
    const bitSet = (this.registers.l & (1 << 6)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 6,(HL) (CB 0x76) - Test bit 6 in memory at HL address
   * Hardware: 2 bytes, 12 cycles
   * Flags: Z=(bit6==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT6HL76(): number {
    const address = this.getHL();
    const value = this.mmu.readByte(address);
    const bitSet = (value & (1 << 6)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 12;
  }

  /**
   * BIT 6,A (CB 0x77) - Test bit 6 in register A
   * Hardware: 2 bytes, 8 cycles
   * Flags: Z=(bit6==0), N=0, H=1, C=preserved
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT6A77(): number {
    const bitSet = (this.registers.a & (1 << 6)) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 8;
  }

  /**
   * BIT 7,(HL) - Test bit 7 in memory at HL
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_BIT7HL7E(): number {
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    const bitSet = (value & 0x80) !== 0;
    this.setZeroFlag(!bitSet);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    return 12; // Memory operations take 12 cycles
  }

  /**
   * SET 0,B - Set bit 0 in register B
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Flags: No flags affected
   */
  private executeCB_SET0B_C0(): number {
    this.registers.b |= 0x01;
    return 8;
  }

  /**
   * SET 7,A - Set bit 7 in register A
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Flags: No flags affected
   */
  private executeCB_SET7A_FF(): number {
    this.registers.a |= 0x80;
    return 8;
  }

  /**
   * SET 0,(HL) - Set bit 0 in memory at HL
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Flags: No flags affected
   */
  private executeCB_SET0HL_C6(): number {
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    this.mmu.writeByte(hlAddress, value | 0x01);
    return 16; // Memory operations take 16 cycles for SET
  }

  // SET 0,r8 instructions (0xC1-0xC7)
  private executeCB_SET0C_C1(): number {
    this.registers.c |= 0x01;
    return 8;
  }
  private executeCB_SET0D_C2(): number {
    this.registers.d |= 0x01;
    return 8;
  }
  private executeCB_SET0E_C3(): number {
    this.registers.e |= 0x01;
    return 8;
  }
  private executeCB_SET0H_C4(): number {
    this.registers.h |= 0x01;
    return 8;
  }
  private executeCB_SET0L_C5(): number {
    this.registers.l |= 0x01;
    return 8;
  }
  private executeCB_SET0A_C7(): number {
    this.registers.a |= 0x01;
    return 8;
  }

  // SET 1,r8 instructions (0xC8-0xCF)
  private executeCB_SET1B_C8(): number {
    this.registers.b |= 0x02;
    return 8;
  }
  private executeCB_SET1C_C9(): number {
    this.registers.c |= 0x02;
    return 8;
  }
  private executeCB_SET1D_CA(): number {
    this.registers.d |= 0x02;
    return 8;
  }
  private executeCB_SET1E_CB(): number {
    this.registers.e |= 0x02;
    return 8;
  }
  private executeCB_SET1H_CC(): number {
    this.registers.h |= 0x02;
    return 8;
  }
  private executeCB_SET1L_CD(): number {
    this.registers.l |= 0x02;
    return 8;
  }
  private executeCB_SET1HL_CE(): number {
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    this.mmu.writeByte(hlAddress, value | 0x02);
    return 16;
  }
  private executeCB_SET1A_CF(): number {
    this.registers.a |= 0x02;
    return 8;
  }

  // SET 2,r8 instructions (0xD0-0xD7)
  private executeCB_SET2B_D0(): number {
    this.registers.b |= 0x04;
    return 8;
  }
  private executeCB_SET2C_D1(): number {
    this.registers.c |= 0x04;
    return 8;
  }
  private executeCB_SET2D_D2(): number {
    this.registers.d |= 0x04;
    return 8;
  }
  private executeCB_SET2E_D3(): number {
    this.registers.e |= 0x04;
    return 8;
  }
  private executeCB_SET2H_D4(): number {
    this.registers.h |= 0x04;
    return 8;
  }
  private executeCB_SET2L_D5(): number {
    this.registers.l |= 0x04;
    return 8;
  }
  private executeCB_SET2HL_D6(): number {
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    this.mmu.writeByte(hlAddress, value | 0x04);
    return 16;
  }
  private executeCB_SET2A_D7(): number {
    this.registers.a |= 0x04;
    return 8;
  }

  // SET 3,r8 instructions (0xD8-0xDF)
  private executeCB_SET3B_D8(): number {
    this.registers.b |= 0x08;
    return 8;
  }
  private executeCB_SET3C_D9(): number {
    this.registers.c |= 0x08;
    return 8;
  }
  private executeCB_SET3D_DA(): number {
    this.registers.d |= 0x08;
    return 8;
  }
  private executeCB_SET3E_DB(): number {
    this.registers.e |= 0x08;
    return 8;
  }
  private executeCB_SET3H_DC(): number {
    this.registers.h |= 0x08;
    return 8;
  }
  private executeCB_SET3L_DD(): number {
    this.registers.l |= 0x08;
    return 8;
  }
  private executeCB_SET3HL_DE(): number {
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    this.mmu.writeByte(hlAddress, value | 0x08);
    return 16;
  }
  private executeCB_SET3A_DF(): number {
    this.registers.a |= 0x08;
    return 8;
  }

  // SET 4,r8 instructions (0xE0-0xE7)
  private executeCB_SET4B_E0(): number {
    this.registers.b |= 0x10;
    return 8;
  }
  private executeCB_SET4C_E1(): number {
    this.registers.c |= 0x10;
    return 8;
  }
  private executeCB_SET4D_E2(): number {
    this.registers.d |= 0x10;
    return 8;
  }
  private executeCB_SET4E_E3(): number {
    this.registers.e |= 0x10;
    return 8;
  }
  private executeCB_SET4H_E4(): number {
    this.registers.h |= 0x10;
    return 8;
  }
  private executeCB_SET4L_E5(): number {
    this.registers.l |= 0x10;
    return 8;
  }
  private executeCB_SET4HL_E6(): number {
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    this.mmu.writeByte(hlAddress, value | 0x10);
    return 16;
  }
  private executeCB_SET4A_E7(): number {
    this.registers.a |= 0x10;
    return 8;
  }

  // SET 5,r8 instructions (0xE8-0xEF)
  private executeCB_SET5B_E8(): number {
    this.registers.b |= 0x20;
    return 8;
  }
  private executeCB_SET5C_E9(): number {
    this.registers.c |= 0x20;
    return 8;
  }
  private executeCB_SET5D_EA(): number {
    this.registers.d |= 0x20;
    return 8;
  }
  private executeCB_SET5E_EB(): number {
    this.registers.e |= 0x20;
    return 8;
  }
  private executeCB_SET5H_EC(): number {
    this.registers.h |= 0x20;
    return 8;
  }
  private executeCB_SET5L_ED(): number {
    this.registers.l |= 0x20;
    return 8;
  }
  private executeCB_SET5HL_EE(): number {
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    this.mmu.writeByte(hlAddress, value | 0x20);
    return 16;
  }
  private executeCB_SET5A_EF(): number {
    this.registers.a |= 0x20;
    return 8;
  }

  // SET 6,r8 instructions (0xF0-0xF7)
  private executeCB_SET6B_F0(): number {
    this.registers.b |= 0x40;
    return 8;
  }
  private executeCB_SET6C_F1(): number {
    this.registers.c |= 0x40;
    return 8;
  }
  private executeCB_SET6D_F2(): number {
    this.registers.d |= 0x40;
    return 8;
  }
  private executeCB_SET6E_F3(): number {
    this.registers.e |= 0x40;
    return 8;
  }
  private executeCB_SET6H_F4(): number {
    this.registers.h |= 0x40;
    return 8;
  }
  private executeCB_SET6L_F5(): number {
    this.registers.l |= 0x40;
    return 8;
  }
  private executeCB_SET6HL_F6(): number {
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    this.mmu.writeByte(hlAddress, value | 0x40);
    return 16;
  }
  private executeCB_SET6A_F7(): number {
    this.registers.a |= 0x40;
    return 8;
  }

  // SET 7,r8 instructions (0xF8-0xFF)
  private executeCB_SET7B_F8(): number {
    this.registers.b |= 0x80;
    return 8;
  }
  private executeCB_SET7C_F9(): number {
    this.registers.c |= 0x80;
    return 8;
  }
  private executeCB_SET7D_FA(): number {
    this.registers.d |= 0x80;
    return 8;
  }
  private executeCB_SET7E_FB(): number {
    this.registers.e |= 0x80;
    return 8;
  }
  private executeCB_SET7H_FC(): number {
    this.registers.h |= 0x80;
    return 8;
  }
  private executeCB_SET7L_FD(): number {
    this.registers.l |= 0x80;
    return 8;
  }
  private executeCB_SET7HL_FE(): number {
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    this.mmu.writeByte(hlAddress, value | 0x80);
    return 16;
  }

  /**
   * RES 0,B - Reset bit 0 in register B
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Flags: No flags affected
   */
  private executeCB_RES0B_80(): number {
    this.registers.b &= ~0x01;
    return 8;
  }

  /**
   * RES 7,A - Reset bit 7 in register A
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Flags: No flags affected
   */
  private executeCB_RES7A_BF(): number {
    this.registers.a &= ~0x80;
    return 8;
  }

  /**
   * RES 0,(HL) - Reset bit 0 in memory at HL
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Flags: No flags affected
   */
  private executeCB_RES0HL_86(): number {
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    this.mmu.writeByte(hlAddress, value & ~0x01);
    return 16; // Memory operations take 16 cycles for RES
  }

  // RES 0,r8 instructions (0x81-0x87)
  private executeCB_RES0C_81(): number {
    this.registers.c &= ~0x01;
    return 8;
  }
  private executeCB_RES0D_82(): number {
    this.registers.d &= ~0x01;
    return 8;
  }
  private executeCB_RES0E_83(): number {
    this.registers.e &= ~0x01;
    return 8;
  }
  private executeCB_RES0H_84(): number {
    this.registers.h &= ~0x01;
    return 8;
  }
  private executeCB_RES0L_85(): number {
    this.registers.l &= ~0x01;
    return 8;
  }
  private executeCB_RES0A_87(): number {
    this.registers.a &= ~0x01;
    return 8;
  }

  // RES 1,r8 instructions (0x88-0x8F)
  private executeCB_RES1B_88(): number {
    this.registers.b &= ~0x02;
    return 8;
  }
  private executeCB_RES1C_89(): number {
    this.registers.c &= ~0x02;
    return 8;
  }
  private executeCB_RES1D_8A(): number {
    this.registers.d &= ~0x02;
    return 8;
  }
  private executeCB_RES1E_8B(): number {
    this.registers.e &= ~0x02;
    return 8;
  }
  private executeCB_RES1H_8C(): number {
    this.registers.h &= ~0x02;
    return 8;
  }
  private executeCB_RES1L_8D(): number {
    this.registers.l &= ~0x02;
    return 8;
  }
  private executeCB_RES1HL_8E(): number {
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    this.mmu.writeByte(hlAddress, value & ~0x02);
    return 16;
  }
  private executeCB_RES1A_8F(): number {
    this.registers.a &= ~0x02;
    return 8;
  }

  // RES 2,r8 instructions (0x90-0x97)
  private executeCB_RES2B_90(): number {
    this.registers.b &= ~0x04;
    return 8;
  }
  private executeCB_RES2C_91(): number {
    this.registers.c &= ~0x04;
    return 8;
  }
  private executeCB_RES2D_92(): number {
    this.registers.d &= ~0x04;
    return 8;
  }
  private executeCB_RES2E_93(): number {
    this.registers.e &= ~0x04;
    return 8;
  }
  private executeCB_RES2H_94(): number {
    this.registers.h &= ~0x04;
    return 8;
  }
  private executeCB_RES2L_95(): number {
    this.registers.l &= ~0x04;
    return 8;
  }
  private executeCB_RES2HL_96(): number {
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    this.mmu.writeByte(hlAddress, value & ~0x04);
    return 16;
  }
  private executeCB_RES2A_97(): number {
    this.registers.a &= ~0x04;
    return 8;
  }

  // RES 3,r8 instructions (0x98-0x9F)
  private executeCB_RES3B_98(): number {
    this.registers.b &= ~0x08;
    return 8;
  }
  private executeCB_RES3C_99(): number {
    this.registers.c &= ~0x08;
    return 8;
  }
  private executeCB_RES3D_9A(): number {
    this.registers.d &= ~0x08;
    return 8;
  }
  private executeCB_RES3E_9B(): number {
    this.registers.e &= ~0x08;
    return 8;
  }
  private executeCB_RES3H_9C(): number {
    this.registers.h &= ~0x08;
    return 8;
  }
  private executeCB_RES3L_9D(): number {
    this.registers.l &= ~0x08;
    return 8;
  }
  private executeCB_RES3HL_9E(): number {
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    this.mmu.writeByte(hlAddress, value & ~0x08);
    return 16;
  }
  private executeCB_RES3A_9F(): number {
    this.registers.a &= ~0x08;
    return 8;
  }

  // RES 4,r8 instructions (0xA0-0xA7)
  private executeCB_RES4B_A0(): number {
    this.registers.b &= ~0x10;
    return 8;
  }
  private executeCB_RES4C_A1(): number {
    this.registers.c &= ~0x10;
    return 8;
  }
  private executeCB_RES4D_A2(): number {
    this.registers.d &= ~0x10;
    return 8;
  }
  private executeCB_RES4E_A3(): number {
    this.registers.e &= ~0x10;
    return 8;
  }
  private executeCB_RES4H_A4(): number {
    this.registers.h &= ~0x10;
    return 8;
  }
  private executeCB_RES4L_A5(): number {
    this.registers.l &= ~0x10;
    return 8;
  }
  private executeCB_RES4HL_A6(): number {
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    this.mmu.writeByte(hlAddress, value & ~0x10);
    return 16;
  }
  private executeCB_RES4A_A7(): number {
    this.registers.a &= ~0x10;
    return 8;
  }

  // RES 5,r8 instructions (0xA8-0xAF)
  private executeCB_RES5B_A8(): number {
    this.registers.b &= ~0x20;
    return 8;
  }
  private executeCB_RES5C_A9(): number {
    this.registers.c &= ~0x20;
    return 8;
  }
  private executeCB_RES5D_AA(): number {
    this.registers.d &= ~0x20;
    return 8;
  }
  private executeCB_RES5E_AB(): number {
    this.registers.e &= ~0x20;
    return 8;
  }
  private executeCB_RES5H_AC(): number {
    this.registers.h &= ~0x20;
    return 8;
  }
  private executeCB_RES5L_AD(): number {
    this.registers.l &= ~0x20;
    return 8;
  }
  private executeCB_RES5HL_AE(): number {
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    this.mmu.writeByte(hlAddress, value & ~0x20);
    return 16;
  }
  private executeCB_RES5A_AF(): number {
    this.registers.a &= ~0x20;
    return 8;
  }

  // RES 6,r8 instructions (0xB0-0xB7)
  private executeCB_RES6B_B0(): number {
    this.registers.b &= ~0x40;
    return 8;
  }
  private executeCB_RES6C_B1(): number {
    this.registers.c &= ~0x40;
    return 8;
  }
  private executeCB_RES6D_B2(): number {
    this.registers.d &= ~0x40;
    return 8;
  }
  private executeCB_RES6E_B3(): number {
    this.registers.e &= ~0x40;
    return 8;
  }
  private executeCB_RES6H_B4(): number {
    this.registers.h &= ~0x40;
    return 8;
  }
  private executeCB_RES6L_B5(): number {
    this.registers.l &= ~0x40;
    return 8;
  }
  private executeCB_RES6HL_B6(): number {
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    this.mmu.writeByte(hlAddress, value & ~0x40);
    return 16;
  }
  private executeCB_RES6A_B7(): number {
    this.registers.a &= ~0x40;
    return 8;
  }

  // RES 7,r8 instructions (0xB8-0xBE)
  private executeCB_RES7B_B8(): number {
    this.registers.b &= ~0x80;
    return 8;
  }
  private executeCB_RES7C_B9(): number {
    this.registers.c &= ~0x80;
    return 8;
  }
  private executeCB_RES7D_BA(): number {
    this.registers.d &= ~0x80;
    return 8;
  }
  private executeCB_RES7E_BB(): number {
    this.registers.e &= ~0x80;
    return 8;
  }
  private executeCB_RES7H_BC(): number {
    this.registers.h &= ~0x80;
    return 8;
  }
  private executeCB_RES7L_BD(): number {
    this.registers.l &= ~0x80;
    return 8;
  }
  private executeCB_RES7HL_BE(): number {
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    this.mmu.writeByte(hlAddress, value & ~0x80);
    return 16;
  }

  /**
   * SWAP B - Swap upper and lower nibbles of register B
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Flags: Z=Z (set if result is 0), N=0, H=0, C=0
   */
  private executeSWAPB30(): number {
    const value = this.registers.b;
    const result = ((value & 0x0f) << 4) | ((value & 0xf0) >> 4);
    this.registers.b = result;

    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);

    return 8;
  }

  /**
   * SWAP A - Swap upper and lower nibbles of register A
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Flags: Z=Z (set if result is 0), N=0, H=0, C=0
   */
  private executeSWAPA37(): number {
    const value = this.registers.a;
    const result = ((value & 0x0f) << 4) | ((value & 0xf0) >> 4);
    this.registers.a = result;

    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);

    return 8;
  }

  /**
   * SWAP (HL) - Swap upper and lower nibbles of memory at HL
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Flags: Z=Z (set if result is 0), N=0, H=0, C=0
   */
  private executeSWAPHL36(): number {
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    const result = ((value & 0x0f) << 4) | ((value & 0xf0) >> 4);
    this.mmu.writeByte(hlAddress, result);

    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);

    return 16; // Memory operations take 16 cycles for SWAP
  }

  /**
   * SWAP C (0xCB31) - Swap upper and lower nibbles of register C
   * Hardware: 2 bytes, 8 cycles, affects Z/N/H/C flags
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeSWAPC31(): number {
    const value = this.registers.c;
    const result = ((value & 0x0f) << 4) | ((value & 0xf0) >> 4);
    this.registers.c = result;

    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);

    return 8;
  }

  /**
   * SWAP D (0xCB32) - Swap upper and lower nibbles of register D
   * Hardware: 2 bytes, 8 cycles, affects Z/N/H/C flags
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeSWAPD32(): number {
    const value = this.registers.d;
    const result = ((value & 0x0f) << 4) | ((value & 0xf0) >> 4);
    this.registers.d = result;

    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);

    return 8;
  }

  /**
   * SWAP E (0xCB33) - Swap upper and lower nibbles of register E
   * Hardware: 2 bytes, 8 cycles, affects Z/N/H/C flags
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeSWAPE33(): number {
    const value = this.registers.e;
    const result = ((value & 0x0f) << 4) | ((value & 0xf0) >> 4);
    this.registers.e = result;

    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);

    return 8;
  }

  /**
   * SWAP H (0xCB34) - Swap upper and lower nibbles of register H
   * Hardware: 2 bytes, 8 cycles, affects Z/N/H/C flags
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeSWAPH34(): number {
    const value = this.registers.h;
    const result = ((value & 0x0f) << 4) | ((value & 0xf0) >> 4);
    this.registers.h = result;

    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);

    return 8;
  }

  /**
   * SWAP L (0xCB35) - Swap upper and lower nibbles of register L
   * Hardware: 2 bytes, 8 cycles, affects Z/N/H/C flags
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeSWAPL35(): number {
    const value = this.registers.l;
    const result = ((value & 0x0f) << 4) | ((value & 0xf0) >> 4);
    this.registers.l = result;

    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);

    return 8;
  }

  // Shift Left Arithmetic (SLA) instructions (0x20-0x27)
  private executeCB_SLAB_20(): number {
    const carry = (this.registers.b & 0x80) !== 0;
    this.registers.b = (this.registers.b << 1) & 0xff;
    this.setZeroFlag(this.registers.b === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(carry);
    return 8;
  }

  private executeCB_SLAC_21(): number {
    const carry = (this.registers.c & 0x80) !== 0;
    this.registers.c = (this.registers.c << 1) & 0xff;
    this.setZeroFlag(this.registers.c === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(carry);
    return 8;
  }

  private executeCB_SLAD_22(): number {
    const carry = (this.registers.d & 0x80) !== 0;
    this.registers.d = (this.registers.d << 1) & 0xff;
    this.setZeroFlag(this.registers.d === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(carry);
    return 8;
  }

  private executeCB_SLAE_23(): number {
    const carry = (this.registers.e & 0x80) !== 0;
    this.registers.e = (this.registers.e << 1) & 0xff;
    this.setZeroFlag(this.registers.e === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(carry);
    return 8;
  }

  private executeCB_SLAH_24(): number {
    const carry = (this.registers.h & 0x80) !== 0;
    this.registers.h = (this.registers.h << 1) & 0xff;
    this.setZeroFlag(this.registers.h === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(carry);
    return 8;
  }

  private executeCB_SLAL_25(): number {
    const carry = (this.registers.l & 0x80) !== 0;
    this.registers.l = (this.registers.l << 1) & 0xff;
    this.setZeroFlag(this.registers.l === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(carry);
    return 8;
  }

  private executeCB_SLAHL_26(): number {
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    const carry = (value & 0x80) !== 0;
    const result = (value << 1) & 0xff;
    this.mmu.writeByte(hlAddress, result);
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(carry);
    return 16;
  }

  private executeCB_SLAA_27(): number {
    const carry = (this.registers.a & 0x80) !== 0;
    this.registers.a = (this.registers.a << 1) & 0xff;
    this.setZeroFlag(this.registers.a === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(carry);
    return 8;
  }

  // Shift Right Arithmetic (SRA) instructions (0x28-0x2F)
  private executeCB_SRAB_28(): number {
    const carry = (this.registers.b & 0x01) !== 0;
    const msb = this.registers.b & 0x80;
    this.registers.b = (this.registers.b >> 1) | msb;
    this.setZeroFlag(this.registers.b === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(carry);
    return 8;
  }

  private executeCB_SRAC_29(): number {
    const carry = (this.registers.c & 0x01) !== 0;
    const msb = this.registers.c & 0x80;
    this.registers.c = (this.registers.c >> 1) | msb;
    this.setZeroFlag(this.registers.c === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(carry);
    return 8;
  }

  private executeCB_SRAD_2A(): number {
    const carry = (this.registers.d & 0x01) !== 0;
    const msb = this.registers.d & 0x80;
    this.registers.d = (this.registers.d >> 1) | msb;
    this.setZeroFlag(this.registers.d === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(carry);
    return 8;
  }

  private executeCB_SRAE_2B(): number {
    const carry = (this.registers.e & 0x01) !== 0;
    const msb = this.registers.e & 0x80;
    this.registers.e = (this.registers.e >> 1) | msb;
    this.setZeroFlag(this.registers.e === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(carry);
    return 8;
  }

  private executeCB_SRAH_2C(): number {
    const carry = (this.registers.h & 0x01) !== 0;
    const msb = this.registers.h & 0x80;
    this.registers.h = (this.registers.h >> 1) | msb;
    this.setZeroFlag(this.registers.h === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(carry);
    return 8;
  }

  private executeCB_SRAL_2D(): number {
    const carry = (this.registers.l & 0x01) !== 0;
    const msb = this.registers.l & 0x80;
    this.registers.l = (this.registers.l >> 1) | msb;
    this.setZeroFlag(this.registers.l === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(carry);
    return 8;
  }

  private executeCB_SRAHL_2E(): number {
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    const carry = (value & 0x01) !== 0;
    const msb = value & 0x80;
    const result = (value >> 1) | msb;
    this.mmu.writeByte(hlAddress, result);
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(carry);
    return 16;
  }

  private executeCB_SRAA_2F(): number {
    const carry = (this.registers.a & 0x01) !== 0;
    const msb = this.registers.a & 0x80;
    this.registers.a = (this.registers.a >> 1) | msb;
    this.setZeroFlag(this.registers.a === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(carry);
    return 8;
  }

  // ===== PHASE 1 GENERATED INSTRUCTIONS =====
  // Generated from opcodes.json following TDD principles and hardware accuracy
  // Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7

  /**
   * ADD A,D (0x82) - Add D to A
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * Phase 1 implementation - Generated code
   */
  private executeADDAD82(): number {
    // ADD A,D - Add D to A with flag calculation
    const a = this.registers.a;
    const value = this.registers.d;
    const result = a + value;

    // Update A register
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag((a & 0x0f) + (value & 0x0f) > 0x0f);
    this.setCarryFlag(result > 0xff);

    return 4;
  }

  /**
   * ADD A,E (0x83) - Add E to A
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * Phase 1 implementation - Generated code
   */
  private executeADDAE83(): number {
    // ADD A,E - Add E to A with flag calculation
    const a = this.registers.a;
    const value = this.registers.e;
    const result = a + value;

    // Update A register
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag((a & 0x0f) + (value & 0x0f) > 0x0f);
    this.setCarryFlag(result > 0xff);

    return 4;
  }

  /**
   * SUB A,B (0x90) - Subtract B from A
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * Phase 1 implementation - Generated code
   */
  private executeSUBAB90(): number {
    // SUB A,B - Subtract B from A with flag calculation
    const a = this.registers.a;
    const value = this.registers.b;
    const result = a - value;

    // Update A register (handle underflow)
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(true); // N flag always set for SUB
    this.setHalfCarryFlag((value & 0x0f) > (a & 0x0f)); // H flag set if borrow from bit 4
    this.setCarryFlag(result < 0); // C flag set if borrow occurred

    return 4;
  }

  /**
   * JP NZ,a16 (0xC2) - Jump if not zero to 16-bit address
   * Hardware: 3 bytes, 16 cycles if taken / 12 cycles if not taken, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - JP cc,n16
   */
  private executeJPNZa16C2(): number {
    // JP NZ,a16 - Conditional jump to 16-bit address
    const lowByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const highByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Check condition: NZ means Z flag is clear (not zero)
    if (!this.getZeroFlag()) {
      // Condition true: jump to target address
      const targetAddress = (highByte << 8) | lowByte;
      this.registers.pc = targetAddress & 0xffff;
      return 4; // RGBDS GBZ80: JP taken takes 4 cycles
    }

    // Condition false: continue to next instruction
    return 3; // RGBDS GBZ80: JP not taken takes 3 cycles
  }

  /**
   * JP Z,a16 (0xCA) - Conditional jump if zero
   * Hardware: 3 bytes, 16 cycles if taken / 12 cycles if not taken, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - JP cc,n16
   */
  private executeJPZa16CA(): number {
    // Read 16-bit address from PC (little-endian)
    const lowByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const highByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Check condition: Z means Z flag is set (zero)
    if (this.getZeroFlag()) {
      // Condition true: jump to target address
      const targetAddress = (highByte << 8) | lowByte;
      this.registers.pc = targetAddress & 0xffff;
      return 4; // RGBDS GBZ80: JP taken takes 4 cycles
    }

    // Condition false: continue to next instruction
    return 3; // RGBDS GBZ80: JP not taken takes 3 cycles
  }

  /**
   * JP NC,a16 (0xD2) - Conditional jump if not carry
   * Hardware: 3 bytes, 16 cycles if taken / 12 cycles if not taken, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - JP cc,n16
   */
  private executeJPNCa16D2(): number {
    // Read 16-bit address from PC (little-endian)
    const lowByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const highByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Check condition: NC means C flag is clear (not carry)
    if (!this.getCarryFlag()) {
      // Condition true: jump to target address
      const targetAddress = (highByte << 8) | lowByte;
      this.registers.pc = targetAddress & 0xffff;
      return 4; // RGBDS GBZ80: JP taken takes 4 cycles
    }

    // Condition false: continue to next instruction
    return 3; // RGBDS GBZ80: JP not taken takes 3 cycles
  }

  /**
   * JP C,a16 (0xDA) - Conditional jump if carry
   * Hardware: 3 bytes, 16 cycles if taken / 12 cycles if not taken, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - JP cc,n16
   */
  private executeJPCa16DA(): number {
    // Read 16-bit address from PC (little-endian)
    const lowByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const highByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Check condition: C means C flag is set (carry)
    if (this.getCarryFlag()) {
      // Condition true: jump to target address
      const targetAddress = (highByte << 8) | lowByte;
      this.registers.pc = targetAddress & 0xffff;
      return 4; // RGBDS GBZ80: JP taken takes 4 cycles
    }

    // Condition false: continue to next instruction
    return 3; // RGBDS GBZ80: JP not taken takes 3 cycles
  }

  /**
   * JP (HL) (0xE9) - Jump to address in HL register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - JP HL
   */
  private executeJPHLE9(): number {
    // Get address from HL register pair
    const targetAddress = this.getHL();

    // Jump to address stored in HL
    this.registers.pc = targetAddress & 0xffff;

    return 1; // RGBDS GBZ80: JP (HL) takes 1 cycle
  }

  /**
   * LD BC,n16 (0x01) - Load 16-bit immediate into BC
   * Hardware: 3 bytes, 12 cycles, no flag changes
   * Phase 1 implementation - Generated code
   */
  private executeLDBCn1601(): number {
    // Load 16-bit immediate value into BC register pair
    const lowByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const highByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const value16 = (highByte << 8) | lowByte;
    this.registers.b = (value16 >> 8) & 0xff;
    this.registers.c = value16 & 0xff;

    return 12;
  }

  /**
   * LD (BC),A (0x02) - Store A into memory pointed by BC
   * Hardware: 1 byte, 8 cycles, no flag changes
   * Phase 1 implementation - Generated code
   */
  private executeLDBCA02(): number {
    // Store A register into memory at address pointed to by BC
    const address = (this.registers.b << 8) | this.registers.c;
    this.mmu.writeByte(address, this.registers.a);

    return 8;
  }

  // ===== PHASE 2: GROUP 1 REGISTER-TO-REGISTER LD INSTRUCTIONS =====
  // Reference: RGBDS GBZ80 Reference - https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
  // Pattern: LD dst,src - Copy src register to dst register
  // Hardware: 1 byte, 4 cycles each, no flag changes (flags preserved)

  /**
   * LD B,B (0x40) - Copy B register to itself
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDBB40(): number {
    // LD B,B - Copy B to itself (no-op for register content, but still takes cycles)
    // No actual assignment needed, but instruction still takes cycles
    return 4;
  }

  /**
   * LD B,C (0x41) - Copy C register to B register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDBC41(): number {
    // LD B,C - Copy C register value to B register
    this.registers.b = this.registers.c;
    return 4;
  }

  /**
   * LD B,D (0x42) - Copy D register to B register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDBD42(): number {
    // LD B,D - Copy D register value to B register
    this.registers.b = this.registers.d;
    return 4;
  }

  /**
   * LD B,E (0x43) - Copy E register to B register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDBE43(): number {
    // LD B,E - Copy E register value to B register
    this.registers.b = this.registers.e;
    return 4;
  }

  /**
   * LD B,H (0x44) - Copy H register to B register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDBH44(): number {
    // LD B,H - Copy H register value to B register
    this.registers.b = this.registers.h;
    return 4;
  }

  /**
   * LD B,L (0x45) - Copy L register to B register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDBL45(): number {
    // LD B,L - Copy L register value to B register
    this.registers.b = this.registers.l;
    return 4;
  }

  /**
   * LD B,(HL) (0x46) - Load B from memory address HL
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDBHL46(): number {
    // LD B,(HL) - Load B register from memory at address HL
    const hlAddress = this.getHL();
    this.registers.b = this.mmu.readByte(hlAddress);
    return 8; // Memory access takes 8 cycles
  }

  /**
   * LD B,A (0x47) - Copy A register to B register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDBA47(): number {
    // LD B,A - Copy A register value to B register
    this.registers.b = this.registers.a;
    return 4;
  }

  // ===== PHASE 2: GROUP 2 IMMEDIATE-TO-REGISTER LD INSTRUCTIONS =====
  // Reference: RGBDS GBZ80 Reference - https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
  // Pattern: LD dst,n8 - Load 8-bit immediate value into register
  // Hardware: 2 bytes, 8 cycles each, no flag changes (flags preserved)

  /**
   * LD D,n8 (0x16) - Load 8-bit immediate into D register
   * Hardware: 2 bytes, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDDn816(): number {
    // Read immediate 8-bit value from PC
    const immediateValue = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Load value into D register
    this.registers.d = immediateValue;

    return 8;
  }

  /**
   * LD E,n8 (0x1E) - Load 8-bit immediate into E register
   * Hardware: 2 bytes, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDEn81E(): number {
    // Read immediate 8-bit value from PC
    const immediateValue = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Load value into E register
    this.registers.e = immediateValue;

    return 8;
  }

  /**
   * LD H,n8 (0x26) - Load 8-bit immediate into H register
   * Hardware: 2 bytes, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDHn826(): number {
    // Read immediate 8-bit value from PC
    const immediateValue = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Load value into H register
    this.registers.h = immediateValue;

    return 8;
  }

  /**
   * LD L,n8 (0x2E) - Load 8-bit immediate into L register
   * Hardware: 2 bytes, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDLn82E(): number {
    // Read immediate 8-bit value from PC
    const immediateValue = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Load value into L register
    this.registers.l = immediateValue;

    return 8;
  }

  /**
   * LD (HL),n8 (0x36) - Store 8-bit immediate to memory address HL
   * Hardware: 2 bytes, 12 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDHLn836(): number {
    // Read immediate 8-bit value from PC
    const immediateValue = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Get HL register pair value as 16-bit address
    const hlAddress = this.getHL();

    // Store immediate value at address pointed to by HL
    this.mmu.writeByte(hlAddress, immediateValue);

    return 12; // Memory write + immediate read = 12 cycles
  }

  /**
   * LD A,n8 (0x3E) - Load 8-bit immediate into A register
   * Hardware: 2 bytes, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDAn83E(): number {
    // Read immediate 8-bit value from PC
    const immediateValue = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Load value into A register
    this.registers.a = immediateValue;

    return 8;
  }

  // === LD C,r INSTRUCTIONS (0x48-0x4F) ===

  /**
   * LD C,B (0x48) - Copy B register to C register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDCB48(): number {
    // LD C,B - Copy B register value to C register
    this.registers.c = this.registers.b;
    return 4;
  }

  /**
   * LD C,C (0x49) - Copy C register to itself
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDCC49(): number {
    // LD C,C - Copy C to itself (no-op for register content, but still takes cycles)
    // No actual assignment needed, but instruction still takes cycles
    return 4;
  }

  /**
   * LD C,D (0x4A) - Copy D register to C register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDCD4A(): number {
    // LD C,D - Copy D register value to C register
    this.registers.c = this.registers.d;
    return 4;
  }

  /**
   * LD C,E (0x4B) - Copy E register to C register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDCE4B(): number {
    // LD C,E - Copy E register value to C register
    this.registers.c = this.registers.e;
    return 4;
  }

  /**
   * LD C,H (0x4C) - Copy H register to C register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDCH4C(): number {
    // LD C,H - Copy H register value to C register
    this.registers.c = this.registers.h;
    return 4;
  }

  /**
   * LD C,L (0x4D) - Copy L register to C register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDCL4D(): number {
    // LD C,L - Copy L register value to C register
    this.registers.c = this.registers.l;
    return 4;
  }

  /**
   * LD C,(HL) (0x4E) - Load C from memory address HL
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDCHL4E(): number {
    // LD C,(HL) - Load C register from memory at address HL
    const hlAddress = this.getHL();
    this.registers.c = this.mmu.readByte(hlAddress);
    return 8; // Memory access takes 8 cycles
  }

  /**
   * LD C,A (0x4F) - Copy A register to C register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDCA4F(): number {
    // LD C,A - Copy A register value to C register
    this.registers.c = this.registers.a;
    return 4;
  }

  // ===== PHASE 2: GROUP 3 MEMORY VIA REGISTER PAIRS LD INSTRUCTIONS =====
  // Reference: RGBDS GBZ80 Reference - https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
  // Pattern: LD (rr),r and LD r,(rr) - Memory access via register pairs
  // Hardware: 1 byte, 8 cycles each, no flag changes (flags preserved)

  /**
   * LD A,(BC) (0x0A) - Load A from memory address BC
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDABC0A(): number {
    // Get BC register pair value as 16-bit address
    const bcAddress = (this.registers.b << 8) | this.registers.c;

    // Load A register from memory at address BC
    this.registers.a = this.mmu.readByte(bcAddress);

    return 8; // Memory access takes 8 cycles
  }

  /**
   * LD (DE),A (0x12) - Store A into memory pointed by DE
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDDEA12(): number {
    // Get DE register pair value as 16-bit address
    const deAddress = (this.registers.d << 8) | this.registers.e;

    // Store A register value at address pointed to by DE
    this.mmu.writeByte(deAddress, this.registers.a);

    return 8; // Memory access takes 8 cycles
  }

  /**
   * LD A,(DE) (0x1A) - Load A from memory address DE
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDADE1A(): number {
    // Get DE register pair value as 16-bit address
    const deAddress = (this.registers.d << 8) | this.registers.e;

    // Load A register from memory at address DE
    this.registers.a = this.mmu.readByte(deAddress);

    return 8; // Memory access takes 8 cycles
  }

  /**
   * LD (HL+),A (0x22) - Store A to (HL) then increment HL
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDHLIA22(): number {
    // Get HL register pair value as 16-bit address
    const hlAddress = this.getHL();

    // Store A register value at address pointed to by HL
    this.mmu.writeByte(hlAddress, this.registers.a);

    // Increment HL register pair (with wraparound)
    const newHL = (hlAddress + 1) & 0xffff;
    this.registers.h = (newHL >> 8) & 0xff;
    this.registers.l = newHL & 0xff;

    return 8; // Memory access takes 8 cycles
  }

  /**
   * LD A,(HL+) (0x2A) - Load A from (HL) then increment HL
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDAHLI2A(): number {
    // Get HL register pair value as 16-bit address
    const hlAddress = this.getHL();

    // Load A register from memory at address HL
    this.registers.a = this.mmu.readByte(hlAddress);

    // Increment HL register pair (with wraparound)
    const newHL = (hlAddress + 1) & 0xffff;
    this.registers.h = (newHL >> 8) & 0xff;
    this.registers.l = newHL & 0xff;

    return 8; // Memory access takes 8 cycles
  }

  /**
   * LD (HL-),A (0x32) - Store A to (HL) then decrement HL
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDHLDA32(): number {
    // Get HL register pair value as 16-bit address
    const hlAddress = this.getHL();

    // Store A register value at address pointed to by HL
    this.mmu.writeByte(hlAddress, this.registers.a);

    // Decrement HL register pair (with wraparound)
    const newHL = (hlAddress - 1) & 0xffff;
    this.registers.h = (newHL >> 8) & 0xff;
    this.registers.l = newHL & 0xff;

    return 8; // Memory access takes 8 cycles
  }

  /**
   * LD A,(HL-) (0x3A) - Load A from (HL) then decrement HL
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDAHLD3A(): number {
    // Get HL register pair value as 16-bit address
    const hlAddress = this.getHL();

    // Load A register from memory at address HL
    this.registers.a = this.mmu.readByte(hlAddress);

    // Decrement HL register pair (with wraparound)
    const newHL = (hlAddress - 1) & 0xffff;
    this.registers.h = (newHL >> 8) & 0xff;
    this.registers.l = newHL & 0xff;

    return 8; // Memory access takes 8 cycles
  }

  // ===== PHASE 2: GROUP 5 16-BIT AND SPECIAL LD INSTRUCTIONS =====
  // Reference: RGBDS GBZ80 Reference - https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
  // Pattern: Complex 16-bit loads, SP operations, direct memory addressing
  // Hardware: 2-3 bytes, 8-20 cycles, mostly no flag changes (except LD HL,SP+e8)

  /**
   * LD (a16),SP (0x08) - Store SP to 16-bit memory address
   * Hardware: 3 bytes, 20 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDa16SP08(): number {
    // Read 16-bit address from PC (little-endian)
    const lowByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const highByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Construct target address (little-endian)
    const targetAddress = (highByte << 8) | lowByte;

    // Store SP as little-endian at memory address
    this.mmu.writeByte(targetAddress, this.registers.sp & 0xff); // SP low byte
    this.mmu.writeByte((targetAddress + 1) & 0xffff, (this.registers.sp >> 8) & 0xff); // SP high byte

    return 20; // 16-bit memory store takes 20 cycles
  }

  /**
   * LD DE,n16 (0x11) - Load 16-bit immediate into DE register pair
   * Hardware: 3 bytes, 12 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDDEn1611(): number {
    // Load 16-bit immediate value into DE register pair (little-endian)
    const lowByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const highByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Set DE register pair (little-endian: D=high, E=low)
    this.registers.d = highByte;
    this.registers.e = lowByte;

    return 12;
  }

  /**
   * LD HL,n16 (0x21) - Load 16-bit immediate into HL register pair
   * Hardware: 3 bytes, 12 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDHLn1621(): number {
    // Load 16-bit immediate value into HL register pair (little-endian)
    const lowByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const highByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Set HL register pair (little-endian: H=high, L=low)
    this.registers.h = highByte;
    this.registers.l = lowByte;

    return 12;
  }

  /**
   * LD SP,n16 (0x31) - Load 16-bit immediate into SP register
   * Hardware: 3 bytes, 12 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDSPn1631(): number {
    // Load 16-bit immediate value into SP register (little-endian)
    const lowByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const highByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Set SP register (little-endian)
    this.registers.sp = (highByte << 8) | lowByte;

    return 12;
  }

  /**
   * LD HL,SP+e8 (0xF8) - Load SP+signed offset into HL with flag effects
   * Hardware: 2 bytes, 12 cycles, sets Z=0,N=0,H,C flags
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * NOTE: This is the ONLY LD instruction that sets flags!
   */
  private executeLDHLSPe8F8(): number {
    // Read signed 8-bit offset from PC
    const offsetByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Convert to signed 8-bit value (two's complement)
    const signedOffset = offsetByte > 127 ? offsetByte - 256 : offsetByte;

    // Calculate result (SP + signed offset)
    const sp = this.registers.sp;
    const result = (sp + signedOffset) & 0xffff;

    // Set HL register pair
    this.registers.h = (result >> 8) & 0xff;
    this.registers.l = result & 0xff;

    // Set flags - this instruction sets Z=0, N=0, and calculates H and C
    this.setZeroFlag(false); // Z always 0 for this instruction
    this.setSubtractFlag(false); // N always 0 for this instruction

    // H and C flags use the same calculation as ADD SP,e8
    // Flag calculation is based on 8-bit unsigned arithmetic between SP's low byte and offset byte
    // H flag: set if carry from bit 3 to bit 4 in 8-bit addition
    const hFlag = (sp & 0x0f) + (offsetByte & 0x0f) > 0x0f;
    this.setHalfCarryFlag(hFlag);

    // C flag: set if carry from bit 7 to bit 8 in 8-bit addition
    const cFlag = (sp & 0xff) + offsetByte > 0xff;
    this.setCarryFlag(cFlag);

    return 12;
  }

  /**
   * LD SP,HL (0xF9) - Copy HL register pair to SP
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDSPHLF9(): number {
    // Copy HL register pair to SP
    this.registers.sp = this.getHL();

    return 8;
  }

  /**
   * LD A,(a16) (0xFA) - Load A from 16-bit memory address
   * Hardware: 3 bytes, 16 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDAa16FA(): number {
    // Read 16-bit address from PC (little-endian)
    const lowByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const highByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Construct target address (little-endian)
    const targetAddress = (highByte << 8) | lowByte;

    // Load A register from memory at target address
    this.registers.a = this.mmu.readByte(targetAddress);

    return 16;
  }

  // ===== PHASE 2: GROUP 1 DECOMPOSED REGISTER-TO-REGISTER LD INSTRUCTIONS =====
  // Reference: RGBDS GBZ80 Reference - https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
  // Pattern: LD dst,src - Copy src register to dst register (56 individual methods)
  // Hardware: 1 byte, 4 or 8 cycles, no flag changes (flags preserved)
  // Architectural Fix: Decomposed from executeRegisterLD() to follow Enhanced Private Method Pattern

  // === LD D,r INSTRUCTIONS (0x50-0x57) ===

  /**
   * LD D,B (0x50) - Copy B register to D register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDDB50(): number {
    // LD D,B - Copy B register value to D register
    this.registers.d = this.registers.b;
    return 4;
  }

  /**
   * LD D,C (0x51) - Copy C register to D register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDDC51(): number {
    // LD D,C - Copy C register value to D register
    this.registers.d = this.registers.c;
    return 4;
  }

  /**
   * LD D,D (0x52) - Copy D register to itself
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDDD52(): number {
    // LD D,D - Copy D to itself (no-op for register content, but still takes cycles)
    // No actual assignment needed, but instruction still takes cycles
    return 4;
  }

  /**
   * LD D,E (0x53) - Copy E register to D register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDDE53(): number {
    // LD D,E - Copy E register value to D register
    this.registers.d = this.registers.e;
    return 4;
  }

  /**
   * LD D,H (0x54) - Copy H register to D register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDDH54(): number {
    // LD D,H - Copy H register value to D register
    this.registers.d = this.registers.h;
    return 4;
  }

  /**
   * LD D,L (0x55) - Copy L register to D register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDDL55(): number {
    // LD D,L - Copy L register value to D register
    this.registers.d = this.registers.l;
    return 4;
  }

  /**
   * LD D,(HL) (0x56) - Load D from memory address HL
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDDHL56(): number {
    // LD D,(HL) - Load D register from memory at address HL
    const hlAddress = this.getHL();
    this.registers.d = this.mmu.readByte(hlAddress);
    return 8; // Memory access takes 8 cycles
  }

  /**
   * LD D,A (0x57) - Copy A register to D register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDDA57(): number {
    // LD D,A - Copy A register value to D register
    this.registers.d = this.registers.a;
    return 4;
  }

  // === LD E,r INSTRUCTIONS (0x58-0x5F) ===

  /**
   * LD E,B (0x58) - Copy B register to E register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDEB58(): number {
    // LD E,B - Copy B register value to E register
    this.registers.e = this.registers.b;
    return 4;
  }

  /**
   * LD E,C (0x59) - Copy C register to E register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDEC59(): number {
    // LD E,C - Copy C register value to E register
    this.registers.e = this.registers.c;
    return 4;
  }

  /**
   * LD E,D (0x5A) - Copy D register to E register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDED5A(): number {
    // LD E,D - Copy D register value to E register
    this.registers.e = this.registers.d;
    return 4;
  }

  /**
   * LD E,E (0x5B) - Copy E register to itself
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDEE5B(): number {
    // LD E,E - Copy E to itself (no-op for register content, but still takes cycles)
    // No actual assignment needed, but instruction still takes cycles
    return 4;
  }

  /**
   * LD E,H (0x5C) - Copy H register to E register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDEH5C(): number {
    // LD E,H - Copy H register value to E register
    this.registers.e = this.registers.h;
    return 4;
  }

  /**
   * LD E,L (0x5D) - Copy L register to E register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDEL5D(): number {
    // LD E,L - Copy L register value to E register
    this.registers.e = this.registers.l;
    return 4;
  }

  /**
   * LD E,(HL) (0x5E) - Load E from memory address HL
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDEHL5E(): number {
    // LD E,(HL) - Load E register from memory at address HL
    const hlAddress = this.getHL();
    this.registers.e = this.mmu.readByte(hlAddress);
    return 8; // Memory access takes 8 cycles
  }

  /**
   * LD E,A (0x5F) - Copy A register to E register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDEA5F(): number {
    // LD E,A - Copy A register value to E register
    this.registers.e = this.registers.a;
    return 4;
  }

  // === LD H,r INSTRUCTIONS (0x60-0x67) ===

  /**
   * LD H,B (0x60) - Copy B register to H register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDHB60(): number {
    // LD H,B - Copy B register value to H register
    this.registers.h = this.registers.b;
    return 4;
  }

  /**
   * LD H,C (0x61) - Copy C register to H register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDHC61(): number {
    // LD H,C - Copy C register value to H register
    this.registers.h = this.registers.c;
    return 4;
  }

  /**
   * LD H,D (0x62) - Copy D register to H register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDHD62(): number {
    // LD H,D - Copy D register value to H register
    this.registers.h = this.registers.d;
    return 4;
  }

  /**
   * LD H,E (0x63) - Copy E register to H register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDHE63(): number {
    // LD H,E - Copy E register value to H register
    this.registers.h = this.registers.e;
    return 4;
  }

  /**
   * LD H,H (0x64) - Copy H register to itself
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDHH64(): number {
    // LD H,H - Copy H to itself (no-op for register content, but still takes cycles)
    // No actual assignment needed, but instruction still takes cycles
    return 4;
  }

  /**
   * LD H,L (0x65) - Copy L register to H register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDHL65(): number {
    // LD H,L - Copy L register value to H register
    this.registers.h = this.registers.l;
    return 4;
  }

  /**
   * LD H,(HL) (0x66) - Load H from memory address HL
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDHHL66(): number {
    // LD H,(HL) - Load H register from memory at address HL
    const hlAddress = this.getHL();
    this.registers.h = this.mmu.readByte(hlAddress);
    return 8; // Memory access takes 8 cycles
  }

  /**
   * LD H,A (0x67) - Copy A register to H register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDHA67(): number {
    // LD H,A - Copy A register value to H register
    this.registers.h = this.registers.a;
    return 4;
  }

  // === LD L,r INSTRUCTIONS (0x68-0x6F) ===

  /**
   * LD L,B (0x68) - Copy B register to L register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDLB68(): number {
    // LD L,B - Copy B register value to L register
    this.registers.l = this.registers.b;
    return 4;
  }

  /**
   * LD L,C (0x69) - Copy C register to L register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDLC69(): number {
    // LD L,C - Copy C register value to L register
    this.registers.l = this.registers.c;
    return 4;
  }

  /**
   * LD L,D (0x6A) - Copy D register to L register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDLD6A(): number {
    // LD L,D - Copy D register value to L register
    this.registers.l = this.registers.d;
    return 4;
  }

  /**
   * LD L,E (0x6B) - Copy E register to L register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDLE6B(): number {
    // LD L,E - Copy E register value to L register
    this.registers.l = this.registers.e;
    return 4;
  }

  /**
   * LD L,H (0x6C) - Copy H register to L register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDLH6C(): number {
    // LD L,H - Copy H register value to L register
    this.registers.l = this.registers.h;
    return 4;
  }

  /**
   * LD L,L (0x6D) - Copy L register to itself
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDLL6D(): number {
    // LD L,L - Copy L to itself (no-op for register content, but still takes cycles)
    // No actual assignment needed, but instruction still takes cycles
    return 4;
  }

  /**
   * LD L,(HL) (0x6E) - Load L from memory address HL
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDLHL6E(): number {
    // LD L,(HL) - Load L register from memory at address HL
    const hlAddress = this.getHL();
    this.registers.l = this.mmu.readByte(hlAddress);
    return 8; // Memory access takes 8 cycles
  }

  /**
   * LD L,A (0x6F) - Copy A register to L register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDLA6F(): number {
    // LD L,A - Copy A register value to L register
    this.registers.l = this.registers.a;
    return 4;
  }

  // === LD (HL),r INSTRUCTIONS (0x71-0x75, 0x77) ===

  /**
   * LD (HL),C (0x71) - Store C into memory address HL
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDHLC71(): number {
    // LD (HL),C - Store C register value at address pointed to by HL
    const hlAddress = this.getHL();
    this.mmu.writeByte(hlAddress, this.registers.c);
    return 8; // Memory access takes 8 cycles
  }

  /**
   * LD (HL),D (0x72) - Store D into memory address HL
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDHLD72(): number {
    // LD (HL),D - Store D register value at address pointed to by HL
    const hlAddress = this.getHL();
    this.mmu.writeByte(hlAddress, this.registers.d);
    return 8; // Memory access takes 8 cycles
  }

  /**
   * LD (HL),E (0x73) - Store E into memory address HL
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDHLE73(): number {
    // LD (HL),E - Store E register value at address pointed to by HL
    const hlAddress = this.getHL();
    this.mmu.writeByte(hlAddress, this.registers.e);
    return 8; // Memory access takes 8 cycles
  }

  /**
   * LD (HL),H (0x74) - Store H into memory address HL
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDHLH74(): number {
    // LD (HL),H - Store H register value at address pointed to by HL
    const hlAddress = this.getHL();
    this.mmu.writeByte(hlAddress, this.registers.h);
    return 8; // Memory access takes 8 cycles
  }

  /**
   * LD (HL),L (0x75) - Store L into memory address HL
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDHLL75(): number {
    // LD (HL),L - Store L register value at address pointed to by HL
    const hlAddress = this.getHL();
    this.mmu.writeByte(hlAddress, this.registers.l);
    return 8; // Memory access takes 8 cycles
  }

  /**
   * LD (HL),A (0x77) - Store A into memory address HL
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDHLA77(): number {
    // LD (HL),A - Store A register value at address pointed to by HL
    const hlAddress = this.getHL();
    this.mmu.writeByte(hlAddress, this.registers.a);
    return 8; // Memory access takes 8 cycles
  }

  // === LD A,r INSTRUCTIONS (0x78-0x7F) ===

  /**
   * LD A,B (0x78) - Copy B register to A register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDAB78(): number {
    // LD A,B - Copy B register value to A register
    this.registers.a = this.registers.b;
    return 4;
  }

  /**
   * LD A,C (0x79) - Copy C register to A register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDAC79(): number {
    // LD A,C - Copy C register value to A register
    this.registers.a = this.registers.c;
    return 4;
  }

  /**
   * LD A,D (0x7A) - Copy D register to A register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDAD7A(): number {
    // LD A,D - Copy D register value to A register
    this.registers.a = this.registers.d;
    return 4;
  }

  /**
   * LD A,E (0x7B) - Copy E register to A register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDAE7B(): number {
    // LD A,E - Copy E register value to A register
    this.registers.a = this.registers.e;
    return 4;
  }

  /**
   * LD A,H (0x7C) - Copy H register to A register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDAH7C(): number {
    // LD A,H - Copy H register value to A register
    this.registers.a = this.registers.h;
    return 4;
  }

  /**
   * LD A,L (0x7D) - Copy L register to A register
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDAL7D(): number {
    // LD A,L - Copy L register value to A register
    this.registers.a = this.registers.l;
    return 4;
  }

  /**
   * LD A,(HL) (0x7E) - Load A from memory address HL
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDAHL7E(): number {
    // LD A,(HL) - Load A register from memory at address HL
    const hlAddress = this.getHL();
    this.registers.a = this.mmu.readByte(hlAddress);
    return 8; // Memory access takes 8 cycles
  }

  /**
   * LD A,A (0x7F) - Copy A register to itself
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeLDAA7F(): number {
    // LD A,A - Copy A to itself (no-op for register content, but still takes cycles)
    // No actual assignment needed, but instruction still takes cycles
    return 4;
  }

  // ===== PHASE 2: GROUP 4 ADVANCED MEMORY OPERATIONS - LDH INSTRUCTIONS =====
  // Reference: RGBDS GBZ80 Reference - https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
  // Pattern: LDH (Load High) - I/O port operations using $FF00 base address
  // Hardware: 1-2 bytes, 8-12 cycles, no flag changes (flags preserved)

  /**
   * LDH (a8),A (0xE0) - Store A at $FF00+a8
   * Hardware: 2 bytes, 12 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * I/O port operation: stores A at high memory ($FF00 + 8-bit offset)
   */
  private executeLDHa8AE0(): number {
    // Read 8-bit offset from PC
    const offset = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Calculate I/O port address ($FF00 + offset)
    const ioAddress = 0xff00 + offset;

    // Store A register at I/O port address
    this.mmu.writeByte(ioAddress, this.registers.a);

    return 12; // I/O port access takes 12 cycles
  }

  /**
   * LDH (C),A (0xE2) - Store A at $FF00+C
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * I/O port operation: stores A at high memory ($FF00 + C register value)
   */
  private executeLDHCAE2(): number {
    // Calculate I/O port address ($FF00 + C register)
    const ioAddress = 0xff00 + this.registers.c;

    // Store A register at I/O port address
    this.mmu.writeByte(ioAddress, this.registers.a);

    return 8; // I/O port access via register takes 8 cycles
  }

  /**
   * LDH A,(a8) (0xF0) - Load A from $FF00+a8
   * Hardware: 2 bytes, 12 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * I/O port operation: loads A from high memory ($FF00 + 8-bit offset)
   */
  private executeLDHAa8F0(): number {
    // Read 8-bit offset from PC
    const offset = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Calculate I/O port address ($FF00 + offset)
    const ioAddress = 0xff00 + offset;

    // Load A register from I/O port address
    this.registers.a = this.mmu.readByte(ioAddress);

    return 12; // I/O port access takes 12 cycles
  }

  /**
   * LDH A,(C) (0xF2) - Load A from $FF00+C
   * Hardware: 1 byte, 8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * I/O port operation: loads A from high memory ($FF00 + C register value)
   */
  private executeLDHACF2(): number {
    // Calculate I/O port address ($FF00 + C register)
    const ioAddress = 0xff00 + this.registers.c;

    // Load A register from I/O port address
    this.registers.a = this.mmu.readByte(ioAddress);

    return 8; // I/O port access via register takes 8 cycles
  }

  // ===== PHASE 3: ADD INSTRUCTION FAMILY IMPLEMENTATIONS =====
  // Generated following TDD principles and hardware accuracy
  // Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7

  /**
   * ADD A,H (0x84) - Add H to A
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeADDAH84(): number {
    // ADD A,H - Add H to A with flag calculation
    const a = this.registers.a;
    const value = this.registers.h;
    const result = a + value;

    // Update A register
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(false); // N always 0 for ADD
    this.setHalfCarryFlag((a & 0x0f) + (value & 0x0f) > 0x0f);
    this.setCarryFlag(result > 0xff);

    return 4;
  }

  /**
   * ADD A,L (0x85) - Add L to A
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeADDAL85(): number {
    // ADD A,L - Add L to A with flag calculation
    const a = this.registers.a;
    const value = this.registers.l;
    const result = a + value;

    // Update A register
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(false); // N always 0 for ADD
    this.setHalfCarryFlag((a & 0x0f) + (value & 0x0f) > 0x0f);
    this.setCarryFlag(result > 0xff);

    return 4;
  }

  /**
   * ADD A,(HL) (0x86) - Add memory value at HL to A
   * Hardware: 1 byte, 8 cycles, sets Z,N,H,C flags
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeADDAHL86(): number {
    // ADD A,(HL) - Add memory value at HL to A with flag calculation
    const a = this.registers.a;
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    const result = a + value;

    // Update A register
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(false); // N always 0 for ADD
    this.setHalfCarryFlag((a & 0x0f) + (value & 0x0f) > 0x0f);
    this.setCarryFlag(result > 0xff);

    return 8; // Memory access takes 8 cycles
  }

  /**
   * ADD A,A (0x87) - Add A to itself (double A)
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeADDAA87(): number {
    // ADD A,A - Add A to itself with flag calculation
    const a = this.registers.a;
    const value = this.registers.a; // Same as a
    const result = a + value;

    // Update A register
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(false); // N always 0 for ADD
    this.setHalfCarryFlag((a & 0x0f) + (value & 0x0f) > 0x0f);
    this.setCarryFlag(result > 0xff);

    return 4;
  }

  /**
   * ADD A,n8 (0xC6) - Add immediate 8-bit value to A
   * Hardware: 2 bytes, 8 cycles, sets Z,N,H,C flags
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeADDAn8C6(): number {
    // ADD A,n8 - Add immediate value to A with flag calculation
    const a = this.registers.a;
    const value = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const result = a + value;

    // Update A register
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(false); // N always 0 for ADD
    this.setHalfCarryFlag((a & 0x0f) + (value & 0x0f) > 0x0f);
    this.setCarryFlag(result > 0xff);

    return 8; // Immediate operand access takes 8 cycles
  }

  // ===== PHASE 3: ADC INSTRUCTION FAMILY IMPLEMENTATIONS =====
  // Generated following TDD principles and hardware accuracy
  // Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7

  /**
   * ADC A,B (0x88) - Add B to A with carry
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeADCAB88(): number {
    // ADC A,B - Add B to A with carry flag included
    const a = this.registers.a;
    const value = this.registers.b;
    const carryIn = this.getCarryFlag() ? 1 : 0;
    const result = a + value + carryIn;

    // Update A register
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(false); // N always 0 for ADC
    this.setHalfCarryFlag((a & 0x0f) + (value & 0x0f) + carryIn > 0x0f);
    this.setCarryFlag(result > 0xff);

    return 4;
  }

  /**
   * ADC A,C (0x89) - Add C to A with carry
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeADCAC89(): number {
    // ADC A,C - Add C to A with carry flag included
    const a = this.registers.a;
    const value = this.registers.c;
    const carryIn = this.getCarryFlag() ? 1 : 0;
    const result = a + value + carryIn;

    // Update A register
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(false); // N always 0 for ADC
    this.setHalfCarryFlag((a & 0x0f) + (value & 0x0f) + carryIn > 0x0f);
    this.setCarryFlag(result > 0xff);

    return 4;
  }

  /**
   * ADC A,D (0x8A) - Add D to A with carry
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeADCAD8A(): number {
    // ADC A,D - Add D to A with carry flag included
    const a = this.registers.a;
    const value = this.registers.d;
    const carryIn = this.getCarryFlag() ? 1 : 0;
    const result = a + value + carryIn;

    // Update A register
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(false); // N always 0 for ADC
    this.setHalfCarryFlag((a & 0x0f) + (value & 0x0f) + carryIn > 0x0f);
    this.setCarryFlag(result > 0xff);

    return 4;
  }

  /**
   * ADC A,E (0x8B) - Add E to A with carry
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeADCAE8B(): number {
    // ADC A,E - Add E to A with carry flag included
    const a = this.registers.a;
    const value = this.registers.e;
    const carryIn = this.getCarryFlag() ? 1 : 0;
    const result = a + value + carryIn;

    // Update A register
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(false); // N always 0 for ADC
    this.setHalfCarryFlag((a & 0x0f) + (value & 0x0f) + carryIn > 0x0f);
    this.setCarryFlag(result > 0xff);

    return 4;
  }

  /**
   * ADC A,H (0x8C) - Add H to A with carry
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeADCAH8C(): number {
    // ADC A,H - Add H to A with carry flag included
    const a = this.registers.a;
    const value = this.registers.h;
    const carryIn = this.getCarryFlag() ? 1 : 0;
    const result = a + value + carryIn;

    // Update A register
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(false); // N always 0 for ADC
    this.setHalfCarryFlag((a & 0x0f) + (value & 0x0f) + carryIn > 0x0f);
    this.setCarryFlag(result > 0xff);

    return 4;
  }

  /**
   * ADC A,L (0x8D) - Add L to A with carry
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeADCAL8D(): number {
    // ADC A,L - Add L to A with carry flag included
    const a = this.registers.a;
    const value = this.registers.l;
    const carryIn = this.getCarryFlag() ? 1 : 0;
    const result = a + value + carryIn;

    // Update A register
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(false); // N always 0 for ADC
    this.setHalfCarryFlag((a & 0x0f) + (value & 0x0f) + carryIn > 0x0f);
    this.setCarryFlag(result > 0xff);

    return 4;
  }

  /**
   * ADC A,(HL) (0x8E) - Add memory value at HL to A with carry
   * Hardware: 1 byte, 8 cycles, sets Z,N,H,C flags
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeADCAHL8E(): number {
    // ADC A,(HL) - Add memory value at HL to A with carry flag included
    const a = this.registers.a;
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    const carryIn = this.getCarryFlag() ? 1 : 0;
    const result = a + value + carryIn;

    // Update A register
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(false); // N always 0 for ADC
    this.setHalfCarryFlag((a & 0x0f) + (value & 0x0f) + carryIn > 0x0f);
    this.setCarryFlag(result > 0xff);

    return 8; // Memory access takes 8 cycles
  }

  /**
   * ADC A,A (0x8F) - Add A to itself with carry
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeADCAA8F(): number {
    // ADC A,A - Add A to itself with carry flag included
    const a = this.registers.a;
    const value = this.registers.a; // Same as a
    const carryIn = this.getCarryFlag() ? 1 : 0;
    const result = a + value + carryIn;

    // Update A register
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(false); // N always 0 for ADC
    this.setHalfCarryFlag((a & 0x0f) + (value & 0x0f) + carryIn > 0x0f);
    this.setCarryFlag(result > 0xff);

    return 4;
  }

  /**
   * ADC A,n8 (0xCE) - Add immediate 8-bit value to A with carry
   * Hardware: 2 bytes, 8 cycles, sets Z,N,H,C flags
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeADCAn8CE(): number {
    // ADC A,n8 - Add immediate value to A with carry flag included
    const a = this.registers.a;
    const value = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const carryIn = this.getCarryFlag() ? 1 : 0;
    const result = a + value + carryIn;

    // Update A register
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(false); // N always 0 for ADC
    this.setHalfCarryFlag((a & 0x0f) + (value & 0x0f) + carryIn > 0x0f);
    this.setCarryFlag(result > 0xff);

    return 8; // Immediate operand access takes 8 cycles
  }

  // ===== PHASE 3: 16-BIT ADD INSTRUCTION FAMILY IMPLEMENTATIONS =====
  // Generated following TDD principles and hardware accuracy
  // Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7

  /**
   * ADD HL,BC (0x09) - Add BC to HL
   * Hardware: 1 byte, 8 cycles, sets N,H,C flags (Z preserved)
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeADDHLBC09(): number {
    // ADD HL,BC - Add BC register pair to HL with 16-bit flag calculation
    const hl = this.getHL();
    const bc = this.getBC();
    const result = hl + bc;

    // Update HL register pair
    this.setHL(result & 0xffff);

    // Calculate and set flags (Z flag preserved for 16-bit ADD)
    this.setSubtractFlag(false); // N always 0 for ADD
    // Half-carry: Set if overflow from bit 11 (RGBDS specification)
    // GameBoy Online approach: check if lower 12 bits wrapped around
    this.setHalfCarryFlag((hl & 0x0fff) > (result & 0x0fff));
    this.setCarryFlag(result > 0xffff);

    return 8; // 16-bit addition takes 8 cycles
  }

  /**
   * ADD HL,DE (0x19) - Add DE to HL
   * Hardware: 1 byte, 8 cycles, sets N,H,C flags (Z preserved)
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeADDHLDE19(): number {
    // ADD HL,DE - Add DE register pair to HL with 16-bit flag calculation
    const hl = this.getHL();
    const de = this.getDE();
    const result = hl + de;

    // Update HL register pair
    this.setHL(result & 0xffff);

    // Calculate and set flags (Z flag preserved for 16-bit ADD)
    this.setSubtractFlag(false); // N always 0 for ADD
    // Half-carry: Set if overflow from bit 11 (RGBDS specification)
    // GameBoy Online approach: check if lower 12 bits wrapped around
    this.setHalfCarryFlag((hl & 0x0fff) > (result & 0x0fff));
    this.setCarryFlag(result > 0xffff);

    return 8; // 16-bit addition takes 8 cycles
  }

  /**
   * ADD HL,HL (0x29) - Add HL to itself (double HL)
   * Hardware: 1 byte, 8 cycles, sets N,H,C flags (Z preserved)
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeADDHLHL29(): number {
    // ADD HL,HL - Add HL register pair to itself with 16-bit flag calculation
    const hl = this.getHL();
    const result = hl + hl;

    // Update HL register pair
    this.setHL(result & 0xffff);

    // Calculate and set flags (Z flag preserved for 16-bit ADD)
    this.setSubtractFlag(false); // N always 0 for ADD
    // Half-carry: Set if overflow from bit 11 (RGBDS specification)
    // GameBoy Online approach: check if lower 12 bits wrapped around
    this.setHalfCarryFlag((hl & 0x0fff) > (result & 0x0fff));
    this.setCarryFlag(result > 0xffff);

    return 8; // 16-bit addition takes 8 cycles
  }

  /**
   * ADD HL,SP (0x39) - Add SP to HL
   * Hardware: 1 byte, 8 cycles, sets N,H,C flags (Z preserved)
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeADDHLSP39(): number {
    // ADD HL,SP - Add SP register to HL with 16-bit flag calculation
    const hl = this.getHL();
    const sp = this.registers.sp;
    const result = hl + sp;

    // Update HL register pair
    this.setHL(result & 0xffff);

    // Calculate and set flags (Z flag preserved for 16-bit ADD)
    this.setSubtractFlag(false); // N always 0 for ADD
    // Half-carry: Set if overflow from bit 11 (RGBDS specification)
    // GameBoy Online approach: check if lower 12 bits wrapped around
    this.setHalfCarryFlag((hl & 0x0fff) > (result & 0x0fff));
    this.setCarryFlag(result > 0xffff);

    return 8; // 16-bit addition takes 8 cycles
  }

  /**
   * ADD SP,e8 (0xE8) - Add signed immediate offset to Stack Pointer
   * Reference: RGBDS GBZ80 Reference https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Flags: Z=0, N=0, H=calculated (bit 3->4 carry on lower byte), C=calculated (bit 7->8 carry on lower byte)
   */
  private executeADDSPe8(): number {
    // ADD SP,e8 - Add signed 8-bit immediate to stack pointer
    // Read signed 8-bit offset from PC (PC already advanced by step())
    const offsetByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Convert to signed 8-bit value (two's complement)
    const signedOffset = offsetByte > 127 ? offsetByte - 256 : offsetByte;

    // Calculate result (SP + signed offset)
    const sp = this.registers.sp;
    const result = (sp + signedOffset) & 0xffff;

    // Update stack pointer
    this.registers.sp = result;

    // Set flags - this instruction sets Z=0, N=0, and calculates H and C
    this.setZeroFlag(false); // Z always 0 for ADD SP,e8
    this.setSubtractFlag(false); // N always 0 for ADD SP,e8

    // H flag: set if carry from bit 3 in the addition of SP's low byte and offset
    const hFlag = (sp & 0x0f) + (offsetByte & 0x0f) > 0x0f;
    this.setHalfCarryFlag(hFlag);

    // C flag: set if carry from bit 7 in the addition of SP's low byte and offset
    const cFlag = (sp & 0xff) + offsetByte > 0xff;
    this.setCarryFlag(cFlag);

    return 16; // ADD SP,e8 takes 16 cycles
  }

  /**
   * SUB A,C (0x91) - Subtract C from A
   * Reference: RGBDS GBZ80 Reference https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * Phase 4 implementation
   */
  private executeSUBAC91(): number {
    // SUB A,C - Subtract C from A with flag calculation
    const a = this.registers.a;
    const value = this.registers.c;
    const result = a - value;

    // Update A register (handle underflow)
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(true); // N flag always set for SUB
    this.setHalfCarryFlag((value & 0x0f) > (a & 0x0f)); // H flag set if borrow from bit 4
    this.setCarryFlag(result < 0); // C flag set if borrow occurred

    return 4;
  }

  /**
   * SUB A,D (0x92) - Subtract D from A
   * Reference: RGBDS GBZ80 Reference https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * Phase 4 implementation
   */
  private executeSUBAD92(): number {
    // SUB A,D - Subtract D from A with flag calculation
    const a = this.registers.a;
    const value = this.registers.d;
    const result = a - value;

    // Update A register (handle underflow)
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(true); // N flag always set for SUB
    this.setHalfCarryFlag((value & 0x0f) > (a & 0x0f)); // H flag set if borrow from bit 4
    this.setCarryFlag(result < 0); // C flag set if borrow occurred

    return 4;
  }

  /**
   * SUB A,E (0x93) - Subtract E from A
   * Reference: RGBDS GBZ80 Reference https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * Phase 4 implementation
   */
  private executeSUBAE93(): number {
    // SUB A,E - Subtract E from A with flag calculation
    const a = this.registers.a;
    const value = this.registers.e;
    const result = a - value;

    // Update A register (handle underflow)
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(true); // N flag always set for SUB
    this.setHalfCarryFlag((value & 0x0f) > (a & 0x0f)); // H flag set if borrow from bit 4
    this.setCarryFlag(result < 0); // C flag set if borrow occurred

    return 4;
  }

  /**
   * SUB A,H (0x94) - Subtract H from A
   * Reference: RGBDS GBZ80 Reference https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * Phase 4 implementation
   */
  private executeSUBAH94(): number {
    // SUB A,H - Subtract H from A with flag calculation
    const a = this.registers.a;
    const value = this.registers.h;
    const result = a - value;

    // Update A register (handle underflow)
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(true); // N flag always set for SUB
    this.setHalfCarryFlag((value & 0x0f) > (a & 0x0f)); // H flag set if borrow from bit 4
    this.setCarryFlag(result < 0); // C flag set if borrow occurred

    return 4;
  }

  /**
   * SUB A,L (0x95) - Subtract L from A
   * Reference: RGBDS GBZ80 Reference https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * Phase 4 implementation
   */
  private executeSUBAL95(): number {
    // SUB A,L - Subtract L from A with flag calculation
    const a = this.registers.a;
    const value = this.registers.l;
    const result = a - value;

    // Update A register (handle underflow)
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(true); // N flag always set for SUB
    this.setHalfCarryFlag((value & 0x0f) > (a & 0x0f)); // H flag set if borrow from bit 4
    this.setCarryFlag(result < 0); // C flag set if borrow occurred

    return 4;
  }

  /**
   * SUB A,(HL) (0x96) - Subtract value at memory address HL from A
   * Reference: RGBDS GBZ80 Reference https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Hardware: 1 byte, 8 cycles, sets Z,N,H,C flags
   * Phase 4 implementation
   */
  private executeSUBAHL96(): number {
    // SUB A,(HL) - Subtract value at HL from A with flag calculation
    const a = this.registers.a;
    const hl = (this.registers.h << 8) | this.registers.l;
    const value = this.mmu.readByte(hl);
    const result = a - value;

    // Update A register (handle underflow)
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(true); // N flag always set for SUB
    this.setHalfCarryFlag((value & 0x0f) > (a & 0x0f)); // H flag set if borrow from bit 4
    this.setCarryFlag(result < 0); // C flag set if borrow occurred

    return 8; // Memory access takes 8 cycles
  }

  /**
   * SUB A,A (0x97) - Subtract A from itself (always results in 0)
   * Reference: RGBDS GBZ80 Reference https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Hardware: 1 byte, 4 cycles, flags per spec: Z=1, N=1, H=0, C=0
   * Phase 4 implementation
   */
  private executeSUBAA97(): number {
    // SUB A,A - Always results in 0 per RGBDS specification
    this.registers.a = 0x00;

    // Set flags per RGBDS specification for SUB A,A
    this.setZeroFlag(true); // Z = 1 (result always zero per spec)
    this.setSubtractFlag(true); // N = 1 (subtraction)
    this.setHalfCarryFlag(false); // H = 0 (no borrow per spec)
    this.setCarryFlag(false); // C = 0 (no borrow per spec)

    return 4;
  }

  /**
   * SUB A,n8 (0xD6) - Subtract immediate 8-bit value from A
   * Reference: RGBDS GBZ80 Reference https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Hardware: 2 bytes, 8 cycles, sets Z,N,H,C flags
   * Phase 4 implementation
   */
  private executeSUBAn8D6(): number {
    // SUB A,n8 - Subtract immediate value from A with flag calculation
    const a = this.registers.a;
    const value = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const result = a - value;

    // Update A register (handle underflow)
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(true); // N flag always set for SUB
    this.setHalfCarryFlag((value & 0x0f) > (a & 0x0f)); // H flag set if borrow from bit 4
    this.setCarryFlag(result < 0); // C flag set if borrow occurred

    return 8; // Immediate operand takes 8 cycles
  }

  /**
   * SBC A,B (0x98) - Subtract B from A with carry
   * Reference: RGBDS GBZ80 Reference https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * Phase 4 implementation
   */
  private executeSBCAB98(): number {
    // SBC A,B - Subtract B and carry from A with flag calculation
    const a = this.registers.a;
    const value = this.registers.b;
    const carry = this.getCarryFlag() ? 1 : 0;
    const result = a - value - carry;

    // Update A register (handle underflow)
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(true); // N flag always set for SBC
    // H flag: set if borrow from bit 4 (RGBDS-compliant subtract with carry calculation)
    const halfCarry = (a & 0x0f) - (value & 0x0f) - carry < 0;
    this.setHalfCarryFlag(halfCarry);
    this.setCarryFlag(result < 0); // C flag set if borrow occurred

    return 4;
  }

  /**
   * SBC A,C (0x99) - Subtract C from A with carry
   * Reference: RGBDS GBZ80 Reference https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * Phase 4 implementation
   */
  private executeSBCAC99(): number {
    // SBC A,C - Subtract C and carry from A with flag calculation
    const a = this.registers.a;
    const value = this.registers.c;
    const carry = this.getCarryFlag() ? 1 : 0;
    const result = a - value - carry;

    // Update A register (handle underflow)
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(true); // N flag always set for SBC
    // H flag: set if borrow from bit 4 (RGBDS-compliant subtract with carry calculation)
    const halfCarry = (a & 0x0f) - (value & 0x0f) - carry < 0;
    this.setHalfCarryFlag(halfCarry);
    this.setCarryFlag(result < 0); // C flag set if borrow occurred

    return 4;
  }

  /**
   * SBC A,D (0x9A) - Subtract D from A with carry
   * Reference: RGBDS GBZ80 Reference https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * Phase 4 implementation
   */
  private executeSBCAD9A(): number {
    // SBC A,D - Subtract D and carry from A with flag calculation
    const a = this.registers.a;
    const value = this.registers.d;
    const carry = this.getCarryFlag() ? 1 : 0;
    const result = a - value - carry;

    // Update A register (handle underflow)
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(true); // N flag always set for SBC
    // H flag: set if borrow from bit 4 (RGBDS-compliant subtract with carry calculation)
    const halfCarry = (a & 0x0f) - (value & 0x0f) - carry < 0;
    this.setHalfCarryFlag(halfCarry);
    this.setCarryFlag(result < 0); // C flag set if borrow occurred

    return 4;
  }

  /**
   * SBC A,E (0x9B) - Subtract E from A with carry
   * Reference: RGBDS GBZ80 Reference https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * Phase 4 implementation
   */
  private executeSBCAE9B(): number {
    // SBC A,E - Subtract E and carry from A with flag calculation
    const a = this.registers.a;
    const value = this.registers.e;
    const carry = this.getCarryFlag() ? 1 : 0;
    const result = a - value - carry;

    // Update A register (handle underflow)
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(true); // N flag always set for SBC
    // H flag: set if borrow from bit 4 (RGBDS-compliant subtract with carry calculation)
    const halfCarry = (a & 0x0f) - (value & 0x0f) - carry < 0;
    this.setHalfCarryFlag(halfCarry);
    this.setCarryFlag(result < 0); // C flag set if borrow occurred

    return 4;
  }

  /**
   * SBC A,H (0x9C) - Subtract H from A with carry
   * Reference: RGBDS GBZ80 Reference https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * Phase 4 implementation
   */
  private executeSBCAH9C(): number {
    // SBC A,H - Subtract H and carry from A with flag calculation
    const a = this.registers.a;
    const value = this.registers.h;
    const carry = this.getCarryFlag() ? 1 : 0;
    const result = a - value - carry;

    // Update A register (handle underflow)
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(true); // N flag always set for SBC
    // H flag: set if borrow from bit 4 (RGBDS-compliant subtract with carry calculation)
    const halfCarry = (a & 0x0f) - (value & 0x0f) - carry < 0;
    this.setHalfCarryFlag(halfCarry);
    this.setCarryFlag(result < 0); // C flag set if borrow occurred

    return 4;
  }

  /**
   * SBC A,L (0x9D) - Subtract L from A with carry
   * Reference: RGBDS GBZ80 Reference https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags
   * Phase 4 implementation
   */
  private executeSBCAL9D(): number {
    // SBC A,L - Subtract L and carry from A with flag calculation
    const a = this.registers.a;
    const value = this.registers.l;
    const carry = this.getCarryFlag() ? 1 : 0;
    const result = a - value - carry;

    // Update A register (handle underflow)
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(true); // N flag always set for SBC
    // H flag: set if borrow from bit 4 (RGBDS-compliant subtract with carry calculation)
    const halfCarry = (a & 0x0f) - (value & 0x0f) - carry < 0;
    this.setHalfCarryFlag(halfCarry);
    this.setCarryFlag(result < 0); // C flag set if borrow occurred

    return 4;
  }

  /**
   * SBC A,(HL) (0x9E) - Subtract value at memory address HL from A with carry
   * Reference: RGBDS GBZ80 Reference https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Hardware: 1 byte, 8 cycles, sets Z,N,H,C flags
   * Phase 4 implementation
   */
  private executeSBCAHL9E(): number {
    // SBC A,(HL) - Subtract value at HL and carry from A with flag calculation
    const a = this.registers.a;
    const hl = (this.registers.h << 8) | this.registers.l;
    const value = this.mmu.readByte(hl);
    const carry = this.getCarryFlag() ? 1 : 0;
    const result = a - value - carry;

    // Update A register (handle underflow)
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(true); // N flag always set for SBC
    // H flag: set if borrow from bit 4 (RGBDS-compliant subtract with carry calculation)
    const halfCarry = (a & 0x0f) - (value & 0x0f) - carry < 0;
    this.setHalfCarryFlag(halfCarry);
    this.setCarryFlag(result < 0); // C flag set if borrow occurred

    return 8; // Memory access takes 8 cycles
  }

  /**
   * SBC A,A (0x9F) - Subtract A from itself with carry
   * Reference: RGBDS GBZ80 Reference https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Hardware: 1 byte, 4 cycles, sets Z,N,H,C flags (depends on carry flag)
   * Phase 4 implementation
   */
  private executeSBCAA9F(): number {
    // SBC A,A - Subtract A and carry from A
    const a = this.registers.a;
    const carry = this.getCarryFlag() ? 1 : 0;
    const result = a - a - carry; // A - A - carry = 0 - carry

    // Update A register (handle underflow)
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(true); // N flag always set for SBC
    // Special case for SBC A,A: H flag uses inverse logic compared to other SBC instructions
    this.setHalfCarryFlag((a & 0x0f) < (a & 0x0f) + carry); // H flag set if borrow from bit 4 (special case)
    this.setCarryFlag(result < 0); // C flag set if borrow occurred (when carry was 1)

    return 4;
  }

  /**
   * SBC A,n8 (0xDE) - Subtract immediate 8-bit value from A with carry
   * Reference: RGBDS GBZ80 Reference https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Hardware: 2 bytes, 8 cycles, sets Z,N,H,C flags
   * Phase 4 implementation
   */
  private executeSBCAn8DE(): number {
    // SBC A,n8 - Subtract immediate value and carry from A with flag calculation
    const a = this.registers.a;
    const value = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const carry = this.getCarryFlag() ? 1 : 0;
    const result = a - value - carry;

    // Update A register (handle underflow)
    this.registers.a = result & 0xff;

    // Calculate and set flags
    this.setZeroFlag((result & 0xff) === 0);
    this.setSubtractFlag(true); // N flag always set for SBC
    // H flag: set if borrow from bit 4 (upper nibble underflows when lower needs borrow)
    const halfCarry = (a & 0x0f) < (value & 0x0f) + carry && (a & 0xf0) <= (value & 0xf0);
    this.setHalfCarryFlag(halfCarry);
    this.setCarryFlag(result < 0); // C flag set if borrow occurred

    return 8; // Immediate operand takes 8 cycles
  }

  // ===== PHASE 6: INC/DEC INSTRUCTION IMPLEMENTATIONS =====

  /**
   * INC B (0x04) - Increment B register
   * Hardware: 1 byte, 4 cycles, Z/N/H flags affected (C unchanged)
   * Reference: RGBDS GBZ80 INC instruction
   */
  private executeINCB04(): number {
    const oldValue = this.registers.b;
    const result = (oldValue + 1) & 0xff;
    this.registers.b = result;

    // Set flags per RGBDS: Z if result is 0, N=0, H if carry from bit 3, C unchanged
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false); // N always 0 for INC
    this.setHalfCarryFlag((oldValue & 0x0f) === 0x0f); // H set if carry from bit 3

    return 4;
  }

  /**
   * INC C (0x0C) - Increment C register
   * Hardware: 1 byte, 4 cycles, Z/N/H flags affected (C unchanged)
   * Reference: RGBDS GBZ80 INC instruction
   */
  private executeINCC0C(): number {
    const oldValue = this.registers.c;
    const result = (oldValue + 1) & 0xff;
    this.registers.c = result;

    // Set flags per RGBDS: Z if result is 0, N=0, H if carry from bit 3, C unchanged
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false); // N always 0 for INC
    this.setHalfCarryFlag((oldValue & 0x0f) === 0x0f); // H set if carry from bit 3

    return 4;
  }

  /**
   * INC D (0x14) - Increment D register
   * Hardware: 1 byte, 4 cycles, Z/N/H flags affected (C unchanged)
   * Reference: RGBDS GBZ80 INC instruction
   */
  private executeINCD14(): number {
    const oldValue = this.registers.d;
    const result = (oldValue + 1) & 0xff;
    this.registers.d = result;

    // Set flags per RGBDS: Z if result is 0, N=0, H if carry from bit 3, C unchanged
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false); // N always 0 for INC
    this.setHalfCarryFlag((oldValue & 0x0f) === 0x0f); // H set if carry from bit 3

    return 4;
  }

  /**
   * INC E (0x1C) - Increment E register
   * Hardware: 1 byte, 4 cycles, Z/N/H flags affected (C unchanged)
   * Reference: RGBDS GBZ80 INC instruction
   */
  private executeINCE1C(): number {
    const oldValue = this.registers.e;
    const result = (oldValue + 1) & 0xff;
    this.registers.e = result;

    // Set flags per RGBDS: Z if result is 0, N=0, H if carry from bit 3, C unchanged
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false); // N always 0 for INC
    this.setHalfCarryFlag((oldValue & 0x0f) === 0x0f); // H set if carry from bit 3

    return 4;
  }

  /**
   * INC H (0x24) - Increment H register
   * Hardware: 1 byte, 4 cycles, Z/N/H flags affected (C unchanged)
   * Reference: RGBDS GBZ80 INC instruction
   */
  private executeINCH24(): number {
    const oldValue = this.registers.h;
    const result = (oldValue + 1) & 0xff;
    this.registers.h = result;

    // Set flags per RGBDS: Z if result is 0, N=0, H if carry from bit 3, C unchanged
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false); // N always 0 for INC
    this.setHalfCarryFlag((oldValue & 0x0f) === 0x0f); // H set if carry from bit 3

    return 4;
  }

  /**
   * INC L (0x2C) - Increment L register
   * Hardware: 1 byte, 4 cycles, Z/N/H flags affected (C unchanged)
   * Reference: RGBDS GBZ80 INC instruction
   */
  private executeINCL2C(): number {
    const oldValue = this.registers.l;
    const result = (oldValue + 1) & 0xff;
    this.registers.l = result;

    // Set flags per RGBDS: Z if result is 0, N=0, H if carry from bit 3, C unchanged
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false); // N always 0 for INC
    this.setHalfCarryFlag((oldValue & 0x0f) === 0x0f); // H set if carry from bit 3

    return 4;
  }

  /**
   * INC A (0x3C) - Increment A register
   * Hardware: 1 byte, 4 cycles, Z/N/H flags affected (C unchanged)
   * Reference: RGBDS GBZ80 INC instruction
   */
  private executeINCA3C(): number {
    const oldValue = this.registers.a;
    const result = (oldValue + 1) & 0xff;
    this.registers.a = result;

    // Set flags per RGBDS: Z if result is 0, N=0, H if carry from bit 3, C unchanged
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false); // N always 0 for INC
    this.setHalfCarryFlag((oldValue & 0x0f) === 0x0f); // H set if carry from bit 3

    return 4;
  }

  /**
   * INC (HL) (0x34) - Increment memory value at HL address
   * Hardware: 1 byte, 12 cycles, Z/N/H flags affected (C unchanged)
   * Reference: RGBDS GBZ80 INC instruction
   */
  private executeINCHL34(): number {
    const hlAddress = this.getHL();
    const oldValue = this.mmu.readByte(hlAddress);
    const result = (oldValue + 1) & 0xff;
    this.mmu.writeByte(hlAddress, result);

    // Set flags per RGBDS: Z if result is 0, N=0, H if carry from bit 3, C unchanged
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false); // N always 0 for INC
    this.setHalfCarryFlag((oldValue & 0x0f) === 0x0f); // H set if carry from bit 3

    return 12;
  }

  /**
   * INC BC (0x03) - Increment BC register pair
   * Hardware: 1 byte, 8 cycles, no flags affected
   * Reference: RGBDS GBZ80 INC instruction
   */
  private executeINCBC03(): number {
    const bc = this.getBC();
    const result = (bc + 1) & 0xffff;
    this.registers.b = (result >> 8) & 0xff;
    this.registers.c = result & 0xff;

    // No flags affected for 16-bit INC per RGBDS specification
    return 8;
  }

  /**
   * INC DE (0x13) - Increment DE register pair
   * Hardware: 1 byte, 8 cycles, no flags affected
   * Reference: RGBDS GBZ80 INC instruction
   */
  private executeINCDE13(): number {
    const de = this.getDE();
    const result = (de + 1) & 0xffff;
    this.registers.d = (result >> 8) & 0xff;
    this.registers.e = result & 0xff;

    // No flags affected for 16-bit INC per RGBDS specification
    return 8;
  }

  /**
   * INC HL (0x23) - Increment HL register pair
   * Hardware: 1 byte, 8 cycles, no flags affected
   * Reference: RGBDS GBZ80 INC instruction
   */
  private executeINCHL23(): number {
    const hl = this.getHL();
    const result = (hl + 1) & 0xffff;
    this.registers.h = (result >> 8) & 0xff;
    this.registers.l = result & 0xff;

    // No flags affected for 16-bit INC per RGBDS specification
    return 8;
  }

  /**
   * INC SP (0x33) - Increment SP register
   * Hardware: 1 byte, 8 cycles, no flags affected
   * Reference: RGBDS GBZ80 INC instruction
   */
  private executeINCSP33(): number {
    this.registers.sp = (this.registers.sp + 1) & 0xffff;

    // No flags affected for 16-bit INC per RGBDS specification
    return 8;
  }

  /**
   * DEC B (0x05) - Decrement B register
   * Hardware: 1 byte, 4 cycles, Z/N/H flags affected (C unchanged)
   * Reference: RGBDS GBZ80 DEC instruction
   */
  private executeDECB05(): number {
    const oldValue = this.registers.b;
    const result = (oldValue - 1) & 0xff;
    this.registers.b = result;

    // Set flags per RGBDS: Z if result is 0, N=1, H if borrow from bit 4, C unchanged
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(true); // N always 1 for DEC
    this.setHalfCarryFlag((oldValue & 0x0f) === 0x00); // H set if borrow from bit 4

    return 4;
  }

  /**
   * DEC C (0x0D) - Decrement C register
   * Hardware: 1 byte, 4 cycles, Z/N/H flags affected (C unchanged)
   * Reference: RGBDS GBZ80 DEC instruction
   */
  private executeDECC0D(): number {
    const oldValue = this.registers.c;
    const result = (oldValue - 1) & 0xff;
    this.registers.c = result;

    // Set flags per RGBDS: Z if result is 0, N=1, H if borrow from bit 4, C unchanged
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(true); // N always 1 for DEC
    this.setHalfCarryFlag((oldValue & 0x0f) === 0x00); // H set if borrow from bit 4

    return 4;
  }

  /**
   * DEC D (0x15) - Decrement D register
   * Hardware: 1 byte, 4 cycles, Z/N/H flags affected (C unchanged)
   * Reference: RGBDS GBZ80 DEC instruction
   */
  private executeDECD15(): number {
    const oldValue = this.registers.d;
    const result = (oldValue - 1) & 0xff;
    this.registers.d = result;

    // Set flags per RGBDS: Z if result is 0, N=1, H if borrow from bit 4, C unchanged
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(true); // N always 1 for DEC
    this.setHalfCarryFlag((oldValue & 0x0f) === 0x00); // H set if borrow from bit 4

    return 4;
  }

  /**
   * DEC E (0x1D) - Decrement E register
   * Hardware: 1 byte, 4 cycles, Z/N/H flags affected (C unchanged)
   * Reference: RGBDS GBZ80 DEC instruction
   */
  private executeDECE1D(): number {
    const oldValue = this.registers.e;
    const result = (oldValue - 1) & 0xff;
    this.registers.e = result;

    // Set flags per RGBDS: Z if result is 0, N=1, H if borrow from bit 4, C unchanged
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(true); // N always 1 for DEC
    this.setHalfCarryFlag((oldValue & 0x0f) === 0x00); // H set if borrow from bit 4

    return 4;
  }

  /**
   * DEC H (0x25) - Decrement H register
   * Hardware: 1 byte, 4 cycles, Z/N/H flags affected (C unchanged)
   * Reference: RGBDS GBZ80 DEC instruction
   */
  private executeDECH25(): number {
    const oldValue = this.registers.h;
    const result = (oldValue - 1) & 0xff;
    this.registers.h = result;

    // Set flags per RGBDS: Z if result is 0, N=1, H if borrow from bit 4, C unchanged
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(true); // N always 1 for DEC
    this.setHalfCarryFlag((oldValue & 0x0f) === 0x00); // H set if borrow from bit 4

    return 4;
  }

  /**
   * DEC L (0x2D) - Decrement L register
   * Hardware: 1 byte, 4 cycles, Z/N/H flags affected (C unchanged)
   * Reference: RGBDS GBZ80 DEC instruction
   */
  private executeDECL2D(): number {
    const oldValue = this.registers.l;
    const result = (oldValue - 1) & 0xff;
    this.registers.l = result;

    // Set flags per RGBDS: Z if result is 0, N=1, H if borrow from bit 4, C unchanged
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(true); // N always 1 for DEC
    this.setHalfCarryFlag((oldValue & 0x0f) === 0x00); // H set if borrow from bit 4

    return 4;
  }

  /**
   * DEC A (0x3D) - Decrement A register
   * Hardware: 1 byte, 4 cycles, Z/N/H flags affected (C unchanged)
   * Reference: RGBDS GBZ80 DEC instruction
   */
  private executeDECA3D(): number {
    const oldValue = this.registers.a;
    const result = (oldValue - 1) & 0xff;
    this.registers.a = result;

    // Set flags per RGBDS: Z if result is 0, N=1, H if borrow from bit 4, C unchanged
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(true); // N always 1 for DEC
    this.setHalfCarryFlag((oldValue & 0x0f) === 0x00); // H set if borrow from bit 4

    return 4;
  }

  /**
   * DEC (HL) (0x35) - Decrement memory value at HL address
   * Hardware: 1 byte, 12 cycles, Z/N/H flags affected (C unchanged)
   * Reference: RGBDS GBZ80 DEC instruction
   */
  private executeDECHL35(): number {
    const hlAddress = this.getHL();
    const oldValue = this.mmu.readByte(hlAddress);
    const result = (oldValue - 1) & 0xff;
    this.mmu.writeByte(hlAddress, result);

    // Set flags per RGBDS: Z if result is 0, N=1, H if borrow from bit 4, C unchanged
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(true); // N always 1 for DEC
    this.setHalfCarryFlag((oldValue & 0x0f) === 0x00); // H set if borrow from bit 4

    return 12;
  }

  /**
   * DEC BC (0x0B) - Decrement BC register pair
   * Hardware: 1 byte, 8 cycles, no flags affected
   * Reference: RGBDS GBZ80 DEC instruction
   */
  private executeDECBC0B(): number {
    const bc = this.getBC();
    const result = (bc - 1) & 0xffff;
    this.registers.b = (result >> 8) & 0xff;
    this.registers.c = result & 0xff;

    // No flags affected for 16-bit DEC per RGBDS specification
    return 8;
  }

  /**
   * DEC DE (0x1B) - Decrement DE register pair
   * Hardware: 1 byte, 8 cycles, no flags affected
   * Reference: RGBDS GBZ80 DEC instruction
   */
  private executeDECDE1B(): number {
    const de = this.getDE();
    const result = (de - 1) & 0xffff;
    this.registers.d = (result >> 8) & 0xff;
    this.registers.e = result & 0xff;

    // No flags affected for 16-bit DEC per RGBDS specification
    return 8;
  }

  /**
   * DEC HL (0x2B) - Decrement HL register pair
   * Hardware: 1 byte, 8 cycles, no flags affected
   * Reference: RGBDS GBZ80 DEC instruction
   */
  private executeDECHL2B(): number {
    const hl = this.getHL();
    const result = (hl - 1) & 0xffff;
    this.registers.h = (result >> 8) & 0xff;
    this.registers.l = result & 0xff;

    // No flags affected for 16-bit DEC per RGBDS specification
    return 8;
  }

  /**
   * DEC SP (0x3B) - Decrement SP register
   * Hardware: 1 byte, 8 cycles, no flags affected
   * Reference: RGBDS GBZ80 DEC instruction
   */
  private executeDECSP3B(): number {
    this.registers.sp = (this.registers.sp - 1) & 0xffff;

    // No flags affected for 16-bit DEC per RGBDS specification
    return 8;
  }

  // ===== PHASE 7: JR (JUMP RELATIVE) INSTRUCTION IMPLEMENTATIONS =====
  // Reference: RGBDS GBZ80 Reference - https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
  // Pattern: JR e8 and JR cc,e8 - Relative jumps using signed 8-bit offset
  // Hardware: 2 bytes, 12 cycles (unconditional) or 12/8 cycles (conditional)
  // No flags are affected by JR instructions per RGBDS specification

  /**
   * JR e8 (0x18) - Unconditional relative jump
   * Hardware: 2 bytes, 12 cycles, no flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - JR n16
   * Jump relative by signed 8-bit offset (-128 to +127)
   */
  private executeJRe8(): number {
    // Read signed 8-bit offset from PC
    const offsetByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Convert unsigned byte to signed 8-bit value (two's complement)
    const signedOffset = offsetByte > 127 ? offsetByte - 256 : offsetByte;

    // Calculate target address: PC + signed offset
    // PC has already been advanced by 2 (opcode + offset byte)
    const targetAddress = (this.registers.pc + signedOffset) & 0xffff;

    // Jump to target address
    this.registers.pc = targetAddress;

    // JR instructions do not affect any flags per RGBDS specification
    return 12; // Unconditional JR takes 12 cycles
  }

  /**
   * JR NZ,e8 (0x20) - Jump relative if not zero
   * Hardware: 2 bytes, 12 cycles if taken / 8 cycles if not taken, no flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - JR cc,n16
   * Jump relative by signed 8-bit offset if zero flag is clear
   */
  private executeJRNZe8(): number {
    // Read signed 8-bit offset from PC
    const offsetByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Check condition: jump if zero flag is NOT set
    if (!this.getZeroFlag()) {
      // Convert unsigned byte to signed 8-bit value (two's complement)
      const signedOffset = offsetByte > 127 ? offsetByte - 256 : offsetByte;

      // Calculate target address: PC + signed offset
      // PC has already been advanced by 2 (opcode + offset byte)
      const targetAddress = (this.registers.pc + signedOffset) & 0xffff;

      // Jump to target address
      this.registers.pc = targetAddress;

      // JR instructions do not affect any flags per RGBDS specification
      return 12; // Taken branch takes 12 cycles
    }

    // JR instructions do not affect any flags per RGBDS specification
    return 8; // Not taken branch takes 8 cycles
  }

  /**
   * JR Z,e8 (0x28) - Jump relative if zero
   * Hardware: 2 bytes, 12 cycles if taken / 8 cycles if not taken, no flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - JR cc,n16
   * Jump relative by signed 8-bit offset if zero flag is set
   */
  private executeJRZe8(): number {
    // Read signed 8-bit offset from PC
    const offsetByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Check condition: jump if zero flag is set
    if (this.getZeroFlag()) {
      // Convert unsigned byte to signed 8-bit value (two's complement)
      const signedOffset = offsetByte > 127 ? offsetByte - 256 : offsetByte;

      // Calculate target address: PC + signed offset
      // PC has already been advanced by 2 (opcode + offset byte)
      const targetAddress = (this.registers.pc + signedOffset) & 0xffff;

      // Jump to target address
      this.registers.pc = targetAddress;

      // JR instructions do not affect any flags per RGBDS specification
      return 12; // Taken branch takes 12 cycles
    }

    // JR instructions do not affect any flags per RGBDS specification
    return 8; // Not taken branch takes 8 cycles
  }

  /**
   * JR NC,e8 (0x30) - Jump relative if not carry
   * Hardware: 2 bytes, 12 cycles if taken / 8 cycles if not taken, no flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - JR cc,n16
   * Jump relative by signed 8-bit offset if carry flag is clear
   */
  private executeJRNCe8(): number {
    // Read signed 8-bit offset from PC
    const offsetByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Check condition: jump if carry flag is NOT set
    if (!this.getCarryFlag()) {
      // Convert unsigned byte to signed 8-bit value (two's complement)
      const signedOffset = offsetByte > 127 ? offsetByte - 256 : offsetByte;

      // Calculate target address: PC + signed offset
      // PC has already been advanced by 2 (opcode + offset byte)
      const targetAddress = (this.registers.pc + signedOffset) & 0xffff;

      // Jump to target address
      this.registers.pc = targetAddress;

      // JR instructions do not affect any flags per RGBDS specification
      return 12; // Taken branch takes 12 cycles
    }

    // JR instructions do not affect any flags per RGBDS specification
    return 8; // Not taken branch takes 8 cycles
  }

  /**
   * JR C,e8 (0x38) - Jump relative if carry
   * Hardware: 2 bytes, 12 cycles if taken / 8 cycles if not taken, no flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - JR cc,n16
   * Jump relative by signed 8-bit offset if carry flag is set
   */
  private executeJRCe8(): number {
    // Read signed 8-bit offset from PC
    const offsetByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Check condition: jump if carry flag is set
    if (this.getCarryFlag()) {
      // Convert unsigned byte to signed 8-bit value (two's complement)
      const signedOffset = offsetByte > 127 ? offsetByte - 256 : offsetByte;

      // Calculate target address: PC + signed offset
      // PC has already been advanced by 2 (opcode + offset byte)
      const targetAddress = (this.registers.pc + signedOffset) & 0xffff;

      // Jump to target address
      this.registers.pc = targetAddress;

      // JR instructions do not affect any flags per RGBDS specification
      return 12; // Taken branch takes 12 cycles
    }

    // JR instructions do not affect any flags per RGBDS specification
    return 8; // Not taken branch takes 8 cycles
  }

  // ===== PHASE 8: LOGICAL OPERATIONS FAMILY IMPLEMENTATIONS =====

  /**
   * AND A,B (0xA0) - Logical AND A register with B register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - AND A,r8
   *
   * Flag behavior per RGBDS:
   * - Z: Set if result is zero
   * - N: Reset (0)
   * - H: Set (1) - hardware quirk for AND operations
   * - C: Reset (0)
   */
  private executeANDABA0(): number {
    // Perform logical AND operation: A = A & B
    const result = this.registers.a & this.registers.b;

    // Store result in A register
    this.registers.a = result;

    // Set flags per RGBDS specification
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false); // N = 0 for AND
    this.setHalfCarryFlag(true); // H = 1 for AND (hardware quirk)
    this.setCarryFlag(false); // C = 0 for AND

    return 4; // Register AND operations take 4 cycles
  }

  /**
   * AND A,C (0xA1) - Logical AND A register with C register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - AND A,r8
   */
  private executeANDACA1(): number {
    const result = this.registers.a & this.registers.c;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    this.setCarryFlag(false);
    return 4;
  }

  /**
   * AND A,D (0xA2) - Logical AND A register with D register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - AND A,r8
   */
  private executeANDADA2(): number {
    const result = this.registers.a & this.registers.d;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    this.setCarryFlag(false);
    return 4;
  }

  /**
   * AND A,E (0xA3) - Logical AND A register with E register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - AND A,r8
   */
  private executeANDAEA3(): number {
    const result = this.registers.a & this.registers.e;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    this.setCarryFlag(false);
    return 4;
  }

  /**
   * AND A,H (0xA4) - Logical AND A register with H register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - AND A,r8
   */
  private executeANDAHA4(): number {
    const result = this.registers.a & this.registers.h;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    this.setCarryFlag(false);
    return 4;
  }

  /**
   * AND A,L (0xA5) - Logical AND A register with L register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - AND A,r8
   */
  private executeANDALA5(): number {
    const result = this.registers.a & this.registers.l;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    this.setCarryFlag(false);
    return 4;
  }

  /**
   * AND A,(HL) (0xA6) - Logical AND A register with memory at HL
   * Hardware: 1 byte, 8 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - AND A,(HL)
   */
  private executeANDAHLA6(): number {
    const address = (this.registers.h << 8) | this.registers.l;
    const value = this.mmu.readByte(address);
    const result = this.registers.a & value;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    this.setCarryFlag(false);
    return 8; // Memory operations take 8 cycles
  }

  /**
   * AND A,A (0xA7) - Logical AND A register with itself
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - AND A,r8
   */
  private executeANDAAA7(): number {
    const result = this.registers.a & this.registers.a;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    this.setCarryFlag(false);
    return 4;
  }

  /**
   * AND A,n8 (0xE6) - Logical AND A register with immediate value
   * Hardware: 2 bytes, 8 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - AND A,n8
   */
  private executeANDAn8E6(): number {
    const immediateValue = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const result = this.registers.a & immediateValue;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(true);
    this.setCarryFlag(false);
    return 8; // Immediate operations take 8 cycles
  }

  /**
   * OR A,B (0xB0) - Logical OR A register with B register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - OR A,r8
   *
   * Flag behavior per RGBDS:
   * - Z: Set if result is zero
   * - N: Reset (0)
   * - H: Reset (0)
   * - C: Reset (0)
   */
  private executeORABB0(): number {
    const result = this.registers.a | this.registers.b;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);
    return 4;
  }

  /**
   * OR A,C (0xB1) - Logical OR A register with C register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - OR A,r8
   */
  private executeORACB1(): number {
    const result = this.registers.a | this.registers.c;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);
    return 4;
  }

  /**
   * OR A,D (0xB2) - Logical OR A register with D register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - OR A,r8
   */
  private executeORADB2(): number {
    const result = this.registers.a | this.registers.d;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);
    return 4;
  }

  /**
   * OR A,E (0xB3) - Logical OR A register with E register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - OR A,r8
   */
  private executeORAEB3(): number {
    const result = this.registers.a | this.registers.e;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);
    return 4;
  }

  /**
   * OR A,H (0xB4) - Logical OR A register with H register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - OR A,r8
   */
  private executeORAHB4(): number {
    const result = this.registers.a | this.registers.h;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);
    return 4;
  }

  /**
   * OR A,L (0xB5) - Logical OR A register with L register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - OR A,r8
   */
  private executeORALB5(): number {
    const result = this.registers.a | this.registers.l;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);
    return 4;
  }

  /**
   * OR A,(HL) (0xB6) - Logical OR A register with memory at HL
   * Hardware: 1 byte, 8 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - OR A,(HL)
   */
  private executeORAHLB6(): number {
    const address = (this.registers.h << 8) | this.registers.l;
    const value = this.mmu.readByte(address);
    const result = this.registers.a | value;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);
    return 8;
  }

  /**
   * OR A,A (0xB7) - Logical OR A register with itself
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - OR A,r8
   */
  private executeORAAB7(): number {
    const result = this.registers.a | this.registers.a;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);
    return 4;
  }

  /**
   * OR A,n8 (0xF6) - Logical OR A register with immediate value
   * Hardware: 2 bytes, 8 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - OR A,n8
   */
  private executeORAn8F6(): number {
    const immediateValue = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const result = this.registers.a | immediateValue;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);
    return 8;
  }

  /**
   * XOR A,B (0xA8) - Logical XOR A register with B register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - XOR A,r8
   *
   * Flag behavior per RGBDS:
   * - Z: Set if result is zero
   * - N: Reset (0)
   * - H: Reset (0)
   * - C: Reset (0)
   */
  private executeXORABA8(): number {
    const result = this.registers.a ^ this.registers.b;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);
    return 4;
  }

  /**
   * XOR A,C (0xA9) - Logical XOR A register with C register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - XOR A,r8
   */
  private executeXORACA9(): number {
    const result = this.registers.a ^ this.registers.c;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);
    return 4;
  }

  /**
   * XOR A,D (0xAA) - Logical XOR A register with D register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - XOR A,r8
   */
  private executeXORADAA(): number {
    const result = this.registers.a ^ this.registers.d;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);
    return 4;
  }

  /**
   * XOR A,E (0xAB) - Logical XOR A register with E register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - XOR A,r8
   */
  private executeXORAEAB(): number {
    const result = this.registers.a ^ this.registers.e;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);
    return 4;
  }

  /**
   * XOR A,H (0xAC) - Logical XOR A register with H register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - XOR A,r8
   */
  private executeXORAHAC(): number {
    const result = this.registers.a ^ this.registers.h;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);
    return 4;
  }

  /**
   * XOR A,L (0xAD) - Logical XOR A register with L register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - XOR A,r8
   */
  private executeXORALAD(): number {
    const result = this.registers.a ^ this.registers.l;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);
    return 4;
  }

  /**
   * XOR A,(HL) (0xAE) - Logical XOR A register with memory at HL
   * Hardware: 1 byte, 8 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - XOR A,(HL)
   */
  private executeXORAHLAE(): number {
    const address = (this.registers.h << 8) | this.registers.l;
    const value = this.mmu.readByte(address);
    const result = this.registers.a ^ value;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);
    return 8;
  }

  /**
   * XOR A,A (0xAF) - Logical XOR A register with itself
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - XOR A,r8
   */
  private executeXORAAAAF(): number {
    const result = this.registers.a ^ this.registers.a;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);
    return 4;
  }

  /**
   * XOR A,n8 (0xEE) - Logical XOR A register with immediate value
   * Hardware: 2 bytes, 8 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - XOR A,n8
   */
  private executeXORAn8EE(): number {
    const immediateValue = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const result = this.registers.a ^ immediateValue;
    this.registers.a = result;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(false);
    return 8;
  }

  /**
   * CP A,B (0xB8) - Compare A register with B register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - CP A,r8
   *
   * Flag behavior per RGBDS:
   * - Z: Set if A == B (subtraction result is zero)
   * - N: Set (1) - always for CP operations
   * - H: Set if borrow from bit 4 (half-carry flag)
   * - C: Set if A < B (borrow from bit 8)
   * - A register is NOT modified (compare operation)
   */
  private executeCPABB8(): number {
    const value = this.registers.b;
    const result = this.registers.a - value;

    // Set flags based on subtraction but don't store result
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(true); // N = 1 for CP operations
    this.setHalfCarryFlag((this.registers.a & 0x0f) - (value & 0x0f) < 0); // Half-borrow
    this.setCarryFlag(this.registers.a < value); // Borrow

    // A register remains unchanged
    return 4;
  }

  /**
   * CP A,C (0xB9) - Compare A register with C register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - CP A,r8
   */
  private executeCPACB9(): number {
    const value = this.registers.c;
    const result = this.registers.a - value;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(true);
    this.setHalfCarryFlag((this.registers.a & 0x0f) - (value & 0x0f) < 0);
    this.setCarryFlag(this.registers.a < value);
    return 4;
  }

  /**
   * CP A,D (0xBA) - Compare A register with D register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - CP A,r8
   */
  private executeCPADBA(): number {
    const value = this.registers.d;
    const result = this.registers.a - value;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(true);
    this.setHalfCarryFlag((this.registers.a & 0x0f) - (value & 0x0f) < 0);
    this.setCarryFlag(this.registers.a < value);
    return 4;
  }

  /**
   * CP A,E (0xBB) - Compare A register with E register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - CP A,r8
   */
  private executeCPAEBB(): number {
    const value = this.registers.e;
    const result = this.registers.a - value;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(true);
    this.setHalfCarryFlag((this.registers.a & 0x0f) - (value & 0x0f) < 0);
    this.setCarryFlag(this.registers.a < value);
    return 4;
  }

  /**
   * CP A,H (0xBC) - Compare A register with H register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - CP A,r8
   */
  private executeCPAHBC(): number {
    const value = this.registers.h;
    const result = this.registers.a - value;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(true);
    this.setHalfCarryFlag((this.registers.a & 0x0f) - (value & 0x0f) < 0);
    this.setCarryFlag(this.registers.a < value);
    return 4;
  }

  /**
   * CP A,L (0xBD) - Compare A register with L register
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - CP A,r8
   */
  private executeCPALBD(): number {
    const value = this.registers.l;
    const result = this.registers.a - value;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(true);
    this.setHalfCarryFlag((this.registers.a & 0x0f) - (value & 0x0f) < 0);
    this.setCarryFlag(this.registers.a < value);
    return 4;
  }

  /**
   * CP A,(HL) (0xBE) - Compare A register with memory at HL
   * Hardware: 1 byte, 8 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - CP A,(HL)
   */
  private executeCPAHLBE(): number {
    const address = (this.registers.h << 8) | this.registers.l;
    const value = this.mmu.readByte(address);
    const result = this.registers.a - value;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(true);
    this.setHalfCarryFlag((this.registers.a & 0x0f) - (value & 0x0f) < 0);
    this.setCarryFlag(this.registers.a < value);
    return 8;
  }

  /**
   * CP A,A (0xBF) - Compare A register with itself
   * Hardware: 1 byte, 4 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - CP A,r8
   */
  private executeCPAABF(): number {
    const value = this.registers.a;
    const result = this.registers.a - value;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(true);
    this.setHalfCarryFlag((this.registers.a & 0x0f) - (value & 0x0f) < 0);
    this.setCarryFlag(this.registers.a < value);
    return 4;
  }

  /**
   * CP A,n8 (0xFE) - Compare A register with immediate value
   * Hardware: 2 bytes, 8 cycles, Z/N/H/C flags affected
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - CP A,n8
   */
  private executeCPAn8FE(): number {
    const value = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const result = this.registers.a - value;
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(true);
    this.setHalfCarryFlag((this.registers.a & 0x0f) - (value & 0x0f) < 0);
    this.setCarryFlag(this.registers.a < value);
    return 8;
  }

  // PHASE 9: CONTROL FLOW AND STACK MANAGEMENT INSTRUCTIONS

  /**
   * CALL nn (0xCD) - Unconditional call to 16-bit address
   * Hardware: 3 bytes, 24 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - CALL nn
   *
   * Operation:
   * 1. Read 16-bit address from PC+1,PC+2 (little-endian)
   * 2. Push return address (PC+3) to stack
   * 3. Jump to target address
   */
  private executeCALLnn(): number {
    // Read 16-bit target address (little-endian)
    const lowByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const highByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const targetAddress = (highByte << 8) | lowByte;

    // Calculate return address (current PC is already advanced past the operand)
    const returnAddress = this.registers.pc;

    // Push return address to stack (little-endian: high byte first, then low byte)
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, (returnAddress >> 8) & 0xff); // High byte
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, returnAddress & 0xff); // Low byte

    // Jump to target address
    this.registers.pc = targetAddress;

    return 24;
  }

  /**
   * CALL NZ,nn (0xC4) - Conditional call if not zero
   * Hardware: 3 bytes, 24/12 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - CALL cc,nn
   */
  private executeCALLNZnn(): number {
    // Read 16-bit target address (little-endian)
    const lowByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const highByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const targetAddress = (highByte << 8) | lowByte;

    // Check condition: NZ (not zero) - Z flag clear
    if ((this.registers.f & 0x80) === 0) {
      // Condition true: call taken
      const returnAddress = this.registers.pc;

      // Push return address to stack
      this.registers.sp = (this.registers.sp - 1) & 0xffff;
      this.mmu.writeByte(this.registers.sp, (returnAddress >> 8) & 0xff);
      this.registers.sp = (this.registers.sp - 1) & 0xffff;
      this.mmu.writeByte(this.registers.sp, returnAddress & 0xff);

      // Jump to target address
      this.registers.pc = targetAddress;

      return 24; // Call taken
    }

    // Condition false: call not taken, PC already advanced
    return 12; // Call not taken
  }

  /**
   * CALL Z,nn (0xCC) - Conditional call if zero
   * Hardware: 3 bytes, 24/12 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - CALL cc,nn
   */
  private executeCALLZnn(): number {
    // Read 16-bit target address (little-endian)
    const lowByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const highByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const targetAddress = (highByte << 8) | lowByte;

    // Check condition: Z (zero) - Z flag set
    if ((this.registers.f & 0x80) !== 0) {
      // Condition true: call taken
      const returnAddress = this.registers.pc;

      // Push return address to stack
      this.registers.sp = (this.registers.sp - 1) & 0xffff;
      this.mmu.writeByte(this.registers.sp, (returnAddress >> 8) & 0xff);
      this.registers.sp = (this.registers.sp - 1) & 0xffff;
      this.mmu.writeByte(this.registers.sp, returnAddress & 0xff);

      // Jump to target address
      this.registers.pc = targetAddress;

      return 24; // Call taken
    }

    // Condition false: call not taken
    return 12; // Call not taken
  }

  /**
   * CALL NC,nn (0xD4) - Conditional call if not carry
   * Hardware: 3 bytes, 24/12 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - CALL cc,nn
   */
  private executeCALLNCnn(): number {
    // Read 16-bit target address (little-endian)
    const lowByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const highByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const targetAddress = (highByte << 8) | lowByte;

    // Check condition: NC (not carry) - C flag clear
    if ((this.registers.f & 0x10) === 0) {
      // Condition true: call taken
      const returnAddress = this.registers.pc;

      // Push return address to stack
      this.registers.sp = (this.registers.sp - 1) & 0xffff;
      this.mmu.writeByte(this.registers.sp, (returnAddress >> 8) & 0xff);
      this.registers.sp = (this.registers.sp - 1) & 0xffff;
      this.mmu.writeByte(this.registers.sp, returnAddress & 0xff);

      // Jump to target address
      this.registers.pc = targetAddress;

      return 24; // Call taken
    }

    // Condition false: call not taken
    return 12; // Call not taken
  }

  /**
   * CALL C,nn (0xDC) - Conditional call if carry
   * Hardware: 3 bytes, 24/12 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - CALL cc,nn
   */
  private executeCALLCnn(): number {
    // Read 16-bit target address (little-endian)
    const lowByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const highByte = this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    const targetAddress = (highByte << 8) | lowByte;

    // Check condition: C (carry) - C flag set
    if ((this.registers.f & 0x10) !== 0) {
      // Condition true: call taken
      const returnAddress = this.registers.pc;

      // Push return address to stack
      this.registers.sp = (this.registers.sp - 1) & 0xffff;
      this.mmu.writeByte(this.registers.sp, (returnAddress >> 8) & 0xff);
      this.registers.sp = (this.registers.sp - 1) & 0xffff;
      this.mmu.writeByte(this.registers.sp, returnAddress & 0xff);

      // Jump to target address
      this.registers.pc = targetAddress;

      return 24; // Call taken
    }

    // Condition false: call not taken
    return 12; // Call not taken
  }

  /**
   * RET (0xC9) - Unconditional return from subroutine
   * Hardware: 1 byte, 16 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - RET
   *
   * Operation:
   * 1. Pop return address from stack (little-endian)
   * 2. Jump to return address
   */
  private executeRET(): number {
    // Pop return address from stack (little-endian: low byte first, then high byte)
    const lowByte = this.mmu.readByte(this.registers.sp);
    this.registers.sp = (this.registers.sp + 1) & 0xffff;
    const highByte = this.mmu.readByte(this.registers.sp);
    this.registers.sp = (this.registers.sp + 1) & 0xffff;

    // Reconstruct address and jump to it
    const returnAddress = (highByte << 8) | lowByte;
    this.registers.pc = returnAddress;

    return 16;
  }

  /**
   * RET NZ (0xC0) - Conditional return if not zero
   * Hardware: 1 byte, 20/8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - RET cc
   */
  private executeRETNZ(): number {
    // Check condition: NZ (not zero) - Z flag clear
    if ((this.registers.f & 0x80) === 0) {
      // Condition true: return taken
      const lowByte = this.mmu.readByte(this.registers.sp);
      this.registers.sp = (this.registers.sp + 1) & 0xffff;
      const highByte = this.mmu.readByte(this.registers.sp);
      this.registers.sp = (this.registers.sp + 1) & 0xffff;

      const returnAddress = (highByte << 8) | lowByte;
      this.registers.pc = returnAddress;

      return 20; // Return taken
    }

    // Condition false: return not taken
    return 8; // Return not taken
  }

  /**
   * RET Z (0xC8) - Conditional return if zero
   * Hardware: 1 byte, 20/8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - RET cc
   */
  private executeRETZ(): number {
    // Check condition: Z (zero) - Z flag set
    if ((this.registers.f & 0x80) !== 0) {
      // Condition true: return taken
      const lowByte = this.mmu.readByte(this.registers.sp);
      this.registers.sp = (this.registers.sp + 1) & 0xffff;
      const highByte = this.mmu.readByte(this.registers.sp);
      this.registers.sp = (this.registers.sp + 1) & 0xffff;

      const returnAddress = (highByte << 8) | lowByte;
      this.registers.pc = returnAddress;

      return 20; // Return taken
    }

    // Condition false: return not taken
    return 8; // Return not taken
  }

  /**
   * RET NC (0xD0) - Conditional return if not carry
   * Hardware: 1 byte, 20/8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - RET cc
   */
  private executeRETNC(): number {
    // Check condition: NC (not carry) - C flag clear
    if ((this.registers.f & 0x10) === 0) {
      // Condition true: return taken
      const lowByte = this.mmu.readByte(this.registers.sp);
      this.registers.sp = (this.registers.sp + 1) & 0xffff;
      const highByte = this.mmu.readByte(this.registers.sp);
      this.registers.sp = (this.registers.sp + 1) & 0xffff;

      const returnAddress = (highByte << 8) | lowByte;
      this.registers.pc = returnAddress;

      return 20; // Return taken
    }

    // Condition false: return not taken
    return 8; // Return not taken
  }

  /**
   * RET C (0xD8) - Conditional return if carry
   * Hardware: 1 byte, 20/8 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - RET cc
   */
  private executeRETC(): number {
    // Check condition: C (carry) - C flag set
    if ((this.registers.f & 0x10) !== 0) {
      // Condition true: return taken
      const lowByte = this.mmu.readByte(this.registers.sp);
      this.registers.sp = (this.registers.sp + 1) & 0xffff;
      const highByte = this.mmu.readByte(this.registers.sp);
      this.registers.sp = (this.registers.sp + 1) & 0xffff;

      const returnAddress = (highByte << 8) | lowByte;
      this.registers.pc = returnAddress;

      return 20; // Return taken
    }

    // Condition false: return not taken
    return 8; // Return not taken
  }

  /**
   * RETI (0xD9) - Return and enable interrupts
   * Hardware: 1 byte, 16 cycles, no flag changes (but sets IME)
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - RETI
   *
   * Operation:
   * 1. Pop return address from stack
   * 2. Jump to return address
   * 3. Enable interrupts (set IME flag)
   *
   * Note: IME (Interrupt Master Enable) flag handling will be implemented
   * when interrupt system is added. For now, behaves like RET.
   */
  private executeRETI(): number {
    // Pop return address from stack (same as RET)
    const lowByte = this.mmu.readByte(this.registers.sp);
    this.registers.sp = (this.registers.sp + 1) & 0xffff;
    const highByte = this.mmu.readByte(this.registers.sp);
    this.registers.sp = (this.registers.sp + 1) & 0xffff;

    const returnAddress = (highByte << 8) | lowByte;
    this.registers.pc = returnAddress;

    // TODO: Set IME flag when interrupt system is implemented
    // For now, this behaves identically to RET

    return 16;
  }

  /**
   * RST 00H (0xC7) - Call to fixed address 0x0000
   * Hardware: 1 byte, 16 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - RST vec
   */
  private executeRST00H(): number {
    // Calculate return address (PC is already incremented past opcode)
    const returnAddress = this.registers.pc;

    // Push return address to stack
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, (returnAddress >> 8) & 0xff);
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, returnAddress & 0xff);

    // Jump to fixed address 0x0000
    this.registers.pc = 0x0000;

    return 16;
  }

  /**
   * RST 08H (0xCF) - Call to fixed address 0x0008
   * Hardware: 1 byte, 16 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - RST vec
   */
  private executeRST08H(): number {
    const returnAddress = this.registers.pc;

    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, (returnAddress >> 8) & 0xff);
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, returnAddress & 0xff);

    this.registers.pc = 0x0008;

    return 16;
  }

  /**
   * RST 10H (0xD7) - Call to fixed address 0x0010
   * Hardware: 1 byte, 16 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - RST vec
   */
  private executeRST10H(): number {
    const returnAddress = this.registers.pc;

    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, (returnAddress >> 8) & 0xff);
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, returnAddress & 0xff);

    this.registers.pc = 0x0010;

    return 16;
  }

  /**
   * RST 18H (0xDF) - Call to fixed address 0x0018
   * Hardware: 1 byte, 16 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - RST vec
   */
  private executeRST18H(): number {
    const returnAddress = this.registers.pc;

    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, (returnAddress >> 8) & 0xff);
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, returnAddress & 0xff);

    this.registers.pc = 0x0018;

    return 16;
  }

  /**
   * RST 20H (0xE7) - Call to fixed address 0x0020
   * Hardware: 1 byte, 16 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - RST vec
   */
  private executeRST20H(): number {
    const returnAddress = this.registers.pc;

    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, (returnAddress >> 8) & 0xff);
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, returnAddress & 0xff);

    this.registers.pc = 0x0020;

    return 16;
  }

  /**
   * RST 28H (0xEF) - Call to fixed address 0x0028
   * Hardware: 1 byte, 16 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - RST vec
   */
  private executeRST28H(): number {
    const returnAddress = this.registers.pc;

    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, (returnAddress >> 8) & 0xff);
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, returnAddress & 0xff);

    this.registers.pc = 0x0028;

    return 16;
  }

  /**
   * RST 30H (0xF7) - Call to fixed address 0x0030
   * Hardware: 1 byte, 16 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - RST vec
   */
  private executeRST30H(): number {
    const returnAddress = this.registers.pc;

    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, (returnAddress >> 8) & 0xff);
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, returnAddress & 0xff);

    this.registers.pc = 0x0030;

    return 16;
  }

  /**
   * RST 38H (0xFF) - Call to fixed address 0x0038
   * Hardware: 1 byte, 16 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - RST vec
   */
  private executeRST38H(): number {
    const returnAddress = this.registers.pc;

    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, (returnAddress >> 8) & 0xff);
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, returnAddress & 0xff);

    this.registers.pc = 0x0038;

    return 16;
  }
  /**
   * PUSH BC (0xC5) - Push BC register pair onto stack
   * Hardware: 1 byte, 16 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - PUSH r16
   */
  private executePUSHBC(): number {
    // Push BC register pair to stack (B=high byte, C=low byte)
    // Stack push order: high byte to (SP-1), low byte to (SP-2)
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, this.registers.b); // High byte
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, this.registers.c); // Low byte

    return 16;
  }

  /**
   * PUSH DE (0xD5) - Push DE register pair onto stack
   * Hardware: 1 byte, 16 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - PUSH r16
   */
  private executePUSHDE(): number {
    // Push DE register pair to stack (D=high byte, E=low byte)
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, this.registers.d); // High byte
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, this.registers.e); // Low byte

    return 16;
  }

  /**
   * PUSH HL (0xE5) - Push HL register pair onto stack
   * Hardware: 1 byte, 16 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - PUSH r16
   */
  private executePUSHHL(): number {
    // Push HL register pair to stack (H=high byte, L=low byte)
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, this.registers.h); // High byte
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, this.registers.l); // Low byte

    return 16;
  }

  /**
   * PUSH AF (0xF5) - Push AF register pair onto stack
   * Hardware: 1 byte, 16 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - PUSH r16
   */
  private executePUSHAF(): number {
    // Push AF register pair to stack (A=high byte, F=low byte)
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, this.registers.a); // High byte
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.mmu.writeByte(this.registers.sp, this.registers.f); // Low byte (flags)

    return 16;
  }

  /**
   * POP BC (0xC1) - Pop BC register pair from stack
   * Hardware: 1 byte, 12 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - POP r16
   */
  private executePOPBC(): number {
    // Pop BC register pair from stack
    // Stack pop order: low byte from (SP), high byte from (SP+1)
    this.registers.c = this.mmu.readByte(this.registers.sp); // Low byte
    this.registers.sp = (this.registers.sp + 1) & 0xffff;
    this.registers.b = this.mmu.readByte(this.registers.sp); // High byte
    this.registers.sp = (this.registers.sp + 1) & 0xffff;

    return 12;
  }

  /**
   * POP DE (0xD1) - Pop DE register pair from stack
   * Hardware: 1 byte, 12 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - POP r16
   */
  private executePOPDE(): number {
    // Pop DE register pair from stack
    this.registers.e = this.mmu.readByte(this.registers.sp); // Low byte
    this.registers.sp = (this.registers.sp + 1) & 0xffff;
    this.registers.d = this.mmu.readByte(this.registers.sp); // High byte
    this.registers.sp = (this.registers.sp + 1) & 0xffff;

    return 12;
  }

  /**
   * POP HL (0xE1) - Pop HL register pair from stack
   * Hardware: 1 byte, 12 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - POP r16
   */
  private executePOPHL(): number {
    // Pop HL register pair from stack
    this.registers.l = this.mmu.readByte(this.registers.sp); // Low byte
    this.registers.sp = (this.registers.sp + 1) & 0xffff;
    this.registers.h = this.mmu.readByte(this.registers.sp); // High byte
    this.registers.sp = (this.registers.sp + 1) & 0xffff;

    return 12;
  }

  /**
   * POP AF (0xF1) - Pop AF register pair from stack
   * Hardware: 1 byte, 12 cycles, flags modified from stack
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 - POP r16
   *
   * Special case: F register (flags) only preserves upper nibble (valid flag bits)
   */
  private executePOPAF(): number {
    // Pop AF register pair from stack
    this.registers.f = this.mmu.readByte(this.registers.sp) & 0xf0; // Low byte (flags), mask to valid bits
    this.registers.sp = (this.registers.sp + 1) & 0xffff;
    this.registers.a = this.mmu.readByte(this.registers.sp); // High byte
    this.registers.sp = (this.registers.sp + 1) & 0xffff;

    return 12;
  }

  // ===== PHASE 10: MISCELLANEOUS OPERATIONS FAMILY IMPLEMENTATIONS =====
  // Generated following TDD principles and hardware accuracy
  // Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7

  /**
   * STOP (0x10) - Stop CPU and LCD
   * Hardware: 2 bytes, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   *
   * Special 2-byte instruction: STOP n8 (always 0x00)
   * Stops CPU and LCD until reset or external interrupt
   */
  private executeSTOP(): number {
    // STOP is a 2-byte instruction: 0x10 0x00
    // Read and discard the operand byte (always 0x00)
    this.mmu.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;

    // Stop CPU and LCD (simplified implementation)
    // In real hardware, this would stop the CPU and LCD until reset
    // For emulator purposes, we just consume the cycles

    return 4;
  }

  /**
   * DI (0xF3) - Disable Interrupts
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   *
   * Sets IME (Interrupt Master Enable) flag to 0
   */
  private executeDI(): number {
    // Disable interrupts immediately (RGBDS spec)
    this.ime = false;
    this.ime_pending_enable = false; // Cancel any pending EI

    return 4;
  }

  /**
   * EI (0xFB) - Enable Interrupts
   * Hardware: 1 byte, 4 cycles, no flag changes
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   *
   * Sets IME (Interrupt Master Enable) flag to 1
   */
  private executeEI(): number {
    // Enable interrupts with 1-instruction delay (RGBDS spec)
    this.ime_pending_enable = true;

    return 4;
  }

  /**
   * CPL (0x2F) - Complement Accumulator
   * Hardware: 1 byte, 4 cycles, sets N=1,H=1, Z and C unchanged
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   *
   * Complements accumulator: A = ~A
   */
  private executeCPL(): number {
    // Complement accumulator (flip all bits)
    this.registers.a = ~this.registers.a & 0xff;

    // Set N and H flags, leave Z and C unchanged per RGBDS specification
    this.setSubtractFlag(true); // N = 1
    this.setHalfCarryFlag(true); // H = 1
    // Z and C flags are unchanged

    return 4;
  }

  /**
   * SCF (0x37) - Set Carry Flag
   * Hardware: 1 byte, 4 cycles, sets C=1,N=0,H=0, Z unchanged
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeSCF(): number {
    // Set carry flag and clear N,H flags per RGBDS specification
    this.setCarryFlag(true); // C = 1
    this.setSubtractFlag(false); // N = 0
    this.setHalfCarryFlag(false); // H = 0
    // Z flag is unchanged

    return 4;
  }

  /**
   * CCF (0x3F) - Complement Carry Flag
   * Hardware: 1 byte, 4 cycles, sets C=!C,N=0,H=0, Z unchanged
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCCF(): number {
    // Complement carry flag and clear N,H flags per RGBDS specification
    this.setCarryFlag(!this.getCarryFlag()); // C = !C
    this.setSubtractFlag(false); // N = 0
    this.setHalfCarryFlag(false); // H = 0
    // Z flag is unchanged

    return 4;
  }

  /**
   * DAA (0x27) - Decimal Adjust Accumulator
   * Hardware: 1 byte, 4 cycles, affects Z,H,C flags (N unchanged)
   * RGBDS Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   *
   * Complex BCD (Binary Coded Decimal) adjustment algorithm
   * Adjusts A register after BCD arithmetic operations
   */
  private executeDAA(): number {
    // DAA - Decimal Adjust Accumulator for BCD arithmetic
    // Complex algorithm based on N flag (addition vs subtraction context)

    let a = this.registers.a;
    let carry = false;

    if (!this.getSubtractFlag()) {
      // After addition (N = 0)
      if (this.getCarryFlag() || a > 0x99) {
        a += 0x60;
        carry = true;
      }
      if (this.getHalfCarryFlag() || (a & 0x0f) > 0x09) {
        a += 0x06;
      }
    } else {
      // After subtraction (N = 1)
      if (this.getCarryFlag()) {
        a += 0xa0; // Equivalent to subtracting 0x60 with wrap
      }
      if (this.getHalfCarryFlag()) {
        a += 0xfa; // Equivalent to subtracting 0x06 with wrap
      }
    }

    // Update A register
    this.registers.a = a & 0xff;

    // Set flags per RGBDS specification
    this.setZeroFlag(this.registers.a === 0); // Z = 1 if result is 0
    this.setHalfCarryFlag(false); // H = 0 always after DAA
    this.setCarryFlag(carry || this.getCarryFlag()); // C = 1 if carry generated or was set
    // N flag is unchanged (preserves addition/subtraction context)

    return 4;
  }

  /**
   * RLCA (0x07) - Rotate A left circular
   * Rotates A register left by one bit position.
   * The bit that was shifted out of bit 7 becomes both the new bit 0 and the carry flag.
   *
   * RGBDS Specification:
   * - Operation: A = (A << 1) | (old_bit_7); carry = old_bit_7
   * - Cycles: 4, Bytes: 1
   * - Flags: Z=0, N=0, H=0, C=old_bit_7
   */
  private executeRLCA07(): number {
    const bit7 = (this.registers.a & 0x80) !== 0;

    this.registers.a = ((this.registers.a << 1) | (bit7 ? 1 : 0)) & 0xff;

    this.setZeroFlag(false); // NEVER set for rotation instructions per RGBDS
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(bit7);

    return 4;
  }

  /**
   * RRCA (0x0F) - Rotate A right circular
   * Rotates A register right by one bit position.
   * The bit that was shifted out of bit 0 becomes both the new bit 7 and the carry flag.
   *
   * RGBDS Specification:
   * - Operation: A = (A >> 1) | (old_bit_0 << 7); carry = old_bit_0
   * - Cycles: 4, Bytes: 1
   * - Flags: Z=0, N=0, H=0, C=old_bit_0
   */
  private executeRRCA0F(): number {
    const bit0 = (this.registers.a & 0x01) !== 0;

    this.registers.a = ((this.registers.a >> 1) | (bit0 ? 0x80 : 0)) & 0xff;

    this.setZeroFlag(false); // NEVER set for rotation instructions per RGBDS
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(bit0);

    return 4;
  }

  /**
   * RLA (0x17) - Rotate A left through carry
   * Rotates A register left by one bit position through the carry flag.
   * The old carry flag becomes bit 0, and bit 7 becomes the new carry flag.
   *
   * RGBDS Specification:
   * - Operation: A = (A << 1) | old_carry; carry = old_bit_7
   * - Cycles: 4, Bytes: 1
   * - Flags: Z=0, N=0, H=0, C=old_bit_7
   */
  private executeRLA17(): number {
    const oldCarry = this.getCarryFlag() ? 1 : 0;
    const newCarry = (this.registers.a & 0x80) !== 0;

    this.registers.a = ((this.registers.a << 1) | oldCarry) & 0xff;

    this.setZeroFlag(false); // NEVER set for rotation instructions per RGBDS
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(newCarry);

    return 4;
  }

  /**
   * RRA (0x1F) - Rotate A right through carry
   * Rotates A register right by one bit position through the carry flag.
   * The old carry flag becomes bit 7, and bit 0 becomes the new carry flag.
   *
   * RGBDS Specification:
   * - Operation: A = (A >> 1) | (old_carry << 7); carry = old_bit_0
   * - Cycles: 4, Bytes: 1
   * - Flags: Z=0, N=0, H=0, C=old_bit_0
   */
  private executeRRA1F(): number {
    const oldCarry = this.getCarryFlag() ? 0x80 : 0;
    const newCarry = (this.registers.a & 0x01) !== 0;

    this.registers.a = ((this.registers.a >> 1) | oldCarry) & 0xff;

    this.setZeroFlag(false); // NEVER set for rotation instructions per RGBDS
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(newCarry);

    return 4;
  }

  /**
   * SRL Helper - Shift Right Logical operation
   * Shifts value right by one bit, MSB becomes 0, LSB goes to carry
   *
   * RGBDS Specification:
   * - Operation: result = value >> 1 (MSB = 0)
   * - Flags: Z=result==0, N=0, H=0, C=old_bit_0
   */
  private executeSRL(value: number): number {
    const result = (value >> 1) & 0x7f; // Ensure MSB is 0
    const carry = (value & 0x01) !== 0;

    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(carry);

    return result;
  }

  /**
   * SRL B (0x38) - Shift Right Logical register B
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_SRLB_38(): number {
    this.registers.b = this.executeSRL(this.registers.b);
    return 8;
  }

  /**
   * SRL C (0x39) - Shift Right Logical register C
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_SRLC_39(): number {
    this.registers.c = this.executeSRL(this.registers.c);
    return 8;
  }

  /**
   * SRL D (0x3A) - Shift Right Logical register D
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_SRLD_3A(): number {
    this.registers.d = this.executeSRL(this.registers.d);
    return 8;
  }

  /**
   * SRL E (0x3B) - Shift Right Logical register E
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_SRLE_3B(): number {
    this.registers.e = this.executeSRL(this.registers.e);
    return 8;
  }

  /**
   * SRL H (0x3C) - Shift Right Logical register H
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_SRLH_3C(): number {
    this.registers.h = this.executeSRL(this.registers.h);
    return 8;
  }

  /**
   * SRL L (0x3D) - Shift Right Logical register L
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_SRLL_3D(): number {
    this.registers.l = this.executeSRL(this.registers.l);
    return 8;
  }

  /**
   * SRL (HL) (0x3E) - Shift Right Logical memory at HL
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_SRLHL_3E(): number {
    const hlAddress = this.getHL();
    const value = this.mmu.readByte(hlAddress);
    const result = this.executeSRL(value);
    this.mmu.writeByte(hlAddress, result);
    return 16; // Memory operations take 16 cycles
  }

  /**
   * SRL A (0x3F) - Shift Right Logical register A
   * Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_SRLA_3F(): number {
    this.registers.a = this.executeSRL(this.registers.a);
    return 8;
  }

  /**
   * RR C (CB 0x19) - Rotate C right through carry
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   *
   * Operation: C = (C >> 1) | (carry << 7); carry = old_bit_0
   * Flags: Z=result==0, N=0, H=0, C=old_bit_0
   * Cycles: 8
   */
  private executeCB_RRC_19(): number {
    const oldCarry = this.getCarryFlag() ? 0x80 : 0;
    const newCarry = (this.registers.c & 0x01) !== 0;
    this.registers.c = ((this.registers.c >> 1) | oldCarry) & 0xff;

    // Set flags according to RGBDS specification
    this.setZeroFlag(this.registers.c === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(newCarry);

    return 8; // 8 cycles per opcodes.json
  }

  private executeCB_RRC_1A(): number {
    const oldCarry = this.getCarryFlag() ? 0x80 : 0;
    const newCarry = (this.registers.d & 0x01) !== 0;
    this.registers.d = ((this.registers.d >> 1) | oldCarry) & 0xff;

    // Set flags according to RGBDS specification
    this.setZeroFlag(this.registers.d === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(newCarry);

    return 8; // 8 cycles per opcodes.json
  }

  /**
   * RR B (CB 0x18) - Rotate B Right through Carry
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   *
   * Operation: result = (B >> 1) | (carry << 7); carry = old_bit_0
   * Flags: Z=result==0, N=0, H=0, C=old_bit_0
   * Cycles: 8
   */
  private executeCB_RRB_18(): number {
    const oldCarry = this.getCarryFlag() ? 0x80 : 0;
    const newCarry = (this.registers.b & 0x01) !== 0;
    this.registers.b = ((this.registers.b >> 1) | oldCarry) & 0xff;

    // Set flags according to RGBDS specification
    this.setZeroFlag(this.registers.b === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(newCarry);

    return 8; // 8 cycles per opcodes.json
  }

  /**
   * RR E (CB 0x1B) - Rotate E Right through Carry
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   *
   * Operation: result = (E >> 1) | (carry << 7); carry = old_bit_0
   * Flags: Z=result==0, N=0, H=0, C=old_bit_0
   * Cycles: 8
   */
  private executeCB_RRE_1B(): number {
    const oldCarry = this.getCarryFlag() ? 0x80 : 0;
    const newCarry = (this.registers.e & 0x01) !== 0;
    this.registers.e = ((this.registers.e >> 1) | oldCarry) & 0xff;

    // Set flags according to RGBDS specification
    this.setZeroFlag(this.registers.e === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(newCarry);

    return 8; // 8 cycles per opcodes.json
  }

  /**
   * RR H (CB 0x1C) - Rotate H Right through Carry
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   *
   * Operation: result = (H >> 1) | (carry << 7); carry = old_bit_0
   * Flags: Z=result==0, N=0, H=0, C=old_bit_0
   * Cycles: 8
   */
  private executeCB_RRH_1C(): number {
    const oldCarry = this.getCarryFlag() ? 0x80 : 0;
    const newCarry = (this.registers.h & 0x01) !== 0;
    this.registers.h = ((this.registers.h >> 1) | oldCarry) & 0xff;

    // Set flags according to RGBDS specification
    this.setZeroFlag(this.registers.h === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(newCarry);

    return 8; // 8 cycles per opcodes.json
  }

  /**
   * RR L (CB 0x1D) - Rotate L Right through Carry
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   *
   * Operation: result = (L >> 1) | (carry << 7); carry = old_bit_0
   * Flags: Z=result==0, N=0, H=0, C=old_bit_0
   * Cycles: 8
   */
  private executeCB_RRL_1D(): number {
    const oldCarry = this.getCarryFlag() ? 0x80 : 0;
    const newCarry = (this.registers.l & 0x01) !== 0;
    this.registers.l = ((this.registers.l >> 1) | oldCarry) & 0xff;

    // Set flags according to RGBDS specification
    this.setZeroFlag(this.registers.l === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(newCarry);

    return 8; // 8 cycles per opcodes.json
  }

  /**
   * RR (HL) (CB 0x1E) - Rotate memory at HL Right through Carry
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   *
   * Operation: result = ((HL) >> 1) | (carry << 7); carry = old_bit_0
   * Flags: Z=result==0, N=0, H=0, C=old_bit_0
   * Cycles: 16
   */
  private executeCB_RRHL_1E(): number {
    const address = this.getHL();
    const value = this.mmu.readByte(address);
    const oldCarry = this.getCarryFlag() ? 0x80 : 0;
    const newCarry = (value & 0x01) !== 0;
    const result = ((value >> 1) | oldCarry) & 0xff;
    this.mmu.writeByte(address, result);

    // Set flags according to RGBDS specification
    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(newCarry);

    return 16; // 16 cycles for memory operations
  }

  /**
   * RR A (CB 0x1F) - Rotate A Right through Carry
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   *
   * Operation: result = (A >> 1) | (carry << 7); carry = old_bit_0
   * Flags: Z=result==0, N=0, H=0, C=old_bit_0
   * Cycles: 8
   */
  private executeCB_RRA_1F(): number {
    const oldCarry = this.getCarryFlag() ? 0x80 : 0;
    const newCarry = (this.registers.a & 0x01) !== 0;
    this.registers.a = ((this.registers.a >> 1) | oldCarry) & 0xff;

    // Set flags according to RGBDS specification
    this.setZeroFlag(this.registers.a === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(newCarry);

    return 8; // 8 cycles per opcodes.json
  }

  /**
   * RLC B (CB 0x00) - Rotate B Left Circular
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   *
   * Operation: result = (value << 1) | (value >> 7)
   * Flags: Z=result==0, N=0, H=0, C=old_bit_7
   * Cycles: 8
   */
  private executeCB_RLCB00(): number {
    const oldBit7 = (this.registers.b & 0x80) !== 0;
    this.registers.b = ((this.registers.b << 1) | (this.registers.b >> 7)) & 0xff;

    // Set flags according to RGBDS specification
    this.setZeroFlag(this.registers.b === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(oldBit7);

    return 8;
  }

  /**
   * RLC C (CB 0x01) - Rotate C Left Circular
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_RLCC01(): number {
    const oldBit7 = (this.registers.c & 0x80) !== 0;
    this.registers.c = ((this.registers.c << 1) | (this.registers.c >> 7)) & 0xff;

    this.setZeroFlag(this.registers.c === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(oldBit7);

    return 8;
  }

  /**
   * RLC D (CB 0x02) - Rotate D Left Circular
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_RLCD02(): number {
    const oldBit7 = (this.registers.d & 0x80) !== 0;
    this.registers.d = ((this.registers.d << 1) | (this.registers.d >> 7)) & 0xff;

    this.setZeroFlag(this.registers.d === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(oldBit7);

    return 8;
  }

  /**
   * RLC E (CB 0x03) - Rotate E Left Circular
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_RLCE03(): number {
    const oldBit7 = (this.registers.e & 0x80) !== 0;
    this.registers.e = ((this.registers.e << 1) | (this.registers.e >> 7)) & 0xff;

    this.setZeroFlag(this.registers.e === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(oldBit7);

    return 8;
  }

  /**
   * RLC H (CB 0x04) - Rotate H Left Circular
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_RLCH04(): number {
    const oldBit7 = (this.registers.h & 0x80) !== 0;
    this.registers.h = ((this.registers.h << 1) | (this.registers.h >> 7)) & 0xff;

    this.setZeroFlag(this.registers.h === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(oldBit7);

    return 8;
  }

  /**
   * RLC L (CB 0x05) - Rotate L Left Circular
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_RLCL05(): number {
    const oldBit7 = (this.registers.l & 0x80) !== 0;
    this.registers.l = ((this.registers.l << 1) | (this.registers.l >> 7)) & 0xff;

    this.setZeroFlag(this.registers.l === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(oldBit7);

    return 8;
  }

  /**
   * RLC (HL) (CB 0x06) - Rotate memory at HL Left Circular
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   * Cycles: 16 (memory operations take more cycles)
   */
  private executeCB_RLCHL06(): number {
    const hlAddress = (this.registers.h << 8) | this.registers.l;
    const value = this.mmu.readByte(hlAddress);
    const oldBit7 = (value & 0x80) !== 0;
    const result = ((value << 1) | (value >> 7)) & 0xff;

    this.mmu.writeByte(hlAddress, result);

    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(oldBit7);

    return 16;
  }

  /**
   * RLC A (CB 0x07) - Rotate A Left Circular
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_RLCA07(): number {
    const oldBit7 = (this.registers.a & 0x80) !== 0;
    this.registers.a = ((this.registers.a << 1) | (this.registers.a >> 7)) & 0xff;

    this.setZeroFlag(this.registers.a === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(oldBit7);

    return 8;
  }

  /**
   * RRC B (CB 0x08) - Rotate B Right Circular
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_RRCB08(): number {
    const oldBit0 = (this.registers.b & 0x01) !== 0;
    this.registers.b = ((this.registers.b >> 1) | (this.registers.b << 7)) & 0xff;

    // Set flags according to RGBDS specification
    this.setZeroFlag(this.registers.b === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(oldBit0);

    return 8;
  }

  /**
   * RRC C (CB 0x09) - Rotate C Right Circular
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_RRCC09(): number {
    const oldBit0 = (this.registers.c & 0x01) !== 0;
    this.registers.c = ((this.registers.c >> 1) | (this.registers.c << 7)) & 0xff;

    this.setZeroFlag(this.registers.c === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(oldBit0);

    return 8;
  }

  /**
   * RRC D (CB 0x0A) - Rotate D Right Circular
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_RRCD0A(): number {
    const oldBit0 = (this.registers.d & 0x01) !== 0;
    this.registers.d = ((this.registers.d >> 1) | (this.registers.d << 7)) & 0xff;

    this.setZeroFlag(this.registers.d === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(oldBit0);

    return 8;
  }

  /**
   * RRC E (CB 0x0B) - Rotate E Right Circular
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_RRCE0B(): number {
    const oldBit0 = (this.registers.e & 0x01) !== 0;
    this.registers.e = ((this.registers.e >> 1) | (this.registers.e << 7)) & 0xff;

    this.setZeroFlag(this.registers.e === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(oldBit0);

    return 8;
  }

  /**
   * RRC H (CB 0x0C) - Rotate H Right Circular
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_RRCH0C(): number {
    const oldBit0 = (this.registers.h & 0x01) !== 0;
    this.registers.h = ((this.registers.h >> 1) | (this.registers.h << 7)) & 0xff;

    this.setZeroFlag(this.registers.h === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(oldBit0);

    return 8;
  }

  /**
   * RRC L (CB 0x0D) - Rotate L Right Circular
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_RRCL0D(): number {
    const oldBit0 = (this.registers.l & 0x01) !== 0;
    this.registers.l = ((this.registers.l >> 1) | (this.registers.l << 7)) & 0xff;

    this.setZeroFlag(this.registers.l === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(oldBit0);

    return 8;
  }

  /**
   * RRC (HL) (CB 0x0E) - Rotate memory at HL Right Circular
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_RRCHL0E(): number {
    const address = (this.registers.h << 8) | this.registers.l;
    const value = this.mmu.readByte(address);
    const oldBit0 = (value & 0x01) !== 0;
    const result = ((value >> 1) | (value << 7)) & 0xff;

    this.mmu.writeByte(address, result);

    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(oldBit0);

    return 16; // Memory operations take 16 cycles
  }

  /**
   * RRC A (CB 0x0F) - Rotate A Right Circular
   * RGBDS Specification: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
   */
  private executeCB_RRCA0F(): number {
    const oldBit0 = (this.registers.a & 0x01) !== 0;
    this.registers.a = ((this.registers.a >> 1) | (this.registers.a << 7)) & 0xff;

    this.setZeroFlag(this.registers.a === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(oldBit0);

    return 8;
  }

  /**
   * Helper for RL instructions. Rotates a value left through the carry flag.
   * @param value The 8-bit value to rotate.
   * @returns The rotated 8-bit value.
   * @see https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#RL_r
   */
  private rotateLeftThroughCarry(value: number): number {
    const currentCarry = this.getCarryFlag() ? 1 : 0;
    const newCarry = (value & 0x80) !== 0; // Old bit 7 becomes the new carry

    const result = ((value << 1) | currentCarry) & 0xff;

    this.setZeroFlag(result === 0);
    this.setSubtractFlag(false);
    this.setHalfCarryFlag(false);
    this.setCarryFlag(newCarry);

    return result;
  }

  /**
   * RL B (CB 0x10) - Rotate B left through carry.
   * Operation: result = (B << 1) | currentCarryFlag
   * Flags: Z=Z, N=0, H=0, C=old_bit_7
   * Cycles: 8
   * @see https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#RL_r
   */
  private executeCB_RLB10(): number {
    this.registers.b = this.rotateLeftThroughCarry(this.registers.b);
    return 8;
  }

  /**
   * RL C (CB 0x11) - Rotate C left through carry.
   * Operation: result = (C << 1) | currentCarryFlag
   * Flags: Z=Z, N=0, H=0, C=old_bit_7
   * Cycles: 8
   * @see https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#RL_r
   */
  private executeCB_RLC11(): number {
    this.registers.c = this.rotateLeftThroughCarry(this.registers.c);
    return 8;
  }

  /**
   * RL D (CB 0x12) - Rotate D left through carry.
   * Operation: result = (D << 1) | currentCarryFlag
   * Flags: Z=Z, N=0, H=0, C=old_bit_7
   * Cycles: 8
   * @see https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#RL_r
   */
  private executeCB_RLD12(): number {
    this.registers.d = this.rotateLeftThroughCarry(this.registers.d);
    return 8;
  }

  /**
   * RL E (CB 0x13) - Rotate E left through carry.
   * Operation: result = (E << 1) | currentCarryFlag
   * Flags: Z=Z, N=0, H=0, C=old_bit_7
   * Cycles: 8
   * @see https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#RL_r
   */
  private executeCB_RLE13(): number {
    this.registers.e = this.rotateLeftThroughCarry(this.registers.e);
    return 8;
  }

  /**
   * RL H (CB 0x14) - Rotate H left through carry.
   * Operation: result = (H << 1) | currentCarryFlag
   * Flags: Z=Z, N=0, H=0, C=old_bit_7
   * Cycles: 8
   * @see https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#RL_r
   */
  private executeCB_RLH14(): number {
    this.registers.h = this.rotateLeftThroughCarry(this.registers.h);
    return 8;
  }

  /**
   * RL L (CB 0x15) - Rotate L left through carry.
   * Operation: result = (L << 1) | currentCarryFlag
   * Flags: Z=Z, N=0, H=0, C=old_bit_7
   * Cycles: 8
   * @see https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#RL_r
   */
  private executeCB_RLL15(): number {
    this.registers.l = this.rotateLeftThroughCarry(this.registers.l);
    return 8;
  }

  /**
   * RL (HL) (CB 0x16) - Rotate value at (HL) left through carry.
   * Operation: result = ((HL) << 1) | currentCarryFlag
   * Flags: Z=Z, N=0, H=0, C=old_bit_7
   * Cycles: 16
   * @see https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#RL__HL_
   */
  private executeCB_RLHL16(): number {
    const address = this.getHL();
    const value = this.mmu.readByte(address);
    const result = this.rotateLeftThroughCarry(value);
    this.mmu.writeByte(address, result);
    return 16;
  }

  /**
   * RL A (CB 0x17) - Rotate A left through carry.
   * Operation: result = (A << 1) | currentCarryFlag
   * Flags: Z=Z, N=0, H=0, C=old_bit_7
   * Cycles: 8
   * @see https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#RL_r
   */
  private executeCB_RLA17(): number {
    this.registers.a = this.rotateLeftThroughCarry(this.registers.a);
    return 8;
  }
}
