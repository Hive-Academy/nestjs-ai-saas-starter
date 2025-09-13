import { Injectable, Logger } from '@nestjs/common';
import type {
  ShowcasePattern,
  AgentCapability,
  ShowcaseMemoryContext,
} from '../types/showcase.types';

/**
 * 🎯 SHOWCASE COORDINATOR SERVICE - Multi-Agent Orchestration Engine
 *
 * This service demonstrates sophisticated multi-agent coordination patterns,
 * showcasing intelligent agent selection, routing, and workflow optimization.
 *
 * Core Capabilities:
 * - Intelligent agent selection based on input analysis
 * - Dynamic workflow routing and optimization
 * - Multi-pattern coordination (supervisor, swarm, hierarchical)
 * - Real-time coordination metrics and monitoring
 */
@Injectable()
export class ShowcaseCoordinatorService {
  private readonly logger = new Logger(ShowcaseCoordinatorService.name);

  /**
   * 🤖 INTELLIGENT AGENT SELECTION
   *
   * Analyzes input requirements and selects optimal agents for execution
   */
  async selectOptimalAgents(params: {
    input: string;
    demonstrationMode: 'basic' | 'advanced' | 'enterprise';
    activeCapabilities: AgentCapability[];
    context: ShowcaseMemoryContext;
  }): Promise<string[]> {
    this.logger.log(
      `🎯 Selecting optimal agents for ${params.demonstrationMode} demonstration`
    );

    // Analyze input complexity and requirements
    const inputAnalysis = await this.analyzeInputRequirements(params.input);

    // Agent selection logic based on demonstration mode and requirements
    let selectedAgents: string[];

    switch (params.demonstrationMode) {
      case 'basic':
        selectedAgents = await this.selectBasicAgents(inputAnalysis, params);
        break;

      case 'advanced':
        selectedAgents = await this.selectAdvancedAgents(inputAnalysis, params);
        break;

      case 'enterprise':
        selectedAgents = await this.selectEnterpriseAgents(
          inputAnalysis,
          params
        );
        break;

      default:
        selectedAgents = ['demo-showcase'];
    }

    this.logger.log(
      `✅ Selected ${selectedAgents.length} agents: ${selectedAgents.join(
        ', '
      )}`
    );

    return selectedAgents;
  }

  /**
   * 🔀 COORDINATION PATTERN ROUTING
   *
   * Determines optimal coordination pattern based on requirements
   */
  async determineCoordinationPattern(params: {
    agentCount: number;
    complexity: 'low' | 'medium' | 'high';
    requirements: string[];
    demonstrationMode: 'basic' | 'advanced' | 'enterprise';
  }): Promise<ShowcasePattern> {
    this.logger.log('🔀 Determining optimal coordination pattern...');

    // Pattern selection logic
    if (params.demonstrationMode === 'basic') {
      return 'supervisor'; // Simple hierarchical pattern
    }

    if (params.agentCount <= 3 && params.complexity === 'low') {
      return 'pipeline'; // Sequential processing
    }

    if (params.agentCount > 5 && params.requirements.includes('parallel')) {
      return 'swarm'; // Peer-to-peer coordination
    }

    if (
      params.complexity === 'high' &&
      params.demonstrationMode === 'enterprise'
    ) {
      return 'hierarchical'; // Multi-level coordination
    }

    // Default to supervisor for most cases
    return 'supervisor';
  }

  /**
   * ⚡ WORKFLOW OPTIMIZATION
   *
   * Optimizes agent workflows for maximum efficiency and demonstration value
   */
  async optimizeWorkflow(params: {
    selectedAgents: string[];
    pattern: ShowcasePattern;
    inputComplexity: 'low' | 'medium' | 'high';
    capabilities: AgentCapability[];
  }) {
    this.logger.log('⚡ Optimizing workflow for maximum efficiency...');

    // Workflow optimization strategies
    const optimizations = {
      executionOrder: await this.determineOptimalOrder(
        params.selectedAgents,
        params.pattern
      ),
      parallelization: await this.identifyParallelization(
        params.selectedAgents,
        params.capabilities
      ),
      resourceAllocation: await this.optimizeResources(
        params.selectedAgents,
        params.inputComplexity
      ),
      coordinationEfficiency: await this.calculateCoordinationEfficiency(
        params.pattern,
        params.selectedAgents.length
      ),
    };

    const workflowPlan = {
      pattern: params.pattern,
      agents: params.selectedAgents,
      optimizations,
      estimatedDuration: this.estimateExecutionDuration(optimizations),
      expectedQuality: this.estimateQualityScore(optimizations),
      coordinationComplexity: this.calculateComplexityScore(
        params.pattern,
        params.selectedAgents.length
      ),
    };

    this.logger.log(
      `✅ Workflow optimized - estimated duration: ${workflowPlan.estimatedDuration}ms`
    );

    return workflowPlan;
  }

