# SM83 Opcode Codegen Build Integration Strategy

## Overview

This document outlines the comprehensive build integration and CI/CD strategy for generating and validating 512 SM83 CPU instructions. The system maintains strict quality standards while efficiently supporting incremental development.

## Architecture

### Code Generation Pipeline

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ opcodes.json    │───▶│ generateInstr.ts │───▶│ Generated Files │
│ (Specification) │    │ (Code Generator) │    │ (512 Instrs)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ Quality Gates    │
                       │ • ESLint         │
                       │ • Prettier       │
                       │ • TypeScript     │
                       │ • Jest Tests     │
                       └──────────────────┘
```

### Integration Points

1. **Build System**: Integrated with npm scripts and Vite build pipeline
2. **CI/CD Pipeline**: GitHub Actions with smart caching and change detection
3. **Pre-commit Hooks**: Husky + lint-staged for quality enforcement
4. **Development Workflow**: Incremental generation supporting TDD principles

## NPM Scripts

### Core Generation Commands

```bash
# Generate all 512 CPU instructions
npm run codegen

# Check if generated files are current
npm run codegen:check

# Force complete regeneration with formatting
npm run codegen:force

# Clean all generated files
npm run codegen:clean

# Verify generated code quality
npm run codegen:verify

# Incremental generation (gradual migration)
npm run codegen:incremental

# Intelligent change detection
npm run codegen:changes
```

### Integration with Existing Workflow

```bash
# Full validation (includes codegen check)
npm run validate

# Build (includes codegen validation)
npm run build

# Development server (includes codegen check)
npm run dev
```

## CI/CD Pipeline Integration

### GitHub Actions Workflow

The CI pipeline includes a dedicated `codegen-validation` job that:

1. **Smart Caching**: Caches generated files based on opcodes.json and script hashes
2. **Change Detection**: Only regenerates when specification or scripts change
3. **Quality Gates**: Ensures generated code passes same standards as hand-written code
4. **Performance Optimization**: Parallel execution with other validation jobs

### Pipeline Stages

```yaml
setup → [lint | codegen-validation | format | typecheck | test] → build
```

### Caching Strategy

- **Generated Files**: `src/emulator/cpu/generated` cached by opcodes.json + script hashes
- **Dependencies**: Standard node_modules caching
- **Build Artifacts**: TypeScript compilation and Vite build outputs

## Incremental Generation Strategy

### Phase-Based Implementation

1. **Foundation**: Code generation infrastructure and quality gates
2. **Missing Instructions**: Generate instructions not yet implemented
3. **Progressive Migration**: Gradually replace hand-written with generated code
4. **Validation**: Comprehensive testing with hardware test ROMs

### Compatibility Bridge

The system includes a compatibility bridge (`CPUInstructionBridge.ts`) that:

- Routes instructions to appropriate implementation (hand-written vs generated)
- Maintains perfect compatibility during migration
- Provides migration statistics and progress tracking
- Ensures no regression in existing functionality

## Performance Optimizations

### Intelligent Change Detection

- **File Hashing**: SHA-256 content hashing for precise change detection
- **Dependency Analysis**: Impact assessment for changed files
- **Incremental Updates**: Only regenerate affected components
- **Cache Management**: Smart invalidation and persistence

### Build Performance

| Operation | Target Time | Optimization |
|-----------|-------------|--------------|
| Change Detection | < 100ms | File hashing + caching |
| Full Generation | < 5s | Parallel template processing |
| Incremental Gen | < 1s | Smart change detection |
| CI Pipeline | < 5min | Comprehensive caching |

### Development Workflow

- **Pre-commit Validation**: Fast change detection in lint-staged
- **Hot Module Reload**: Vite development server integration
- **Test Feedback**: Immediate validation with Jest watch mode

## Quality Assurance

### Generated Code Standards

All generated code must:

- ✅ Pass ESLint strict mode validation
- ✅ Pass Prettier formatting requirements
- ✅ Compile with TypeScript strict mode
- ✅ Include comprehensive JSDoc documentation
- ✅ Pass all Jest test suites
- ✅ Validate against hardware test ROMs

### Validation Pipeline

```bash
codegen:check → typecheck → lint → format → test → build
```

### Hardware Validation

- **Blargg Test ROMs**: CPU instruction accuracy validation
- **Mealybug Tearoom**: PPU timing and behavior validation
- **Integration Tests**: Full emulator functionality validation

## File Structure

```
src/emulator/cpu/
├── CPU.ts                    # Hand-written CPU (during migration)
├── CPUInstructionBridge.ts   # Compatibility bridge
└── generated/                # Generated instruction files
    ├── index.ts              # Main exports
    ├── InstructionExecutor.ts # Unified executor
    ├── IncrementalExecutor.ts # Migration-aware executor
    ├── instructionMap.ts     # Fast opcode lookup
    ├── unprefixed/           # 256 unprefixed instructions
    │   ├── index.ts
    │   ├── nop.ts
    │   ├── ld.ts
    │   └── ...
    └── cbprefixed/           # 256 CB-prefixed instructions
        ├── index.ts
        ├── bit.ts
        ├── res.ts
        └── ...

