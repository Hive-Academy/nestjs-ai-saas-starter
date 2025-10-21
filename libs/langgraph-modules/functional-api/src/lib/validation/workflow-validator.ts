import { Injectable } from '@nestjs/common';
import {
  FunctionalWorkflowDefinition,
  TaskDefinition,
  TaskDependencyGraph,
} from '../interfaces/functional-workflow.interface';
import {
  InvalidWorkflowDefinitionError,
  CircularDependencyError,
  UnknownTaskError,
} from '../errors/functional-workflow.errors';

/**
 * Service for validating functional workflow definitions
 */
@Injectable()
export class WorkflowValidator {
  /**
   * Validates a complete workflow definition
   */
  validateWorkflow(definition: FunctionalWorkflowDefinition): void {
    this.validateEntrypoint(definition);
    this.validateTaskReferences(definition);
    this.validateDependencyGraph(definition);
  }

  /**
   * Validates that workflow has exactly one entrypoint
   */
  private validateEntrypoint(definition: FunctionalWorkflowDefinition): void {
    if (!definition.entrypoint) {
      throw new InvalidWorkflowDefinitionError(
        `Workflow '${definition.name}' must have an entrypoint`,
        { workflowName: definition.name }
      );
    }

    if (!definition.tasks.has(definition.entrypoint)) {
      throw new InvalidWorkflowDefinitionError(
        `Entrypoint '${definition.entrypoint}' not found in workflow '${definition.name}'`,
        { workflowName: definition.name, entrypoint: definition.entrypoint }
      );
    }

    const entrypointTask = definition.tasks.get(definition.entrypoint)!;
    if (!entrypointTask.isEntrypoint) {
      throw new InvalidWorkflowDefinitionError(
        `Task '${definition.entrypoint}' is marked as entrypoint but not decorated with @Entrypoint`,
        { workflowName: definition.name, taskName: definition.entrypoint }
      );
    }
  }

  /**
   * Validates that all task dependencies reference existing tasks
   */
  private validateTaskReferences(
    definition: FunctionalWorkflowDefinition
  ): void {
    for (const [taskName, task] of definition.tasks) {
      for (const dependency of task.dependencies) {
        if (!definition.tasks.has(dependency)) {
          throw new UnknownTaskError(dependency, definition.name, {
            taskName,
            dependency,
          });
        }
      }

      // Validate error handler references
      if (task.errorHandler && !definition.tasks.has(task.errorHandler)) {
        throw new UnknownTaskError(task.errorHandler, definition.name, {
          taskName,
          errorHandler: task.errorHandler,
        });
      }
    }
  }

  /**
   * Validates dependency graph and detects cycles
   */
  private validateDependencyGraph(
    definition: FunctionalWorkflowDefinition
  ): void {
    const graph = this.buildDependencyGraph(definition);

    if (graph.cycles.length > 0) {
      throw new CircularDependencyError(graph.cycles[0], {
        workflowName: definition.name,
        allCycles: graph.cycles,
      });
    }
  }

  /**
   * Builds dependency graph from workflow definition
   */
  buildDependencyGraph(
    definition: FunctionalWorkflowDefinition
  ): TaskDependencyGraph {
    const tasks = new Map(definition.tasks);
    const edges = new Map<string, readonly string[]>();

    // Build forward edges (task -> dependents)
    for (const [taskName] of tasks) {
      edges.set(taskName, []);
    }

    for (const [taskName, task] of tasks) {
      for (const dependency of task.dependencies) {
        const dependents = edges.get(dependency) || [];
        edges.set(dependency, [...dependents, taskName]);
      }
    }

    const cycles = this.detectCycles(tasks, edges);

    return {
      tasks,
      edges,
      entrypoint: definition.entrypoint,
      cycles,
    };
  }

  /**
   * Detects cycles in the dependency graph using DFS
   */
  private detectCycles(
    tasks: Map<string, TaskDefinition>,
    edges: Map<string, readonly string[]>
  ): readonly string[][] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (node: string, path: string[]): void => {
      if (recursionStack.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), node]);
        }
        return;
      }

      if (visited.has(node)) {
        return;
      }

      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const dependents = edges.get(node) || [];
      for (const dependent of dependents) {
        dfs(dependent, [...path]);
      }

      recursionStack.delete(node);
    };

    for (const taskName of tasks.keys()) {
      if (!visited.has(taskName)) {
        dfs(taskName, []);
      }
    }

    return cycles;
  }

  /**
   * Validates task execution order based on dependencies
   */
  validateExecutionOrder(
    definition: FunctionalWorkflowDefinition,
    executionOrder: readonly string[]
  ): void {
    const executed = new Set<string>();

    for (const taskName of executionOrder) {
      const task = definition.tasks.get(taskName);
      if (!task) {
        throw new UnknownTaskError(taskName, definition.name);
      }

      // Check if all dependencies have been executed
      for (const dependency of task.dependencies) {
        if (!executed.has(dependency)) {
          throw new InvalidWorkflowDefinitionError(
            `Task '${taskName}' cannot execute before dependency '${dependency}'`,
            { workflowName: definition.name, taskName, dependency }
          );
        }
      }

      executed.add(taskName);
    }
  }
}