  /**
   * 📊 COORDINATION METRICS
   *
   * Collects and analyzes coordination performance metrics
   */
  async collectCoordinationMetrics(params: {
    executionId: string;
    pattern: ShowcasePattern;
    agents: string[];
    startTime: number;
  }) {
    const executionTime = Date.now() - params.startTime;

    const metrics = {
      executionId: params.executionId,
      pattern: params.pattern,
      agentCount: params.agents.length,
      executionTime,

      coordinationMetrics: {
        agentSwitchCount: params.agents.length - 1,
        averageSwitchTime:
          executionTime / Math.max(params.agents.length - 1, 1),
        coordinationOverhead: this.calculateCoordinationOverhead(
          params.pattern,
          params.agents.length
        ),
        efficiencyScore: this.calculateEfficiencyScore(
          executionTime,
          params.agents.length
        ),
      },

      patternMetrics: {
        patternEfficiency: this.getPatternEfficiency(params.pattern),
        scalabilityScore: this.getScalabilityScore(
          params.pattern,
          params.agents.length
        ),
        complexityScore: this.calculateComplexityScore(
          params.pattern,
          params.agents.length
        ),
      },

      performanceIndicators: {
        throughput: this.calculateThroughput(
          executionTime,
          params.agents.length
        ),
        latency: executionTime / 1000, // seconds
        resourceUtilization: this.estimateResourceUtilization(
          params.agents.length
        ),
        qualityScore: this.estimateCoordinationQuality(
          params.pattern,
          params.agents.length
        ),
      },
    };

    this.logger.log(
      `📊 Coordination metrics collected - efficiency: ${metrics.coordinationMetrics.efficiencyScore}`
    );

    return metrics;
  }

  /**
   * Private Helper Methods
   */

  private async analyzeInputRequirements(input: string) {
    const wordCount = input.split(' ').length;
    const complexity =
      wordCount > 100 ? 'high' : wordCount > 50 ? 'medium' : 'low';

    // Detect required capabilities based on input content
    const capabilities: AgentCapability[] = [];

    if (input.toLowerCase().includes('analyz')) capabilities.push('analysis');
    if (
      input.toLowerCase().includes('generat') ||
      input.toLowerCase().includes('creat')
    )
      capabilities.push('generation');
    if (
      input.toLowerCase().includes('stream') ||
      input.toLowerCase().includes('real-time')
    )
      capabilities.push('streaming');
    if (
      input.toLowerCase().includes('approv') ||
      input.toLowerCase().includes('review')
    )
      capabilities.push('approval');
    if (
      input.toLowerCase().includes('monitor') ||
      input.toLowerCase().includes('metric')
    )
      capabilities.push('monitoring');
    if (
      input.toLowerCase().includes('memor') ||
      input.toLowerCase().includes('context')
    )
      capabilities.push('memory');
    if (
      input.toLowerCase().includes('tool') ||
      input.toLowerCase().includes('integrat')
    )
      capabilities.push('tools');
    if (
      input.toLowerCase().includes('debug') ||
      input.toLowerCase().includes('diagnos')
    )
      capabilities.push('debugging');

    return {
      wordCount,
      complexity,
      requiredCapabilities: capabilities,
      technicalComplexity:
        capabilities.length > 4
          ? 'high'
          : capabilities.length > 2
          ? 'medium'
          : 'low',
    };
  }

  private async selectBasicAgents(
    analysis: any,
    params: any
  ): Promise<string[]> {
    // Basic mode: simple, straightforward demonstration
    return ['demo-showcase'];
  }

  private async selectAdvancedAgents(
    analysis: any,
    params: any
  ): Promise<string[]> {
    // Advanced mode: showcase multiple capabilities
    const agents = ['demo-showcase'];

    if (
      analysis.complexity === 'high' ||
      analysis.technicalComplexity === 'high'
    ) {
      agents.push('advanced-showcase');
    }

    if (
      analysis.requiredCapabilities.includes('memory') ||
      analysis.requiredCapabilities.includes('tools') ||
      analysis.requiredCapabilities.includes('debugging')
    ) {
      agents.push('specialist-showcase');
    }

    return agents;
  }

  private async selectEnterpriseAgents(
    analysis: any,
    params: any
  ): Promise<string[]> {
    // Enterprise mode: full capability demonstration
    const agents = [
      'demo-showcase',
      'advanced-showcase',
      'specialist-showcase',
    ];

    // Add specialized agents based on requirements
    if (analysis.requiredCapabilities.includes('streaming')) {
      agents.push('streaming-showcase');
    }

    if (analysis.requiredCapabilities.includes('approval')) {
      agents.push('hitl-showcase');
    }

    return agents;
  }

  private async determineOptimalOrder(
    agents: string[],
    pattern: ShowcasePattern
  ): Promise<string[]> {
    // Order agents for optimal demonstration flow
    const orderPriorities = {
      'demo-showcase': 1,
      'specialist-showcase': 2,
      'advanced-showcase': 3,
      'streaming-showcase': 4,
      'hitl-showcase': 5,
    };

    return agents.sort(
      (a, b) =>
        (orderPriorities[a as keyof typeof orderPriorities] || 99) -
        (orderPriorities[b as keyof typeof orderPriorities] || 99)
    );
  }

