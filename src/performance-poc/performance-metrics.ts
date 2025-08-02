/**
 * Performance Metrics Collection
 *
 * Tracks operations per second, memory allocations, and memory usage
 * for performance analysis of immutable vs mutable state patterns.
 */

export interface MemoryUsage {
  used: number;
  total: number;
  heapUsed: number;
}

export class PerformanceMetrics {
  private operationCount = 0;
  private allocationCount = 0;
  private startTime = 0;
  private endTime = 0;
  private isTracking = false;

  startTracking(): void {
    this.startTime = performance.now();
    this.isTracking = true;
    this.operationCount = 0;
    this.allocationCount = 0;
  }

  stopTracking(): void {
    this.endTime = performance.now();
    this.isTracking = false;
  }

  recordOperation(): void {
    if (this.isTracking) {
      this.operationCount++;
    }
  }

  recordAllocation(): void {
    if (this.isTracking) {
      this.allocationCount++;
    }
  }

  getOperationsPerSecond(): number {
    if (!this.endTime || this.startTime === this.endTime) {
      return 0;
    }

    const durationSeconds = (this.endTime - this.startTime) / 1000;
    return this.operationCount / durationSeconds;
  }

  getAllocationsPerSecond(): number {
    if (!this.endTime || this.startTime === this.endTime) {
      return 0;
    }

    const durationSeconds = (this.endTime - this.startTime) / 1000;
    return this.allocationCount / durationSeconds;
  }

  getMemoryUsage(): MemoryUsage {
    // In browser environment, performance.memory might not be available
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (
        performance as { memory: { usedJSHeapSize?: number; totalJSHeapSize?: number } }
      ).memory;
      return {
        used: memory.usedJSHeapSize ?? 0,
        total: memory.totalJSHeapSize ?? 0,
        heapUsed: memory.usedJSHeapSize ?? 0,
      };
    }

    // Fallback for Node.js environment or when performance.memory is unavailable
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      return {
        used: memory.heapUsed,
        total: memory.heapTotal,
        heapUsed: memory.heapUsed,
      };
    }

    // Fallback when no memory information is available
    return {
      used: 0,
      total: 0,
      heapUsed: 0,
    };
  }

  reset(): void {
    this.operationCount = 0;
    this.allocationCount = 0;
    this.startTime = 0;
    this.endTime = 0;
    this.isTracking = false;
  }

  // Additional utility methods for real-time monitoring
  getCurrentOperationsPerSecond(): number {
    if (!this.isTracking || !this.startTime) {
      return 0;
    }

    const currentTime = performance.now();
    const durationSeconds = (currentTime - this.startTime) / 1000;

    if (durationSeconds === 0) {
      return 0;
    }

    return this.operationCount / durationSeconds;
  }

  getCurrentAllocationsPerSecond(): number {
    if (!this.isTracking || !this.startTime) {
      return 0;
    }

    const currentTime = performance.now();
    const durationSeconds = (currentTime - this.startTime) / 1000;

    if (durationSeconds === 0) {
      return 0;
    }

    return this.allocationCount / durationSeconds;
  }

  getOperationCount(): number {
    return this.operationCount;
  }

  getAllocationCount(): number {
    return this.allocationCount;
  }

  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }
}
