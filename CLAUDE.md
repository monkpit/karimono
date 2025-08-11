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
- **Agent prompt file**: `.claude/agents/frontend-vite-engineer.md`

**Backend TypeScript Engineer**

- Embedded programming background, perfect for emulator work
- Handles SM83 CPU implementation, memory management, emulator core
- **MUST use RGBDS GBZ80 Reference (https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7) as primary source for ALL CPU instructions**
- Implements CPU instructions with rigorous attention to hardware accuracy per RGBDS specification
- Tests observe side effects at encapsulation boundaries (e.g., PPU tests don't require Display component)
- **Required to reference RGBDS documentation in every instruction implementation**
- **Agent prompt file**: `.claude/agents/backend-typescript-engineer.md`

**Tech Lead**

- Enforces all engineering principles most strictly
- No tolerance for deviance without documented human approval
- Will not review changesets with failing pipeline
- Blocks work if linter, style, TypeScript compilation fails
- No tolerance for disabled tests or fake data to make tests pass
- Tests may be `.skip()` only with adequate documentation of what needs to happen
- **Agent prompt file**: `.claude/agents/tech-lead-enforcer.md`

### Review and Quality Agents

**Architecture Reviewer**

- Enforces encapsulation, composition, and design principles
- Reviews all code changes for architectural compliance
- Must approve before human review
- **Agent prompt file**: `.claude/agents/architecture-reviewer.md`

**Test Engineer**

- Specialist in TDD workflow enforcement
- **MUST use RGBDS GBZ80 Reference (https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7) for test case specifications**
- Ensures tests are atomic, fast, debuggable
- Guards against implementation detail testing
- Verifies tests observe side effects at proper boundaries
- **Required to validate test cases against RGBDS documentation for hardware accuracy**
- **Agent prompt file**: `.claude/agents/test-engineer.md`

**DevOps Engineer**

- Manages CI/CD pipeline, GitHub Actions, deployment
- Implements smart caching and change detection
- Enforces husky pre-commit hooks and lint-staged
- Ensures validation steps mirror GitHub Actions pipeline
- **Agent prompt file**: `.claude/agents/devops-engineer.md`

### Research and Documentation

**Product Owner**

- Researches DMG architecture using authoritative sources
- **MUST use RGBDS GBZ80 Reference (https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7) as primary source for instruction specifications**
- Creates specs and plain English test case comments based on RGBDS documentation
- **Required to reference RGBDS documentation for every instruction test case and specification**
- Secondary references: GameBoy Online implementation, gbdev.gg8.se/wiki, gbdev.io/pandocs
- Manages test ROM resources (Mealybug Tearoom, Blargg tests)
- **Agent prompt file**: `.claude/agents/gameboy-product-owner.md`

**Documentation Specialist**

- Maintains technical docs, API specs, architectural decisions
- Works with Product Owner on documentation standards
- **Agent prompt file**: `.claude/agents/documentation-specialist.md`

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

**MANDATORY PRIMARY REFERENCE (NON-NEGOTIABLE):**
- **RGBDS GBZ80 Reference**: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7 
  - **ALL agents MUST use this as the authoritative source for SM83 CPU opcodes**
  - **Required for every instruction implementation and test case**
  - **No exceptions - this is the definitive hardware specification**

**Secondary References (supplement only):**
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

## Code Generation Architecture

### SM83 CPU Automated Template Generation Architecture

To address hardware accuracy gaps and improve maintainability, the project is adopting a new automated template generation architecture. This system is designed to systematically create hardware-accurate, high-quality, and testable CPU instruction implementations for all SM83 instruction families based on `opcodes.json` and the RGBDS GBZ80 Reference.

**Core Components:**

1.  **Instruction Family Classifier Engine**:
    *   Automatically parses `opcodes.json` to classify all 512 instructions into logical families (e.g., `LD`, `ADD`, `SUB`, `BIT`, `JP`, `CALL`).
    *   Identifies instruction variants within each family based on operand patterns (e.g., `LD r, r`, `LD r, n8`, `LD A, (BC)`), creating a structured hierarchy for systematic processing.

2.  **Family-Based Template Generation Pipeline**:
    *   Utilizes a powerful templating engine (e.g., Handlebars) with master templates for each instruction family (e.g., `ld-family.hbs`, `add-family.hbs`).
    *   Each template defines the core implementation logic, with placeholders for specific operands, cycle counts, and flag calculations.
    *   This approach ensures that all instructions within a family share a single, verifiable source of truth, eliminating inconsistencies.

3.  **Hardware-Accurate Logic Generator**:
    *   **Flag Generation**: A dedicated module interprets the `flags` object from `opcodes.json` (e.g., `"Z": "Z", "N": "0", "H": "H", "C": "C"`) and generates precise, hardware-accurate TypeScript code for `this.registers.f` manipulation. This systematically resolves the 716 identified flag implementation gaps.
    *   **Timing Generation**: Pulls cycle counts directly from the `cycles` array in `opcodes.json`, correctly implementing conditional cycle logic.
    *   **JSDoc Integration**: Automatically generates comprehensive JSDoc comments for each method, including instruction details, cycle counts, and a direct link to the relevant RGBDS GBZ80 Reference documentation.

4.  **Integrated TDD & Quality Assurance Framework**:
    *   **Automated Test Generation**: In parallel with code generation, the system creates corresponding Jest test cases for each instruction. These tests validate register states, memory interactions, and precise flag outcomes against the `opcodes.json` specification.
    *   **Closed-Loop Validation**: The pipeline fully integrates with the existing validation system (`scripts/codegen/validateTemplates.ts`) to ensure all generated code and tests meet quality standards before being committed.
    *   **Template Versioning**: Generated files are stamped with a version hash of the source template, ensuring traceability and preventing mismatches between instruction implementations and their tests.

**Systematic Resolution of Known Issues:**

*   The 14 known hardware accuracy violations in `JP` instructions are resolved by generating all `JP` variants from a single, corrected `jp-family.hbs` template.
*   The 716 flag implementation gaps are closed by the automated Flag Generation module, which guarantees complete and accurate flag logic for all instructions based on their formal specification.

This new architecture ensures that all generated code is TypeScript strict-mode compliant, adheres to the private method pattern for CPU integration, and systematically produces a high-quality, verifiable, and maintainable instruction set.

### SM83 CPU Integration Architecture Evolution

**Current Phase**: Architectural discussion and evaluation of opcode integration patterns.

Following successful implementation of the SM83 instruction codegen system, the project is now evaluating optimal integration architectures to address scalability, maintainability, and performance requirements.

**Integration Approaches Under Review:**

1. **Current: Copy/Paste Private Methods** (Initial Implementation)
   - Generated methods manually copied into CPU class as private methods
   - Direct `this.registers.*` access within CPU encapsulation
   - Simple integration but manual maintenance overhead

2. **Alternative 1: Centralized Opcodes Class with Constructor Injection**
   - Pattern: `new Opcodes(cpu)` with centralized index.ts
   - Maintains encapsulation through dependency injection
   - Clean separation but adds architectural complexity

3. **Alternative 2: Fat Arrow Functions with Outer Context Binding**
   - Generated fat arrow functions with outer `this` context
   - Leverages JavaScript closure mechanics
   - Performance implications require V8/SpiderMonkey evaluation

4. **Alternative 3: Implementation Injection During Codegen**
   - Separate implementation storage with codegen-time injection
   - Addresses regeneration without overwriting custom implementations
   - Most complex but highest flexibility

5. **Alternative 4: Explicit Parameter Passing**
   - Pattern: `executeOpcode(cpu)` with explicit CPU parameter
   - Functional approach with clear dependencies
   - May impact performance in tight execution loops

**Key Evaluation Criteria:**

- **Performance**: V8/SpiderMonkey optimization characteristics for different dispatch patterns
- **Regeneration Problem**: Avoiding overwrite of custom implementations during codegen updates
- **Architecture Complexity**: Balance between simplicity and maintainability
- **Integration Compatibility**: Seamless integration with existing `CPU.executeInstruction()` switch statement
- **Encapsulation Integrity**: Maintaining CPU class boundaries and design principles

**Decision Process:**

1. **Architecture Reviewer**: Evaluation against encapsulation, composition, and design principles
2. **Backend TypeScript Engineer**: Technical performance analysis and implementation feasibility
3. **Tech Lead**: Standards compliance and engineering principle enforcement
4. **Human Final Approval**: Decision ratification after agent team consensus

**Documentation Evolution:**

This represents a natural progression from our initial copy/paste implementation approach to a more sophisticated architectural evaluation phase, demonstrating the project's commitment to iterative refinement and architectural excellence.

## MANDATORY RGBDS DOCUMENTATION REQUIREMENT

**NON-NEGOTIABLE RULE FOR ALL AGENTS:**

Every agent involved in CPU instruction implementation, testing, or specification MUST use the RGBDS GBZ80 Reference as the primary authoritative source:

**🔗 REQUIRED REFERENCE: https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7**

**Specific Requirements:**
- **Backend TypeScript Engineer**: Reference RGBDS for every instruction implementation
- **Product Owner**: Reference RGBDS for every instruction specification and test case
- **Test Engineer**: Validate all test cases against RGBDS documentation
- **Architecture Reviewer**: Ensure implementations follow RGBDS specifications
- **Tech Lead**: Block any work that doesn't reference RGBDS as primary source

**Enforcement:**
- Any instruction implementation without RGBDS reference will be rejected
- All test cases must cite specific RGBDS documentation sections
- Code reviews must verify RGBDS compliance
- No exceptions or alternative sources as primary reference

## Agent Behavior Guidelines

- **NEVER** deviate from TDD principles
- **NEVER** fake data or test implementation details
- **ALWAYS** write failing test first, then code to pass, then refactor
- **ALWAYS** run full validation before requesting reviews
- **ALWAYS** get required approvals before committing
- **NEVER** disable tests without documentation and human approval
- **ALWAYS** reference RGBDS GBZ80 documentation as primary source for DMG implementation
- **NEVER** assume - verify against real hardware test ROMs and RGBDS specification
- **NEVER** leave comments about removed code - clean removal without trace
- **ALWAYS** use generated CPU methods that follow architectural patterns
- **NEVER** create separate executor classes - CPU methods only
