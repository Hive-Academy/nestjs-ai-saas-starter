/**
 * @fileoverview Circuit Breaker Pattern - Prevent Cascade Failures
 *
 * This module implements the Circuit Breaker pattern to prevent cascade failures
 * by stopping requests to a failing service when it's in a failure state.
 */

/**
 * Circuit breaker state enumeration
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing - blocking requests
  HALF_OPEN = 'HALF_OPEN', // Testing - allowing limited requests
}

/**
 * Configuration for circuit breaker behavior
 */
export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  resetTimeout: number;
  halfOpenMaxCalls?: number;
  volumeThreshold?: number;
  errorThresholdPercentage?: number;
}

/**
 * Internal state tracking for circuit breaker
 */
interface CircuitBreakerInternalState {
  failures: number;
  successes: number;
  state: CircuitBreakerState;
  lastFailureTime: number;
  nextAttemptTime: number;
  halfOpenCalls: number;
  totalCalls: number;
  recentCalls: Array<{ timestamp: number; success: boolean }>;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  totalCalls: number;
  failureRate: number;
  lastFailureTime: Date | null;
  timeUntilRetry: number;
  halfOpenCalls: number;
}

/**
 * Circuit Breaker implementation with state management
 */
export class CircuitBreaker {
  private readonly internalState: CircuitBreakerInternalState;
  private readonly config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      enabled: config.enabled,
      failureThreshold: config.failureThreshold,
      resetTimeout: config.resetTimeout,
      halfOpenMaxCalls: config.halfOpenMaxCalls ?? 3,
      volumeThreshold: config.volumeThreshold ?? 10,
      errorThresholdPercentage: config.errorThresholdPercentage ?? 50,
    };

    this.internalState = {
      failures: 0,
      successes: 0,
      state: CircuitBreakerState.CLOSED,
      lastFailureTime: 0,
      nextAttemptTime: 0,
      halfOpenCalls: 0,
      totalCalls: 0,
      recentCalls: [],
    };
  }

  /**
   * Check if the circuit breaker allows execution
   * @returns true if execution is allowed, false otherwise
   */
  canExecute(): boolean {
    if (!this.config.enabled) {
      return true;
    }

    this.cleanupOldCalls();

    switch (this.internalState.state) {
      case CircuitBreakerState.CLOSED:
        return true;

      case CircuitBreakerState.OPEN:
        return this.shouldTransitionToHalfOpen();

      case CircuitBreakerState.HALF_OPEN:
        return this.internalState.halfOpenCalls < this.config.halfOpenMaxCalls;

      default:
        return false;
    }
  }

  /**
   * Record a successful execution
   */
  recordSuccess(): void {
    if (!this.config.enabled) {
      return;
    }

    this.internalState.successes++;
    this.internalState.totalCalls++;
    this.recordCall(true);

    switch (this.internalState.state) {
      case CircuitBreakerState.HALF_OPEN:
        this.internalState.halfOpenCalls++;
        if (this.internalState.halfOpenCalls >= this.config.halfOpenMaxCalls) {
          this.transitionToClosed();
        }
        break;

      case CircuitBreakerState.CLOSED:
        // Reset failure count on success in closed state
        this.internalState.failures = 0;
        break;
    }
  }

  /**
   * Record a failed execution
   */
  recordFailure(): void {
    if (!this.config.enabled) {
      return;
    }

    this.internalState.failures++;
    this.internalState.totalCalls++;
    this.internalState.lastFailureTime = Date.now();
    this.recordCall(false);

    switch (this.internalState.state) {
      case CircuitBreakerState.CLOSED:
        if (this.shouldTransitionToOpen()) {
          this.transitionToOpen();
        }
        break;

      case CircuitBreakerState.HALF_OPEN:
        // Any failure in half-open state should go back to open
        this.transitionToOpen();
        break;
    }
  }

  /**
   * Force reset the circuit breaker to closed state
   */
  reset(): void {
    this.internalState.failures = 0;
    this.internalState.successes = 0;
    this.internalState.halfOpenCalls = 0;
    this.internalState.lastFailureTime = 0;
    this.internalState.nextAttemptTime = 0;
    this.internalState.recentCalls = [];
    this.internalState.state = CircuitBreakerState.CLOSED;
  }

  /**
   * Get current circuit breaker state
   * @returns Current state
   */
  get state(): CircuitBreakerState {
    return this.internalState.state;
  }

  /**
   * Get current circuit breaker statistics
   * @returns Current statistics
   */
  getStats(): CircuitBreakerStats {
    this.cleanupOldCalls();

    const failureRate = this.calculateFailureRate();
    const timeUntilRetry = Math.max(
      0,
      this.internalState.nextAttemptTime - Date.now()
    );

    return {
      state: this.internalState.state,
      failures: this.internalState.failures,
      successes: this.internalState.successes,
      totalCalls: this.internalState.totalCalls,
      failureRate,
      lastFailureTime:
        this.internalState.lastFailureTime > 0
          ? new Date(this.internalState.lastFailureTime)
          : null,
      timeUntilRetry,
      halfOpenCalls: this.internalState.halfOpenCalls,
    };
  }

  /**
   * Check if the circuit breaker is in open state
   * @returns true if circuit breaker is open
   */
  isOpen(): boolean {
    return this.internalState.state === CircuitBreakerState.OPEN;
  }

  /**
   * Check if the circuit breaker is in half-open state
   * @returns true if circuit breaker is half-open
   */
  isHalfOpen(): boolean {
    return this.internalState.state === CircuitBreakerState.HALF_OPEN;
  }

  /**
   * Check if the circuit breaker is in closed state
   * @returns true if circuit breaker is closed
   */
  isClosed(): boolean {
    return this.internalState.state === CircuitBreakerState.CLOSED;
  }

  private shouldTransitionToOpen(): boolean {
    // Check volume threshold
    if (this.internalState.totalCalls < this.config.volumeThreshold) {
      return false;
    }

    // Check failure threshold (absolute)
    if (this.internalState.failures >= this.config.failureThreshold) {
      return true;
    }

    // Check failure rate threshold (percentage)
    const failureRate = this.calculateFailureRate();
    return failureRate >= this.config.errorThresholdPercentage;
  }

  private shouldTransitionToHalfOpen(): boolean {
    const now = Date.now();
    if (now >= this.internalState.nextAttemptTime) {
      this.transitionToHalfOpen();
      return true;
    }
    return false;
  }

  private transitionToOpen(): void {
    this.internalState.state = CircuitBreakerState.OPEN;
    this.internalState.nextAttemptTime = Date.now() + this.config.resetTimeout;
  }

  private transitionToHalfOpen(): void {
    this.internalState.state = CircuitBreakerState.HALF_OPEN;
    this.internalState.halfOpenCalls = 0;
  }

  private transitionToClosed(): void {
    this.internalState.state = CircuitBreakerState.CLOSED;
    this.internalState.failures = 0;
    this.internalState.halfOpenCalls = 0;
  }

  private recordCall(success: boolean): void {
    const now = Date.now();
    this.internalState.recentCalls.push({ timestamp: now, success });
  }

  private cleanupOldCalls(): void {
    const cutoffTime = Date.now() - 60 * 1000; // Keep last 60 seconds
    this.internalState.recentCalls = this.internalState.recentCalls.filter(
      (call) => call.timestamp > cutoffTime
    );
  }

  private calculateFailureRate(): number {
    if (this.internalState.recentCalls.length === 0) {
      return 0;
    }

    const failures = this.internalState.recentCalls.filter(
      (call) => !call.success
    ).length;
    return (failures / this.internalState.recentCalls.length) * 100;
  }
}

