# Phase 11B: BIT Instructions TDD Strategy

**Test Engineer:** Comprehensive TDD strategy for implementing 52 missing BIT instructions

## Executive Summary

Phase 11B requires implementing 52 missing BIT instructions using proven TDD methodology. This strategy ensures systematic, hardware-accurate implementation with rigorous test coverage and proper RED-GREEN-REFACTOR workflow enforcement.

**Scope:** 52 missing BIT instructions across 7 bit groups (1-7)
**Current Status:** 12/64 BIT instructions implemented, pipeline green (413/413 tests)
**Primary Reference:** RGBDS GBZ80 documentation (https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7)

## 1. Current Infrastructure Analysis

### 1.1 Implemented BIT Instructions (12)
```
✅ BIT 0,B (0x40)    ✅ BIT 0,C (0x41)    ✅ BIT 0,D (0x42)    ✅ BIT 0,E (0x43)
✅ BIT 0,H (0x44)    ✅ BIT 0,L (0x45)    ✅ BIT 0,(HL) (0x46) ✅ BIT 0,A (0x47)
✅ BIT 1,B (0x48)    ❌ (7 missing)
✅ BIT 3,D (0x5A)    ❌ (7 missing)
✅ BIT 7,H (0x7C)    ✅ BIT 7,(HL) (0x7E) ❌ (6 missing)
```

### 1.2 Infrastructure Components
- **CPU Integration:** CB prefix switch cases exist but point to unimplemented methods
- **Generated Methods:** Available in `/src/emulator/cpu/generated/cbprefixed/bit.ts` (stubs)
- **Test Patterns:** No existing BIT instruction tests found (need to create from scratch)
- **Flag Helpers:** CPU has existing flag methods: `setZeroFlag()`, `setSubtractFlag()`, etc.

## 2. Missing Instructions by Group (52 Total)

### Group 1: BIT 1 Completion (7 missing)
```
❌ BIT 1,C (0x49)    ❌ BIT 1,D (0x4A)    ❌ BIT 1,E (0x4B)    ❌ BIT 1,H (0x4C)
❌ BIT 1,L (0x4D)    ❌ BIT 1,(HL) (0x4E) ❌ BIT 1,A (0x4F)
```

### Group 2: BIT 2 Complete (8 missing)
```
❌ BIT 2,B (0x50)    ❌ BIT 2,C (0x51)    ❌ BIT 2,D (0x52)    ❌ BIT 2,E (0x53)
❌ BIT 2,H (0x54)    ❌ BIT 2,L (0x55)    ❌ BIT 2,(HL) (0x56) ❌ BIT 2,A (0x57)
```

### Group 3: BIT 3 Completion (7 missing)
```
❌ BIT 3,B (0x58)    ❌ BIT 3,C (0x59)    ✅ BIT 3,D (0x5A)    ❌ BIT 3,E (0x5B)
❌ BIT 3,H (0x5C)    ❌ BIT 3,L (0x5D)    ❌ BIT 3,(HL) (0x5E) ❌ BIT 3,A (0x5F)
```

### Group 4: BIT 4 Complete (8 missing)
```
❌ BIT 4,B (0x60)    ❌ BIT 4,C (0x61)    ❌ BIT 4,D (0x62)    ❌ BIT 4,E (0x63)
❌ BIT 4,H (0x64)    ❌ BIT 4,L (0x65)    ❌ BIT 4,(HL) (0x66) ❌ BIT 4,A (0x67)
```

### Group 5: BIT 5 Complete (8 missing)
```
❌ BIT 5,B (0x68)    ❌ BIT 5,C (0x69)    ❌ BIT 5,D (0x6A)    ❌ BIT 5,E (0x6B)
❌ BIT 5,H (0x6C)    ❌ BIT 5,L (0x6D)    ❌ BIT 5,(HL) (0x6E) ❌ BIT 5,A (0x6F)
```

