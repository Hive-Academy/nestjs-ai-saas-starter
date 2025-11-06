import { DynamicModule, Global, Module, Provider, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ApprovalChainService } from './services/approval-chain.service';
import { ApprovalProcessingService } from './services/approval-processing.service';
import { ApprovalTimeoutService } from './services/approval-timeout.service';
import { ApprovalStreamingService } from './services/approval-streaming.service';
import { ConfidenceEvaluatorService } from './services/confidence-evaluator.service';
import { FeedbackProcessorService } from './services/feedback-processor.service';
import { HitlNotificationService } from './services/hitl-notification.service';
import { HitlTimeoutService } from './services/hitl-timeout.service';
import { HumanApprovalService } from './services/human-approval.service';
import { UserInterruptionService } from './services/user-interruption.service';
import { HitlMemoryLearningService } from './services/hitl-memory-learning.service';
import { HitlCheckpointService } from './services/hitl-checkpoint.service';
import { HitlValidationService } from './services/hitl-validation.service';
import { HitlRecoveryService } from './services/hitl-recovery.service';
import { HitlApprovalRequestService } from './services/hitl-approval-request.service';
// Phase 1a SOLID Refactoring - New services
import { ApproverIntelligenceService } from './services/approver-intelligence.service';
import { ApprovalOutcomeService } from './services/approval-outcome.service';
// Phase 1b SOLID Refactoring - Historical search service
import { ApprovalHistorySearchService } from './services/approval-history-search.service';
// Decorator Support Service - Extracted from decorator (2025-01-11)
import { ApprovalEvaluatorService } from './services/approval-evaluator.service';
// Phase 5: Neo4j approval state repository (TASK_2025_032)
import { ApprovalStateRepository } from './repositories/approval-state.repository';
import { setHitlConfig } from './utils/hitl-config.accessor';

// Import interfaces only - adapters moved to application layer
import { IHitlStorageService } from './interfaces/hitl-storage.interface';
import { IUserInterruptionStorageService } from './interfaces/user-interruption.interface';

import type {
  HitlModuleAsyncOptions,
  HitlModuleOptions,
  HitlOptionsFactory,
} from './interfaces/hitl.interface';

import { DEFAULT_HITL_CONFIG, HITL_CONFIG } from './constants';

/**
 * Enhanced NestJS HITL Module with Adapter Pattern Support
 *
 * **Phase 5 Migration** (TASK_2025_032):
 * - Approval state now stored in Neo4j via ApprovalStateRepository
 * - ICheckpointAdapter is NO LONGER REQUIRED for approval storage
 * - LangGraph handles workflow checkpoints automatically
 * - Zero breaking changes for existing configurations
 *
 * Provides:
 * - Adapter-based storage integration for approval persistence
 * - Human approval orchestration services
 * - Neo4j-based approval state persistence (Phase 5)
 * - 100% backward compatibility with existing configurations
 * - Extensibility through custom adapter injection
 */
