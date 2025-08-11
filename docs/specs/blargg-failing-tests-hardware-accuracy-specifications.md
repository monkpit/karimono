# Blargg Test ROM Hardware Accuracy Fix Specifications

## Executive Summary

Analysis of the 3 remaining failing Blargg test ROMs (04-op r,imm, 09-op r,r, 11-op a,(hl)) reveals specific hardware accuracy bugs in our SM83 CPU implementation. With 8/11 tests already passing (72.7%), we have proven our emulator architecture is sound. These failures represent specific, fixable hardware accuracy issues rather than architectural problems.

**Root Cause**: Incorrect flag calculations in arithmetic operations, particularly half-carry flag calculation for SBC instructions.

## Test ROM Failure Analysis

### ✅ Current Status: 8/11 Passing (72.7%)
- 01-special.gb, 02-interrupts.gb, 03-op sp,hl.gb
- 05-op rp.gb, 06-ld r,r.gb, 07-jr,jp,call,ret,rst.gb  
- 08-misc instrs.gb, 10-bit ops.gb

### ❌ Remaining Failures (3/11)

#### 1. 04-op r,imm.gb - "DE \nFailed"
**Output**: `"04-op r,imm\n\nDE \nFailed"`  
**Issue**: Specific DE register immediate operations failing hardware accuracy tests

#### 2. 09-op r,r.gb - "98 99 9A 9B 9C 9D \nFailed" 
**Output**: `"09-op r,r\n\n98 99 9A 9B 9C 9D \nFailed"`  
**Issue**: SBC A,B/C/D/E/H/L instructions (opcodes 0x98-0x9D) have incorrect half-carry flag calculation

#### 3. 11-op a,(hl).gb - Accumulator-Memory Operation Failures
**Issue**: Operations between accumulator and memory address (HL) failing accuracy tests

## Detailed Hardware Accuracy Specifications

### Fix Specification 1: SBC Half-Carry Flag Correction (09-op r,r.gb)

**Component**: SM83 CPU SBC A,r Instructions  
**Purpose**: Subtract register value and carry flag from accumulator with hardware-accurate flag calculation  
**Affected Opcodes**: 0x98, 0x99, 0x9A, 0x9B, 0x9C, 0x9D

**Current INCORRECT Implementation**:
```typescript
// WRONG: Complex logic that doesn't match hardware behavior
const halfCarry = (a & 0x0f) < (value & 0x0f) + carry && (a & 0xf0) <= (value & 0xf0);
```

**Required CORRECT Implementation**:
```typescript
// CORRECT: Hardware-accurate half-carry calculation per RGBDS specification
const halfCarry = ((a & 0x0f) - (value & 0x0f) - carry) < 0;
```

**RGBDS GBZ80 Reference**: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7  
*"Half-carry flag is set when a borrow from bit 3 to bit 4 occurs"*

**Timing**: 1 cycle, 1 byte per instruction

**Flag Behavior**:
- **Z (Zero)**: Set if result is 0
- **N (Subtract)**: Always set to 1 for SBC
- **H (Half Carry)**: Set if borrow from bit 3 to bit 4: `((a & 0x0f) - (value & 0x0f) - carry) < 0`
- **C (Carry)**: Set if borrow occurs: `result < 0`

**Test Cases**:

1. **"SBC A,B with half-carry borrow"**
   - Initial state: A=0x10, B=0x01, Carry=1
   - Operation: A = A - B - Carry = 0x10 - 0x01 - 1 = 0x0E
   - Expected flags: Z=0, N=1, H=1 (borrow from bit 3), C=0
   - Validation: Check H flag is set due to low nibble borrow

2. **"SBC A,C without half-carry borrow"**  
   - Initial state: A=0x20, C=0x10, Carry=0
   - Operation: A = A - C - Carry = 0x20 - 0x10 - 0 = 0x10  
   - Expected flags: Z=0, N=1, H=0 (no borrow needed), C=0
   - Validation: Check H flag is clear

3. **"SBC A,D with full underflow"**
   - Initial state: A=0x00, D=0x01, Carry=0
   - Operation: A = A - D - Carry = 0x00 - 0x01 - 0 = 0xFF (underflow)
   - Expected flags: Z=0, N=1, H=1, C=1 
   - Validation: Both H and C flags set for underflow

**References**:
- RGBDS GBZ80: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
- opcodes.json: Lines containing "0x98" through "0x9D"
- Test ROM: 09-op r,r.gb validates these SBC operations

---

### Fix Specification 2: Register-Immediate DE Operations (04-op r,imm.gb)