### Group 6: BIT 6 Complete (8 missing)
```
❌ BIT 6,B (0x70)    ❌ BIT 6,C (0x71)    ❌ BIT 6,D (0x72)    ❌ BIT 6,E (0x73)
❌ BIT 6,H (0x74)    ❌ BIT 6,L (0x75)    ❌ BIT 6,(HL) (0x76) ❌ BIT 6,A (0x77)
```

### Group 7: BIT 7 Completion (6 missing)
```
❌ BIT 7,B (0x78)    ❌ BIT 7,C (0x79)    ❌ BIT 7,D (0x7A)    ❌ BIT 7,E (0x7B)
✅ BIT 7,H (0x7C)    ❌ BIT 7,L (0x7D)    ✅ BIT 7,(HL) (0x7E) ❌ BIT 7,A (0x7F)
```

## 3. RGBDS Hardware Specification

### 3.1 BIT Instruction Behavior (MANDATORY REFERENCE)
**Source:** https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7

```
BIT u3,r8:  Test bit u3 (0-7) in register r8
BIT u3,[HL]: Test bit u3 (0-7) in memory at HL address

Cycles: 2 (register), 3 (memory)
Bytes: 2
Flags:
  Z (Zero): Set if the selected bit is 0
  N (Subtract): 0
  H (Half Carry): 1
  C (Carry): Not modified
```

### 3.2 Implementation Algorithm
```typescript
// Test bit pattern for BIT n,reg or BIT n,(HL)
const bitMask = 1 << bitNumber;  // Create mask: 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80
const bitSet = (value & bitMask) !== 0;

// Flag setting per RGBDS specification
this.setZeroFlag(!bitSet);        // Z = 1 if bit is 0, Z = 0 if bit is 1
this.setSubtractFlag(false);      // N = 0 always
this.setHalfCarryFlag(true);      // H = 1 always
// Carry flag unchanged
```

## 4. Test File Organization Strategy

### 4.1 Single Comprehensive Test File Approach
**File:** `/tests/emulator/cpu/CPU.bit-instructions.test.ts`

**Rationale:**
- All 64 BIT instructions follow identical patterns
- Centralized test organization for systematic coverage verification
- Easier to maintain consistent test patterns
- Clear separation from other instruction categories

### 4.2 Test Organization Structure
```typescript
describe('CPU BIT Instructions', () => {
  describe('BIT 0 Instructions (0x40-0x47)', () => {
    // Existing tests - reference patterns only
  });
  
  describe('BIT 1 Instructions (0x48-0x4F)', () => {
    // 7 missing tests + 1 existing (0x48)
  });
  
  describe('BIT 2 Instructions (0x50-0x57)', () => {
    // 8 missing tests
  });
  
  describe('BIT 3 Instructions (0x58-0x5F)', () => {
    // 7 missing tests + 1 existing (0x5A)
  });
  
  describe('BIT 4 Instructions (0x60-0x67)', () => {
    // 8 missing tests
  });
  
  describe('BIT 5 Instructions (0x68-0x6F)', () => {
    // 8 missing tests
  });
  
  describe('BIT 6 Instructions (0x70-0x77)', () => {
    // 8 missing tests
  });
  
  describe('BIT 7 Instructions (0x78-0x7F)', () => {
    // 6 missing tests + 2 existing (0x7C, 0x7E)
  });
});
```

## 5. Test Case Templates

