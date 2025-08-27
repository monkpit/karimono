# ADD Instruction Family Implementation Workflow - Phase 3

## Overview

This document provides the specific TDD implementation workflow for the 18 remaining ADD/ADC instructions. It defines the exact RED-GREEN-REFACTOR process with detailed step-by-step implementation guidance.

## Pre-Implementation Setup

### **Files to Modify**
1. `/src/emulator/cpu/CPU.ts` - Add instruction implementations
2. `/tests/emulator/cpu/CPU.phase1.test.ts` - Add comprehensive tests
3. Validation against `/tests/resources/opcodes.json`

### **Reference Implementations to Study**
- ADD A,D (0x82) - Line 291 in CPU.ts, comprehensive test in CPU.phase1.test.ts
- ADD A,E (0x83) - Line 294 in CPU.ts, comprehensive test in CPU.phase1.test.ts
- ADD A,B (0x80) - Line 284 in CPU.ts, basic pattern
- ADD A,C (0x81) - Line 287 in CPU.ts, basic pattern

## Week 1: Core 8-bit ADD/ADC Implementation

### **Day 1-2: Complete 8-bit Register ADD Family**

#### **Step 1: RED Phase - ADD A,H (0x84)**

```typescript
// In CPU.phase1.test.ts - Add to existing "ADD A,register instructions" describe block
describe('ADD A,H (0x84) - Phase 3 Extension', () => {
  test('ADD A,H should add H register to A with overflow and flags', () => {
    // Setup: A = 0x3A, H = 0xC6 (matches ADD A,D reference pattern)
    cpu.setRegisterA(0x3a);
    cpu.setRegisterH(0xc6);
    cpu.setProgramCounter(0x8000);
    mmu.writeByte(0x8000, 0x84); // ADD A,H opcode

    // Execute instruction
    const cycles = cpu.step();

    // Verify result: 0x3A + 0xC6 = 0x100 (overflow to 0x00)
    expect(cpu.getRegisters().a).toBe(0x00);
    expect(cpu.getZeroFlag()).toBe(true); // Z = 1 (result is zero)
    expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
    expect(cpu.getHalfCarryFlag()).toBe(true); // H = 1 (carry from bit 3)
    expect(cpu.getCarryFlag()).toBe(true); // C = 1 (carry from bit 7)
    expect(cycles).toBe(4);
    expect(cpu.getPC()).toBe(0x8001);
  });

  test('ADD A,H should add H register to A without overflow', () => {
    // Setup: A = 0x20, H = 0x15 (matches ADD A,E reference pattern)
    cpu.setRegisterA(0x20);
    cpu.setRegisterH(0x15);
    cpu.setProgramCounter(0x8000);
    mmu.writeByte(0x8000, 0x84); // ADD A,H opcode

    // Execute instruction
    const cycles = cpu.step();

    // Verify result: 0x20 + 0x15 = 0x35
    expect(cpu.getRegisters().a).toBe(0x35);
    expect(cpu.getZeroFlag()).toBe(false); // Z = 0 (result not zero)
    expect(cpu.getSubtractFlag()).toBe(false); // N = 0 (addition)
    expect(cpu.getHalfCarryFlag()).toBe(false); // H = 0 (no carry from bit 3)
    expect(cpu.getCarryFlag()).toBe(false); // C = 0 (no carry from bit 7)
    expect(cycles).toBe(4);
    expect(cpu.getPC()).toBe(0x8001);
  });
});
```

**Run Test:** `npm test -- --testNamePatterns="ADD A,H"` - **SHOULD FAIL**

#### **Step 2: GREEN Phase - Minimal ADD A,H Implementation**

```typescript
// In CPU.ts - Add to executeInstruction switch statement (around line 295)
case 0x84: // ADD A,H - Add H to A
  return this.executeADDAH84();

// In CPU.ts - Add method implementation (after existing ADD methods)
private executeADDAH84(): number {
  const a = this.registers.a;
  const value = this.registers.h;
  const result = a + value;
  
  this.registers.a = result & 0xff;
  
  // Hardware-accurate flag calculations per RGBDS specification
  this.setZeroFlag((result & 0xff) === 0);
  this.setSubtractFlag(false); // Always 0 for ADD
  this.setHalfCarryFlag((a & 0x0f) + (value & 0x0f) > 0x0f);
  this.setCarryFlag(result > 0xff);

  return 4; // 4 cycles for register-to-register ADD
}
```