**Component**: Register-immediate operations affecting DE register pair  
**Purpose**: Hardware-accurate immediate value operations with DE register  
**Issue**: "DE \nFailed" output indicates specific DE register operation inaccuracy

**Investigation Required**:
Since the exact failing instruction is not clear from output, systematic analysis needed:

1. **Check LD DE,n16 instruction** (if implemented)
2. **Check ADD/SUB immediate operations involving DE** 
3. **Check flag calculations for DE-affecting operations**

**Potential Root Causes**:
- Incorrect 16-bit register pair manipulation
- Wrong flag calculations for operations affecting DE
- Timing issues in multi-byte immediate operations

**Test Cases** (to be refined based on investigation):

1. **"Load immediate to DE register pair"**
   - Operation: LD DE,0x1234
   - Expected result: D=0x12, E=0x34
   - Validation: Verify correct byte order and no flag changes

2. **"Immediate operations affecting DE flags"** 
   - Investigation needed to identify specific failing operation
   - Check if 8-bit operations on D or E registers have flag issues

**References**:
- RGBDS GBZ80: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
- Test ROM: 04-op r,imm.gb validates register-immediate operations

---

### Fix Specification 3: Accumulator-Memory Operations (11-op a,(hl).gb)

**Component**: Operations between accumulator A and memory address (HL)  
**Purpose**: Hardware-accurate memory operations with proper flag calculations

**Potential Issues**:
- Memory read/write timing
- Flag calculations for memory-based arithmetic operations  
- Indirect addressing through HL register pair

**Common Operations to Verify**:
- LD A,(HL) / LD (HL),A - Memory load/store
- ADD A,(HL) / SUB A,(HL) - Arithmetic with memory
- AND A,(HL) / OR A,(HL) / XOR A,(HL) - Logic with memory
- CP A,(HL) - Compare with memory

**Test Cases** (to be refined):

1. **"Load accumulator from HL memory address"**
   - Setup: HL=0x8000, Memory[0x8000]=0x42
   - Operation: LD A,(HL)  
   - Expected result: A=0x42, no flag changes
   - Validation: Memory read successful, A updated

2. **"Arithmetic operation with memory through HL"**
   - Investigation needed to identify specific failing operation
   - Check flag calculations match hardware behavior

**References**:
- RGBDS GBZ80: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7  
- Test ROM: 11-op a,(hl).gb validates accumulator-memory operations

## Implementation Plan

### Phase 1: Critical SBC Fix (09-op r,r.gb) - HIGH PRIORITY
1. **Update SBC half-carry calculation** in all 6 methods (0x98-0x9D)
2. **Change from**: Complex multi-condition logic  
3. **Change to**: Simple hardware-accurate formula: `((a & 0x0f) - (value & 0x0f) - carry) < 0`
4. **Validate with 09-op r,r.gb test ROM** - should immediately resolve this failure

### Phase 2: DE Register Investigation (04-op r,imm.gb) - MEDIUM PRIORITY  
1. **Run detailed debugging** on 04-op r,imm.gb with instruction-level tracing
2. **Identify specific instruction** causing "DE \nFailed" output
3. **Research RGBDS specification** for identified instruction
4. **Implement hardware-accurate fix** based on research

### Phase 3: Memory Operations Investigation (11-op a,(hl).gb) - MEDIUM PRIORITY
1. **Analyze memory operation patterns** in 11-op a,(hl).gb test ROM
2. **Check MMU memory access timing** and flag calculations  
3. **Verify indirect addressing** through HL register pair
4. **Implement required fixes** based on investigation

### Phase 4: Systematic Validation
1. **Run all 11 Blargg test ROMs** after each fix
2. **Confirm no regressions** in currently passing tests
3. **Document final 11/11 completion** achieving 100% hardware accuracy

## Success Metrics

- **Target**: 11/11 Blargg test ROMs passing (100% completion)
- **Current**: 8/11 passing (72.7% → 100%)
- **Risk**: LOW - Changes target specific, well-isolated instruction implementations
- **Confidence**: HIGH - SBC fix has clear root cause and solution identified

## Hardware Accuracy References

**PRIMARY AUTHORITY**: RGBDS GBZ80 Reference  
https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7

**Secondary References**:
- opcodes.json: Instruction specifications and flag behavior
- Pan Docs: https://gbdev.io/pandocs/  
- GB Dev Wiki: https://gbdev.gg8.se/wiki
- Stack Overflow Game Boy hardware discussions

**Test ROM Authority**: Blargg hardware test ROMs verified against real DMG hardware

---

*Generated by Product Owner using systematic hardware accuracy analysis*  
*Date: 2025-08-09*  
*Status: Ready for Implementation - SBC fix can be applied immediately*