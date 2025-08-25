# Phase 2: LD Instruction Family TDD Testing Strategy

## Overview

This document provides a comprehensive Test-Driven Development (TDD) strategy for implementing all 88 LD (Load) instruction variants in the SM83 CPU emulator. The strategy follows strict TDD principles: write failing tests first, implement minimal code to pass, then refactor with passing tests.

## Strategic Analysis

### LD Instruction Complexity Groups

Based on analysis of opcodes.json, the 88 LD instructions can be grouped by complexity:

#### Group 1: Register-to-Register (56 instructions) - **LOWEST COMPLEXITY**
- **4-cycle instructions**: 0x40-0x7F (excluding 0x76 HALT)
- Pattern: `LD r,r` (register to register direct copy)
- Examples: `LD B,C (0x41)`, `LD A,H (0x7C)`, `LD D,E (0x53)`
- **No memory access, no flag changes, simple register assignment**

#### Group 2: Immediate to Register (8 instructions) - **LOW COMPLEXITY**
- **8-cycle instructions**: 0x06, 0x0E, 0x16, 0x1E, 0x26, 0x2E, 0x3E
- Pattern: `LD r,n8` (8-bit immediate to register)
- Examples: `LD B,n8 (0x06)`, `LD A,n8 (0x3E)`
- **Memory read for immediate, no flag changes**

#### Group 3: Memory via Register Pairs (8 instructions) - **MEDIUM COMPLEXITY**
- **8-cycle instructions**: 0x02, 0x0A, 0x12, 0x1A, 0x70-0x75, 0x77-0x7E
- Pattern: `LD (rr),r` and `LD r,(rr)` (memory access via register pairs)
- Examples: `LD (BC),A (0x02)`, `LD A,(DE) (0x1A)`, `LD (HL),B (0x70)`
- **MMU interaction required, address calculation**

#### Group 4: Advanced Memory Operations (12 instructions) - **MEDIUM-HIGH COMPLEXITY**
- **8-12 cycle instructions**: 0x22, 0x2A, 0x32, 0x3A, 0x36, 0x46, 0x4E, 0x56, 0x5E, 0x66, 0x6E, 0x7E
- Includes increment/decrement variants and (HL) access
- Examples: `LD (HL+),A (0x22)`, `LD A,(HL-) (0x3A)`, `LD B,(HL) (0x46)`
- **MMU interaction + register modification**

#### Group 5: 16-bit and Special Operations (4 instructions) - **HIGHEST COMPLEXITY**
- **12-20 cycle instructions**: 0x01, 0x08, 0x11, 0x21, 0x31, 0xEA, 0xF8, 0xF9, 0xFA
- Pattern: 16-bit loads, SP operations, direct memory addressing
- Examples: `LD BC,n16 (0x01)`, `LD (a16),SP (0x08)`, `LD HL,SP+e8 (0xF8)`
- **Complex addressing, 16-bit operations, only LD HL,SP+e8 affects flags**

## Test File Structure

### Recommended Organization: Single Comprehensive File

**Decision: Use single test file `CPU.ld-instructions.test.ts`**

**Rationale:**
1. **TDD Efficiency**: Single file allows rapid RED-GREEN-REFACTOR cycles
2. **Pattern Recognition**: Similar instructions grouped together show clear patterns
3. **Helper Function Reuse**: Common test utilities available throughout
4. **Integration Testing**: Easy to combine different LD variants in complex scenarios
5. **Existing Pattern**: Follows project's pattern of focused test files

### Test File Structure

