import { DiscoveryService } from '@golevelup/nestjs-discovery';
import { Injectable, Logger } from '@nestjs/common';
import {
  EntrypointMetadata,
  getEntrypointMetadata,
} from '../decorators/entrypoint.decorator';
import { getTaskMetadata, TaskMetadata } from '../decorators/task.decorator';
import {
  DuplicateWorkflowError,
  InvalidWorkflowDefinitionError,
} from '../errors/functional-workflow.errors';
import {
  FunctionalWorkflowDefinition,
  TaskDefinition,
} from '../interfaces/functional-workflow.interface';
import { WorkflowValidator } from '../validation/workflow-validator';

/**
 * Service for discovering and registering functional workflows from decorated classes
 */
@Injectable()
export class WorkflowDiscoveryService {
  private readonly logger = new Logger(WorkflowDiscoveryService.name);
  private readonly workflows = new Map<string, FunctionalWorkflowDefinition>();
  private readonly workflowInstances = new Map<string, object>();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly workflowValidator: WorkflowValidator
  ) {}

  /**
   * Discovers and registers all functional workflows
   */
  async discoverWorkflows(): Promise<void> {
    this.logger.log('Starting workflow discovery');

    // Import the discovery filter utility
    const { DiscoveryFilterUtil } = await import('../utils/discovery-filter.util');
    
    // Use intelligent filtering to only scan providers with @Entrypoint/@Task decorated methods
    const providers = await this.discoveryService.providers(
      DiscoveryFilterUtil.createWorkflowFilter(['WorkflowDiscoveryService', 'FunctionalWorkflowService'])
    );

    this.logger.debug(`Scanning ${providers.length} workflow providers (intelligently filtered)`);
    let discoveredCount = 0;

    for (const provider of providers) {
      try {
        // Additional safety checks
        if (!provider.instance || typeof provider.instance !== 'object') {
          continue;
        }

        // Skip if instance doesn't have a constructor or name
        if (
          !provider.instance.constructor ||
          !provider.instance.constructor.name
        ) {
          continue;
        }

        const workflows = this.extractWorkflowsFromInstance(provider.instance);

        for (const workflow of workflows) {
          this.registerWorkflow(workflow.definition, provider.instance);
          discoveredCount++;
        }
      } catch (error) {
        this.logger.warn(
          `Failed to extract workflows from ${
            provider.name || 'unknown provider'
          }`,
          error instanceof Error ? error.message : String(error)
        );
        // Continue processing other providers instead of failing completely
      }
    }

    this.logger.log(`Discovered ${discoveredCount} functional workflows`);
  }

  /**
   * Gets a registered workflow definition by name
   */
  getWorkflow(name: string): FunctionalWorkflowDefinition | undefined {
    return this.workflows.get(name);
  }

  /**
   * Gets all registered workflow definitions
   */
  getAllWorkflows(): readonly FunctionalWorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Gets the instance associated with a workflow
   */
  getWorkflowInstance(name: string): object | undefined {
    return this.workflowInstances.get(name);
  }

  /**
   * Extracts workflow definitions from a provider instance
   */
  private extractWorkflowsFromInstance(
    instance: object
  ): Array<{ definition: FunctionalWorkflowDefinition; instance: object }> {
    try {
      const prototype = Object.getPrototypeOf(instance) as object;
      if (!prototype) {
        return [];
      }

      const methodNames = Object.getOwnPropertyNames(prototype).filter(
        (name) => {
          try {
            return (
              name !== 'constructor' &&
              typeof (prototype as any)[name] === 'function'
            );
          } catch (error) {
            // Skip methods that cause errors when accessed
            return false;
          }
        }
      );

      const entrypoints = new Map<string, EntrypointMetadata>();
      const tasks = new Map<string, TaskMetadata>();

      // Collect all decorated methods
      for (const methodName of methodNames) {
        try {
          const entrypointMeta = getEntrypointMetadata(instance, methodName);
          if (entrypointMeta) {
            entrypoints.set(entrypointMeta.name, entrypointMeta);
          }

          const taskMeta = getTaskMetadata(instance, methodName);
          if (taskMeta) {
            tasks.set(taskMeta.name, taskMeta);
          }
        } catch (error) {
          // Skip methods that cause errors when getting metadata
          continue;
        }
      }

      // If no decorated methods found, return empty array
      if (entrypoints.size === 0 && tasks.size === 0) {
        return [];
      }

      // If we have tasks but no entrypoint, skip this class
      if (entrypoints.size === 0 && tasks.size > 0) {
        return [];
      }

      // Validate that we have exactly one entrypoint
      if (entrypoints.size !== 1) {
        throw new InvalidWorkflowDefinitionError(
          `Class ${instance.constructor.name} must have exactly one @Entrypoint method, found ${entrypoints.size}`,
          {
            className: instance.constructor.name,
            entrypointCount: entrypoints.size,
          }
        );
      }

      const entrypoint = Array.from(entrypoints.values())[0];
      const workflowName = instance.constructor.name;

      // Build task definitions
      const allTasks = new Map<string, TaskDefinition>();

      // Add entrypoint as a task
      allTasks.set(entrypoint.name, {
        name: entrypoint.name,
        methodName: entrypoint.methodName,
        dependencies: [],
        isEntrypoint: true,
        timeout: entrypoint.timeout,
        retryCount: entrypoint.retryCount,
        errorHandler: entrypoint.errorHandler,
        metadata: entrypoint.metadata,
      });

      // Add all other tasks
      for (const task of tasks.values()) {
        allTasks.set(task.name, {
          name: task.name,
          methodName: task.methodName,
          dependencies: task.dependsOn,
          isEntrypoint: false,
          timeout: task.timeout,
          retryCount: task.retryCount,
          errorHandler: task.errorHandler,
          metadata: task.metadata,
        });
      }

      // Build dependencies map
      const dependencies = new Map<string, readonly string[]>();
      for (const [taskName, task] of allTasks) {
        dependencies.set(taskName, task.dependencies);
      }

      // Build error handlers map
      const errorHandlers = new Map<string, string>();
      for (const [taskName, task] of allTasks) {
        if (task.errorHandler) {
          errorHandlers.set(taskName, task.errorHandler);
        }
      }

      const definition: FunctionalWorkflowDefinition = {
        name: workflowName,
        entrypoint: entrypoint.name,
        tasks: allTasks,
        dependencies,
        errorHandlers,
        metadata: {},
      };

      return [{ definition, instance }];
    } catch (error) {
      // Return empty array if any error occurs during extraction
      this.logger.debug(
        `Error extracting workflows from ${
          instance.constructor?.name || 'unknown'
        }:`,
        error
      );
      return [];
    }
  }

  /**
   * Registers a workflow definition
   */
  private registerWorkflow(
    definition: FunctionalWorkflowDefinition,
    instance: object
  ): void {
    if (this.workflows.has(definition.name)) {
      throw new DuplicateWorkflowError(definition.name, {
        existingWorkflow: this.workflows.get(definition.name),
      });
    }

    // Validate the workflow
    this.workflowValidator.validateWorkflow(definition);

    this.workflows.set(definition.name, definition);
    this.workflowInstances.set(definition.name, instance);

    this.logger.debug(`Registered workflow: ${definition.name}`);
  }

  /**
   * Clears all registered workflows (mainly for testing)
   */
  clearWorkflows(): void {
    this.workflows.clear();
    this.workflowInstances.clear();
  }
}
