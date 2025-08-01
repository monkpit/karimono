# Game Boy DMG SM83 CPU Specifications

## Overview

The Sharp SM83 CPU is the heart of the Game Boy DMG system, operating at 4.194304 MHz (2^22 Hz). This specification provides precise implementation requirements for emulating the SM83 CPU with hardware-accurate behavior.

## CPU Architecture

### Clock Speed and Timing
- **Master Clock**: 4.194304 MHz (4,194,304 Hz)
- **Machine Cycle**: 4 clock periods (T-states)
- **Instruction Timing**: 1-6 machine cycles per instruction
- **Frame Timing**: 70,224 cycles per frame (154 scanlines × 456 cycles)
- **Frame Rate**: ~59.7 FPS (4,194,304 Hz ÷ 70,224 cycles)

### Register Set

#### 8-bit Registers
```
A - Accumulator (primary arithmetic register)
F - Flags register (see flag specifications below)
B, C - General purpose register pair
D, E - General purpose register pair  
H, L - General purpose register pair (often used for memory addressing)
```

#### 16-bit Registers
```
AF - Accumulator and Flags (A:F combined)
BC - General purpose (B:C combined)
DE - General purpose (D:E combined)
HL - General purpose (H:L combined), primary indirect addressing
SP - Stack Pointer (points to top of stack)
PC - Program Counter (points to next instruction)
```

#### Register Pairing
- High byte stored in first register (A, B, D, H)
- Low byte stored in second register (F, C, E, L)
- Access patterns: AF = (A << 8) | F, BC = (B << 8) | C, etc.

### Flags Register (F) - Address: N/A (CPU internal)

The flags register contains condition codes updated by arithmetic and logic operations:

```
Bit 7: Z (Zero Flag)
  - Set (1) when result of operation equals zero
  - Cleared (0) when result is non-zero
  - Used by conditional jumps (JZ, JNZ) and branches

Bit 6: N (Subtraction Flag)
  - Set (1) when last operation was subtraction
  - Cleared (0) when last operation was addition  
  - Used by DAA instruction for BCD arithmetic correction

Bit 5: H (Half Carry Flag)
  - Set (1) when carry occurs from bit 3 to bit 4
  - Cleared (0) when no half carry occurs
  - Used by DAA instruction and some arithmetic operations

Bit 4: C (Carry Flag)
  - Set (1) when carry occurs from bit 7 (addition)
  - Set (1) when borrow occurs in subtraction
  - Used for multi-precision arithmetic and rotate operations

Bits 3-0: Unused (always read as 0)
```

#### Flag Notation in Specifications
- `Z`: Zero flag affected by result
- `N`: Subtraction flag set to specified value
- `H`: Half carry flag affected by operation
- `C`: Carry flag affected by operation
- `0`: Flag always cleared to 0
- `1`: Flag always set to 1
- `-`: Flag not affected (preserves previous value)

## Instruction Set Architecture

### Instruction Encoding

#### Standard Instructions (0x00-0xFF)
- Single-byte opcodes with 0-2 immediate operands
- Total instruction length: 1-3 bytes
- Examples: `NOP` (0x00), `LD BC,n16` (0x01 + 2 bytes)

#### CB-Prefixed Instructions (0xCB 0x00-0xFF)
- Two-byte opcodes: 0xCB followed by operation byte
- Bit manipulation, rotates, and shifts
- Examples: `SWAP A` (0xCB 0x37), `BIT 0,B` (0xCB 0x40)

### Instruction Categories

#### Data Movement Instructions
```
LD r,r     - Load register to register (4 cycles)
LD r,n8    - Load immediate to register (8 cycles)
LD rr,n16  - Load immediate to register pair (12 cycles)
LD (HL),r  - Load register to memory via HL (8 cycles)
LD r,(HL)  - Load memory via HL to register (8 cycles)
```

#### Arithmetic Instructions
```
ADD A,r    - Add register to A (4 cycles)
ADD A,n8   - Add immediate to A (8 cycles)
ADC A,r    - Add register + carry to A (4 cycles)
SUB r      - Subtract register from A (4 cycles)
SBC A,r    - Subtract register + carry from A (4 cycles)
INC r      - Increment register (4 cycles)
DEC r      - Decrement register (4 cycles)
```

#### Logic Instructions
```
AND r      - Logical AND with A (4 cycles)  
OR r       - Logical OR with A (4 cycles)
XOR r      - Logical XOR with A (4 cycles)
CP r       - Compare register with A (4 cycles)
```