```typescript
// tests/emulator/cpu/CPU.ld-instructions.test.ts

/**
 * SM83 CPU LD Instructions Test Suite - Phase 2 Implementation
 *
 * Tests all 88 LD instruction variants following strict TDD principles.
 * Organized by complexity groups for efficient implementation workflow.
 *
 * TDD Workflow: RED (failing test) -> GREEN (minimal implementation) -> REFACTOR
 *
 * Hardware References:
 * - RGBDS GBZ80 Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
 * - Opcodes JSON: /tests/resources/opcodes.json
 * - Blargg Test ROMs: /tests/resources/blargg
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { CPU } from '../../../src/emulator/cpu/CPU';
import { MMU } from '../../../src/emulator/mmu/MMU';

describe('SM83 CPU LD Instructions - Phase 2', () => {
    let cpu: CPU;
    let mmu: MMU;

    beforeEach(() => {
        mmu = new MMU();
        cpu = new CPU(mmu);
        cpu.reset();
    });

    // Group 1: Register-to-Register LD Instructions (56 instructions)
    describe('Group 1: Register-to-Register LD Instructions (4 cycles)', () => {
        // Implementation order: Start with simple patterns, build complexity
    });

    // Group 2: Immediate to Register LD Instructions (8 instructions)
    describe('Group 2: Immediate to Register LD Instructions (8 cycles)', () => {
        // Build on existing LD B,n8 and LD C,n8 patterns
    });

    // Group 3: Memory via Register Pairs (8 instructions)
    describe('Group 3: Memory via Register Pairs (8 cycles)', () => {
        // Requires MMU integration
    });

    // Group 4: Advanced Memory Operations (12 instructions)
    describe('Group 4: Advanced Memory Operations (8-12 cycles)', () => {
        // Complex memory access patterns
    });

    // Group 5: 16-bit and Special Operations (4 instructions)
    describe('Group 5: 16-bit and Special Operations (12-20 cycles)', () => {
        // Most complex LD instructions
    });

    // Integration Tests
    describe('LD Instructions Integration', () => {
        // Complex programs using multiple LD variants
    });

    // Hardware Validation
    describe('Hardware Validation Tests', () => {
        // Blargg ROM integration and cycle timing validation
    });
});
```

## Detailed TDD Workflow Process

### Phase 2.1: Group 1 - Register-to-Register (Week 1)

**Target: 56 instructions, 4 cycles each, no memory access**

#### TDD Implementation Order:

1. **Start with simplest cases**:
   ```typescript
   test('LD B,C (0x41) copies C register to B register', () => {
       // RED PHASE: This test WILL FAIL until implementation exists
       cpu.setRegisterC(0x42);
       cpu.setProgramCounter(0x8000);
       mmu.writeByte(0x8000, 0x41); // LD B,C opcode

       const cycles = cpu.step();

       expect(cpu.getRegisters().b).toBe(0x42);
       expect(cpu.getRegisters().c).toBe(0x42); // Source preserved
       expect(cycles).toBe(4);
       expect(cpu.getPC()).toBe(0x8001);
       // Verify no flag changes
       expect(cpu.getRegisters().f).toBe(0xb0); // Post-boot flags unchanged
   });
   ```

2. **Build pattern systematically**:
   - Implement B-destination instructions (LD B,r): 0x40-0x47
   - Implement C-destination instructions (LD C,r): 0x48-0x4F  
   - Continue through all register destinations
   - **Special case**: LD r,r (same source/dest) should work correctly

3. **Edge cases and boundaries**:
   - Test with 0x00 and 0xFF values
   - Verify source register preservation
   - Confirm no other registers affected

#### Test Helper Functions:

```typescript
/**
 * Test helper: Verify register-to-register LD instruction
 */
function testRegisterToRegisterLD(
    opcode: number,
    sourceReg: keyof CPURegisters,
    destReg: keyof CPURegisters,
    testValue: number
) {
    cpu.setRegister(sourceReg, testValue);
    cpu.setProgramCounter(0x8000);
    mmu.writeByte(0x8000, opcode);

    const cycles = cpu.step();

    expect(cpu.getRegisters()[destReg]).toBe(testValue);
    expect(cpu.getRegisters()[sourceReg]).toBe(testValue); // Source preserved
    expect(cycles).toBe(4);
    expect(cpu.getPC()).toBe(0x8001);
    expect(cpu.getRegisters().f).toBe(0xb0); // No flag changes
}
```

### Phase 2.2: Group 2 - Immediate to Register (Week 1)

**Target: 8 instructions, 8 cycles each, memory read for immediate**

#### TDD Pattern:
```typescript
test('LD D,n8 (0x16) loads 8-bit immediate into D register', () => {
    // RED PHASE: Will fail until implementation exists
    cpu.setProgramCounter(0x8000);
    mmu.writeByte(0x8000, 0x16); // LD D,n8 opcode
    mmu.writeByte(0x8001, 0x7F); // Immediate value

    const cycles = cpu.step();

    expect(cpu.getRegisters().d).toBe(0x7F);
    expect(cycles).toBe(8);
    expect(cpu.getPC()).toBe(0x8002); // PC advanced by 2 bytes
    expect(cpu.getRegisters().f).toBe(0xb0); // No flag changes
});
```

