import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { FUNCTIONAL_API_MODULE_OPTIONS } from '../constants/module.constants';
import type { FunctionalApiModuleOptions } from '../interfaces/module-options.interface';
import { WorkflowRegistrationService } from './workflow-registration.service';

/**
 * Service responsible for initializing the FunctionalApi module
 * Handles explicit registration of workflows
 */
@Injectable()
export class FunctionalApiModuleInitializer implements OnModuleInit {
  private readonly logger = new Logger(FunctionalApiModuleInitializer.name);

  constructor(
    @Inject(FUNCTIONAL_API_MODULE_OPTIONS)
    private readonly options: FunctionalApiModuleOptions,
    private readonly workflowRegistrationService: WorkflowRegistrationService
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log(
      'Initializing FunctionalApi module with explicit registration'
    );

    try {
      // Register workflows if provided
      if (this.options.workflows && this.options.workflows.length > 0) {
        await this.workflowRegistrationService.registerWorkflows(
          this.options.workflows
        );
        const stats = this.workflowRegistrationService.getRegistrationStats();
        this.logger.log(
          `Registered ${stats.totalWorkflows} workflows with ${stats.totalTasks} total tasks`
        );
      } else {
        this.logger.debug('No workflows provided for registration');
      }

      this.logger.log(
        'FunctionalApi module initialization completed successfully'
      );
    } catch (error) {
      this.logger.error('Failed to initialize FunctionalApi module:', error);
      throw error;
    }
  }
}
