# ADR-001: Omit Game Boy Boot ROM Due to Copyright Restrictions

## Status

**ACCEPTED** - December 2024

## Context

The original Game Boy DMG contains a 256-byte boot ROM (also known as boot sequence or BIOS) located at memory addresses 0x0000-0x00FF. This boot ROM performs several critical functions:

1. **Logo Validation**: Displays the Nintendo logo and validates it against cartridge header data
2. **Hardware Initialization**: Sets up initial CPU register states and memory values
3. **Audio Setup**: Plays the distinctive boot chime
4. **System Handoff**: Transfers control to the cartridge at address 0x0100

However, the Game Boy boot ROM is proprietary Nintendo code protected by copyright law. Distribution of the original boot ROM code would constitute copyright infringement and potentially expose the project to legal liability.

### Technical Requirements for Boot ROM Functionality

Through research of authoritative sources (Pan Docs, gbdev.io, GameBoy Online implementation), the boot ROM establishes these critical system states:

#### CPU Register Initial Values (DMG)

```
AF = 0x01B0  (A=0x01, F=0xB0)
BC = 0x0013  (B=0x00, C=0x13)
DE = 0x00D8  (D=0x00, E=0xD8)
HL = 0x014D  (H=0x01, L=0x4D)
SP = 0xFFFE  (Stack Pointer)
PC = 0x0100  (Program Counter - entry point)
```

#### Hardware Register Initial States

```
LCDC (0xFF40) = 0x91  (LCD Control - display enabled)
BGP  (0xFF47) = 0xFC  (Background Palette)
OBP0 (0xFF48) = 0xFF  (Object Palette 0)
OBP1 (0xFF49) = 0xFF  (Object Palette 1)
```

#### Memory Initialization

- **VRAM (0x8000-0x9FFF)**: Zeroed (all 0x00)
- **Stack area**: Initialized for proper stack operations
- **I/O registers**: Set to power-on defaults

#### Boot Sequence Timing

The boot ROM normally executes for approximately 900-1000 CPU cycles before transferring control to the cartridge, including logo display and validation phases.

### Alternative Implementations

Research shows multiple approaches used by existing emulators:

1. **Include Boot ROM**: Some emulators ship with extracted boot ROM (legal risk)
2. **Boot ROM Emulation**: Recreate boot ROM functionality without original code
3. **Boot ROM Skip**: Initialize system state directly and start at 0x0100
4. **Optional Boot ROM**: Allow users to provide their own extracted boot ROM

## Decision

**We will omit the Game Boy boot ROM entirely and implement a "boot ROM skip" approach.**

The emulator will:

1. **Skip Boot Sequence**: Never execute boot ROM code
2. **Direct Initialization**: Set CPU registers and memory to post-boot states
3. **Immediate Start**: Begin execution directly at cartridge entry point (0x0100)
4. **State Staging**: Pre-configure all hardware registers to expected post-boot values

### Implementation Approach

#### System Initialization Sequence

```typescript
// CPU Register Initialization (DMG values)
cpu.registers.A = 0x01;
cpu.registers.F = 0xb0; // Flags: Z=1, N=0, H=1, C=0
cpu.registers.B = 0x00;
cpu.registers.C = 0x13;
cpu.registers.D = 0x00;
cpu.registers.E = 0xd8;
cpu.registers.H = 0x01;
cpu.registers.L = 0x4d;
cpu.registers.SP = 0xfffe;
cpu.registers.PC = 0x0100; // Start at cartridge entry point

// Hardware Register Initialization
memory.write(0xff40, 0x91); // LCDC - LCD enabled, BG on
memory.write(0xff47, 0xfc); // BGP - Background palette
memory.write(0xff48, 0xff); // OBP0 - Object palette 0
memory.write(0xff49, 0xff); // OBP1 - Object palette 1

// VRAM Initialization
for (let addr = 0x8000; addr <= 0x9fff; addr++) {
  memory.write(addr, 0x00);
}
```

#### Timing Considerations

- **Skip Boot Delay**: No 900-cycle boot sequence delay
- **Immediate Execution**: Games start instantly
- **Cycle Accuracy**: Maintain cycle-accurate timing from 0x0100 onward

## Consequences

### Positive Consequences

#### Legal Compliance

- **No Copyright Risk**: Eliminates legal liability from distributing Nintendo code
- **Open Source Safe**: Project can be freely distributed and modified
- **Contribution Friendly**: No legal barriers for community contributions

#### Technical Benefits

- **Faster Startup**: Games start immediately without boot delay
- **Simplified Implementation**: No boot ROM execution logic required
- **Reduced Complexity**: Fewer edge cases and timing concerns
- **Better Testing**: Deterministic startup state for all tests

#### Compatibility Benefits

- **Universal Compatibility**: Works with all cartridges regardless of logo validation
- **Homebrew Friendly**: Supports homebrew ROMs without proper Nintendo logo
- **Development Ease**: Simplifies debugging by starting directly in game code

### Negative Consequences

#### Authenticity Impact

- **Missing Boot Experience**: No Nintendo logo display or boot chime
- **Visual Difference**: Users won't see the classic Game Boy startup
- **Authenticity Loss**: Less authentic to original hardware experience

#### Compatibility Concerns

- **Logo Validation Skip**: Games expecting logo validation may behave differently
- **Timing Differences**: Some games might rely on boot ROM timing (rare)
- **Edge Case Behavior**: Unusual cartridges might expect specific boot behavior