### 5.1 Register BIT Instruction Template
```typescript
test('BIT {bit},{register} (0x{opcode}) should test bit {bit} with hardware-accurate flags', () => {
  // Setup: Register with bit {bit} SET (expect Z=0)
  cpu.setRegister{Register}(0x{valueWithBitSet});
  
  // Execute: BIT {bit},{register}
  cpu.setProgramCounter(0x8000);
  mmu.writeByte(0x8000, 0xcb);
  mmu.writeByte(0x8001, 0x{opcode});
  
  const cycles = cpu.executeInstruction();
  
  // Verify: 8 cycles for register BIT
  expect(cycles).toBe(8);
  
  // Verify flags: Z=0 (bit set), N=0, H=1, C=unchanged
  const flags = cpu.getRegisters().f;
  expect(flags & 0x80).toBe(0x00); // Z flag clear (bit is set)
  expect(flags & 0x40).toBe(0x00); // N flag clear
  expect(flags & 0x20).toBe(0x20); // H flag set
  // C flag verification depends on initial state
  
  // Test opposite case: bit CLEAR (expect Z=1)
  cpu.setRegister{Register}(0x{valueWithBitClear});
  
  const cycles2 = cpu.executeInstruction();
  expect(cycles2).toBe(8);
  
  const flags2 = cpu.getRegisters().f;
  expect(flags2 & 0x80).toBe(0x80); // Z flag set (bit is clear)
  expect(flags2 & 0x40).toBe(0x00); // N flag clear
  expect(flags2 & 0x20).toBe(0x20); // H flag set
});
```

### 5.2 Memory BIT Instruction Template
```typescript
test('BIT {bit},(HL) (0x{opcode}) should test bit {bit} in memory with hardware-accurate flags', () => {
  // Setup: HL points to memory location, memory has bit {bit} SET
  cpu.setRegisterH(0x81);
  cpu.setRegisterL(0x00); // HL = 0x8100
  mmu.writeByte(0x8100, 0x{valueWithBitSet});
  
  // Execute: BIT {bit},(HL)
  cpu.setProgramCounter(0x8000);
  mmu.writeByte(0x8000, 0xcb);
  mmu.writeByte(0x8001, 0x{opcode});
  
  const cycles = cpu.executeInstruction();
  
  // Verify: 12 cycles for memory BIT (3 cycles per RGBDS)
  expect(cycles).toBe(12);
  
  // Verify flags: Z=0 (bit set), N=0, H=1, C=unchanged
  const flags = cpu.getRegisters().f;
  expect(flags & 0x80).toBe(0x00); // Z flag clear
  expect(flags & 0x40).toBe(0x00); // N flag clear
  expect(flags & 0x20).toBe(0x20); // H flag set
  
  // Test opposite case: bit CLEAR
  mmu.writeByte(0x8100, 0x{valueWithBitClear});
  
  const cycles2 = cpu.executeInstruction();
  expect(cycles2).toBe(12);
  
  const flags2 = cpu.getRegisters().f;
  expect(flags2 & 0x80).toBe(0x80); // Z flag set (bit clear)
  expect(flags2 & 0x40).toBe(0x00); // N flag clear  
  expect(flags2 & 0x20).toBe(0x20); // H flag set
});
```

### 5.3 Bit Mask Calculation Reference
```
Bit 0: 0x01 (0000 0001) - Test values: SET=0x01,0x03,0xFF  CLEAR=0x00,0x02,0xFE
Bit 1: 0x02 (0000 0010) - Test values: SET=0x02,0x03,0xFF  CLEAR=0x00,0x01,0xFD
Bit 2: 0x04 (0000 0100) - Test values: SET=0x04,0x05,0xFF  CLEAR=0x00,0x01,0xFB
Bit 3: 0x08 (0000 1000) - Test values: SET=0x08,0x09,0xFF  CLEAR=0x00,0x01,0xF7
Bit 4: 0x10 (0001 0000) - Test values: SET=0x10,0x11,0xFF  CLEAR=0x00,0x01,0xEF
Bit 5: 0x20 (0010 0000) - Test values: SET=0x20,0x21,0xFF  CLEAR=0x00,0x01,0xDF
Bit 6: 0x40 (0100 0000) - Test values: SET=0x40,0x41,0xFF  CLEAR=0x00,0x01,0xBF
Bit 7: 0x80 (1000 0000) - Test values: SET=0x80,0x81,0xFF  CLEAR=0x00,0x01,0x7F
```

## 6. RED-GREEN-REFACTOR Workflow

### 6.1 Phase Structure
**Batch Size:** 8 instructions per cycle (one bit group at a time)
**Total Cycles:** 7 cycles to complete all 52 instructions