  private async identifyParallelization(
    agents: string[],
    capabilities: AgentCapability[]
  ) {
    // Identify opportunities for parallel execution
    return {
      parallelizableAgents: agents.length > 2 ? agents.slice(1, 3) : [],
      parallelCapabilities: capabilities.filter((cap) =>
        ['analysis', 'monitoring', 'memory'].includes(cap)
      ),
      estimatedSpeedup: Math.min(agents.length * 0.3, 0.4), // 30% speedup per agent, max 40%
    };
  }

  private async optimizeResources(
    agents: string[],
    complexity: 'low' | 'medium' | 'high'
  ) {
    const baseResources = agents.length * 100; // MB
    const complexityMultiplier = { low: 1, medium: 1.5, high: 2 }[complexity];

    return {
      estimatedMemory: `${Math.round(baseResources * complexityMultiplier)} MB`,
      estimatedCpu: `${Math.round(agents.length * 15 * complexityMultiplier)}%`,
      networkBandwidth: `${Math.round(agents.length * 50)} KB/s`,
      storageRequirements: `${Math.round(agents.length * 20)} MB`,
    };
  }

  private async calculateCoordinationEfficiency(
    pattern: ShowcasePattern,
    agentCount: number
  ) {
    const patternEfficiency = {
      supervisor: 0.85,
      swarm: 0.75,
      hierarchical: 0.8,
      pipeline: 0.9,
      parallel: 0.88,
      'map-reduce': 0.82,
    };

    const scalingFactor = Math.max(0.7, 1 - (agentCount - 1) * 0.05); // Efficiency decreases with more agents

    return (patternEfficiency[pattern] || 0.8) * scalingFactor;
  }

  private estimateExecutionDuration(optimizations: any): number {
    const baseTime = 10000; // 10 seconds
    const efficiencyGain = optimizations.coordinationEfficiency;
    const parallelizationGain = optimizations.parallelization.estimatedSpeedup;

    return Math.round(
      baseTime * (1 - efficiencyGain * 0.3) * (1 - parallelizationGain)
    );
  }

  private estimateQualityScore(optimizations: any): number {
    return Math.min(0.95, 0.7 + optimizations.coordinationEfficiency * 0.25);
  }

  private calculateComplexityScore(
    pattern: ShowcasePattern,
    agentCount: number
  ): number {
    const patternComplexity = {
      supervisor: 0.6,
      swarm: 0.9,
      hierarchical: 0.8,
      pipeline: 0.4,
      parallel: 0.7,
      'map-reduce': 0.85,
    };

    return (patternComplexity[pattern] || 0.6) + (agentCount - 1) * 0.1;
  }

  private calculateCoordinationOverhead(
    pattern: ShowcasePattern,
    agentCount: number
  ): number {
    const baseOverhead = {
      supervisor: 0.15,
      swarm: 0.25,
      hierarchical: 0.2,
      pipeline: 0.1,
      parallel: 0.18,
      'map-reduce': 0.22,
    };
    return (baseOverhead[pattern] || 0.15) * agentCount * 0.1;
  }

  private calculateEfficiencyScore(
    executionTime: number,
    agentCount: number
  ): number {
    const idealTime = agentCount * 2000; // 2 seconds per agent ideal
    return Math.max(0.1, Math.min(1.0, idealTime / executionTime));
  }

  private getPatternEfficiency(pattern: ShowcasePattern): number {
    return (
      {
        supervisor: 0.85,
        swarm: 0.75,
        hierarchical: 0.8,
        pipeline: 0.9,
        parallel: 0.88,
        'map-reduce': 0.82,
      }[pattern] || 0.8
    );
  }

  private getScalabilityScore(
    pattern: ShowcasePattern,
    agentCount: number
  ): number {
    const scalability = {
      supervisor: 0.7,
      swarm: 0.9,
      hierarchical: 0.8,
      pipeline: 0.6,
      parallel: 0.95,
      'map-reduce': 0.85,
    };
    return (
      (scalability[pattern] || 0.7) * Math.max(0.5, 1 - (agentCount - 3) * 0.1)
    );
  }

  private calculateThroughput(
    executionTime: number,
    agentCount: number
  ): number {
    return Math.round((agentCount * 1000) / (executionTime / 1000)); // operations per second
  }

  private estimateResourceUtilization(agentCount: number): number {
    return Math.min(0.95, 0.3 + agentCount * 0.15);
  }

  private estimateCoordinationQuality(
    pattern: ShowcasePattern,
    agentCount: number
  ): number {
    const quality = this.getPatternEfficiency(pattern);
    const scalingPenalty = Math.max(0, (agentCount - 5) * 0.05);
    return Math.max(0.6, quality - scalingPenalty);
  }
}
