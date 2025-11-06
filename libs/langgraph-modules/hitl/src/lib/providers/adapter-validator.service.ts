import { Injectable, Logger } from '@nestjs/common';
import type { HitlModuleOptions } from '../interfaces/hitl.interface';

/**
 * Service for validating HITL adapter configurations
 *
 * **Purpose**: Extract adapter validation logic from HitlModule
 * **Pattern**: Validator service for runtime adapter interface compliance
 *
 * Validates that provided adapters (classes or instances) implement the required
 * interfaces by checking for required methods at runtime.
 *
 * Note: For class types, NestJS DI will handle validation during injection.
 * For instances, we validate required methods here.
 */
@Injectable()
export class AdapterValidatorService {
  private readonly logger = new Logger(AdapterValidatorService.name);

  /**
   * Validate all adapter configurations
   */
  validateAdapters(options: HitlModuleOptions): void {
    if (options.adapters?.storage) {
      this.validateStorageAdapter(options.adapters.storage);
    }

    if (options.adapters?.approvalChainStorage) {
      this.validateApprovalChainStorageAdapter(
        options.adapters.approvalChainStorage
      );
    }

    if (options.adapters?.feedbackStorage) {
      this.validateFeedbackStorageAdapter(options.adapters.feedbackStorage);
    }

    if (options.adapters?.confidenceStorage) {
      this.validateConfidenceStorageAdapter(options.adapters.confidenceStorage);
    }

    this.logger.debug('All HITL adapters validated successfully');
  }

  /**
   * Validate storage adapter (IHitlStorageService)
   */
  private validateStorageAdapter(adapter: any): void {
    if (typeof adapter === 'function') {
      // Class type - NestJS will validate during injection
      return;
    }

    // Instance - check required methods
    const requiredMethods = [
      'storeApprovalRequest',
      'getApprovalRequest',
      'getPendingApprovals',
      'updateApprovalStatus',
      'deleteApprovalRequest',
      'getStorageStats',
    ];

    this.validateAdapterMethods(
      adapter,
      requiredMethods,
      'IHitlStorageService'
    );
  }

  /**
   * Validate approval chain storage adapter (IApprovalChainStorageService)
   */
  private validateApprovalChainStorageAdapter(adapter: any): void {
    if (typeof adapter === 'function') {
      return;
    }

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

    this.validateAdapterMethods(
      adapter,
      requiredMethods,
      'IApprovalChainStorageService'
    );
  }

  /**
   * Validate feedback storage adapter (IFeedbackStorageService)
   */
  private validateFeedbackStorageAdapter(adapter: any): void {
    if (typeof adapter === 'function') {
      return;
    }

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

    this.validateAdapterMethods(
      adapter,
      requiredMethods,
      'IFeedbackStorageService'
    );
  }

  /**
   * Validate confidence storage adapter (IConfidenceStorageService)
   */
  private validateConfidenceStorageAdapter(adapter: any): void {
    if (typeof adapter === 'function') {
      return;
    }

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

    this.validateAdapterMethods(
      adapter,
      requiredMethods,
      'IConfidenceStorageService'
    );
  }

  /**
   * Validate that an adapter instance has all required methods
   */
  private validateAdapterMethods(
    adapter: any,
    requiredMethods: string[],
    interfaceName: string
  ): void {
    for (const method of requiredMethods) {
      if (typeof adapter[method] !== 'function') {
        throw new Error(
          `Custom adapter must implement ${interfaceName}.${method}() method`
        );
      }
    }
  }
}
