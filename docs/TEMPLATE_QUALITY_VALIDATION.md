# Template Quality Validation System

## Overview

The Template Quality Validation System ensures that all generated SM83 CPU instruction templates maintain architectural integrity, hardware accuracy, and code quality standards. This comprehensive validation system analyzes all 512 generated CPU instruction methods against the authoritative opcodes.json specification and RGBDS GBZ80 documentation.

## Features

### 🔍 **Comprehensive Validation Categories**

1. **Hardware Accuracy Validation**
   - ✅ Cycle timing matches opcodes.json exactly
   - ✅ Flag calculations follow RGBDS GBZ80 specification patterns
   - ✅ Operand handling matches hardware behavior
   - ✅ Register access patterns are correct (this.registers.*)

2. **Architectural Compliance Validation**
   - ✅ Enhanced Private Method Pattern adherence
   - ✅ Method naming follows executeXXXXX format consistently
   - ✅ Return types are simple number (cycles)
   - ✅ No separate class instantiation, only CPU methods

3. **Code Quality Validation**
   - ✅ TypeScript strict mode compliance checking
   - ✅ Consistent indentation and formatting
   - ✅ Proper JSDoc documentation with RGBDS references
   - ✅ @ts-nocheck validation for generated templates

4. **Integration Validation**
   - ✅ Switch case integration snippets are complete
   - ✅ Method signatures match expected CPU patterns
   - ✅ CB-prefixed handling patterns
   - ✅ Memory access via this.mmu patterns

### 🚀 **CLI Options and Modes**

| Option | Description | Use Case |
|--------|-------------|----------|
| `--incremental` / `-i` | Only validates recently changed files | Quick development checks |
| `--errors-only` / `-e` | Shows only critical errors, suppresses warnings | CI/CD pipelines |
| `--verbose` / `-v` | Detailed output with performance insights | Deep debugging |
| `--help` / `-h` | Shows help information | Learning the system |

## Usage

### 🎯 **NPM Scripts (Recommended)**

```bash
# Full validation with npm script integration
npm run codegen:verify

# Quick incremental validation (CI-friendly)
npm run codegen:verify:quick

# Full validation with detailed insights
npm run codegen:verify:full
```

### 🔧 **Direct CLI Usage**

```bash
# Full validation
npx tsx scripts/codegen/validateTemplates.ts

# Quick incremental check (only recently changed files)
npx tsx scripts/codegen/validateTemplates.ts --incremental

# CI-friendly mode (errors only, no warnings)
npx tsx scripts/codegen/validateTemplates.ts --errors-only

# Detailed debugging mode
npx tsx scripts/codegen/validateTemplates.ts --verbose

# Combine modes for specific workflows
npx tsx scripts/codegen/validateTemplates.ts --incremental --errors-only
```

## Integration with Development Workflow

### 🔄 **Development Process Integration**

1. **Pre-Generation Validation**: Check existing templates before modifications
2. **Post-Generation Validation**: Validate newly generated code
3. **CI/CD Pipeline Integration**: Block deployments on critical errors
4. **Incremental Development**: Quick checks during active development

### 📊 **Quality Metrics**

The validation system provides comprehensive quality metrics:

- **Error Rate**: Percentage of methods with critical errors
- **Warning Rate**: Percentage of methods with quality warnings
- **Template Quality Score**: 100% - error rate
- **Hardware Accuracy**: Compliance with opcodes.json specifications
- **RGBDS Compliance**: Adherence to official documentation

## Validation Report Structure

### ✅ **Successful Validation**
```
🚀 Starting Comprehensive Template Quality Validation...
📁 Filesystem: 58/58 files validated
⚙️ Instructions: 512/512 methods validated
📊 Quality Metrics:
   Error Rate: 0.00% (0/512)
   Warning Rate: 0.00% (0/512)
   Template Quality Score: 100.00%

✅ All template quality checks passed successfully!
```

### ❌ **Failed Validation**
```
🚀 Starting Comprehensive Template Quality Validation...
📁 Filesystem: 58/58 files validated
⚙️ Instructions: 512/512 methods validated
📊 Quality Metrics:
   Error Rate: 2.73% (14/512)
   Warning Rate: 139.84% (716/512)

🚨 CRITICAL ERRORS (14):
  - src/emulator/cpu/generated/unprefixed/jp.ts (executeJPa16C3): 
    Cycle count mismatch. Expected one of [16], got 4.
```

