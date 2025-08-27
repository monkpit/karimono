# RGBDS Compliance Guide

*Hardware accuracy standards and validation procedures for Karimono-v2*

**Primary Reference**: [RGBDS GBZ80 Reference v0.9.4](https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7)  
**Status**: Mandatory compliance for all CPU instruction implementations  
**Enforcement**: Non-negotiable requirement per CLAUDE.md

## Overview

The RGBDS GBZ80 Reference serves as the definitive hardware specification for all SM83 CPU instruction implementations in Karimono-v2. This guide establishes compliance standards, validation procedures, and implementation requirements to ensure hardware-accurate Game Boy DMG emulation.

## Compliance Requirements

### Mandatory RGBDS Reference Usage

**ALL agents implementing CPU instructions MUST:**
- Reference RGBDS GBZ80 documentation as primary source
- Include RGBDS specification links in code comments
- Validate implementations against RGBDS instruction descriptions
- Document any deviations with explicit justification

**NEVER acceptable:**
- Using secondary sources as primary reference
- Implementing instructions without RGBDS consultation
- Assuming instruction behavior without specification verification

### Agent-Specific Requirements

#### Backend TypeScript Engineer
- **MUST** reference RGBDS for every instruction implementation
- **MUST** include RGBDS specification URL in JSDoc comments
- **MUST** validate flag calculations against RGBDS flag descriptions
- **MUST** implement cycle timing per RGBDS cycle specifications

#### Product Owner  
- **MUST** use RGBDS for every instruction specification and test case
- **MUST** reference specific RGBDS sections in test case documentation
- **MUST** create test specifications based on RGBDS behavior descriptions

#### Test Engineer
- **MUST** validate all test cases against RGBDS documentation  
- **MUST** cite specific RGBDS sections for hardware accuracy validation
- **MUST** ensure test expectations match RGBDS specifications

## RGBDS Documentation Structure

### Core Sections for CPU Implementation

#### Instruction Set Reference
**URL**: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#INSTRUCTION_SET  
**Usage**: Primary reference for all 512 SM83 opcodes  
**Content**: Complete instruction descriptions with syntax, operation, flags, and timing

#### Flag Register Specifications  
**URL**: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#FLAGS  
**Usage**: Authoritative flag calculation specifications  
**Content**: Z, N, H, C flag behavior for all instruction types

#### Addressing Modes
**URL**: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#ADDRESSING_MODES  
**Usage**: Memory addressing and operand specifications  
**Content**: Register, immediate, indirect, and indexed addressing modes

#### Timing Information
**URL**: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#TIMING  
**Usage**: Cycle count validation for all instructions  
**Content**: Base cycles and conditional cycle variations

## Implementation Standards

### Code Documentation Requirements

#### Minimum JSDoc Template
```typescript
/**
 * [Instruction Name] - [Brief Description]
 * 
 * @description [Detailed operation description from RGBDS]
 * @opcode 0x[XX] - [RGBDS instruction syntax]
 * @cycles [N] cycles ([conditional timing if applicable])
 * @flags Z:[flag behavior] N:[flag behavior] H:[flag behavior] C:[flag behavior]
 * @reference https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#[specific-section]
 * 
 * @example
 * // [RGBDS-compliant usage example]
 */
private executeOpcode_0x[XX](): void {
    // Implementation following RGBDS specification
}
```

#### Flag Calculation Documentation
```typescript
// Half-carry flag calculation per RGBDS specification
// Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#[specific-flag-section]
const halfCarry = /* RGBDS-compliant calculation */;
```

### Validation Standards

#### Pre-Implementation Checklist
- [ ] RGBDS instruction specification reviewed
- [ ] Flag behavior documented from RGBDS
- [ ] Cycle timing confirmed from RGBDS  
- [ ] Addressing mode validated against RGBDS
- [ ] Edge cases identified from RGBDS description

#### Post-Implementation Validation
- [ ] Implementation matches RGBDS specification exactly
- [ ] Flag calculations follow RGBDS flag descriptions
- [ ] Cycle timing matches RGBDS timing specification
- [ ] Test cases validate RGBDS-specified behavior
- [ ] Documentation includes RGBDS reference links

## Flag Calculation Standards

### Current Issues and Fixes

#### Half-Carry Flag Compliance
Based on RGBDS specification, the following corrections are required:

**ADD HL Family (16-bit operations)**
```typescript
// RGBDS Specification: Half-carry on bit 11 overflow
// Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#ADD_HL_rr

// Current (incorrect)
const halfCarry = ((this.registers.h & 0x0F) + (src & 0x0F)) > 0x0F;

// RGBDS Compliant (correct)
const halfCarry = ((this.registers.hl & 0x0FFF) + (src & 0x0FFF)) > 0x0FFF;
```

**SBC A,n8 (8-bit subtraction with carry)**
```typescript
// RGBDS Specification: Half-carry if no borrow from bit 4
// Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#SBC_A_n8

// Current (incorrect)  
const halfCarry = ((this.registers.a & 0x0F) - (n8 & 0x0F) - carryBit) < 0;

// RGBDS Compliant (correct)
const halfCarry = ((this.registers.a & 0x0F) < ((n8 & 0x0F) + carryBit));
```

### Flag Specification Reference

#### Zero Flag (Z)
**RGBDS Definition**: Set if the result is zero  
**Implementation**: `this.registers.f.z = (result === 0)`

#### Negative Flag (N)  
**RGBDS Definition**: Set if the operation was a subtraction  
**Implementation**: Set to 1 for SUB/SBC/CP, 0 for ADD/ADC/etc.

#### Half-Carry Flag (H)
**RGBDS Definition**: Set if carry from bit 3 (8-bit) or bit 11 (16-bit)  
**Implementation**: Follow specific RGBDS calculations for each instruction type

