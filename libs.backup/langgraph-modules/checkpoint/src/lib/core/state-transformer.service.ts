import { Injectable, Logger } from '@nestjs/common';
import type { BaseMessage } from '@langchain/core/messages';
import { z } from 'zod';
import type {
  StateAnnotationConfig,
  StateAnnotation,
  ChannelDefinition,
  ReducerFunction,
  ValidationResult,
  StateTransformer,
  StateTransformationOptions,
  StateMergeOptions,
  BuiltInChannels,
  EnhancedWorkflowState,
} from '../interfaces/state-management.interface';

/**
 * Service for enhanced state management with reducers, validation, and transformations
 */
@Injectable()
export class StateTransformerService {
  private readonly logger = new Logger(StateTransformerService.name);
  private readonly stateAnnotations = new Map<
    string,
    StateAnnotation<unknown>
  >();
  private readonly stateValidators = new Map<string, z.ZodSchema>();
  private readonly stateReducers = new Map<string, ReducerFunction>();
  private readonly stateTransformers = new Map<
    string,
    StateTransformer<unknown, unknown>
  >();

  /**
   * Get built-in channel definitions for common use cases
   */
  public getBuiltInChannels(): BuiltInChannels {
    return {
      messages: {
        reducer: (current: BaseMessage[], update: BaseMessage[]) => [
          ...current,
          ...update,
        ],
        default: () => [],
        description: 'Message history for the workflow',
        required: false,
      },
      confidence: {
        reducer: (current: number, update: number) =>
          Math.max(current ?? 0, update ?? 0),
        default: () => 1.0,
        validator: (value: number) => value >= 0 && value <= 1,
        description: 'Confidence score for workflow decisions',
        required: false,
      },
      metadata: {
        reducer: (
          current: Record<string, unknown>,
          update: Record<string, unknown>
        ) => ({
          ...current,
          ...update,
        }),
        default: () => ({}),
        description: 'Metadata storage for workflow context',
        required: false,
      },
      error: {
        reducer: (current: Error | null, update: Error | null) =>
          update ?? current,
        default: () => null,
        description: 'Error information if workflow fails',
        required: false,
      },
      status: {
        reducer: (current, update) => update ?? current,
        default: () => 'pending' as const,
        validator: (value) =>
          [
            'pending',
            'active',
            'paused',
            'completed',
            'failed',
            'cancelled',
          ].includes(value),
        description: 'Current execution status',
        required: true,
      },
      currentNode: {
        reducer: (current: string | null, update: string | null) =>
          update ?? current,
        default: () => null,
        description: 'Currently executing node',
        required: false,
      },
      completedNodes: {
        reducer: (current: string[], update: string[]) => [
          ...new Set([...current, ...update]),
        ],
        default: () => [],
        description: 'List of completed nodes',
        required: false,
      },
      timestamps: {
        reducer: (current, update) => ({ ...current, ...update }),
        default: () => ({ started: new Date() }),
        description: 'Execution timestamps',
        required: true,
      },
    };
  }

  /**
   * Create state annotation with comprehensive configuration
   */
  public createStateAnnotation<T>(
    config: StateAnnotationConfig<T>
  ): StateAnnotation<T> {
    this.logger.log(`Creating state annotation: ${config.name}`);

    // Register validators and reducers
    if (config.validation) {
      this.stateValidators.set(config.name, config.validation);
    }

    if (config.reducers) {
      Object.entries(config.reducers).forEach(([key, reducer]) => {
        this.stateReducers.set(
          `${config.name}.${key}`,
          reducer as ReducerFunction
        );
      });
    }

    // Get built-in channels
    const builtInChannels = this.getBuiltInChannels();

    // Merge built-in channels with custom channels
    const allChannels = {
      ...builtInChannels,
      ...config.channels,
    };

    // Create LangGraph annotation (for future use)
    // const langGraphAnnotation = Annotation.Root(
    //   Object.entries(allChannels).reduce((acc, [key, channelDef]) => {
    //     acc[key] = Annotation({
    //       reducer: channelDef.reducer as unknown,
    //       default: channelDef.default as unknown,
    //     });
    //     return acc;
    //   }, {} as unknown)
    // );

    // Create our enhanced state annotation
    const stateAnnotation: StateAnnotation<T> = {
      spec: allChannels as Record<keyof T, ChannelDefinition>,
      name: config.name,
      validation: config.validation,

      createInitialState: () => {
        const initialState = {} as T;
        Object.entries(allChannels).forEach(([key, channelDef]) => {
          if (channelDef.default) {
            (initialState as Record<string, unknown>)[key] =
              channelDef.default();
          }
        });
        return initialState;
      },

      validateState: (state: T) => this.validateState(state, config.name),

      applyReducers: (current: T, update: Partial<T>) => {
        const result = { ...current };

        Object.entries(update).forEach(([key, value]) => {
          const channelDef = allChannels[key as keyof typeof allChannels];
          if (channelDef?.reducer && value !== undefined) {
            (result as Record<string, unknown>)[key] = channelDef.reducer(
              (current as Record<string, unknown>)[key],
              value
            );
          } else if (value !== undefined) {
            (result as Record<string, unknown>)[key] = value;
          }
        });

        return result;
      },
    };

    // Store the annotation (type cast for storage compatibility)
    this.stateAnnotations.set(
      config.name,
      stateAnnotation as StateAnnotation<unknown>
    );

    this.logger.log(
      `State annotation created: ${config.name} with ${
        Object.keys(allChannels).length
      } channels`
    );
    return stateAnnotation;
  }

  /**
   * Get a previously created state annotation
   */
  public getStateAnnotation<T>(name: string): StateAnnotation<T> | undefined {
    return this.stateAnnotations.get(name) as StateAnnotation<T> | undefined;
  }