### Phase 2.3: Group 3 - Memory via Register Pairs (Week 2)

**Target: 8 instructions, 8 cycles each, MMU integration required**

#### TDD Pattern:
```typescript
test('LD (DE),A (0x12) stores A register to memory address in DE', () => {
    // RED PHASE: Will fail until MMU integration implemented
    cpu.setRegisterA(0x99);
    cpu.setRegisterD(0xC0);
    cpu.setRegisterE(0x00);
    cpu.setProgramCounter(0x8000);
    mmu.writeByte(0x8000, 0x12); // LD (DE),A opcode

    const cycles = cpu.step();

    expect(mmu.readByte(0xC000)).toBe(0x99); // Value stored at DE address
    expect(cpu.getRegisters().a).toBe(0x99); // A register unchanged
    expect(cycles).toBe(8);
    expect(cpu.getPC()).toBe(0x8001);
    expect(cpu.getRegisters().f).toBe(0xb0); // No flag changes
});
```

### Phase 2.4: Group 4 - Advanced Memory Operations (Week 2)

**Target: 12 instructions, 8-12 cycles, increment/decrement logic**

#### Special Focus: HL increment/decrement variants
```typescript
test('LD (HL+),A (0x22) stores A to (HL) then increments HL', () => {
    // RED PHASE: Will fail until increment logic implemented
    cpu.setRegisterA(0x55);
    cpu.setRegisterH(0xC0);
    cpu.setRegisterL(0xFF); // Test boundary condition
    cpu.setProgramCounter(0x8000);
    mmu.writeByte(0x8000, 0x22); // LD (HL+),A opcode

    const cycles = cpu.step();

    expect(mmu.readByte(0xC0FF)).toBe(0x55); // Value stored at original HL
    expect(cpu.getRegisters().h).toBe(0xC1); // HL incremented (carry from L)
    expect(cpu.getRegisters().l).toBe(0x00);
    expect(cycles).toBe(8);
    expect(cpu.getPC()).toBe(0x8001);
    expect(cpu.getRegisters().f).toBe(0xb0); // No flag changes
});
```

### Phase 2.5: Group 5 - 16-bit and Special Operations (Week 3)

**Target: 4 instructions, 12-20 cycles, most complex**

#### Special Focus: Only LD HL,SP+e8 affects flags
```typescript
test('LD HL,SP+e8 (0xF8) loads SP+signed offset into HL with flag effects', () => {
    // RED PHASE: Will fail until signed arithmetic and flag logic implemented
    cpu.setStackPointer(0xFFF8);
    cpu.setProgramCounter(0x8000);
    mmu.writeByte(0x8000, 0xF8); // LD HL,SP+e8 opcode
    mmu.writeByte(0x8001, 0x02); // Positive offset +2

    const cycles = cpu.step();

    expect(cpu.getRegisters().h).toBe(0xFF); // High byte of 0xFFFA
    expect(cpu.getRegisters().l).toBe(0xFA); // Low byte of 0xFFFA
    expect(cpu.getZeroFlag()).toBe(false); // Z always 0 for this instruction
    expect(cpu.getSubtractFlag()).toBe(false); // N always 0 for this instruction
    // H and C flags based on bit 3 and bit 7 carry from addition
    expect(cycles).toBe(12);
    expect(cpu.getPC()).toBe(0x8002);
});
```

## Test Coverage Standards

### Unit Test Requirements for Each LD Instruction

1. **Basic Functionality**
   - Correct value transfer from source to destination
   - Proper cycle count returned
   - PC advancement by correct number of bytes
   - Source register/memory preservation (where applicable)

2. **Boundary Value Testing**
   - Test with 0x00 and 0xFF values
   - Test memory address boundaries (0x0000, 0xFFFF)
   - Test register pair wraparound (0xFFFF + 1 = 0x0000)

3. **Flag Behavior Verification**
   - All LD instructions except LD HL,SP+e8 preserve flags
   - LD HL,SP+e8 sets Z=0, N=0, and calculates H/C flags

4. **Memory Access Patterns**
   - Verify correct MMU read/write calls using Jest spies
   - Test little-endian byte order for 16-bit operations
   - Validate memory access timing and patterns

5. **Register State Isolation**
   - Verify only intended registers are modified
   - Ensure no unintended side effects on other CPU state

### Integration Test Scenarios

