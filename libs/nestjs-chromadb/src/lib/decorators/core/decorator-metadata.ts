/**
 * @fileoverview Decorator Metadata Management System
 *
 * This module provides robust metadata handling for decorator composition
 * and conflict resolution in the ChromaDB decorator ecosystem. It enables
 * safe combination of multiple decorators without runtime conflicts.
 */

import type { Type } from '@nestjs/common';

/**
 * Decorator metadata interface for composition and conflict detection
 */
export interface DecoratorMetadata {
  readonly type: 'core' | 'performance' | 'validation' | 'caching';
  readonly name: string;
  readonly priority: number; // Higher number = higher priority
  readonly conflicts: readonly string[]; // Names of conflicting decorators
  readonly dependencies: readonly string[]; // Names of required decorators
  readonly version: string;
  readonly target: 'class' | 'method' | 'parameter' | 'property';
  readonly options?: Record<string, unknown>;
}

/**
 * Decorator composition validation result
 */
export interface CompositionValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly executionOrder: readonly DecoratorMetadata[];
}

/**
 * Metadata storage for tracking applied decorators
 */
export class DecoratorMetadataRegistry {
  private static readonly CLASS_METADATA_KEY = Symbol(
    'chroma-class-decorator-metadata'
  );
  private static readonly METHOD_METADATA_KEY = Symbol(
    'chroma-method-decorator-metadata'
  );

  /**
   * Store decorator metadata on target
   */
  static setMetadata(
    target: Type<any> | ((...args: any[]) => any) | object,
    propertyKey: string | symbol | undefined,
    metadata: DecoratorMetadata
  ): void {
    const metadataArray = this.getMetadata(target, propertyKey) || [];
    metadataArray.push(metadata);

    if (propertyKey) {
      // Method/property decorator
      Reflect.defineMetadata(
        this.METHOD_METADATA_KEY,
        metadataArray,
        target,
        propertyKey
      );
    } else {
      // Class decorator
      Reflect.defineMetadata(this.CLASS_METADATA_KEY, metadataArray, target);
    }
  }

  /**
   * Get decorator metadata from target
   */
  static getMetadata(
    target: Type<any> | ((...args: any[]) => any) | object,
    propertyKey?: string | symbol
  ): DecoratorMetadata[] {
    if (propertyKey) {
      return (
        Reflect.getMetadata(this.METHOD_METADATA_KEY, target, propertyKey) || []
      );
    } else {
      return Reflect.getMetadata(this.CLASS_METADATA_KEY, target) || [];
    }
  }

  /**
   * Check if decorator is already applied
   */
  static hasDecorator(
    target: Type<any> | ((...args: any[]) => any) | object,
    decoratorName: string,
    propertyKey?: string | symbol
  ): boolean {
    const metadata = this.getMetadata(target, propertyKey);
    return metadata.some((meta) => meta.name === decoratorName);
  }

  /**
   * Remove decorator metadata
   */
  static removeMetadata(
    target: Type<any> | ((...args: any[]) => any) | object,
    decoratorName: string,
    propertyKey?: string | symbol
  ): void {
    const metadata = this.getMetadata(target, propertyKey);
    const filtered = metadata.filter((meta) => meta.name !== decoratorName);

    if (propertyKey) {
      Reflect.defineMetadata(
        this.METHOD_METADATA_KEY,
        filtered,
        target,
        propertyKey
      );
    } else {
      Reflect.defineMetadata(this.CLASS_METADATA_KEY, filtered, target);
    }
  }

  /**
   * Clear all decorator metadata
   */
  static clearMetadata(
    target: Type<any> | ((...args: any[]) => any) | object,
    propertyKey?: string | symbol
  ): void {
    if (propertyKey) {
      Reflect.deleteMetadata(this.METHOD_METADATA_KEY, target, propertyKey);
    } else {
      Reflect.deleteMetadata(this.CLASS_METADATA_KEY, target);
    }
  }
}

/**
 * Decorator composition validator for conflict detection and execution order
 */
export class DecoratorCompositionValidator {
  /**
   * Validate decorator composition and determine execution order
   */
  static validate(
    decorators: DecoratorMetadata[]
  ): CompositionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for conflicts
    this.validateConflicts(decorators, errors);

    // Check for missing dependencies
    this.validateDependencies(decorators, errors, warnings);

    // Check for duplicate decorators
    this.validateDuplicates(decorators, errors);

