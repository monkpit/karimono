/**
 * Performance POC Entry Point
 *
 * Main TypeScript entry for the performance proof-of-concept page.
 * Initializes the PerformancePOCApp component and provides debugging utilities.
 */

import { PerformancePOCApp } from './performance-poc-app';
import './style.css';

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const appContainer = document.getElementById('app');

  if (!appContainer) {
    // eslint-disable-next-line no-console
    console.error('Could not find app container element with id "app"');
    return;
  }

  try {
    // Create and initialize the Performance POC app
    const app = new PerformancePOCApp(appContainer);
    app.render();

    // Add helpful console information
    // eslint-disable-next-line no-console
    console.log('🚀 Performance POC App initialized successfully');
    // eslint-disable-next-line no-console
    console.log('🎯 Target: 4.2MHz (4,200,000 operations/second)');
    // eslint-disable-next-line no-console
    console.log('🔄 Use the controls to test immutable vs mutable performance');
    // eslint-disable-next-line no-console
    console.log('📊 Real-time metrics will update during testing');

    // Make app available for debugging in development
    if (import.meta.env.DEV) {
      (window as { performancePOC?: PerformancePOCApp }).performancePOC = app;
      // eslint-disable-next-line no-console
      console.log('🔧 App instance available as window.performancePOC for debugging');
    }

    // Add keyboard shortcuts for power users
    document.addEventListener('keydown', event => {
      // Space bar to toggle test
      if (
        (event.code === 'Space' && !event.target) ||
        (event.target as HTMLElement).tagName !== 'INPUT'
      ) {
        event.preventDefault();
        const toggleBtn = document.querySelector(
          'button[data-action="toggle"]'
        ) as HTMLButtonElement;
        if (toggleBtn) {
          toggleBtn.click();
        }
      }

      // 'M' key to toggle mode
      if (event.code === 'KeyM' && event.ctrlKey) {
        event.preventDefault();
        const modeSelector = document.querySelector(
          'select[data-control="mode"]'
        ) as HTMLSelectElement;
        if (modeSelector) {
          modeSelector.value = modeSelector.value === 'mutable' ? 'immutable' : 'mutable';
          modeSelector.dispatchEvent(new Event('change'));
        }
      }
    });

    // eslint-disable-next-line no-console
    console.log('⌨️ Keyboard shortcuts:');
    // eslint-disable-next-line no-console
    console.log('  - Space: Toggle test start/stop');
    // eslint-disable-next-line no-console
    console.log('  - Ctrl+M: Toggle between mutable/immutable mode');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize Performance POC App:', error);

    // Show error message to user
    appContainer.innerHTML = `
      <div style="
        padding: 40px;
        text-align: center;
        background: #fee2e2;
        border: 2px solid #fca5a5;
        border-radius: 8px;
        color: #dc2626;
        font-family: sans-serif;
      ">
        <h2>❌ Failed to Load Performance POC</h2>
        <p>An error occurred while initializing the application.</p>
        <p style="margin-top: 10px; font-family: monospace; font-size: 14px;">
          ${error instanceof Error ? error.message : 'Unknown error'}
        </p>
        <p style="margin-top: 20px; color: #6b7280;">
          Please check the console for more details.
        </p>
      </div>
    `;
  }
});

// Export types and utilities for external use
export type { SimulationMode } from './gameboy-simulator';
export type { MemoryUsage } from './performance-metrics';
export { PerformancePOCApp } from './performance-poc-app';
export { GameBoySimulator } from './gameboy-simulator';
export { PerformanceMetrics } from './performance-metrics';
export { RingBuffer } from './ring-buffer';