### 6.2 Systematic RED-GREEN-REFACTOR Process

#### RED Phase (Failing Tests First)
```bash
# Step 1: Create failing tests for BIT 1 group (7 instructions)
npm test -- CPU.bit-instructions.test.ts

# Expected: 7 failures with "instruction not yet implemented" errors
# Verify each test fails for the RIGHT reason (unimplemented method)
```

#### GREEN Phase (Minimal Implementation)
```bash
# Step 2: Copy and implement minimal BIT method bodies
# From: /src/emulator/cpu/generated/cbprefixed/bit.ts
# To: /src/emulator/cpu/CPU.ts (as private methods)

# Implementation pattern for each method:
private executeCB_BIT{bit}{register}{opcode}(): number {
  const value = this.registers.{register}; // or this.mmu.readByte(this.getHL())
  const bitSet = (value & 0x{mask}) !== 0;
  
  this.setZeroFlag(!bitSet);
  this.setSubtractFlag(false);
  this.setHalfCarryFlag(true);
  
  return {8|12}; // 8 for register, 12 for memory
}

npm test -- CPU.bit-instructions.test.ts
# Expected: All tests pass
```

#### REFACTOR Phase (Code Quality)
```bash
# Step 3: Review and refactor implementation quality
# - Consistent register access patterns
# - Proper bit mask calculations
# - Flag setting correctness
# - Code readability and documentation

npm run validate
# Expected: Green pipeline (linting, type checking, all tests)
```

### 6.3 Quality Gates
Each cycle must pass ALL quality gates before proceeding:

1. **Test Failure Verification:** Tests fail for expected reasons (unimplemented methods)
2. **Implementation Correctness:** Hardware-accurate behavior per RGBDS specification
3. **Flag Accuracy:** Exact Z, N, H, C flag behavior matches specification
4. **Cycle Timing:** Correct cycle counts (8 for register, 12 for memory)
5. **Pipeline Validation:** `npm run validate` passes completely
6. **Architecture Compliance:** Methods follow existing CPU patterns

### 6.4 Implementation Order
```
Priority Order (by complexity and dependency):
1. BIT 1 completion (0x49-0x4F) - 7 instructions
2. BIT 2 complete (0x50-0x57) - 8 instructions  
3. BIT 3 completion (0x58-0x5F excluding 0x5A) - 7 instructions
4. BIT 4 complete (0x60-0x67) - 8 instructions
5. BIT 5 complete (0x68-0x6F) - 8 instructions
6. BIT 6 complete (0x70-0x77) - 8 instructions
7. BIT 7 completion (0x78-0x7F excluding 0x7C,0x7E) - 6 instructions
```

## 7. Hardware Accuracy Validation

### 7.1 Flag Behavior Test Cases
Each BIT instruction MUST validate:

```typescript
// Test Case 1: Bit is SET (various patterns)
testValues: [0xFF, 0x{bitMask}, 0x{bitMask | 0x01}]
expectedFlags: { Z: false, N: false, H: true, C: 'unchanged' }

// Test Case 2: Bit is CLEAR (various patterns)  
testValues: [0x00, 0x{inverted_mask}, 0x{pattern_without_bit}]
expectedFlags: { Z: true, N: false, H: true, C: 'unchanged' }

// Test Case 3: Carry flag preservation
initialCarryStates: [true, false]
// Verify C flag unchanged regardless of bit test result
```

### 7.2 Cycle Timing Validation
```typescript
// Register BIT instructions: MUST take exactly 8 cycles
registerBitInstructions.forEach(opcode => {
  expect(cpu.executeInstruction()).toBe(8);
});

// Memory BIT instructions: MUST take exactly 12 cycles  
memoryBitInstructions.forEach(opcode => {
  expect(cpu.executeInstruction()).toBe(12);
});
```

