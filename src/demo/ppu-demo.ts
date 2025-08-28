/**
 * PPU Demo - Visual test for Game Boy PPU background rendering
 *
 * Creates test patterns in VRAM to verify:
 * - Tile data loading
 * - Background tile map rendering
 * - PPU timing and frame generation
 * - Display integration
 */

import { EmulatorContainer } from '../emulator/EmulatorContainer';
import type { MMUComponent } from '../emulator/types';

// Demo state
let emulatorContainer: EmulatorContainer | null = null;
let animationId: number | null = null;
let lastFrameTime = 0;
let frameCount = 0;

// DOM elements
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const romInput = document.getElementById('rom-input') as HTMLInputElement;
const loadRomBtn = document.getElementById('load-rom-btn') as HTMLButtonElement;
const pattern1Btn = document.getElementById('pattern1-btn') as HTMLButtonElement;
const pattern2Btn = document.getElementById('pattern2-btn') as HTMLButtonElement;
const pattern3Btn = document.getElementById('pattern3-btn') as HTMLButtonElement;
const pattern4Btn = document.getElementById('pattern4-btn') as HTMLButtonElement;
const clearLogBtn = document.getElementById('clear-log-btn') as HTMLButtonElement;

const frameCountEl = document.getElementById('frame-count') as HTMLElement;
const cycleCountEl = document.getElementById('cycle-count') as HTMLElement;
const fpsEl = document.getElementById('fps') as HTMLElement;
const runningStatusEl = document.getElementById('running-status') as HTMLElement;
const cpuModeEl = document.getElementById('cpu-mode') as HTMLElement;
const romStatusEl = document.getElementById('rom-status') as HTMLElement;
const logContainer = document.getElementById('log-container') as HTMLElement;

// Debug status elements
const canvasStatus = document.getElementById('canvas-status') as HTMLElement;
const ppuStatus = document.getElementById('ppu-status') as HTMLElement;
const emulationStatus = document.getElementById('emulation-status') as HTMLElement;

/**
 * Update debug status display
 */
function updateDebugStatus(): void {
  // Check canvas status
  const displayElement = document.getElementById('emulator-display');
  const canvas = displayElement?.querySelector('canvas');
  if (canvas) {
    canvasStatus.textContent = `Canvas Status: Created (${canvas.width}x${canvas.height})`;
  } else {
    canvasStatus.textContent = 'Canvas Status: Not found';
  }

  // Check PPU status
  if (emulatorContainer) {
    const ppu = emulatorContainer.getPPU();
    if (ppu) {
      const ly = ppu.readRegister(0xff44);
      const mode = ppu.getMode();
      ppuStatus.textContent = `PPU Status: Active (LY=${ly}, Mode=${mode})`;
    } else {
      ppuStatus.textContent = 'PPU Status: Not available';
    }

    // Check emulation status
    emulationStatus.textContent = `Emulation Status: ${emulatorContainer.isRunning() ? 'Running' : 'Stopped'}`;
  }
}

/**
 * Initialize the emulator demo
 */
function initDemo(): void {
  log('Initializing PPU Demo...', 'info');

  const displayElement = document.getElementById('emulator-display');
  if (!displayElement) {
    log('Error: Could not find emulator display element', 'error');
    return;
  }

  try {
    // Create emulator container
    emulatorContainer = new EmulatorContainer(displayElement, {
      display: {
        width: 160 * 3, // 3x scale for visibility
        height: 144 * 3,
        scale: 3,
      },
      debug: true,
    });

    log('EmulatorContainer initialized successfully', 'info');

    // Set up event listeners
    setupEventListeners();

    // Load initial test pattern
    loadSolidColorPattern();

    // Update debug status
    updateDebugStatus();

    log('PPU Demo ready. Click "Start Emulation" to begin.', 'info');
  } catch (error) {
    log(`Error initializing emulator: ${error}`, 'error');
  }
}

/**
 * Set up button event listeners
 */
