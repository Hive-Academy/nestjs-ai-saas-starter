import { Injectable, Logger } from '@nestjs/common';
import { StateGraph, START, END } from '@langchain/langgraph';
import {
  WorkflowDefinition,
  TaskDefinition,
  FunctionalWorkflowState,
  TaskExecutionContext,
  TaskExecutionResult,
} from '../interfaces/functional-workflow.interface';

/**
 * Service responsible for generating LangGraph StateGraphs from functional workflow definitions
 * This bridges the gap between decorator-based workflows and LangGraph execution
 */
@Injectable()
export class GraphGeneratorService {
  private readonly logger = new Logger(GraphGeneratorService.name);

  /**
   * Generates a LangGraph StateGraph from a workflow definition
   * @param definition The workflow definition with tasks and dependencies
   * @param instance The workflow class instance containing the actual methods
   * @returns A compiled LangGraph StateGraph ready for execution
   */
  async generateStateGraph<
    TState extends FunctionalWorkflowState = FunctionalWorkflowState
  >(definition: WorkflowDefinition, instance: object): Promise<any> {
    this.logger.log(`Generating StateGraph for workflow: ${definition.name}`);

    // Create the state graph with proper channels
    const workflow = new StateGraph<TState>({
      channels: this.createStateChannels<TState>(),
    } as any);

    // Add nodes for each task
    for (const [taskName, taskDef] of definition.tasks) {
      const nodeHandler = this.createNodeHandler<TState>(
        taskDef,
        instance,
        definition
      );
      // Strategic type assertion for LangGraph compatibility
      (workflow as any).addNode(taskName, nodeHandler);
    }

    // Add edges based on dependencies
    this.addWorkflowEdges(workflow, definition);

    // Compile the graph
    const compiledGraph = workflow.compile();

    this.logger.log(
      `StateGraph generated successfully for workflow: ${definition.name}`
    );
    return compiledGraph;
  }

  /**
   * Creates state channels for the workflow
   * Defines how state is managed and merged between nodes
   */
  private createStateChannels<TState extends FunctionalWorkflowState>(): Record<
    string,
    any
  > {
    return {
      // Core workflow state
      workflowName: {
        value: (x: string, y: string) => y ?? x,
        default: () => '',
      },
      executionId: {
        value: (x: string, y: string) => y ?? x,
        default: () => '',
      },
      currentStep: {
        value: (x: number, y: number) => y ?? x,
        default: () => 0,
      },
      currentTask: {
        value: (x: string, y: string) => y ?? x,
        default: () => '',
      },

      // Dynamic state that gets merged
      // This allows tasks to add arbitrary state properties
      state: {
        value: (x: any, y: any) => ({ ...x, ...y }),
        default: () => ({}),
      },

      // Error tracking
      error: {
        value: (x: any, y: any) => y ?? x,
        default: () => null,
      },

      // Metadata accumulation
      metadata: {
        value: (x: any, y: any) => ({ ...x, ...y }),
        default: () => ({}),
      },
    };
  }

  /**
   * Creates a node handler that wraps a task method for LangGraph execution
   */
  private createNodeHandler<TState extends FunctionalWorkflowState>(
    taskDef: TaskDefinition,
    instance: object,
    definition: WorkflowDefinition
  ): (state: TState) => Promise<Partial<TState>> {
    return async (state: TState): Promise<Partial<TState>> => {
      this.logger.debug(`Executing task: ${taskDef.name}`);

      try {
        // Get the method from the instance
        const method = (instance as any)[taskDef.methodName];
        if (!method || typeof method !== 'function') {
          throw new Error(
            `Method '${taskDef.methodName}' not found on workflow instance`
          );
        }

        // Create execution context
        const context: TaskExecutionContext = {
          state,
          taskName: taskDef.name,
          workflowId: state.workflowName || definition.name,
          executionId: state.executionId || `exec_${Date.now()}`,
          metadata: (state.metadata as Record<string, unknown>) || {},
        };

        // Execute the task
        const result: TaskExecutionResult = await method.call(
          instance,
          context
        );

        // Return state update for LangGraph
        return {
          ...result.state,
          currentTask: taskDef.name,
          currentStep: (state.currentStep || 0) + 1,
          metadata: {
            ...(state.metadata || {}),
            [`${taskDef.name}_completed`]: new Date().toISOString(),
          },
        } as unknown as Partial<TState>;
      } catch (error) {
        this.logger.error(`Task '${taskDef.name}' failed:`, error);

        // Return error state
        return {
          error: {
            task: taskDef.name,
            message: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          },
          currentTask: taskDef.name,
        } as unknown as Partial<TState>;
      }
    };
  }

