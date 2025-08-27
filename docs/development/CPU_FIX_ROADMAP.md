# CPU Fix Roadmap

*Detailed implementation plan for achieving 100% Blargg test validation*

**Target**: 6/11 → 11/11 Blargg Test Success  
**Timeline**: Sprint 1 (Est. 3-5 days)  
**Status**: Ready for Implementation

## Overview

This roadmap provides a systematic approach to fixing the 5 identified CPU instruction bugs that prevent 100% Blargg test validation. All issues are isolated to half-carry flag calculation errors in specific instruction families.

## Bug Inventory

### Critical Bugs (5 Instructions)

#### 1. ADD HL Family (4 Instructions) - Half-Carry Flag Errors
- **ADD HL,BC** (Opcode: 0x09)
- **ADD HL,DE** (Opcode: 0x19) 
- **ADD HL,HL** (Opcode: 0x29)
- **ADD HL,SP** (Opcode: 0x39)

**Problem**: Half-carry flag (H) calculation incorrect for 16-bit addition operations
**Impact**: Affects Blargg tests 09-op r,r and related instruction validation
**RGBDS Reference**: Half-carry occurs on bit 11 overflow in 16-bit operations

#### 2. SBC A,n8 (1 Instruction) - Half-Carry Flag Error
- **SBC A,n8** (Opcode: 0xDE)

**Problem**: Half-carry flag (H) calculation incorrect for subtract with carry operations
**Impact**: Affects Blargg tests with immediate subtraction operations
**RGBDS Reference**: Half-carry occurs on bit 3 overflow in 8-bit subtract operations

## Implementation Strategy

### Phase 1: Preparation (Day 1)
**Responsible**: Test Engineer + Backend TypeScript Engineer

#### Task 1.1: Test Infrastructure Setup
```bash
# Create targeted test files
npm run test:add-hl-family      # Tests ADD HL,BC/DE/HL/SP
npm run test:sbc-a-n8          # Tests SBC A,n8
npm run test:half-carry-validation  # General half-carry validation
```

#### Task 1.2: RGBDS Reference Analysis
- Extract exact half-carry calculation specifications from RGBDS documentation
- Document expected behavior for each failing instruction
- Create reference test cases based on RGBDS specification

**Deliverables**:
- 5 new test files with failing tests for each instruction
- RGBDS half-carry specification documentation
- Baseline test results before fixes

### Phase 2: ADD HL Family Fixes (Days 2-3)
**Responsible**: Backend TypeScript Engineer

#### Task 2.1: ADD HL,BC Fix (Opcode 0x09)
**Current Implementation Issue**: Half-carry flag calculation on bit 11
**RGBDS Specification**: H flag set if carry from bit 11
**Expected Fix**:
```typescript
// Before (incorrect)
const halfCarry = ((this.registers.h & 0x0F) + (this.registers.b & 0x0F)) > 0x0F;

// After (correct - bit 11 calculation)
const halfCarry = ((this.registers.hl & 0x0FFF) + (this.registers.bc & 0x0FFF)) > 0x0FFF;
```

**Validation**: 
- Run targeted ADD HL,BC test
- Verify Blargg test progression
- RGBDS compliance check

#### Task 2.2: ADD HL,DE Fix (Opcode 0x19)
Same pattern as ADD HL,BC - apply identical half-carry logic fix

#### Task 2.3: ADD HL,HL Fix (Opcode 0x29)
Same pattern as ADD HL,BC - apply identical half-carry logic fix

#### Task 2.4: ADD HL,SP Fix (Opcode 0x39)
Same pattern as ADD HL,BC - apply identical half-carry logic fix

**Timeline**: 1 instruction per day with full validation
**Success Criteria**: All 4 ADD HL instructions pass individual tests and contribute to Blargg test progression

### Phase 3: SBC A,n8 Fix (Day 4)
**Responsible**: Backend TypeScript Engineer

#### Task 3.1: SBC A,n8 Fix (Opcode 0xDE)
**Current Implementation Issue**: Half-carry flag calculation on bit 3 for subtract with carry
**RGBDS Specification**: H flag set if no borrow from bit 4
**Expected Fix**:
```typescript
// Before (incorrect)
const halfCarry = ((this.registers.a & 0x0F) - (n8 & 0x0F) - carryBit) < 0;

// After (correct - no borrow from bit 4)
const halfCarry = ((this.registers.a & 0x0F) < ((n8 & 0x0F) + carryBit));
```