**Run Test:** `npm test -- --testNamePatterns="ADD A,H"` - **SHOULD PASS**

#### **Step 3: REFACTOR Phase - Optimize ADD Implementation**

```typescript
// Option 1: Extract common ADD logic (if not already present)
private executeADD(value: number): void {
  const a = this.registers.a;
  const result = a + value;
  
  this.registers.a = result & 0xff;
  
  this.setZeroFlag((result & 0xff) === 0);
  this.setSubtractFlag(false);
  this.setHalfCarryFlag((a & 0x0f) + (value & 0x0f) > 0x0f);
  this.setCarryFlag(result > 0xff);
}

private executeADDAH84(): number {
  this.executeADD(this.registers.h);
  return 4;
}
```

**Run All Tests:** `npm test` - **ALL TESTS SHOULD PASS**

#### **Step 4: Repeat Pattern for ADD A,L (0x85)**

Follow identical RED-GREEN-REFACTOR process:
1. Add comprehensive tests to CPU.phase1.test.ts
2. Add case 0x85 to switch statement
3. Implement executeADDAL85() method
4. Run tests and verify pass

### **Day 3: Memory and Self ADD Instructions**

#### **ADD A,(HL) Implementation (0x86)**

```typescript
// RED Phase - Test (8 cycles for memory access)
test('ADD A,(HL) should add memory value at HL to A', () => {
  // Setup: HL = 0xC000, memory[0xC000] = 0x42, A = 0x20
  cpu.setRegisterA(0x20);
  cpu.setRegisterH(0xc0);
  cpu.setRegisterL(0x00);
  mmu.writeByte(0xc000, 0x42);
  cpu.setProgramCounter(0x8000);
  mmu.writeByte(0x8000, 0x86); // ADD A,(HL) opcode

  const cycles = cpu.step();

  expect(cpu.getRegisters().a).toBe(0x62); // 0x20 + 0x42
  expect(cycles).toBe(8); // Memory access = 8 cycles
  expect(cpu.getPC()).toBe(0x8001);
});

// GREEN Phase - Implementation
case 0x86: // ADD A,(HL) - Add memory value at HL to A
  return this.executeADDAHL86();

private executeADDAHL86(): number {
  const hlAddress = this.getHL();
  const value = this.mmu.readByte(hlAddress);
  this.executeADD(value);
  return 8; // Memory access = 8 cycles
}
```

#### **ADD A,A Implementation (0x87)**

```typescript
// RED Phase - Test (self-addition)
test('ADD A,A should double A register value', () => {
  cpu.setRegisterA(0x40);
  cpu.setProgramCounter(0x8000);
  mmu.writeByte(0x8000, 0x87); // ADD A,A opcode

  const cycles = cpu.step();

  expect(cpu.getRegisters().a).toBe(0x80); // 0x40 + 0x40
  expect(cycles).toBe(4);
});

// GREEN Phase - Implementation
case 0x87: // ADD A,A - Add A to A (double A)
  return this.executeADDAA87();

private executeADDAA87(): number {
  this.executeADD(this.registers.a);
  return 4;
}
```

### **Day 4-5: Immediate ADD and ADC Pattern Setup**

#### **ADD A,n8 Implementation (0xC6)**

```typescript
// RED Phase - Test (immediate operand, 8 cycles)
test('ADD A,n8 should add immediate byte to A', () => {
  cpu.setRegisterA(0x30);
  cpu.setProgramCounter(0x8000);
  mmu.writeByte(0x8000, 0xc6); // ADD A,n8 opcode
  mmu.writeByte(0x8001, 0x25); // Immediate value

  const cycles = cpu.step();

  expect(cpu.getRegisters().a).toBe(0x55); // 0x30 + 0x25
  expect(cycles).toBe(8); // Immediate operand = 8 cycles
  expect(cpu.getPC()).toBe(0x8002); // PC advanced by 2 bytes
});

// GREEN Phase - Implementation
case 0xc6: // ADD A,n8 - Add immediate byte to A
  return this.executeADDAn8C6();

private executeADDAn8C6(): number {
  const immediate = this.mmu.readByte(this.registers.pc);
  this.registers.pc = (this.registers.pc + 1) & 0xffff;
  this.executeADD(immediate);
  return 8; // Immediate operand = 8 cycles
}
```

#### **ADC A,B Pattern Implementation (0x88)**

