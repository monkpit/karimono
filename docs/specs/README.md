# Game Boy DMG Hardware Specifications

## Overview

This directory contains comprehensive hardware specifications for implementing an accurate Game Boy DMG emulator. Each specification provides detailed technical requirements, plain English test cases, and implementation guidance based on authoritative sources including test ROMs, Pan Docs, and GB Dev Wiki.

## Specifications Index

### [SM83 CPU Specifications](./sm83-cpu.md)

Complete CPU architecture specification including:

- **Register Set**: 8-bit and 16-bit registers, flags register details
- **Instruction Set**: Full instruction encoding with cycle timings
- **Timing Requirements**: 4.194304 MHz operation with cycle accuracy
- **Interrupt System**: Precise interrupt handling and priority
- **Test Cases**: Plain English test descriptions for CPU behavior validation
- **References**: opcodes.json, Blargg CPU tests for validation

### [PPU Specifications](./ppu.md)

Picture Processing Unit specification covering:

- **Display Architecture**: 160×144 pixel output with 4 shades
- **PPU Modes**: Mode transitions and timing requirements
- **VRAM Layout**: Tile data organization and memory mapping
- **Rendering Pipeline**: Background, window, and sprite rendering
- **Memory Restrictions**: PPU mode-based CPU access blocking
- **Test Cases**: Pixel-perfect rendering validation requirements
- **References**: Mealybug Tearoom tests for PPU accuracy validation

### [Memory Mapping Specifications](./memory-mapping.md)

Complete memory system specification including:

- **Address Space Layout**: Full 64KB address space organization
- **Memory Bank Controllers**: MBC1, MBC2, MBC3, MBC5 implementations
- **Access Restrictions**: PPU and DMA-based memory blocking
- **I/O Registers**: Hardware register mapping and behavior
- **Memory Timing**: Access timing and performance requirements
- **Test Cases**: Memory access and banking validation
- **References**: Blargg memory timing tests, Pan Docs memory sections

### [Cartridge Loading Specifications](./cartridge-loading.md)

ROM loading and cartridge system specification covering:

- **Header Structure**: Cartridge header parsing and validation
- **MBC Detection**: Automatic MBC type identification
- **ROM Loading Process**: File validation and memory initialization
- **Save Data Handling**: Battery-backed RAM and RTC data
- **Error Handling**: Graceful handling of invalid ROM files
- **Test Cases**: ROM loading and save data validation
- **References**: Pan Docs cartridge header, MBC documentation

### [Component Timing Specifications](./component-timing.md)

System-wide timing coordination specification including:

- **Master Clock**: 4.194304 MHz system clock distribution
- **Component Synchronization**: CPU, PPU, timers, APU coordination
- **Frame Timing**: Precise 59.7 FPS frame generation
- **Interrupt Timing**: Exact interrupt handling coordination
- **Memory Arbitration**: Access priority and timing windows
- **Test Cases**: System timing validation requirements
- **References**: Blargg timing tests, Mealybug PPU timing tests

## Implementation Guidance

### Development Priority Order

1. **Memory System**: Implement basic memory mapping and I/O registers
2. **SM83 CPU**: Core CPU with instruction set and basic timing
3. **Cartridge Loading**: ROM loading and MBC support for testing
4. **Component Timing**: Precise timing coordination between components
5. **PPU Implementation**: Display output with Mealybug test compatibility

### Testing Requirements

Each component MUST pass the specified test ROMs:

- **CPU**: All Blargg CPU instruction tests (cpu_instrs.gb)
- **Timing**: Blargg instruction timing tests (instr_timing.gb)
- **Memory**: Blargg memory timing tests (mem_timing.gb)
- **PPU**: All Mealybug PPU tests with pixel-perfect output
- **System**: Complete game compatibility with popular titles

### Accuracy Standards

- **Cycle Accuracy**: All operations consume exact documented cycles
- **Hardware Matching**: Behavior must match real DMG hardware exactly
- **Test ROM Compliance**: Must pass all referenced hardware test ROMs
- **Edge Case Handling**: Support all documented hardware quirks and edge cases

## Key Design Principles

### Component Encapsulation

Each component has clearly defined interfaces and responsibilities:

- **CPU**: Instruction execution, interrupt handling, register management
- **PPU**: Video output, VRAM management, sprite/background rendering
- **Memory**: Address decoding, banking, access restrictions
- **Cartridge**: ROM/RAM management, MBC implementation, save data

### Testability Focus

All specifications include plain English test cases that translate directly to Jest tests:

- Observable side effects at component boundaries
- No implementation detail testing
- Fast, atomic, debuggable test requirements
- Clear pass/fail criteria for each behavior

### Performance Requirements

- **Native Speed**: Maintain 4.194304 MHz CPU performance
- **Frame Rate**: Stable 59.7 FPS video output
- **Real-time**: Support debugging without performance impact
- **Memory Efficiency**: Minimize garbage collection in hot paths

## References and Validation

### Primary Sources

- **opcodes.json**: Complete SM83 instruction reference (10,000+ lines)
- **Blargg Test ROMs**: Hardware-validated CPU and timing tests
- **Mealybug Tearoom Tests**: Pixel-perfect PPU behavior validation
- **Pan Docs**: Authoritative Game Boy hardware documentation
- **GB Dev Wiki**: Comprehensive hardware behavior reference

### Validation Strategy

1. **Unit Testing**: Individual component behavior validation
2. **Integration Testing**: Component interaction testing
3. **Hardware Testing**: Test ROM compliance verification
4. **Compatibility Testing**: Real game compatibility validation
5. **Performance Testing**: Native speed maintenance verification

## Implementation Notes

### Critical Success Factors

- **Test-Driven Development**: Write tests first, implement to pass tests
- **Hardware Accuracy**: Prioritize accuracy over performance optimizations
- **Incremental Development**: Build components incrementally with continuous testing
- **Documentation Compliance**: Follow specifications exactly without deviation

### Common Pitfalls to Avoid

- Implementing without understanding hardware behavior
- Optimizing before achieving accuracy
- Skipping edge cases and error conditions
- Testing implementation details instead of observable behavior
- Assuming behavior instead of validating against test ROMs

---

These specifications provide the complete foundation for building a highly accurate, performant, and maintainable Game Boy DMG emulator. All implementation decisions should reference these specifications and prioritize hardware accuracy above all other considerations.
