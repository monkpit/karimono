# Game Boy DMG Component Timing and System Clock Coordination

## Overview

The Game Boy DMG operates as a precisely timed system where all components must synchronize with the 4.194304 MHz master clock. This specification defines the exact timing relationships between the CPU, PPU, APU, timers, and memory system to ensure cycle-accurate emulation.

## Master Clock and System Timing

### Clock Specifications
```
Master Clock Frequency: 4.194304 MHz (4,194,304 Hz)
Mathematical Basis: 2^22 Hz (exact power of 2)
Clock Period: ~238.73 nanoseconds per cycle
Machine Cycle: 4 clock cycles (4 T-states)
Frame Duration: 70,224 clock cycles (~16.742 milliseconds)
Frame Rate: 59.727500569606 Hz (~59.7 FPS)
```

### Timing Hierarchy
```
1 T-state = 1 clock cycle (base timing unit)
1 M-cycle = 4 T-states (CPU instruction granularity)  
1 Scanline = 456 T-states (PPU horizontal timing)
1 Frame = 70,224 T-states (complete video frame)
1 Second = 4,194,304 T-states (master clock frequency)
```

## Component Clock Distribution

### CPU Clock Timing
```
Clock Source: Direct from master clock
Timing Granularity: 4 T-states (1 M-cycle)
Instruction Timing: 1-6 M-cycles per instruction
Interrupt Latency: 5 M-cycles (20 T-states)

CPU Clock Relationships:
- Fetch cycle: 4 T-states
- Memory access: 4 T-states  
- ALU operation: 4 T-states
- Branch taken: +4 T-states additional
```

### PPU Clock Timing
```
Clock Source: Direct from master clock
Timing Granularity: 1 T-state (pixel-level precision)
Mode Transitions: T-state accurate
Scanline Duration: 456 T-states (fixed)

PPU Mode Timing:
- Mode 2 (OAM Search): 80 T-states
- Mode 3 (Pixel Transfer): 172-289 T-states (variable)
- Mode 0 (HBLANK): 204-287 T-states (456 - Mode 3 duration)
- Mode 1 (VBLANK): 4,560 T-states (10 scanlines)
```

### Timer System Clock Timing
```
Clock Source: Master clock with dividers
DIV Register: Increments every 256 T-states (16.384 kHz)
TIMA Frequencies:
  - TAC=00: 4,096 Hz (every 1,024 T-states)
  - TAC=01: 262,144 Hz (every 16 T-states)  
  - TAC=10: 65,536 Hz (every 64 T-states)
  - TAC=11: 16,384 Hz (every 256 T-states)
```

### APU Clock Timing
```
Clock Source: Master clock with complex dividers
Frame Sequencer: 512 Hz (every 8,192 T-states)
Sound Channels: Various frequencies based on register settings
Wave RAM: Accessible every 2 T-states when channel 3 enabled
```

## Inter-Component Synchronization

### CPU-PPU Coordination
```
Critical Synchronization Points:
1. VRAM/OAM Access Restrictions
   - CPU blocked during PPU Mode 2 (OAM access)
   - CPU blocked during PPU Mode 3 (VRAM/OAM access)
   - Restrictions enforce exactly at mode transitions

2. Interrupt Generation
   - VBlank interrupt: Triggered at T-state 0 of scanline 144
   - STAT interrupt: Triggered based on mode transitions and LYC
   - Interrupt processing: 5 M-cycles (20 T-states) latency

3. Register Access Timing
   - LY register updates at scanline boundaries
   - STAT register reflects current PPU mode instantly
   - LCDC changes take effect on next T-state
```

### CPU-Timer Coordination
```
Timer Integration Points:
1. DIV Register Behavior
   - Increments automatically every 256 T-states
   - Reset to 0 on any write (regardless of written value)
   - Cannot be stopped or paused

2. TIMA Counter Operation
   - Increments based on TAC frequency setting
   - Overflow triggers interrupt and loads TMA value
   - Timing affected by CPU instruction boundaries

3. Timer Interrupt Timing
   - Generated immediately on TIMA overflow
   - Processed with standard 5 M-cycle interrupt latency
   - TIMA loaded with TMA value during interrupt processing
```

### Memory Access Arbitration
```
Access Priority (highest to lowest):
1. DMA Transfer (blocks all CPU access except HRAM)
2. PPU VRAM/OAM Access (during appropriate modes)
3. CPU Memory Access (all other cases)

Access Timing Rules:
- All memory access completes in exactly 1 M-cycle
- Blocked access returns 0xFF immediately (no wait states)
- Access restrictions enforced at T-state granularity
- DMA transfer takes exactly 160 M-cycles (640 T-states)
```

## Precise Timing Requirements

