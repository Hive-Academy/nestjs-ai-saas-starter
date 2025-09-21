import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { AgentRegistration } from './agent-registration.service';
import { AgentRegistrationService } from './agent-registration.service';
import { isAgentConfigWithType } from '../utils/type-guards';

/**
 * Agent instance with runtime information
 */
export interface AgentInstance {
  /** Agent identifier */
  id: string;
  /** Agent configuration */
  config: AgentRegistration['config'];
  /** Agent instance */
  instance: any;
  /** Agent capabilities */
  capabilities: AgentRegistration['capabilities'];
  /** Agent metadata */
  metadata: AgentRegistration['metadata'] & {
    /** Instance creation timestamp */
    createdAt: Date;
    /** Instance last used timestamp */
    lastUsed?: Date;
    /** Instance usage count */
    usageCount: number;
  };
  /** Internal workflow executor (for workflow agents) */
  internalWorkflowExecutor?: (state: any) => Promise<any>;
}

/**
 * Service responsible for resolving and managing agent instances.
 * Handles instance creation, caching, and lifecycle management.
 */
@Injectable()
export class AgentResolutionService {
  private readonly logger = new Logger(AgentResolutionService.name);
  
  /** Cache of instantiated agents */
  private readonly instanceCache = new Map<string, AgentInstance>();

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly agentRegistration: AgentRegistrationService
  ) {}

  /**
   * Resolve an agent instance by ID
   */
  async resolveAgent(agentId: string): Promise<AgentInstance> {
    // Check cache first
    if (this.instanceCache.has(agentId)) {
      const instance = this.instanceCache.get(agentId)!;
      instance.metadata.lastUsed = new Date();
      instance.metadata.usageCount++;
      this.updateAgentAccessMetadata(agentId);
      return instance;
    }

    // Get registration
    const registration = this.agentRegistration.getAgentRegistration(agentId);
    if (!registration) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    try {
      // Create agent instance
      const agentInstance = await this.createAgentInstance(registration);
      
      // Create internal workflow executor for workflow agents
      let internalWorkflowExecutor: AgentInstance['internalWorkflowExecutor'];
      if (isAgentConfigWithType(registration.config, 'workflow-agent') && registration.internalWorkflow) {
        internalWorkflowExecutor = this.createInternalWorkflowExecutor(
          agentInstance,
          registration.internalWorkflow
        );
      }

      // Create agent instance wrapper
      const instance: AgentInstance = {
        id: agentId,
        config: registration.config,
        instance: agentInstance,
        capabilities: registration.capabilities,
        metadata: {
          ...registration.metadata,
          createdAt: new Date(),
          usageCount: 1,
          lastUsed: new Date(),
        },
        internalWorkflowExecutor,
      };

      // Cache the instance
      this.instanceCache.set(agentId, instance);
      this.updateAgentAccessMetadata(agentId);

      this.logger.debug(`Created and cached agent instance: ${agentId}`);
      return instance;
    } catch (error) {
      this.logger.error(`Failed to resolve agent ${agentId}:`, error);
      this.agentRegistration.updateAgentMetadata(agentId, {
        errorCount: (registration.metadata.errorCount || 0) + 1,
      });
      throw error;
    }
  }

  /**
   * Get cached agent instance if available
   */
  getCachedAgent(agentId: string): AgentInstance | undefined {
    return this.instanceCache.get(agentId);
  }

  /**
   * Check if agent instance is cached
   */
  isAgentCached(agentId: string): boolean {
    return this.instanceCache.has(agentId);
  }

  /**
   * Remove agent from cache
   */
  evictAgent(agentId: string): boolean {
    return this.instanceCache.delete(agentId);
  }

  /**
   * Clear instance cache
   */
  clearInstanceCache(): void {
    this.instanceCache.clear();
    this.logger.debug('Cleared agent instance cache');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    cachedInstances: number;
    totalUsage: number;
    averageUsagePerInstance: number;
    cacheHitRate: number;
  } {
    let totalUsage = 0;
    let totalRequests = 0;

    for (const instance of this.instanceCache.values()) {
      totalUsage += instance.metadata.usageCount;
      totalRequests += instance.metadata.accessCount || 0;
    }

    const averageUsagePerInstance = this.instanceCache.size > 0 
      ? totalUsage / this.instanceCache.size 
      : 0;
    
    const cacheHitRate = totalRequests > 0 
      ? (totalUsage - this.instanceCache.size) / totalRequests 
      : 0;

    return {
      cachedInstances: this.instanceCache.size,
      totalUsage,
      averageUsagePerInstance,
      cacheHitRate: Math.max(0, cacheHitRate),
    };
  }

  /**
   * Get all cached instances
   */
  getAllCachedInstances(): AgentInstance[] {
    return Array.from(this.instanceCache.values());
  }

  /**
   * Cleanup stale instances
   */
  cleanupStaleInstances(maxAgeMs = 3600000): number { // 1 hour default
    const now = Date.now();
    let cleanedCount = 0;

    for (const [agentId, instance] of this.instanceCache.entries()) {
      const lastUsed = instance.metadata.lastUsed?.getTime() || instance.metadata.createdAt.getTime();
      if (now - lastUsed > maxAgeMs) {
        this.instanceCache.delete(agentId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} stale agent instances`);
    }

    return cleanedCount;
  }

  /**
   * Create agent instance using dependency injection
   */
  private async createAgentInstance(registration: AgentRegistration): Promise<any> {
    try {
      const instance = await this.moduleRef.create(registration.agentClass);
      return instance;
    } catch (error) {
      this.logger.error(`Failed to create instance for agent ${registration.id}:`, error);
      throw error;
    }
  }

  /**
   * Create internal workflow executor for workflow agents
   */
  private createInternalWorkflowExecutor(
    agentInstance: any,
    workflowDefinition: any
  ): (state: any) => Promise<any> {
    return async (state: any) => {
      const startTime = Date.now();
      let currentStep = workflowDefinition.entryPoint;
      let stepCount = 0;
      const maxSteps = 50; // Prevent infinite loops
      let result = { ...state };

      try {
        while (currentStep && stepCount < maxSteps) {
          stepCount++;
          
          const stepDef = workflowDefinition.steps.find((s: any) => s.id === currentStep);
          if (!stepDef) {
            throw new Error(`Step ${currentStep} not found in workflow`);
          }

          const stepMethod = agentInstance[stepDef.methodName];
          if (!stepMethod || typeof stepMethod !== 'function') {
            throw new Error(`Method ${stepDef.methodName} not found or not a function`);
          }

          this.logger.debug(`Executing step ${currentStep} (${stepDef.methodName})`);

          let stepResult: any;
          try {
            if (stepDef.timeout) {
              stepResult = await Promise.race([
                stepMethod.call(agentInstance, result),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error(`Step ${currentStep} timed out`)), stepDef.timeout)
                ),
              ]);
            } else {
              stepResult = await stepMethod.call(agentInstance, result);
            }
          } catch (stepError) {
            this.logger.error(`Step ${currentStep} failed:`, stepError);
            throw stepError;
          }

          // Update result state
          if (stepResult && typeof stepResult === 'object') {
            if (stepResult.state) {
              result = { ...result, ...stepResult.state };
            } else {
              result = { ...result, ...stepResult };
            }
          }

          // Determine next step
          currentStep = this.determineNextStep(workflowDefinition, currentStep, result);
        }

        if (stepCount >= maxSteps) {
          throw new Error(`Workflow exceeded maximum steps (${maxSteps})`);
        }

        const executionTime = Date.now() - startTime;
        this.logger.debug(`Workflow execution completed in ${executionTime}ms with ${stepCount} steps`);

        return {
          ...result,
          _workflowExecution: {
            steps: stepCount,
            executionTime,
            success: true,
          },
        };
      } catch (error) {
        const executionTime = Date.now() - startTime;
        this.logger.error(`Workflow execution failed after ${executionTime}ms:`, error);
        
        return {
          ...result,
          _workflowExecution: {
            steps: stepCount,
            executionTime,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    };
  }

  /**
   * Determine next step in workflow
   */
  private determineNextStep(workflowDefinition: any, currentStep: string, state: any): string | undefined {
    // Simple linear progression for now
    const currentIndex = workflowDefinition.steps.findIndex((s: any) => s.id === currentStep);
    if (currentIndex >= 0 && currentIndex < workflowDefinition.steps.length - 1) {
      return workflowDefinition.steps[currentIndex + 1].id;
    }
    return undefined; // End of workflow
  }

  /**
   * Update agent access metadata
   */
  private updateAgentAccessMetadata(agentId: string): void {
    this.agentRegistration.updateAgentMetadata(agentId, {
      lastAccessed: new Date(),
      accessCount: (this.agentRegistration.getAgentRegistration(agentId)?.metadata.accessCount || 0) + 1,
    });
  }
}