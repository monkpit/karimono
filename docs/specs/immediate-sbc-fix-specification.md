# Immediate SBC Half-Carry Fix - Critical Hardware Accuracy Issue

## Problem Statement

**CRITICAL BUG**: SBC (Subtract with Carry) instructions in opcodes 0x98-0x9D have incorrect half-carry flag calculation causing Blargg test ROM 09-op r,r.gb to fail with output "98 99 9A 9B 9C 9D \nFailed".

**Impact**: This single bug prevents 100% Blargg test ROM completion. Current status: 8/11 passing (72.7%).

## Root Cause Analysis

**Current INCORRECT Implementation**:
```typescript
// WRONG - Complex logic that doesn't match hardware behavior
const halfCarry = (a & 0x0f) < (value & 0x0f) + carry && (a & 0xf0) <= (value & 0xf0);
```

**Hardware-Accurate CORRECT Implementation**:
```typescript  
// CORRECT - Simple formula matching Z80/SM83 hardware behavior
const halfCarry = ((a & 0x0f) - (value & 0x0f) - carry) < 0;
```

## Immediate Fix Required

### Files to Modify
**File**: `/src/emulator/cpu/CPU.ts`

**Methods to Fix** (6 total):
- `executeSBCAB98()` - SBC A,B (opcode 0x98)
- `executeSBCAC99()` - SBC A,C (opcode 0x99)  
- `executeSBCAD9A()` - SBC A,D (opcode 0x9A)
- `executeSBCAE9B()` - SBC A,E (opcode 0x9B)
- `executeSBCAH9C()` - SBC A,H (opcode 0x9C)
- `executeSBCAL9D()` - SBC A,L (opcode 0x9D)

### Exact Code Changes

**Find this pattern** (appears 6 times):
```typescript
const halfCarry = (a & 0x0f) < (value & 0x0f) + carry && (a & 0xf0) <= (value & 0xf0);
```

**Replace with**:
```typescript
const halfCarry = ((a & 0x0f) - (value & 0x0f) - carry) < 0;
```

## Hardware Reference Authority

**Primary Source**: RGBDS GBZ80 Reference  
https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7

*"The half-carry flag is set when a borrow from bit 3 to bit 4 occurs during subtraction operations."*

**Secondary Validation**: Stack Overflow Game Boy Hardware Accuracy  
https://stackoverflow.com/questions/8868396/game-boy-what-constitutes-a-half-carry

## Expected Results

### Before Fix
- **Blargg 09-op r,r.gb**: "09-op r,r\n\n98 99 9A 9B 9C 9D \nFailed"
- **Status**: 8/11 tests passing (72.7%)

### After Fix  
- **Blargg 09-op r,r.gb**: "09-op r,r\n\n\nPassed"
- **Status**: 9/11 tests passing (81.8%)
- **Progress**: +9% completion, 1 step closer to 100%

## Risk Assessment

- **Risk Level**: MINIMAL
- **Scope**: Limited to 6 methods, single line change each
- **Regression Risk**: LOW (change improves hardware accuracy)
- **Test Coverage**: Validated by Blargg hardware test ROM

## Verification Steps

1. **Apply the fix** to all 6 SBC methods
2. **Run Blargg test**: `npm test -- tests/emulator/integration/blargg-cpu-instrs.test.ts --testNamePattern="09-op r,r"`  
3. **Verify output**: Should show "Passed" instead of "Failed"
4. **Run full suite**: Ensure no regressions in other passing tests
5. **Document progress**: Update status to 9/11 passing

## Next Steps After This Fix

With SBC fixed, remaining issues:
1. **04-op r,imm.gb** - DE register immediate operation issue  
2. **11-op a,(hl).gb** - Accumulator-memory operation issue

**Priority**: Fix SBC first (immediate impact), then investigate the other two.

---

*URGENT: This fix can be implemented immediately with high confidence of success*  
*Authority: RGBDS GBZ80 Reference + Hardware test ROM validation*  
*Date: 2025-08-09*  
*Product Owner approval: Ready for implementation*