@Global()
@Module({})
export class HitlModule {
  /**
   * Configure module with synchronous options
   * Supports both legacy configuration (backward compatible) and new adapter injection
   */
  static forRoot(options: HitlModuleOptions = {}): DynamicModule {
    const config = { ...DEFAULT_HITL_CONFIG, ...options };

    // Store config for decorator access
    setHitlConfig(config);

    // Validate adapter configuration if provided
    this.validateAdapters(options);

    // Create adapter providers
    const adapterProviders = this.createAdapterProviders(options);

    return {
      module: HitlModule,
      imports: [ConfigModule], // EventEmitter provided globally by app.module
      providers: [
        // Configuration provider
        {
          provide: HITL_CONFIG,
          useValue: config,
        },
        // Adapter providers (conditional)
        ...adapterProviders,
        // Phase 5: Neo4j approval state repository (TASK_2025_032)
        ApprovalStateRepository, // Neo4j-based approval state persistence
        // Core services (order: dependencies first, orchestrator last)
        // Phase 1a: New specialized services (SOLID refactoring)
        ApproverIntelligenceService, // Approver selection using memory patterns
        ApprovalOutcomeService, // Outcome tracking and memory learning
        // Phase 1b: Historical search service
        ApprovalHistorySearchService, // Historical approval pattern search
        // Decorator Support Service - Extracted from decorator (2025-01-11)
        ApprovalEvaluatorService, // Centralized approval decision logic for decorators
        // Processing & helper services
        ApprovalProcessingService, // Depends on ApproverIntelligence & ApprovalOutcome
        ApprovalTimeoutService,
        ApprovalStreamingService,
        UserInterruptionService,
        ConfidenceEvaluatorService,
        ApprovalChainService,
        FeedbackProcessorService,
        HitlNotificationService,
        HitlTimeoutService,
        // New specialized HITL services
        HitlMemoryLearningService,
        HitlCheckpointService, // Now uses ApprovalStateRepository (Phase 5)
        HitlValidationService,
        HitlRecoveryService,
        HitlApprovalRequestService,
        // Orchestrator service that depends on the above
        HumanApprovalService,
        // Legacy provider for backward compatibility
        {
          provide: 'HITL_OPTIONS',
          useValue: config,
        },
      ],
      exports: [
        HumanApprovalService,
        ApprovalProcessingService,
        // Phase 1a: Export new SOLID refactored services
        ApproverIntelligenceService,
        ApprovalOutcomeService,
        // Phase 1b: Export historical search service
        ApprovalHistorySearchService,
        // Decorator Support Service
        ApprovalEvaluatorService,
        ApprovalTimeoutService,
        ApprovalStreamingService,
        UserInterruptionService,
        ConfidenceEvaluatorService,
        ApprovalChainService,
        FeedbackProcessorService,
        HitlNotificationService,
        HitlTimeoutService,
        // New specialized HITL services
        HitlMemoryLearningService,
        HitlCheckpointService,
        HitlValidationService,
        HitlRecoveryService,
        HitlApprovalRequestService,
        HITL_CONFIG,
      ],
      // Make the configured HITL module global so its providers are available
      // to feature modules (e.g., BusinessWorkflowsModule) without re-importing
      // an unconfigured base module that would omit providers.
      global: true,
    };
  }

  /**
   * Configure module with asynchronous options
   */
  static forRootAsync(options: HitlModuleAsyncOptions): DynamicModule {
    // Apply same adapter pattern as forRoot
    const adapterProviders = this.createAdapterProvidersAsync(options);

    return {
      module: HitlModule,
      imports: [
        ConfigModule,
        // EventEmitter provided globally by app.module
        ...(options.imports || []),
      ],
      providers: [
        // Async configuration provider
        ...this.createAsyncProviders(options),
        // Adapter providers (self-contained)
        ...adapterProviders,
        // Phase 5: Neo4j approval state repository (TASK_2025_032)
        ApprovalStateRepository, // Neo4j-based approval state persistence
        // Core services (dependencies first)
        // Phase 1a: New specialized services (SOLID refactoring)
        ApproverIntelligenceService,
        ApprovalOutcomeService,
        // Phase 1b: Historical search service
        ApprovalHistorySearchService,
        ApprovalProcessingService, // Depends on ApproverIntelligence & ApprovalOutcome
        ApprovalTimeoutService,
        ApprovalStreamingService,
        UserInterruptionService,
        ConfidenceEvaluatorService,
        ApprovalChainService,
        FeedbackProcessorService,
        HitlNotificationService,
        HitlTimeoutService,
        // New specialized HITL services
        HitlMemoryLearningService,
        HitlCheckpointService, // Now uses ApprovalStateRepository (Phase 5)
        HitlValidationService,
        HitlRecoveryService,
        HitlApprovalRequestService,
        HumanApprovalService,
      ],
      exports: [
        HumanApprovalService,
        ApprovalProcessingService,
        // Phase 1a: Export new SOLID refactored services
        ApproverIntelligenceService,
        ApprovalOutcomeService,
        // Phase 1b: Export historical search service
        ApprovalHistorySearchService,
        // Decorator Support Service
        ApprovalEvaluatorService,
        ApprovalTimeoutService,
        ApprovalStreamingService,
        UserInterruptionService,
        ConfidenceEvaluatorService,
        ApprovalChainService,
        FeedbackProcessorService,
        HitlNotificationService,
        HitlTimeoutService,
        // New specialized HITL services
        HitlMemoryLearningService,
        HitlCheckpointService,
        HitlValidationService,
        HitlRecoveryService,
        HitlApprovalRequestService,
        HITL_CONFIG,
      ],
      global: true,
    };
  }

  /**
   * Create async providers for different configuration strategies
   */
  private static createAsyncProviders(
    options: HitlModuleAsyncOptions
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    if (options.useClass) {
      return [
        this.createAsyncOptionsProvider(options),
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
      ];
    }

    return [];
  }

