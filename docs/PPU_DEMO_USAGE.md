# PPU Demo Usage Guide

## Overview

The PPU Demo is a simple web interface that demonstrates the Game Boy emulator's Picture Processing Unit (PPU) with background rendering capabilities. It provides visual verification that the PPU integration with the EmulatorContainer works correctly.

## Files Created

- `/ppu-demo.html` - HTML page with demo interface
- `/src/demo/ppu-demo.ts` - TypeScript implementation with test patterns
- `/tests/demo/ppu-demo.integration.test.ts` - Integration tests for demo functionality

## Running the Demo

### Development Mode

```bash
npm run dev
```

Then navigate to: `http://localhost:3000/ppu-demo.html`

### Production Build

```bash
npm run build
```

The demo will be available in the `dist/` directory as `ppu-demo.html`

## Demo Features

### Test Patterns

The demo includes four different VRAM test patterns to verify rendering:

1. **Solid Colors** - Creates tiles with different shades (white, light gray, dark gray, black)
2. **Checkerboard** - Alternating black and white tiles in a checkerboard pattern  
3. **Gradient** - Horizontal gradients within tiles creating a vertical fade effect
4. **Test Tiles** - Complex patterns including borders, diagonals, dots, and crosses

### Controls

- **Start Emulation** - Begins the CPU/PPU emulation loop
- **Stop Emulation** - Pauses the emulation 
- **Reset** - Clears emulator state and returns to initial conditions
- **Pattern Buttons** - Load different test patterns into VRAM
- **Clear Log** - Clears the debug log panel

### Statistics Display

The demo shows real-time statistics:

- **Frame Count** - Total frames rendered
- **Cycle Count** - Total CPU cycles executed  
- **FPS** - Current frames per second
- **Running Status** - Whether emulation is active

### Debug Log

All demo operations are logged with timestamps in the debug panel, including:
- Emulation start/stop/reset events
- Test pattern loading confirmation  
- Any errors that occur during operation

## Technical Implementation

### VRAM Test Pattern Loading

Each test pattern:
1. Clears VRAM tile data area ($8000-$97FF)
2. Loads tile definitions (16 bytes per 8x8 tile)
3. Creates background tile map ($9800-$9BFF) 
4. Configures PPU registers (LCDC, BGP, SCX, SCY)

### PPU Configuration

The demo configures the PPU for background rendering:
- `LCDC ($FF40)` = `0x91` - LCD on, background enabled, tile data at $8000
- `BGP ($FF47)` = `0xE4` - 4-shade background palette (black to white)
- `SCX/SCY` = `0` - No background scrolling

### Emulation Loop

The demo runs a 60 FPS emulation loop that:
1. Executes ~70,224 CPU cycles per frame (Game Boy timing)
2. Steps the PPU alongside CPU execution
3. Renders completed frames through the display pipeline
4. Updates statistics and UI every 10 frames

## Integration Testing

Run the integration tests to verify demo functionality:

```bash
npm test tests/demo/ppu-demo.integration.test.ts
```

The tests verify:
- EmulatorContainer initialization
- Component integration (CPU, PPU, MMU, Display)
- VRAM pattern loading
- Emulation control (start/stop/reset)
- Performance statistics

## Visual Verification

When working correctly, you should see:
- Game Boy-sized display (160x144, scaled 3x to 480x432)
- Different visual patterns when switching between test modes
- Smooth 60 FPS rendering indicated in statistics
- No errors in the debug log

This demonstrates that the complete PPU rendering pipeline is functional, from VRAM data through tile rendering to final display output.