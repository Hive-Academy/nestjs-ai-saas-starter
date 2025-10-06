import 'reflect-metadata';
import { WORKFLOW_EDGES_KEY } from '@hive-academy/langgraph-core';
import { validateDecoratorPattern } from '../utils/decorator-validator';

/**
 * Options for @Edge decorator
 */
export interface EdgeOptions {
  /** Edge ID (optional, auto-generated if not provided) */
  id?: string;
  /** Edge priority (higher values evaluated first) */
  priority?: number;
  /** Minimum confidence required to traverse this edge */
  minConfidence?: number;
  /** Maximum confidence allowed to traverse this edge */
  maxConfidence?: number;
  /** Custom condition function */
  condition?: (state: any) => boolean | string;
  /** Edge description */
  description?: string;
  /** Label for the edge */
  label?: string;
  /** Edge type */
  type?: 'standard' | 'conditional' | 'error' | 'retry';
  /** Edge metadata */
  metadata?: Record<string, any>;
}

/**
 * Metadata stored for each edge
 */
export interface EdgeMetadata extends EdgeOptions {
  from: string;
  to: string | ((state: any) => string | null);
  methodName?: string;
  handler?: () => Promise<any>;
}

/**
 * Decorator to define edges between nodes with functional condition support
 *
 * @example Simple edge (no condition)
 * ```typescript
 * @Workflow({ name: 'my-workflow' })
 * export class MyWorkflow extends DeclarativeWorkflowBase {
 *
 *   // Simple edge - no condition needed
 *   @Edge('analyze', 'process')
 *   analyzeToProcess() {}
 * }
 * ```
 *
 * @example Conditional edge with inline condition
 * ```typescript
 * @Edge('analyze', 'process', {
 *   condition: (state) => state.analysis.quality === 'good'
 * })
 * conditionalEdge() {}
 * ```
 *
 * @example Functional condition method
 * ```typescript
 * // Method body used as condition - evaluates to boolean
 * @Edge('analyze', 'process')
 * shouldProcessAnalysis(state: WorkflowState): boolean {
 *   return state.analysis.quality === 'good' && state.confidence > 0.8;
 * }
 *
 * // Complex functional condition
 * @Edge('assessment', 'optimization')
 * isOptimizationPath(state: WorkflowState): boolean {
 *   return (state.metadata?.brandScore as number) > 0.7;
 * }
 * ```
 */
export function Edge(from: string, to: string, options?: EdgeOptions): MethodDecorator;
export function Edge(from: string, to: (state: any) => string | null, options?: EdgeOptions): MethodDecorator;
export function Edge(
  from: string,
  to: string | ((state: any) => string | null),
  options: EdgeOptions = {}
): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
    // 🔒 VALIDATION: Enforce node-based pattern
    // @Edge is mutually exclusive with @Entrypoint and @Task
    validateDecoratorPattern(
      target.constructor,
      'node-based',
      'Edge',
      target.constructor.name
    );

    const originalMethod = descriptor?.value;

    // Determine if this is a functional condition method
    // A method is functional if it has parameters (accepts state)
    const isFunctionalCondition = originalMethod && originalMethod.length > 0;

    // Create edge metadata
    const edgeMetadata: EdgeMetadata = {
      ...options,
      id: options.id || `${from}_to_${typeof to === 'string' ? to : 'conditional'}_${String(propertyKey)}`,
      from,
      to,
      methodName: String(propertyKey),
      handler: originalMethod,
    };

    // If method accepts state parameter and 'to' is a string, use method as condition
    if (isFunctionalCondition && typeof to === 'string' && !options.condition) {
      edgeMetadata.condition = function(state: any): boolean {
        try {
          const result = originalMethod.call(this, state);
          return Boolean(result);
        } catch (error) {
          console.warn(`Edge condition method ${String(propertyKey)} failed:`, error);
          return false;
        }
      };
    }

    // Get existing edges or initialize
    const existingEdges = Reflect.getMetadata(WORKFLOW_EDGES_KEY, target.constructor) || [];

    // Add this edge
    existingEdges.push(edgeMetadata);

    // Store updated edges
    Reflect.defineMetadata(WORKFLOW_EDGES_KEY, existingEdges, target.constructor);

    // Also store on the method itself for direct access
    Reflect.defineMetadata('edge:metadata', edgeMetadata, target, propertyKey);

    // Replace method to return metadata when called without arguments
    if (descriptor) {
      descriptor.value = function(this: any, state?: any) {
        if (state !== undefined && isFunctionalCondition) {
          // Called as condition function with state
          try {
            return Boolean(originalMethod.call(this, state));
          } catch (error) {
            console.warn(`Edge condition method ${String(propertyKey)} failed:`, error);
            return false;
          }
        }
        // Called as metadata getter
        return edgeMetadata;
      };
    }

    return descriptor;
  };
}

/**
 * Decorator for conditional routing
 */
export interface ConditionalRouteOptions {
  /** Minimum confidence required */
  minConfidence?: number;
  /** Maximum confidence allowed */
  maxConfidence?: number;
  /** Required fields in state */
  requiredFields?: string[];
  /** Custom validation function */
  validate?: (state: any) => boolean;
}

/**
 * Decorator to mark a method as a conditional route
 * 
 * @example
 * ```typescript
 * @Edge('process', 'approve')
 * @ConditionalRoute({ 
 *   minConfidence: 0.8,
 *   requiredFields: ['analysis', 'risk_assessment']
 * })
 * shouldApprove(state: WorkflowState): string {
 *   if (state.confidence >= 0.9) return 'auto_approve';
 *   if (state.confidence >= 0.8) return 'human_approve';
 *   return 'reject';
 * }
 * ```
 */
