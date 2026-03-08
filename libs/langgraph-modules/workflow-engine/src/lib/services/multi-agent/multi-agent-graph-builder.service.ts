/**
 * MultiAgentGraphBuilderService
 *
 * Strategy Pattern service that selects and delegates to topology-specific
 * graph builders. Each topology (supervisor, sequential, swarm, hierarchical,
 * network) has a dedicated builder that implements LangGraph 1.0 patterns correctly.
 *
 * This service eliminates @MultiAgent decorator creating workflow metadata
 * and moves graph construction logic into focused, testable builders.
 *
 * PATTERN: Strategy Pattern
 * - Context: MultiAgentGraphBuilderService (this class)
 * - Strategy Interface: IMultiAgentGraphBuilder
 * - Concrete Strategies: SupervisorGraphBuilder, SequentialGraphBuilder, etc.
 *
 * RESPONSIBILITY:
 * 1. Register topology-specific builders in constructor
 * 2. Extract MultiAgentConfig from supervisor class
 * 3. Select appropriate builder based on topology
 * 4. Delegate graph construction to selected builder
 * 5. Return compiled StateGraph ready for execution
 *
 * EXTENSIBILITY:
 * Adding new topologies (swarm, hierarchical, network) requires:
 * 1. Create builder implementing IMultiAgentGraphBuilder
 * 2. Inject builder in constructor
 * 3. Register in builders Map
 * No changes to this service needed - pure Strategy Pattern extensibility
 *
 * @see IMultiAgentGraphBuilder - Strategy interface contract
 * @see SupervisorGraphBuilder - Supervisor topology implementation (Task 4)
 * @see SequentialGraphBuilder - Sequential topology implementation (Task 5)
 * @see WorkflowExecutionService - Client that uses this service
 */

import { Injectable, Logger } from '@nestjs/common';
import { StateGraph } from '@langchain/langgraph';
import {
  MultiAgentTopology,
  getMultiAgentConfig,
  isMultiAgentWorkflow,
} from '../../decorators/multi-agent/multi-agent.decorator';
import type { IMultiAgentGraphBuilder } from './builders/i-multi-agent-graph-builder.interface';
import { MultiAgentGraphBuilderError } from './errors';
import { SupervisorGraphBuilder } from './builders/supervisor-graph-builder';
import { SequentialGraphBuilder } from './builders/sequential-graph-builder';

/**
 * Strategy Pattern context service for multi-agent graph construction
 *
 * This service acts as the Strategy Context in the Strategy Pattern:
 * - Maintains a registry of topology-specific builders
 * - Selects the appropriate builder based on MultiAgentConfig.topology
 * - Delegates graph construction to the selected builder
 * - Handles errors and provides utility methods for builder queries
 *
 * USAGE:
 * ```typescript
 * // Inject in WorkflowExecutionService
 * constructor(private readonly graphBuilder: MultiAgentGraphBuilderService) {}
 *
 * // Build graph from supervisor class
 * const graph = await this.graphBuilder.buildGraph(DevBrandSupervisorWorkflow);
 * const compiled = graph.compile({ checkpointer, store });
 * const result = await compiled.invoke(input, config);
 * ```
 *
 * ERROR HANDLING:
 * - Validates @MultiAgent decorator presence
 * - Validates builder registration for requested topology
 * - Wraps builder errors with contextual information
 */
@Injectable()
export class MultiAgentGraphBuilderService {
  private readonly logger = new Logger(MultiAgentGraphBuilderService.name);

  /**
   * Builder registry (Strategy Pattern - Strategy Map)
   *
   * Maps topology type to corresponding builder implementation.
   * Extensibility: Add new topologies by injecting builder and adding to Map
   */
  private readonly builders: Map<MultiAgentTopology, IMultiAgentGraphBuilder>;

  /**
   * Initialize service and register topology-specific builders
   *
   * ARCHITECTURE NOTE:
   * - SupervisorGraphBuilder and SequentialGraphBuilder are injected via DI
   * - Builders are registered in the Map for Strategy Pattern lookup
   * - Additional topologies (swarm, hierarchical, network) can be added following same pattern
   *
   * @param supervisorBuilder - Supervisor topology builder
   * @param sequentialBuilder - Sequential topology builder
   */
  constructor(
    private readonly supervisorBuilder: SupervisorGraphBuilder,
    private readonly sequentialBuilder: SequentialGraphBuilder
  ) {
    // Register topology-specific builders for Strategy Pattern lookup
    // Type cast needed due to LangGraph's complex generic types in StateGraph
    this.builders = new Map<MultiAgentTopology, IMultiAgentGraphBuilder>([
      [
        MultiAgentTopology.SUPERVISOR,
        this.supervisorBuilder as IMultiAgentGraphBuilder,
      ],
      [
        MultiAgentTopology.SEQUENTIAL,
        this.sequentialBuilder as IMultiAgentGraphBuilder,
      ],
      // Future topologies can be added here:
      // [MultiAgentTopology.SWARM, this.swarmBuilder],
      // [MultiAgentTopology.HIERARCHICAL, this.hierarchicalBuilder],
      // [MultiAgentTopology.NETWORK, this.networkBuilder],
    ]);

    this.logger.log('MultiAgentGraphBuilderService initialized');
    this.logger.log(
      `Registered builders: ${this.getRegisteredTopologies().join(', ')}`
    );
  }

