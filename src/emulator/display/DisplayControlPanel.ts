/**
 * DisplayControlPanel - UI Controls for Display Settings
 *
 * Provides user interface controls for display scaling, color palette selection,
 * performance monitoring, and other display-related settings.
 *
 * Features:
 * - Display scaling controls (1x-4x)
 * - Color palette selection (DMG green, grayscale, custom)
 * - Performance monitoring and frame rate display
 * - Settings persistence via localStorage
 * - Responsive design and accessibility support
 */

import type { DisplayComponent } from '../types';
import type { PPURenderingPipeline, ColorPalette, RenderingStats } from './PPURenderingPipeline';

/**
 * Display settings interface
 */
export interface DisplaySettings {
  scale: number;
  palette: string;
  frameRateMonitorEnabled: boolean;
}

/**
 * Performance recommendation interface
 */
export interface PerformanceRecommendation {
  type: 'warning' | 'info' | 'success';
  message: string;
}

/**
 * Display dimensions interface
 */
export interface DisplayDimensions {
  width: number;
  height: number;
}

/**
 * Display Control Panel - Frontend UI component for display settings
 */
export class DisplayControlPanel {
  private pipeline: PPURenderingPipeline;

  // Control panel state
  private isVisibleState = false;
  private currentScale = 3; // Default scale
  private currentPalette = 'dmg-green';
  private frameRateMonitorEnabled = false;
  private customPalettes = new Map<string, ColorPalette>();

  // UI elements
  private controlsElement: HTMLElement | null = null;
  private scaleButtons: HTMLButtonElement[] = [];
  private paletteSelect: HTMLSelectElement | null = null;
  private frameRateDisplay: HTMLElement | null = null;

  // Event handlers
  // eslint-disable-next-line no-unused-vars -- TODO: Remove when handlers are actually used in implementation
  private scaleChangeHandlers: ((scale: number) => void)[] = [];
  // eslint-disable-next-line no-unused-vars -- TODO: Remove when handlers are actually used in implementation
  private paletteChangeHandlers: ((palette: string) => void)[] = [];

  // Constants
  private static readonly AVAILABLE_SCALES = [1, 2, 3, 4];
  private static readonly DEFAULT_PALETTES = ['dmg-green', 'grayscale', 'high-contrast'];
  private static readonly GAME_BOY_WIDTH = 160;
  private static readonly GAME_BOY_HEIGHT = 144;
  private static readonly SETTINGS_KEY = 'emulator-display-settings';

  constructor(display: DisplayComponent, pipeline: PPURenderingPipeline) {
    if (!display) {
      throw new Error('Display component is required');
    }
    if (!pipeline) {
      throw new Error('Pipeline component is required');
    }

    // Note: display parameter reserved for future display integration
    this.pipeline = pipeline;

    // Initialize with current pipeline palette
    this.currentPalette = pipeline.getCurrentPaletteName();
  }

  /**
   * Check if control panel is currently visible
   */
  public isVisible(): boolean {
    return this.isVisibleState;
  }

  /**
   * Show the control panel
   */
  public show(): void {
    this.isVisibleState = true;
    this.createControlElements();
    this.updateDisplay();
  }

  /**
   * Hide the control panel
   */
  public hide(): void {
    this.isVisibleState = false;
    this.destroyControlElements();
  }

