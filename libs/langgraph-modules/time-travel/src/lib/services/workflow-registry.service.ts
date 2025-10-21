import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { normalizeNodeId } from '@hive-academy/langgraph-core';

/**
 * Auto-registration event payload interface
 */
interface WorkflowAutoRegistrationEvent {
  name: string;
  instance: {
    [key: string]: (...args: unknown[]) => unknown;
  };
  metadata: {
    autoRegistered: boolean;
    package: string;
    domain: string;
    entrypoint: string;
    originalOptions: Record<string, unknown>;
    [key: string]: unknown;
  };
}

/**
 * Interface for workflow metadata
 */
interface WorkflowMetadata {
  domain: string;
  description?: string;
  entrypoint?: string;
  tasks?: string[];
  streaming?: boolean;
  hitl?: boolean;
  multiAgent?: boolean;
  registeredAt?: string;
  registrationType?: string;
  [key: string]: unknown;
}

/**
 * Service responsible for workflow registration and discovery
 * Handles both manual and automatic workflow registration
 */
@Injectable()
export class WorkflowRegistryService {
  private readonly logger = new Logger(WorkflowRegistryService.name);
  private readonly workflowRegistry: Map<string, unknown> = new Map();

  /**
   * Auto-registration event listener
   * Automatically registers workflows when they emit registration events
   */
  @OnEvent('workflow.auto-register')
  async handleWorkflowAutoRegistration(
    payload: WorkflowAutoRegistrationEvent
  ): Promise<void> {
    try {
      await this.registerWorkflow({
        name: payload.name,
        instance: payload.instance,
        metadata: {
          ...payload.metadata,
          registeredAt: new Date().toISOString(),
          registrationType: 'auto-registration',
        },
      });

      this.logger.log(
        `🚀 Auto-registered workflow '${payload.name}' from package '${payload.metadata.package}'`
      );
    } catch (error) {
      this.logger.error(
        `Failed to auto-register workflow '${payload.name}':`,
        error
      );
      // Don't throw - graceful degradation
    }
  }

  /**
   * Enhanced workflow registration (supports both manual and auto)
   */
  async registerWorkflow(registration: {
    name: string;
    instance: {
      [key: string]: (...args: unknown[]) => unknown;
    };
    metadata: WorkflowMetadata;
  }): Promise<void> {
    // Normalize workflow name using Node ID standard
    const normalizedName = normalizeNodeId(registration.name);

    this.workflowRegistry.set(normalizedName, {
      name: registration.name,
      instance: registration.instance,
      metadata: {
        ...registration.metadata,
        nodeId: normalizedName,
        registeredAt:
          registration.metadata.registeredAt || new Date().toISOString(),
      },
    });

    this.logger.log(
      `Workflow '${registration.name}' registered for time travel debugging (${
        registration.metadata.registrationType || 'manual'
      })`
    );
  }

  /**
   * Manually register a workflow
   */
  async registerWorkflowManually(
    name: string,
    instance: {
      [key: string]: (...args: unknown[]) => unknown;
    },
    metadata: Partial<WorkflowMetadata> = {}
  ): Promise<void> {
    await this.registerWorkflow({
      name,
      instance,
      metadata: {
        domain: metadata.domain || 'unknown',
        entrypoint: metadata.entrypoint || 'execute',
        registrationType: 'manual',
        ...metadata,
      },
    });
  }

  /**
   * Unregister a workflow
   */
  unregisterWorkflow(name: string): boolean {
    const normalizedName = normalizeNodeId(name);
    const existed = this.workflowRegistry.has(normalizedName);

    if (existed) {
      this.workflowRegistry.delete(normalizedName);
      this.logger.log(`Workflow '${name}' unregistered from time travel`);
    }

    return existed;
  }

  /**
   * Get workflow instance by name
   */
  getWorkflow(name: string): {
    [key: string]: (...args: unknown[]) => unknown;
  } | null {
    const normalizedName = normalizeNodeId(name);
    const registration = this.workflowRegistry.get(normalizedName);
    const typedRegistration = registration as {
      instance: { [key: string]: (...args: unknown[]) => unknown };
      metadata: WorkflowMetadata;
    };
    return typedRegistration ? typedRegistration.instance : null;
  }

  /**
   * Get workflow metadata by name
   */
  getWorkflowMetadata(name: string): WorkflowMetadata | null {
    const normalizedName = normalizeNodeId(name);
    const registration = this.workflowRegistry.get(normalizedName);
    const typedRegistration = registration as {
      instance: { [key: string]: (...args: unknown[]) => unknown };
      metadata: WorkflowMetadata;
    };
    return typedRegistration ? typedRegistration.metadata : null;
  }