  /**
   * Transform state between different formats
   */
  public transformState<TFrom, TTo>(
    state: TFrom,
    transformer: StateTransformer<TFrom, TTo>,
    options: StateTransformationOptions = {}
  ): TTo {
    this.logger.debug('Transforming state', { options });

    // Check if transformation is possible
    if (!transformer.canTransform(state)) {
      throw new Error('State transformation not possible with current state');
    }

    // Perform transformation
    const transformedState = transformer.transform(state);

    // Validate if requested
    if (options.validate && options.targetSchema) {
      const validationResult = options.targetSchema.safeParse(transformedState);
      if (!validationResult.success) {
        throw new Error(
          `Transformed state validation failed: ${validationResult.error.message}`
        );
      }
    }

    this.logger.debug('State transformation completed');
    return transformedState;
  }

  /**
   * Validate state using Zod schemas
   */
  public validateState<T>(state: T, schemaName: string): ValidationResult<T> {
    const schema = this.stateValidators.get(schemaName);
    if (!schema) {
      this.logger.warn(`No validation schema found for: ${schemaName}`);
      return { success: true, data: state };
    }

    const result = schema.safeParse(state);
    if (!result.success) {
      this.logger.error(`State validation failed for ${schemaName}`, {
        errors: result.error.issues,
      });

      return {
        success: false,
        error: {
          message: 'State validation failed',
          issues: result.error.issues,
          path: result.error.issues.map((issue) => issue.path.join('.')),
        },
      };
    }

    return { success: true, data: result.data };
  }

  /**
   * Merge two states using specified options
   */
  public mergeStates<T>(
    baseState: T,
    updateState: Partial<T>,
    options: StateMergeOptions = {}
  ): T {
    this.logger.debug('Merging states', { options });

    const result = { ...baseState };
    const {
      conflictStrategy = 'overwrite',
      excludeFields = [],
      forceOverwrite = [],
    } = options;

    Object.entries(updateState).forEach(([key, value]) => {
      // Skip excluded fields
      if (excludeFields.includes(key)) {
        return;
      }

      // Force overwrite if specified
      if (forceOverwrite.includes(key)) {
        (result as Record<string, unknown>)[key] = value;
        return;
      }

      // Handle conflicts based on strategy
      const currentValue = (baseState as Record<string, unknown>)[key];
      const hasConflict =
        currentValue !== undefined &&
        value !== undefined &&
        currentValue !== value;

      if (!hasConflict) {
        (result as Record<string, unknown>)[key] = value;
        return;
      }

      switch (conflictStrategy) {
        case 'overwrite':
          (result as Record<string, unknown>)[key] = value;
          break;
        case 'preserve':
          // Keep current value
          break;
        case 'merge':
          if (
            typeof currentValue === 'object' &&
            typeof value === 'object' &&
            currentValue !== null &&
            value !== null &&
            !Array.isArray(currentValue)
          ) {
            (result as Record<string, unknown>)[key] = {
              ...(currentValue as Record<string, unknown>),
              ...(value as Record<string, unknown>),
            };
          } else {
            (result as Record<string, unknown>)[key] = value;
          }
          break;
        case 'error':
          throw new Error(
            `Merge conflict for field '${key}': ${currentValue} vs ${value}`
          );
        default:
          (result as Record<string, unknown>)[key] = value;
      }
    });

    // Validate merged result if requested
    if (options.validate) {
      // This would require the schema name, which we don't have here
      // In a real implementation, we might need to pass the schema or annotation name
      this.logger.debug(
        'Validation requested but no schema provided for merged state'
      );
    }

    this.logger.debug('State merge completed');
    return result;
  }

  /**
   * Register a custom state transformer
   */
  public registerStateTransformer<TFrom, TTo>(
    name: string,
    transformer: StateTransformer<TFrom, TTo>
  ): void {
    this.stateTransformers.set(
      name,
      transformer as StateTransformer<unknown, unknown>
    );
    this.logger.log(`Registered state transformer: ${name}`);
  }

  /**
   * Get a registered state transformer
   */
  public getStateTransformer<TFrom, TTo>(
    name: string
  ): StateTransformer<TFrom, TTo> | undefined {
    return this.stateTransformers.get(name) as
      | StateTransformer<TFrom, TTo>
      | undefined;
  }

  /**
   * Create a default enhanced workflow state
   */
  public createEnhancedWorkflowState(
    overrides: Partial<EnhancedWorkflowState> = {}
  ): EnhancedWorkflowState {
    const defaultState: EnhancedWorkflowState = {
      executionId: `exec_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 11)}`,
      status: 'pending',
      completedNodes: [],
      confidence: 1.0,
      messages: [],
      retryCount: 0,
      timestamps: {
        started: new Date(),
      },
      metadata: {},
      customData: {},
    };

    return { ...defaultState, ...overrides };
  }

  /**
   * Apply reducers to a state update
   */
  public applyStateReducers<T>(
    annotationName: string,
    currentState: T,
    update: Partial<T>
  ): T {
    const annotation = this.stateAnnotations.get(annotationName);
    if (!annotation) {
      this.logger.warn(`No state annotation found: ${annotationName}`);
      return { ...currentState, ...update };
    }

    return annotation.applyReducers(currentState, update) as T;
  }

  /**
   * Get all registered state annotations
   */
  public getRegisteredAnnotations(): string[] {
    return Array.from(this.stateAnnotations.keys());
  }

  /**
   * Clear all registered annotations (useful for testing)
   */
  public clearAnnotations(): void {
    this.stateAnnotations.clear();
    this.stateValidators.clear();
    this.stateReducers.clear();
    this.stateTransformers.clear();
    this.logger.log('All state annotations cleared');
  }
}