**Validation**:
- Run targeted SBC A,n8 test
- Verify immediate subtraction operations
- RGBDS compliance check

### Phase 4: Integration and Validation (Day 5)
**Responsible**: Test Engineer + Tech Lead

#### Task 4.1: Full Test Suite Validation
```bash
# Run complete validation suite
npm run validate                    # Full pipeline validation
npm run test:blargg                # All 11 Blargg tests
npm run test:cpu-instructions      # All CPU instruction tests
```

#### Task 4.2: Blargg Test Progression Validation
Expected progression after all fixes:
- **Current**: 6/11 tests passing
- **Target**: 11/11 tests passing
- **Verification**: All 5 previously failing tests now pass

#### Task 4.3: Regression Testing
- Verify all previously passing tests still pass
- Check for any unintended side effects
- Validate game compatibility remains intact

## Dependencies and Prerequisites

### Technical Dependencies
- **RGBDS GBZ80 Reference**: Primary specification source
- **Blargg Test ROMs**: Validation test suite
- **Jest Testing Framework**: Test execution and validation
- **TypeScript Compiler**: Code compilation and type checking

### Team Dependencies
- **Backend TypeScript Engineer**: Implementation of instruction fixes
- **Test Engineer**: TDD validation and test creation
- **Product Owner**: RGBDS specification research and validation
- **Tech Lead**: Quality assurance and standards enforcement

### Resource Dependencies
- **Development Environment**: Full Karimono-v2 setup with test ROMs
- **Reference Documentation**: RGBDS GBZ80 specification access
- **CI/CD Pipeline**: GitHub Actions for automated validation

## Risk Management

### Technical Risks

#### Risk: Half-Carry Logic Complexity
**Probability**: Medium  
**Impact**: High  
**Mitigation**: 
- Reference multiple authoritative sources (RGBDS, GameBoy Online)
- Implement comprehensive test cases for edge conditions
- Validate against real hardware test ROM results

#### Risk: Regression in Working Instructions
**Probability**: Low  
**Impact**: High  
**Mitigation**: 
- Full regression test suite after each fix
- Incremental implementation with validation checkpoints
- Maintain comprehensive test coverage

#### Risk: RGBDS Specification Interpretation
**Probability**: Low  
**Impact**: Medium  
**Mitigation**: 
- Cross-reference with multiple sources
- Validate against Blargg test ROM expected outcomes
- Consult GameBoy Online implementation for confirmation

### Timeline Risks

#### Risk: Complex Debug Requirements
**Probability**: Medium  
**Impact**: Medium  
**Mitigation**: 
- Allocate buffer time in 5-day timeline
- Implement one instruction at a time with full validation
- Maintain detailed debug logs and test output

## Success Metrics

### Primary Success Criteria
- **11/11 Blargg CPU tests passing** (100% success rate)
- **All 5 identified instructions fixed** with correct half-carry flag behavior
- **Zero regression** in previously working functionality
- **Full RGBDS compliance** for all flag calculations

### Secondary Success Criteria
- **Comprehensive test coverage** for all fixed instructions
- **Clear documentation** of all changes and fixes
- **Performance maintenance** - no degradation in CPU execution speed
- **Code quality standards** - TypeScript strict mode compliance maintained

### Validation Checkpoints
1. **Day 1**: Test infrastructure complete and failing tests created
2. **Day 2**: First ADD HL instruction fixed and validated  
3. **Day 3**: All ADD HL family instructions fixed
4. **Day 4**: SBC A,n8 instruction fixed
5. **Day 5**: 11/11 Blargg tests passing with full validation

## Follow-up Actions

### Immediate (Post-Fix)
- Update CPU_IMPLEMENTATION_STATUS.md with 100% success metrics
- Document lessons learned and RGBDS interpretation clarifications
- Archive debug information and test results for future reference

### Short-term (Next Sprint)
- Implement automated opcode generation to prevent similar issues
- Add comprehensive JSDoc documentation for all flag calculations
- Create additional test cases for edge conditions

### Long-term (Future Sprints)
- Performance optimization for instruction execution
- Integration with automated CI/CD validation pipeline
- Hardware accuracy testing against additional test ROM suites

---

**Implementation Notes**:
- All fixes must reference RGBDS GBZ80 specification as primary source
- TDD methodology required - failing tests first, then implementation
- Each instruction fix requires individual validation before proceeding
- Full pipeline validation required before marking roadmap complete