  /**
   * Create async options provider
   */
  private static createAsyncOptionsProvider(
    options: HitlModuleAsyncOptions
  ): Provider {
    if (options.useFactory) {
      return {
        provide: HITL_CONFIG,
        useFactory: async (...args: unknown[]) => {
          const config = await options.useFactory!(...args);
          return { ...DEFAULT_HITL_CONFIG, ...config };
        },
        inject: options.inject || ([] as any[]),
      };
    }

    if (options.useExisting) {
      return {
        provide: HITL_CONFIG,
        useFactory: async (optionsFactory: HitlOptionsFactory) => {
          const config = await optionsFactory.createHitlOptions();
          return { ...DEFAULT_HITL_CONFIG, ...config };
        },
        inject: [options.useExisting],
      };
    }

    if (options.useClass) {
      return {
        provide: HITL_CONFIG,
        useFactory: async (optionsFactory: HitlOptionsFactory) => {
          const config = await optionsFactory.createHitlOptions();
          return { ...DEFAULT_HITL_CONFIG, ...config };
        },
        inject: [options.useClass],
      };
    }

    throw new Error('Invalid async options provided to HitlModule');
  }

  /**
   * Create adapter providers based on options
   * Handles both default adapters and custom adapter injection
   */
  private static createAdapterProviders(
    options: HitlModuleOptions
  ): Provider[] {
    const providers: Provider[] = [];

    // Storage service adapter provider
    const storageAdapter = options.adapters?.storage;
    if (storageAdapter) {
      // Custom adapter provided
      if (typeof storageAdapter === 'function') {
        // It's a class type
        providers.push({
          provide: IHitlStorageService,
          useClass: storageAdapter as Type<IHitlStorageService>,
        });
      } else {
        // It's an instance
        providers.push({
          provide: IHitlStorageService,
          useValue: storageAdapter,
        });
      }
    } else {
      // No adapter - storage will be disabled (in-memory only)
      console.warn(
        'HITL Module: No storage adapter provided. Approval persistence will be disabled (in-memory only). ' +
          'Provide options.adapters.storage for production use.'
      );
    }

    // User interruption storage adapter provider
    const interruptionStorageAdapter = options.adapters?.interruptionStorage;
    if (interruptionStorageAdapter) {
      // Custom interruption storage adapter provided
      if (typeof interruptionStorageAdapter === 'function') {
        // It's a class type
        providers.push({
          provide: IUserInterruptionStorageService,
          useClass: interruptionStorageAdapter,
        });
      } else {
        // It's an instance
        providers.push({
          provide: IUserInterruptionStorageService,
          useValue: interruptionStorageAdapter,
        });
      }
    } else {
      // ❌ CRITICAL: No interruption storage adapter - service will fail
      console.error(
        '❌ CRITICAL: No interruption storage adapter provided. UserInterruptionService requires persistent storage and will fail to start. ' +
          'Production systems MUST provide options.adapters.interruptionStorage.'
      );
      // 🛡️ FAIL FAST: Required dependency missing
      throw new Error(
        'UserInterruptionService requires IUserInterruptionStorageService - provide options.adapters.interruptionStorage'
      );
    }

    // Approval chain storage adapter provider
    const approvalChainStorageAdapter = options.adapters?.approvalChainStorage;
    if (approvalChainStorageAdapter) {
      // Custom approval chain storage adapter provided
      if (typeof approvalChainStorageAdapter === 'function') {
        // It's a class type
        providers.push({
          provide: 'IApprovalChainStorageService',
          useClass: approvalChainStorageAdapter,
        });
      } else {
        // It's an instance
        providers.push({
          provide: 'IApprovalChainStorageService',
          useValue: approvalChainStorageAdapter,
        });
      }
    } else {
      // ❌ CRITICAL: No approval chain storage adapter - service will fail
      console.error(
        '❌ CRITICAL: No approval chain storage adapter provided. ApprovalChainService requires persistent storage and will fail to start. ' +
          'Production systems MUST provide options.adapters.approvalChainStorage.'
      );
      // 🛡️ FAIL FAST: Required dependency missing
      throw new Error(
        'ApprovalChainService requires IApprovalChainStorageService - provide options.adapters.approvalChainStorage'
      );
    }

    // Feedback storage adapter provider
    const feedbackStorageAdapter = options.adapters?.feedbackStorage;
    if (feedbackStorageAdapter) {
      // Custom feedback storage adapter provided
      if (typeof feedbackStorageAdapter === 'function') {
        // It's a class type
        providers.push({
          provide: 'IFeedbackStorageService',
          useClass: feedbackStorageAdapter,
        });
      } else {
        // It's an instance
        providers.push({
          provide: 'IFeedbackStorageService',
          useValue: feedbackStorageAdapter,
        });
      }
    } else {
      // ❌ CRITICAL: No feedback storage adapter - service will fail
      console.error(
        '❌ CRITICAL: No feedback storage adapter provided. FeedbackProcessorService requires persistent storage and will fail to start. ' +
          'Human feedback is essential for AI learning and must never be lost. ' +
          'Production systems MUST provide options.adapters.feedbackStorage.'
      );
      // 🛡️ FAIL FAST: Required dependency missing
      throw new Error(
        'FeedbackProcessorService requires IFeedbackStorageService - provide options.adapters.feedbackStorage'
      );
    }

    // Confidence storage adapter provider (OPTIONAL)
    const confidenceStorageAdapter = options.adapters?.confidenceStorage;
    if (confidenceStorageAdapter) {
      // Custom confidence storage adapter provided
      if (typeof confidenceStorageAdapter === 'function') {
        // It's a class type
        providers.push({
          provide: 'IConfidenceStorageService',
          useClass: confidenceStorageAdapter,
        });
      } else {
        // It's an instance
        providers.push({
          provide: 'IConfidenceStorageService',
          useValue: confidenceStorageAdapter,
        });
      }
    } else {
      // ⚠️ OPTIONAL: No confidence storage adapter - confidence learning disabled
      console.warn(
        '⚠️  No confidence storage adapter provided. ConfidenceEvaluatorService will run in degraded mode without learning capabilities. ' +
          'For production systems with machine learning requirements, provide options.adapters.confidenceStorage.'
      );
      // No provider added - service will run in cache-only mode
    }

    return providers;
  }

