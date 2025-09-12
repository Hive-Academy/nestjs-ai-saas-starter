import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { getEntrypointMetadata } from '../decorators/entrypoint.decorator';
import { getTaskMetadata } from '../decorators/task.decorator';
import { getWorkflowMetadata } from '../decorators/workflow.decorator';
import { WorkflowValidator } from '../validation/workflow-validator';
import {
  FunctionalWorkflowDefinition,
  TaskDefinition,
} from '../interfaces/functional-workflow.interface';
import type { WorkflowProvider } from '../interfaces/module-options.interface';

/**
 * Service for explicit workflow registration (replaces WorkflowDiscoveryService)
 *
 * This service handles compile-time safe registration of workflow providers
 * without runtime discovery overhead or module context issues.
 */
@Injectable()
export class WorkflowRegistrationService {
  private readonly logger = new Logger(WorkflowRegistrationService.name);
  private readonly workflows = new Map<string, FunctionalWorkflowDefinition>();
  private readonly workflowInstances = new Map<string, object>();

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly workflowValidator: WorkflowValidator
  ) {}

  /**
   * Register workflows from explicitly provided workflow providers
   */
  async registerWorkflows(
    workflowProviders: WorkflowProvider[]
  ): Promise<void> {
    if (!workflowProviders || workflowProviders.length === 0) {
      this.logger.debug('No workflow providers to register');
      return;
    }

    this.logger.log(
      `Registering ${workflowProviders.length} workflow providers`
    );

    for (const WorkflowClass of workflowProviders) {
      try {
        await this.registerWorkflowProvider(WorkflowClass);
      } catch (error) {
        this.logger.error(
          `Failed to register workflow provider ${WorkflowClass.name}:`,
          error
        );
        throw error;
      }
    }

    this.logger.log(
      `Successfully registered ${workflowProviders.length} workflow providers`
    );
  }

  /**
   * Register a single workflow provider
   */
  private async registerWorkflowProvider(
    WorkflowClass: WorkflowProvider
  ): Promise<void> {
    const className = WorkflowClass.name;

    // Get workflow metadata to extract the proper workflow name
    const workflowMetadata = getWorkflowMetadata(WorkflowClass);
    const workflowName = workflowMetadata?.name || className;

    // Get workflow instance from module context
    let instance: any;
    try {
      instance = await this.moduleRef.get(WorkflowClass, { strict: false });
    } catch (error) {
      throw new Error(
        `Failed to get instance of workflow provider ${className} (${workflowName}). ` +
          `Ensure it's registered as a provider in the module. Error: ${
            error instanceof Error ? error.message : String(error)
          }`
      );
    }

    // Find entrypoint and tasks by scanning instance methods
    let entrypointMetadata: any = null;
    const taskMetadatas: any[] = [];

    // Get all method names from the instance prototype
    const methodNames = Object.getOwnPropertyNames(
      Object.getPrototypeOf(instance)
    );

    // Get the prototype where method-level decorator metadata is stored
    const prototype = Object.getPrototypeOf(instance);

    for (const methodName of methodNames) {
      if (methodName === 'constructor') continue;

      try {
        // Method-level decorators store metadata on prototype, not instance
        const entrypointMeta = getEntrypointMetadata(prototype, methodName);
        if (entrypointMeta) {
          entrypointMetadata = entrypointMeta;
        }

        const taskMeta = getTaskMetadata(prototype, methodName);
        if (taskMeta) {
          taskMetadatas.push(taskMeta);
        }
      } catch (error) {
        // Skip methods that cause errors when getting metadata
        continue;
      }
    }

    if (!entrypointMetadata) {
      this.logger.warn(
        `Workflow provider ${className} (${workflowName}) has no @Entrypoint decorated method`
      );
      return;
    }

    if (taskMetadatas.length === 0) {
      this.logger.warn(
        `Workflow provider ${className} (${workflowName}) has no @Task decorated methods`
      );
    }

    // Build workflow definition following the interface
    const tasks = new Map<string, TaskDefinition>();
    const dependencies = new Map<string, readonly string[]>();

    // Add entrypoint as a task
    const entrypointTask: TaskDefinition = {
      name: entrypointMetadata.name,
      methodName: entrypointMetadata.methodName,
      dependencies: [],
      isEntrypoint: true,
      timeout: entrypointMetadata.timeout,
      retryCount: entrypointMetadata.retryCount,
      metadata: entrypointMetadata.metadata,
    };
    tasks.set(entrypointMetadata.name, entrypointTask);
    dependencies.set(entrypointMetadata.name, []);

    // Add regular tasks
    for (const task of taskMetadatas) {
      const taskDef: TaskDefinition = {
        name: task.name || task.methodName,
        methodName: task.methodName,
        dependencies: task.dependsOn || [],
        isEntrypoint: false,
        timeout: task.timeout,
        retryCount: task.retryCount,
        metadata: task.metadata,
      };
      tasks.set(taskDef.name, taskDef);
      dependencies.set(taskDef.name, task.dependsOn || []);
    }

    const workflowDefinition: FunctionalWorkflowDefinition = {
      name: workflowName,
      entrypoint: entrypointMetadata.name,
      tasks,
      dependencies,
      errorHandlers: new Map(),
      metadata: workflowMetadata || {},
    };

    // Validate workflow integrity
    try {
      await this.workflowValidator.validateWorkflow(workflowDefinition);
    } catch (error) {
      throw new Error(
        `Workflow validation failed for ${className} (${workflowName}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    // Register the workflow using the proper workflow name (not className which becomes 'newConstructor')
    this.workflows.set(workflowName, workflowDefinition);
    this.workflowInstances.set(workflowName, instance);

    this.logger.debug(
      `Registered workflow: ${workflowName} (${className}) with ${taskMetadatas.length} tasks`
    );
  }

  /**
   * Get all registered workflows
   */
  getWorkflows(): Map<string, FunctionalWorkflowDefinition> {
    return new Map(this.workflows);
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): FunctionalWorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Get workflow instance by ID
   */
  getWorkflowInstance(workflowId: string): object | undefined {
    return this.workflowInstances.get(workflowId);
  }

  /**
   * Check if workflow exists
   */
  hasWorkflow(workflowId: string): boolean {
    return this.workflows.has(workflowId);
  }

  /**
   * Get registration statistics
   */
  getRegistrationStats() {
    const totalTasks = Array.from(this.workflows.values()).reduce(
      (sum, workflow) => sum + workflow.tasks.size,
      0
    );

    return {
      totalWorkflows: this.workflows.size,
      totalTasks,
      workflows: Array.from(this.workflows.keys()),
    };
  }
}
