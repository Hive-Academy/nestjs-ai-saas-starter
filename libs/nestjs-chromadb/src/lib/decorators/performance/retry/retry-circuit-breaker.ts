/**
 * @fileoverview Circuit Breaker utilities for Retry decorator
 */

import { CircuitBreaker } from './circuit-breaker';

/**
 * Internal circuit breaker storage
 */
const circuitBreakerMap = new WeakMap<any, Map<string, CircuitBreaker>>();

/**
 * Get circuit breaker state for a specific method
 */
export function getCircuitBreakerState(
  instance: any,
  methodName: string
): 'CLOSED' | 'OPEN' | 'HALF_OPEN' | null {
  const instanceBreakers = circuitBreakerMap.get(instance);
  const breaker = instanceBreakers?.get(methodName);
  return breaker ? breaker.state : null;
}

/**
 * Reset circuit breaker for a specific method
 */
export function resetCircuitBreaker(instance: any, methodName: string): void {
  const instanceBreakers = circuitBreakerMap.get(instance);
  const breaker = instanceBreakers?.get(methodName);
  if (breaker) {
    breaker.reset();
  }
}

/**
 * Get or create circuit breaker for an instance/method
 */
export function getOrCreateCircuitBreaker(
  instance: any,
  methodName: string,
  config: {
    enabled?: boolean;
    failureThreshold?: number;
    resetTimeout?: number;
    monitoringPeriod?: number;
  } = {}
): CircuitBreaker {
  let instanceBreakers = circuitBreakerMap.get(instance);
  if (!instanceBreakers) {
    instanceBreakers = new Map();
    circuitBreakerMap.set(instance, instanceBreakers);
  }

  let breaker = instanceBreakers.get(methodName);
  if (!breaker) {
    breaker = new CircuitBreaker({
      enabled: config.enabled ?? true,
      failureThreshold: config.failureThreshold || 5,
      resetTimeout: config.resetTimeout || 60000,
    });
    instanceBreakers.set(methodName, breaker);
  }

  return breaker;
}
