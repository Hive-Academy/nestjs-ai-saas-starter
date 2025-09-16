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
 * Provides:
 * - Adapter-based storage integration for approval persistence
 * - Human approval orchestration services
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
      imports: [ConfigModule],
      providers: [
        // Configuration provider
        {
          provide: HITL_CONFIG,
          useValue: config,
        },
        // Adapter providers (conditional)
        ...adapterProviders,
        // Core services (order: dependencies first, orchestrator last)
        // Processing & helper services
        ApprovalProcessingService,
        ApprovalTimeoutService,
        ApprovalStreamingService,
        UserInterruptionService,
        ConfidenceEvaluatorService,
        ApprovalChainService,
        FeedbackProcessorService,
        HitlNotificationService,
        HitlTimeoutService,
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
        ApprovalTimeoutService,
        ApprovalStreamingService,
        UserInterruptionService,
        ConfidenceEvaluatorService,
        ApprovalChainService,
        FeedbackProcessorService,
        HitlNotificationService,
        HitlTimeoutService,
        HITL_CONFIG,
        // Export adapter interface for external use
        IHitlStorageService,
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
      imports: [ConfigModule, ...(options.imports || [])],
      providers: [
        // Async configuration provider
        ...this.createAsyncProviders(options),
        // Adapter providers (self-contained)
        ...adapterProviders,
        // Core services (dependencies first)
        ApprovalProcessingService,
        ApprovalTimeoutService,
        ApprovalStreamingService,
        UserInterruptionService,
        ConfidenceEvaluatorService,
        ApprovalChainService,
        FeedbackProcessorService,
        HitlNotificationService,
        HitlTimeoutService,
        HumanApprovalService,
      ],
      exports: [
        HumanApprovalService,
        ApprovalProcessingService,
        ApprovalTimeoutService,
        ApprovalStreamingService,
        UserInterruptionService,
        ConfidenceEvaluatorService,
        ApprovalChainService,
        FeedbackProcessorService,
        HitlNotificationService,
        HitlTimeoutService,
        HITL_CONFIG,
        // Export adapter interface for external use
        IHitlStorageService,
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
      // No interruption storage adapter - will use in-memory only
      console.warn(
        'HITL Module: No interruption storage adapter provided. User interruption persistence will be disabled (in-memory only). ' +
          'Provide options.adapters.interruptionStorage for production use.'
      );
    }

    return providers;
  }

  /**
   * Create adapter providers for async configuration
   * Applications must provide adapters - no defaults available
   */
  private static createAdapterProvidersAsync(
    options: HitlModuleAsyncOptions
  ): Provider[] {
    // For async configuration, applications must provide adapters through dependency injection
    console.warn(
      'HitlModule.forRootAsync(): Storage adapters must be provided through dependency injection. ' +
        'Please ensure IHitlStorageService is provided in your application module.'
    );
    return [];
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
  }
}
