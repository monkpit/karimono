# Blargg Test ROM Analysis and Fix Specification

**Document Version:** 2.0  
**Product Owner:** Claude Code Product Owner  
**Date:** 2025-01-09  
**Status:** Implementation Bugs Identified - Ready for Debug Phase

## Executive Summary

Comprehensive analysis of 5 failing Blargg CPU test ROMs reveals that **all required instruction opcodes are already implemented** in the CPU. The test failures are due to **implementation bugs in existing instruction handlers**, not missing instructions. This specification identifies the problem areas and provides detailed requirements for debugging and fixing the implementations to achieve hardware accuracy.

## Test ROM Analysis Results

### ✅ PASSING (6/11)
- 01-special
- 02-interrupts  
- 03-op sp,hl
- 06-ld r,r
- 07-jr,jp,call,ret,rst
- 08-misc instrs

### ❌ FAILING (5/11) - Analysis Complete

#### 04-op r,imm (Register-Immediate Operations)
**Status**: All 8 opcodes implemented - **IMPLEMENTATION BUGS PRESENT**

**Implemented Opcodes**:
- 0xC6: ADD A, n8
- 0xCE: ADC A, n8  
- 0xD6: SUB n8
- 0xDE: SBC A, n8
- 0xE6: AND n8
- 0xEE: XOR n8
- 0xF6: OR n8
- 0xFE: CP n8

#### 05-op rp (Register Pair Operations)
**Status**: All 12 opcodes implemented - **IMPLEMENTATION BUGS PRESENT**

**Implemented Opcodes**:
- ADD HL, rp: 0x09 (BC), 0x19 (DE), 0x29 (HL), 0x39 (SP)
- INC rp: 0x03 (BC), 0x13 (DE), 0x23 (HL), 0x33 (SP)
- DEC rp: 0x0B (BC), 0x1B (DE), 0x2B (HL), 0x3B (SP)

#### 09-op r,r (Register-to-Register Operations)
**Status**: All 64 opcodes implemented - **IMPLEMENTATION BUGS PRESENT**

**Implemented Opcodes**:
- ADD A, r: 0x80-0x87 (B,C,D,E,H,L,(HL),A)
- ADC A, r: 0x88-0x8F
- SUB r: 0x90-0x97
- SBC A, r: 0x98-0x9F
- AND r: 0xA0-0xA7
- XOR r: 0xA8-0xAF
- OR r: 0xB0-0xB7
- CP r: 0xB8-0xBF

#### 10-bit ops (Bit Manipulation Instructions)
**Status**: All 192 CB-prefixed opcodes implemented - **IMPLEMENTATION BUGS PRESENT**

**Implemented Opcodes**:
- BIT n, r: 0x40-0x7F (bits 0-7, all registers + (HL))
- RES n, r: 0x80-0xBF (bits 0-7, all registers + (HL))
- SET n, r: 0xC0-0xFF (bits 0-7, all registers + (HL))

#### 11-op a,(hl) (Accumulator-Memory Operations)
**Status**: All 12 opcodes implemented - **IMPLEMENTATION BUGS PRESENT**

**Implemented Opcodes**:
- ALU ops: 0x86 (ADD), 0x8E (ADC), 0x96 (SUB), 0x9E (SBC)
- Logic ops: 0xA6 (AND), 0xAE (XOR), 0xB6 (OR), 0xBE (CP)
- Memory ops: 0x34 (INC), 0x35 (DEC), 0x7E (LD A,(HL)), 0x77 (LD (HL),A)

## Root Cause Analysis

Since all opcodes are implemented, the failures indicate **hardware accuracy issues** in:

1. **Flag Calculation Logic**: Incorrect Z, N, H, C flag computations
2. **Timing Implementation**: Wrong cycle counts or timing behavior
3. **Memory Access Patterns**: Incorrect MMU interaction for (HL) operations
4. **Edge Case Handling**: Boundary conditions and overflow scenarios

## Critical Implementation Requirements

### Primary Reference Standard
**MANDATORY**: Use RGBDS GBZ80 Reference as authoritative source: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7

### Flag Calculation Specifications