#### Scenario 1: Data Movement Chain
```typescript
test('should perform complex data movement using multiple LD variants', () => {
    // Program: Load immediate -> register transfer -> memory storage -> memory load
    // LD B,0x42 -> LD C,B -> LD (HL),C -> LD A,(HL)
    // Demonstrates data flow through register and memory systems
});
```

#### Scenario 2: 16-bit Register Pair Operations
```typescript
test('should handle 16-bit register pair loads correctly', () => {
    // Program: LD BC,0x1234 -> LD (BC),A -> LD DE,0x5678 -> LD A,(DE)
    // Tests 16-bit immediate loads and indirect memory access
});
```

#### Scenario 3: Stack Pointer Arithmetic
```typescript
test('should perform stack pointer arithmetic with LD HL,SP+e8', () => {
    // Program: Various SP+offset calculations with positive/negative offsets
    // Tests signed arithmetic and flag calculations
});
```

## Hardware Validation Approach

### Blargg Test ROM Integration

1. **CPU Instruction Tests**
   - Reference: `/tests/resources/blargg/cpu_instrs/06-ld r,r.gb`
   - Validate register-to-register LD instructions against real hardware
   - Compare emulator output with expected Blargg results

2. **Memory Timing Tests**
   - Reference: `/tests/resources/blargg/mem_timing/`
   - Validate memory access timing for LD instructions
   - Ensure cycle-accurate emulation

### Cycle Timing Validation

```typescript
describe('Hardware Timing Verification', () => {
    test('should match hardware cycle counts for all LD instruction groups', () => {
        const testCases = [
            // Group 1: Register-to-register (4 cycles)
            { opcode: 0x41, expectedCycles: 4, setup: [] },
            { opcode: 0x78, expectedCycles: 4, setup: [] },
            
            // Group 2: Immediate to register (8 cycles)
            { opcode: 0x06, expectedCycles: 8, setup: [0x42] },
            { opcode: 0x3E, expectedCycles: 8, setup: [0x99] },
            
            // Group 3: Memory via register pairs (8 cycles)
            { opcode: 0x02, expectedCycles: 8, setup: [] },
            { opcode: 0x0A, expectedCycles: 8, setup: [] },
            
            // Group 4: Advanced memory (8-12 cycles)
            { opcode: 0x22, expectedCycles: 8, setup: [] },
            { opcode: 0x36, expectedCycles: 12, setup: [0x77] },
            
            // Group 5: 16-bit and special (12-20 cycles)
            { opcode: 0x01, expectedCycles: 12, setup: [0x34, 0x12] },
            { opcode: 0x08, expectedCycles: 20, setup: [0x00, 0x80] },
        ];

        testCases.forEach(({ opcode, expectedCycles, setup }) => {
            cpu.reset();
            cpu.setProgramCounter(0x8000);
            mmu.writeByte(0x8000, opcode);
            
            setup.forEach((byte, offset) => {
                mmu.writeByte(0x8001 + offset, byte);
            });

            const cycles = cpu.step();
            expect(cycles).toBe(expectedCycles);
        });
    });
});
```

## Quality Assurance Process

### TDD Workflow Enforcement

1. **RED Phase Verification**
   - Every test MUST fail initially
   - Failing tests should fail for the RIGHT reason (missing implementation)
   - Test failure messages should be clear and actionable

2. **GREEN Phase Requirements**
   - Implement MINIMAL code to make test pass
   - No premature optimization or extra features
   - Focus on single instruction at a time

3. **REFACTOR Phase Standards**  
   - Refactor only with ALL tests passing
   - Maintain test coverage during refactoring
   - Improve code structure without changing behavior

### Test Review Checklist

#### For Each LD Instruction Test:
- [ ] **Test naming follows pattern**: `LD src,dst (0xXX) should [behavior description]`
- [ ] **TDD RED phase documented**: Comment explains why test will fail initially
- [ ] **Hardware reference cited**: Opcode, cycle count, flag effects documented
- [ ] **Boundary testing included**: Tests 0x00, 0xFF, and edge cases
- [ ] **Flag behavior verified**: Confirms flag preservation or modification
- [ ] **Memory access validated**: Uses Jest spies to verify MMU interactions
- [ ] **Register isolation tested**: Confirms only intended registers modified
- [ ] **Timing accuracy confirmed**: Cycle count matches opcodes.json
- [ ] **Integration potential**: Test can be combined with other instructions

