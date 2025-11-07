/**
 * Service Locator for ApprovalEvaluatorService
 *
 * PURPOSE: Eliminate the need for manual ApprovalEvaluatorService injection
 * in classes using @RequiresApproval decorator
 *
 * ARCHITECTURE:
 * - Module stores service instance during initialization
 * - Decorator accesses service through this locator
 * - No manual injection required by consumers
 *
 * PATTERN: Service Locator (acceptable for decorators that can't use DI)
 */

import type { ApprovalEvaluatorService } from '../services/approval-evaluator.service';

/**
 * Global storage for ApprovalEvaluatorService instance
 * Initialized by HitlModule during module setup
 */
let approvalEvaluatorServiceInstance: ApprovalEvaluatorService | undefined;

/**
 * Store ApprovalEvaluatorService instance
 * Called by HitlModule.forRoot/forRootAsync during initialization
 *
 * @param service - ApprovalEvaluatorService instance from DI container
 */
export function setApprovalEvaluatorService(
  service: ApprovalEvaluatorService
): void {
  approvalEvaluatorServiceInstance = service;
}

/**
 * Get stored ApprovalEvaluatorService instance
 * Used by @RequiresApproval decorator to access service
 *
 * @returns ApprovalEvaluatorService instance or undefined if not initialized
 * @throws Error at RUNTIME if service not initialized (NOT at decorator evaluation time)
 */
export function getApprovalEvaluatorService():
  | ApprovalEvaluatorService
  | undefined {
  // 🔧 BUGFIX (TASK_2025_038): Return undefined instead of throwing
  // This allows decorators to be evaluated at class declaration time
  // The error will be thrown at RUNTIME in the decorator wrapper
  return approvalEvaluatorServiceInstance;
}

/**
 * Clear stored service (useful for testing)
 */
export function clearApprovalEvaluatorService(): void {
  approvalEvaluatorServiceInstance = undefined;
}
