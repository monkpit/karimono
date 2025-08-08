# ADD Instruction Family Quality Checklist - Phase 3

## Overview

This checklist ensures hardware-accurate flag behavior and Game Boy compatibility for all 18 ADD/ADC instruction implementations. Each instruction must pass all quality gates before human review.

## Critical Flag Behavior Validation

### **Zero Flag (Z) Requirements**

#### **8-bit ADD/ADC Instructions**
- [ ] **Z=1** when 8-bit result equals 0x00
- [ ] **Z=0** when 8-bit result is non-zero  
- [ ] **Z calculation includes carry-in for ADC instructions**
- [ ] **Overflow cases handled:** 0xFF + 0x01 = 0x00, Z=1
- [ ] **Boundary cases verified:** 0x00 + 0x00 = 0x00, Z=1

**Test Pattern:**
```typescript
// Zero result test
cpu.setRegisterA(0xFF);
cpu.setRegisterH(0x01);
testEightBitADD(cpu, mmu, 0x84, 0x01, 0x00, { zero: true, ... });

// Non-zero result test  
cpu.setRegisterA(0x20);
cpu.setRegisterH(0x15);
testEightBitADD(cpu, mmu, 0x84, 0x15, 0x35, { zero: false, ... });
```

#### **16-bit ADD Instructions** 
- [ ] **Z flag completely unchanged** (not cleared, not set)
- [ ] **Z preservation verified with initial Z=true**
- [ ] **Z preservation verified with initial Z=false**
- [ ] **No accidental Z flag modification during 16-bit operations**

**Critical Test Pattern:**
```typescript
// Test Z flag preservation
cpu.setZeroFlag(true);
testSixteenBitADD(cpu, mmu, 0x09, 0x1000, 0x2000, 0x3000, { ... });
expect(cpu.getZeroFlag()).toBe(true); // MUST remain true

cpu.setZeroFlag(false);  
testSixteenBitADD(cpu, mmu, 0x09, 0x1000, 0x2000, 0x3000, { ... });
expect(cpu.getZeroFlag()).toBe(false); // MUST remain false
```

#### **Stack Pointer ADD Special Case**
- [ ] **Z=0 always for ADD SP,e8** (regardless of result)
- [ ] **No conditional Z flag setting for stack operations**

### **Subtract Flag (N) Requirements**

#### **All ADD/ADC Instructions**
- [ ] **N=0 always** for all ADD operations
- [ ] **N=0 always** for all ADC operations  
- [ ] **N unchanged for 16-bit ADD** (should remain 0)
- [ ] **N=0 for ADD SP,e8**
- [ ] **No accidental N flag setting during arithmetic**

**Test Pattern:**
```typescript
// Verify N=0 for all ADD variants
const addOpcodes = [0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0xC6];
addOpcodes.forEach(opcode => {
  cpu.reset();
  // Execute instruction...
  expect(cpu.getSubtractFlag()).toBe(false); // MUST be false
});
```

### **Half-Carry Flag (H) Requirements - CRITICAL**

#### **8-bit Operations**
- [ ] **H=1 when carry from bit 3 to bit 4**
- [ ] **Boundary case: 0x0F + 0x01 = H=1**
- [ ] **Boundary case: 0x0E + 0x01 = H=0**
- [ ] **ADC includes carry-in: (A & 0x0F) + (value & 0x0F) + carryIn > 0x0F**
- [ ] **Self-addition: 0x08 + 0x08 = H=1 (0x8 + 0x8 = 0x10 > 0xF)**

**Critical Test Cases:**
```typescript
// Half-carry boundary tests
const halfCarryTests = [
  { a: 0x0F, value: 0x01, expectedH: true },  // 0xF + 0x1 > 0xF
  { a: 0x0E, value: 0x01, expectedH: false }, // 0xE + 0x1 = 0xF (not > 0xF)
  { a: 0x08, value: 0x08, expectedH: true },  // 0x8 + 0x8 = 0x10 > 0xF
  { a: 0x07, value: 0x08, expectedH: false }, // 0x7 + 0x8 = 0xF (not > 0xF)
];

halfCarryTests.forEach(({ a, value, expectedH }) => {
  // Test with ADD
  const addFlags = calculateAddFlags(a, value);
  expect(addFlags.halfCarry).toBe(expectedH);
  
  // Test with ADC (carry=0, should match ADD)
  const adcFlags = calculateAddFlags(a, value, 0);
  expect(adcFlags.halfCarry).toBe(expectedH);
  
  // Test with ADC (carry=1, includes carry in calculation)
  const adcCarryFlags = calculateAddFlags(a, value, 1);
  expect(adcCarryFlags.halfCarry).toBe((a & 0x0f) + (value & 0x0f) + 1 > 0x0f);
});
```

