# Karimono-v2 借り物 - Game Boy DMG Emulator

**"Something Borrowed"** - A cycle-accurate Game Boy DMG emulator built with modern engineering principles.

## Project Overview

Karimono-v2 is a high-accuracy Game Boy DMG emulator designed to achieve native hardware performance (4.194304 MHz) while maintaining comprehensive testability through clean architecture. The project emphasizes **hardware accuracy**, **native performance**, and **engineering excellence**.

### Core Principles

- **Hardware Accuracy**: Cycle-accurate emulation validated by hardware test ROMs
- **Native Performance**: Real-time 4MHz CPU and 59.7 FPS rendering
- **Test-Driven Development**: Comprehensive TDD workflow with boundary observation
- **Component Architecture**: Clean interfaces enabling independent development and testing
- **Engineering Excellence**: TypeScript strict mode, zero warnings, 100% test coverage

## Architecture Highlights

### Component-Based Design

```
GameBoySystem
├── CPU (SM83)              // 4.194304 MHz instruction execution
├── PPU (Picture Processor) // 160×144 @ 59.7 FPS rendering
├── MemoryController       // 64KB address space + banking
├── TimerSystem           // DIV/TIMA counters, interrupts
├── InputController       // Joypad input processing
├── CartridgeController   // ROM/RAM + MBC implementations
└── SystemClock          // Master timing coordination
```

### Key Architectural Decisions

- **Hybrid Memory Access**: Direct typed arrays for performance, abstractions for testing
- **Interface-Driven Design**: Clean component boundaries with dependency injection
- **Cycle-Accurate Timing**: Master clock coordination with T-state precision
- **Hardware Validation**: Test ROM integration for accuracy verification

## Performance Targets

- **CPU Performance**: Exactly 4.194304 MHz (4,194,304 cycles/second)
- **Frame Rate**: Precisely 59.727500569606 FPS
- **Memory Throughput**: 4.2M+ operations per second
- **Pixel Rendering**: 1,375,000 pixels per second
- **Real-time Operation**: Zero frame drops, <16ms input latency

## Implementation Status

### ✅ Foundation Complete

- **Architecture Design**: Complete component specifications and interfaces
- **Hardware Research**: Comprehensive analysis of DMG hardware behavior
- **Testing Strategy**: TDD workflow with test ROM integration
- **Performance Analysis**: Optimization strategies for native speed

### 🚧 Current Phase: Implementation

