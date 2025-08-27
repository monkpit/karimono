# Plain English Test Cases for Blargg Hardware Accuracy Fixes

## Test Cases for SBC Half-Carry Flag Fix (09-op r,r.gb)

### Test Case 1: Basic SBC Half-Carry Detection
**Description**: "SBC instruction should set half-carry flag when low nibble requires borrow"
- **Setup**: Set A register to 0x10, B register to 0x01, carry flag to 1
- **Action**: Execute SBC A,B instruction (opcode 0x98)  
- **Expected Result**: 
  - A register becomes 0x0E (0x10 - 0x01 - 1)
  - Half-carry flag is SET (because 0x0 - 0x1 - 1 requires borrow from bit 4)
  - Carry flag is CLEAR (no overall borrow needed)
  - Zero flag is CLEAR (result is not zero)
  - Subtract flag is SET (always set for SBC)
- **Hardware Reference**: RGBDS GBZ80 section on SBC A,r instructions

### Test Case 2: SBC Without Half-Carry
**Description**: "SBC instruction should clear half-carry flag when low nibble doesn't require borrow"
- **Setup**: Set A register to 0x20, C register to 0x10, carry flag to 0
- **Action**: Execute SBC A,C instruction (opcode 0x99)
- **Expected Result**:
  - A register becomes 0x10 (0x20 - 0x10 - 0) 
  - Half-carry flag is CLEAR (because 0x0 - 0x0 - 0 = 0, no borrow needed)
  - Carry flag is CLEAR (no overall borrow needed)
  - Zero flag is CLEAR (result is not zero)
  - Subtract flag is SET (always set for SBC)
- **Hardware Reference**: RGBDS GBZ80 section on SBC A,r instructions

### Test Case 3: SBC Full Underflow with Both Flags
**Description**: "SBC instruction should set both carry and half-carry flags on full underflow"
- **Setup**: Set A register to 0x00, D register to 0x01, carry flag to 0
- **Action**: Execute SBC A,D instruction (opcode 0x9A)
- **Expected Result**:
  - A register becomes 0xFF (0x00 - 0x01 - 0 underflows to 255)
  - Half-carry flag is SET (because 0x0 - 0x1 - 0 requires borrow)
  - Carry flag is SET (because overall operation requires borrow)
  - Zero flag is CLEAR (result is not zero)  
  - Subtract flag is SET (always set for SBC)
- **Hardware Reference**: RGBDS GBZ80 section on SBC A,r instructions

### Test Case 4: All SBC Variants Consistency  
**Description**: "All SBC A,r instructions should use identical half-carry calculation logic"
- **Setup**: Test identical scenarios across all SBC variants (0x98-0x9D)
- **Action**: Execute SBC A,E (0x9B), SBC A,H (0x9C), SBC A,L (0x9D) with same values
- **Expected Result**: All should produce identical flag behavior for identical input values
- **Hardware Reference**: RGBDS GBZ80 confirms consistent behavior across register variants

## Test Cases for DE Register-Immediate Operations (04-op r,imm.gb)

### Test Case 5: DE Register Immediate Load Investigation
**Description**: "Investigate which DE register immediate operation causes 'DE Failed' output"
- **Setup**: Enable detailed instruction debugging for 04-op r,imm.gb test ROM
- **Action**: Run test ROM with instruction-level tracing until "DE Failed" appears
- **Expected Investigation**: 
  - Identify exact instruction opcode that precedes "DE Failed" output
  - Check if it's LD DE,n16, ADD/SUB involving DE, or flag-setting operation
  - Compare our implementation with RGBDS specification for identified instruction
- **Follow-up**: Create specific test case once failing instruction is identified

### Test Case 6: 16-bit Register Pair Load Accuracy
**Description**: "16-bit immediate loads to DE should follow correct byte order and timing"
- **Setup**: Clear DE register pair (D=0x00, E=0x00)
- **Action**: Execute LD DE,0x1234 if this instruction exists and is suspected
- **Expected Result**:
  - D register becomes 0x12 (high byte)  
  - E register becomes 0x34 (low byte)
  - No flags should be affected
  - Instruction should take correct number of cycles
