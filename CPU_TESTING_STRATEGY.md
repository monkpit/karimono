# Game Boy DMG CPU Hardware Accuracy Testing Strategy

## 🎯 MISSION: Achieve 11/11 Blargg Test Compliance

This comprehensive testing strategy addresses the identified hardware accuracy bugs and provides a systematic path to full Game Boy DMG emulator compliance.

## 📊 Current Status

**PASSING (6/11)**:
- ✅ 01-special.gb - Special Instructions  
- ✅ 02-interrupts.gb - Interrupt Handling
- ✅ 03-op sp,hl.gb - Stack Pointer Operations
- ✅ 06-ld r,r.gb - Register-to-Register Loads  
- ✅ 07-jr,jp,call,ret,rst.gb - Control Flow
- ✅ 08-misc instrs.gb - Miscellaneous Instructions

**FAILING (5/11)**:
- ❌ 04-op r,imm.gb - Register-Immediate Operations (SBC A,n8 half-carry bug)
- ❌ 05-op rp.gb - Register Pair Operations (ADD HL family half-carry bugs)
- ❌ 09-op r,r.gb - Register-to-Register Operations
- ❌ 10-bit ops.gb - Bit Operations
- ❌ 11-op a,(hl).gb - Accumulator-Memory Operations

## 🐛 Identified Critical Bugs

### 1. ADD HL Family Half-Carry Bug (4 Instructions)
- **Instructions**: 0x09 ADD HL,BC, 0x19 ADD HL,DE, 0x29 ADD HL,HL, 0x39 ADD HL,SP
- **Issue**: Incorrect half-carry flag calculation (bit 11 → bit 12 carry)
- **Impact**: Causes "05-op rp" Blargg test failure
- **RGBDS Spec**: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#ADD_HL_rr

### 2. SBC A,n8 Half-Carry Bug (1 Instruction)
- **Instruction**: 0xDE SBC A,n8
- **Issue**: Incorrect half-borrow flag calculation  
- **Impact**: Causes "04-op r,imm" Blargg test failure
- **RGBDS Spec**: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#SBC_A_n8

### 3. RETI Bug (FIXED)
- **Status**: ✅ Already resolved by Product Owner

## 🧪 Testing Framework Architecture

### Phase 1: Targeted Bug Fixes (TDD Approach)

#### 1.1 ADD HL Family Half-Carry Tests
**File**: `/tests/emulator/cpu/unit/add-hl-family.half-carry.test.ts`

**TDD Workflow**:
1. **RED**: Run tests - all half-carry assertions FAIL
2. **GREEN**: Fix CPU implementation for bit 11 carry detection
3. **REFACTOR**: Clean up while keeping tests green

**Test Commands**:
```bash
# Run ADD HL tests
npm run test:add-hl

# Watch mode for TDD
npm run test:add-hl -- --watch
```

**Key Test Cases**:
- Boundary case: 0x0FFF + 0x0001 = 0x1000 (H=1)
- Double HL: 0x0800 + 0x0800 = 0x1000 (H=1)  
- No half-carry: 0x0700 + 0x0200 = 0x0900 (H=0)
- Maximum values: 0xFFFF + 0x0001 = 0x0000 (H=1, C=1)

#### 1.2 SBC A,n8 Half-Carry Tests
**File**: `/tests/emulator/cpu/unit/sbc-a-imm.half-carry.test.ts`

**TDD Workflow**:
1. **RED**: Run tests - half-borrow assertions FAIL  
2. **GREEN**: Fix CPU SBC implementation for half-borrow detection
3. **REFACTOR**: Clean up implementation

**Test Commands**:
```bash
# Run SBC tests
npm run test:sbc

# Watch mode for TDD
npm run test:sbc -- --watch
```

**Key Test Cases**:
- Half-borrow: A=0x10, n8=0x01, C=0 → H=1 (0-1 needs borrow)
- With carry: A=0x00, n8=0x01, C=1 → H=1, C=1, result=0xFE
- No borrow: A=0xFF, n8=0x01, C=0 → H=0, C=0, result=0xFE

### Phase 2: Regression Protection

#### 2.1 Regression Test Suite
**File**: `/tests/emulator/integration/blargg.regression.test.ts`

**Purpose**: Protect the 6 currently PASSING Blargg tests from regression

**Test Commands**:
```bash
# Run regression protection
npm run test:regression

# Watch mode during development  
npm run test:regression:watch
```

**CI Integration**: This test MUST pass in GitHub Actions before any PR merge.

**Protected ROMs**:
- 01-special.gb, 02-interrupts.gb, 03-op sp,hl.gb
- 06-ld r,r.gb, 07-jr,jp,call,ret,rst.gb, 08-misc instrs.gb

### Phase 3: Boundary Validation

#### 3.1 RGBDS Hardware Specification Validation
**File**: `/tests/emulator/cpu/unit/rgbds.boundary.validation.test.ts`