```typescript
// RED Phase - Test (ADC with carry-in)
test('ADC A,B should add B to A with carry flag', () => {
  cpu.setRegisterA(0x20);
  cpu.setRegisterB(0x15);
  cpu.setCarryFlag(true); // Incoming carry = 1
  cpu.setProgramCounter(0x8000);
  mmu.writeByte(0x8000, 0x88); // ADC A,B opcode

  const cycles = cpu.step();

  expect(cpu.getRegisters().a).toBe(0x36); // 0x20 + 0x15 + 1
  expect(cycles).toBe(4);
});

// GREEN Phase - Implementation
case 0x88: // ADC A,B - Add B to A with carry
  return this.executeADCAB88();

private executeADCAB88(): number {
  const carryIn = this.getCarryFlag() ? 1 : 0;
  this.executeADC(this.registers.b, carryIn);
  return 4;
}

// New ADC helper method
private executeADC(value: number, carryIn: number): void {
  const a = this.registers.a;
  const result = a + value + carryIn;
  
  this.registers.a = result & 0xff;
  
  this.setZeroFlag((result & 0xff) === 0);
  this.setSubtractFlag(false);
  this.setHalfCarryFlag((a & 0x0f) + (value & 0x0f) + carryIn > 0x0f);
  this.setCarryFlag(result > 0xff);
}
```

## Week 2: Complete ADC Family and 16-bit ADD

### **Day 1-2: Complete ADC Register Variants**

Follow ADC A,B pattern for remaining ADC instructions:
- ADC A,C (0x89) - `this.executeADC(this.registers.c, carryIn)`
- ADC A,D (0x8A) - `this.executeADC(this.registers.d, carryIn)`
- ADC A,E (0x8B) - `this.executeADC(this.registers.e, carryIn)`
- ADC A,H (0x8C) - `this.executeADC(this.registers.h, carryIn)`
- ADC A,L (0x8D) - `this.executeADC(this.registers.l, carryIn)`
- ADC A,(HL) (0x8E) - Memory access, 8 cycles
- ADC A,A (0x8F) - Self-addition with carry
- ADC A,n8 (0xCE) - Immediate operand, 8 cycles

### **Day 3-5: 16-bit ADD Operations**

#### **ADD HL,BC Pattern Implementation (0x09)**

```typescript
// RED Phase - Test (16-bit addition, Z flag unchanged)
test('ADD HL,BC should add BC register pair to HL', () => {
  // Setup: HL = 0x1000, BC = 0x2000, result = 0x3000
  cpu.setRegisterH(0x10);
  cpu.setRegisterL(0x00);
  cpu.setRegisterB(0x20);
  cpu.setRegisterC(0x00);
  cpu.setProgramCounter(0x8000);
  mmu.writeByte(0x8000, 0x09); // ADD HL,BC opcode

  const initialZ = cpu.getZeroFlag(); // Store initial Z flag
  const cycles = cpu.step();

  expect(cpu.getRegisters().h).toBe(0x30); // High byte of 0x3000
  expect(cpu.getRegisters().l).toBe(0x00); // Low byte of 0x3000
  expect(cpu.getZeroFlag()).toBe(initialZ); // Z flag unchanged!
  expect(cpu.getSubtractFlag()).toBe(false); // N = 0
  expect(cycles).toBe(8);
});

// GREEN Phase - Implementation
case 0x09: // ADD HL,BC - Add BC to HL
  return this.executeADDHLBC09();

private executeADDHLBC09(): number {
  const hl = this.getHL();
  const bc = this.getBC();
  this.executeADD16(bc);
  return 8;
}

// 16-bit ADD helper (Z flag unchanged!)
private executeADD16(value: number): void {
  const hl = this.getHL();
  const result = hl + value;
  
  this.setHL(result & 0xffff);
  
  // Z flag unchanged for 16-bit ADD
  this.setSubtractFlag(false);
  this.setHalfCarryFlag((hl & 0x0fff) + (value & 0x0fff) > 0x0fff); // Bit 11->12
  this.setCarryFlag(result > 0xffff);
}

// Helper methods for register pairs
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
```

Follow pattern for remaining 16-bit ADD instructions:
- ADD HL,DE (0x19) - `this.executeADD16(this.getDE())`
- ADD HL,HL (0x29) - `this.executeADD16(this.getHL())` (double HL)
- ADD HL,SP (0x39) - `this.executeADD16(this.registers.sp)`