#### Testing Implications

- **Hardware Validation**: Cannot test boot ROM behavior against hardware
- **Test ROM Gaps**: Some test ROMs expect boot ROM functionality
- **State Verification**: Must verify post-boot state matches hardware exactly

### Mitigation Strategies

#### Accuracy Validation

- **Test ROM Validation**: Use Blargg and Mealybug tests to verify post-boot state accuracy
- **Register State Testing**: Comprehensive testing of initial register values
- **Hardware Comparison**: Validate against documented hardware behavior

#### Documentation Standards

- **Clear Documentation**: Document the boot ROM omission and rationale
- **Implementation Notes**: Explain initialization sequence and values
- **Compatibility Notes**: Document any games that might be affected

#### Alternative Solutions

- **Optional Boot ROM**: Future consideration for user-provided boot ROM
- **Boot Animation**: Implement similar visual experience without Nintendo code
- **Debug Mode**: Provide boot ROM simulation for development/testing

## Alternatives Considered

### Alternative 1: Boot ROM Emulation

**Approach**: Recreate boot ROM functionality without using original code

- **Pros**: Authentic boot experience, logo validation, timing accuracy
- **Cons**: Complex implementation, potential legal gray area, validation difficulty
- **Rejected**: Too complex for marginal benefit, potential legal concerns

### Alternative 2: Optional Boot ROM

**Approach**: Allow users to provide their own extracted boot ROM file

- **Pros**: User choice, authentic experience when desired, legal safety
- **Cons**: Complex implementation, user burden, inconsistent experience
- **Rejected**: Adds complexity without universal benefit

### Alternative 3: Boot ROM Recreation

**Approach**: Write new code that performs identical functions

- **Pros**: Full boot functionality, no copyright issues
- **Cons**: Extremely complex, reverse engineering concerns, validation challenges
- **Rejected**: Massive implementation effort for cosmetic benefit

### Alternative 4: Include Boot ROM

**Approach**: Ship with extracted boot ROM as many emulators do

- **Pros**: Perfect authenticity, simple implementation
- **Cons**: Copyright infringement, legal liability, distribution restrictions
- **Rejected**: Unacceptable legal risk

## References

### Technical Documentation

- **Pan Docs**: https://gbdev.io/pandocs/Power_Up_Sequence.html - Boot sequence documentation
- **gbdev.io**: https://gbdev.io/pandocs/CPU_Registers_and_Flags.html - Initial register states
- **GameBoy Online**: Reference implementation boot ROM skip patterns

### Test ROM Resources

- **Blargg Tests**: Validate post-boot CPU state and behavior
- **Mealybug Tests**: Verify PPU initialization and display state
- **opcodes.json**: CPU instruction behavior validation

### Legal Research

- **Copyright Law**: Boot ROM is proprietary Nintendo code under copyright protection
- **Fair Use**: Technical analysis permitted, distribution is not
- **Community Practice**: Many emulators use boot ROM skip approach

## Implementation Requirements

### Core Implementation

1. **CPU Initialization**: Set all registers to documented post-boot values
2. **Memory Initialization**: Initialize VRAM, I/O registers, and stack area
3. **Hardware State**: Configure PPU, timer, and other systems to post-boot state
4. **Entry Point**: Start execution at PC=0x0100 immediately

### Validation Requirements

1. **Register Testing**: Verify all CPU registers match documented values
2. **Memory Testing**: Confirm VRAM and I/O register initialization
3. **Hardware Testing**: Validate PPU and timer initial states
4. **Test ROM Validation**: Ensure Blargg/Mealybug tests pass with our initialization

### Documentation Requirements

1. **Technical Documentation**: Document initialization sequence and values
2. **User Documentation**: Explain boot ROM omission and implications
3. **Developer Notes**: Provide implementation guidance and validation steps
4. **ADR Updates**: Maintain this decision record with implementation lessons

## Success Criteria

### Technical Success

- [ ] All CPU registers initialized to documented DMG values
- [ ] All hardware registers set to correct post-boot states
- [ ] VRAM properly zeroed and accessible
- [ ] Games start immediately at 0x0100 with correct state
- [ ] All Blargg CPU tests pass with our initialization
- [ ] All Mealybug PPU tests pass with our initialization

### Compatibility Success

- [ ] Major commercial games work correctly
- [ ] Homebrew ROMs function properly
- [ ] No timing-related compatibility issues
- [ ] Edge case cartridges handled appropriately

### Legal Compliance

- [ ] No Nintendo copyrighted code included
- [ ] Project can be freely distributed
- [ ] Open source licensing unencumbered
- [ ] Community contributions legally safe

## Conclusion

The decision to omit the Game Boy boot ROM represents a pragmatic balance between legal compliance, implementation complexity, and functional requirements. While this approach sacrifices some authenticity in the boot experience, it provides:

- **Legal Safety**: Complete copyright compliance
- **Implementation Simplicity**: Straightforward initialization
- **Universal Compatibility**: Works with all cartridges
- **Performance Benefits**: Instant game startup

The implementation approach of directly initializing system state to post-boot values, combined with comprehensive test ROM validation, ensures hardware accuracy where it matters most - during actual game execution.

This decision aligns with the project's emphasis on **engineering excellence**, **legal compliance**, and **practical functionality** while maintaining the core goal of **cycle-accurate Game Boy DMG emulation**.

---

_This ADR establishes the foundation for legal, accurate, and maintainable Game Boy emulation without copyright concerns._