#### **16-bit Operations**
- [ ] **H=1 when carry from bit 11 to bit 12** (NOT bit 3 to bit 4)
- [ ] **16-bit boundary: 0x0FFF + 0x0001 = H=1**
- [ ] **16-bit boundary: 0x0FFE + 0x0001 = H=0**
- [ ] **Calculation: (HL & 0x0FFF) + (value & 0x0FFF) > 0x0FFF**

**16-bit Half-Carry Tests:**
```typescript
const sixteenBitHalfCarryTests = [
  { hl: 0x0FFF, value: 0x0001, expectedH: true },  // Bit 11->12 carry
  { hl: 0x0FFE, value: 0x0001, expectedH: false }, // No bit 11->12 carry
  { hl: 0x1800, value: 0x0800, expectedH: true },  // 0x800 + 0x800 = 0x1000 > 0xFFF
];
```

### **Carry Flag (C) Requirements**

#### **8-bit Operations**
- [ ] **C=1 when result exceeds 0xFF (8-bit overflow)**
- [ ] **Boundary case: 0xFF + 0x01 = C=1**
- [ ] **Boundary case: 0xFE + 0x01 = C=0**
- [ ] **ADC includes carry-in: A + value + carryIn > 0xFF**
- [ ] **Self-addition overflow: 0x80 + 0x80 = 0x100, C=1**

#### **16-bit Operations**
- [ ] **C=1 when result exceeds 0xFFFF (16-bit overflow)**
- [ ] **16-bit boundary: 0xFFFF + 0x0001 = C=1**
- [ ] **16-bit boundary: 0xFFFE + 0x0001 = C=0**

#### **Stack Pointer Operations**
- [ ] **C calculated for signed arithmetic in ADD SP,e8**
- [ ] **Proper signed offset handling for carry detection**

### **ADC Carry-In Behavior - CRITICAL**

#### **Carry Propagation Validation**
- [ ] **ADC with C=0 behaves identically to ADD**
- [ ] **ADC with C=1 adds 1 to the sum**
- [ ] **Carry chain works: ADD sets C=1, ADC uses C=1, result correct**
- [ ] **Flag calculations include carry-in value in all computations**

**ADC Carry-In Test Matrix:**
```typescript
const adcCarryTests = [
  // A + value + carryIn = result, expectedFlags
  { a: 0x00, value: 0x00, carryIn: 0, result: 0x00, flags: { Z: true, C: false, H: false } },
  { a: 0x00, value: 0x00, carryIn: 1, result: 0x01, flags: { Z: false, C: false, H: false } },
  { a: 0xFF, value: 0x00, carryIn: 1, result: 0x00, flags: { Z: true, C: true, H: true } },
  { a: 0x7F, value: 0x7F, carryIn: 1, result: 0xFF, flags: { Z: false, C: false, H: false } },
  { a: 0x80, value: 0x80, carryIn: 0, result: 0x00, flags: { Z: true, C: true, H: false } },
];

adcCarryTests.forEach(({ a, value, carryIn, result, flags }) => {
  cpu.reset();
  cpu.setRegisterA(a);
  cpu.setRegisterB(value);
  cpu.setCarryFlag(carryIn === 1);
  
  testEightBitADC(cpu, mmu, 0x88, value, carryIn === 1, result, {
    zero: flags.Z,
    subtract: false,
    halfCarry: flags.H,
    carry: flags.C
  });
});
```

## Hardware Timing Validation

### **Cycle Count Accuracy**
- [ ] **Register ADD/ADC: 4 cycles** (0x80-0x87, 0x88-0x8F)
- [ ] **Memory ADD/ADC: 8 cycles** (0x86, 0x8E)  
- [ ] **Immediate ADD/ADC: 8 cycles** (0xC6, 0xCE)
- [ ] **16-bit ADD: 8 cycles** (0x09, 0x19, 0x29, 0x39)
- [ ] **Stack pointer ADD: 16 cycles** (0xE8)

