/**
 * @fileoverview Retry Statistics - Monitoring and observability utilities
 */

/**
 * Retry statistics for monitoring and observability
 */
export interface RetryStatistics {
  readonly operationName: string;
  readonly totalAttempts: number;
  readonly successfulOperations: number;
  readonly failedOperations: number;
  readonly totalRetries: number;
  readonly averageAttempts: number;
  readonly circuitBreakerTrips: number;
  readonly fallbackExecutions: number;
  readonly lastOperation: Date;
  readonly errorDistribution: Record<string, number>;
  readonly averageLatency: number;
  readonly maxLatency: number;
  readonly minLatency: number;
}

/**
 * Internal statistics storage
 */
const retryStatsMap = new WeakMap<any, Map<string, RetryStatistics>>();

/**
 * Get retry statistics for a specific method
 */
export function getRetryStatistics(
  instance: any,
  methodName: string
): RetryStatistics | null {
  const instanceStats = retryStatsMap.get(instance);
  return instanceStats?.get(methodName) || null;
}

/**
 * Reset retry statistics for a specific method
 */
export function resetRetryStatistics(instance: any, methodName: string): void {
  const instanceStats = retryStatsMap.get(instance);
  if (instanceStats) {
    instanceStats.delete(methodName);
  }
}

/**
 * Update retry statistics
 */
export function updateRetryStatistics(
  instance: any,
  methodName: string,
  update: Partial<RetryStatistics>
): void {
  let instanceStats = retryStatsMap.get(instance);
  if (!instanceStats) {
    instanceStats = new Map();
    retryStatsMap.set(instance, instanceStats);
  }

  const currentStats = instanceStats.get(methodName) || {
    operationName: methodName,
    totalAttempts: 0,
    successfulOperations: 0,
    failedOperations: 0,
    totalRetries: 0,
    averageAttempts: 0,
    circuitBreakerTrips: 0,
    fallbackExecutions: 0,
    lastOperation: new Date(),
    errorDistribution: {},
    averageLatency: 0,
    maxLatency: 0,
    minLatency: 0,
  };

  const updatedStats: RetryStatistics = { ...currentStats, ...update };
  instanceStats.set(methodName, updatedStats);
}
