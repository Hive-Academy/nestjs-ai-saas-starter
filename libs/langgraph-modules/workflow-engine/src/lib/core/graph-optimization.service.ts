import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import type { IMemoryAdapter } from '@hive-academy/langgraph-core';
import type { WorkflowDefinition, WorkflowState } from '../interfaces';
import type { GraphBuilderOptions } from './workflow-graph-builder.service';

/**
 * Service responsible for graph optimization and learning-based performance improvements
 * Extracted from WorkflowGraphBuilderService for better separation of concerns
 */
@Injectable()
export class GraphOptimizationService {
  private readonly logger = new Logger(GraphOptimizationService.name);

  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
  ) {}

  /**
   * Enhance graph building options with learned optimization patterns
   *
   * This follows the 2025 LangGraph pattern for graph compilation intelligence,
   * where previous compilation performance and patterns inform future optimizations.
   */
  async enhanceWithOptimizationPatterns<TState extends WorkflowState = WorkflowState>(
    definition: WorkflowDefinition<TState>,
    options: GraphBuilderOptions
  ): Promise<GraphBuilderOptions> {
    if (!this.memoryAdapter) {
      // Graceful degradation - optimization learning is optional
      return options;
    }

    try {
      const namespace = `graphs.compilation.optimizations`;

      // Retrieve learned optimization patterns for this graph type
      const optimizationData = await this.memoryAdapter.search({
        query: 'graph optimization patterns',
        namespace: [namespace],
        limit: 10,
      });

      if (!optimizationData || optimizationData.length === 0) {
        return options;
      }

      // Apply learned optimizations
      const enhancedOptions = { ...options };

      for (const memory of optimizationData) {
        try {
          const optimization = JSON.parse(memory.content);

          // Apply interrupt optimizations based on learned patterns
          if (optimization.optimalInterrupts && !enhancedOptions.interrupt) {
            enhancedOptions.interrupt = optimization.optimalInterrupts;
          }

          // Apply debug mode based on success patterns
          if (
            optimization.debugRecommendation !== undefined &&
            enhancedOptions.debug === undefined
          ) {
            enhancedOptions.debug = optimization.debugRecommendation;
          }

          // Apply channel optimizations
          if (optimization.channelOptimizations && !enhancedOptions.channels) {
            enhancedOptions.channels = optimization.channelOptimizations;
          }
        } catch (parseError) {
          this.logger.debug('Failed to parse optimization memory:', parseError);
        }
      }

      this.logger.debug(
        `Applied ${optimizationData.length} optimization patterns to graph ${definition.name}`
      );
      return enhancedOptions;
    } catch (error) {
      this.logger.error('Failed to enhance with optimization patterns:', error);
      return options;
    }
  }

  /**
   * Get optimized compile options based on learned patterns
   */
  async getOptimizedCompileOptions(
    baseOptions: GraphBuilderOptions
  ): Promise<Partial<any>> {
    if (!this.memoryAdapter) return {};

    try {
      const namespace = `graphs.compilation.performance`;

      const performanceData = await this.memoryAdapter.search({
        query: 'compilation performance optimization data',
        namespace: [namespace],
        limit: 20,
      });

      if (!performanceData || performanceData.length === 0) {
        return {};
      }

      // Analyze performance patterns to determine optimal settings
      const optimizations: any = {};

      let fastCompilations = 0;
      let slowCompilations = 0;
      let checkpointerBenefit = 0;
      let interruptBenefit = 0;

      for (const memory of performanceData) {
        try {
          const data = JSON.parse(memory.content);

          if (
            data.performance.efficiency === 'fast' ||
            data.performance.efficiency === 'very_fast'
          ) {
            fastCompilations++;

            // Learn from fast compilations
            if (data.configuration.hasCheckpointer) checkpointerBenefit++;
            if (
              data.configuration.hasInterruptBefore ||
              data.configuration.hasInterruptAfter
            )
              interruptBenefit++;
          } else {
            slowCompilations++;
          }
        } catch (parseError) {
          this.logger.debug(
            'Failed to parse compilation performance memory:',
            parseError
          );
        }
      }

      // Apply learned optimizations only if we have enough data
      if (performanceData.length >= 5) {
        const totalCompilations = fastCompilations + slowCompilations;

        // If checkpointer generally helps performance, suggest its use
        if (checkpointerBenefit / totalCompilations > 0.6) {
          optimizations.recommendCheckpointer = true;
        }

        // If interrupts don't significantly impact performance, they're safe to use
        if (interruptBenefit / totalCompilations > 0.4) {
          optimizations.interruptsSafe = true;
        }
      }

      this.logger.debug(
        'Applied compilation optimizations based on learned patterns',
        {
          dataPoints: performanceData.length,
          optimizations,
        }
      );

      return optimizations;
    } catch (error) {
      this.logger.error('Failed to get optimized compile options:', error);
      return {};
    }
  }

  /**
   * Store optimization patterns for future graph building
   */
  async storeOptimizationPatterns<TState extends WorkflowState = WorkflowState>(
    definition: WorkflowDefinition<TState>,
    graphComplexity: any,
    buildTime: number,
    options: GraphBuilderOptions
  ): Promise<void> {
    if (!this.memoryAdapter) return;

    try {
      const namespace = `graphs.compilation.optimizations`;

      const optimizationPattern = {
        graphName: definition.name,
        graphType: this.classifyGraphType(definition),
        complexity: graphComplexity.complexity,
        buildTime,
        timestamp: new Date().toISOString(),

        // Configuration that worked well (or poorly)
        configuration: {
          debugMode: options.debug,
          hasInterrupts: !!options.interrupt,
          interruptConfig: options.interrupt,
          hasCustomChannels: !!options.channels,
          hasCheckpointer: !!options.checkpointer,
        },

        // Performance outcome
        outcome: {
          efficiency: this.categorizeGraphEfficiency(buildTime, graphComplexity),
          successful: buildTime < 200, // Consider successful if < 200ms
          scalable: graphComplexity.nodeCount < 50 || buildTime < 500,
        },

        // Recommendations for similar graphs
        recommendations: {
          optimalInterrupts: this.generateInterruptRecommendations(graphComplexity),
          debugRecommendation: buildTime > 100 ? true : false, // Debug mode for slow graphs
          channelOptimizations: this.generateChannelOptimizations(graphComplexity),
        },
      };

      await this.memoryAdapter.store(
        namespace,
        JSON.stringify(optimizationPattern),
        {
          type: 'preference', // Optimization patterns are preferences for future builds
          source: 'graph_optimization_pattern',
          agentId: 'workflow_graph_builder',
          importance: 0.8,
          persistent: true,
          tags: JSON.stringify([
            'graph_optimization',
            'performance_pattern',
            definition.name,
            graphComplexity.complexity,
            this.classifyGraphType(definition),
          ]),
        }
      );
    } catch (error) {
      this.logger.error('Failed to store optimization patterns:', error);
    }
  }

  /**
   * Analyze graph complexity for performance learning
   */
  analyzeGraphComplexity<TState extends WorkflowState = WorkflowState>(
    definition: WorkflowDefinition<TState>
  ): {
    nodeCount: number;
    edgeCount: number;
    conditionalEdgeCount: number;
    averageNodeComplexity: number;
    hasToolNodes: boolean;
    hasSubgraphs: boolean;
    maxDepth: number;
    complexity: 'low' | 'medium' | 'high' | 'very_high';
  } {
    const nodeCount = definition.nodes.length;
    const edgeCount = definition.edges.length;
    const conditionalEdgeCount = definition.edges.filter(
      (edge) => typeof edge.to !== 'string'
    ).length;

    // Estimate node complexity based on configuration
    const nodeComplexities = definition.nodes.map((node) => {
      let complexity = 1;
      if (node.config?.timeout) complexity += 1;
      if (node.config?.retry) complexity += 1;
      if (node.config?.tools && node.config.tools.length > 0) complexity += 2;
      return complexity;
    });

    const averageNodeComplexity =
      nodeComplexities.reduce((a, b) => a + b, 0) / nodeCount || 0;

    // Detect special node types (inferred from node ID and tools configuration)
    const hasToolNodes = definition.nodes.some(
      (node) =>
        node.id.toLowerCase().includes('tool') ||
        (node.config?.tools && node.config.tools.length > 0)
    );

    const hasSubgraphs = definition.nodes.some(
      (node) =>
        node.id.toLowerCase().includes('subgraph') ||
        node.id.toLowerCase().includes('workflow')
    );

    // Calculate max depth (simplified - would need proper graph traversal)
    const maxDepth = Math.max(nodeCount, 1);

    // Overall complexity assessment
    let complexity: 'low' | 'medium' | 'high' | 'very_high' = 'low';
    const complexityScore =
      nodeCount +
      edgeCount * 0.5 +
      conditionalEdgeCount * 2 +
      averageNodeComplexity * nodeCount;

    if (complexityScore > 50) complexity = 'very_high';
    else if (complexityScore > 25) complexity = 'high';
    else if (complexityScore > 10) complexity = 'medium';

    return {
      nodeCount,
      edgeCount,
      conditionalEdgeCount,
      averageNodeComplexity,
      hasToolNodes,
      hasSubgraphs,
      maxDepth,
      complexity,
    };
  }

  /**
   * Categorize graph compilation efficiency
   */
  categorizeGraphEfficiency(buildTime: number, complexity: any): string {
    const complexityMultiplier = complexity.nodeCount * 2 + complexity.edgeCount;
    const efficiencyRatio = buildTime / Math.max(complexityMultiplier, 1);

    if (efficiencyRatio < 2) return 'very_efficient';
    if (efficiencyRatio < 5) return 'efficient';
    if (efficiencyRatio < 10) return 'moderate';
    if (efficiencyRatio < 20) return 'inefficient';
    return 'very_inefficient';
  }

  /**
   * Generate optimization suggestions based on analysis
   */
  generateOptimizationSuggestions(
    complexity: any,
    buildTime: number,
    options: GraphBuilderOptions
  ): string[] {
    const suggestions: string[] = [];

    if (buildTime > 100) {
      suggestions.push('Consider enabling debug mode for performance analysis');
    }

    if (complexity.conditionalEdgeCount > 5) {
      suggestions.push(
        'High conditional edge count - consider simplifying routing logic'
      );
    }

    if (complexity.nodeCount > 20 && !options.interrupt) {
      suggestions.push(
        'Large graph detected - consider adding interrupt points for better control'
      );
    }

    if (complexity.complexity === 'very_high' && !options.checkpointer) {
      suggestions.push('Complex graph - checkpointing recommended for reliability');
    }

    return suggestions;
  }

  /**
   * Classify graph type for pattern recognition
   */
  private classifyGraphType<TState extends WorkflowState = WorkflowState>(
    definition: WorkflowDefinition<TState>
  ): string {
    const nodeIds = definition.nodes.map((n) => n.id.toLowerCase());

    if (nodeIds.some((id) => id.includes('supervisor'))) return 'supervisor';
    if (nodeIds.some((id) => id.includes('pipeline'))) return 'pipeline';
    if (nodeIds.some((id) => id.includes('approval') || id.includes('human')))
      return 'hitl';
    if (nodeIds.some((id) => id.includes('tool'))) return 'tool_calling';
    if (definition.edges.filter((e) => typeof e.to !== 'string').length > 3)
      return 'conditional_heavy';

    return 'standard';
  }

  /**
   * Generate interrupt recommendations based on complexity
   */
  private generateInterruptRecommendations(
    complexity: any
  ): { before?: string[]; after?: string[] } | null {
    if (complexity.nodeCount < 5) return null;

    const recommendations: { before?: string[]; after?: string[] } = {};

    if (complexity.hasToolNodes) {
      recommendations.before = ['tool_execution'];
    }

    if (complexity.complexity === 'high' || complexity.complexity === 'very_high') {
      recommendations.after = ['validation', 'checkpoint'];
    }

    return Object.keys(recommendations).length > 0 ? recommendations : null;
  }

  /**
   * Generate channel optimizations
   */
  private generateChannelOptimizations(complexity: any): any | null {
    if (complexity.complexity === 'low') return null;

    // For complex graphs, suggest optimized channel configuration
    return {
      optimizedForComplexity: true,
      bufferSize: complexity.nodeCount > 20 ? 'large' : 'standard',
      parallelization: complexity.nodeCount > 10,
    };
  }
}