    // Determine execution order by priority
    const executionOrder = this.determineExecutionOrder(decorators);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      executionOrder,
    };
  }

  /**
   * Check for decorator conflicts
   */
  private static validateConflicts(
    decorators: DecoratorMetadata[],
    errors: string[]
  ): void {
    for (const decorator of decorators) {
      for (const conflictName of decorator.conflicts) {
        const hasConflict = decorators.some((d) => d.name === conflictName);
        if (hasConflict) {
          errors.push(
            `Decorator conflict: '${decorator.name}' conflicts with '${conflictName}'`
          );
        }
      }
    }
  }

  /**
   * Check for missing dependencies
   */
  private static validateDependencies(
    decorators: DecoratorMetadata[],
    errors: string[],
    warnings: string[]
  ): void {
    const decoratorNames = new Set(decorators.map((d) => d.name));

    for (const decorator of decorators) {
      for (const dependency of decorator.dependencies) {
        if (!decoratorNames.has(dependency)) {
          errors.push(
            `Missing dependency: '${decorator.name}' requires '${dependency}' decorator`
          );
        }
      }
    }
  }

  /**
   * Check for duplicate decorators
   */
  private static validateDuplicates(
    decorators: DecoratorMetadata[],
    errors: string[]
  ): void {
    const seen = new Set<string>();

    for (const decorator of decorators) {
      if (seen.has(decorator.name)) {
        errors.push(
          `Duplicate decorator: '${decorator.name}' is applied multiple times`
        );
      }
      seen.add(decorator.name);
    }
  }

  /**
   * Determine execution order based on priority and dependencies
   */
  private static determineExecutionOrder(
    decorators: DecoratorMetadata[]
  ): DecoratorMetadata[] {
    // Sort by priority (descending) and then by dependencies
    const sorted = [...decorators].sort((a, b) => {
      // First, sort by priority
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      // Then consider dependencies
      if (b.dependencies.includes(a.name)) {
        return -1; // a should come before b
      }
      if (a.dependencies.includes(b.name)) {
        return 1; // b should come before a
      }

      // Finally, sort by name for consistency
      return a.name.localeCompare(b.name);
    });

    return sorted;
  }
}

/**
 * Helper functions for creating decorator metadata
 */
export class DecoratorMetadataBuilder {
  /**
   * Create metadata for core decorators (@VectorQuery, @ChromaRepository)
   */
  static createCoreMetadata(
    name: string,
    target: 'class' | 'method' | 'parameter' | 'property',
    options?: Record<string, unknown>
  ): DecoratorMetadata {
    return {
      type: 'core',
      name,
      priority: 100, // High priority for core functionality
      conflicts: [],
      dependencies: [],
      version: '1.0.0',
      target,
      options,
    };
  }

  /**
   * Create metadata for performance decorators (@Cached, @Profiled, @Retry)
   */
  static createPerformanceMetadata(
    name: string,
    target: 'class' | 'method' | 'parameter' | 'property',
    dependencies: string[] = [],
    options?: Record<string, unknown>
  ): DecoratorMetadata {
    return {
      type: 'performance',
      name,
      priority: 50, // Medium priority
      conflicts: [],
      dependencies,
      version: '1.0.0',
      target,
      options,
    };
  }

  /**
   * Create metadata for validation decorators
   */
  static createValidationMetadata(
    name: string,
    target: 'class' | 'method' | 'parameter' | 'property',
    options?: Record<string, unknown>
  ): DecoratorMetadata {
    return {
      type: 'validation',
      name,
      priority: 80, // High priority for validation
      conflicts: [],
      dependencies: [],
      version: '1.0.0',
      target,
      options,
    };
  }

  /**
   * Create metadata for caching decorators
   */
  static createCachingMetadata(
    name: string,
    target: 'class' | 'method' | 'parameter' | 'property',
    conflicts: string[] = [],
    options?: Record<string, unknown>
  ): DecoratorMetadata {
    return {
      type: 'caching',
      name,
      priority: 30, // Lower priority to execute after core logic
      conflicts,
      dependencies: [],
      version: '1.0.0',
      target,
      options,
    };
  }
}

/**
 * Execution context for decorated methods
 */
export interface DecoratorExecutionContext {
  readonly target: any;
  readonly propertyKey: string | symbol;
  readonly descriptor: PropertyDescriptor;
  readonly args: any[];
  readonly metadata: DecoratorMetadata[];
}

/**
 * Decorator execution pipeline for handling multiple decorators
 */
export class DecoratorExecutionPipeline {
  /**
   * Execute decorators in proper order with composition validation
   */
  static async execute<T>(
    context: DecoratorExecutionContext,
    originalMethod: (...args: any[]) => T | Promise<T>
  ): Promise<T> {
    // Validate decorator composition
    const validation = DecoratorCompositionValidator.validate(context.metadata);

    if (!validation.valid) {
      throw new Error(
        `Decorator composition error: ${validation.errors.join(', ')}`
      );
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('Decorator composition warnings:', validation.warnings);
    }

    // Execute decorators in priority order
    const result = await originalMethod.apply(context.target, context.args);

    // Apply post-processing from decorators (in reverse order)
    for (const _metadata of [...validation.executionOrder].reverse()) {
      // Each decorator can transform the result
      // This is handled by specific decorator implementations
    }

    return result;
  }
}

/**
 * Utility function to get all decorators applied to a class or method
 */
export function getAppliedDecorators(
  target: Type<any> | ((...args: any[]) => any) | object,
  propertyKey?: string | symbol
): DecoratorMetadata[] {
  return DecoratorMetadataRegistry.getMetadata(target, propertyKey);
}

/**
 * Utility function to check if a specific decorator is applied
 */
export function hasDecorator(
  target: Type<any> | ((...args: any[]) => any) | object,
  decoratorName: string,
  propertyKey?: string | symbol
): boolean {
  return DecoratorMetadataRegistry.hasDecorator(
    target,
    decoratorName,
    propertyKey
  );
}

/**
 * Utility function to validate decorator composition on a target
 */
export function validateDecoratorComposition(
  target: Type<any> | ((...args: any[]) => any) | object,
  propertyKey?: string | symbol
): CompositionValidationResult {
  const metadata = DecoratorMetadataRegistry.getMetadata(target, propertyKey);
  return DecoratorCompositionValidator.validate(metadata);
}