function setupEventListeners(): void {
  startBtn.addEventListener('click', startEmulation);
  stopBtn.addEventListener('click', stopEmulation);
  resetBtn.addEventListener('click', resetEmulation);
  loadRomBtn.addEventListener('click', triggerROMLoad);
  romInput.addEventListener('change', handleROMLoad);
  pattern1Btn.addEventListener('click', loadSolidColorPattern);
  pattern2Btn.addEventListener('click', loadCheckerboardPattern);
  pattern3Btn.addEventListener('click', loadGradientPattern);
  pattern4Btn.addEventListener('click', loadTestTilesPattern);
  clearLogBtn.addEventListener('click', clearLog);
}

/**
 * Start emulation loop
 */
function startEmulation(): void {
  if (!emulatorContainer) {
    log('Error: Emulator not initialized', 'error');
    return;
  }

  log('Starting emulation...', 'info');
  emulatorContainer.start();

  if (emulatorContainer.getPPU()) {
    // PPU is available and ready
  }

  startBtn.disabled = true;
  stopBtn.disabled = false;

  lastFrameTime = performance.now();
  frameCount = 0;

  // Start animation loop
  requestAnimationFrame(emulationLoop);
}

/**
 * Stop emulation loop
 */
function stopEmulation(): void {
  if (!emulatorContainer) {
    return;
  }

  log('Stopping emulation...', 'info');
  emulatorContainer.stop();

  startBtn.disabled = false;
  stopBtn.disabled = true;

  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

/**
 * Reset emulation to initial state
 */
function resetEmulation(): void {
  if (!emulatorContainer) {
    return;
  }

  log('Resetting emulation...', 'info');
  stopEmulation();
  emulatorContainer.reset();

  frameCount = 0;
  updateStats();
}

/**
 * Main emulation loop
 */
function emulationLoop(currentTime: number): void {
  if (!emulatorContainer?.isRunning()) {
    return;
  }

  // Calculate frame timing
  const deltaTime = currentTime - lastFrameTime;

  // Target ~60 FPS (Game Boy runs at ~59.7 FPS)
  if (deltaTime >= 16.7) {
    // PERFORMANCE OPTIMIZATION: Use reduced cycle count for VRAM pattern demo
    // When no ROM is loaded, we're just executing NOP instructions (4 cycles each)
    // Full Game Boy timing would require ~70,224 cycles per frame (17,556 NOPs)
    // For smooth 60 FPS demo, reduce to ~1,000 cycles per frame (250 NOPs)
    const isROMLoaded = emulatorContainer.isROMLoaded();
    const targetCycles = isROMLoaded ? 70224 : 1000; // Reduced cycles for demo mode

    let cyclesExecuted = 0;
    let stepCount = 0;

    while (cyclesExecuted < targetCycles && emulatorContainer.isRunning()) {
      const cycles = emulatorContainer.step();
      cyclesExecuted += cycles;
      stepCount++;

      // Break early if we hit an error or stop condition
      if (cycles === 0) {
        break;
      }

      // Limit step count to prevent infinite loops (adjusted for demo mode)
      const maxSteps = isROMLoaded ? 100000 : 1000;
      if (stepCount > maxSteps) {
        break;
      }
    }

    frameCount++;
    lastFrameTime = currentTime;

    // Update UI stats every 10 frames to reduce overhead
    if (frameCount % 10 === 0) {
      updateStats();
    }
  }

  // Continue the animation loop
  animationId = requestAnimationFrame(emulationLoop);
}

/**
 * Update statistics display
 */
function updateStats(): void {
  if (!emulatorContainer) {
    return;
  }

  const state = emulatorContainer.getState();

  frameCountEl.textContent = state.frameCount.toString();
  cycleCountEl.textContent = state.cycleCount.toString();
  runningStatusEl.textContent = state.running ? 'Yes' : 'No';

  // Calculate FPS
  const currentTime = performance.now();
  const fps = frameCount > 0 ? (1000 / (currentTime - lastFrameTime || 1)).toFixed(1) : '0';
  fpsEl.textContent = fps;

  // Update CPU mode based on ROM status
  const isROMLoaded = emulatorContainer.isROMLoaded();
  cpuModeEl.textContent = isROMLoaded ? 'Full Speed' : 'Demo Mode (Optimized)';

  // Update ROM status
  if (isROMLoaded) {
    const romInfo = emulatorContainer.getROMInfo();
    if (romInfo?.header) {
      romStatusEl.textContent = `${romInfo.header.title} (${Math.round(romInfo.size / 1024)}KB)`;
    } else {
      romStatusEl.textContent = 'ROM Loaded';
    }
  } else {
    romStatusEl.textContent = 'No ROM Loaded';
  }

  // Update debug status
  updateDebugStatus();
}

/**
 * Load solid color test pattern into VRAM
 */
function loadSolidColorPattern(): void {
  if (!emulatorContainer) {
    log('Error: Emulator not initialized', 'error');
    return;
  }

  log('Loading solid color test pattern...', 'info');

  try {
    const mmu = emulatorContainer.getMMU();

    // Clear VRAM first
    clearVRAM(mmu);

    // Create 4 different solid tiles (using 2-bit pixel data)
    const tiles = [
      // Tile 0: White (11 11 11 11...)
      new Array(16).fill(0xff),
      // Tile 1: Light gray (10 10 10 10...)
      new Array(8).fill(0xaa).concat(new Array(8).fill(0x55)),
      // Tile 2: Dark gray (01 01 01 01...)
      new Array(8).fill(0x55).concat(new Array(8).fill(0xaa)),
      // Tile 3: Black (00 00 00 00...)
      new Array(16).fill(0x00),
    ];

    // Load tiles into VRAM tile data area ($8000-$87FF)
    for (let tileIndex = 0; tileIndex < tiles.length; tileIndex++) {
      const tileData = tiles[tileIndex];
      const baseAddr = 0x8000 + tileIndex * 16; // Each tile is 16 bytes

      for (let byteIndex = 0; byteIndex < tileData.length; byteIndex++) {
        mmu.writeByte(baseAddr + byteIndex, tileData[byteIndex]);
      }
    }

    // Create tile map with different patterns
    // Background tile map is at $9800-$9BFF (32x32 tiles)
    for (let row = 0; row < 18; row++) {
      // Only render visible area (18 rows)
      for (let col = 0; col < 20; col++) {
        // Only render visible area (20 cols)
        let tileId = 0;

        // Create a gradient pattern
        if (col < 5)
          tileId = 0; // White
        else if (col < 10)
          tileId = 1; // Light gray
        else if (col < 15)
          tileId = 2; // Dark gray
        else tileId = 3; // Black

        const mapAddr = 0x9800 + row * 32 + col;
        mmu.writeByte(mapAddr, tileId);
      }
    }

    // Configure LCDC register for background rendering
    // LCDC = $FF40: Enable LCD, BG, use tile data $8000-$8FFF, use BG map $9800-$9BFF
    mmu.writeByte(0xff40, 0x91); // 10010001: LCD on, BG on, tile data at $8000, BG map at $9800

    // Set background palette (BGP = $FF47)
    // Each 2-bit value maps to a shade: 00=lightest, 11=darkest
    mmu.writeByte(0xff47, 0xe4); // 11100100: 3,2,1,0 -> black,dark gray,light gray,white

    // Set scroll positions to 0
    mmu.writeByte(0xff42, 0); // SCY - Background Y scroll
    mmu.writeByte(0xff43, 0); // SCX - Background X scroll

    log('Solid color pattern loaded successfully', 'info');
  } catch (error) {
    log(`Error loading solid color pattern: ${error}`, 'error');
  }
}

/**
 * Load checkerboard test pattern into VRAM
 */
function loadCheckerboardPattern(): void {
  if (!emulatorContainer) {
    log('Error: Emulator not initialized', 'error');
    return;
  }

  log('Loading checkerboard test pattern...', 'info');

  try {
    const mmu = emulatorContainer.getMMU();

    clearVRAM(mmu);

    // Create checkerboard tiles
    // Tile 0: White square
    const whiteTile = new Array(16).fill(0xff);
    // Tile 1: Black square
    const blackTile = new Array(16).fill(0x00);

    // Load tiles into VRAM
    const tiles = [whiteTile, blackTile];
    for (let tileIndex = 0; tileIndex < tiles.length; tileIndex++) {
      const tileData = tiles[tileIndex];
      const baseAddr = 0x8000 + tileIndex * 16;

      for (let byteIndex = 0; byteIndex < tileData.length; byteIndex++) {
        mmu.writeByte(baseAddr + byteIndex, tileData[byteIndex]);
      }
    }

    // Create checkerboard pattern in tile map
    for (let row = 0; row < 18; row++) {
      for (let col = 0; col < 20; col++) {
        const tileId = (row + col) % 2; // Alternate between 0 and 1
        const mapAddr = 0x9800 + row * 32 + col;
        mmu.writeByte(mapAddr, tileId);
      }
    }

    // Configure display
    mmu.writeByte(0xff40, 0x91); // LCD on, BG on
    mmu.writeByte(0xff47, 0xe4); // Background palette
    mmu.writeByte(0xff42, 0); // SCY
    mmu.writeByte(0xff43, 0); // SCX

    log('Checkerboard pattern loaded successfully', 'info');
  } catch (error) {
    log(`Error loading checkerboard pattern: ${error}`, 'error');
  }
}

/**
 * Load gradient test pattern into VRAM
 */
function loadGradientPattern(): void {
  if (!emulatorContainer) {
    log('Error: Emulator not initialized', 'error');
    return;
  }

  log('Loading gradient test pattern...', 'info');

  try {
    const mmu = emulatorContainer.getMMU();

    clearVRAM(mmu);

    // Create gradient tiles with different patterns
    const gradientTiles = [];

    for (let tileIndex = 0; tileIndex < 16; tileIndex++) {
      const tile = [];
      for (let byteIndex = 0; byteIndex < 16; byteIndex++) {
        // Create horizontal gradient within each tile
        const intensity = Math.floor((byteIndex / 15) * 3); // 0-3 intensity
        let byteValue = 0;

        // Create bit pattern based on intensity
        switch (intensity) {
          case 0:
            byteValue = 0x00;
            break; // 00000000
          case 1:
            byteValue = 0x55;
            break; // 01010101
          case 2:
            byteValue = 0xaa;
            break; // 10101010
          case 3:
            byteValue = 0xff;
            break; // 11111111
        }

        tile.push(byteValue);
      }
      gradientTiles.push(tile);
    }

    // Load gradient tiles into VRAM
    for (let tileIndex = 0; tileIndex < gradientTiles.length; tileIndex++) {
      const tileData = gradientTiles[tileIndex];
      const baseAddr = 0x8000 + tileIndex * 16;

      for (let byteIndex = 0; byteIndex < tileData.length; byteIndex++) {
        mmu.writeByte(baseAddr + byteIndex, tileData[byteIndex]);
      }
    }

    // Create vertical gradient in tile map
    for (let row = 0; row < 18; row++) {
      for (let col = 0; col < 20; col++) {
        const tileId = Math.floor((row / 17) * 15); // Use different tiles for gradient
        const mapAddr = 0x9800 + row * 32 + col;
        mmu.writeByte(mapAddr, tileId);
      }
    }

    // Configure display
    mmu.writeByte(0xff40, 0x91); // LCD on, BG on
    mmu.writeByte(0xff47, 0xe4); // Background palette
    mmu.writeByte(0xff42, 0); // SCY
    mmu.writeByte(0xff43, 0); // SCX

    log('Gradient pattern loaded successfully', 'info');
  } catch (error) {
    log(`Error loading gradient pattern: ${error}`, 'error');
  }
}

/**
 * Load complex test tiles pattern into VRAM
 */
function loadTestTilesPattern(): void {
  if (!emulatorContainer) {
    log('Error: Emulator not initialized', 'error');
    return;
  }

  log('Loading test tiles pattern...', 'info');

  try {
    const mmu = emulatorContainer.getMMU();

    clearVRAM(mmu);

    // Create various test patterns
    const testTiles = [
      // Tile 0: Border pattern
      [
        0xff, 0xff, 0x81, 0x81, 0x81, 0x81, 0x81, 0x81, 0x81, 0x81, 0x81, 0x81, 0x81, 0x81, 0xff,
        0xff,
      ],
      // Tile 1: Diagonal lines
      [
        0x80, 0x80, 0x40, 0x40, 0x20, 0x20, 0x10, 0x10, 0x08, 0x08, 0x04, 0x04, 0x02, 0x02, 0x01,
        0x01,
      ],
      // Tile 2: Dots pattern
      [
        0x00, 0x00, 0x24, 0x24, 0x00, 0x00, 0x42, 0x42, 0x00, 0x00, 0x24, 0x24, 0x00, 0x00, 0x42,
        0x42,
      ],
      // Tile 3: Cross pattern
      [
        0x00, 0x00, 0x18, 0x18, 0x18, 0x18, 0xff, 0xff, 0xff, 0xff, 0x18, 0x18, 0x18, 0x18, 0x00,
        0x00,
      ],
    ];

    // Load test tiles into VRAM
    for (let tileIndex = 0; tileIndex < testTiles.length; tileIndex++) {
      const tileData = testTiles[tileIndex];
      const baseAddr = 0x8000 + tileIndex * 16;

      for (let byteIndex = 0; byteIndex < tileData.length; byteIndex++) {
        mmu.writeByte(baseAddr + byteIndex, tileData[byteIndex]);
      }
    }

    // Create pattern in tile map
    for (let row = 0; row < 18; row++) {
      for (let col = 0; col < 20; col++) {
        let tileId = 0;

        // Create a pattern with different test tiles
        if (row < 2 || row >= 16 || col < 2 || col >= 18) {
          tileId = 0; // Border
        } else if ((row + col) % 4 === 0) {
          tileId = 1; // Diagonal
        } else if ((row + col) % 4 === 1) {
          tileId = 2; // Dots
        } else {
          tileId = 3; // Cross
        }

        const mapAddr = 0x9800 + row * 32 + col;
        mmu.writeByte(mapAddr, tileId);
      }
    }

    // Configure display
    mmu.writeByte(0xff40, 0x91); // LCD on, BG on
    mmu.writeByte(0xff47, 0xe4); // Background palette
    mmu.writeByte(0xff42, 0); // SCY
    mmu.writeByte(0xff43, 0); // SCX

    log('Test tiles pattern loaded successfully', 'info');
  } catch (error) {
    log(`Error loading test tiles pattern: ${error}`, 'error');
  }
}

/**
 * Clear VRAM to prepare for new pattern
 */
function clearVRAM(mmu: MMUComponent): void {
  // Clear tile data area ($8000-$97FF)
  for (let addr = 0x8000; addr <= 0x97ff; addr++) {
    mmu.writeByte(addr, 0x00);
  }

  // Clear tile maps ($9800-$9FFF)
  for (let addr = 0x9800; addr <= 0x9fff; addr++) {
    mmu.writeByte(addr, 0x00);
  }
}

/**
 * Trigger ROM file selection
 */
function triggerROMLoad(): void {
  romInput.click();
}

/**
 * Handle ROM file loading
 */
async function handleROMLoad(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) {
    return;
  }

  if (!emulatorContainer) {
    log('Error: Emulator not initialized', 'error');
    return;
  }

  try {
    log(`Loading ROM file: ${file.name} (${file.size} bytes)`, 'info');

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const romData = new Uint8Array(arrayBuffer);

    // Load ROM into emulator
    emulatorContainer.loadROM(romData, file.name);

    log(`ROM loaded successfully: ${file.name}`, 'info');

    // Update UI to reflect ROM loaded state
    updateStats();

    // Clear the file input for future use
    target.value = '';
  } catch (error) {
    log(`Error loading ROM: ${error}`, 'error');
    // Clear the file input on error
    target.value = '';
  }
}

/**
 * Add log entry to the UI
 */
function log(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement('div');
  logEntry.className = `log-entry ${type}`;
  logEntry.textContent = `[${timestamp}] ${message}`;

  logContainer.appendChild(logEntry);
  logContainer.scrollTop = logContainer.scrollHeight;
}

/**
 * Clear the log
 */
function clearLog(): void {
  logContainer.innerHTML = '';
}

// Initialize demo when page loads
document.addEventListener('DOMContentLoaded', initDemo);
