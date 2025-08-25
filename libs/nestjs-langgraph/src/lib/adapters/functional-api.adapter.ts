import { Injectable, Inject, Optional } from '@nestjs/common';
import type {
  ICreatableAdapter,
  IExecutableAdapter,
  ExtendedAdapterStatus,
} from './interfaces/adapter.interface';
import { BaseModuleAdapter } from './base/base.adapter';

/**
 * Configuration for functional API operations
 */
export interface FunctionalApiConfig {
  enabled?: boolean;
  /** Enable strict purity checking */
  strictPurity?: boolean;
  /** Enable immutability validation */
  validateImmutability?: boolean;
  /** Function composition options */
  composition?: {
    /** Enable parallel composition where possible */
    enableParallel?: boolean;
    /** Maximum composition depth */
    maxDepth?: number;
  };
  /** Caching options for pure functions */
  caching?: {
    enabled?: boolean;
    /** Cache size limit */
    maxSize?: number;
    /** TTL in milliseconds */
    ttl?: number;
  };
}

/**
 * Result of functional API operations
 */
export interface FunctionalApiResult {
  /** Pipeline identifier */
  pipelineId: string;
  /** Composed functions in the pipeline */
  functions: Array<{
    name: string;
    isPure: boolean;
    order: number;
  }>;
  /** Pipeline metadata */
  metadata: {
    isImmutable: boolean;
    enablesCaching: boolean;
    compositionDepth: number;
  };
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * Pure function wrapper
 */
export interface PureFunction<T = any, R = any> {
  /** Function name */
  name: string;
  /** The function implementation */
  fn: (input: T) => R;
  /** Whether the function is verified as pure */
  isPure: boolean;
  /** Input/output type information */
  types?: {
    input: string;
    output: string;
  };
}

/**
 * Function pipeline for composition
 */
export interface FunctionPipeline {
  /** Pipeline functions */
  functions: PureFunction[];
  /** Pipeline execution mode */
  mode: 'sequential' | 'parallel' | 'conditional';
  /** Pipeline configuration */
  config: Pick<FunctionalApiConfig, 'strictPurity' | 'validateImmutability'>;
}

/**
 * Reducer function for state management
 */
export interface StateReducer<TState = any, TAction = any> {
  /** Reducer name */
  name: string;
  /** Reducer function */
  reducer: (state: TState, action: TAction) => TState;
  /** Initial state */
  initialState: TState;
}

/**
 * Adapter that bridges the main NestJS LangGraph library to the enterprise functional API module
 *
 * This adapter follows the Adapter pattern to provide seamless integration between
 * the main library and the specialized functional API module without breaking existing APIs.
 *
 * Benefits:
 * - Maintains backward compatibility with existing functional APIs
 * - Delegates to enterprise-grade functional module when available
 * - Provides fallback to basic function composition when child module not installed
 * - Follows SOLID principles with single responsibility (bridge interface)
 */
@Injectable()
export class FunctionalApiAdapter
  extends BaseModuleAdapter<FunctionalApiConfig, FunctionalApiResult>
  implements
    ICreatableAdapter<FunctionalApiConfig, FunctionalApiResult>,
    IExecutableAdapter<any, any>
{
  protected readonly serviceName = 'functional-api';

  constructor(
    @Optional()
    @Inject('FunctionalApiService')
    private readonly functionalApiService?: any,
    @Optional()
    @Inject('PureFunctionManager')
    private readonly pureFunctionManager?: any
  ) {
    super();
  }

  /**
   * Create functional pipeline - delegates to enterprise module if available
   * Falls back to basic function composition when enterprise module not installed
   */
  async create(config: FunctionalApiConfig): Promise<FunctionalApiResult> {
    this.validateConfig(config);

    if (!config.enabled) {
      throw new Error('Functional API is not enabled');
    }

    // Try enterprise functional API module first
    if (this.functionalApiService) {
      this.logEnterpriseUsage('functional pipeline creation');
      try {
        return await this.functionalApiService.createPipeline(config);
      } catch (error) {
        this.logger.warn(
          'Enterprise functional API module failed, falling back to basic composition:',
          error
        );
        return this.createFallbackPipeline(config);
      }
    }

    // Try pure function manager
    if (this.pureFunctionManager) {
      this.logger.log('Using pure function manager via adapter');
      try {
        return await this.pureFunctionManager.create(config);
      } catch (error) {
        this.logger.warn(
          'Pure function manager failed, falling back to basic composition:',
          error
        );
        return this.createFallbackPipeline(config);
      }
    }

    // Fallback to basic function composition
    this.logFallbackUsage(
      'functional pipeline creation',
      'no enterprise services available'
    );
    return this.createFallbackPipeline(config);
  }

  /**
   * Execute functional pipeline with immutable operations
   */
  async execute(input: any, pipeline?: FunctionPipeline): Promise<any> {
    // Try enterprise functional API service first
    if (this.functionalApiService && pipeline) {
      this.logEnterpriseUsage('functional pipeline execution');
      try {
        return await this.functionalApiService.executeImmutable(
          input,
          pipeline
        );
      } catch (error) {
        this.logger.warn(
          'Enterprise functional execution failed, falling back to basic composition:',
          error
        );
        return this.executeFallbackPipeline(input, pipeline);
      }
    }

    // Try pure function manager
    if (this.pureFunctionManager && pipeline) {
      this.logger.log('Using pure function manager for execution');
      try {
        return await this.pureFunctionManager.execute(input, pipeline);
      } catch (error) {
        this.logger.warn(
          'Pure function manager execution failed, falling back to basic composition:',
          error
        );
        return this.executeFallbackPipeline(input, pipeline);
      }
    }

    // Fallback execution
    if (!pipeline) {
      throw new Error('Pipeline is required for functional execution');
    }

    this.logFallbackUsage('functional pipeline execution');
    return this.executeFallbackPipeline(input, pipeline);
  }

  /**
   * Create function pipeline from array of functions
   */
  async createPipeline(functions: PureFunction[]): Promise<FunctionPipeline> {
    if (this.functionalApiService) {
      this.logEnterpriseUsage('function pipeline composition');
      try {
        return await this.functionalApiService.createPipeline(functions);
      } catch (error) {
        return this.handleFallback(
          error as Error,
          'function pipeline composition'
        );
      }
    }

    if (this.pureFunctionManager) {
      try {
        return await this.pureFunctionManager.composePipeline(functions);
      } catch (error) {
        return this.handleFallback(
          error as Error,
          'function pipeline composition via manager'
        );
      }
    }

    // Basic pipeline creation
    return {
      functions,
      mode: 'sequential',
      config: {
        strictPurity: false,
        validateImmutability: false,
      },
    };
  }

  /**
   * Validate function purity
   */
  async validatePurity<TArgs extends readonly unknown[], TReturn>(
    fn: (...args: TArgs) => TReturn
  ): Promise<boolean> {
    if (this.functionalApiService) {
      try {
        return await this.functionalApiService.validatePurity(fn);
      } catch (error) {
        this.logger.warn('Failed to validate function purity:', error);
        return false;
      }
    }

    if (this.pureFunctionManager) {
      try {
        return await this.pureFunctionManager.isPure(fn);
      } catch (error) {
        this.logger.warn(
          'Failed to validate function purity via manager:',
          error
        );
        return false;
      }
    }

    // Basic purity check (very limited)
    return (
      !fn.toString().includes('this.') && !fn.toString().includes('console.')
    );
  }

  /**
   * Compose multiple reducers into a single reducer
   */
  async composeReducers<TState = any, TAction = any>(
    reducers: StateReducer<TState, TAction>[]
  ): Promise<StateReducer<TState, TAction>> {
    if (this.functionalApiService) {
      this.logEnterpriseUsage('reducer composition');
      try {
        return await this.functionalApiService.composeReducers(reducers);
      } catch (error) {
        return this.handleFallback(error as Error, 'reducer composition');
      }
    }

    if (this.pureFunctionManager) {
      try {
        return await this.pureFunctionManager.composeReducers(reducers);
      } catch (error) {
        return this.handleFallback(
          error as Error,
          'reducer composition via manager'
        );
      }
    }

    // Basic reducer composition
    return {
      name: 'composed-reducer',
      reducer: (state: TState, action: TAction) => {
        return reducers.reduce((currentState, reducer) => {
          return reducer.reducer(currentState, action);
        }, state);
      },
      initialState: reducers[0]?.initialState,
    };
  }

  /**
   * Create fallback functional pipeline
   */
  private createFallbackPipeline(
    config: FunctionalApiConfig
  ): FunctionalApiResult {
    return {
      pipelineId: `fallback-${Date.now()}`,
      functions: [],
      metadata: {
        isImmutable: false,
        enablesCaching: false,
        compositionDepth: 0,
      },
      createdAt: new Date(),
    };
  }

  /**
   * Execute pipeline with basic function composition
   */
  private async executeFallbackPipeline(
    input: any,
    pipeline: FunctionPipeline
  ): Promise<any> {
    if (pipeline.mode === 'parallel') {
      // Simple parallel execution (limited)
      const results = await Promise.all(
        pipeline.functions.map((fn) => fn.fn(input))
      );
      return results[results.length - 1]; // Return last result
    }

    // Sequential execution
    return pipeline.functions.reduce((current, fn) => fn.fn(current), input);
  }

  /**
   * Check if enterprise functional API module is available
   */
  isEnterpriseAvailable(): boolean {
    return !!this.functionalApiService;
  }

  /**
   * Check if pure function manager is available
   */
  isPureFunctionManagerAvailable(): boolean {
    return !!this.pureFunctionManager;
  }

  /**
   * Get adapter status for diagnostics
   */
  getAdapterStatus(): ExtendedAdapterStatus {
    const enterpriseAvailable = this.isEnterpriseAvailable();
    const pureFunctionManagerAvailable = this.isPureFunctionManagerAvailable();
    const fallbackMode = !enterpriseAvailable && !pureFunctionManagerAvailable;

    const capabilities = this.getBaseCapabilities();
    capabilities.push('basic_composition', 'sequential_execution');

    if (enterpriseAvailable) {
      capabilities.push(
        'enterprise_functional',
        'purity_validation',
        'immutability_checks',
        'advanced_caching',
        'parallel_composition',
        'reducer_composition'
      );
    }

    if (pureFunctionManagerAvailable) {
      capabilities.push('pure_function_manager', 'function_validation');
    }

    return {
      enterpriseAvailable,
      pureFunctionManagerAvailable,
      fallbackMode,
      capabilities,
    };
  }
}

/**
 * Factory function for backward compatibility
 */
export function createFunctionalApiProvider(): FunctionalApiAdapter {
  return new FunctionalApiAdapter();
}
