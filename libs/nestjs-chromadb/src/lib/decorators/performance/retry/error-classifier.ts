/**
 * @fileoverview Error Classification System - Intelligent Retry Decision Making
 *
 * This module provides sophisticated error classification for determining
 * whether specific errors should trigger retry attempts.
 */

/**
 * Error classification result
 */
export enum ErrorClassification {
  RETRYABLE = 'RETRYABLE',
  NON_RETRYABLE = 'NON_RETRYABLE',
  CIRCUIT_BREAKER = 'CIRCUIT_BREAKER',
}

/**
 * Error matcher types for flexible error matching
 */
export type ErrorMatcher =
  | string // String contains match
  | RegExp // Regex match
  | (new (...args: any[]) => Error) // Constructor match
  | ((error: Error) => boolean); // Custom predicate

/**
 * Configuration for error classification
 */
export interface ErrorClassificationConfig {
  retryableErrors: ErrorMatcher[];
  nonRetryableErrors: ErrorMatcher[];
  circuitBreakerErrors?: ErrorMatcher[];
  customPredicate?: (error: Error, attempt: number) => ErrorClassification;
  defaultClassification?: ErrorClassification;
}

/**
 * Error classification result with context
 */
export interface ClassificationResult {
  classification: ErrorClassification;
  reason: string;
  matchedPattern?: string;
  confidence: number;
}

/**
 * Intelligent error classifier using multiple strategies
 */
export class ErrorClassifier {
  private readonly config: Required<ErrorClassificationConfig>;

  constructor(config: ErrorClassificationConfig) {
    this.config = {
      retryableErrors: config.retryableErrors,
      nonRetryableErrors: config.nonRetryableErrors,
      circuitBreakerErrors: config.circuitBreakerErrors ?? [],
      customPredicate: config.customPredicate,
      defaultClassification:
        config.defaultClassification ?? ErrorClassification.NON_RETRYABLE,
    };
  }

  /**
   * Classify an error to determine retry behavior
   * @param error The error to classify
   * @param attempt Current attempt number
   * @returns Classification result with context
   */
  classify(error: Error, attempt = 1): ClassificationResult {
    // First, try custom predicate if provided
    if (this.config.customPredicate) {
      try {
        const customResult = this.config.customPredicate(error, attempt);
        return {
          classification: customResult,
          reason: 'Custom predicate classification',
          confidence: 1.0,
        };
      } catch (predicateError) {
        // Fall through to standard classification if predicate fails
      }
    }

    // Check circuit breaker errors first (highest priority)
    const circuitBreakerResult = this.matchAgainstPatterns(
      error,
      this.config.circuitBreakerErrors,
      ErrorClassification.CIRCUIT_BREAKER
    );
    if (circuitBreakerResult) {
      return circuitBreakerResult;
    }

    // Check non-retryable errors (higher priority than retryable)
    const nonRetryableResult = this.matchAgainstPatterns(
      error,
      this.config.nonRetryableErrors,
      ErrorClassification.NON_RETRYABLE
    );
    if (nonRetryableResult) {
      return nonRetryableResult;
    }

    // Check retryable errors
    const retryableResult = this.matchAgainstPatterns(
      error,
      this.config.retryableErrors,
      ErrorClassification.RETRYABLE
    );
    if (retryableResult) {
      return retryableResult;
    }

    // Fall back to heuristic classification
    const heuristicResult = this.classifyUsingHeuristics(error);
    if (heuristicResult) {
      return heuristicResult;
    }

    // Default classification
    return {
      classification: this.config.defaultClassification,
      reason: 'Default classification - no patterns matched',
      confidence: 0.1,
    };
  }

  /**
   * Update classification configuration
   * @param updates Partial configuration updates
   */
  updateConfig(updates: Partial<ErrorClassificationConfig>): void {
    Object.assign(this.config, updates);
  }

  /**
   * Add new error patterns to existing configuration
   * @param type Type of errors to add
   * @param patterns Error patterns to add
   */
  addErrorPatterns(
    type: 'retryable' | 'nonRetryable' | 'circuitBreaker',
    patterns: ErrorMatcher[]
  ): void {
    switch (type) {
      case 'retryable':
        this.config.retryableErrors.push(...patterns);
        break;
      case 'nonRetryable':
        this.config.nonRetryableErrors.push(...patterns);
        break;
      case 'circuitBreaker':
        this.config.circuitBreakerErrors.push(...patterns);
        break;
    }
  }