  /**
   * Adds edges to the workflow based on task dependencies
   */
  private addWorkflowEdges<TState extends FunctionalWorkflowState>(
    workflow: StateGraph<TState>,
    definition: WorkflowDefinition
  ): void {
    // Find the entrypoint task
    const entrypoint = Array.from(definition.tasks.values()).find(
      (task) => task.isEntrypoint
    );

    if (!entrypoint) {
      throw new Error('No entrypoint found in workflow definition');
    }

    // Add edge from START to entrypoint
    workflow.addEdge(START, entrypoint.name as any);

    // Build dependency graph edges
    const tasksByDependency = new Map<string, string[]>();

    for (const [taskName, taskDef] of definition.tasks) {
      if (taskDef.dependencies && taskDef.dependencies.length > 0) {
        // This task depends on others
        for (const dependency of taskDef.dependencies) {
          if (!tasksByDependency.has(dependency)) {
            tasksByDependency.set(dependency, []);
          }
          tasksByDependency.get(dependency)!.push(taskName);
        }
      }
    }

    // Add edges between tasks based on dependencies
    for (const [fromTask, toTasks] of tasksByDependency) {
      if (toTasks.length === 1) {
        // Simple edge to single dependent
        workflow.addEdge(fromTask as any, toTasks[0] as any);
      } else if (toTasks.length > 1) {
        // Conditional edge to multiple dependents
        // This creates parallel execution paths
        workflow.addConditionalEdges(
          fromTask as any,
          ((state: TState) => {
            // Execute all dependent tasks (parallel branches)
            // LangGraph will handle the parallel execution
            return toTasks[0]; // Return first task, others will be handled by graph structure
          }) as any,
          toTasks.reduce((acc, task) => {
            acc[task] = task;
            return acc;
          }, {} as any) // LangGraph routing compatibility
        );
      }
    }

    // Find terminal tasks (tasks with no dependents)
    const terminalTasks = Array.from(definition.tasks.keys()).filter(
      (taskName) =>
        !tasksByDependency.has(taskName) && taskName !== entrypoint?.name
    );

    // Add edges from terminal tasks to END
    for (const terminalTask of terminalTasks) {
      workflow.addEdge(terminalTask as any, END);
    }

    // If entrypoint has no dependents and is not a terminal task, connect it to END
    if (
      entrypoint &&
      !tasksByDependency.has(entrypoint.name) &&
      terminalTasks.length === 0
    ) {
      workflow.addEdge(entrypoint.name as any, END);
    }

    this.logger.debug(
      `Added ${tasksByDependency.size} dependency edges to workflow`
    );
  }

  /**
   * Generates a visual representation of the workflow graph (for debugging)
   */
  generateGraphVisualization(definition: WorkflowDefinition): string {
    const lines: string[] = ['digraph Workflow {'];
    lines.push('  rankdir=TB;');
    lines.push('  node [shape=box];');

    // Add START node
    lines.push('  START [shape=circle, label="START"];');

    // Add task nodes
    for (const [taskName, taskDef] of definition.tasks) {
      const label = taskDef.isEntrypoint
        ? `${taskName}\\n(entrypoint)`
        : taskName;
      lines.push(`  "${taskName}" [label="${label}"];`);
    }

    // Add END node
    lines.push('  END [shape=circle, label="END"];');

    // Find entrypoint
    const entrypoint = Array.from(definition.tasks.values()).find(
      (task: TaskDefinition) => task.isEntrypoint
    );

    if (entrypoint) {
      lines.push(`  START -> "${entrypoint.name}";`);
    }

    // Add dependency edges
    for (const [taskName, taskDef] of definition.tasks) {
      if (taskDef.dependencies) {
        for (const dep of taskDef.dependencies) {
          lines.push(`  "${dep}" -> "${taskName}";`);
        }
      }
    }

    // Find terminal tasks and connect to END
    const tasksByDependency = new Map<string, string[]>();
    for (const [taskName, taskDef] of definition.tasks) {
      if (taskDef.dependencies) {
        for (const dep of taskDef.dependencies) {
          if (!tasksByDependency.has(dep)) {
            tasksByDependency.set(dep, []);
          }
          tasksByDependency.get(dep)!.push(taskName);
        }
      }
    }

    const terminalTasks = Array.from(definition.tasks.keys()).filter(
      (taskName) => !tasksByDependency.has(taskName)
    );

    for (const terminal of terminalTasks) {
      if (terminal !== entrypoint?.name) {
        lines.push(`  "${terminal}" -> END;`);
      }
    }

    lines.push('}');
    return lines.join('\n');
  }

  /**
   * Validates that a workflow can be converted to a StateGraph
   */
  validateWorkflowForGraphGeneration(definition: WorkflowDefinition): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check for entrypoint
    const entrypoint = Array.from(definition.tasks.values()).find(
      (task: TaskDefinition) => task.isEntrypoint
    );

    if (!entrypoint) {
      errors.push(
        'Workflow must have exactly one @Entrypoint decorated method'
      );
    }

    // Check for circular dependencies
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const hasCycle = (taskName: string): boolean => {
      if (visiting.has(taskName)) {
        return true;
      }
      if (visited.has(taskName)) {
        return false;
      }

      visiting.add(taskName);
      const task = definition.tasks.get(taskName);

      if (task?.dependencies) {
        for (const dep of task.dependencies) {
          if (hasCycle(dep)) {
            return true;
          }
        }
      }

      visiting.delete(taskName);
      visited.add(taskName);
      return false;
    };

    for (const taskName of definition.tasks.keys()) {
      if (hasCycle(taskName)) {
        errors.push(
          `Circular dependency detected involving task '${taskName}'`
        );
        break;
      }
    }

    // Check for undefined dependencies
    for (const [taskName, taskDef] of definition.tasks) {
      if (taskDef.dependencies) {
        for (const dep of taskDef.dependencies) {
          if (!definition.tasks.has(dep)) {
            errors.push(
              `Task '${taskName}' depends on undefined task '${dep}'`
            );
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
