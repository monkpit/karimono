# Definitive Blargg Test ROM Serial Interface Specification

**Document Purpose**: To provide a clear, definitive specification for the Game Boy DMG's serial interface, resolving conflicts between strict hardware accuracy and the behavior required to pass Blargg's test ROM suite. This document supersedes previous specifications.

**Product Owner**: Karimono-v2 PO
**Date**: 2025-08-09
**Status**: **Approved. Ready for Implementation.**

## 1. Problem Statement & Analysis

The current emulator's `SerialInterface` is hardware-accurate, particularly regarding the external clock. On real hardware, a transfer initiated with an external clock (SC bit 0 = 0) will not complete without an external clock signal.

However, Blargg's test ROMs, such as `04-op r,imm`, were designed for automated testing and assume a serial transfer will always complete, even if an external clock is not present. The test ROM code writes `0x81` to the SC register (0xFF02), which correctly starts a transfer using the *internal* clock. After the transfer, the test code waits for a serial interrupt by polling the IF register (0xFF0F).

**The core conflict**: Our hardware-accurate implementation correctly stalls when no external clock is provided (if SC bit 0 were 0), but Blargg's tests require a transfer completion interrupt to proceed, which is currently timing out. The `04-op r,imm` test specifically gets stuck waiting for this interrupt after successfully outputting its name.

**Blargg Assembly Pattern (`std_print`):**
```assembly
std_print:
    push af
    sta  SB            ; Write character to Serial Buffer (0xFF01)
    wreg SC,$81        ; Write 0x81 to Serial Control - INTERNAL CLOCK + START
    delay 2304         ; Wait exactly 2304 cycles (Blargg-specific timing)
    pop  af
    jp   console_print
```

**Key Insight**: Blargg tests use `SC=$81`, which is **internal clock mode** (bit 0 = 1). The issue is NOT external vs internal clock mode - our implementation should complete these transfers. The bug is in our interrupt generation timing.

## 2. Serial Interface Hardware Specification

### Component: Serial Interface (0xFF01-0xFF02)
**Purpose**: Hardware-accurate Game Boy DMG serial communication with proper interrupt generation
**Timing**: Internal clock operates at 8192 Hz (512 CPU cycles per bit, 4096 cycles per byte)

### Register Behavior

**Serial Data Register (SB - 0xFF01)**:
- Holds byte to be transmitted/received
- During transfer: outgoing bits shift out MSB first, incoming bits shift in LSB first
- Disconnected cable behavior: incoming bits read as 1 (0xFF shifted in)
- Default value: 0x00

**Serial Control Register (SC - 0xFF02)**:
- **Bit 7: Transfer Start/Busy** (1 = active transfer, 0 = idle/complete)
- **Bit 1: Clock Speed** (DMG: unused, always 0)
- **Bit 0: Clock Select** (1 = internal 8192Hz, 0 = external clock)
- Writing with bit 7 set initiates transfer
- Hardware automatically clears bit 7 when transfer completes
- Default value: 0x00

### Transfer Completion Process

1. **Transfer Initiation**: CPU writes to SC with bit 7 = 1
2. **Clock Selection**: 
   - Bit 0 = 1: Use internal 8192Hz clock → **Transfer will complete after 4096 cycles**
   - Bit 0 = 0: Use external clock → **Transfer may never complete without external device**
3. **Transfer Progress**: 8 bits transferred (MSB first) over selected clock
4. **Transfer Completion**:
   - Clear SC bit 7 (busy flag)
   - Set IF bit 3 (serial interrupt flag) 
   - SB contains received data (0xFF for disconnected cable)

### Critical Timing Specification

**Internal Clock Transfers** (SC bit 0 = 1):
- **Transfer Duration**: 4096 CPU cycles (512 cycles per bit × 8 bits)
- **Interrupt Generation**: Occurs immediately after transfer completion
- **Blargg Compatibility**: Tests expect interrupt flag set after 2304 cycles delay + transfer time

**External Clock Transfers** (SC bit 0 = 0):
- **Real Hardware**: Transfer never completes without external clock signal
- **Test Environment**: Should timeout/stall (hardware-accurate behavior)

## 2. Serial Interface Component Architecture

