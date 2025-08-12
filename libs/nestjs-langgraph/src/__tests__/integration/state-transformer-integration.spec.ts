import { Test, TestingModule } from '@nestjs/testing';
import { z } from 'zod';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { NestjsLanggraphModule } from '../../lib/nestjs-langgraph.module';
import { StateTransformerService } from '../../lib/core/state-transformer.service';
import {
  StateAnnotationConfig,
  EnhancedWorkflowState,
} from '../../lib/interfaces/state-management.interface';

describe('StateTransformerService Integration', () => {
  let module: TestingModule;
  let stateTransformerService: StateTransformerService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [StateTransformerService],
    }).compile();

    stateTransformerService = module.get<StateTransformerService>(
      StateTransformerService
    );
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Module Integration', () => {
    it('should be defined and injectable', () => {
      expect(stateTransformerService).toBeDefined();
      expect(stateTransformerService).toBeInstanceOf(StateTransformerService);
    });

    it('should have access to built-in channels', () => {
      const builtInChannels = stateTransformerService.getBuiltInChannels();

      expect(builtInChannels).toHaveProperty('messages');
      expect(builtInChannels).toHaveProperty('confidence');
      expect(builtInChannels).toHaveProperty('metadata');
      expect(builtInChannels).toHaveProperty('status');
      expect(builtInChannels).toHaveProperty('timestamps');
    });
  });

  describe('End-to-End State Management', () => {
    it('should create and manage a complete workflow state', () => {
      // Define a custom state interface
      interface CustomWorkflowState extends EnhancedWorkflowState {
        taskProgress: number;
        userInput: string;
        results: string[];
      }

      // Create state annotation configuration
      const config: StateAnnotationConfig<CustomWorkflowState> = {
        name: 'custom-workflow-state',
        channels: {
          taskProgress: {
            reducer: (current, update) => Math.max(current || 0, update || 0),
            default: () => 0,
            validator: (value) => value >= 0 && value <= 100,
          },
          userInput: {
            reducer: (current, update) => update ?? current,
            default: () => '',
          },
          results: {
            reducer: (current, update) => [...current, ...update],
            default: () => [],
          },
        },
        validation: z
          .object({
            taskProgress: z.number().min(0).max(100),
            userInput: z.string(),
            results: z.array(z.string()),
          })
          .partial(),
      };

      // Create the state annotation
      const annotation = stateTransformerService.createStateAnnotation(config);

      expect(annotation).toBeDefined();
      expect(annotation.name).toBe('custom-workflow-state');

      // Create initial state
      const initialState = annotation.createInitialState();

      expect(initialState.taskProgress).toBe(0);
      expect(initialState.userInput).toBe('');
      expect(initialState.results).toEqual([]);
      expect(initialState.messages).toEqual([]); // Built-in channel
      expect(initialState.confidence).toBe(1.0); // Built-in channel

      // Apply state updates using reducers
      const update1 = {
        taskProgress: 25,
        userInput: 'Hello world',
        messages: [new HumanMessage('User input received')],
      };

      const state1 = annotation.applyReducers(initialState, update1);

      expect(state1.taskProgress).toBe(25);
      expect(state1.userInput).toBe('Hello world');
      expect(state1.messages).toHaveLength(1);

      // Apply another update to test reducer behavior
      const update2 = {
        taskProgress: 50, // Should take max (50 > 25)
        results: ['result1', 'result2'], // Should append to array
        messages: [new AIMessage('Processing complete')], // Should append to messages
      };

      const state2 = annotation.applyReducers(state1, update2);

      expect(state2.taskProgress).toBe(50); // Max of 25 and 50
      expect(state2.results).toEqual(['result1', 'result2']);
      expect(state2.messages).toHaveLength(2); // Original + new message
      expect(state2.userInput).toBe('Hello world'); // Should remain unchanged

      // Validate the final state
      const validationResult = annotation.validateState(state2);
      expect(validationResult.success).toBe(true);
    });

    it('should handle state validation errors', () => {
      interface ValidatedState {
        email: string;
        age: number;
      }

      const config: StateAnnotationConfig<ValidatedState> = {
        name: 'validated-state',
        channels: {
          email: { default: () => '' },
          age: { default: () => 0 },
        },
        validation: z.object({
          email: z.string().email(),
          age: z.number().min(0).max(120),
        }),
      };

      const annotation = stateTransformerService.createStateAnnotation(config);

      // Test with invalid data
      const invalidState = {
        email: 'not-an-email',
        age: -5,
      } as ValidatedState;

      const validationResult = annotation.validateState(invalidState);

      expect(validationResult.success).toBe(false);
      expect(validationResult.error).toBeDefined();
      expect(validationResult.error!.issues).toHaveLength(2);
    });

    it('should create enhanced workflow state with defaults', () => {
      const state = stateTransformerService.createEnhancedWorkflowState({
        threadId: 'test-thread-123',
        status: 'active',
        confidence: 0.85,
      });

      expect(state.threadId).toBe('test-thread-123');
      expect(state.status).toBe('active');
      expect(state.confidence).toBe(0.85);
      expect(state.executionId).toMatch(/^exec_\d+_[a-z0-9]+$/);
      expect(state.messages).toEqual([]);
      expect(state.completedNodes).toEqual([]);
      expect(state.retryCount).toBe(0);
      expect(state.timestamps.started).toBeInstanceOf(Date);
    });

    it('should merge states with different strategies', () => {
      const baseState = {
        user: { name: 'John', age: 30 },
        settings: { theme: 'dark', language: 'en' },
        count: 5,
      };

      const updateState = {
        user: { age: 31, city: 'NYC' },
        settings: { theme: 'light' },
        count: 10,
      };

      // Test merge strategy
      const mergedState = stateTransformerService.mergeStates(
        baseState,
        updateState,
        { conflictStrategy: 'merge' }
      );

      expect(mergedState.user).toEqual({
        name: 'John', // preserved
        age: 31, // updated
        city: 'NYC', // added
      });
      expect(mergedState.settings).toEqual({
        theme: 'light', // updated
        language: 'en', // preserved
      });
      expect(mergedState.count).toBe(10); // overwritten

      // Test preserve strategy - should preserve original values when there are conflicts
      const preservedState = stateTransformerService.mergeStates(
        baseState,
        updateState,
        { conflictStrategy: 'preserve' }
      );

      expect(preservedState.user).toEqual({
        name: 'John',
        age: 30, // preserved original
      });
      expect(preservedState.settings).toEqual({
        theme: 'dark', // preserved original
        language: 'en', // preserved original
      });
      expect(preservedState.count).toBe(5); // preserved original
    });
  });

  describe('State Transformer Registration', () => {
    it('should register and use custom state transformers', () => {
      interface SourceState {
        firstName: string;
        lastName: string;
        age: number;
      }

      interface TargetState {
        fullName: string;
        isAdult: boolean;
      }

      const transformer = {
        transform: (state: SourceState): TargetState => ({
          fullName: `${state.firstName} ${state.lastName}`,
          isAdult: state.age >= 18,
        }),
        canTransform: (state: SourceState) =>
          Boolean(
            state.firstName && state.lastName && typeof state.age === 'number'
          ),
      };

      // Register the transformer
      stateTransformerService.registerStateTransformer(
        'person-transformer',
        transformer
      );

      // Use the transformer
      const sourceState: SourceState = {
        firstName: 'Jane',
        lastName: 'Doe',
        age: 25,
      };

      const transformedState = stateTransformerService.transformState(
        sourceState,
        transformer
      );

      expect(transformedState.fullName).toBe('Jane Doe');
      expect(transformedState.isAdult).toBe(true);

      // Verify transformer was registered
      const retrievedTransformer =
        stateTransformerService.getStateTransformer('person-transformer');
      expect(retrievedTransformer).toBe(transformer);
    });
  });

  describe('State Annotation Management', () => {
    it('should track registered annotations', () => {
      const initialCount =
        stateTransformerService.getRegisteredAnnotations().length;

      // Create a new annotation
      stateTransformerService.createStateAnnotation({
        name: 'tracking-test',
        channels: {
          value: { default: () => 'test' },
        },
      });

      const annotations = stateTransformerService.getRegisteredAnnotations();
      expect(annotations).toContain('tracking-test');
      expect(annotations.length).toBe(initialCount + 1);

      // Retrieve the annotation
      const annotation =
        stateTransformerService.getStateAnnotation('tracking-test');
      expect(annotation).toBeDefined();
      expect(annotation?.name).toBe('tracking-test');
    });
  });
});