#### Carry Flag (C)
**RGBDS Definition**: Set if carry from bit 7 (8-bit) or bit 15 (16-bit)  
**Implementation**: `this.registers.f.c = (result > 0xFF)` for 8-bit operations

## Validation Procedures

### RGBDS Compliance Testing

#### Test Case Validation
```typescript
describe('RGBDS Compliance: ADD HL,BC', () => {
    it('should set half-carry flag per RGBDS specification', () => {
        // Test case based on RGBDS bit 11 overflow specification
        // Reference: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#ADD_HL_rr
        
        cpu.registers.hl = 0x0FFF;  // Bit 11 boundary condition
        cpu.registers.bc = 0x0001;  // Will cause bit 11 overflow
        
        cpu.executeInstruction(); // ADD HL,BC
        
        expect(cpu.registers.f.h).toBe(true); // Half-carry expected per RGBDS
    });
});
```

#### Cross-Reference Validation
- **Primary**: RGBDS GBZ80 Reference specification
- **Secondary**: Blargg test ROM expected behavior  
- **Tertiary**: GameBoy Online implementation (confirmation only)

### Automated Compliance Checking

#### NPM Script Integration
```json
{
  "scripts": {
    "test:rgbds-compliance": "jest tests/rgbds-compliance/",
    "validate:rgbds": "npm run test:rgbds-compliance && npm run test:blargg",
    "lint:rgbds-references": "scripts/validate-rgbds-references.js"
  }
}
```

#### CI/CD Pipeline Validation
```yaml
# .github/workflows/rgbds-compliance.yml
- name: RGBDS Compliance Validation
  run: |
    npm run test:rgbds-compliance
    npm run validate:rgbds
    npm run lint:rgbds-references
```

## Reference Integration

### Primary Documentation Sources

#### RGBDS GBZ80 Reference (Primary)
- **URL**: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7
- **Usage**: All instruction implementations and specifications
- **Status**: Mandatory reference for all CPU work

#### Supporting Documentation (Secondary)
- **opcodes.json**: Local opcode reference for automation
- **Blargg Test ROMs**: Hardware validation test suite
- **GameBoy Online**: Implementation reference for confirmation
- **Pan Docs**: General Game Boy hardware reference

### Documentation Hierarchy
1. **RGBDS GBZ80 Reference** - Primary specification source
2. **Blargg Test ROMs** - Hardware validation ground truth
3. **opcodes.json** - Structured opcode data for automation
4. **GameBoy Online** - Implementation reference for edge cases
5. **Pan Docs** - General hardware context and background

## Quality Assurance

### Review Requirements

#### Code Review Checklist
- [ ] RGBDS reference URL included in JSDoc comments
- [ ] Implementation matches RGBDS specification exactly
- [ ] Flag calculations follow RGBDS flag descriptions
- [ ] Test cases validate RGBDS-specified behavior
- [ ] No deviations from RGBDS without explicit documentation

#### Architecture Review Standards
- **Tech Lead**: Enforces RGBDS compliance as non-negotiable requirement
- **Architecture Reviewer**: Validates architectural compliance with RGBDS patterns
- **Test Engineer**: Ensures all tests reference and validate RGBDS specifications

### Compliance Metrics

#### Success Criteria
- **100% RGBDS Reference Coverage**: All 512 opcodes reference RGBDS documentation
- **Specification Accuracy**: All implementations match RGBDS descriptions exactly
- **Test Validation**: All tests validate RGBDS-specified behavior
- **Documentation Quality**: Complete JSDoc with RGBDS reference links

#### Quality Gates
- **Pre-commit**: RGBDS reference validation in husky hooks
- **CI/CD**: Automated RGBDS compliance testing
- **Code Review**: Manual verification of RGBDS compliance
- **Release**: Blargg test validation confirms RGBDS accuracy

## Common Compliance Issues

### Anti-Patterns to Avoid

#### Incomplete Reference Documentation
```typescript
// BAD: No RGBDS reference
private executeOpcode_0x09(): void {
    // ADD HL,BC implementation
}

// GOOD: Complete RGBDS reference  
/**
 * ADD HL,BC - Add BC to HL
 * @reference https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7#ADD_HL_rr
 */
private executeOpcode_0x09(): void {
    // Implementation following RGBDS specification
}
```

#### Incorrect Flag Calculations
```typescript
// BAD: Assumption-based flag calculation
const halfCarry = (result & 0x10) !== 0;

// GOOD: RGBDS-specified flag calculation
// Half-carry on bit 11 overflow per RGBDS specification
const halfCarry = ((this.registers.hl & 0x0FFF) + (src & 0x0FFF)) > 0x0FFF;
```

#### Secondary Source Primary Usage
```typescript
// BAD: Using secondary source as primary reference
// Implementation based on GameBoy Online code

// GOOD: RGBDS primary with secondary confirmation
// Implementation per RGBDS specification
// Cross-validated against GameBoy Online for confirmation
```

## Maintenance and Updates

### RGBDS Version Management
- **Current Version**: v0.9.4
- **Update Process**: Review and validate against new RGBDS releases
- **Compatibility**: Maintain compatibility with referenced RGBDS version
- **Migration**: Document any specification changes in new RGBDS versions

### Continuous Compliance
- **Regular Audits**: Monthly RGBDS compliance review
- **Version Tracking**: Monitor RGBDS updates and specification changes
- **Test Maintenance**: Update test cases to reflect RGBDS specification updates
- **Documentation Updates**: Keep reference links current with RGBDS versions

---

**Enforcement**: This compliance guide is enforced by all review agents and is a non-negotiable requirement for all CPU instruction work in Karimono-v2. Deviation from RGBDS compliance will result in work rejection and requires human approval with explicit justification.