## Week 3: Special Operations and Integration

### **Day 1: ADD SP,e8 Implementation (0xE8)**

```typescript
// RED Phase - Test (signed arithmetic, special flags)
test('ADD SP,e8 should add signed offset to stack pointer', () => {
  cpu.setStackPointer(0x1000);
  cpu.setProgramCounter(0x8000);
  mmu.writeByte(0x8000, 0xe8); // ADD SP,e8 opcode
  mmu.writeByte(0x8001, 0x10); // Positive offset +16

  const cycles = cpu.step();

  expect(cpu.getRegisters().sp).toBe(0x1010);
  expect(cpu.getZeroFlag()).toBe(false); // Z=0 always
  expect(cpu.getSubtractFlag()).toBe(false); // N=0 always
  expect(cycles).toBe(16);
  expect(cpu.getPC()).toBe(0x8002);
});

// GREEN Phase - Implementation
case 0xe8: // ADD SP,e8 - Add signed immediate to SP
  return this.executeADDSPe8E8();

private executeADDSPe8E8(): number {
  const offset = this.mmu.readByte(this.registers.pc);
  this.registers.pc = (this.registers.pc + 1) & 0xffff;
  
  // Convert to signed 8-bit value
  const signedOffset = offset > 127 ? offset - 256 : offset;
  const result = this.registers.sp + signedOffset;
  
  this.registers.sp = result & 0xffff;
  
  // Special flag behavior for ADD SP,e8
  this.setZeroFlag(false); // Z=0 always
  this.setSubtractFlag(false); // N=0 always
  // TODO: Implement H and C flag calculations for signed arithmetic
  
  return 16;
}
```

## Continuous Validation Process

### **After Each Implementation**

1. **Run Individual Test:** `npm test -- --testNamePatterns="ADD A,H"`
2. **Run All Tests:** `npm test`
3. **Run Type Check:** `npm run typecheck`
4. **Run Linter:** `npm run lint`
5. **Validate Integration:** Test with existing Phase 1/2 instructions

### **Weekly Validation**

1. **Performance Test:** All ADD/ADC instructions < 1ms execution
2. **Flag Accuracy Test:** Compare with reference ADD A,D/E implementations
3. **Hardware Timing Test:** Validate cycle counts match opcodes.json
4. **Integration Test:** Multi-instruction sequences work correctly

## Quality Gates

### **Before Human Review**

1. ✅ **All tests pass** - Green pipeline required
2. ✅ **Architecture Reviewer approval** - Encapsulation compliance
3. ✅ **Test Engineer approval** - TDD methodology and flag accuracy
4. ✅ **Tech Lead approval** - Engineering standards compliance

### **Implementation Checklist Per Instruction**

- [ ] Test written first (RED phase)
- [ ] Test fails initially
- [ ] Minimal implementation added (GREEN phase)
- [ ] Test passes
- [ ] Refactoring performed while tests pass (REFACTOR phase)
- [ ] Integration test with existing instructions
- [ ] Hardware timing validation
- [ ] Flag behavior validation against reference patterns
- [ ] Boundary value testing completed
- [ ] Code review approval obtained

## Success Metrics

### **Technical Metrics**

- **18/18 ADD/ADC instructions implemented and tested**
- **100% test pass rate with TDD methodology**
- **Sub-millisecond execution performance per instruction**
- **Hardware-accurate cycle timing (4, 8, 16 cycles as specified)**
- **Flag calculations match RGBDS GBZ80 reference specification**

### **Quality Metrics**

- **No disabled tests without human approval**
- **No fake data in test implementations**
- **Test atomicity - each test validates exactly one behavior**
- **Proper encapsulation boundaries maintained**
- **Integration with existing CPU functionality verified**

### **Final Validation**

- **Mealybug test ROM compatibility** (if applicable)
- **Blargg test ROM compatibility** (if applicable)
- **Game Boy program compatibility through accurate arithmetic**
- **Performance benchmarks meet requirements**
- **Code maintainability and readability standards met**

## Conclusion

This implementation workflow provides a systematic, test-driven approach to implementing all 18 remaining ADD/ADC instructions. The emphasis on hardware-accurate flag behavior and integration testing ensures Game Boy compatibility while maintaining the project's strict engineering standards.

Following this workflow will result in a complete, tested, and production-ready ADD instruction family that seamlessly integrates with existing CPU functionality.