  /**
   * Create adapter providers for async configuration
   * Adapters are resolved from the async options factory and registered as providers
   */
  private static createAdapterProvidersAsync(
    options: HitlModuleAsyncOptions
  ): Provider[] {
    const providers: Provider[] = [];

    // Storage adapter provider - resolved from async options
    providers.push({
      provide: IHitlStorageService,
      useFactory: (moduleOptions: HitlModuleOptions) => {
        const storageAdapter = moduleOptions.adapters?.storage;
        if (!storageAdapter) {
          console.warn(
            'HITL Module: No storage adapter provided. Approval persistence will be disabled (in-memory only).'
          );
          return null;
        }
        // Return the instance (already injected via useFactory)
        return storageAdapter;
      },
      inject: [HITL_CONFIG],
    });

    // User interruption storage adapter provider
    providers.push({
      provide: IUserInterruptionStorageService,
      useFactory: (moduleOptions: HitlModuleOptions) => {
        const interruptionStorageAdapter =
          moduleOptions.adapters?.interruptionStorage;
        if (!interruptionStorageAdapter) {
          throw new Error(
            'UserInterruptionService requires IUserInterruptionStorageService - provide options.adapters.interruptionStorage'
          );
        }
        return interruptionStorageAdapter;
      },
      inject: [HITL_CONFIG],
    });

    // Approval chain storage adapter provider
    providers.push({
      provide: 'IApprovalChainStorageService',
      useFactory: (moduleOptions: HitlModuleOptions) => {
        const approvalChainStorageAdapter =
          moduleOptions.adapters?.approvalChainStorage;
        if (!approvalChainStorageAdapter) {
          throw new Error(
            'ApprovalChainService requires IApprovalChainStorageService - provide options.adapters.approvalChainStorage'
          );
        }
        return approvalChainStorageAdapter;
      },
      inject: [HITL_CONFIG],
    });

    // Feedback storage adapter provider
    providers.push({
      provide: 'IFeedbackStorageService',
      useFactory: (moduleOptions: HitlModuleOptions) => {
        const feedbackStorageAdapter = moduleOptions.adapters?.feedbackStorage;
        if (!feedbackStorageAdapter) {
          throw new Error(
            'FeedbackProcessorService requires IFeedbackStorageService - provide options.adapters.feedbackStorage'
          );
        }
        return feedbackStorageAdapter;
      },
      inject: [HITL_CONFIG],
    });

    // Confidence storage adapter provider (OPTIONAL)
    providers.push({
      provide: 'IConfidenceStorageService',
      useFactory: (moduleOptions: HitlModuleOptions) => {
        const confidenceStorageAdapter =
          moduleOptions.adapters?.confidenceStorage;
        if (!confidenceStorageAdapter) {
          console.warn(
            '⚠️  No confidence storage adapter provided. ConfidenceEvaluatorService will run in degraded mode.'
          );
          return null;
        }
        return confidenceStorageAdapter;
      },
      inject: [HITL_CONFIG],
    });

    return providers;
  }