### Frame Timing Accuracy
```
Complete Frame Duration: 70,224 T-states (exact)
Scanline Timing: 456 T-states each (exact)
VBlank Duration: 4,560 T-states (10 scanlines)
Active Display: 65,664 T-states (144 scanlines)

Frame Boundary Events:
- VBlank interrupt: T-state 0 of frame
- Mode 1 entry: Scanline 144, T-state 0
- Mode 1 exit: Scanline 154, T-state 0 (frame restarts)
```

### Instruction Execution Timing
```
Timing Granularity: M-cycle (4 T-states)
Instruction Categories:
- 1 M-cycle: Simple register operations (NOP, LD r,r)
- 2 M-cycles: Memory load/store (LD r,(HL), LD (HL),r)
- 3 M-cycles: 16-bit immediate loads (LD rr,nn)
- 4 M-cycles: Stack operations (CALL, RET)
- 6 M-cycles: CALL instruction (complete)

Branch Timing:
- Conditional branch taken: Full cycle count
- Conditional branch not taken: Reduced cycle count
- JR e8: 12/8 T-states (taken/not taken)
- JP cc,nn: 16/12 T-states (taken/not taken)
```

### Memory Access Timing Windows
```
VRAM Access Windows:
- Allowed: Mode 0 (HBLANK) and Mode 1 (VBLANK)
- Blocked: Mode 2 (OAM Search) and Mode 3 (Pixel Transfer)
- Transition timing: Exact T-state boundaries

OAM Access Windows:
- Allowed: Mode 0 (HBLANK) and Mode 1 (VBLANK)
- Blocked: Mode 2 (OAM Search) and Mode 3 (Pixel Transfer)
- DMA overrides: CPU blocked regardless of PPU mode

High RAM (HRAM) Access:
- Always accessible (no restrictions)
- Critical for DMA routine execution
- Used for interrupt handlers during DMA
```

## System State Synchronization

### Component State Updates
```
Update Order (per T-state):
1. Timer system (DIV, TIMA counters)
2. PPU state machine and mode transitions
3. APU frame sequencer and sound generation
4. CPU instruction execution (on M-cycle boundaries)
5. Interrupt processing and flag updates

State Consistency Rules:
- All components see consistent system time
- Memory access restrictions updated immediately
- Interrupt flags set on exact T-state boundaries
- Register changes visible to all components same T-state
```

### Interrupt Timing Coordination
```
Interrupt Processing Pipeline:
1. Interrupt condition detected (various components)
2. IF flag set immediately (same T-state)
3. CPU checks interrupts at instruction completion
4. 5 M-cycle interrupt handling process
5. Component interrupt flags cleared

Interrupt Priority Resolution:
- Multiple interrupts: Highest priority wins
- Simultaneous interrupts: Hardware priority order
- Interrupt masking: IE register controls enablement
- IME flag: Master interrupt enable/disable
```

## Performance Requirements

### Real-Time Execution Constraints
```
Timing Accuracy Requirements:
- Frame timing: ±0.1% accuracy for game compatibility
- Instruction timing: Exact M-cycle accuracy required
- PPU mode timing: T-state accurate for register access
- Audio timing: Sample-accurate for proper sound

Performance Targets:
- Maintain 59.7 FPS with cycle accuracy
- Process 4.194304 million T-states per second
- Handle all component interactions within timing
- Support real-time debugging without timing loss
```

### Component Processing Efficiency
```
CPU Processing:
- Execute 1,048,576 M-cycles per second
- Handle instruction dispatch efficiently
- Maintain cycle counting accuracy
- Process interrupts with exact timing

PPU Processing:
- Generate 160×144 pixels 59.7 times per second
- Process 10 sprites per scanline maximum
- Handle mode transitions at exact T-states
- Support mid-scanline register changes

Memory System:
- Handle 4.2M+ memory accesses per second
- Arbitrate access conflicts immediately
- Maintain banking state changes
- Support DMA transfers with exact timing
```

## Test Case Specifications

### 1. Frame Timing Accuracy
**Test**: "Complete frame executes in exactly 70,224 T-states"
- Initial state: System at frame boundary, cycle counter at 0
- Execute: Run complete frame with no instructions (HALT mode)
- Expected result: Cycle counter = 70,224 at next frame boundary
- Validation: Blargg timing tests verify exact frame duration

### 2. PPU Mode Transition Timing
**Test**: "PPU mode transitions occur at exact T-state boundaries"
- Initial state: PPU entering Mode 2, precise T-state tracking
- Monitor: Mode register changes during scanline
- Expected result: Mode 2→3 at T-state 80, Mode 3→0 at variable but exact T-state
- Validation: Mealybug tests require T-state accurate mode transitions 

### 3. Timer Interrupt Precision
**Test**: "Timer interrupt triggered at exact TIMA overflow"
- Initial state: TIMA = 0xFE, TAC = 0x04 (16.384 kHz), interrupt enabled
- Execute: Run exactly 512 T-states (2 TIMA increments)
- Expected result: TIMA = 0x00, TMA loaded, interrupt pending
- Validation: Blargg timer tests validate exact overflow timing

