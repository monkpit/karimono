/**
 * Performance POC App Component
 *
 * UI component that provides controls for performance testing and real-time
 * metrics display comparing immutable vs mutable state management approaches.
 */

import { PerformanceMetrics } from './performance-metrics';
import { GameBoySimulator, SimulationMode } from './gameboy-simulator';
import { LazyRingBuffer } from './ring-buffer';

export class PerformancePOCApp {
  private container: HTMLElement;
  private simulator: GameBoySimulator;
  private metrics: PerformanceMetrics;
  private running = false;
  private performanceLoopTimeoutId: number | null = null;
  private updateInterval: number | null = null;
  private ringBufferEnabled = true; // Default to enabled for backward compatibility
  private lazyRingBuffer: LazyRingBuffer;

  // Performance target constants
  private static readonly TARGET_HZ = 1_050_000; // 1.05m ops/sec gets us to worst case
  private static readonly UPDATE_INTERVAL_MS = 100; // Update UI every 100ms

  constructor(container: HTMLElement) {
    this.container = container;
    this.simulator = new GameBoySimulator();
    this.metrics = new PerformanceMetrics();
    this.lazyRingBuffer = new LazyRingBuffer(60); // 1 second at 60fps with lazy copying
  }

  render(): void {
    this.container.innerHTML = this.getHTML();
    this.attachEventListeners();
    this.updateDisplay();
  }