  /**
   * Get full workflow registration by name
   */
  getWorkflowRegistration(name: string): {
    name: string;
    instance: {
      [key: string]: (...args: unknown[]) => unknown;
    };
    metadata: WorkflowMetadata;
  } | null {
    const normalizedName = normalizeNodeId(name);
    const registration = this.workflowRegistry.get(normalizedName);
    return (
      (registration as {
        name: string;
        instance: { [key: string]: (...args: unknown[]) => unknown };
        metadata: WorkflowMetadata;
      }) || null
    );
  }

  /**
   * Get available workflows (for debugging UI)
   */
  getAvailableWorkflows(): string[] {
    return Array.from(this.workflowRegistry.keys());
  }

  /**
   * Get all workflow registrations
   */
  getAllWorkflows(): Array<{
    name: string;
    instance: {
      [key: string]: (...args: unknown[]) => unknown;
    };
    metadata: WorkflowMetadata;
  }> {
    return Array.from(this.workflowRegistry.values()) as {
      name: string;
      instance: { [key: string]: (...args: unknown[]) => unknown };
      metadata: WorkflowMetadata;
    }[];
  }

  /**
   * Get workflow statistics
   */
  getWorkflowStats(): {
    totalWorkflows: number;
    autoRegistered: number;
    manuallyRegistered: number;
    byDomain: Record<string, number>;
    byPackage: Record<string, number>;
  } {
    const workflows = this.getAllWorkflows();

    const stats = {
      totalWorkflows: workflows.length,
      autoRegistered: 0,
      manuallyRegistered: 0,
      byDomain: {} as Record<string, number>,
      byPackage: {} as Record<string, number>,
    };

    for (const workflow of workflows) {
      // Count registration types
      if (workflow.metadata.registrationType === 'auto-registration') {
        stats.autoRegistered++;
      } else {
        stats.manuallyRegistered++;
      }

      // Count by domain
      const domain = workflow.metadata.domain || 'unknown';
      stats.byDomain[domain] = (stats.byDomain[domain] || 0) + 1;

      // Count by package (for auto-registered workflows)
      if (workflow.metadata.package) {
        const packageName = workflow.metadata.package as string;
        stats.byPackage[packageName] = (stats.byPackage[packageName] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Check if a workflow is registered
   */
  isRegistered(name: string): boolean {
    const normalizedName = normalizeNodeId(name);
    return this.workflowRegistry.has(normalizedName);
  }

  /**
   * Search workflows by criteria
   */
  searchWorkflows(criteria: {
    domain?: string;
    package?: string;
    registrationType?: 'auto-registration' | 'manual';
    hasFeature?: 'streaming' | 'hitl' | 'multiAgent';
  }): Array<{
    name: string;
    instance: {
      [key: string]: (...args: unknown[]) => unknown;
    };
    metadata: WorkflowMetadata;
  }> {
    const workflows = this.getAllWorkflows();

    return workflows.filter((workflow) => {
      // Filter by domain
      if (criteria.domain && workflow.metadata.domain !== criteria.domain) {
        return false;
      }

      // Filter by package
      if (criteria.package && workflow.metadata.package !== criteria.package) {
        return false;
      }

      // Filter by registration type
      if (
        criteria.registrationType &&
        workflow.metadata.registrationType !== criteria.registrationType
      ) {
        return false;
      }

      // Filter by features
      if (criteria.hasFeature) {
        const hasFeature = workflow.metadata[criteria.hasFeature] === true;
        if (!hasFeature) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clearAll(): void {
    const count = this.workflowRegistry.size;
    this.workflowRegistry.clear();
    this.logger.log(`Cleared ${count} workflow registrations`);
  }

  /**
   * Get registry as Map (for internal use by other services)
   */
  getRegistryMap(): Map<string, unknown> {
    return this.workflowRegistry;
  }

  /**
   * Validate workflow registration
   */
  validateWorkflow(name: string): {
    valid: boolean;
    issues: string[];
  } {
    const registration = this.getWorkflowRegistration(name);
    const issues: string[] = [];

    if (!registration) {
      return {
        valid: false,
        issues: ['Workflow not found in registry'],
      };
    }

    // Check if instance exists
    if (!registration.instance) {
      issues.push('Workflow instance is null or undefined');
    }

    // Check if entrypoint method exists
    const entrypoint = registration.metadata.entrypoint || 'execute';
    if (
      registration.instance &&
      typeof registration.instance[entrypoint] !== 'function'
    ) {
      issues.push(
        `Entrypoint method '${entrypoint}' not found or is not a function`
      );
    }

    // Check required metadata
    if (!registration.metadata.domain) {
      issues.push('Workflow metadata missing domain');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}