  private matchAgainstPatterns(
    error: Error,
    patterns: ErrorMatcher[],
    classification: ErrorClassification
  ): ClassificationResult | null {
    for (const pattern of patterns) {
      const matchResult = this.matchPattern(error, pattern);
      if (matchResult.matched) {
        return {
          classification,
          reason: matchResult.reason,
          matchedPattern: matchResult.pattern,
          confidence: matchResult.confidence,
        };
      }
    }
    return null;
  }

  private matchPattern(
    error: Error,
    pattern: ErrorMatcher
  ): {
    matched: boolean;
    reason: string;
    pattern: string;
    confidence: number;
  } {
    const errorMessage = error.message || '';
    const errorName = error.constructor.name || '';

    // String pattern matching
    if (typeof pattern === 'string') {
      const messageMatch = errorMessage
        .toLowerCase()
        .includes(pattern.toLowerCase());
      const nameMatch = errorName.toLowerCase().includes(pattern.toLowerCase());

      if (messageMatch || nameMatch) {
        return {
          matched: true,
          reason: `Matched string pattern: ${pattern}`,
          pattern: pattern,
          confidence: messageMatch ? 0.9 : 0.7,
        };
      }
    }

    // RegExp pattern matching
    if (pattern instanceof RegExp) {
      const messageMatch = pattern.test(errorMessage);
      const nameMatch = pattern.test(errorName);

      if (messageMatch || nameMatch) {
        return {
          matched: true,
          reason: `Matched regex pattern: ${pattern.source}`,
          pattern: pattern.source,
          confidence: messageMatch ? 0.9 : 0.7,
        };
      }
    }

    // Constructor/instanceof matching
    if (typeof pattern === 'function') {
      try {
        if (error instanceof pattern) {
          return {
            matched: true,
            reason: `Matched error type: ${pattern.name}`,
            pattern: pattern.name,
            confidence: 1.0,
          };
        }
      } catch {
        // Ignore errors in instanceof check
      }
    }

    // Custom predicate function
    if (typeof pattern === 'function' && pattern.length === 1) {
      try {
        const predicatePattern = pattern as (error: Error) => boolean;
        if (predicatePattern(error)) {
          return {
            matched: true,
            reason: 'Matched custom predicate',
            pattern: 'custom-predicate',
            confidence: 0.8,
          };
        }
      } catch {
        // Ignore errors in predicate execution
      }
    }

    return {
      matched: false,
      reason: 'No match',
      pattern: '',
      confidence: 0,
    };
  }

  private classifyUsingHeuristics(error: Error): ClassificationResult | null {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.constructor.name.toLowerCase();

    // Common retryable error indicators
    const retryableKeywords = [
      'timeout',
      'connection',
      'network',
      'reset',
      'refused',
      'unavailable',
      'busy',
      'overload',
      'rate limit',
      'throttle',
    ];

    // Common non-retryable error indicators
    const nonRetryableKeywords = [
      'validation',
      'unauthorized',
      'forbidden',
      'not found',
      'bad request',
      'syntax',
      'invalid',
      'malformed',
      'permission',
    ];

    // Check for retryable patterns
    for (const keyword of retryableKeywords) {
      if (errorMessage.includes(keyword) || errorName.includes(keyword)) {
        return {
          classification: ErrorClassification.RETRYABLE,
          reason: `Heuristic match for retryable keyword: ${keyword}`,
          confidence: 0.6,
        };
      }
    }

    // Check for non-retryable patterns
    for (const keyword of nonRetryableKeywords) {
      if (errorMessage.includes(keyword) || errorName.includes(keyword)) {
        return {
          classification: ErrorClassification.NON_RETRYABLE,
          reason: `Heuristic match for non-retryable keyword: ${keyword}`,
          confidence: 0.6,
        };
      }
    }

    return null;
  }
}

/**
 * Predefined error classification configurations for common scenarios
 */
export class ErrorClassificationPresets {
  /**
   * Configuration for network operations
   */
  static network(): ErrorClassificationConfig {
    return {
      retryableErrors: [
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'ECONNREFUSED',
        'EHOSTUNREACH',
        /timeout/i,
        /connection/i,
        /network/i,
        /socket/i,
        /dns/i,
      ],
      nonRetryableErrors: [
        /validation/i,
        /unauthorized/i,
        /forbidden/i,
        /bad request/i,
        /malformed/i,
        /invalid.*format/i,
      ],
      circuitBreakerErrors: [
        /service.*unavailable/i,
        /internal.*server.*error/i,
        /gateway.*timeout/i,
      ],
      defaultClassification: ErrorClassification.NON_RETRYABLE,
    };
  }