**Timing Validation Test:**
```typescript
const timingValidation = [
  { opcode: 0x84, expectedCycles: 4, type: 'register ADD' },
  { opcode: 0x86, expectedCycles: 8, type: 'memory ADD' },
  { opcode: 0xC6, expectedCycles: 8, type: 'immediate ADD' },
  { opcode: 0x88, expectedCycles: 4, type: 'register ADC' },
  { opcode: 0x8E, expectedCycles: 8, type: 'memory ADC' },
  { opcode: 0x09, expectedCycles: 8, type: '16-bit ADD' },
  { opcode: 0xE8, expectedCycles: 16, type: 'stack ADD' },
];

timingValidation.forEach(({ opcode, expectedCycles, type }) => {
  cpu.reset();
  // Setup instruction...
  const actualCycles = cpu.step();
  expect(actualCycles).toBe(expectedCycles);
});
```

### **Program Counter Advancement**
- [ ] **Single byte instructions: PC + 1** (register operations)
- [ ] **Two byte instructions: PC + 2** (immediate operands)
- [ ] **Memory access instructions: PC + 1** (address in register pair)

## Memory Access Validation

### **Memory Operations**
- [ ] **ADD A,(HL) reads from correct HL address**
- [ ] **ADC A,(HL) reads from correct HL address**
- [ ] **HL address calculation: (H << 8) | L**
- [ ] **MMU read operations properly invoked**
- [ ] **Memory boundary access (0x0000, 0xFFFF) handled**

**Memory Access Test Pattern:**
```typescript
// Verify MMU interaction
const readSpy = jest.spyOn(mmu, 'readByte');
cpu.setRegisterH(0xC0);
cpu.setRegisterL(0x50);
mmu.writeByte(0xC050, 0x42);

// Execute ADD A,(HL)
cpu.step();

expect(readSpy).toHaveBeenCalledWith(0xC050);
expect(cpu.getRegisters().a).toBe(0x42); // Assuming A was 0x00
readSpy.mockRestore();
```

### **Immediate Operand Handling**
- [ ] **ADD A,n8 reads immediate byte correctly**
- [ ] **ADC A,n8 reads immediate byte correctly**
- [ ] **ADD SP,e8 reads signed immediate correctly**
- [ ] **Signed arithmetic conversion for ADD SP,e8**
- [ ] **Two's complement handling: 0x80-0xFF = -128 to -1**

## Register Isolation Validation

### **Register Modification Scope**
- [ ] **Only A and F registers modified for 8-bit ADD/ADC**
- [ ] **Only HL and F registers modified for 16-bit ADD HL,rr**
- [ ] **Only SP and F registers modified for ADD SP,e8**  
- [ ] **Source registers preserved (not modified)**
- [ ] **Unrelated registers completely unchanged**

**Register Isolation Test:**
```typescript
// Set all registers to known values
cpu.setRegisterA(0x10);
cpu.setRegisterB(0x20);
cpu.setRegisterC(0x30);
cpu.setRegisterD(0x40);
cpu.setRegisterE(0x50);
cpu.setRegisterH(0x60);
cpu.setRegisterL(0x70);

const initialState = cpu.getRegisters();

// Execute ADD A,B
cpu.step();

const finalState = cpu.getRegisters();

// Verify only A and F changed
expect(finalState.a).not.toBe(initialState.a); // A should change
expect(finalState.f).not.toBe(initialState.f); // F should change
expect(finalState.b).toBe(initialState.b);     // B should NOT change
expect(finalState.c).toBe(initialState.c);     // Other registers unchanged
expect(finalState.d).toBe(initialState.d);
expect(finalState.e).toBe(initialState.e);
expect(finalState.h).toBe(initialState.h);
expect(finalState.l).toBe(initialState.l);
```

## Edge Case and Boundary Testing

### **Arithmetic Boundary Cases**
- [ ] **Zero operands: 0x00 + 0x00 = 0x00**
- [ ] **Maximum values: 0xFF + 0xFF = 0x1FE**
- [ ] **Half-carry boundaries: 0x0F + 0x01, 0x08 + 0x08**
- [ ] **Carry boundaries: 0xFF + 0x01, 0x80 + 0x80**
- [ ] **Self-addition edge cases: 0x00 + 0x00, 0xFF + 0xFF**

### **16-bit Boundary Cases**
- [ ] **16-bit zero: 0x0000 + 0x0000 = 0x0000**
- [ ] **16-bit maximum: 0xFFFF + 0xFFFF = 0x1FFFE**
- [ ] **16-bit half-carry: 0x0FFF + 0x0001**
- [ ] **16-bit carry: 0xFFFF + 0x0001**
- [ ] **16-bit self-addition: HL + HL edge cases**

