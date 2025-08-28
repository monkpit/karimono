/**
 * InputHandler Component Tests
 *
 * Tests keyboard input mapping and Game Boy control handling
 * for the emulator interface.
 */

import {
  InputHandler,
  GameBoyButton,
  GameBoyButtonValues,
} from '../../../src/emulator/ui/InputHandler';

// Mock emulator interface for input testing
class MockEmulator {
  private buttonStates = new Map<GameBoyButton, boolean>();

  setButtonPressed = jest.fn((button: GameBoyButton, pressed: boolean) => {
    this.buttonStates.set(button, pressed);
  });

  isButtonPressed(button: GameBoyButton): boolean {
    return this.buttonStates.get(button) ?? false;
  }

  reset(): void {
    this.buttonStates.clear();
  }
}

describe('InputHandler', () => {
  let mockEmulator: MockEmulator;
  let inputHandler: InputHandler;

  beforeEach(() => {
    mockEmulator = new MockEmulator();
  });

  afterEach(() => {
    if (inputHandler) {
      inputHandler.destroy();
    }
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should create input handler with default key mappings', () => {
      inputHandler = new InputHandler(mockEmulator as any);

      expect(inputHandler).toBeDefined();
      expect(typeof inputHandler.handleKeyDown).toBe('function');
      expect(typeof inputHandler.handleKeyUp).toBe('function');
    });

    test('should throw error with null emulator', () => {
      expect(() => new InputHandler(null)).toThrow('Emulator is required');
    });

    test('should accept custom key mappings', () => {
      const customMappings = {
        [GameBoyButton.A]: ['Space'],
        [GameBoyButton.B]: ['KeyX'],
        [GameBoyButton.SELECT]: ['Backspace'],
        [GameBoyButton.START]: ['Enter'],
        [GameBoyButton.UP]: ['KeyW'],
        [GameBoyButton.DOWN]: ['KeyS'],
        [GameBoyButton.LEFT]: ['KeyA'],
        [GameBoyButton.RIGHT]: ['KeyD'],
      };

      inputHandler = new InputHandler(mockEmulator as any, customMappings);
      expect(inputHandler).toBeDefined();
    });
  });

  describe('Default Key Mappings', () => {
    beforeEach(() => {
      inputHandler = new InputHandler(mockEmulator as any);
    });

    test('should map arrow keys to direction buttons', () => {
      expect(inputHandler.getKeyMapping(GameBoyButton.UP)).toContain('ArrowUp');
      expect(inputHandler.getKeyMapping(GameBoyButton.DOWN)).toContain('ArrowDown');
      expect(inputHandler.getKeyMapping(GameBoyButton.LEFT)).toContain('ArrowLeft');
      expect(inputHandler.getKeyMapping(GameBoyButton.RIGHT)).toContain('ArrowRight');
    });

    test('should map Z/X keys to A/B buttons', () => {
      expect(inputHandler.getKeyMapping(GameBoyButton.A)).toContain('KeyZ');
      expect(inputHandler.getKeyMapping(GameBoyButton.B)).toContain('KeyX');
    });

    test('should map shift/enter to select/start', () => {
      expect(inputHandler.getKeyMapping(GameBoyButton.SELECT)).toContain('ShiftRight');
      expect(inputHandler.getKeyMapping(GameBoyButton.START)).toContain('Enter');
    });

    test('should support WASD as alternative direction keys', () => {
      expect(inputHandler.getKeyMapping(GameBoyButton.UP)).toContain('KeyW');
      expect(inputHandler.getKeyMapping(GameBoyButton.DOWN)).toContain('KeyS');
      expect(inputHandler.getKeyMapping(GameBoyButton.LEFT)).toContain('KeyA');
      expect(inputHandler.getKeyMapping(GameBoyButton.RIGHT)).toContain('KeyD');
    });
  });

  describe('Key Event Handling', () => {
    beforeEach(() => {
      inputHandler = new InputHandler(mockEmulator as any);
    });

    test('should handle keydown events for mapped keys', () => {
      const event = new KeyboardEvent('keydown', { code: 'KeyZ' });
      inputHandler.handleKeyDown(event);

      expect(mockEmulator.setButtonPressed).toHaveBeenCalledWith(GameBoyButtonValues.A, true);
    });

    test('should handle keyup events for mapped keys', () => {
      const event = new KeyboardEvent('keyup', { code: 'KeyZ' });
      inputHandler.handleKeyUp(event);

      expect(mockEmulator.setButtonPressed).toHaveBeenCalledWith(GameBoyButtonValues.A, false);
    });

    test('should ignore unmapped keys', () => {
      const event = new KeyboardEvent('keydown', { code: 'KeyQ' });
      inputHandler.handleKeyDown(event);

      expect(mockEmulator.setButtonPressed).not.toHaveBeenCalled();
    });

    test('should prevent default behavior for mapped keys', () => {
      const event = new KeyboardEvent('keydown', { code: 'ArrowUp' });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      inputHandler.handleKeyDown(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    test('should not prevent default for unmapped keys', () => {
      const event = new KeyboardEvent('keydown', { code: 'KeyQ' });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      inputHandler.handleKeyDown(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Key Mappings', () => {
    beforeEach(() => {
      inputHandler = new InputHandler(mockEmulator as any);
    });

    test('should handle multiple keys mapped to same button', () => {
      // Test arrow up
      const arrowEvent = new KeyboardEvent('keydown', { code: 'ArrowUp' });
      inputHandler.handleKeyDown(arrowEvent);
      expect(mockEmulator.setButtonPressed).toHaveBeenCalledWith(GameBoyButtonValues.UP, true);

      mockEmulator.setButtonPressed.mockClear();

      // Test W key (alternative mapping)
      const wEvent = new KeyboardEvent('keydown', { code: 'KeyW' });
      inputHandler.handleKeyDown(wEvent);
      expect(mockEmulator.setButtonPressed).toHaveBeenCalledWith(GameBoyButtonValues.UP, true);
    });
  });

  describe('Event Registration', () => {
    test('should register global keyboard event listeners by default', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      inputHandler = new InputHandler(mockEmulator as any);

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
    });

    test('should allow custom event target', () => {
      const customElement = document.createElement('div');
      const addEventListenerSpy = jest.spyOn(customElement, 'addEventListener');

      inputHandler = new InputHandler(mockEmulator as any, undefined, customElement);

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
    });

    test('should allow disabling automatic event registration', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      inputHandler = new InputHandler(mockEmulator as any, undefined, null);

      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    test('should remove event listeners on destroy', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      inputHandler = new InputHandler(mockEmulator as any);
      inputHandler.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
    });

    test('should remove listeners from custom target', () => {
      const customElement = document.createElement('div');
      const removeEventListenerSpy = jest.spyOn(customElement, 'removeEventListener');

      inputHandler = new InputHandler(mockEmulator as any, undefined, customElement);
      inputHandler.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
    });
  });

  describe('Button State Management', () => {
    beforeEach(() => {
      inputHandler = new InputHandler(mockEmulator as any);
    });

    test('should track button press state to prevent repeat events', () => {
      // First keydown should trigger button press
      const event1 = new KeyboardEvent('keydown', { code: 'KeyZ' });
      inputHandler.handleKeyDown(event1);
      expect(mockEmulator.setButtonPressed).toHaveBeenCalledWith(GameBoyButtonValues.A, true);

      mockEmulator.setButtonPressed.mockClear();

      // Second keydown (repeat) should not trigger again
      const event2 = new KeyboardEvent('keydown', { code: 'KeyZ' });
      inputHandler.handleKeyDown(event2);
      expect(mockEmulator.setButtonPressed).not.toHaveBeenCalled();

      // Keyup should trigger button release
      const event3 = new KeyboardEvent('keyup', { code: 'KeyZ' });
      inputHandler.handleKeyUp(event3);
      expect(mockEmulator.setButtonPressed).toHaveBeenCalledWith(GameBoyButtonValues.A, false);
    });
  });

  describe('Game Boy Button Enum', () => {
    test('should define all Game Boy buttons', () => {
      expect(GameBoyButton.A).toBeDefined();
      expect(GameBoyButton.B).toBeDefined();
      expect(GameBoyButton.SELECT).toBeDefined();
      expect(GameBoyButton.START).toBeDefined();
      expect(GameBoyButton.UP).toBeDefined();
      expect(GameBoyButton.DOWN).toBeDefined();
      expect(GameBoyButton.LEFT).toBeDefined();
      expect(GameBoyButton.RIGHT).toBeDefined();
    });
  });

  describe('Integration with Emulator', () => {
    beforeEach(() => {
      inputHandler = new InputHandler(mockEmulator as any);
    });

    test('should correctly map all buttons to emulator calls', () => {
      const testCases = [
        { code: 'KeyZ', button: GameBoyButtonValues.A },
        { code: 'KeyX', button: GameBoyButtonValues.B },
        { code: 'ShiftRight', button: GameBoyButtonValues.SELECT },
        { code: 'Enter', button: GameBoyButtonValues.START },
        { code: 'ArrowUp', button: GameBoyButtonValues.UP },
        { code: 'ArrowDown', button: GameBoyButtonValues.DOWN },
        { code: 'ArrowLeft', button: GameBoyButtonValues.LEFT },
        { code: 'ArrowRight', button: GameBoyButtonValues.RIGHT },
      ];

      testCases.forEach(({ code, button }) => {
        mockEmulator.setButtonPressed.mockClear();

        const keydownEvent = new KeyboardEvent('keydown', { code });
        inputHandler.handleKeyDown(keydownEvent);

        expect(mockEmulator.setButtonPressed).toHaveBeenCalledWith(button, true);

        const keyupEvent = new KeyboardEvent('keyup', { code });
        inputHandler.handleKeyUp(keyupEvent);

        expect(mockEmulator.setButtonPressed).toHaveBeenCalledWith(button, false);
      });
    });
  });

  describe('Configuration', () => {
    test('should expose current key mappings', () => {
      inputHandler = new InputHandler(mockEmulator as any);

      const mappings = inputHandler.getKeyMappings();
      expect(mappings).toBeDefined();
      expect(mappings[GameBoyButtonValues.A]).toContain('KeyZ');
      expect(mappings[GameBoyButtonValues.B]).toContain('KeyX');
    });

    test('should allow runtime key mapping updates', () => {
      inputHandler = new InputHandler(mockEmulator as any);

      // Update mapping
      inputHandler.setKeyMapping(GameBoyButtonValues.A, ['Space']);

      // Test old mapping doesn't work
      const oldEvent = new KeyboardEvent('keydown', { code: 'KeyZ' });
      inputHandler.handleKeyDown(oldEvent);
      expect(mockEmulator.setButtonPressed).not.toHaveBeenCalled();

      // Test new mapping works
      const newEvent = new KeyboardEvent('keydown', { code: 'Space' });
      inputHandler.handleKeyDown(newEvent);
      expect(mockEmulator.setButtonPressed).toHaveBeenCalledWith(GameBoyButtonValues.A, true);
    });
  });
});