  private getHTML(): string {
    return `
      <div class="performance-poc">
        <h1>Game Boy Emulator Performance POC</h1>
        
        <div class="controls">
          <div class="control-group">
            <label for="mode-selector">Test Mode:</label>
            <select id="mode-selector" data-control="mode">
              <option value="mutable">Mutable State</option>
              <option value="immutable">Immutable State</option>
            </select>
          </div>
          
          <div class="control-group">
            <label for="ring-buffer-toggle">
              <input type="checkbox" id="ring-buffer-toggle" data-control="ring-buffer" checked>
              Enable Ring Buffer
            </label>
          </div>
          
          <button class="toggle-btn" data-action="toggle">
            Start Performance Test
          </button>
        </div>

        <div class="metrics-display">
          <div class="metric-card">
            <h3>Operations per Second</h3>
            <div class="metric-value" data-metric="ops-per-sec">0 ops/sec</div>
          </div>
          
          <div class="metric-card">
            <h3>Allocations per Second</h3>
            <div class="metric-value" data-metric="allocs-per-sec">0 allocs/sec</div>
          </div>
          
          <div class="metric-card">
            <h3>Memory Usage</h3>
            <div class="metric-value" data-metric="memory-usage">0 MB</div>
          </div>
        </div>

        <div class="performance-analysis">
          <div class="target-info" data-info="target">
            <h3>Target Performance</h3>
            <p>Game Boy CPU: 4.2MHz (4,200,000 operations/second)</p>
          </div>
          
          <div class="achievement-metric">
            <h3>Target Achievement</h3>
            <div class="percentage-display" data-metric="target-percentage">0%</div>
          </div>
        </div>

        <div class="test-status">
          <div class="status-indicator" data-status="current-state">Ready</div>
          <div class="mode-indicator">
            Current Mode: <span data-display="current-mode">Mutable</span>
          </div>
          <div class="buffer-indicator">
            Ring Buffer: <span data-display="ring-buffer-status">Enabled</span>
          </div>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Toggle button
    const toggleBtn = this.container.querySelector(
      'button[data-action="toggle"]'
    ) as HTMLButtonElement;
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleTest());
    }

    // Mode selector
    const modeSelector = this.container.querySelector(
      'select[data-control="mode"]'
    ) as HTMLSelectElement;
    if (modeSelector) {
      modeSelector.addEventListener('change', e => this.handleModeChange(e));
    }

    // Ring buffer toggle
    const ringBufferToggle = this.container.querySelector(
      'input[data-control="ring-buffer"]'
    ) as HTMLInputElement;
    if (ringBufferToggle) {
      ringBufferToggle.addEventListener('change', e => this.handleRingBufferToggle(e));
    }
  }

  private toggleTest(): void {
    if (this.running) {
      this.stopTest();
    } else {
      this.startTest();
    }
  }

  private startTest(): void {
    this.running = true;
    this.metrics.reset();
    this.lazyRingBuffer.clear(); // Clear lazy ring buffer for fresh test
    this.metrics.startTracking();

    // Update button text
    const toggleBtn = this.container.querySelector(
      'button[data-action="toggle"]'
    ) as HTMLButtonElement;
    if (toggleBtn) {
      toggleBtn.textContent = 'Stop Performance Test';
    }

    // Update status
    this.updateStatusDisplay('Running...');

    // Start the performance test loop
    this.runPerformanceTest();

    // Start UI update interval
    this.updateInterval = window.setInterval(() => {
      this.updateDisplay();
    }, PerformancePOCApp.UPDATE_INTERVAL_MS);
  }

  private stopTest(): void {
    this.running = false;
    this.metrics.stopTracking();

    // Update button text
    const toggleBtn = this.container.querySelector(
      'button[data-action="toggle"]'
    ) as HTMLButtonElement;
    if (toggleBtn) {
      toggleBtn.textContent = 'Start Performance Test';
    }

    // Update status
    this.updateStatusDisplay('Stopped');

    // Clear intervals and performance loop
    if (this.performanceLoopTimeoutId) {
      clearTimeout(this.performanceLoopTimeoutId);
      this.performanceLoopTimeoutId = null;
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Final display update
    this.updateDisplay();
  }

  private runPerformanceTest(): void {
    if (!this.running) return;

    // Perform a batch of operations per iteration
    // Target: Run as fast as possible to measure maximum CPU performance
    const operationsPerBatch = 10000; // Large batch for high-frequency measurement

    for (let i = 0; i < operationsPerBatch; i++) {
      this.simulator.simulateStep();
      this.metrics.recordOperation();

      // Record allocation for immutable mode
      if (this.simulator.getMode() === 'immutable') {
        this.metrics.recordAllocation();
      }

      // Conditionally store state snapshots in ring buffer (only for immutable mode)
      if (this.ringBufferEnabled && this.simulator.getMode() === 'immutable') {
        // Ring buffer only makes sense for immutable mode where we need snapshots
        const state = this.simulator.getState();
        const memoryRef = this.simulator.getMutableMemoryReference();
        this.lazyRingBuffer.pushSnapshot(state.registers, memoryRef, state.cycle);

        // Record allocation for snapshot (includes memory copy)
        this.metrics.recordAllocation();
      }
    }

    // Schedule next batch with minimal delay to run at maximum CPU speed
    // Using setTimeout(0) allows other browser tasks to run while maintaining high frequency
    this.performanceLoopTimeoutId = window.setTimeout(() => this.runPerformanceTest(), 0);
  }

  private updateDisplay(): void {
    // Operations per second
    const opsPerSec = this.running
      ? this.metrics.getCurrentOperationsPerSecond()
      : this.metrics.getOperationsPerSecond();

    const opsDisplay = this.container.querySelector('[data-metric="ops-per-sec"]');
    if (opsDisplay) {
      opsDisplay.textContent = `${this.formatNumber(opsPerSec)} ops/sec`;
    }

    // Allocations per second
    const allocsPerSec = this.running
      ? this.metrics.getCurrentAllocationsPerSecond()
      : this.metrics.getAllocationsPerSecond();

    const allocsDisplay = this.container.querySelector('[data-metric="allocs-per-sec"]');
    if (allocsDisplay) {
      allocsDisplay.textContent = `${this.formatNumber(allocsPerSec)} allocs/sec`;
    }

    // Memory usage
    const memoryUsage = this.metrics.getMemoryUsage();
    const memoryDisplay = this.container.querySelector('[data-metric="memory-usage"]');
    if (memoryDisplay) {
      const memoryMB = memoryUsage.heapUsed / (1024 * 1024);
      memoryDisplay.textContent = `${memoryMB.toFixed(2)} MB`;
    }

    // Target percentage
    const targetPercentage = (opsPerSec / PerformancePOCApp.TARGET_HZ) * 100;
    const percentageDisplay = this.container.querySelector('[data-metric="target-percentage"]');
    if (percentageDisplay) {
      percentageDisplay.textContent = `${targetPercentage.toFixed(2)}%`;

      // Color code based on performance
      const element = percentageDisplay as HTMLElement;
      if (targetPercentage >= 80) {
        element.style.color = 'green';
      } else if (targetPercentage >= 50) {
        element.style.color = 'orange';
      } else {
        element.style.color = 'red';
      }
    }

    // Current mode display
    const modeDisplay = this.container.querySelector('[data-display="current-mode"]');
    if (modeDisplay) {
      modeDisplay.textContent = this.simulator.getMode() === 'immutable' ? 'Immutable' : 'Mutable';
    }

    // Ring buffer status display
    const ringBufferStatusDisplay = this.container.querySelector(
      '[data-display="ring-buffer-status"]'
    );
    if (ringBufferStatusDisplay) {
      ringBufferStatusDisplay.textContent = this.ringBufferEnabled ? 'Enabled' : 'Disabled';
    }
  }

  private updateStatusDisplay(status: string): void {
    const statusDisplay = this.container.querySelector('[data-status="current-state"]');
    if (statusDisplay) {
      statusDisplay.textContent = status;
    }
  }

  private handleModeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newMode = target.value as SimulationMode;

    // Stop current test if running
    const wasRunning = this.running;
    if (this.running) {
      this.stopTest();
    }

    // Switch simulator mode
    this.simulator.setMode(newMode);

    // Reset metrics for clean comparison
    this.metrics.reset();
    this.lazyRingBuffer.clear();
    this.updateDisplay();

    // Restart test if it was running
    if (wasRunning) {
      this.startTest();
    }
  }

  private handleRingBufferToggle(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.ringBufferEnabled = target.checked;

    // Stop current test if running to reset metrics
    const wasRunning = this.running;
    if (this.running) {
      this.stopTest();
    }

    // Clear ring buffer and reset metrics for clean comparison
    this.lazyRingBuffer.clear();
    this.metrics.reset();
    this.updateDisplay();

    // Restart test if it was running
    if (wasRunning) {
      this.startTest();
    }
  }

  private formatNumber(num: number): string {
    if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(2) + 'M';
    } else if (num >= 1_000) {
      return (num / 1_000).toFixed(2) + 'K';
    } else {
      return num.toFixed(0);
    }
  }

  // Public API methods for testing
  isRunning(): boolean {
    return this.running;
  }

  getCurrentMode(): SimulationMode {
    return this.simulator.getMode();
  }

  isRingBufferEnabled(): boolean {
    return this.ringBufferEnabled;
  }

  destroy(): void {
    // Stop test if running
    if (this.running) {
      this.stopTest();
    }

    // Clear any remaining intervals or timeouts
    if (this.performanceLoopTimeoutId) {
      clearTimeout(this.performanceLoopTimeoutId);
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Clean up event listeners by clearing innerHTML
    this.container.innerHTML = '';
  }
}
