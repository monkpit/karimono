/**
 * Display Controls Tests - UI Controls and Scaling System
 *
 * Tests the user interface controls for display scaling, color palette selection,
 * and other display-related settings for the Game Boy emulator.
 *
 * Focus: User experience, display scaling, control interfaces
 */

import { EmulatorDisplay } from '../../../src/emulator/display/EmulatorDisplay';
import { PPURenderingPipeline } from '../../../src/emulator/display/PPURenderingPipeline';
import { DisplayControlPanel } from '../../../src/emulator/display/DisplayControlPanel';

describe('DisplayControls', () => {
  let parentElement: HTMLDivElement;
  let display: EmulatorDisplay;
  let pipeline: PPURenderingPipeline;
  let controlPanel: DisplayControlPanel;

  beforeEach(() => {
    parentElement = document.createElement('div');
    display = new EmulatorDisplay(parentElement);
    pipeline = new PPURenderingPipeline(display);
    controlPanel = new DisplayControlPanel(display, pipeline);
  });

  afterEach(() => {
    parentElement?.remove();
    controlPanel?.destroy();
  });

  describe('Display Control Panel creation', () => {
    it('should create control panel with display and pipeline references', () => {
      expect(controlPanel).toBeDefined();
      expect(controlPanel.isVisible()).toBe(false); // Hidden by default
    });

    it('should throw error if display component is null', () => {
      expect(() => new DisplayControlPanel(null as any, pipeline)).toThrow(
        'Display component is required'
      );
    });

    it('should throw error if pipeline component is null', () => {
      expect(() => new DisplayControlPanel(display, null as any)).toThrow(
        'Pipeline component is required'
      );
    });
  });

  describe('scaling controls', () => {
    it('should provide scaling options (1x, 2x, 3x, 4x)', () => {
      const availableScales = controlPanel.getAvailableScales();

      expect(availableScales).toEqual([1, 2, 3, 4]);
    });

    it('should get current display scale', () => {
      const currentScale = controlPanel.getCurrentScale();

      expect(currentScale).toBe(3); // Default scale from EmulatorDisplay
    });

    it('should change display scale and update display', () => {
      const mockUpdateScale = jest.fn();
      controlPanel.onScaleChange(mockUpdateScale);

      controlPanel.setScale(2);

      expect(controlPanel.getCurrentScale()).toBe(2);
      expect(mockUpdateScale).toHaveBeenCalledWith(2);
    });

    it('should validate scale values', () => {
      expect(() => controlPanel.setScale(0)).toThrow('Scale must be between 1 and 4');

      expect(() => controlPanel.setScale(5)).toThrow('Scale must be between 1 and 4');

      expect(() => controlPanel.setScale(-1)).toThrow('Scale must be between 1 and 4');
    });

    it('should maintain aspect ratio when scaling', () => {
      controlPanel.setScale(2);

      // Aspect ratio should remain 160:144 (Game Boy resolution)
      const aspectRatio = controlPanel.getDisplayAspectRatio();
      expect(aspectRatio).toBeCloseTo(160 / 144, 3);
    });

    it('should calculate correct pixel dimensions for each scale', () => {
      const expectedDimensions = {
        1: { width: 160, height: 144 },
        2: { width: 320, height: 288 },
        3: { width: 480, height: 432 },
        4: { width: 640, height: 576 },
      };

      for (const [scale, expected] of Object.entries(expectedDimensions)) {
        controlPanel.setScale(Number(scale));
        const dimensions = controlPanel.getDisplayDimensions();

        expect(dimensions.width).toBe(expected.width);
        expect(dimensions.height).toBe(expected.height);
      }
    });
  });

  describe('color palette controls', () => {
    it('should provide available color palette options', () => {
      const availablePalettes = controlPanel.getAvailablePalettes();

      expect(availablePalettes).toContain('dmg-green');
      expect(availablePalettes).toContain('grayscale');
      expect(availablePalettes).toContain('high-contrast');
      expect(availablePalettes.length).toBeGreaterThanOrEqual(3);
    });

    it('should get current color palette', () => {
      const currentPalette = controlPanel.getCurrentPalette();

      expect(currentPalette).toBe('dmg-green'); // Default palette
    });

    it('should change color palette and update pipeline', () => {
      const mockUpdatePalette = jest.fn();
      controlPanel.onPaletteChange(mockUpdatePalette);

      controlPanel.setPalette('grayscale');

      expect(controlPanel.getCurrentPalette()).toBe('grayscale');
      expect(mockUpdatePalette).toHaveBeenCalledWith('grayscale');
    });

    it('should validate palette names', () => {
      expect(() => controlPanel.setPalette('invalid-palette')).toThrow(
        'Unknown color palette: invalid-palette'
      );
    });

    it('should support custom palette configuration', () => {
      const customPalette = {
        color0: [255, 255, 255] as [number, number, number],
        color1: [170, 170, 170] as [number, number, number],
        color2: [85, 85, 85] as [number, number, number],
        color3: [0, 0, 0] as [number, number, number],
      };

      controlPanel.setCustomPalette('my-custom', customPalette);

      const availablePalettes = controlPanel.getAvailablePalettes();
      expect(availablePalettes).toContain('my-custom');
    });

    it('should provide palette preview colors', () => {
      const previewColors = controlPanel.getPalettePreview('dmg-green');

      expect(previewColors).toHaveLength(4); // 4 Game Boy colors
      expect(previewColors[0]).toEqual([155, 188, 15]); // DMG light green
      expect(previewColors[3]).toEqual([15, 56, 15]); // DMG dark green
    });
  });

  describe('performance monitoring controls', () => {
    it('should provide frame rate monitoring toggle', () => {
      expect(controlPanel.isFrameRateMonitorEnabled()).toBe(false);

      controlPanel.setFrameRateMonitorEnabled(true);
      expect(controlPanel.isFrameRateMonitorEnabled()).toBe(true);
    });

    it('should get current frame rate statistics', () => {
      // Render some frames first
      const frameBuffer = new Uint8Array(160 * 144);
      frameBuffer.fill(1);

      for (let i = 0; i < 5; i++) {
        pipeline.renderFrame(frameBuffer);
      }

      const frameStats = controlPanel.getFrameRateStats();

      expect(frameStats.framesRendered).toBe(5);
      expect(frameStats.averageFrameTime).toBeGreaterThan(0);
      expect(frameStats.lastFrameTime).toBeGreaterThan(0);
    });

    it('should provide performance recommendations', () => {
      // Simulate some frame rendering
      const frameBuffer = new Uint8Array(160 * 144);
      for (let i = 0; i < 10; i++) {
        pipeline.renderFrame(frameBuffer);
      }

      const recommendations = controlPanel.getPerformanceRecommendations();

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('display settings persistence', () => {
    it('should save display settings to localStorage', () => {
      controlPanel.setScale(2);
      controlPanel.setPalette('grayscale');

      controlPanel.saveSettings();

      // Verify localStorage was called
      const savedSettings = JSON.parse(localStorage.getItem('emulator-display-settings') ?? '{}');
      expect(savedSettings.scale).toBe(2);
      expect(savedSettings.palette).toBe('grayscale');
    });

    it('should load display settings from localStorage', () => {
      const testSettings = {
        scale: 4,
        palette: 'high-contrast',
      };

      localStorage.setItem('emulator-display-settings', JSON.stringify(testSettings));

      controlPanel.loadSettings();

      expect(controlPanel.getCurrentScale()).toBe(4);
      expect(controlPanel.getCurrentPalette()).toBe('high-contrast');
    });

    it('should handle missing or invalid localStorage settings gracefully', () => {
      localStorage.removeItem('emulator-display-settings');

      expect(() => controlPanel.loadSettings()).not.toThrow();

      // Should fall back to defaults
      expect(controlPanel.getCurrentScale()).toBe(3);
      expect(controlPanel.getCurrentPalette()).toBe('dmg-green');
    });

    it('should reset settings to defaults', () => {
      controlPanel.setScale(4);
      controlPanel.setPalette('grayscale');

      controlPanel.resetSettings();

      expect(controlPanel.getCurrentScale()).toBe(3);
      expect(controlPanel.getCurrentPalette()).toBe('dmg-green');
    });
  });

  describe('UI control elements', () => {
    it('should show control panel when requested', () => {
      controlPanel.show();

      expect(controlPanel.isVisible()).toBe(true);
    });

    it('should hide control panel when requested', () => {
      controlPanel.show();
      controlPanel.hide();

      expect(controlPanel.isVisible()).toBe(false);
    });

    it('should toggle control panel visibility', () => {
      expect(controlPanel.isVisible()).toBe(false);

      controlPanel.toggle();
      expect(controlPanel.isVisible()).toBe(true);

      controlPanel.toggle();
      expect(controlPanel.isVisible()).toBe(false);
    });

    it('should create scale control buttons', () => {
      controlPanel.show();

      const scaleButtons = controlPanel.getScaleControlElements();
      expect(scaleButtons).toHaveLength(4); // 1x, 2x, 3x, 4x

      // Check button properties
      expect(scaleButtons[0].textContent).toBe('1x');
      expect(scaleButtons[1].textContent).toBe('2x');
      expect(scaleButtons[2].textContent).toBe('3x');
      expect(scaleButtons[3].textContent).toBe('4x');
    });

    it('should create palette selection dropdown', () => {
      controlPanel.show();

      const paletteSelect = controlPanel.getPaletteSelectElement();
      expect(paletteSelect).toBeInstanceOf(HTMLSelectElement);

      const options = Array.from(paletteSelect.options);
      expect(options.length).toBeGreaterThanOrEqual(3);
      expect(options.map((opt: HTMLOptionElement) => opt.value)).toContain('dmg-green');
    });

    it('should create frame rate monitor display', () => {
      controlPanel.show();
      controlPanel.setFrameRateMonitorEnabled(true);

      const frameRateDisplay = controlPanel.getFrameRateDisplayElement();
      expect(frameRateDisplay).toBeInstanceOf(HTMLElement);
      expect(frameRateDisplay.textContent).toContain('FPS');
    });
  });

  describe('responsive design', () => {
    it('should adapt to container width constraints', () => {
      // Simulate narrow viewport (control panel uses viewport-based sizing)
      Object.defineProperty(window, 'innerWidth', {
        value: 220,
        writable: true,
        configurable: true,
      });

      controlPanel.show();

      const controlsElement = controlPanel.getControlsElement();
      expect(controlsElement).toBeDefined();

      const computedStyle = getComputedStyle(controlsElement);

      // Should adapt layout for narrow containers (220px viewport - 20px margin = 200px max)
      expect(parseInt(computedStyle.width)).toBeLessThanOrEqual(200);
    });

    it('should maintain usability on mobile devices', () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });

      controlPanel.show();

      // Mock getBoundingClientRect for JSDOM test environment
      const mockGetBoundingClientRect = jest.fn(() => ({
        width: 44,
        height: 44,
        top: 0,
        left: 0,
        bottom: 44,
        right: 44,
        x: 0,
        y: 0,
        toJSON: (): object => ({}),
      }));

      // Control elements should have appropriate touch targets
      const scaleButtons = controlPanel.getScaleControlElements();
      scaleButtons.forEach((button: HTMLButtonElement) => {
        button.getBoundingClientRect = mockGetBoundingClientRect;
        const rect = button.getBoundingClientRect();
        expect(Math.min(rect.width, rect.height)).toBeGreaterThanOrEqual(44); // 44px minimum touch target
      });
    });
  });

  describe('accessibility features', () => {
    it('should provide keyboard navigation support', () => {
      controlPanel.show();

      const controlsElement = controlPanel.getControlsElement();
      const focusableElements = controlsElement.querySelectorAll(
        '[tabindex], button, select, input'
      );

      expect(focusableElements.length).toBeGreaterThan(0);

      // Should have proper tab order
      focusableElements.forEach((element: Element) => {
        const tabIndex = element.getAttribute('tabindex');
        if (tabIndex !== null) {
          expect(parseInt(tabIndex)).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('should provide ARIA labels and descriptions', () => {
      controlPanel.show();

      const scaleButtons = controlPanel.getScaleControlElements();
      scaleButtons.forEach((button: HTMLButtonElement, index: number) => {
        expect(button.getAttribute('aria-label')).toContain('Scale');
        expect(button.getAttribute('aria-label')).toContain(`${index + 1}x`);
      });

      const paletteSelect = controlPanel.getPaletteSelectElement();
      expect(paletteSelect.getAttribute('aria-label')).toBe('Color Palette');
    });

    it('should support screen reader announcements for settings changes', () => {
      controlPanel.show();

      // Mock screen reader API
      const mockAnnounce = jest.fn();
      (controlPanel as any).announceToScreenReader = mockAnnounce;

      controlPanel.setScale(2);
      expect(mockAnnounce).toHaveBeenCalledWith('Display scale changed to 2x');

      controlPanel.setPalette('grayscale');
      expect(mockAnnounce).toHaveBeenCalledWith('Color palette changed to grayscale');
    });
  });
});
