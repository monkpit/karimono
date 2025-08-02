/**
 * Ring Buffer implementation for rewind mechanism testing
 *
 * Stores snapshots of Game Boy state to enable rewind functionality.
 * Tests performance implications of immutable state management.
 */

export interface GameBoyState {
  readonly registers: {
    readonly a: number;
    readonly b: number;
    readonly c: number;
    readonly d: number;
    readonly e: number;
    readonly h: number;
    readonly l: number;
    readonly f: number;
    readonly sp: number;
    readonly pc: number;
  };
  readonly memory: readonly number[];
  readonly cycle: number;
}

/**
 * Lazy snapshot that only copies memory when accessed during rewind
 */
interface LazyGameBoySnapshot {
  readonly registers: {
    readonly a: number;
    readonly b: number;
    readonly c: number;
    readonly d: number;
    readonly e: number;
    readonly h: number;
    readonly l: number;
    readonly f: number;
    readonly sp: number;
    readonly pc: number;
  };
  readonly memoryRef: number[]; // Reference to mutable memory
  readonly memoryCopy?: readonly number[]; // Lazy copy created on access
  readonly cycle: number;
  readonly timestamp: number; // When this snapshot was created
}

export class RingBuffer<T> {
  private buffer: T[] = [];
  private head = 0;
  private tail = 0;
  private count = 0;
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = [];
    this.buffer.length = capacity;
  }

  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;

    if (this.count < this.capacity) {
      this.count++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  pop(): T | undefined {
    if (this.count === 0) {
      return undefined;
    }

    this.tail = (this.tail - 1 + this.capacity) % this.capacity;
    const item = this.buffer[this.tail];
    this.count--;

    return item;
  }

  size(): number {
    return this.count;
  }

  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  isFull(): boolean {
    return this.count === this.capacity;
  }

  isEmpty(): boolean {
    return this.count === 0;
  }
}

/**
 * Copy-on-rewind ring buffer optimized for Game Boy state snapshots
 *
 * This buffer stores references to mutable memory during normal execution,
 * only creating expensive copies when rewind is actually invoked.
 */
export class LazyRingBuffer {
  private buffer: LazyGameBoySnapshot[] = [];
  private head = 0;
  private tail = 0;
  private count = 0;
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = [];
    this.buffer.length = capacity;
  }

  /**
   * Store a snapshot with efficient memory copying using slice()
   * Uses memory.slice() which is much faster than spread operator
   */
  pushSnapshot(registers: GameBoyState['registers'], memoryRef: number[], cycle: number): void {
    const snapshot: LazyGameBoySnapshot = {
      registers: { ...registers }, // Registers are small, safe to copy immediately
      memoryRef, // Keep reference for comparison
      memoryCopy: memoryRef.slice(), // Use slice() for efficient copying
      cycle,
      timestamp: performance.now(),
    };

    this.buffer[this.tail] = snapshot;
    this.tail = (this.tail + 1) % this.capacity;

    if (this.count < this.capacity) {
      this.count++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  /**
   * Rewind to previous state - returns the efficiently copied snapshot
   * Returns null if no snapshots available
   */
  rewind(): GameBoyState | null {
    if (this.count === 0) {
      return null;
    }

    this.tail = (this.tail - 1 + this.capacity) % this.capacity;
    const snapshot = this.buffer[this.tail];
    this.count--;

    if (!snapshot?.memoryCopy) {
      return null;
    }

    // Return the already-copied memory from when snapshot was created
    return {
      registers: snapshot.registers,
      memory: snapshot.memoryCopy,
      cycle: snapshot.cycle,
    };
  }

  /**
   * Get current number of stored snapshots
   */
  size(): number {
    return this.count;
  }

  /**
   * Clear all stored snapshots
   */
  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  /**
   * Check if buffer is at capacity
   */
  isFull(): boolean {
    return this.count === this.capacity;
  }

  /**
   * Check if buffer is empty
   */
  isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * Get estimated memory usage (for performance metrics)
   * Accounts for actual memory copies stored in snapshots
   */
  getEstimatedMemoryUsage(): number {
    // Each snapshot stores:
    // - Registers (10 numbers ≈ 80 bytes)
    // - Memory copy (32KB = 32,768 bytes)
    // - Memory reference (8 bytes pointer)
    // - Cycle number (8 bytes)
    // - Timestamp (8 bytes)
    const bytesPerSnapshot = 80 + 32768 + 8 + 8 + 8; // ~32.9KB per snapshot
    return this.count * bytesPerSnapshot;
  }
}