### 7.3 Integration with Test ROMs
Future validation opportunity:
- Blargg CPU test ROM: `/tests/resources/blargg/cpu_instrs/source/10-bit ops.s`
- Mealybug hardware test ROMs (if applicable)

## 8. Quality Assurance Checklist

### 8.1 Systematic Coverage Verification
```
□ All 52 missing BIT instructions have failing tests
□ Each test validates both bit-set and bit-clear cases
□ Flag behavior matches RGBDS specification exactly
□ Cycle timing matches hardware specification
□ Carry flag preservation tested for all instructions
□ Memory BIT instructions test HL address access correctly
□ Register BIT instructions test all 8 registers (B,C,D,E,H,L,A) + memory
□ Test case patterns consistent across all bit numbers
```

### 8.2 TDD Workflow Compliance
```
□ RED: Tests written first and verified to fail correctly
□ GREEN: Minimal implementation makes tests pass
□ REFACTOR: Code quality improved while maintaining passing tests
□ Each cycle completes full RED-GREEN-REFACTOR before next batch
□ Pipeline validation passes at each refactor phase
□ No disabled tests without documented human approval
```

### 8.3 Architecture Integration
```
□ BIT methods follow existing CPU private method patterns
□ Switch case integration matches existing CB prefix infrastructure
□ Flag helper methods used consistently (setZeroFlag, etc.)
□ Register access follows this.registers.* pattern
□ Memory access uses this.mmu.readByte(this.getHL()) pattern
□ No separate executor classes created
```

## 9. Success Criteria

### 9.1 Completion Metrics
- **Test Coverage:** 52 new test cases covering all missing BIT instructions
- **Implementation:** 52 new private CPU methods following architectural patterns
- **Pipeline Status:** Green validation (413 + 52 = 465 total tests passing)
- **Hardware Accuracy:** All implementations verified against RGBDS specification

### 9.2 Quality Metrics
- **TDD Compliance:** 100% adherence to RED-GREEN-REFACTOR workflow
- **Flag Accuracy:** Exact Z, N, H, C flag behavior per RGBDS documentation
- **Cycle Timing:** Hardware-accurate cycle counts (8/12) for all instructions
- **Architecture Compliance:** Perfect integration with existing CPU infrastructure

### 9.3 Deliverables
1. **Test File:** `/tests/emulator/cpu/CPU.bit-instructions.test.ts` with 52 new tests
2. **Implementation:** 52 private CPU methods in `/src/emulator/cpu/CPU.ts`
3. **Integration:** CB prefix switch cases updated with method calls
4. **Documentation:** This TDD strategy document as reference
5. **Pipeline:** Green validation ready for Tech Lead review

## 10. Risk Mitigation

### 10.1 Technical Risks
- **Flag Calculation Errors:** Mitigated by RGBDS specification reference and systematic testing
- **Cycle Timing Mistakes:** Mitigated by clear 8/12 cycle requirements and validation
- **Integration Failures:** Mitigated by following proven existing BIT instruction patterns

### 10.2 Process Risks
- **TDD Workflow Violations:** Mitigated by strict Test Engineer oversight and quality gates
- **Batch Size Too Large:** Mitigated by 7-8 instruction batches with full validation cycles
- **Pipeline Failures:** Mitigated by `npm run validate` at each refactor phase

### 10.3 Quality Risks
- **Implementation Detail Testing:** Mitigated by testing only flag behavior and cycle timing
- **Missing Edge Cases:** Mitigated by systematic bit-set/bit-clear test patterns
- **Architecture Deviation:** Mitigated by following existing CPU method patterns exactly

---

**Test Engineer Approval:** This TDD strategy provides a systematic, rigorous approach to implementing all 52 missing BIT instructions while maintaining the highest standards of test quality and architectural integrity. The strategy ensures hardware accuracy through RGBDS specification compliance and systematic RED-GREEN-REFACTOR methodology.

**Next Steps:** Backend TypeScript Engineer should begin implementation using this strategy, starting with Group 1 (BIT 1 completion) and following the defined workflow precisely.