- **Hardware Reference**: RGBDS GBZ80 section on 16-bit loads

## Test Cases for Accumulator-Memory Operations (11-op a,(hl).gb)

### Test Case 7: Memory Load Through HL Investigation
**Description**: "Investigate which accumulator-memory operation fails in 11-op a,(hl).gb"
- **Setup**: Enable debugging for 11-op a,(hl).gb test ROM execution
- **Action**: Run test ROM with memory access tracing until failure
- **Expected Investigation**:
  - Identify specific memory operation causing test failure
  - Check if it's load, store, or arithmetic operation with (HL)
  - Verify memory timing and flag calculations
- **Follow-up**: Create specific test cases once failing operation is identified

### Test Case 8: HL Memory Access Timing
**Description**: "Memory operations through HL should take correct cycle counts"
- **Setup**: Set HL to valid memory address (e.g., 0x8000), place known value at that address
- **Action**: Execute various A,(HL) operations (LD, ADD, SUB, etc.)
- **Expected Result**:
  - Memory reads should take correct number of cycles
  - Flag calculations should match RGBDS specification  
  - No MMU access violations or timing issues
- **Hardware Reference**: RGBDS GBZ80 section on memory operations

## Integration Test Cases

### Test Case 9: Regression Prevention
**Description**: "Verify fixes don't break currently passing Blargg test ROMs"
- **Setup**: Run all 11 Blargg test ROMs after each individual fix
- **Action**: Execute complete test suite with each incremental change
- **Expected Result**: 
  - All previously passing tests (01, 02, 03, 05, 06, 07, 08, 10) remain passing
  - Target failing test shows improvement or resolution
  - No new failures introduced
- **Success Metric**: Maintain or improve current 8/11 passing rate

### Test Case 10: 11/11 Completion Verification
**Description**: "Confirm 100% Blargg test ROM completion after all fixes"
- **Setup**: Apply all hardware accuracy fixes from specifications
- **Action**: Run complete Blargg CPU instruction test suite
- **Expected Result**:
  - All 11 test ROMs output "Passed" instead of "Failed"
  - No timeouts or infinite loops in any test ROM
  - Serial output matches expected patterns exactly
- **Success Metric**: 11/11 tests passing (100% hardware accuracy achievement)

## Implementation Validation

### Test Case 11: Hardware Accuracy Confirmation
**Description**: "Verify emulator behavior matches real Game Boy DMG hardware"
- **Setup**: Compare test ROM outputs with known real hardware results
- **Action**: Cross-validate against Mealybug Tearoom tests if applicable
- **Expected Result**:
  - Flag calculations match hardware behavior exactly
  - Timing matches hardware cycle counts  
  - No deviation from authentic Game Boy behavior
- **Hardware Reference**: Real DMG hardware test ROM execution results

---

## Engineering Implementation Notes

**Priority Order**:
1. **HIGH**: SBC half-carry flag fix (Test Cases 1-4) - Clear root cause identified
2. **MEDIUM**: DE register investigation (Test Cases 5-6) - Requires debugging first  
3. **MEDIUM**: Memory operations investigation (Test Cases 7-8) - Requires analysis
4. **CRITICAL**: Integration testing (Test Cases 9-11) - Ensures no regressions

**Test Implementation**:
- All test cases should be implemented as Jest tests in appropriate test files
- Use specific register values and opcodes as documented  
- Include RGBDS documentation references in test comments
- Validate against actual Blargg test ROM execution results

**Success Criteria**:
- Each test case should pass when implemented correctly
- Fixes should be minimal and targeted to specific issues
- No regressions in existing functionality
- 100% Blargg test ROM completion achieved

---

*Generated by Product Owner for direct engineering implementation*  
*Date: 2025-08-09*  
*Status: Ready for Jest Test Implementation*