export function ConditionalRoute(options: ConditionalRouteOptions): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // Store conditional route metadata
    Reflect.defineMetadata('conditional:route', options, target, propertyKey);
    
    // Wrap the method to add validation
    const originalMethod = descriptor.value;
    descriptor.value = function(this: any, state: any): any {
      // Check confidence
      if (options.minConfidence !== undefined && state.confidence < options.minConfidence) {
        return false;
      }
      if (options.maxConfidence !== undefined && state.confidence > options.maxConfidence) {
        return false;
      }
      
      // Check required fields
      if (options.requiredFields) {
        for (const field of options.requiredFields) {
          if (!(field in state) || state[field] === undefined) {
            return false;
          }
        }
      }
      
      // Custom validation
      if (options.validate && !options.validate(state)) {
        return false;
      }
      
      // Call original method
      return originalMethod.call(this, state);
    };
    
    return descriptor;
  };
}

/**
 * Get all edges from a workflow class
 */
export function getWorkflowEdges(target: any): EdgeMetadata[] {
  return Reflect.getMetadata(WORKFLOW_EDGES_KEY, target) || [];
}

/**
 * Get edge metadata from a method
 */
export function getEdgeMetadata(target: any, propertyKey: string | symbol): EdgeMetadata | undefined {
  return Reflect.getMetadata('edge:metadata', target, propertyKey);
}

/**
 * Create a simple edge (functional approach)
 */
export function createEdge(from: string, to: string): EdgeMetadata {
  return { from, to };
}

/**
 * Create a conditional edge (functional approach)
 */
export function createConditionalEdge(
  from: string,
  condition: (state: any) => string | boolean,
  routes: Record<string, string>
): EdgeMetadata {
  return {
    from,
    to: '', // Will be determined by condition
    condition: (state: any) => {
      const result = condition(state);
      if (typeof result === 'string') {
        return routes[result] || 'end';
      }
      return result ? (routes.true || routes.approved || 'end') : (routes.false || routes.rejected || 'end');
    },
    type: 'conditional',
  };
}

/**
 * Conditional edge decorator for complex routing logic
 * 
 * @example
 * ```typescript
 * @ConditionalEdge('analyze', {
 *   'high_confidence': 'process',
 *   'low_confidence': 'human_approval',
 *   'error': 'error_handler'
 * }, { default: 'fallback' })
 * routeAfterAnalysis(state: WorkflowState): string {
 *   if (state.confidence > 0.9) return 'high_confidence';
 *   if (state.confidence < 0.5) return 'low_confidence';
 *   if (state.error) return 'error';
 *   return null; // Will use default
 * }
 * ```
 */
export function ConditionalEdge(
  from: string,
  routes: Record<string, string>,
  options: EdgeOptions & { default?: string } = {}
): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    
    // Create conditional routing function
    const conditionalRouting = (state: any): string | null => {
      const result = originalMethod.call(target, state);
      return result && routes[result] ? routes[result] : options.default || null;
    };
    
    // Create edge metadata with conditional routing
    const edgeMetadata: EdgeMetadata = {
      ...options,
      id: options.id || `${from}_conditional_${String(propertyKey)}`,
      from,
      to: conditionalRouting,
      methodName: String(propertyKey),
    };
    
    // Get existing edges or initialize
    const existingEdges = Reflect.getMetadata(WORKFLOW_EDGES_KEY, target.constructor) || [];
    
    // Add this edge
    existingEdges.push(edgeMetadata);
    
    // Store updated edges
    Reflect.defineMetadata(WORKFLOW_EDGES_KEY, existingEdges, target.constructor);
    
    // Store routing metadata for introspection
    Reflect.defineMetadata('edge:metadata', {
      ...edgeMetadata,
      routes,
      conditionMethod: propertyKey
    }, target, propertyKey);
    
    return descriptor;
  };
}

/**
 * Confidence-based routing decorator
 * Routes based on workflow confidence thresholds
 */
export function ConfidenceRoute(
  from: string,
  options: {
    highConfidence?: { threshold: number; target: string };
    mediumConfidence?: { threshold: number; target: string };
    lowConfidence?: { target: string };
    default?: string;
  } & EdgeOptions
): MethodDecorator {
  const routingFunction = (state: any): string | null => {
    const confidence = state.confidence || 0;
    
    if (options.highConfidence && confidence >= options.highConfidence.threshold) {
      return options.highConfidence.target;
    }
    
    if (options.mediumConfidence && confidence >= options.mediumConfidence.threshold) {
      return options.mediumConfidence.target;
    }
    
    if (options.lowConfidence) {
      return options.lowConfidence.target;
    }
    
    return options.default || null;
  };
  
  return Edge(from, routingFunction, {
    ...options,
    metadata: {
      ...options.metadata,
      type: 'confidence_routing',
      confidenceThresholds: {
        high: options.highConfidence?.threshold,
        medium: options.mediumConfidence?.threshold
      }
    }
  });
}

/**
 * Special decorator for default fallback edges
 */
export function FallbackEdge(from: string, to: string, options?: EdgeOptions): MethodDecorator {
  return Edge(from, to, {
    ...options,
    priority: -1, // Lower priority than other edges
    metadata: {
      ...options?.metadata,
      type: 'fallback'
    }
  });
}

/**
 * Special decorator for error handling edges
 */
export function ErrorEdge(from: string, to = 'error_handler', options?: EdgeOptions): MethodDecorator {
  return Edge(from, (state: any) => state.error ? to : null, {
    ...options,
    metadata: {
      ...options?.metadata,
      type: 'error_handling'
    }
  });
}