### Component Design
```typescript
interface SerialInterface {
  // Register access methods
  readSB(): number;         // Read serial data register
  writeSB(value: number): void;  // Write serial data register
  readSC(): number;         // Read serial control register  
  writeSC(value: number): void;  // Write serial control register
  
  // Transfer management
  isTransferActive(): boolean;   // Check if transfer in progress
  step(cpuCycles: number): void; // Process serial timing
  
  // Output capture for test ROMs
  getOutputBuffer(): string;     // Get captured serial output
  clearOutputBuffer(): void;     // Clear output buffer
}
```

### Integration Approach: **Event-Driven Serial Transfer**
- **Rationale**: Hardware-accurate timing without polling overhead
- **Implementation**: CPU cycle-based transfer timing with interrupt generation
- **Benefits**: Maintains emulation accuracy while supporting test automation

### Output Buffer Management
- **Character-by-Character Capture**: Buffer each completed transfer as ASCII character
- **Newline Handling**: Detect newline characters (0x0A) for output parsing
- **Buffer Size**: Circular buffer with 64KB capacity for large test outputs
- **Output Retrieval**: Non-destructive read with explicit clear method

## 3. Component Responsibilities and Encapsulation

### SerialInterface Component
**Responsibilities**:
- Serial register state management (SB/SC)
- Transfer timing and clock management
- Interrupt generation on transfer completion
- Output character buffering for test automation
- Hardware-accurate disconnected cable simulation

**Encapsulation Boundaries**:
- Private: Transfer timing state, bit shifting logic, output buffer
- Public: Register access methods, transfer status, output retrieval

### MMU Integration Pattern
**Current MMU Changes Required**:
- Replace basic 0xFF01/0xFF02 register storage with SerialInterface delegation
- Remove direct ioRegisters.get/set for serial addresses
- Forward serial register reads/writes to SerialInterface component

### CPU Integration Pattern
**Interrupt Handling**:
- SerialInterface generates interrupt flag (bit 3 of IF register)
- CPU processes serial interrupt through existing interrupt system
- No direct CPU-to-SerialInterface coupling required

## 4. Blargg Test Integration Framework

### Test Execution Architecture
```typescript
interface BlarggTestRunner {
  executeTest(romPath: string, expectedOutput?: string): BlarggTestResult;
  executeTestSuite(romDirectory: string): BlarggTestSuiteResult;
  captureSerialOutput(maxCycles: number): string;
}

interface BlarggTestResult {
  passed: boolean;
  output: string;
  expectedOutput?: string;
  cyclesExecuted: number;
  failureReason?: string;
}
```

### Test Execution Process
1. **ROM Loading**: Load Blargg test ROM into emulator via MMU
2. **Execution Start**: Reset CPU/MMU state and begin execution
3. **Serial Capture**: Monitor SerialInterface output buffer during execution
4. **Completion Detection**: Watch for test completion patterns in output
5. **Result Validation**: Compare captured output against expected results

### Output Pattern Recognition
**Success Patterns**:
- "Passed" (individual tests)
- "Done" (test suite completion)
- Absence of "Failed" messages

**Failure Patterns**:
- "Failed" (general failure)
- "Failed #n" (specific failure code)
- Timeout without completion message

### Performance Considerations
- **Cycle Limits**: Maximum 10 million cycles per test (prevents infinite loops)
- **Output Buffering**: Efficient circular buffer to avoid memory growth
- **Early Termination**: Stop execution when completion pattern detected

## 5. Test Case Specifications (Plain English)

### Serial Interface Unit Tests

#### Test Case 1: "Serial data register should hold written value"
- **Initial State**: SB = 0x00
- **Action**: Write 0x42 to SB register
- **Expected Result**: Reading SB returns 0x42
- **Validation**: Verify SB register state persistence

#### Test Case 2: "Serial control register should start transfer when written with 0x81"
- **Initial State**: SC = 0x00, SB = 0x55
- **Action**: Write 0x81 to SC register
- **Expected Result**: SC bit 7 = 1 (transfer active), transfer begins
- **Validation**: Verify isTransferActive() returns true

#### Test Case 3: "Serial transfer should complete after correct cycle count"
- **Initial State**: SC = 0x81 (transfer active), SB = 0xAA
- **Action**: Execute exactly 32768 CPU cycles
- **Expected Result**: SC bit 7 = 0 (transfer complete), serial interrupt generated
- **Validation**: Verify transfer completion and interrupt flag set