#### ADD/ADC Instructions
```typescript
// Z Flag: Set if result is 0x00
const zFlag = (result & 0xFF) === 0;

// N Flag: Always 0 for addition
const nFlag = false;

// H Flag: Set if carry from bit 3 to bit 4
const hFlag = ((a & 0x0F) + (operand & 0x0F) + carry) > 0x0F;

// C Flag: Set if carry from bit 7 (result > 0xFF)
const cFlag = result > 0xFF;
```

#### SUB/SBC/CP Instructions
```typescript
// Z Flag: Set if result is 0x00
const zFlag = (result & 0xFF) === 0;

// N Flag: Always 1 for subtraction
const nFlag = true;

// H Flag: Set if borrow from bit 4
const hFlag = (a & 0x0F) < ((operand & 0x0F) + carry);

// C Flag: Set if borrow (operand > a)
const cFlag = (operand + carry) > a;
```

#### AND Instruction
```typescript
const zFlag = (result & 0xFF) === 0;
const nFlag = false;
const hFlag = true;  // Always set for AND
const cFlag = false; // Always clear for AND
```

#### XOR/OR Instructions
```typescript
const zFlag = (result & 0xFF) === 0;
const nFlag = false;
const hFlag = false; // Always clear
const cFlag = false; // Always clear
```

### Timing Requirements

All instruction cycle counts must match RGBDS specification exactly:

- **Register operations**: 4 cycles (1 M-cycle)
- **Immediate operations**: 8 cycles (2 M-cycles) 
- **(HL) memory operations**: 8 cycles (2 M-cycles)
- **INC/DEC (HL)**: 12 cycles (3 M-cycles)
- **16-bit operations**: 8 cycles (2 M-cycles)
- **CB-prefixed bit ops**: 8 cycles (2 M-cycles)
- **CB-prefixed bit ops (HL)**: 16 cycles (4 M-cycles)

### Memory Access Requirements

For (HL) operations:
1. Read HL register pair to get memory address
2. Use MMU.read8()/write8() for memory access
3. Apply operation to memory value
4. Write result back to memory (for non-read-only ops)
5. Set flags based on final result

## Test Case Requirements

### Comprehensive Flag Testing
Each failing instruction must be tested with:

1. **Zero Result Cases**: Operations resulting in 0x00
2. **Half Carry Cases**: Operations causing bit 3→4 carry/borrow
3. **Full Carry Cases**: Operations causing bit 7 overflow/underflow
4. **Edge Values**: 0x00, 0x01, 0x0F, 0x10, 0x7F, 0x80, 0xFE, 0xFF
5. **Boundary Conditions**: Maximum/minimum values for each operation

### Hardware Validation Requirements

All fixes must be validated against:
1. **Blargg Test ROMs**: Must pass all failing tests
2. **RGBDS Specification**: Implementation must match documentation exactly
3. **Real Hardware Behavior**: Test ROM outputs are definitive

## Detailed Instruction Specifications

### Register-Immediate Operations (04-op r,imm)

#### 1. `ADD A, n8` (0xC6)
- **RGBDS Reference**: `ADD A,N8`
- **Cycles**: 8 (2 M-cycles)
- **Flags**: Z=Z, N=0, H=H, C=C
- **Test Case**: "Add immediate value to A register with correct flag calculation"
  - Initial state: A=0x0F, flags clear
  - Action: ADD A, 0x01
  - Expected result: A=0x10, Z=0, N=0, H=1, C=0

#### 2. `ADC A, n8` (0xCE)
- **RGBDS Reference**: `ADC A,N8`  
- **Cycles**: 8 (2 M-cycles)
- **Flags**: Z=Z, N=0, H=H, C=C
- **Test Case**: "Add immediate value with carry to A register"
  - Initial state: A=0xFF, C=1, other flags clear
  - Action: ADC A, 0x01
  - Expected result: A=0x01, Z=0, N=0, H=1, C=1

#### 3. `SUB n8` (0xD6)
- **RGBDS Reference**: `SUB A,N8`
- **Cycles**: 8 (2 M-cycles)  
- **Flags**: Z=Z, N=1, H=H, C=C
- **Test Case**: "Subtract immediate value from A register"
  - Initial state: A=0x10, flags clear
  - Action: SUB 0x01
  - Expected result: A=0x0F, Z=0, N=1, H=1, C=0