**Purpose**: Proactive validation of CPU instructions against RGBDS specification at critical boundaries

**Test Commands**:
```bash
# Run boundary validation
npm run test:boundaries
```

**Coverage**:
- Arithmetic boundaries (0x00, 0xFF, half-carry boundaries)
- Load/store boundaries (all addressing modes)
- Bit operation boundaries (bits 0-7, all registers)
- Flag calculation boundaries (half-carry, carry, zero, sign)
- Memory addressing boundaries (0x0000, 0xFFFF, wraparound)

### Phase 4: Integration Validation  

#### 4.1 Failing Test Progression Framework
**File**: `/tests/emulator/integration/blargg.failing.progression.test.ts`

**Purpose**: Track systematic progression from 6/11 → 11/11 Blargg compliance

**Test Commands**:
```bash
# Run progression analysis
npm run test:progression
```

**Progression Tracking**:
- **Priority 1**: 04-op r,imm.gb (SBC fix), 05-op rp.gb (ADD HL fixes)
- **Priority 2**: 09-op r,r.gb, 10-bit ops.gb  
- **Priority 3**: 11-op a,(hl).gb

## 🔄 TDD Execution Workflow

### Development Cycle
```bash
# 1. Run complete TDD cycle
npm run test:tdd-cycle

# 2. Individual bug fix testing
npm run test:add-hl    # Test ADD HL family
npm run test:sbc       # Test SBC A,n8  
npm run test:regression # Ensure no regressions

# 3. Progress validation
npm run test:progression # Track 11/11 compliance

# 4. Boundary validation
npm run test:boundaries # RGBDS spec compliance
```

### Expected Progression

#### After ADD HL Bug Fixes:
- ✅ 05-op rp.gb: timeout → PASS
- 📈 Blargg compliance: 6/11 → 7/11 (63.6% → 81.8%)

#### After SBC A,n8 Bug Fix:
- ✅ 04-op r,imm.gb: timeout → PASS  
- 📈 Blargg compliance: 7/11 → 8/11 (72.7% → 81.8%)

#### Final Target:
- 🎯 All tests: 11/11 PASS (100% Blargg compliance)
- ✅ Full hardware accuracy achieved

## 📈 Success Metrics

### Technical Metrics
- **Test Coverage**: 100% of identified bug scenarios
- **Regression Protection**: 6/6 existing tests remain PASS
- **Boundary Validation**: RGBDS spec compliance
- **Performance**: No cycle count regressions

### Integration Metrics  
- **CI Pipeline**: All test phases pass
- **Blargg Compliance**: 11/11 test ROMs PASS
- **Hardware Accuracy**: Real DMG behavior matching

## 🚀 CI/CD Integration

### GitHub Actions Pipeline
```yaml
- name: Run Regression Tests (MUST PASS)
  run: npm run test:regression
  
- name: Run Unit Tests
  run: npm test
  
- name: Validate TDD Compliance  
  run: npm run test:tdd-cycle
```

### Local Development
```bash
# Pre-commit validation
npm run validate  # Includes regression tests

# TDD development
npm run test:add-hl -- --watch
npm run test:sbc -- --watch
```

## 📝 Failure Triage Guide

### If Regression Tests Fail:
1. **STOP** all development immediately
2. Identify which protected ROM failed
3. Revert changes until regression source identified  
4. Fix regression before continuing

### If TDD Tests Fail:
1. Verify test expectations against RGBDS specification
2. Check CPU implementation for flag calculation logic
3. Use boundary tests to isolate specific cases
4. Apply minimal fix to make test pass

### If Blargg Tests Fail:
1. Check progression test output for specific failures
2. Use debug mode to capture detailed execution logs
3. Correlate with unit test failures
4. Implement missing instructions or fix identified bugs

## 🔬 Debugging Tools

### Test Execution Options
```bash
# Debug mode with verbose output
npm run test:add-hl -- --verbose

# Single test debugging  
npm test -- --testNamePattern="specific test name"

# Coverage analysis
npm run test:coverage
```

### Output Analysis
- Serial output capture for Blargg ROM debugging
- Instruction-level debugging for first failure isolation
- Cycle count tracking for performance analysis
- Flag state validation for hardware accuracy

## 🎯 Final Target: 11/11 Blargg Compliance

This testing strategy provides a systematic, TDD-driven approach to achieve full Game Boy DMG hardware accuracy. By addressing the identified critical bugs and implementing comprehensive validation, we will transition from 6/11 to 11/11 Blargg test compliance, ensuring our emulator matches real DMG hardware behavior.

**Next Steps**:
1. Run initial bug fix TDD cycles
2. Monitor progression through Blargg test improvements  
3. Address remaining instruction gaps systematically
4. Achieve 11/11 Blargg compliance milestone

---
*Testing strategy developed following strict TDD principles and RGBDS GBZ80 Reference specification compliance.*