#### Jump and Branch Instructions
```
JP n16     - Absolute jump (16 cycles)
JP cc,n16  - Conditional absolute jump (16/12 cycles)
JR e8      - Relative jump (12 cycles)
JR cc,e8   - Conditional relative jump (12/8 cycles)
CALL n16   - Call subroutine (24 cycles)
RET        - Return from subroutine (16 cycles)
RST n      - Restart (call fixed address) (16 cycles)
```

#### Bit Manipulation Instructions (CB-prefixed)
```
BIT n,r    - Test bit n in register (8 cycles)
SET n,r    - Set bit n in register (8 cycles)  
RES n,r    - Reset bit n in register (8 cycles)
SLA r      - Shift left arithmetic (8 cycles)
SRA r      - Shift right arithmetic (8 cycles)
SRL r      - Shift right logical (8 cycles)
SWAP r     - Swap upper/lower nibbles (8 cycles)
```

## Instruction Timing

### Cycle Counting Rules
- All timings measured in machine cycles (4 T-states each)
- Memory access instructions add cycles for bus operations
- Conditional instructions: taken/not-taken cycle differences
- Interrupt handling adds overhead cycles

### Memory Access Timing
```
Register-to-register: 1 machine cycle (4 T-states)
Register-to-memory: 2 machine cycles (8 T-states)
Memory-to-register: 2 machine cycles (8 T-states)
16-bit immediate load: 3 machine cycles (12 T-states)
Stack operations: 4 machine cycles (16 T-states)
```

### Branch Timing Patterns
```
Unconditional jump: Always full cycle count
Conditional jump taken: Full cycle count
Conditional jump not taken: Reduced cycle count
CALL instruction: 6 machine cycles (24 T-states)
RET instruction: 4 machine cycles (16 T-states)
```

## Interrupt System Integration

### Interrupt Master Enable (IME)
- Single-bit flag controlling interrupt processing
- Set by `EI` instruction (delayed by 1 instruction)
- Cleared by `DI` instruction (immediate effect)
- Automatically cleared during interrupt handling

### Interrupt Handling Process
1. Check IME flag status
2. Check enabled interrupts (IE register) vs pending (IF register)
3. Push current PC to stack (2 cycles)
4. Clear IME flag (disable further interrupts)
5. Jump to interrupt vector (1 cycle)
6. Clear corresponding IF bit

### Interrupt Priority (highest to lowest)
1. VBlank (0x0040)
2. LCD STAT (0x0048) 
3. Timer (0x0050)
4. Serial (0x0058)
5. Joypad (0x0060)

## Special Instructions

### HALT Instruction
```
Purpose: Stop CPU execution until interrupt occurs
Encoding: 0x76
Cycles: 4 (to enter halt), variable (until interrupt)

Behavior:
- CPU stops executing instructions
- Clock continues running (timers, PPU still active)
- Exits on any enabled interrupt (even if IME=0)
- If IME=0 when interrupt occurs, HALT bug may trigger

HALT Bug Conditions:
- HALT executed when IME=0 and pending interrupt exists
- Next instruction after HALT executes twice
- PC increment fails after HALT, causing instruction repeat
```

### STOP Instruction  
```
Purpose: Stop CPU and all clocks (very low power mode)
Encoding: 0x10 0x00 (two-byte instruction)
Cycles: 4 (to enter stop)

Behavior:
- CPU stops completely
- All clocks stop (system essentially frozen)
- Only joypad interrupt can wake up system
- Typically used for power management
```

### DAA (Decimal Adjust Accumulator)
```
Purpose: Adjust A register for BCD arithmetic
Encoding: 0x27
Cycles: 4

Behavior depends on N flag and current A value:
- If N=0 (after addition): Correct for BCD addition
- If N=1 (after subtraction): Correct for BCD subtraction
- Uses H and C flags to determine correction amount
- Complex logic table required for accurate implementation
```

## Test Case Specifications

### 1. Basic Register Operations
**Test**: "Register loads preserve other registers and set flags correctly"
- Initial state: All registers = 0x00, flags = 0x00
- Execute: `LD B,0x42`
- Expected result: B = 0x42, all other registers unchanged, flags unchanged
- Validation: Blargg test 06-ld r,r.gb validates register-to-register loads

### 2. Arithmetic Flag Setting
**Test**: "ADD instruction sets flags based on result conditions"
- Initial state: A = 0x0F, B = 0x01, flags = 0x00
- Execute: `ADD A,B`
- Expected result: A = 0x10, flags = H=1 (half carry from bit 3 to 4), Z=0, N=0, C=0
- Validation: Blargg test 04-op r,imm.gb validates arithmetic flag behavior

