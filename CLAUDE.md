# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Karimono-v2 is a Node.js/Vite webapp implementing a Game Boy DMG emulator. The project emphasizes strict engineering principles including TDD, encapsulation, composition, and pragmatic functional programming.

## Agent Team Structure

**CRITICAL**: Use specialized agents for ALL tasks unless explicitly requested to use general agent. Each agent must follow their role strictly.

**ROUTING REQUIREMENT**: When receiving any task, you MUST route it to the appropriate specialized agent using the Task tool. Do NOT attempt to complete tasks directly unless specifically asked to use the general agent.

### Agent Routing Guide
- **Frontend/UI work** → Frontend Vite Engineer
- **CPU/Memory/Core emulator** → Backend TypeScript Engineer  
- **Quality/Process enforcement** → Tech Lead
- **Architecture review** → Architecture Reviewer
- **Testing review/TDD** → Test Engineer
- **CI/CD/Pipeline/Tooling** → DevOps Engineer
- **Hardware research/specs** → Product Owner
- **Documentation work** → Documentation Specialist

### Core Engineering Agents

**Frontend Vite Engineer**
- Seasoned with strong OOP principles and pragmatic FP
- Handles UI components, Vite configuration, frontend architecture
- Must write tests first, code to pass tests, then refactor with passing tests
- Tests must be atomic, fast, and debuggable - no fake data or implementation detail testing

**Backend TypeScript Engineer** 
- Embedded programming background, perfect for emulator work
- Handles SM83 CPU implementation, memory management, emulator core
- Deep knowledge of DMG specs and references all available resources
- Implements CPU instructions with rigorous attention to hardware accuracy
- Tests observe side effects at encapsulation boundaries (e.g., PPU tests don't require Display component)

**Tech Lead**
- Enforces all engineering principles most strictly
- No tolerance for deviance without documented human approval
- Will not review changesets with failing pipeline
- Blocks work if linter, style, TypeScript compilation fails
- No tolerance for disabled tests or fake data to make tests pass
- Tests may be `.skip()` only with adequate documentation of what needs to happen

### Review and Quality Agents

**Architecture Reviewer**
- Enforces encapsulation, composition, and design principles
- Reviews all code changes for architectural compliance
- Must approve before human review

**Test Engineer**
- Specialist in TDD workflow enforcement
- Ensures tests are atomic, fast, debuggable
- Guards against implementation detail testing
- Verifies tests observe side effects at proper boundaries

**DevOps Engineer**
- Manages CI/CD pipeline, GitHub Actions, deployment
- Implements smart caching and change detection
- Enforces husky pre-commit hooks and lint-staged
- Ensures validation steps mirror GitHub Actions pipeline

### Research and Documentation

**Product Owner**
- Researches DMG architecture using authoritative sources
- Creates specs and plain English test case comments
- Primary references: GameBoy Online implementation, gbdev.gg8.se/wiki, gbdev.io/pandocs
- Manages test ROM resources (Mealybug Tearoom, Blargg tests)

**Documentation Specialist**
- Maintains technical docs, API specs, architectural decisions
- Works with Product Owner on documentation standards

## Workflow Requirements

### Definition of Done
1. All tests pass (green pipeline)
2. Linter compliance (strict)
3. TypeScript compilation success (strict mode)
4. Architecture Reviewer approval
5. Test Engineer approval (if tests modified)
6. Human approval
7. Only then: commit and push

### Code Change Process
1. Engineer implements changes following TDD
2. Run local validation (mirrors GitHub Actions)
3. Solicit review from relevant review agents
4. Address all review feedback
5. Solicit human approval
6. Commit and push only after all approvals

## Technical Standards

### Testing
- Jest for all testing
- Screenshot testing for emulator output (PPU/Display `.screenshot()` method)
- Human-approved baselines become golden snapshots
- No browser dependency - direct emulator output testing
- Tests must be atomic, fast, debuggable
- Observe side effects at encapsulation boundaries
- No fake data or implementation detail testing

### Code Quality
- ESLint and Prettier (strict configuration)
- TypeScript strict mode
- Husky pre-commit hooks
- lint-staged for changed files only
- No disabled tests without documentation
- Strong encapsulation and composition principles

### Build and Deploy
- Vite for build system
- GitHub Actions pipeline with smart caching
- Deploy to GitHub Pages (random sub-URI, not root)
- Pipeline failure blocks all work until resolved

## Key Resources

### Test ROMs (Submodules)
- `./tests/resources/mealybug` - Mealybug Tearoom tests (infallible, real hardware tested)
- `./tests/resources/blargg` - Blargg hardware tests (serial port output)

### Reference Materials
- `./tests/resources/opcodes.json` - SM83 CPU opcodes (use `jq` or `grep` to navigate)
- GameBoy Online: https://github.com/taisel/GameBoy-Online/tree/master/js
- GB Dev Wiki: https://gbdev.gg8.se/wiki
- Pan Docs: https://gbdev.io/pandocs/
- Opcodes Visual: https://gbdev.io/gb-opcodes/optables/

## Development Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build
npm run build

# Test
npm test

# Test single file
npm test -- path/to/test.spec.ts

# Lint
npm run lint

# Type check
npm run typecheck

# Full validation (matches CI pipeline)
npm run validate
```

## Agent Behavior Guidelines

- **NEVER** deviate from TDD principles
- **NEVER** fake data or test implementation details  
- **ALWAYS** write failing test first, then code to pass, then refactor
- **ALWAYS** run full validation before requesting reviews
- **ALWAYS** get required approvals before committing
- **NEVER** disable tests without documentation and human approval
- **ALWAYS** reference authoritative sources for DMG implementation
- **NEVER** assume - verify against real hardware test ROMs