  /**
   * Configuration for database operations
   */
  static database(): ErrorClassificationConfig {
    return {
      retryableErrors: [
        /connection.*timeout/i,
        /connection.*reset/i,
        /deadlock/i,
        /lock.*timeout/i,
        /too.*many.*connections/i,
        /database.*busy/i,
      ],
      nonRetryableErrors: [
        /constraint.*violation/i,
        /syntax.*error/i,
        /permission.*denied/i,
        /table.*not.*exist/i,
        /column.*not.*exist/i,
        /duplicate.*key/i,
      ],
      circuitBreakerErrors: [
        /database.*unavailable/i,
        /connection.*pool.*exhausted/i,
      ],
      defaultClassification: ErrorClassification.NON_RETRYABLE,
    };
  }

  /**
   * Configuration for vector database operations
   */
  static vectorDatabase(): ErrorClassificationConfig {
    return {
      retryableErrors: [
        /timeout/i,
        /connection/i,
        /service.*unavailable/i,
        /internal.*server.*error/i,
        /rate.*limit/i,
        /throttle/i,
        /overload/i,
      ],
      nonRetryableErrors: [
        /validation/i,
        /unauthorized/i,
        /forbidden/i,
        /bad.*request/i,
        /invalid.*collection/i,
        /dimension.*mismatch/i,
        /malformed.*query/i,
      ],
      circuitBreakerErrors: [
        /service.*down/i,
        /health.*check.*failed/i,
        /circuit.*breaker/i,
      ],
      defaultClassification: ErrorClassification.RETRYABLE,
    };
  }

  /**
   * Configuration for API operations
   */
  static api(): ErrorClassificationConfig {
    return {
      retryableErrors: [
        /5\d\d/, // 5xx HTTP status codes
        /timeout/i,
        /connection/i,
        /network/i,
        /rate.*limit/i,
        /throttle/i,
      ],
      nonRetryableErrors: [
        /4\d\d/, // 4xx HTTP status codes (except 429)
        /unauthorized/i,
        /forbidden/i,
        /not.*found/i,
        /bad.*request/i,
        /validation/i,
      ],
      circuitBreakerErrors: [
        /502/, // Bad Gateway
        /503/, // Service Unavailable
        /504/, // Gateway Timeout
        /service.*unavailable/i,
      ],
      customPredicate: (error: Error, attempt: number) => {
        // Special handling for rate limiting
        if (/429|rate.*limit/i.test(error.message)) {
          return attempt <= 3
            ? ErrorClassification.RETRYABLE
            : ErrorClassification.NON_RETRYABLE;
        }
        return ErrorClassification.NON_RETRYABLE;
      },
      defaultClassification: ErrorClassification.NON_RETRYABLE,
    };
  }
}

/**
 * Factory for creating error classifiers
 */
export class ErrorClassifierFactory {
  /**
   * Create an error classifier for a specific domain
   * @param domain The domain to create a classifier for
   * @param customConfig Optional custom configuration to merge
   * @returns Configured error classifier
   */
  static createForDomain(
    domain: 'network' | 'database' | 'vectorDatabase' | 'api',
    customConfig?: Partial<ErrorClassificationConfig>
  ): ErrorClassifier {
    let baseConfig: ErrorClassificationConfig;

    switch (domain) {
      case 'network':
        baseConfig = ErrorClassificationPresets.network();
        break;
      case 'database':
        baseConfig = ErrorClassificationPresets.database();
        break;
      case 'vectorDatabase':
        baseConfig = ErrorClassificationPresets.vectorDatabase();
        break;
      case 'api':
        baseConfig = ErrorClassificationPresets.api();
        break;
      default:
        baseConfig = ErrorClassificationPresets.network();
    }

    if (customConfig) {
      baseConfig = {
        ...baseConfig,
        ...customConfig,
        retryableErrors: [
          ...baseConfig.retryableErrors,
          ...(customConfig.retryableErrors || []),
        ],
        nonRetryableErrors: [
          ...baseConfig.nonRetryableErrors,
          ...(customConfig.nonRetryableErrors || []),
        ],
        circuitBreakerErrors: [
          ...(baseConfig.circuitBreakerErrors || []),
          ...(customConfig.circuitBreakerErrors || []),
        ],
      };
    }

    return new ErrorClassifier(baseConfig);
  }

  /**
   * Create a custom error classifier
   * @param config Custom configuration
   * @returns Configured error classifier
   */
  static createCustom(config: ErrorClassificationConfig): ErrorClassifier {
    return new ErrorClassifier(config);
  }
}