/**
 * Factory for creating circuit breakers with common configurations
 */
export class CircuitBreakerFactory {
  /**
   * Create a circuit breaker for network operations
   */
  static createNetworkCircuitBreaker(): CircuitBreaker {
    return new CircuitBreaker({
      enabled: true,
      failureThreshold: 5,
      resetTimeout: 30000,
      halfOpenMaxCalls: 3,
      volumeThreshold: 10,
      errorThresholdPercentage: 50,
    });
  }

  /**
   * Create a circuit breaker for database operations
   */
  static createDatabaseCircuitBreaker(): CircuitBreaker {
    return new CircuitBreaker({
      enabled: true,
      failureThreshold: 3,
      resetTimeout: 60000,
      halfOpenMaxCalls: 2,
      volumeThreshold: 5,
      errorThresholdPercentage: 60,
    });
  }

  /**
   * Create a circuit breaker for critical operations
   */
  static createCriticalCircuitBreaker(): CircuitBreaker {
    return new CircuitBreaker({
      enabled: true,
      failureThreshold: 2,
      resetTimeout: 120000,
      halfOpenMaxCalls: 1,
      volumeThreshold: 3,
      errorThresholdPercentage: 70,
    });
  }

  /**
   * Create a circuit breaker from configuration
   */
  static createFromConfig(config: CircuitBreakerConfig): CircuitBreaker {
    return new CircuitBreaker(config);
  }
}
