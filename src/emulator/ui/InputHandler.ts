/**
 * InputHandler - Game Boy input handling and keyboard mapping
 *
 * Maps keyboard inputs to Game Boy button presses with customizable
 * key mappings and proper event handling for the emulator interface.
 */

export const GameBoyButtonValues = {
  A: 'A',
  B: 'B',
  SELECT: 'SELECT',
  START: 'START',
  UP: 'UP',
  DOWN: 'DOWN',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
} as const;

export type GameBoyButton = (typeof GameBoyButtonValues)[keyof typeof GameBoyButtonValues];

export interface EmulatorInterface {
  // eslint-disable-next-line no-unused-vars
  setButtonPressed(button: GameBoyButton, pressed: boolean): void;
}

export type KeyMappings = {
  // eslint-disable-next-line no-unused-vars
  [key in GameBoyButton]: string[];
};

/**
 * Default Game Boy key mappings
 * Uses standard gaming conventions with alternatives
 */
const DEFAULT_KEY_MAPPINGS: KeyMappings = {
  [GameBoyButtonValues.A]: ['KeyZ'],
  [GameBoyButtonValues.B]: ['KeyX'],
  [GameBoyButtonValues.SELECT]: ['ShiftRight'],
  [GameBoyButtonValues.START]: ['Enter'],
  [GameBoyButtonValues.UP]: ['ArrowUp', 'KeyW'],
  [GameBoyButtonValues.DOWN]: ['ArrowDown', 'KeyS'],
  [GameBoyButtonValues.LEFT]: ['ArrowLeft', 'KeyA'],
  [GameBoyButtonValues.RIGHT]: ['ArrowRight', 'KeyD'],
};

/**
 * Handles keyboard input mapping to Game Boy controls
 */
export class InputHandler {
  private emulator: EmulatorInterface;
  private keyMappings: KeyMappings;
  private eventTarget: EventTarget | null;
  private pressedKeys = new Set<string>();
  private keyToButtonMap = new Map<string, GameBoyButton>();

  // Bound methods for event listener management
  private boundHandleKeyDown = (event: Event): void => this.handleKeyDown(event as KeyboardEvent);
  private boundHandleKeyUp = (event: Event): void => this.handleKeyUp(event as KeyboardEvent);

  /**
   * Create input handler
   *
   * @param emulator - Emulator interface to send button events to
   * @param keyMappings - Custom key mappings (optional, uses defaults)
   * @param eventTarget - Target for event listeners (document by default, null to disable auto-registration)
   */
  constructor(
    emulator: EmulatorInterface | null,
    keyMappings?: KeyMappings,
    eventTarget: EventTarget | null = document
  ) {
    if (!emulator) {
      throw new Error('Emulator is required');
    }

    this.emulator = emulator;
    this.keyMappings = keyMappings ?? { ...DEFAULT_KEY_MAPPINGS };
    this.eventTarget = eventTarget;

    this.buildKeyToButtonMap();

    // Register event listeners if target provided
    if (this.eventTarget) {
      this.registerEventListeners();
    }
  }

  /**
   * Build reverse mapping from key codes to Game Boy buttons
   */
  private buildKeyToButtonMap(): void {
    this.keyToButtonMap.clear();

    for (const [button, keyCodes] of Object.entries(this.keyMappings)) {
      for (const keyCode of keyCodes) {
        this.keyToButtonMap.set(keyCode, button as GameBoyButton);
      }
    }
  }

  /**
   * Register keyboard event listeners
   */
  private registerEventListeners(): void {
    if (this.eventTarget) {
      this.eventTarget.addEventListener('keydown', this.boundHandleKeyDown);
      this.eventTarget.addEventListener('keyup', this.boundHandleKeyUp);
    }
  }

  /**
   * Remove keyboard event listeners
   */
  private unregisterEventListeners(): void {
    if (this.eventTarget) {
      this.eventTarget.removeEventListener('keydown', this.boundHandleKeyDown);
      this.eventTarget.removeEventListener('keyup', this.boundHandleKeyUp);
    }
  }

  /**
   * Handle keydown events
   */
  public handleKeyDown(event: KeyboardEvent): void {
    const button = this.keyToButtonMap.get(event.code);

    if (button) {
      // Prevent default behavior for mapped keys
      event.preventDefault();

      // Only trigger if key wasn't already pressed (prevent repeat events)
      if (!this.pressedKeys.has(event.code)) {
        this.pressedKeys.add(event.code);
        this.emulator.setButtonPressed(button, true);
      }
    }
  }

  /**
   * Handle keyup events
   */
  public handleKeyUp(event: KeyboardEvent): void {
    const button = this.keyToButtonMap.get(event.code);

    if (button) {
      // Prevent default behavior for mapped keys
      event.preventDefault();

      // Remove from pressed keys and trigger button release
      this.pressedKeys.delete(event.code);
      this.emulator.setButtonPressed(button, false);
    }
  }

  /**
   * Get current key mappings
   */
  public getKeyMappings(): KeyMappings {
    // Return deep copy to prevent external modification
    const copy: Partial<KeyMappings> = {};
    for (const [button, keys] of Object.entries(this.keyMappings)) {
      copy[button as GameBoyButton] = [...keys];
    }
    return copy as KeyMappings;
  }

  /**
   * Get key mapping for specific button
   */
  public getKeyMapping(button: GameBoyButton): string[] {
    return [...(this.keyMappings[button] || [])];
  }

  /**
   * Update key mapping for a specific button
   */
  public setKeyMapping(button: GameBoyButton, keyCodes: string[]): void {
    this.keyMappings[button] = [...keyCodes];
    this.buildKeyToButtonMap();
  }

  /**
   * Update all key mappings
   */
  public setKeyMappings(keyMappings: KeyMappings): void {
    this.keyMappings = { ...DEFAULT_KEY_MAPPINGS };
    for (const [button, keys] of Object.entries(keyMappings)) {
      this.keyMappings[button as GameBoyButton] = [...keys];
    }
    this.buildKeyToButtonMap();
  }

  /**
   * Reset to default key mappings
   */
  public resetToDefaults(): void {
    this.keyMappings = { ...DEFAULT_KEY_MAPPINGS };
    this.buildKeyToButtonMap();
  }

  /**
   * Check if a key is currently pressed
   */
  public isKeyPressed(keyCode: string): boolean {
    return this.pressedKeys.has(keyCode);
  }

  /**
   * Get all currently pressed keys
   */
  public getPressedKeys(): string[] {
    return Array.from(this.pressedKeys);
  }

  /**
   * Clear all pressed key states (useful for focus loss handling)
   */
  public clearPressedKeys(): void {
    // Release all currently pressed buttons
    for (const keyCode of this.pressedKeys) {
      const button = this.keyToButtonMap.get(keyCode);
      if (button) {
        this.emulator.setButtonPressed(button, false);
      }
    }

    this.pressedKeys.clear();
  }

  /**
   * Destroy input handler and clean up event listeners
   */
  public destroy(): void {
    this.unregisterEventListeners();
    this.clearPressedKeys();
  }
}
