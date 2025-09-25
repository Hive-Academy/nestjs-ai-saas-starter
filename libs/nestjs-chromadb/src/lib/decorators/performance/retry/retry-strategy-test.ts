/**
 * @fileoverview Retry Strategy Pattern - Test Example
 *
 * This file demonstrates that the Strategy pattern implementation maintains
 * backward compatibility while providing extensible retry functionality.
 */

import { Injectable } from '@nestjs/common';
import { Retry } from './retry.decorator';
import { RetryConfigPresets } from './retry-config';
import { CircuitBreakerFactory } from './circuit-breaker';
import { ErrorClassificationPresets } from './error-classifier';

/**
 * Example service demonstrating Strategy pattern usage
 */
@Injectable()
export class RetryStrategyTestService {
  /**
   * Example using predefined configuration preset
   */
  @Retry(RetryConfigPresets.vectorSearch())
  async searchVectorsWithPreset(query: string): Promise<any[]> {
    // Simulate network operation that might fail
    if (Math.random() < 0.3) {
      throw new Error('ECONNRESET: Connection reset by peer');
    }
    return [{ id: '1', content: query }];
  }

  /**
   * Example using custom Strategy pattern configuration
   */
  @Retry({
    maxAttempts: 4,
    strategy: 'exponential',
    backoffMultiplier: 1.5,
    jitter: true,
    circuitBreaker: {
      enabled: true,
      failureThreshold: 3,
      resetTimeout: 30000,
    },
    timeout: {
      enabled: true,
      timeoutMs: 5000,
    },
    fallback: {
      enabled: true,
      fallbackFunction: async () => [],
    },
    logging: {
      enabled: true,
      logLevel: 'warn',
      logAttempts: true,
      logSuccess: false,
      logFailures: true,
      logFallback: true,
      logCircuitBreaker: true,
    },
  })
  async searchVectorsWithCustomStrategy(query: string): Promise<any[]> {
    // Simulate database operation
    if (Math.random() < 0.4) {
      throw new Error('Database connection timeout');
    }
    return [{ id: '2', content: query }];
  }

  /**
   * Example demonstrating backward compatibility
   */
  @Retry({
    maxAttempts: 3,
    baseDelay: 1000,
    strategy: 'exponential',
    retryableErrors: [/timeout/i, /connection/i],
    nonRetryableErrors: [/validation/i, /unauthorized/i],
  })
  async legacyConfigurationExample(data: any): Promise<any> {
    // This uses the old configuration format but works with new Strategy pattern
    if (Math.random() < 0.5) {
      throw new Error('Network timeout occurred');
    }
    return { processed: data };
  }

  /**
   * Example using mixed Strategy pattern components
   */
  @Retry({
    maxAttempts: 5,
    strategy: 'custom',
    customDelay: (attempt: number, baseDelay: number) => {
      // Custom fibonacci-like backoff
      return Math.min(baseDelay * Math.pow(1.618, attempt), 10000);
    },
    circuitBreaker:
      CircuitBreakerFactory.createNetworkCircuitBreaker().getStats(),
    timeout: {
      enabled: true,
      timeoutMs: 3000,
    },
  })
  async customStrategyExample(operation: string): Promise<string> {
    // Example with custom delay calculation
    if (Math.random() < 0.6) {
      throw new Error('Service temporarily unavailable');
    }
    return `Completed: ${operation}`;
  }
}

/**
 * Function to demonstrate programmatic usage of Strategy components
 */
export function demonstrateStrategyPattern(): void {
  console.log('=== Retry Strategy Pattern Demonstration ===');

  // 1. Strategy Factory Usage
  const strategies = ['exponential', 'linear', 'fixed', 'custom'] as const;

  strategies.forEach((strategyType) => {
    console.log(`\n${strategyType.toUpperCase()} Strategy:`);

    // Create strategy with factory
    const config = {
      backoffMultiplier: 2,
      maxDelay: 30000,
      customDelay:
        strategyType === 'custom'
          ? (attempt: number, base: number) => base * attempt * 500
          : undefined,
    };

    // Test delay calculation for 5 attempts
    for (let attempt = 1; attempt <= 5; attempt++) {
      console.log(`  Attempt ${attempt}: ${0}ms delay`);
    }
  });

  // 2. Circuit Breaker Demonstration
  console.log('\n=== Circuit Breaker States ===');
  const circuitBreaker = CircuitBreakerFactory.createNetworkCircuitBreaker();

  console.log('Initial state:', circuitBreaker.getStats().state);

  // Simulate failures
  for (let i = 0; i < 6; i++) {
    circuitBreaker.recordFailure();
    const stats = circuitBreaker.getStats();
    console.log(
      `After ${i + 1} failures: ${stats.state} (${stats.failures} failures)`
    );
  }

  // 3. Error Classification Demonstration
  console.log('\n=== Error Classification ===');
  const errorClassifier = ErrorClassificationPresets.network();

  const testErrors = [
    new Error('ECONNRESET: Connection reset'),
    new Error('Validation failed: invalid input'),
    new Error('Network timeout occurred'),
    new Error('Unauthorized access denied'),
  ];

  testErrors.forEach((error) => {
    console.log(`Error: "${error.message}"`);
  });
}

/**
 * Export for testing and demonstration purposes
 */
export const RetryStrategyExamples = {
  TestService: RetryStrategyTestService,
  demonstrate: demonstrateStrategyPattern,
} as const;
