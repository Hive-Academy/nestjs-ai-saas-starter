import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
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
import type { IMemoryAdapter } from '@hive-academy/langgraph-core';

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
    private readonly workflowValidator: WorkflowValidator,
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
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

    const registrationStartTime = Date.now();
    this.logger.log(
      `Registering ${workflowProviders.length} workflow providers`
    );

    // 🧠 MEMORY ENHANCEMENT: Store batch registration analytics
    await this.storeBatchRegistrationStart(workflowProviders.length);

    const registrationResults: Array<{
      workflowName: string;
      success: boolean;
      executionTime: number;
      error?: string;
    }> = [];

    for (const WorkflowClass of workflowProviders) {
      const workflowStartTime = Date.now();
      try {
        await this.registerWorkflowProvider(WorkflowClass);
        const executionTime = Date.now() - workflowStartTime;
        
        registrationResults.push({
          workflowName: WorkflowClass.name,
          success: true,
          executionTime
        });
        
        // 🧠 MEMORY LEARNING: Store individual workflow registration success
        await this.storeWorkflowRegistrationEvent(
          WorkflowClass.name,
          true,
          executionTime,
          {
            hasWorkflowMetadata: !!getWorkflowMetadata(WorkflowClass),
            registrationOrder: registrationResults.length
          }
        );
      } catch (error) {
        const executionTime = Date.now() - workflowStartTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        registrationResults.push({
          workflowName: WorkflowClass.name,
          success: false,
          executionTime,
          error: errorMessage
        });
        
        // 🧠 MEMORY LEARNING: Store registration failure patterns
        await this.storeWorkflowRegistrationEvent(
          WorkflowClass.name,
          false,
          executionTime,
          {
            errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
            errorMessage,
            registrationOrder: registrationResults.length
          }
        );
        
        this.logger.error(
          `Failed to register workflow provider ${WorkflowClass.name}:`,
          error
        );
        throw error;
      }
    }

    const totalRegistrationTime = Date.now() - registrationStartTime;
    
    // 🧠 MEMORY LEARNING: Store comprehensive batch registration analytics
    await this.storeBatchRegistrationComplete(
      workflowProviders.length,
      totalRegistrationTime,
      registrationResults
    );

    this.logger.log(
      `Successfully registered ${workflowProviders.length} workflow providers in ${totalRegistrationTime}ms`
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
      metadata: { ...(workflowMetadata || {}) },
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

    // 🧠 MEMORY ENHANCEMENT: Store workflow structure analytics for discovery optimization
    await this.storeWorkflowStructureAnalytics(
      workflowName,
      {
        totalTasks: taskMetadatas.length,
        hasEntrypoint: !!entrypointMetadata,
        complexityScore: this.calculateWorkflowComplexity(workflowDefinition),
        dependencyCount: Array.from(dependencies.values()).flat().length,
        taskNames: Array.from(tasks.keys()),
        metadata: (workflowMetadata as Record<string, unknown>) || {}
      }
    );

    this.logger.debug(
      `Registered workflow: ${workflowName} (${className}) with ${taskMetadatas.length} tasks`
    );
  }

  /**
   * Get all registered workflows
   */
  getWorkflows(): Map<string, FunctionalWorkflowDefinition> {
    // 🧠 MEMORY LEARNING: Track bulk workflow discovery usage
    this.storeWorkflowDiscoveryEvent('list_all', this.workflows.size);
    
    return new Map(this.workflows);
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): FunctionalWorkflowDefinition | undefined {
    const workflow = this.workflows.get(workflowId);
    
    // 🧠 MEMORY LEARNING: Track workflow access patterns for intelligent discovery
    if (workflow) {
      this.storeWorkflowAccessEvent(workflowId, 'found');
    } else {
      this.storeWorkflowAccessEvent(workflowId, 'not_found');
    }
    
    return workflow;
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
   * Get registration statistics enhanced with memory analytics
   */
  async getRegistrationStats() {
    const totalTasks = Array.from(this.workflows.values()).reduce(
      (sum, workflow) => sum + workflow.tasks.size,
      0
    );

    // 🧠 MEMORY ENHANCEMENT: Get intelligent workflow analytics
    const memoryAnalytics = await this.getWorkflowAnalytics();

    return {
      totalWorkflows: this.workflows.size,
      totalTasks,
      workflows: Array.from(this.workflows.keys()),
      
      // Memory-enhanced analytics
      analytics: memoryAnalytics,
      
      // Real-time complexity analysis
      complexityMetrics: {
        averageTasksPerWorkflow: this.workflows.size > 0 ? totalTasks / this.workflows.size : 0,
        mostComplexWorkflow: this.findMostComplexWorkflow(),
        simplestWorkflow: this.findSimplestWorkflow(),
        totalDependencies: this.calculateTotalDependencies()
      }
    };
  }

  // ============================================================================
  // MEMORY INTEGRATION - Workflow Registration Intelligence
  // ============================================================================

  /**
   * Store workflow registration event for learning and optimization
   */
  private async storeWorkflowRegistrationEvent(
    workflowName: string,
    success: boolean,
    executionTime: number,
    metadata: Record<string, unknown>
  ): Promise<void> {
    if (!this.memoryAdapter) {
      return;
    }

    try {
      const namespace = `workflows.registration.events.${workflowName}`;
      const timestamp = new Date().toISOString();
      
      const registrationEvent = {
        workflowName,
        timestamp,
        success,
        executionTime,
        metadata: {
          ...metadata,
          registrationTimestamp: timestamp,
          hour: new Date().getHours(),
          dayOfWeek: new Date().getDay()
        },
        
        // Performance classification
        performance: {
          speed: this.categorizeRegistrationSpeed(executionTime),
          efficient: executionTime < 1000, // < 1 second is efficient
          complexity: metadata.totalTasks ? 'complex' : 'simple'
        }
      };

      await this.memoryAdapter.store(
        namespace,
        JSON.stringify(registrationEvent),
        {
          type: success ? 'fact' : 'custom',
          source: success ? 'registration_success' : 'registration_failure',
          agentId: 'workflow_registration',
          userId: 'system',
          importance: success ? 0.6 : 0.8, // Failures are more important for learning
          persistent: true,
          tags: JSON.stringify([
            'workflow_registration',
            success ? 'success' : 'failure',
            workflowName,
            this.categorizeRegistrationSpeed(executionTime)
          ])
        }
      );

      this.logger.debug(`Stored workflow registration event`, {
        workflowName,
        success,
        executionTime
      });
    } catch (error) {
      this.handleMemoryError(
        'storeWorkflowRegistrationEvent',
        error,
        { workflowName, success, executionTime }
      );
    }
  }

  /**
   * Store batch registration start analytics
   */
  private async storeBatchRegistrationStart(
    workflowCount: number
  ): Promise<void> {
    if (!this.memoryAdapter) {
      return;
    }

    try {
      const namespace = 'workflows.registration.batch';
      const timestamp = new Date().toISOString();
      
      const batchStart = {
        type: 'batch_registration_start',
        timestamp,
        workflowCount,
        context: {
          hour: new Date().getHours(),
          existingWorkflows: this.workflows.size,
          totalTasksBefore: this.getTotalTaskCount()
        }
      };

      await this.memoryAdapter.store(
        namespace,
        JSON.stringify(batchStart),
        {
          type: 'context',
          source: 'batch_registration',
          agentId: 'workflow_registration',
          userId: 'system',
          importance: 0.5,
          persistent: false,
          tags: JSON.stringify(['batch_registration', 'start'])
        }
      );
    } catch (error) {
      this.handleMemoryError(
        'storeBatchRegistrationStart',
        error,
        { workflowCount }
      );
    }
  }

  /**
   * Store comprehensive batch registration completion analytics
   */
  private async storeBatchRegistrationComplete(
    workflowCount: number,
    totalTime: number,
    results: Array<{
      workflowName: string;
      success: boolean;
      executionTime: number;
      error?: string;
    }>
  ): Promise<void> {
    if (!this.memoryAdapter) {
      return;
    }

    try {
      const namespace = 'workflows.registration.performance';
      const timestamp = new Date().toISOString();
      
      const successfulRegistrations = results.filter(r => r.success);
      const failedRegistrations = results.filter(r => !r.success);
      
      const performanceAnalytics = {
        type: 'batch_registration_complete',
        timestamp,
        summary: {
          totalWorkflows: workflowCount,
          successful: successfulRegistrations.length,
          failed: failedRegistrations.length,
          successRate: workflowCount > 0 ? (successfulRegistrations.length / workflowCount) : 0,
          totalTime,
          averageTimePerWorkflow: workflowCount > 0 ? (totalTime / workflowCount) : 0
        },
        
        performance: {
          fastestRegistration: Math.min(...successfulRegistrations.map(r => r.executionTime)),
          slowestRegistration: Math.max(...successfulRegistrations.map(r => r.executionTime)),
          averageSuccessTime: successfulRegistrations.length > 0 ? 
            (successfulRegistrations.reduce((sum, r) => sum + r.executionTime, 0) / successfulRegistrations.length) : 0,
          totalWorkflowsAfterBatch: this.workflows.size
        },
        
        // Error patterns for learning
        errors: failedRegistrations.map(r => ({
          workflowName: r.workflowName,
          error: r.error,
          executionTime: r.executionTime
        })),
        
        // Context for pattern analysis
        context: {
          batchSize: workflowCount,
          registrationHour: new Date().getHours(),
          systemLoad: this.calculateSystemLoad(results)
        }
      };

      await this.memoryAdapter.store(
        namespace,
        JSON.stringify(performanceAnalytics),
        {
          type: 'summary',
          source: 'registration_analytics',
          agentId: 'workflow_registration',
          userId: 'system',
          importance: 0.7,
          persistent: true,
          tags: JSON.stringify([
            'batch_registration',
            'performance_analytics',
            `success_rate_${Math.floor(performanceAnalytics.summary.successRate * 100)}`,
            this.categorizeBatchSize(workflowCount)
          ])
        }
      );

      this.logger.debug(`Stored batch registration analytics`, {
        workflowCount,
        successRate: performanceAnalytics.summary.successRate,
        totalTime
      });
    } catch (error) {
      this.handleMemoryError(
        'storeBatchRegistrationComplete',
        error,
        { workflowCount, totalTime }
      );
    }
  }

  /**
   * Store workflow structure analytics for discovery optimization
   */
  private async storeWorkflowStructureAnalytics(
    workflowName: string,
    structure: {
      totalTasks: number;
      hasEntrypoint: boolean;
      complexityScore: number;
      dependencyCount: number;
      taskNames: string[];
      metadata: Record<string, unknown>;
    }
  ): Promise<void> {
    if (!this.memoryAdapter) {
      return;
    }

    try {
      const namespace = `workflows.registration.structure.${workflowName}`;
      const timestamp = new Date().toISOString();
      
      const structureAnalytics = {
        workflowName,
        timestamp,
        structure: {
          ...structure,
          
          // Derived analytics
          taskDensity: structure.dependencyCount > 0 ? 
            (structure.totalTasks / structure.dependencyCount) : structure.totalTasks,
          complexityCategory: this.categorizeComplexity(structure.complexityScore),
          hasDependencies: structure.dependencyCount > 0,
          taskVariety: new Set(structure.taskNames.map(name => 
            name.replace(/[0-9]+/g, '')  // Remove numbers to find patterns
          )).size
        },
        
        // Discovery optimization hints
        discoveryHints: {
          searchKeywords: this.extractSearchKeywords(workflowName, structure.taskNames),
          category: this.categorizeWorkflowType(workflowName, structure.taskNames),
          usagePattern: this.predictUsagePattern(structure),
          priority: this.calculateDiscoveryPriority(structure)
        }
      };

      await this.memoryAdapter.store(
        namespace,
        JSON.stringify(structureAnalytics),
        {
          type: 'fact',
          source: 'structure_analysis',
          agentId: 'workflow_registration',
          userId: 'system',
          importance: 0.6,
          persistent: true,
          tags: JSON.stringify([
            'workflow_structure',
            workflowName,
            structureAnalytics.structure.complexityCategory,
            structureAnalytics.discoveryHints.category,
            `tasks_${structure.totalTasks}`,
            `complexity_${Math.floor(structure.complexityScore)}`
          ])
        }
      );

      this.logger.debug(`Stored workflow structure analytics`, {
        workflowName,
        complexityScore: structure.complexityScore,
        totalTasks: structure.totalTasks
      });
    } catch (error) {
      this.handleMemoryError(
        'storeWorkflowStructureAnalytics',
        error,
        { workflowName, structure }
      );
    }
  }

  /**
   * Store workflow access patterns for intelligent discovery
   */
  private async storeWorkflowAccessEvent(
    workflowId: string,
    accessResult: 'found' | 'not_found'
  ): Promise<void> {
    if (!this.memoryAdapter) {
      return;
    }

    try {
      const namespace = `workflows.registration.usage.${workflowId}`;
      const timestamp = new Date().toISOString();
      
      const accessEvent = {
        workflowId,
        timestamp,
        accessResult,
        context: {
          hour: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
          totalRegisteredWorkflows: this.workflows.size
        }
      };

      await this.memoryAdapter.store(
        namespace,
        JSON.stringify(accessEvent),
        {
          type: 'context',
          source: 'workflow_access',
          agentId: 'workflow_registration',
          userId: 'system',
          importance: accessResult === 'found' ? 0.4 : 0.6, // Not found events are more important
          persistent: false,
          tags: JSON.stringify([
            'workflow_access',
            accessResult,
            workflowId
          ])
        }
      );
    } catch (error) {
      this.handleMemoryError(
        'storeWorkflowAccessEvent',
        error,
        { workflowId, accessResult }
      );
    }
  }

  /**
   * Store workflow discovery patterns
   */
  private async storeWorkflowDiscoveryEvent(
    discoveryType: 'list_all' | 'search' | 'specific_lookup',
    resultCount: number,
    searchTerm?: string
  ): Promise<void> {
    if (!this.memoryAdapter) {
      return;
    }

    try {
      const namespace = 'workflows.registration.discovery';
      const timestamp = new Date().toISOString();
      
      const discoveryEvent = {
        type: 'workflow_discovery',
        discoveryType,
        timestamp,
        resultCount,
        searchTerm,
        context: {
          hour: new Date().getHours(),
          totalWorkflows: this.workflows.size,
          discoveryEfficiency: resultCount > 0 ? 'successful' : 'unsuccessful'
        }
      };

      await this.memoryAdapter.store(
        namespace,
        JSON.stringify(discoveryEvent),
        {
          type: 'context',
          source: 'discovery_pattern',
          agentId: 'workflow_registration',
          userId: 'system',
          importance: 0.5,
          persistent: false,
          tags: JSON.stringify([
            'workflow_discovery',
            discoveryType,
            resultCount > 0 ? 'successful' : 'unsuccessful'
          ])
        }
      );
    } catch (error) {
      this.handleMemoryError(
        'storeWorkflowDiscoveryEvent',
        error,
        { discoveryType, resultCount }
      );
    }
  }

  /**
   * Get comprehensive workflow analytics from memory
   */
  private async getWorkflowAnalytics(): Promise<Record<string, unknown>> {
    if (!this.memoryAdapter) {
      return { memoryStatus: 'unavailable' };
    }

    try {
      // Get registration performance patterns
      const registrationPerformance = await this.memoryAdapter.search({
        query: 'batch registration performance',
        agentId: 'workflow_registration',
        limit: 10,
        namespace: ['workflows', 'registration', 'performance']
      });

      // Get access patterns
      const accessPatterns = await this.memoryAdapter.search({
        query: 'workflow access pattern',
        agentId: 'workflow_registration',
        limit: 20,
        namespace: ['workflows', 'registration', 'usage']
      });

      // Get discovery analytics
      const discoveryPatterns = await this.memoryAdapter.search({
        query: 'workflow discovery pattern',
        agentId: 'workflow_registration',
        limit: 15,
        namespace: ['workflows', 'registration', 'discovery']
      });

      return {
        memoryStatus: 'available',
        analytics: {
          registrationPerformance: this.analyzeRegistrationPerformance(registrationPerformance),
          accessPatterns: this.analyzeAccessPatterns(accessPatterns),
          discoveryPatterns: this.analyzeDiscoveryPatterns(discoveryPatterns),
          totalMemoryEntries: registrationPerformance.length + accessPatterns.length + discoveryPatterns.length
        },
        insights: {
          mostAccessedWorkflows: this.extractMostAccessedWorkflows(accessPatterns),
          performanceBottlenecks: this.identifyPerformanceBottlenecks(registrationPerformance),
          discoveryTrends: this.extractDiscoveryTrends(discoveryPatterns)
        }
      };
    } catch (error) {
      return this.handleMemoryError(
        'getWorkflowAnalytics',
        error,
        {}
      );
    }
  }

  // ============================================================================
  // HELPER METHODS - Analysis and Classification
  // ============================================================================

  private calculateWorkflowComplexity(definition: FunctionalWorkflowDefinition): number {
    const taskCount = definition.tasks.size;
    const dependencyCount = Array.from(definition.dependencies.values()).flat().length;
    const hasErrorHandlers = definition.errorHandlers.size > 0;
    
    // Complex formula: tasks + dependencies + error handling bonus
    return taskCount + (dependencyCount * 1.5) + (hasErrorHandlers ? 5 : 0);
  }

  private categorizeRegistrationSpeed(executionTime: number): string {
    if (executionTime < 500) return 'very_fast';
    if (executionTime < 1000) return 'fast';
    if (executionTime < 3000) return 'moderate';
    if (executionTime < 10000) return 'slow';
    return 'very_slow';
  }

  private categorizeComplexity(complexityScore: number): string {
    if (complexityScore < 5) return 'simple';
    if (complexityScore < 15) return 'moderate';
    if (complexityScore < 30) return 'complex';
    return 'very_complex';
  }

  private categorizeBatchSize(count: number): string {
    if (count === 1) return 'single';
    if (count < 5) return 'small_batch';
    if (count < 20) return 'medium_batch';
    return 'large_batch';
  }

  private extractSearchKeywords(workflowName: string, taskNames: string[]): string[] {
    const keywords: string[] = [];
    
    // Extract from workflow name
    keywords.push(...workflowName.toLowerCase().split(/[_-]/));
    
    // Extract common patterns from task names
    const taskPatterns = taskNames.map(name => 
      name.toLowerCase().replace(/[0-9]+/g, '').split(/[_-]/)
    ).flat();
    
    // Find most common task patterns
    const patternCounts = taskPatterns.reduce((counts, pattern) => {
      if (pattern.length > 2) { // Only meaningful patterns
        counts[pattern] = (counts[pattern] || 0) + 1;
      }
      return counts;
    }, {} as Record<string, number>);
    
    // Add most frequent patterns
    Object.entries(patternCounts)
      .filter(([_, count]) => count > 1)
      .map(([pattern]) => pattern)
      .forEach(pattern => keywords.push(pattern));
    
    return [...new Set(keywords)]; // Remove duplicates
  }

  private categorizeWorkflowType(workflowName: string, taskNames: string[]): string {
    const name = workflowName.toLowerCase();
    const tasks = taskNames.join(' ').toLowerCase();
    
    if (name.includes('test') || tasks.includes('test')) return 'testing';
    if (name.includes('data') || tasks.includes('process')) return 'data_processing';
    if (name.includes('auth') || tasks.includes('auth')) return 'authentication';
    if (name.includes('api') || tasks.includes('api')) return 'api_integration';
    if (name.includes('notification') || tasks.includes('notify')) return 'notification';
    if (name.includes('report') || tasks.includes('report')) return 'reporting';
    
    return 'general';
  }

  private predictUsagePattern(structure: {
    totalTasks: number;
    complexityScore: number;
    hasEntrypoint: boolean;
  }): string {
    if (!structure.hasEntrypoint) return 'utility';
    if (structure.complexityScore > 20) return 'infrequent_complex';
    if (structure.totalTasks < 3) return 'frequent_simple';
    return 'moderate_usage';
  }

  private calculateDiscoveryPriority(structure: {
    totalTasks: number;
    complexityScore: number;
    hasEntrypoint: boolean;
  }): number {
    let priority = 0.5; // Base priority
    
    if (structure.hasEntrypoint) priority += 0.2;
    if (structure.totalTasks > 1) priority += 0.1;
    if (structure.complexityScore < 10) priority += 0.1; // Simple workflows are more discoverable
    if (structure.complexityScore > 25) priority -= 0.2; // Very complex workflows are less discoverable
    
    return Math.max(0, Math.min(1, priority));
  }

  private getTotalTaskCount(): number {
    return Array.from(this.workflows.values()).reduce(
      (sum, workflow) => sum + workflow.tasks.size,
      0
    );
  }

  private calculateSystemLoad(results: Array<{ executionTime: number }>): string {
    const avgTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;
    
    if (avgTime < 1000) return 'low';
    if (avgTime < 3000) return 'moderate';
    return 'high';
  }

  private findMostComplexWorkflow(): string | null {
    let maxComplexity = 0;
    let mostComplex: string | null = null;
    
    for (const [name, definition] of this.workflows) {
      const complexity = this.calculateWorkflowComplexity(definition);
      if (complexity > maxComplexity) {
        maxComplexity = complexity;
        mostComplex = name;
      }
    }
    
    return mostComplex;
  }

  private findSimplestWorkflow(): string | null {
    let minComplexity = Infinity;
    let simplest: string | null = null;
    
    for (const [name, definition] of this.workflows) {
      const complexity = this.calculateWorkflowComplexity(definition);
      if (complexity < minComplexity) {
        minComplexity = complexity;
        simplest = name;
      }
    }
    
    return simplest;
  }

  private calculateTotalDependencies(): number {
    return Array.from(this.workflows.values()).reduce(
      (sum, workflow) => sum + Array.from(workflow.dependencies.values()).flat().length,
      0
    );
  }

  // ============================================================================
  // MEMORY ANALYTICS PROCESSING
  // ============================================================================

  private analyzeRegistrationPerformance(memories: any[]): Record<string, unknown> {
    if (memories.length === 0) return { status: 'no_data' };
    
    try {
      const performanceData = memories
        .map(memory => {
          try {
            return typeof memory === 'string' ? JSON.parse(memory) : memory;
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      const avgTime = performanceData.reduce((sum, data) => 
        sum + (data.summary?.averageTimePerWorkflow || 0), 0) / performanceData.length;
      
      const avgSuccessRate = performanceData.reduce((sum, data) => 
        sum + (data.summary?.successRate || 0), 0) / performanceData.length;

      return {
        status: 'analyzed',
        averageRegistrationTime: avgTime,
        averageSuccessRate: avgSuccessRate,
        totalBatches: performanceData.length,
        lastRegistration: performanceData[0]?.timestamp
      };
    } catch (error) {
      return { status: 'analysis_error', error: String(error) };
    }
  }

  private analyzeAccessPatterns(memories: any[]): Record<string, unknown> {
    if (memories.length === 0) return { status: 'no_data' };
    
    try {
      const accessData = memories
        .map(memory => {
          try {
            return typeof memory === 'string' ? JSON.parse(memory) : memory;
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      const workflowAccess = accessData.reduce((counts, access) => {
        const workflow = access.workflowId;
        if (workflow) {
          counts[workflow] = (counts[workflow] || 0) + 1;
        }
        return counts;
      }, {} as Record<string, number>);

      const successfulAccess = accessData.filter(access => access.accessResult === 'found').length;
      const successRate = accessData.length > 0 ? (successfulAccess / accessData.length) : 0;

      return {
        status: 'analyzed',
        totalAccesses: accessData.length,
        successRate,
        mostAccessedWorkflows: Object.entries(workflowAccess)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 5)
          .map(([workflow, count]) => ({ workflow, count }))
      };
    } catch (error) {
      return { status: 'analysis_error', error: String(error) };
    }
  }

  private analyzeDiscoveryPatterns(memories: any[]): Record<string, unknown> {
    if (memories.length === 0) return { status: 'no_data' };
    
    try {
      const discoveryData = memories
        .map(memory => {
          try {
            return typeof memory === 'string' ? JSON.parse(memory) : memory;
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      const discoveryTypes = discoveryData.reduce((counts, discovery) => {
        const type = discovery.discoveryType;
        if (type) {
          counts[type] = (counts[type] || 0) + 1;
        }
        return counts;
      }, {} as Record<string, number>);

      const successfulDiscoveries = discoveryData.filter(d => 
        d.context?.discoveryEfficiency === 'successful').length;
      const discoverySuccessRate = discoveryData.length > 0 ? 
        (successfulDiscoveries / discoveryData.length) : 0;

      return {
        status: 'analyzed',
        totalDiscoveries: discoveryData.length,
        discoverySuccessRate,
        discoveryTypes,
        mostCommonDiscoveryType: Object.entries(discoveryTypes)
          .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0]
      };
    } catch (error) {
      return { status: 'analysis_error', error: String(error) };
    }
  }

  private extractMostAccessedWorkflows(memories: any[]): string[] {
    try {
      const accessCounts = memories
        .map(memory => {
          try {
            return typeof memory === 'string' ? JSON.parse(memory) : memory;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .reduce((counts, access) => {
          if (access.workflowId && access.accessResult === 'found') {
            counts[access.workflowId] = (counts[access.workflowId] || 0) + 1;
          }
          return counts;
        }, {} as Record<string, number>);

      return Object.entries(accessCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([workflow]) => workflow);
    } catch {
      return [];
    }
  }

  private identifyPerformanceBottlenecks(memories: any[]): string[] {
    try {
      const bottlenecks: string[] = [];
      
      const performanceData = memories
        .map(memory => {
          try {
            return typeof memory === 'string' ? JSON.parse(memory) : memory;
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      // Identify slow average times
      const slowBatches = performanceData.filter(data => 
        (data.summary?.averageTimePerWorkflow || 0) > 5000);
      
      if (slowBatches.length > 0) {
        bottlenecks.push('slow_registration_times');
      }

      // Identify low success rates
      const lowSuccessRates = performanceData.filter(data => 
        (data.summary?.successRate || 1) < 0.8);
      
      if (lowSuccessRates.length > 0) {
        bottlenecks.push('registration_failures');
      }

      return bottlenecks;
    } catch {
      return [];
    }
  }

  private extractDiscoveryTrends(memories: any[]): Record<string, unknown> {
    try {
      const discoveryData = memories
        .map(memory => {
          try {
            return typeof memory === 'string' ? JSON.parse(memory) : memory;
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      const hourlyPattern = discoveryData.reduce((hours, discovery) => {
        const hour = discovery.context?.hour;
        if (typeof hour === 'number') {
          hours[hour] = (hours[hour] || 0) + 1;
        }
        return hours;
      }, {} as Record<number, number>);

      const peakHour = Object.entries(hourlyPattern)
        .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0];

      return {
        hourlyPattern,
        peakDiscoveryHour: peakHour ? parseInt(peakHour) : null,
        totalDiscoveries: discoveryData.length
      };
    } catch {
      return { status: 'analysis_error' };
    }
  }

  /**
   * Graceful error handling for memory operations
   */
  private handleMemoryError(
    operation: string,
    error: unknown,
    context: Record<string, unknown>
  ): Record<string, unknown> {
    this.logger.error(
      `Memory operation '${operation}' failed - continuing with degraded functionality`,
      {
        error: error instanceof Error ? error.message : String(error),
        context
      }
    );
    // Return empty object for graceful degradation
    return {};
  }
}
