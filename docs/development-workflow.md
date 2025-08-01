# Development Workflow

## Agent Collaboration Process

### Code Change Lifecycle
1. **Engineer Phase**
   - Write failing test first (RED)
   - Implement minimal code to pass test (GREEN) 
   - Refactor with passing tests (REFACTOR)
   - Run local validation pipeline

2. **Review Phase**
   - Architecture Reviewer: Validates encapsulation, composition, design principles
   - Test Engineer: Validates TDD compliance, test quality, boundary testing
   - DevOps Engineer: Reviews CI/CD impacts, deployment considerations

3. **Approval Phase**
   - All review agents must approve
   - Human final approval required
   - Only then commit and push

### Local Validation Pipeline
Must mirror GitHub Actions exactly:
```bash
npm run lint        # ESLint strict compliance
npm run typecheck   # TypeScript strict mode compilation  
npm test            # Jest test suite
npm run build       # Vite production build
```

### Pre-commit Enforcement
- Husky runs validation pipeline on commit
- lint-staged processes only changed files
- No commits allowed with failing validation
- No bypassing hooks without documented approval

## Test Quality Standards

### What Makes a Good Test
- **Atomic**: Tests one specific behavior
- **Fast**: Runs quickly, no unnecessary setup
- **Debuggable**: Clear failure messages, focused scope
- **Boundary-focused**: Tests contracts/interfaces, not implementation

### Test Anti-patterns (FORBIDDEN)
- Testing implementation details
- Faking data to make tests pass
- Disabling tests to resolve failures
- Testing through multiple layers unnecessarily
- Console.log debugging instead of focused test design

### Screenshot Testing Process
1. Implement emulator feature
2. Create test that calls `ppu.screenshot()` or `display.screenshot()`
3. Human reviews and approves initial screenshot
4. Screenshot becomes golden baseline
5. Future changes compared against baseline
6. Human approval required for baseline updates

## Repository Structure

```
karimono-v2/
├── src/                    # Source code
│   ├── emulator/          # Core emulator components
│   │   ├── cpu/           # SM83 CPU implementation
│   │   ├── ppu/           # Picture Processing Unit
│   │   ├── memory/        # Memory management
│   │   └── display/       # Display rendering
│   └── ui/                # Frontend components
├── tests/                 # Test files
│   ├── resources/         # Test ROMs and data
│   │   ├── mealybug/      # Mealybug Tearoom tests (submodule)
│   │   ├── blargg/        # Blargg hardware tests (submodule)
│   │   └── opcodes.json   # SM83 instruction reference
│   └── __snapshots__/     # Jest screenshot baselines
├── docs/                  # Documentation
└── .github/workflows/     # CI/CD pipeline
```