## Error Types and Resolution

### 🚨 **Critical Errors (Blocking)**

| Error Type | Description | Resolution |
|------------|-------------|------------|
| **Hardware Accuracy Violations** | Cycle counts don't match opcodes.json | Update generation templates with correct hardware timing |
| **JSDoc Compliance Issues** | Missing RGBDS references or opcode information | Enhance JSDoc generation patterns |
| **Architectural Violations** | Method naming or structure doesn't follow patterns | Align with Enhanced Private Method Pattern |
| **Integration Issues** | Missing switch/case blocks or malformed integration | Fix template integration generation |

### ⚠️ **Warnings (Non-blocking)**

| Warning Type | Description | Impact |
|--------------|-------------|--------|
| **Flag Implementation Gaps** | Opcodes specify flag behavior but implementation missing | Potential runtime flag calculation errors |
| **Memory Access Patterns** | Non-standard memory access patterns detected | Consistency and maintainability issues |
| **Register Access Patterns** | Unusual register access patterns found | Code clarity and debugging complexity |

## Performance Characteristics

### 📈 **Validation Speed**

- **Full Validation**: ~2-3 seconds for 512 instructions
- **Incremental Mode**: ~0.5-1 second for changed files only
- **Error-Only Mode**: ~1-2 seconds (suppresses warning processing)

### 🎯 **Accuracy Metrics**

- **Hardware Accuracy**: 100% compliance with opcodes.json required
- **RGBDS Compliance**: All instructions must reference official documentation
- **Architectural Compliance**: Zero tolerance for pattern deviations
- **Code Quality**: TypeScript strict mode compliance mandatory

## CI/CD Integration

### 🏗️ **GitHub Actions Integration**

```yaml
- name: Validate Template Quality
  run: npm run codegen:verify:quick
  # Uses --incremental --errors-only for fast CI feedback
```

### 🔐 **Quality Gates**

- **Critical Errors**: Block merge/deployment (exit code 1)
- **Warnings**: Allow merge but report in PR comments
- **Quality Score**: Maintain >97% template quality score
- **Hardware Accuracy**: 100% compliance required

## Advanced Features

### 🧠 **Incremental Validation Intelligence**

The system automatically detects:
- Git repository changes for incremental mode
- File modification timestamps for fallback detection
- Recent development activity patterns

### 📊 **Performance Insights (--verbose mode)**

```
📈 Performance Insights:
   Average methods per file: 8.8
   Overall issue rate: 142.58% (730 issues in 512 methods)
   Template quality score: 97.27% (based on error-free methods)
```

## Best Practices

### 🎯 **Development Workflow**

1. **Pre-commit Hook**: Run `npm run codegen:verify:quick` before commits
2. **Feature Development**: Use incremental mode during active development
3. **Release Preparation**: Run full validation with `--verbose` mode
4. **CI/CD Pipeline**: Use `--errors-only` mode for fast feedback

### 🔧 **Template Quality Maintenance**

1. **Zero Critical Errors**: Maintain zero critical errors at all times
2. **Hardware Accuracy First**: Prioritize hardware compliance over convenience
3. **RGBDS Compliance**: Always reference official documentation
4. **Pattern Consistency**: Follow Enhanced Private Method Pattern strictly

## Future Enhancements

### 🚀 **Planned Features**

- **Performance Benchmarking**: Validate generated code performance characteristics
- **Cross-Reference Validation**: Validate against hardware test ROM requirements
- **Template Complexity Analysis**: Identify overly complex generated methods
- **Integration Testing**: Validate switch/case integration completeness

## Support and Troubleshooting

### 🆘 **Common Issues**

**Q: Validation shows 716 warnings but code works fine**
A: Warnings indicate implementation gaps in flag handling. While non-blocking, they should be addressed for complete hardware accuracy.

**Q: Incremental mode validates all files**
A: This occurs when git status shows no changes. The system falls back to timestamp-based recent file detection.

**Q: Critical errors in JP instruction cycle counts**
A: JP instructions have conditional cycle counts (branch taken vs not taken). Update templates to handle conditional timing correctly.

### 📞 **Getting Help**

- Use `--help` flag for CLI usage information
- Check validation report details for specific error guidance
- Review this documentation for comprehensive usage patterns
- Use `--verbose` mode for detailed diagnostic information