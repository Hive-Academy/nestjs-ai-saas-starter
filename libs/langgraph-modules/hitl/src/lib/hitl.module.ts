import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
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
import { setHitlConfig } from './utils/hitl-config.accessor';

// Provider factory and validator
import { AdapterProviderFactory } from './providers/adapter-provider.factory';
import { AdapterValidatorService } from './providers/adapter-validator.service';

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
    const validator = new AdapterValidatorService();
    validator.validateAdapters(options);

    // Create adapter providers using factory
    const adapterProviders =
      AdapterProviderFactory.createSyncProviders(options);

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
    // Create adapter providers using factory
    const adapterProviders =
      AdapterProviderFactory.createAsyncProviders(options);

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
        ApprovalEvaluatorService,
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
}
