/**
 * @fileoverview Retry Strategy Pattern - Configurable Delay Calculation
 *
 * This module implements the Strategy pattern for retry delay calculations,
 * providing extensible backoff strategies for resilient operations.
 */

/**
 * Strategy interface for calculating retry delays
 */
export interface RetryStrategy {
  /**
   * Calculate delay for the next retry attempt
   * @param attempt Current attempt number (1-based)
   * @param baseDelay Base delay in milliseconds
   * @param config Additional configuration for the strategy
   * @returns Delay in milliseconds for the next attempt
   */
  calculateDelay(attempt: number, baseDelay: number, config?: any): number;
}

/**
 * Exponential backoff strategy with configurable multiplier
 */
export class ExponentialBackoffStrategy implements RetryStrategy {
  constructor(
    private readonly multiplier = 2,
    private readonly maxDelay = 30000
  ) {}

  calculateDelay(attempt: number, baseDelay: number): number {
    const delay = baseDelay * Math.pow(this.multiplier, attempt - 1);
    return Math.min(delay, this.maxDelay);
  }
}

/**
 * Linear backoff strategy - delay increases linearly with attempt number
 */
export class LinearBackoffStrategy implements RetryStrategy {
  constructor(private readonly maxDelay = 30000) {}

  calculateDelay(attempt: number, baseDelay: number): number {
    const delay = baseDelay * attempt;
    return Math.min(delay, this.maxDelay);
  }
}

/**
 * Fixed delay strategy - same delay for all attempts
 */
export class FixedDelayStrategy implements RetryStrategy {
  calculateDelay(_attempt: number, baseDelay: number): number {
    return baseDelay;
  }
}

/**
 * Custom function-based strategy
 */
export class CustomDelayStrategy implements RetryStrategy {
  constructor(
    private readonly customFunction: (
      attempt: number,
      baseDelay: number
    ) => number,
    private readonly maxDelay = 30000
  ) {}

  calculateDelay(attempt: number, baseDelay: number): number {
    const delay = this.customFunction(attempt, baseDelay);
    return Math.min(delay, this.maxDelay);
  }
}

/**
 * Jitter configuration for adding randomness to delays
 */
export interface JitterConfig {
  enabled: boolean;
  maxJitterPercent: number;
}

/**
 * Service for applying jitter to calculated delays
 */
export class JitterService {
  /**
   * Apply jitter to a calculated delay
   * @param delay Base delay to apply jitter to
   * @param config Jitter configuration
   * @returns Delay with jitter applied
   */
  static applyJitter(delay: number, config: JitterConfig): number {
    if (!config.enabled) {
      return delay;
    }

    const jitterAmount = delay * config.maxJitterPercent * Math.random();
    return Math.round(delay + jitterAmount);
  }
}

/**
 * Factory for creating retry strategies
 */
export class RetryStrategyFactory {
  /**
   * Create a retry strategy based on configuration
   * @param strategyType Type of strategy to create
   * @param config Strategy-specific configuration
   * @returns Configured retry strategy
   */
  static createStrategy(
    strategyType: 'exponential' | 'linear' | 'fixed' | 'custom',
    config: {
      backoffMultiplier?: number;
      maxDelay?: number;
      customDelay?: (attempt: number, baseDelay: number) => number;
    } = {}
  ): RetryStrategy {
    const { backoffMultiplier = 2, maxDelay = 30000, customDelay } = config;

    switch (strategyType) {
      case 'exponential':
        return new ExponentialBackoffStrategy(backoffMultiplier, maxDelay);

      case 'linear':
        return new LinearBackoffStrategy(maxDelay);

      case 'fixed':
        return new FixedDelayStrategy();

      case 'custom':
        if (!customDelay) {
          throw new Error(
            'Custom delay function is required for custom strategy'
          );
        }
        return new CustomDelayStrategy(customDelay, maxDelay);

      default:
        return new ExponentialBackoffStrategy(backoffMultiplier, maxDelay);
    }
  }
}

/**
 * Predefined strategy configurations for common use cases
 */
export const StrategyPresets = {
  /**
   * Aggressive exponential backoff for network operations
   */
  networkAggressive: {
    strategy: new ExponentialBackoffStrategy(2, 30000),
    jitter: { enabled: true, maxJitterPercent: 0.1 },
  },

  /**
   * Conservative exponential backoff for database operations
   */
  databaseConservative: {
    strategy: new ExponentialBackoffStrategy(1.5, 10000),
    jitter: { enabled: true, maxJitterPercent: 0.05 },
  },

  /**
   * Linear backoff for predictable timing
   */
  linearPredictable: {
    strategy: new LinearBackoffStrategy(15000),
    jitter: { enabled: false, maxJitterPercent: 0 },
  },

  /**
   * Fixed delay for consistent timing
   */
  fixedConsistent: {
    strategy: new FixedDelayStrategy(),
    jitter: { enabled: false, maxJitterPercent: 0 },
  },
} as const;

/**
 * Main retry delay calculator that orchestrates strategy and jitter
 */
export class RetryDelayCalculator {
  constructor(
    private readonly strategy: RetryStrategy,
    private readonly jitterConfig: JitterConfig = {
      enabled: false,
      maxJitterPercent: 0,
    }
  ) {}

  /**
   * Calculate the final delay for a retry attempt
   * @param attempt Current attempt number (1-based)
   * @param baseDelay Base delay in milliseconds
   * @returns Final delay with strategy and jitter applied
   */
  calculateDelay(attempt: number, baseDelay: number): number {
    const strategyDelay = this.strategy.calculateDelay(attempt, baseDelay);
    return JitterService.applyJitter(strategyDelay, this.jitterConfig);
  }

  /**
   * Update the jitter configuration
   * @param config New jitter configuration
   */
  updateJitterConfig(config: JitterConfig): void {
    Object.assign(this.jitterConfig, config);
  }
}
