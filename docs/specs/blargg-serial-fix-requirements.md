# Blargg Serial Interface Fix Requirements

**Product Owner Specification**
**Date**: 2025-08-09
**Status**: Ready for Backend Engineer Implementation

## Problem Summary

The `04-op r,imm` Blargg test ROM gets stuck polling the Interrupt Flag register (0xFF0F) waiting for serial interrupt (bit 3). The test successfully outputs "04-op r,imm\n" but then hangs waiting for the serial completion interrupt.

## Root Cause Analysis

**Current Issue**: Serial transfers complete but serial interrupts are not being generated properly.

**Evidence**:
1. Test outputs characters correctly (transfer completion works)
2. Test hangs polling IF register (interrupt generation fails)
3. Blargg tests use `SC=$81` (internal clock mode - should complete)

## Technical Requirements

### 1. Serial Interface Behavior

**Internal Clock Transfers (SC = 0x81)**:
- Transfer MUST complete after exactly 4096 CPU cycles
- Serial interrupt (IF bit 3) MUST be set upon completion
- SB register MUST contain 0xFF (disconnected cable)
- SC bit 7 MUST be cleared upon completion

**External Clock Transfers (SC = 0x80)**:
- Transfer should NOT complete (hardware-accurate)
- No interrupt generation
- SC bit 7 remains set

### 2. Implementation Fix Strategy

**Step 1: Fix Interrupt Generation**
```typescript
private completeTransfer(): void {
  // Existing logic...
  this.serialData = 0xff;
  this.serialControl &= 0x7f; // Clear busy flag
  this.transferActive = false;
  
  // CRITICAL: Generate serial interrupt
  this.interruptCallback(3); // Set IF bit 3
}
```

**Step 2: Correct Transfer Timing**
- Current: Uses 2304 cycles (Blargg delay timing)
- Required: Use 4096 cycles (hardware-accurate transfer time)
- Change `TRANSFER_CYCLES = 2304` to `TRANSFER_CYCLES = 4096`

**Step 3: Remove Temporary Fix**
- Remove the bypass for external clock mode
- Restore proper external vs internal clock differentiation

### 3. Test Case Requirements

**Test Case 1: Internal Clock Interrupt Generation**
- Initial: SB = 0x42, SC = 0x00, IF bit 3 = 0
- Action: Write 0x81 to SC, step 4096 cycles
- Expected: SC bit 7 = 0, IF bit 3 = 1, output buffer contains 'B'

**Test Case 2: External Clock No-Completion**
- Initial: SB = 0x42, SC = 0x00
- Action: Write 0x80 to SC, step 10000 cycles  
- Expected: SC bit 7 = 1 (still busy), IF bit 3 = 0

**Test Case 3: Blargg Timing Compatibility**
- Action: Simulate Blargg pattern (write SB, write SC=0x81, step 4096+ cycles)
- Expected: Transfer complete, interrupt generated, character captured

## Implementation Files

**Primary File**: `/home/pittm/karimono-v2/src/emulator/mmu/SerialInterface.ts`

**Key Methods to Review**:
- `writeSC()` - Transfer initiation
- `step()` - Transfer timing 
- `completeTransfer()` - Interrupt generation
- Constructor - InterruptCallback integration

**Test File**: `/home/pittm/karimono-v2/tests/emulator/mmu/SerialInterface.test.ts`

## Success Criteria

- [ ] Blargg `04-op r,imm` test completes successfully
- [ ] All 11 Blargg cpu_instrs tests pass
- [ ] Internal clock transfers generate interrupts
- [ ] External clock transfers stall appropriately
- [ ] All existing SerialInterface tests continue to pass

## Backend Engineer Action Items

1. **Debug Current Interrupt Generation**: Verify interruptCallback(3) is called
2. **Check MMU Interrupt Integration**: Ensure IF register bit 3 is set correctly
3. **Update Transfer Timing**: Change from 2304 to 4096 cycles
4. **Remove Temporary External Clock Bypass**: Restore hardware-accurate behavior
5. **Add Debug Logging**: Track interrupt generation in test runs
6. **Implement Required Test Cases**: Verify interrupt generation works

---

**Product Owner Notes**: This specification provides the minimal requirements to fix Blargg test compatibility while maintaining hardware accuracy. The key insight is that Blargg tests use internal clock mode, so the issue is interrupt generation, not clock mode handling.