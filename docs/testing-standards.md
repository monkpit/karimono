# Testing Standards

## Core Testing Principles

### Test-Driven Development (TDD) Workflow
1. **RED**: Write a failing test that describes the desired behavior
2. **GREEN**: Write minimal code to make the test pass
3. **REFACTOR**: Improve code while keeping tests green

This cycle is **MANDATORY** - no exceptions without documented human approval.

## Test Quality Requirements

### Atomic Tests
- Each test verifies exactly one behavior
- Tests should not depend on other tests
- Clear, single responsibility per test case

### Fast Tests  
- No unnecessary setup or teardown
- Mock external dependencies appropriately
- Target sub-second execution per test

### Debuggable Tests
- Descriptive test names that explain the behavior being tested
- Clear assertions with meaningful error messages
- Focused scope - easy to identify what failed and why

## Boundary Testing Strategy

### Testing at the Right Level
Tests should observe side effects at the **boundary of encapsulation**, not internal implementation.

#### Good Example - PPU Testing
```typescript
// Test PPU behavior by examining what it sends to Display
test('PPU renders sprite at correct position', () => {
  const mockDisplay = new MockDisplay();
  const ppu = new PPU(mockDisplay);
  
  ppu.renderSprite(sprite, x, y);
  
  expect(mockDisplay.getPixelAt(x, y)).toBe(expectedColor);
});
```

#### Bad Example - Implementation Testing
```typescript
// DON'T test internal PPU state
test('PPU internal sprite buffer updated', () => {
  const ppu = new PPU();
  ppu.renderSprite(sprite, x, y);
  
  expect(ppu._internalSpriteBuffer[x][y]).toBe(sprite); // WRONG
});
```

### Component Boundaries
- **CPU**: Test instruction execution results, memory changes, flag updates
- **PPU**: Test display output, not internal rendering pipeline
- **Memory**: Test read/write operations, not internal data structures
- **Display**: Test pixel output, screenshot generation

## Screenshot Testing

### Setup Process
1. Implement feature that affects visual output
2. Create test that generates screenshot via `display.screenshot()`
3. Human reviews initial output for correctness
4. Human approves - becomes golden baseline
5. Future runs compare against baseline

### Screenshot Test Example
```typescript
test('renders game boy boot screen correctly', async () => {
  const emulator = new GameBoyEmulator();
  await emulator.boot();
  
  const screenshot = emulator.display.screenshot();
  expect(screenshot).toMatchSnapshot('boot-screen.png');
});
```

### Baseline Management
- Initial baselines require human approval
- Baseline updates require human approval
- Failed screenshot comparisons block pipeline
- Document reason for any baseline changes

## Hardware Test ROM Integration

### Mealybug Tearoom Tests
- Located in `./tests/resources/mealybug/`
- These ROMs are infallible - they run correctly on real hardware
- Use for comprehensive emulator validation
- Any failure indicates emulator bug, not test issue

### Blargg Test ROMs  
- Located in `./tests/resources/blargg/`
- Output results via serial port - no display required
- Gold standard for CPU instruction testing
- Results can be captured and verified programmatically

### Test ROM Integration Example
```typescript
test('passes blargg cpu instruction test', async () => {
  const emulator = new GameBoyEmulator();
  const rom = loadROM('./tests/resources/blargg/cpu_instrs.gb');
  
  emulator.loadROM(rom);
  const serialOutput = await emulator.runUntilSerialComplete();
  
  expect(serialOutput).toContain('Passed');
});
```

## Forbidden Practices

### Never Do This
- ❌ Disable tests with `.skip()` to make pipeline green
- ❌ Mock internal implementation details
- ❌ Use fake/dummy data that doesn't represent real usage
- ❌ Test multiple concerns in single test case
- ❌ Rely on test execution order
- ❌ Leave `console.log` statements for debugging

### Approved Exceptions
- `.skip()` tests are allowed ONLY with:
  - Clear documentation of what needs to be implemented
  - Timeline for when test will be un-skipped
  - Human approval of the skip

## SM83 CPU Testing

### Opcode Testing Strategy
Use `./tests/resources/opcodes.json` for comprehensive instruction testing:

```bash
# Find specific opcode details
jq '.opcodes."0x00"' ./tests/resources/opcodes.json

# Find all ADD instructions  
jq '.opcodes | to_entries[] | select(.value.mnemonic | startswith("ADD"))' ./tests/resources/opcodes.json
```

### CPU Test Structure
```typescript
describe('SM83 CPU Instructions', () => {
  test.each(loadOpcodeTestCases())('executes %s correctly', 
    (opcode, mnemonic, expectedBehavior) => {
      const cpu = new SM83CPU();
      cpu.loadInstruction(opcode);
      
      cpu.execute();
      
      expect(cpu.registers).toMatchObject(expectedBehavior.registers);
      expect(cpu.flags).toMatchObject(expectedBehavior.flags);
    });
});
```

This ensures every CPU instruction is tested against the official specification.