scripts/codegen/
├── generateInstructions.ts   # Main code generator
├── checkGenerated.ts        # Validation script
├── incrementalGeneration.ts # Migration strategy
├── changeDetection.ts       # Smart change detection
└── cleanGenerated.ts        # Cleanup utility

.cache/codegen/
└── file-hashes.json         # Change detection cache
```

## Development Commands

### Daily Development

```bash
# Start development with change detection
npm run dev

# Run tests for CPU changes
npm run test:cpu

# Validate entire codebase
npm run validate
```

### Code Generation

```bash
# Check if regeneration needed
npm run codegen:changes

# Generate missing instructions
npm run codegen:incremental

# Force complete regeneration
npm run codegen:force
```

### Migration Workflow

```bash
# Analyze current migration status
npm run codegen:incremental

# Migrate specific instruction
npm run test:cpu -- --testNamePatterns="ADD"

# Validate migration step
npm run codegen:verify
```

## Error Handling

### Common Issues and Solutions

1. **Generated files outdated**: Run `npm run codegen:force`
2. **Validation failures**: Check TypeScript/ESLint errors in generated code
3. **Performance degradation**: Use `npm run codegen:changes` for analysis
4. **CI cache issues**: Clear caches and regenerate files

### Debugging

```bash
# Verbose generation with debugging
DEBUG=codegen npm run codegen

# Analyze change detection
npm run codegen:changes

# Validate specific instruction
npm test -- --testNamePatterns="0x00"
```

## Configuration Files

### Package.json Scripts

All codegen commands are defined in `package.json` scripts section.

### Lint-staged Configuration

`.lintstagedrc.json` configures pre-commit validation for:
- TypeScript files (ESLint + Prettier)
- JSON/Markdown files (Prettier)
- Codegen trigger files (change detection)

### GitHub Actions

`.github/workflows/ci.yml` includes:
- Parallel codegen validation job
- Smart caching configuration
- Performance optimization

## Monitoring and Metrics

### Build Performance

The system tracks:
- Generation time for 512 instructions
- Change detection performance
- CI pipeline duration
- Cache hit rates

### Quality Metrics

- Test coverage for generated code
- TypeScript strict mode compliance
- ESLint rule adherence
- Hardware test ROM pass rates

## Future Optimizations

### Planned Improvements

1. **Template Caching**: Cache compiled instruction templates
2. **Parallel Generation**: Generate instruction categories concurrently
3. **Smart Invalidation**: More granular dependency tracking
4. **Build Artifacts**: Cross-CI run artifact caching

### Performance Targets

- **Full Generation**: < 3s (currently 5s target)
- **Change Detection**: < 50ms (currently 100ms target)
- **CI Overhead**: < 15s (currently 30s target)

## Conclusion

This build integration strategy provides:

- **Efficiency**: Smart change detection and incremental generation
- **Quality**: Strict validation matching hand-written code standards
- **Reliability**: Comprehensive testing and hardware validation
- **Performance**: Optimized for development and CI workflows
- **Maintainability**: Clear separation and migration strategy

The system enables efficient development of 512 CPU instructions while maintaining the project's strict engineering principles and quality standards.

---

*Generated on: $(date)*
*Last updated: $(git log -1 --format=%cd)*