  /**
   * Toggle control panel visibility
   */
  public toggle(): void {
    if (this.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Destroy control panel and clean up resources
   */
  public destroy(): void {
    this.hide();
    this.scaleChangeHandlers = [];
    this.paletteChangeHandlers = [];
    this.customPalettes.clear();
  }

  /**
   * Get available scaling options
   */
  public getAvailableScales(): number[] {
    return [...DisplayControlPanel.AVAILABLE_SCALES];
  }

  /**
   * Get current display scale
   */
  public getCurrentScale(): number {
    return this.currentScale;
  }

  /**
   * Set display scale
   */
  public setScale(scale: number): void {
    if (scale < 1 || scale > 4) {
      throw new Error('Scale must be between 1 and 4');
    }

    this.currentScale = scale;
    this.notifyScaleChange(scale);
    this.announceToScreenReader(`Display scale changed to ${scale}x`);
  }

  /**
   * Register scale change handler
   */
  // eslint-disable-next-line no-unused-vars -- TODO: Remove when handler parameters are actually used
  public onScaleChange(handler: (scale: number) => void): void {
    this.scaleChangeHandlers.push(handler);
  }

  /**
   * Get display aspect ratio (Game Boy 160:144)
   */
  public getDisplayAspectRatio(): number {
    return DisplayControlPanel.GAME_BOY_WIDTH / DisplayControlPanel.GAME_BOY_HEIGHT;
  }

  /**
   * Get display dimensions for current scale
   */
  public getDisplayDimensions(): DisplayDimensions {
    return {
      width: DisplayControlPanel.GAME_BOY_WIDTH * this.currentScale,
      height: DisplayControlPanel.GAME_BOY_HEIGHT * this.currentScale,
    };
  }

  /**
   * Get available color palettes
   */
  public getAvailablePalettes(): string[] {
    const predefined = [...DisplayControlPanel.DEFAULT_PALETTES];
    const custom = Array.from(this.customPalettes.keys());
    return [...predefined, ...custom];
  }

  /**
   * Get current color palette name
   */
  public getCurrentPalette(): string {
    return this.currentPalette;
  }

  /**
   * Set color palette
   */
  public setPalette(paletteName: string): void {
    const availablePalettes = this.getAvailablePalettes();
    if (!availablePalettes.includes(paletteName)) {
      throw new Error(`Unknown color palette: ${paletteName}`);
    }

    this.currentPalette = paletteName;

    // Update pipeline palette
    if (this.customPalettes.has(paletteName)) {
      const customPalette = this.customPalettes.get(paletteName);
      if (customPalette) {
        this.pipeline.setColorPalette(customPalette);
      }
    } else {
      this.pipeline.setColorPalette(paletteName);
    }

    this.notifyPaletteChange(paletteName);
    this.announceToScreenReader(`Color palette changed to ${paletteName}`);
  }

  /**
   * Register palette change handler
   */
  // eslint-disable-next-line no-unused-vars -- TODO: Remove when handler parameters are actually used
  public onPaletteChange(handler: (palette: string) => void): void {
    this.paletteChangeHandlers.push(handler);
  }

  /**
   * Add custom color palette
   */
  public setCustomPalette(name: string, palette: ColorPalette): void {
    this.customPalettes.set(name, palette);

    // Update palette select if visible
    if (this.paletteSelect) {
      this.updatePaletteSelect();
    }
  }

  /**
   * Get color preview for a palette
   */
  public getPalettePreview(paletteName: string): [number, number, number][] {
    if (this.customPalettes.has(paletteName)) {
      const palette = this.customPalettes.get(paletteName);
      if (palette) {
        return [palette.color0, palette.color1, palette.color2, palette.color3];
      }
    }

    // Default palette previews
    const defaultPalettes: Record<string, [number, number, number][]> = {
      'dmg-green': [
        [155, 188, 15], // Light green
        [139, 172, 15], // Medium green
        [48, 98, 48], // Dark green
        [15, 56, 15], // Darkest green
      ],
      grayscale: [
        [255, 255, 255], // White
        [170, 170, 170], // Light gray
        [85, 85, 85], // Dark gray
        [0, 0, 0], // Black
      ],
      'high-contrast': [
        [255, 255, 255], // Pure white
        [192, 192, 192], // Light gray
        [64, 64, 64], // Dark gray
        [0, 0, 0], // Pure black
      ],
    };

    return defaultPalettes[paletteName] || defaultPalettes['dmg-green'];
  }

  /**
   * Check if frame rate monitor is enabled
   */
  public isFrameRateMonitorEnabled(): boolean {
    return this.frameRateMonitorEnabled;
  }

  /**
   * Set frame rate monitor enabled state
   */
  public setFrameRateMonitorEnabled(enabled: boolean): void {
    this.frameRateMonitorEnabled = enabled;

    if (this.frameRateDisplay) {
      this.frameRateDisplay.style.display = enabled ? 'block' : 'none';
    }
  }

  /**
   * Get frame rate statistics
   */
  public getFrameRateStats(): RenderingStats {
    return this.pipeline.getRenderingStats();
  }

  /**
   * Get performance recommendations
   */
  public getPerformanceRecommendations(): PerformanceRecommendation[] {
    const stats = this.getFrameRateStats();
    const recommendations: PerformanceRecommendation[] = [];

    if (stats.averageFrameTime > 10) {
      recommendations.push({
        type: 'warning',
        message: 'Frame rendering is slower than expected. Consider using a lower display scale.',
      });
    }

    if (stats.errorCount > 0) {
      recommendations.push({
        type: 'warning',
        message: `${stats.errorCount} rendering errors detected. Check console for details.`,
      });
    }

    if (stats.averageFrameTime < 5 && recommendations.length === 0) {
      recommendations.push({
        type: 'success',
        message: 'Display performance is optimal.',
      });
    }

    return recommendations;
  }

  /**
   * Save settings to localStorage
   */
  public saveSettings(): void {
    const settings: DisplaySettings = {
      scale: this.currentScale,
      palette: this.currentPalette,
      frameRateMonitorEnabled: this.frameRateMonitorEnabled,
    };

    localStorage.setItem(DisplayControlPanel.SETTINGS_KEY, JSON.stringify(settings));
  }

  /**
   * Load settings from localStorage
   */
  public loadSettings(): void {
    try {
      const settingsJson = localStorage.getItem(DisplayControlPanel.SETTINGS_KEY);
      if (!settingsJson) return;

      const settings: DisplaySettings = JSON.parse(settingsJson);

      // Apply loaded settings with validation
      if (settings.scale && settings.scale >= 1 && settings.scale <= 4) {
        this.setScale(settings.scale);
      }

      if (settings.palette && this.getAvailablePalettes().includes(settings.palette)) {
        this.setPalette(settings.palette);
      }

      if (typeof settings.frameRateMonitorEnabled === 'boolean') {
        this.setFrameRateMonitorEnabled(settings.frameRateMonitorEnabled);
      }
    } catch {
      // Ignore invalid settings and use defaults
    }
  }

  /**
   * Reset settings to defaults
   */
  public resetSettings(): void {
    this.setScale(3);
    this.setPalette('dmg-green');
    this.setFrameRateMonitorEnabled(false);
  }

  /**
   * Get scale control button elements
   */
  public getScaleControlElements(): HTMLButtonElement[] {
    return [...this.scaleButtons];
  }

  /**
   * Get palette selection element
   */
  public getPaletteSelectElement(): HTMLSelectElement {
    if (!this.paletteSelect) {
      throw new Error('Palette select element not initialized');
    }
    return this.paletteSelect;
  }

  /**
   * Get frame rate display element
   */
  public getFrameRateDisplayElement(): HTMLElement {
    if (!this.frameRateDisplay) {
      throw new Error('Frame rate display element not initialized');
    }
    return this.frameRateDisplay;
  }

  /**
   * Get main controls element
   */
  public getControlsElement(): HTMLElement {
    if (!this.controlsElement) {
      throw new Error('Controls element not initialized');
    }
    return this.controlsElement;
  }

  /**
   * Create control UI elements
   */
  private createControlElements(): void {
    if (this.controlsElement) return;

    this.controlsElement = document.createElement('div');
    this.controlsElement.className = 'display-control-panel';

    // Calculate responsive width
    const viewportWidth = window.innerWidth || 1024; // fallback for test environments
    const maxWidth = Math.min(250, viewportWidth - 20);

    this.controlsElement.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 1000;
      max-width: ${maxWidth}px;
      width: ${maxWidth}px;
      box-sizing: border-box;
    `;

    // Create scale controls
    this.createScaleControls();

    // Create palette controls
    this.createPaletteControls();

    // Create frame rate monitor
    this.createFrameRateMonitor();

    // Append to document body for overlay
    document.body.appendChild(this.controlsElement);
  }

  /**
   * Create scale control buttons
   */
  private createScaleControls(): void {
    const scaleSection = document.createElement('div');
    scaleSection.innerHTML = '<label>Display Scale:</label>';
    scaleSection.style.marginBottom = '10px';

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 5px; flex-wrap: wrap;';

    this.scaleButtons = [];
    for (const scale of DisplayControlPanel.AVAILABLE_SCALES) {
      const button = document.createElement('button');
      button.textContent = `${scale}x`;
      button.setAttribute('aria-label', `Scale display to ${scale}x`);
      button.style.cssText = `
        min-width: 44px;
        min-height: 44px;
        width: 44px;
        height: 44px;
        padding: 8px;
        border: 1px solid #666;
        background: ${scale === this.currentScale ? '#555' : '#333'};
        color: white;
        border-radius: 3px;
        cursor: pointer;
        box-sizing: border-box;
      `;

      button.addEventListener('click', () => this.setScale(scale));

      buttonContainer.appendChild(button);
      this.scaleButtons.push(button);
    }

    scaleSection.appendChild(buttonContainer);
    if (this.controlsElement) {
      this.controlsElement.appendChild(scaleSection);
    }
  }

  /**
   * Create palette selection controls
   */
  private createPaletteControls(): void {
    const paletteSection = document.createElement('div');
    paletteSection.innerHTML = '<label>Color Palette:</label>';
    paletteSection.style.marginBottom = '10px';

    this.paletteSelect = document.createElement('select');
    this.paletteSelect.setAttribute('aria-label', 'Color Palette');
    this.paletteSelect.style.cssText = `
      width: 100%;
      padding: 5px;
      background: #333;
      color: white;
      border: 1px solid #666;
      border-radius: 3px;
    `;

    this.updatePaletteSelect();
    this.paletteSelect.addEventListener('change', e => {
      const target = e.target as HTMLSelectElement;
      this.setPalette(target.value);
    });

    paletteSection.appendChild(this.paletteSelect);
    if (this.controlsElement) {
      this.controlsElement.appendChild(paletteSection);
    }
  }

  /**
   * Create frame rate monitor
   */
  private createFrameRateMonitor(): void {
    const monitorSection = document.createElement('div');
    monitorSection.style.marginTop = '10px';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'frame-rate-monitor';
    checkbox.checked = this.frameRateMonitorEnabled;
    checkbox.addEventListener('change', e => {
      const target = e.target as HTMLInputElement;
      this.setFrameRateMonitorEnabled(target.checked);
    });

    const label = document.createElement('label');
    label.htmlFor = 'frame-rate-monitor';
    label.textContent = 'Show FPS';
    label.style.marginLeft = '5px';

    this.frameRateDisplay = document.createElement('div');
    this.frameRateDisplay.style.cssText = `
      margin-top: 5px;
      font-size: 12px;
      display: ${this.frameRateMonitorEnabled ? 'block' : 'none'};
    `;
    this.frameRateDisplay.textContent = 'FPS: --';

    monitorSection.appendChild(checkbox);
    monitorSection.appendChild(label);
    monitorSection.appendChild(this.frameRateDisplay);
    if (this.controlsElement) {
      this.controlsElement.appendChild(monitorSection);
    }
  }

  /**
   * Update palette select options
   */
  private updatePaletteSelect(): void {
    if (!this.paletteSelect) return;

    this.paletteSelect.innerHTML = '';
    const availablePalettes = this.getAvailablePalettes();

    for (const paletteName of availablePalettes) {
      const option = document.createElement('option');
      option.value = paletteName;
      option.textContent = paletteName.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
      option.selected = paletteName === this.currentPalette;
      this.paletteSelect.appendChild(option);
    }
  }

  /**
   * Destroy control UI elements
   */
  private destroyControlElements(): void {
    if (this.controlsElement) {
      this.controlsElement.remove();
      this.controlsElement = null;
      this.scaleButtons = [];
      this.paletteSelect = null;
      this.frameRateDisplay = null;
    }
  }

  /**
   * Update display based on current settings
   */
  private updateDisplay(): void {
    this.updateScaleButtonsState();
    this.updatePaletteSelect();
  }

  /**
   * Update scale button visual state
   */
  private updateScaleButtonsState(): void {
    this.scaleButtons.forEach((button, index) => {
      const scale = DisplayControlPanel.AVAILABLE_SCALES[index];
      button.style.background = scale === this.currentScale ? '#555' : '#333';
    });
  }

  /**
   * Notify scale change handlers
   */
  private notifyScaleChange(scale: number): void {
    this.scaleChangeHandlers.forEach(handler => handler(scale));
  }

  /**
   * Notify palette change handlers
   */
  private notifyPaletteChange(palette: string): void {
    this.paletteChangeHandlers.forEach(handler => handler(palette));
  }

  /**
   * Announce changes to screen readers
   */
  private announceToScreenReader(message: string): void {
    // Create temporary element for screen reader announcement
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    announcement.textContent = message;

    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
  }
}