#### 4. `SBC A, n8` (0xDE)
- **RGBDS Reference**: `SBC A,N8`
- **Cycles**: 8 (2 M-cycles)
- **Flags**: Z=Z, N=1, H=H, C=C
- **Test Case**: "Subtract immediate value with carry from A register"
  - Initial state: A=0x01, C=1, other flags clear
  - Action: SBC A, 0x01
  - Expected result: A=0xFF, Z=0, N=1, H=1, C=1

#### 5. `AND n8` (0xE6)
- **RGBDS Reference**: `AND A,N8`
- **Cycles**: 8 (2 M-cycles)
- **Flags**: Z=Z, N=0, H=1, C=0
- **Test Case**: "Bitwise AND immediate value with A register"
  - Initial state: A=0xFF, flags clear
  - Action: AND 0x0F
  - Expected result: A=0x0F, Z=0, N=0, H=1, C=0

#### 6. `XOR n8` (0xEE)
- **RGBDS Reference**: `XOR A,N8`
- **Cycles**: 8 (2 M-cycles)
- **Flags**: Z=Z, N=0, H=0, C=0
- **Test Case**: "Bitwise XOR immediate value with A register"
  - Initial state: A=0xFF, flags set
  - Action: XOR 0xFF
  - Expected result: A=0x00, Z=1, N=0, H=0, C=0

#### 7. `OR n8` (0xF6)
- **RGBDS Reference**: `OR A,N8`
- **Cycles**: 8 (2 M-cycles)
- **Flags**: Z=Z, N=0, H=0, C=0
- **Test Case**: "Bitwise OR immediate value with A register"
  - Initial state: A=0x0F, flags set
  - Action: OR 0xF0
  - Expected result: A=0xFF, Z=0, N=0, H=0, C=0

#### 8. `CP n8` (0xFE)
- **RGBDS Reference**: `CP A,N8`
- **Cycles**: 8 (2 M-cycles)
- **Flags**: Z=Z, N=1, H=H, C=C
- **Test Case**: "Compare A register with immediate value"
  - Initial state: A=0x10, flags clear
  - Action: CP 0x10
  - Expected result: A=0x10 (unchanged), Z=1, N=1, H=0, C=0

## Implementation Priority

### Phase 1: Critical Flag Fixes (High Priority)
- **Register-immediate operations** (04-op r,imm)
- **Accumulator-memory operations** (11-op a,(hl))

### Phase 2: Register Operations (Medium Priority)  
- **Register-to-register ALU operations** (09-op r,r)
- **Register pair operations** (05-op rp)

### Phase 3: Complex Operations (Lower Priority)
- **Bit manipulation instructions** (10-bit ops)

## Success Criteria

1. **All 5 failing Blargg test ROMs must pass**
2. **No regression in 6 currently passing test ROMs**
3. **Implementation matches RGBDS specification exactly**
4. **Flag calculations are hardware-accurate**
5. **Timing behavior matches real Game Boy DMG**

## Engineering Notes

- Focus debugging efforts on flag calculation logic first
- Use hardware test ROM outputs as ground truth
- Cross-reference all implementations against RGBDS documentation
- Implement comprehensive edge case testing
- Validate timing accuracy with cycle-perfect execution

## Key Finding: No Missing Instructions

**Critical Discovery**: This analysis definitively proves that **no CPU instructions are missing**. All required opcodes for the failing test ROMs are already implemented in the CPU class. The test failures are entirely due to implementation bugs in existing instruction handlers.

**Engineering Focus**: Debug and fix the flag calculation logic, timing accuracy, and edge case handling in the currently implemented instruction methods rather than implementing new opcodes.

**References Used**:
- `/home/pittm/karimono-v2/tests/resources/opcodes.json` - Complete SM83 instruction reference
- `/home/pittm/karimono-v2/src/emulator/cpu/CPU.ts` - Current CPU implementation
- RGBDS GBZ80 Reference (https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7) - Hardware specification authority

This specification provides the foundation for systematic debugging and fixing of the CPU instruction implementations to achieve full Blargg test ROM compatibility.