### **ADC Edge Cases**
- [ ] **ADC with maximum values and carry: 0xFF + 0xFF + 1**
- [ ] **ADC carry chain: multiple sequential ADC operations**
- [ ] **ADC zero result with carry: 0xFF + 0x00 + 1 = 0x00**

### **Signed Arithmetic (ADD SP,e8)**
- [ ] **Positive offsets: +1 to +127**
- [ ] **Negative offsets: -1 to -128 (0xFF to 0x80)**
- [ ] **Zero offset: +0 (no change)**
- [ ] **Maximum positive: +127 (0x7F)**
- [ ] **Maximum negative: -128 (0x80)**

## Integration Testing Requirements

### **Multi-Instruction Sequences**
- [ ] **LD + ADD sequence works correctly**
- [ ] **ADD + ADC chain preserves carry correctly**
- [ ] **16-bit LD + 16-bit ADD integration**
- [ ] **Mixed 8-bit and 16-bit operations**
- [ ] **Stack operations with ADD SP,e8**

### **Flag State Transitions**
- [ ] **Flag changes propagate correctly between instructions**
- [ ] **ADC reads carry flag from previous ADD**
- [ ] **16-bit ADD preserves Z flag from previous operations**
- [ ] **Complex flag interaction scenarios validated**

## Performance Requirements

### **Execution Performance**
- [ ] **Each instruction executes in < 1 millisecond**
- [ ] **No memory leaks in helper functions**
- [ ] **Efficient flag calculation (no unnecessary computations)**
- [ ] **Optimal register access patterns**

### **Test Performance**
- [ ] **Test suite runs in < 10 seconds total**
- [ ] **Individual test groups run in < 2 seconds**
- [ ] **No test timeouts or hangs**
- [ ] **Consistent performance across test runs**

## Code Quality Standards

### **Implementation Quality**
- [ ] **Clean, readable method names (executeADDAH84)**
- [ ] **Consistent code patterns across instructions**
- [ ] **Proper error handling (no uncaught exceptions)**
- [ ] **TypeScript strict mode compliance**
- [ ] **ESLint and Prettier compliance**

### **Test Quality**
- [ ] **Atomic tests (one behavior per test)**
- [ ] **Clear, descriptive test names**
- [ ] **No disabled tests without human approval**
- [ ] **No fake data or mocked implementations**
- [ ] **Comprehensive edge case coverage**

### **Documentation Quality**
- [ ] **RGBDS reference citations where applicable**
- [ ] **Clear comments explaining flag calculations**
- [ ] **Hardware behavior explanations**
- [ ] **Integration patterns documented**

## Final Validation Checklist

### **Before Human Review**
- [ ] **All 18 ADD/ADC instructions implemented**
- [ ] **100% test pass rate**
- [ ] **Architecture Reviewer approval**
- [ ] **Test Engineer approval**  
- [ ] **Tech Lead approval**
- [ ] **No pipeline failures (tests, lint, typecheck)**

### **Hardware Compatibility Validation**
- [ ] **Flag behavior matches existing ADD A,D/E references**
- [ ] **Timing matches opcodes.json specifications**
- [ ] **Integration with Phase 1/2 instructions verified**
- [ ] **Game Boy program compatibility validated**

### **Production Readiness**
- [ ] **Performance benchmarks met**
- [ ] **Memory usage within acceptable limits**
- [ ] **No regressions in existing functionality**
- [ ] **Complete documentation provided**
- [ ] **Maintainability standards met**

## Success Criteria Summary

### **Quantitative Metrics**
- ✅ **18/18 instructions implemented and tested**
- ✅ **100% test pass rate**
- ✅ **Sub-millisecond execution per instruction**
- ✅ **Hardware-accurate cycle timing**
- ✅ **Zero disabled tests**

### **Qualitative Metrics**
- ✅ **Flag calculations match RGBDS specification**
- ✅ **Game Boy program compatibility achieved**
- ✅ **Integration with existing CPU seamless**
- ✅ **Code maintainability and readability excellent**
- ✅ **Engineering standards fully met**

## Conclusion

This quality checklist ensures that all 18 ADD/ADC instruction implementations meet the highest standards for hardware accuracy, Game Boy compatibility, and code quality. The emphasis on flag behavior validation is critical for proper emulation of Game Boy programs that depend on precise arithmetic flag calculations.

Each instruction must pass all checklist items before proceeding to human review and integration into the main codebase.