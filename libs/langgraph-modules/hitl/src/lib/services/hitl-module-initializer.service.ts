import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ApprovalEvaluatorService } from './approval-evaluator.service';
import { setApprovalEvaluatorService } from '../utils/approval-service.locator';

/**
 * HitlModuleInitializerService - Module Initialization & Service Registration
 *
 * PURPOSE: Initialize HITL module and register services in service locator
 * PATTERN: NestJS lifecycle hook (OnModuleInit)
 *
 * This service runs during module initialization to:
 * 1. Store ApprovalEvaluatorService in service locator
 * 2. Make service accessible to @RequiresApproval decorator
 * 3. Eliminate need for manual injection in consumer classes
 *
 * @injectable NestJS service with lifecycle hooks
 */
@Injectable()
export class HitlModuleInitializerService implements OnModuleInit {
  private readonly logger = new Logger(HitlModuleInitializerService.name);

  constructor(private readonly approvalEvaluator: ApprovalEvaluatorService) {}

  /**
   * Module initialization hook
   * Called automatically by NestJS when module is initialized
   */
  async onModuleInit(): Promise<void> {
    try {
      // Store ApprovalEvaluatorService in service locator
      setApprovalEvaluatorService(this.approvalEvaluator);

      this.logger.log(
        'HITL module initialized - ApprovalEvaluatorService registered in service locator'
      );
    } catch (error) {
      this.logger.error(
        'Failed to initialize HITL module service locator:',
        error
      );
      throw error;
    }
  }
}