Following our [Implementation Roadmap](/docs/architecture-overview.md#implementation-roadmap):

**Phase 1: Foundation** (Weeks 1-2)

- [ ] TypeScript project setup with strict configuration
- [ ] Complete interface definitions and mock implementations
- [ ] Memory system foundation with I/O registers

**Phase 2: CPU Core** (Weeks 3-4)

- [ ] SM83 CPU with complete instruction set
- [ ] Blargg test ROM integration and validation
- [ ] Performance optimization for 4MHz target

**Phase 3-6**: PPU, System Integration, Optimization (See roadmap for details)

## Hardware Validation

### Test ROM Integration

- **Blargg Test Suite**: CPU instruction and timing accuracy validation
- **Mealybug Tearoom**: Pixel-perfect PPU behavior validation
- **Hardware Compatibility**: Real Game Boy test ROM compliance

### Accuracy Standards

- Pass all Blargg CPU instruction tests (`cpu_instrs.gb`)
- Pass all Mealybug PPU tests with pixel-perfect output
- Cycle-accurate timing for all operations
- Support for major MBC types (MBC1, MBC2, MBC3, MBC5)

## Development Standards

### Code Quality

- **TypeScript Strict Mode**: Full type safety, zero `any` types
- **ESLint + Prettier**: Zero warnings, consistent formatting
- **TDD Workflow**: RED-GREEN-REFACTOR cycle mandatory
- **100% Test Coverage**: Meaningful tests for all components

### Testing Requirements

- **Atomic Tests**: Single responsibility, no dependencies
- **Boundary Observation**: Test component interfaces, not implementation
- **Hardware Validation**: All test ROMs must pass
- **Performance Monitoring**: Continuous timing validation

## Quick Start

### Development Setup

```bash
# Install dependencies
npm install

# Development server with hot reload
npm run dev

# Full validation pipeline (matches CI)
npm run validate

# Individual validation steps
npm run typecheck  # TypeScript compilation
npm run lint       # ESLint validation
npm run test       # Jest test suite
npm run build      # Production build
```

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test.spec.ts

# Watch mode for development
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

## Documentation

### Architecture Documentation

- **[Master Architecture Overview](/docs/architecture-overview.md)**: Complete system design and implementation guide
- **[Component Architecture](/docs/architecture/component-architecture.md)**: Detailed component specifications
- **[Component Interfaces](/docs/architecture/component-interfaces.md)**: TypeScript interface definitions
- **[Performance Optimization](/docs/architecture/performance-optimization.md)**: Speed optimization strategies

### Hardware Specifications

- **[SM83 CPU](/docs/specs/sm83-cpu.md)**: Complete CPU architecture and instruction set
- **[PPU Specifications](/docs/specs/ppu.md)**: Picture processing and rendering requirements
- **[Memory Mapping](/docs/specs/memory-mapping.md)**: Address space and memory bank controllers
- **[Component Timing](/docs/specs/component-timing.md)**: System-wide timing coordination

### Development Guides

- **[Testing Standards](/docs/testing-standards.md)**: TDD workflow and testing requirements
- **[Development Workflow](/docs/development-workflow.md)**: Process guidelines and quality gates

## Technical Highlights

### Performance Optimization

- **Direct Memory Access**: Typed arrays for hot path performance
- **Generated Dispatch Tables**: Optimized instruction execution
- **Zero-Copy Operations**: Minimal memory allocation in critical paths
- **Scanline Rendering**: Efficient PPU pixel pipeline

### Testing Excellence

- **Mock Component System**: Comprehensive test isolation
- **Screenshot Testing**: Pixel-perfect PPU validation
- **Hardware Test ROMs**: Real DMG behavior validation
- **Continuous Performance**: Timing accuracy monitoring

### Engineering Rigor

- **Interface-Driven Design**: Clean component boundaries
- **Dependency Injection**: Testable component composition
- **Error Handling**: Graceful edge case management
- **Documentation**: Comprehensive API and implementation guides

## Resources

### Test ROMs

- **Blargg Tests**: `./tests/resources/blargg/` - CPU and timing validation
- **Mealybug Tearoom**: `./tests/resources/mealybug/` - PPU accuracy tests
- **SM83 Opcodes**: `./tests/resources/opcodes.json` - Complete instruction reference

### Reference Analysis

- **Implementation Research**: `./tests/resources/reference-implementations/`
- **JSMoo Analysis**: TypeScript emulator architecture patterns
- **GameBoy Online**: JavaScript performance optimization techniques

### External References

- **[Pan Docs](https://gbdev.io/pandocs/)**: Authoritative DMG hardware documentation
- **[GB Dev Wiki](https://gbdev.gg8.se/wiki)**: Hardware behavior reference
- **[SM83 Opcodes](https://gbdev.io/gb-opcodes/optables/)**: Visual instruction reference

## Contributing

### Development Process

1. **Review Architecture**: Study documentation in `/docs/`
2. **Follow TDD**: Write failing tests first, implement to pass
3. **Maintain Standards**: Zero warnings, 100% coverage
4. **Hardware Accuracy**: Validate against test ROMs
5. **Performance**: Maintain native DMG timing

### Quality Gates

- All tests pass (including hardware test ROMs)
- TypeScript compilation succeeds (strict mode)
- ESLint validation passes (zero warnings)
- Performance benchmarks maintained
- Documentation updated for changes

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Game Boy Community**: Pan Docs, GB Dev Wiki, and hardware research
- **Test ROM Authors**: Blargg and Mealybug Tearoom for validation ROMs
- **Reference Implementations**: JSMoo and GameBoy Online for architectural insights
- **DMG Hardware**: Nintendo's original Game Boy engineering excellence

---

**Karimono-v2** - Building something borrowed from the best, engineered for excellence.