  /**
   * Validate adapter configuration
   * Ensures provided adapters implement the required interfaces
   */
  private static validateAdapters(options: HitlModuleOptions): void {
    if (options.adapters?.storage) {
      const storageAdapter = options.adapters.storage;
      if (typeof storageAdapter === 'function') {
        // For class types, we can't validate at runtime easily
        // NestJS will handle this during injection
      } else {
        // For instances, check if it has required methods
        const requiredMethods = [
          'storeApprovalRequest',
          'getApprovalRequest',
          'getPendingApprovals',
          'updateApprovalStatus',
          'deleteApprovalRequest',
          'getStorageStats',
        ];
        for (const method of requiredMethods) {
          if (typeof (storageAdapter as any)[method] !== 'function') {
            throw new Error(
              `Custom storage adapter must implement IHitlStorageService.${method}() method`
            );
          }
        }
      }
    }

    if (options.adapters?.approvalChainStorage) {
      const approvalChainStorageAdapter = options.adapters.approvalChainStorage;
      if (typeof approvalChainStorageAdapter === 'function') {
        // For class types, we can't validate at runtime easily
        // NestJS will handle this during injection
      } else {
        // For instances, check if it has required methods
        const requiredMethods = [
          'storeApprovalChain',
          'getApprovalChain',
          'getAllApprovalChains',
          'deleteApprovalChain',
          'storeApprovalRequest',
          'getApprovalRequest',
          'getApprovalRequestsByExecution',
          'updateApprovalRequestStatus',
          'updateApprovalRequest',
          'deleteApprovalRequest',
          'getAllActiveRequests',
          'getPendingApprovalsForApprover',
          'cleanup',
          'healthCheck',
        ];
        for (const method of requiredMethods) {
          if (
            typeof (approvalChainStorageAdapter as any)[method] !== 'function'
          ) {
            throw new Error(
              `Custom approval chain storage adapter must implement IApprovalChainStorageService.${method}() method`
            );
          }
        }
      }
    }

    if (options.adapters?.feedbackStorage) {
      const feedbackStorageAdapter = options.adapters.feedbackStorage;
      if (typeof feedbackStorageAdapter === 'function') {
        // For class types, we can't validate at runtime easily
        // NestJS will handle this during injection
      } else {
        // For instances, check if it has required methods
        const requiredMethods = [
          'storeFeedback',
          'getFeedback',
          'getFeedbackByExecution',
          'updateFeedbackStatus',
          'deleteFeedback',
          'getFeedbackByType',
          'getFeedbackByProvider',
          'getUnprocessedFeedback',
          'getFeedbackStats',
          'getAllActiveFeedback',
          'getAllExecutionFeedback',
          'cleanup',
          'healthCheck',
        ];
        for (const method of requiredMethods) {
          if (typeof (feedbackStorageAdapter as any)[method] !== 'function') {
            throw new Error(
              `Custom feedback storage adapter must implement IFeedbackStorageService.${method}() method`
            );
          }
        }
      }
    }

    if (options.adapters?.confidenceStorage) {
      const confidenceStorageAdapter = options.adapters.confidenceStorage;
      if (typeof confidenceStorageAdapter === 'function') {
        // For class types, we can't validate at runtime easily
        // NestJS will handle this during injection
      } else {
        // For instances, check if it has required methods
        const requiredMethods = [
          'storeApprovalPattern',
          'getApprovalPattern',
          'getAllApprovalPatterns',
          'updateApprovalPattern',
          'deleteApprovalPattern',
          'storeConfidenceHistory',
          'getConfidenceHistory',
          'getAllConfidenceHistory',
          'updateConfidenceFactors',
          'getMLTrainingData',
          'storeMLPrediction',
          'getMLPredictions',
          'storeConfidenceOutcome',
          'storeFeatureVector',
          'getConfidenceAnalytics',
          'getPatternInsights',
          'getAllActivePatterns',
          'getAllActiveHistory',
          'cleanup',
          'isHealthy',
          'getStorageStats',
        ];
        for (const method of requiredMethods) {
          if (typeof (confidenceStorageAdapter as any)[method] !== 'function') {
            throw new Error(
              `Custom confidence storage adapter must implement IConfidenceStorageService.${method}() method`
            );
          }
        }
      }
    }
  }
}