#### For Test Implementation Quality:
- [ ] **Atomic tests**: Each test validates exactly one behavior
- [ ] **Fast execution**: Tests run in sub-second time
- [ ] **Debuggable failures**: Clear assertion messages and focused scope
- [ ] **Real data usage**: No fake/dummy values, use realistic test data
- [ ] **No implementation details**: Tests observe behavior at CPU boundaries

### Code Review Process

1. **Test Engineer Review** (This role)
   - Verify TDD workflow followed correctly
   - Confirm test quality standards met
   - Validate hardware accuracy and boundary testing

2. **Backend TypeScript Engineer Review**
   - Verify implementation correctness and performance
   - Confirm architectural compliance
   - Test integration with existing CPU infrastructure

3. **Architecture Reviewer Review**  
   - Ensure encapsulation boundaries respected
   - Validate composition and design principles
   - Approve architectural decisions

## Risk Mitigation

### Common TDD Anti-Patterns to Avoid

1. **Writing tests after implementation** - Violates RED-GREEN-REFACTOR
2. **Testing implementation details** - Makes tests brittle and unmaintainable  
3. **Using fake data** - Reduces confidence in real-world behavior
4. **Complex test setup** - Indicates poor design, should be simple
5. **Disabled tests** - Only allowed with documentation and human approval

### Technical Risks and Mitigations

1. **MMU Integration Complexity**
   - **Risk**: LD instructions require complex MMU interactions
   - **Mitigation**: Start with register-only operations, add MMU gradually
   - **Testing**: Use MMU mocks for isolated CPU testing when needed

2. **Memory Timing Accuracy**
   - **Risk**: Incorrect cycle counts affect emulator timing
   - **Mitigation**: Validate against opcodes.json and Blargg test ROMs
   - **Testing**: Dedicated timing verification test suite

3. **16-bit Little-Endian Handling**
   - **Risk**: Incorrect byte order in 16-bit operations
   - **Mitigation**: Explicit test cases for byte order verification
   - **Testing**: Test with known 16-bit values and verify memory layout

4. **Flag Calculation Edge Cases**
   - **Risk**: Only LD HL,SP+e8 affects flags, easy to get wrong
   - **Mitigation**: Special focus on signed arithmetic and carry detection
   - **Testing**: Comprehensive edge case testing for this instruction

## Implementation Timeline

### Week 1: Foundation (Groups 1-2)
- **Days 1-3**: Group 1 - Register-to-register LD instructions (56 tests)
- **Days 4-5**: Group 2 - Immediate to register LD instructions (8 tests)
- **Milestone**: 64/88 LD instructions implemented with full test coverage

### Week 2: Memory Operations (Groups 3-4)  
- **Days 1-2**: Group 3 - Memory via register pairs (8 tests)
- **Days 3-5**: Group 4 - Advanced memory operations (12 tests)
- **Milestone**: 84/88 LD instructions implemented

### Week 3: Complex Operations and Integration (Group 5)
- **Days 1-2**: Group 5 - 16-bit and special operations (4 tests)
- **Days 3-4**: Integration test scenarios
- **Day 5**: Hardware validation and Blargg ROM testing
- **Milestone**: All 88 LD instructions implemented with hardware validation

## Success Criteria

### Technical Acceptance Criteria
1. All 88 LD instructions pass individual unit tests
2. Integration tests demonstrate realistic usage patterns
3. Blargg test ROM validation passes for relevant LD instruction tests
4. All tests follow strict TDD methodology with documented RED phases
5. Test suite executes in under 5 seconds for rapid development cycles
6. Zero disabled tests without documented human approval

### Quality Metrics
- **Test Coverage**: 100% line coverage for LD instruction implementation
- **TDD Compliance**: Every implementation method has corresponding failing test first
- **Hardware Accuracy**: Cycle counts match opcodes.json specification exactly
- **Boundary Testing**: All edge cases (0x00, 0xFF, memory boundaries) covered
- **Integration Capability**: LD instructions work correctly with Phase 1 instructions

### Project Impact
- **Development Velocity**: Foundation for rapid implementation of remaining instruction families
- **Emulator Accuracy**: Precise Game Boy memory operation emulation
- **Testing Excellence**: Reference implementation for remaining CPU instruction testing
- **Architectural Integrity**: Maintains encapsulation and composition principles throughout

---

This comprehensive TDD strategy ensures systematic, high-quality implementation of all 88 LD instructions while maintaining strict engineering standards and Test-Driven Development principles.