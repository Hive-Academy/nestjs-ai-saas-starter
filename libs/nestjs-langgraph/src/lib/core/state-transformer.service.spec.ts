import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { StateTransformerService } from './state-transformer.service';
import {
  StateAnnotationConfig,
  StateTransformer,
  StateTransformationOptions,
  StateMergeOptions,
  EnhancedWorkflowState,
} from '../interfaces/state-management.interface';

describe('StateTransformerService', () => {
  let service: StateTransformerService;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [StateTransformerService],
    }).compile();

    service = module.get<StateTransformerService>(StateTransformerService);

    // Replace the logger instance directly
    (service as any).logger = mockLogger;
  });

  afterEach(() => {
    service.clearAnnotations();
  });

  describe('getBuiltInChannels', () => {
    it('should return all built-in channel definitions', () => {
      const channels = service.getBuiltInChannels();

      expect(channels).toHaveProperty('messages');
      expect(channels).toHaveProperty('confidence');
      expect(channels).toHaveProperty('metadata');
      expect(channels).toHaveProperty('error');
      expect(channels).toHaveProperty('status');
      expect(channels).toHaveProperty('currentNode');
      expect(channels).toHaveProperty('completedNodes');
      expect(channels).toHaveProperty('timestamps');
    });

    it('should have proper reducers for built-in channels', () => {
      const channels = service.getBuiltInChannels();

      // Test messages reducer
      const messagesReducer = channels.messages.reducer!;
      const currentMessages = [new HumanMessage('Hello')];
      const newMessages = [new AIMessage('Hi there')];
      const result = messagesReducer(currentMessages, newMessages);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(currentMessages[0]);
      expect(result[1]).toBe(newMessages[0]);

      // Test confidence reducer (should take max)
      const confidenceReducer = channels.confidence.reducer!;
      expect(confidenceReducer(0.5, 0.8)).toBe(0.8);
      expect(confidenceReducer(0.9, 0.6)).toBe(0.9);

      // Test metadata reducer (should merge)
      const metadataReducer = channels.metadata.reducer!;
      const currentMeta = { a: 1, b: 2 };
      const updateMeta = { b: 3, c: 4 };
      const mergedMeta = metadataReducer(currentMeta, updateMeta);
      expect(mergedMeta).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should have default value factories', () => {
      const channels = service.getBuiltInChannels();

      expect(channels.messages.default!()).toEqual([]);
      expect(channels.confidence.default!()).toBe(1.0);
      expect(channels.metadata.default!()).toEqual({});
      expect(channels.status.default!()).toBe('pending');
      expect(channels.completedNodes.default!()).toEqual([]);
    });
  });

  describe('createStateAnnotation', () => {
    it('should create a basic state annotation', () => {
      interface TestState {
        id: string;
        value: number;
      }

      const config: StateAnnotationConfig<TestState> = {
        name: 'test-state',
        channels: {
          id: {
            reducer: (current, update) => update ?? current,
            default: () => 'default-id',
          },
          value: {
            reducer: (current, update) => current + update,
            default: () => 0,
          },
        },
      };

      const annotation = service.createStateAnnotation(config);

      expect(annotation.name).toBe('test-state');
      expect(annotation.spec).toHaveProperty('id');
      expect(annotation.spec).toHaveProperty('value');
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Creating state annotation: test-state'
      );
    });

    it('should create initial state with default values', () => {
      interface TestState {
        name: string;
        count: number;
      }

      const config: StateAnnotationConfig<TestState> = {
        name: 'test-state',
        channels: {
          name: {
            default: () => 'test',
          },
          count: {
            default: () => 42,
          },
        },
      };

      const annotation = service.createStateAnnotation(config);
      const initialState = annotation.createInitialState();

      expect(initialState.name).toBe('test');
      expect(initialState.count).toBe(42);
      // Should also include built-in channels
      expect(initialState).toHaveProperty('messages');
      expect(initialState).toHaveProperty('confidence');
    });

    it('should apply reducers correctly', () => {
      interface TestState {
        counter: number;
        items: string[];
      }

      const config: StateAnnotationConfig<TestState> = {
        name: 'test-state',
        channels: {
          counter: {
            reducer: (current, update) => current + update,
            default: () => 0,
          },
          items: {
            reducer: (current, update) => [...current, ...update],
            default: () => [],
          },
        },
      };

      const annotation = service.createStateAnnotation(config);
      const currentState = annotation.createInitialState();
      currentState.counter = 5;
      currentState.items = ['a', 'b'];

      const update = { counter: 3, items: ['c', 'd'] };
      const result = annotation.applyReducers(currentState, update);

      expect(result.counter).toBe(8); // 5 + 3
      expect(result.items).toEqual(['a', 'b', 'c', 'd']);
    });

    it('should register validation schema', () => {
      interface TestState {
        email: string;
        age: number;
      }

      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(0).max(120),
      });

      const config: StateAnnotationConfig<TestState> = {
        name: 'test-state',
        channels: {
          email: { default: () => '' },
          age: { default: () => 0 },
        },
        validation: schema,
      };

      service.createStateAnnotation(config);

      // Test validation
      const validState = { email: 'test@example.com', age: 25 };
      const validResult = service.validateState(validState, 'test-state');
      expect(validResult.success).toBe(true);

      const invalidState = { email: 'invalid-email', age: -5 };
      const invalidResult = service.validateState(invalidState, 'test-state');
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error).toBeDefined();
    });
  });

  describe('validateState', () => {
    it('should return success for valid state', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().positive(),
      });

      service['stateValidators'].set('test-schema', schema);

      const validState = { name: 'John', age: 30 };
      const result = service.validateState(validState, 'test-schema');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validState);
    });

    it('should return error for invalid state', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().positive(),
      });

      service['stateValidators'].set('test-schema', schema);

      const invalidState = { name: 123, age: -5 };
      const result = service.validateState(invalidState, 'test-schema');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toBe('State validation failed');
      expect(result.error!.issues).toHaveLength(2);
    });

    it('should return success when no schema is found', () => {
      const state = { anything: 'goes' };
      const result = service.validateState(state, 'non-existent-schema');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(state);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No validation schema found for: non-existent-schema'
      );
    });
  });

  describe('transformState', () => {
    it('should transform state using provided transformer', () => {
      interface SourceState {
        firstName: string;
        lastName: string;
      }

      interface TargetState {
        fullName: string;
      }

      const transformer: StateTransformer<SourceState, TargetState> = {
        transform: (state) => ({
          fullName: `${state.firstName} ${state.lastName}`,
        }),
        canTransform: (state) => Boolean(state.firstName && state.lastName),
      };

      const sourceState = { firstName: 'John', lastName: 'Doe' };
      const result = service.transformState(sourceState, transformer);

      expect(result.fullName).toBe('John Doe');
    });

    it('should validate transformed state when requested', () => {
      interface SourceState {
        value: number;
      }

      interface TargetState {
        doubled: number;
      }

      const transformer: StateTransformer<SourceState, TargetState> = {
        transform: (state) => ({ doubled: state.value * 2 }),
        canTransform: () => true,
      };

      const targetSchema = z.object({
        doubled: z.number().positive(),
      });

      const sourceState = { value: 5 };
      const options: StateTransformationOptions = {
        validate: true,
        targetSchema,
      };

      const result = service.transformState(sourceState, transformer, options);
      expect(result.doubled).toBe(10);
    });

    it('should throw error when transformation is not possible', () => {
      const transformer: StateTransformer<any, any> = {
        transform: (state) => state,
        canTransform: () => false,
      };

      expect(() => {
        service.transformState({}, transformer);
      }).toThrow('State transformation not possible with current state');
    });

    it('should throw error when validation fails', () => {
      const transformer: StateTransformer<any, any> = {
        transform: () => ({ invalid: 'data' }),
        canTransform: () => true,
      };

      const targetSchema = z.object({
        valid: z.string(),
      });

      const options: StateTransformationOptions = {
        validate: true,
        targetSchema,
      };

      expect(() => {
        service.transformState({}, transformer, options);
      }).toThrow('Transformed state validation failed');
    });
  });

  describe('mergeStates', () => {
    it('should merge states with overwrite strategy', () => {
      const baseState = { a: 1, b: 2, c: 3 };
      const updateState = { b: 20, d: 4 };

      const result = service.mergeStates(baseState, updateState);

      expect(result).toEqual({ a: 1, b: 20, c: 3, d: 4 });
    });

    it('should preserve base state values with preserve strategy', () => {
      const baseState = { a: 1, b: 2 };
      const updateState = { b: 20, c: 3 };
      const options: StateMergeOptions = { conflictStrategy: 'preserve' };

      const result = service.mergeStates(baseState, updateState, options);

      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should merge objects with merge strategy', () => {
      const baseState = {
        user: { name: 'John', age: 30 },
        settings: { theme: 'dark' },
      };
      const updateState = {
        user: { age: 31, city: 'NYC' },
        settings: { language: 'en' },
      };
      const options: StateMergeOptions = { conflictStrategy: 'merge' };

      const result = service.mergeStates(baseState, updateState, options);

      expect(result.user).toEqual({ name: 'John', age: 31, city: 'NYC' });
      expect(result.settings).toEqual({ theme: 'dark', language: 'en' });
    });

    it('should throw error with error strategy on conflicts', () => {
      const baseState = { a: 1 };
      const updateState = { a: 2 };
      const options: StateMergeOptions = { conflictStrategy: 'error' };

      expect(() => {
        service.mergeStates(baseState, updateState, options);
      }).toThrow("Merge conflict for field 'a': 1 vs 2");
    });

    it('should exclude specified fields', () => {
      const baseState = { a: 1, b: 2, c: 3 };
      const updateState = { a: 10, b: 20, c: 30 };
      const options: StateMergeOptions = { excludeFields: ['b'] };

      const result = service.mergeStates(baseState, updateState, options);

      expect(result).toEqual({ a: 10, b: 2, c: 30 });
    });

    it('should force overwrite specified fields', () => {
      const baseState = { a: 1, b: 2 };
      const updateState = { a: 10, b: 20 };
      const options: StateMergeOptions = {
        conflictStrategy: 'preserve',
        forceOverwrite: ['a'],
      };

      const result = service.mergeStates(baseState, updateState, options);

      expect(result).toEqual({ a: 10, b: 2 });
    });
  });

  describe('createEnhancedWorkflowState', () => {
    it('should create default enhanced workflow state', () => {
      const state = service.createEnhancedWorkflowState();

      expect(state.executionId).toMatch(/^exec_\d+_[a-z0-9]+$/);
      expect(state.status).toBe('pending');
      expect(state.completedNodes).toEqual([]);
      expect(state.confidence).toBe(1.0);
      expect(state.messages).toEqual([]);
      expect(state.retryCount).toBe(0);
      expect(state.timestamps.started).toBeInstanceOf(Date);
      expect(state.metadata).toEqual({});
      expect(state.customData).toEqual({});
    });

    it('should apply overrides to default state', () => {
      const overrides: Partial<EnhancedWorkflowState> = {
        status: 'active',
        confidence: 0.8,
        threadId: 'test-thread',
        retryCount: 2,
      };

      const state = service.createEnhancedWorkflowState(overrides);

      expect(state.status).toBe('active');
      expect(state.confidence).toBe(0.8);
      expect(state.threadId).toBe('test-thread');
      expect(state.retryCount).toBe(2);
      // Should still have defaults for non-overridden fields
      expect(state.completedNodes).toEqual([]);
      expect(state.messages).toEqual([]);
    });
  });

  describe('registerStateTransformer', () => {
    it('should register and retrieve state transformer', () => {
      const transformer: StateTransformer<any, any> = {
        transform: (state) => state,
        canTransform: () => true,
      };

      service.registerStateTransformer('test-transformer', transformer);

      const retrieved = service.getStateTransformer('test-transformer');
      expect(retrieved).toBe(transformer);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Registered state transformer: test-transformer'
      );
    });

    it('should return undefined for non-existent transformer', () => {
      const result = service.getStateTransformer('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getStateAnnotation', () => {
    it('should retrieve previously created annotation', () => {
      const config: StateAnnotationConfig<any> = {
        name: 'test-annotation',
        channels: {
          test: { default: () => 'value' },
        },
      };

      const created = service.createStateAnnotation(config);
      const retrieved = service.getStateAnnotation('test-annotation');

      expect(retrieved).toBe(created);
    });

    it('should return undefined for non-existent annotation', () => {
      const result = service.getStateAnnotation('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getRegisteredAnnotations', () => {
    it('should return list of registered annotation names', () => {
      service.createStateAnnotation({
        name: 'annotation1',
        channels: { test: { default: () => 'value' } },
      });

      service.createStateAnnotation({
        name: 'annotation2',
        channels: { test: { default: () => 'value' } },
      });

      const names = service.getRegisteredAnnotations();
      expect(names).toContain('annotation1');
      expect(names).toContain('annotation2');
      expect(names).toHaveLength(2);
    });

    it('should return empty array when no annotations registered', () => {
      const names = service.getRegisteredAnnotations();
      expect(names).toEqual([]);
    });
  });

  describe('clearAnnotations', () => {
    it('should clear all registered annotations', () => {
      service.createStateAnnotation({
        name: 'test-annotation',
        channels: { test: { default: () => 'value' } },
      });

      expect(service.getRegisteredAnnotations()).toHaveLength(1);

      service.clearAnnotations();

      expect(service.getRegisteredAnnotations()).toHaveLength(0);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'All state annotations cleared'
      );
    });
  });
});