### 3. CB Instruction Timing
**Test**: "CB-prefixed instructions consume correct cycle count"
- Initial state: CPU at known cycle count, B = 0x12
- Execute: `SWAP B` (0xCB 0x30)
- Expected result: B = 0x21, exactly 8 cycles consumed, Z=0, N=0, H=0, C=0
- Validation: Blargg instr_timing.gb validates instruction cycle accuracy

### 4. Jump Condition Evaluation
**Test**: "Conditional jumps evaluate flags correctly"
- Initial state: PC = 0x100, flags Z=1, A = 0x00
- Execute: `JR Z,+5` (0x28 0x05)  
- Expected result: PC = 0x107, 12 cycles consumed (jump taken)
- Validation: Blargg test 07-jr,jp,call,ret,rst.gb validates control flow

### 5. Stack Operations
**Test**: "CALL instruction saves return address and jumps correctly"
- Initial state: PC = 0x150, SP = 0xFFFE
- Execute: `CALL 0x200` (0xCD 0x00 0x02)
- Expected result: PC = 0x200, SP = 0xFFFC, memory[0xFFFD] = 0x01, memory[0xFFFC] = 0x53
- Validation: Return address = PC after CALL instruction (0x0153)

### 6. Interrupt Handling Timing
**Test**: "VBlank interrupt handled with correct timing when IME enabled"
- Initial state: IME = 1, IE[0] = 1, PC = 0x100, SP = 0xFFFE
- Trigger: VBlank interrupt (set IF[0] = 1)
- Expected result: PC = 0x0040, SP = 0xFFFC, IME = 0, 5 cycles consumed for handling
- Validation: IF[0] cleared automatically, return address 0x0100 on stack

### 7. HALT Instruction Behavior
**Test**: "HALT stops execution until interrupt with correct wake timing"
- Initial state: IME = 1, IE[0] = 1, PC = 0x100
- Execute: `HALT` (0x76)
- Trigger: VBlank interrupt after 1000 cycles
- Expected result: CPU resumes at cycle 1004, PC = 0x0040, interrupt handled normally
- Validation: Blargg test 02-interrupts.gb validates interrupt timing

### 8. Memory Boundary Access
**Test**: "Memory access respects PPU mode restrictions"
- Initial state: PPU in Mode 3 (pixel transfer), HL = 0x8000
- Execute: `LD A,(HL)`
- Expected result: A = 0xFF (blocked access), memory read fails gracefully
- Validation: Memory access should return 0xFF when PPU blocks VRAM access

## Implementation Requirements

### Performance Requirements
- Maintain exactly 4.194304 MHz timing accuracy
- Complete frame processing in exactly 70,224 cycles
- Support cycle-accurate step debugging
- Handle interrupt latency within 1-2 cycles of trigger

### Accuracy Standards
- Pass all Blargg CPU instruction tests (cpu_instrs.gb)
- Pass Blargg instruction timing tests (instr_timing.gb)
- Pass Blargg interrupt timing tests (interrupt_time.gb)
- Support all documented instruction behaviors exactly

### Component Interface Requirements
```
CPU Component Interface:
- step(): Execute single instruction, return cycles consumed
- interrupt(vector): Trigger interrupt at specified vector
- read(address): Read byte from memory bus
- write(address, value): Write byte to memory bus
- getState(): Return complete CPU state for debugging
- setState(state): Restore CPU state for save/load
```

### Debugging Support Requirements
- Breakpoint support at any PC address
- Register inspection during execution
- Single-step execution capability
- Cycle-accurate execution timing
- Disassembly display with operand decoding

## References

### Primary Sources
- **opcodes.json**: Complete SM83 instruction reference with exact cycle timings
- **Blargg Test ROMs**: Hardware-validated CPU behavior tests
  - `cpu_instrs.gb`: Comprehensive instruction behavior validation
  - `instr_timing.gb`: Cycle-accurate timing validation
  - `interrupt_time.gb`: Interrupt handling timing validation

### Documentation Sources
- **Pan Docs**: https://gbdev.io/pandocs/CPU_Registers_and_Flags.html
- **GB Dev Wiki**: https://gbdev.gg8.se/wiki/articles/CPU
- **GB Opcodes Visual**: https://gbdev.io/gb-opcodes/optables/

### Validation Requirements
All CPU implementations MUST pass the following test ROMs to be considered accurate:
- Blargg cpu_instrs.gb (all 11 sub-tests)
- Blargg instr_timing.gb  
- Blargg interrupt_time.gb
- Basic functionality validated against Mealybug tests for system integration

This specification provides the complete foundation for implementing a cycle-accurate, hardware-compatible SM83 CPU emulator core.