  /**
   * Build LangGraph StateGraph from multi-agent supervisor class
   *
   * This is the primary Strategy Pattern method - it delegates to the
   * appropriate builder based on the topology configuration.
   *
   * WORKFLOW:
   * 1. Validate @MultiAgent decorator presence
   * 2. Extract MultiAgentConfig from decorator metadata
   * 3. Select topology-specific builder from registry
   * 4. Delegate graph construction to builder
   * 5. Return StateGraph ready for compilation
   *
   * ERROR SCENARIOS:
   * - Class not decorated with @MultiAgent
   * - No MultiAgentConfig found in metadata
   * - No builder registered for requested topology
   * - Builder throws error during graph construction
   *
   * @template TState - Workflow state type extending WorkflowState
   * @param supervisorClass - Class decorated with @MultiAgent
   * @returns LangGraph StateGraph ready for compilation
   * @throws {MultiAgentGraphBuilderError} If validation fails or graph construction fails
   *
   * @example
   * ```typescript
   * // WorkflowExecutionService usage
   * const graph = await this.multiAgentGraphBuilder.buildGraph(DevBrandSupervisorWorkflow);
   * const compiled = graph.compile({ checkpointer, store });
   * const result = await compiled.invoke({ messages: [...] });
   * ```
   */
  async buildGraph<
    TState extends Record<string, unknown> = Record<string, unknown>
  >(supervisorClass: any): Promise<StateGraph<TState>> {
    this.logger.debug(`Building multi-agent graph for ${supervisorClass.name}`);

    // Step 1: Validate @MultiAgent decorator presence
    if (!isMultiAgentWorkflow(supervisorClass)) {
      throw new MultiAgentGraphBuilderError(
        `Class ${supervisorClass.name} is not decorated with @MultiAgent. ` +
          `Multi-agent workflows must use @MultiAgent decorator to specify topology.`
      );
    }

    // Step 2: Extract MultiAgentConfig from decorator metadata
    const config = getMultiAgentConfig(supervisorClass);
    if (!config) {
      throw new MultiAgentGraphBuilderError(
        `No MultiAgentConfig found for ${supervisorClass.name}. ` +
          `This should never happen - isMultiAgentWorkflow returned true but config is missing.`
      );
    }

    this.logger.debug(
      `Extracted config: topology=${config.topology}, agents=${config.agents.length}`
    );

    // Step 3: Select topology-specific builder from registry (Strategy Pattern - Strategy Selection)
    const builder = this.builders.get(config.topology);
    if (!builder) {
      const registeredTopologies = this.getRegisteredTopologies();
      throw new MultiAgentGraphBuilderError(
        `No builder registered for topology: ${config.topology}. ` +
          `Available topologies: ${
            registeredTopologies.join(', ') || 'none'
          }. ` +
          `Ensure the corresponding builder is created and registered in the builders Map.`
      );
    }

    this.logger.debug(`Selected builder: ${builder.constructor.name}`);

    // Step 4: Delegate graph construction to selected builder (Strategy Pattern - Strategy Delegation)
    try {
      // Validate configuration before building
      builder.validateConfig(config);

      // Build graph using topology-specific implementation
      const graph = await builder.buildGraph<TState>(config, supervisorClass);

      this.logger.log(
        `Graph built successfully for ${supervisorClass.name} using ${config.topology} topology`
      );

      return graph;
    } catch (error) {
      // Wrap builder errors with additional context
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Graph building failed for ${supervisorClass.name} (topology: ${config.topology}): ${message}`
      );

      // Preserve original error if it's already a MultiAgentGraphBuilderError
      if (error instanceof MultiAgentGraphBuilderError) {
        throw error;
      }

      // Wrap other errors with context
      throw new MultiAgentGraphBuilderError(
        `Failed to build graph for ${supervisorClass.name} using ${config.topology} topology: ${message}`,
        error as Error
      );
    }
  }

  /**
   * Check if a builder is registered for a specific topology
   *
   * UTILITY METHOD:
   * Useful for validation, feature detection, or conditional logic.
   *
   * @param topology - MultiAgentTopology to check
   * @returns true if builder is registered, false otherwise
   *
   * @example
   * ```typescript
   * if (this.graphBuilder.hasBuilder(MultiAgentTopology.SUPERVISOR)) {
   *   // Supervisor topology supported
   * }
   * ```
   */
  hasBuilder(topology: MultiAgentTopology): boolean {
    return this.builders.has(topology);
  }

  /**
   * Get list of registered topologies
   *
   * UTILITY METHOD:
   * Useful for runtime discovery, error messages, or feature lists.
   *
   * @returns Array of registered MultiAgentTopology values
   *
   * @example
   * ```typescript
   * const topologies = this.graphBuilder.getRegisteredTopologies();
   * console.log(`Supported topologies: ${topologies.join(', ')}`);
   * // Output: "Supported topologies: supervisor, sequential"
   * ```
   */
  getRegisteredTopologies(): MultiAgentTopology[] {
    return Array.from(this.builders.keys());
  }
}
