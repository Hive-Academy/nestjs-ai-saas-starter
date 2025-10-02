/**
 * @fileoverview Tenant Transformation Types and Interfaces
 * Extracted from tenant-transformation.ts for better architecture compliance
 */

import type {
  TenantContext,
  TenantIsolationConfig,
} from '../../services/multi-tenant/tenant-context.service';

/**
 * Transformation error with context
 */
export class TenantTransformationError extends Error {
  constructor(
    message: string,
    public readonly argumentIndex: number,
    public readonly argumentValue: unknown,
    public readonly tenantId?: string
  ) {
    super(message);
    this.name = 'TenantTransformationError';
  }
}

/**
 * Transformation result for a single argument
 */
export interface ArgumentTransformationResult {
  readonly originalValue: unknown;
  readonly transformedValue: unknown;
  readonly wasTransformed: boolean;
  readonly transformationType: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Complete transformation result
 */
export interface TransformationResult {
  readonly originalArgs: unknown[];
  readonly transformedArgs: unknown[];
  readonly transformations: ArgumentTransformationResult[];
  readonly collectionsTransformed: string[];
  readonly metadata: Record<string, unknown>;
}

/**
 * Argument transformer interface
 */
export interface ArgumentTransformer {
  readonly name: string;
  readonly priority: number;
  canTransform(value: unknown, index: number): boolean;
  transform(
    value: unknown,
    index: number,
    tenantContext: TenantContext,
    config: TenantIsolationConfig
  ): ArgumentTransformationResult;
}