### 4. CPU-PPU Memory Access Coordination
**Test**: "CPU VRAM access blocked during exact PPU Mode 3 duration"
- Initial state: PPU entering Mode 3, CPU ready to read VRAM
- Execute: CPU VRAM read attempt during pixel transfer
- Expected result: Read returns 0xFF, access blocked for exact Mode 3 duration
- Validation: Critical for games that rely on PPU blocking behavior

### 5. DMA Transfer Timing
**Test**: "DMA transfer completes in exactly 160 M-cycles"
- Initial state: DMA register write triggers transfer, cycle counter at 0
- Execute: DMA transfer from 0xC000 to OAM
- Expected result: Transfer complete at cycle 640, CPU accessible again
- Validation: DMA timing affects sprite initialization in many games

### 6. Instruction Execution Timing
**Test**: "CPU instructions consume exact documented cycle counts"
- Initial state: Known CPU state, cycle counter at 0
- Execute: Sequence of instructions with known timings
- Expected result: Cycle counter matches sum of instruction timings exactly
- Validation: Blargg cpu_instrs and instr_timing tests validate this

### 7. Multi-Component Synchronization
**Test**: "VBlank interrupt occurs at exact frame boundary with PPU Mode 1"
- Initial state: End of scanline 143, interrupt enabled
- Execute: Transition to scanline 144
- Expected result: VBlank interrupt at T-state 0, PPU Mode = 1 simultaneously
- Validation: Frame-based games depend on exact VBlank timing

### 8. Audio Frame Sequencer Timing
**Test**: "APU frame sequencer updates at 512 Hz exactly"
- Initial state: Frame sequencer at step 0, cycle counter at 0
- Execute: Run for 8,192 T-states (one frame sequencer step)
- Expected result: Frame sequencer advances to step 1 at exact T-state
- Validation: Audio envelope/sweep timing depends on frame sequencer

### 9. Timer DIV Register Behavior
**Test**: "DIV register increments every 256 T-states regardless of TAC"
- Initial state: DIV = 0x00, cycle counter at 0, TAC = 0x00 (timer disabled)
- Execute: Run for 768 T-states (3 DIV increments)
- Expected result: DIV = 0x03, unaffected by TAC setting
- Validation: DIV runs independently of TIMA timer

### 10. Scanline LY Register Updates
**Test**: "LY register updates at exact scanline boundaries"
- Initial state: LY = 50, at T-state 455 of scanline 50
- Execute: Advance 1 T-state to scanline boundary
- Expected result: LY = 51 at T-state 0 of new scanline
- Validation: LYC=LY interrupt timing depends on exact LY updates

## Implementation Requirements

### System Clock Architecture
```
Master Clock Interface:
- step(cycles): Advance all components by specified T-states
- getCurrentCycle(): Return current system T-state count
- synchronizeComponents(): Ensure all components at same time
- getFrameProgress(): Return progress through current frame

Component Clock Interface:
- stepCPU(cycles): Advance CPU by M-cycles
- stepPPU(cycles): Advance PPU by T-states  
- stepTimers(cycles): Advance timer system
- stepAPU(cycles): Advance audio processing
```

### Timing Accuracy Requirements
```
Accuracy Standards:
- T-state level precision for all timing
- No drift between components over time
- Exact interrupt timing (±0 T-states)
- Perfect frame rate consistency (59.727500569606 Hz)

Performance Requirements:
- Real-time execution at native speed
- Efficient component synchronization
- Minimal timing overhead
- Support for debugging without timing impact
```

### Component Interface Standards
```
All components must implement:
- step(cycles): Execute for specified T-state count
- getState(): Return complete component state
- setState(state): Restore component state
- reset(): Initialize to power-on state
- getCurrentCycle(): Return component's current time
```

## References

### Primary Timing Sources
- **Blargg Test ROMs**: Comprehensive timing validation
  - `instr_timing.gb`: CPU instruction timing accuracy
  - `mem_timing.gb`: Memory access timing validation
  - `interrupt_time.gb`: Interrupt handling timing
- **Mealybug Tests**: PPU timing precision validation
  - All PPU tests require T-state accurate implementation

### Documentation Sources
- **Pan Docs**: https://gbdev.io/pandocs/Timing.html
- **GB Dev Wiki**: https://gbdev.gg8.se/wiki/articles/Timing
- **Technical References**: tests/resources/reference-implementations/technical-specifications.md

### Critical Validation Requirements
All timing implementations MUST pass Blargg timing test ROMs and produce frame-perfect output matching Mealybug test expected results. Any timing inaccuracy will cause game compatibility issues and test failures.

This specification ensures that all emulator components maintain the precise timing relationships required for accurate Game Boy DMG emulation.