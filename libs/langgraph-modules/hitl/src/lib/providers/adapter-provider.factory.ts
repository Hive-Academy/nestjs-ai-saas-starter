import type { Provider, Type } from '@nestjs/common';
import { HITL_CONFIG } from '../constants';
import { IHitlStorageService } from '../interfaces/hitl-storage.interface';
import { IUserInterruptionStorageService } from '../interfaces/user-interruption.interface';
import type {
  HitlModuleOptions,
  HitlModuleAsyncOptions,
} from '../interfaces/hitl.interface';

/**
 * Factory for creating HITL adapter providers
 *
 * **Purpose**: Extract adapter provider creation logic from HitlModule
 * **Pattern**: Factory pattern for dynamic provider creation
 *
 * Supports both synchronous and asynchronous provider creation for:
 * - Storage adapters (IHitlStorageService)
 * - User interruption storage (IUserInterruptionStorageService)
 * - Approval chain storage (IApprovalChainStorageService)
 * - Feedback storage (IFeedbackStorageService)
 * - Confidence storage (IConfidenceStorageService)
 */
export class AdapterProviderFactory {
  /**
   * Create adapter providers for synchronous configuration
   */
  static createSyncProviders(options: HitlModuleOptions): Provider[] {
    const providers: Provider[] = [];

    // Storage service adapter provider
    const storageAdapter = options.adapters?.storage;
    if (storageAdapter) {
      providers.push(this.createStorageProvider(storageAdapter));
    } else {
      console.warn(
        'HITL Module: No storage adapter provided. Approval persistence will be disabled (in-memory only). ' +
          'Provide options.adapters.storage for production use.'
      );
    }

    // User interruption storage adapter provider (REQUIRED)
    const interruptionStorageAdapter = options.adapters?.interruptionStorage;
    if (interruptionStorageAdapter) {
      providers.push(
        this.createInterruptionStorageProvider(interruptionStorageAdapter)
      );
    } else {
      console.error(
        '❌ CRITICAL: No interruption storage adapter provided. UserInterruptionService requires persistent storage and will fail to start. ' +
          'Production systems MUST provide options.adapters.interruptionStorage.'
      );
      throw new Error(
        'UserInterruptionService requires IUserInterruptionStorageService - provide options.adapters.interruptionStorage'
      );
    }

    // Approval chain storage adapter provider (REQUIRED)
    const approvalChainStorageAdapter = options.adapters?.approvalChainStorage;
    if (approvalChainStorageAdapter) {
      providers.push(
        this.createApprovalChainStorageProvider(approvalChainStorageAdapter)
      );
    } else {
      console.error(
        '❌ CRITICAL: No approval chain storage adapter provided. ApprovalChainService requires persistent storage and will fail to start. ' +
          'Production systems MUST provide options.adapters.approvalChainStorage.'
      );
      throw new Error(
        'ApprovalChainService requires IApprovalChainStorageService - provide options.adapters.approvalChainStorage'
      );
    }

    // Feedback storage adapter provider (REQUIRED)
    const feedbackStorageAdapter = options.adapters?.feedbackStorage;
    if (feedbackStorageAdapter) {
      providers.push(
        this.createFeedbackStorageProvider(feedbackStorageAdapter)
      );
    } else {
      console.error(
        '❌ CRITICAL: No feedback storage adapter provided. FeedbackProcessorService requires persistent storage and will fail to start. ' +
          'Human feedback is essential for AI learning and must never be lost. ' +
          'Production systems MUST provide options.adapters.feedbackStorage.'
      );
      throw new Error(
        'FeedbackProcessorService requires IFeedbackStorageService - provide options.adapters.feedbackStorage'
      );
    }

    // Confidence storage adapter provider (OPTIONAL)
    const confidenceStorageAdapter = options.adapters?.confidenceStorage;
    if (confidenceStorageAdapter) {
      providers.push(
        this.createConfidenceStorageProvider(confidenceStorageAdapter)
      );
    } else {
      console.warn(
        '⚠️  No confidence storage adapter provided. ConfidenceEvaluatorService will run in degraded mode without learning capabilities. ' +
          'For production systems with machine learning requirements, provide options.adapters.confidenceStorage.'
      );
    }

    return providers;
  }

  /**
   * Create adapter providers for asynchronous configuration
   */
  static createAsyncProviders(options: HitlModuleAsyncOptions): Provider[] {
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

  // ============================================================================
  // Private Helper Methods - Individual Provider Creators
  // ============================================================================

  private static createStorageProvider(
    adapter: Type<IHitlStorageService> | IHitlStorageService
  ): Provider {
    if (typeof adapter === 'function') {
      return {
        provide: IHitlStorageService,
        useClass: adapter as Type<IHitlStorageService>,
      };
    }
    return {
      provide: IHitlStorageService,
      useValue: adapter,
    };
  }

  private static createInterruptionStorageProvider(
    adapter:
      | Type<IUserInterruptionStorageService>
      | IUserInterruptionStorageService
  ): Provider {
    if (typeof adapter === 'function') {
      return {
        provide: IUserInterruptionStorageService,
        useClass: adapter,
      };
    }
    return {
      provide: IUserInterruptionStorageService,
      useValue: adapter,
    };
  }

  private static createApprovalChainStorageProvider(
    adapter: Type<any> | any
  ): Provider {
    if (typeof adapter === 'function') {
      return {
        provide: 'IApprovalChainStorageService',
        useClass: adapter,
      };
    }
    return {
      provide: 'IApprovalChainStorageService',
      useValue: adapter,
    };
  }

  private static createFeedbackStorageProvider(
    adapter: Type<any> | any
  ): Provider {
    if (typeof adapter === 'function') {
      return {
        provide: 'IFeedbackStorageService',
        useClass: adapter,
      };
    }
    return {
      provide: 'IFeedbackStorageService',
      useValue: adapter,
    };
  }

  private static createConfidenceStorageProvider(
    adapter: Type<any> | any
  ): Provider {
    if (typeof adapter === 'function') {
      return {
        provide: 'IConfidenceStorageService',
        useClass: adapter,
      };
    }
    return {
      provide: 'IConfidenceStorageService',
      useValue: adapter,
    };
  }
}