#### Test Case 4: "Disconnected cable should shift in 0xFF during transfer"
- **Initial State**: SB = 0x00, no external device connected
- **Action**: Write 0x81 to SC, wait for transfer completion
- **Expected Result**: SB = 0xFF (all input bits high)
- **Validation**: Verify disconnected cable behavior

#### Test Case 5: "Serial output buffer should capture transferred characters"
- **Initial State**: Empty output buffer
- **Action**: Transfer ASCII 'H', 'i', '!' characters via serial
- **Expected Result**: Output buffer contains "Hi!"
- **Validation**: Verify character capture and buffer management

### Blargg Test Integration Tests

#### Test Case 6: "Should execute Blargg cpu_instrs/01-special.gb successfully"
- **Initial State**: Clean emulator state, cpu_instrs/01-special.gb loaded
- **Action**: Execute ROM and capture serial output
- **Expected Result**: Output contains "01-special" and "Passed"
- **Validation**: Verify successful test execution and output capture

#### Test Case 7: "Should detect Blargg test failure through serial output"
- **Initial State**: CPU implementation with intentional instruction bug
- **Action**: Execute failing Blargg test ROM
- **Expected Result**: Output contains "Failed #n" pattern
- **Validation**: Verify failure detection and error code capture

#### Test Case 8: "Should timeout on infinite loop without hanging"
- **Initial State**: ROM with infinite loop (no output)
- **Action**: Execute ROM with 10M cycle limit
- **Expected Result**: Execution stops at cycle limit, timeout reported
- **Validation**: Verify timeout handling and graceful termination

#### Test Case 9: "Should execute complete Blargg cpu_instrs.gb test suite"
- **Initial State**: Full cpu_instrs.gb ROM loaded
- **Action**: Execute complete test suite
- **Expected Result**: All individual tests pass, final "Passed" output
- **Validation**: Verify comprehensive test suite execution

#### Test Case 10: "Should handle rapid serial transfers without data loss"
- **Initial State**: Test ROM performing back-to-back serial writes
- **Action**: Execute ROM with multiple rapid serial operations
- **Expected Result**: All characters captured in correct order
- **Validation**: Verify serial transfer queuing and data integrity

## 6. Implementation Architecture Summary

### Recommended Implementation Sequence

1. **Phase 1: Serial Interface Component**
   - Implement SerialInterface class with register access methods
   - Add transfer timing and interrupt generation
   - Create output buffer management
   - Unit tests for all serial communication behaviors

2. **Phase 2: MMU Integration**  
   - Modify MMU to delegate serial register access to SerialInterface
   - Remove direct serial register storage from MMU
   - Integration tests for MMU-SerialInterface cooperation

3. **Phase 3: Blargg Test Framework**
   - Create BlarggTestRunner with ROM execution capabilities
   - Implement serial output capture and parsing
   - Add test completion detection and timeout handling

4. **Phase 4: Test Suite Integration**
   - Create Jest test suite for automated Blargg ROM execution
   - Add individual test ROM validation
   - Performance optimization and edge case handling

### Component Integration Diagram
```
CPU ↔ MMU ↔ SerialInterface ↔ BlarggTestRunner
 ↑      ↑         ↑                    ↑
 └─────────────────┴────────────────────┘
        Interrupt System Integration
```

### Success Criteria
- All existing 966 tests continue to pass (maintain 87.6% coverage)
- SerialInterface provides hardware-accurate serial communication
- BlarggTestRunner successfully executes cpu_instrs.gb test suite
- Automated validation of CPU instruction implementation against hardware

### Hardware Accuracy Validation
- Serial timing matches DMG hardware (8192 Hz internal clock)
- Interrupt generation follows hardware behavior  
- Disconnected cable simulation accurate to hardware
- Character-by-character output matches Blargg test expectations

## References
- **Primary**: Pan Docs Serial Data Transfer specification
- **Primary**: Blargg cpu_instrs test ROM documentation and source code
- **Secondary**: Game Boy DMG hardware behavior validation via Mealybug tests
- **Implementation**: Existing MMU I/O register architecture patterns