import { Injectable } from '@nestjs/common';
import {
  AgenticWorkflow,
  WorkflowResult,
  AgentState,
} from '@hive-academy/langgraph-multi-agent';
import type { WorkflowContext } from '@hive-academy/langgraph-multi-agent';
import { StreamProgress } from '@hive-academy/langgraph-streaming';
import type { TicketRequest } from '../types';

/**
 * 🚀 Enhanced Support Workflow - Multi-Agent Orchestration Showcase
 *
 * This workflow demonstrates the power of the multi-agent system by:
 * ✅ Orchestrating multiple specialized agents
 * ✅ Using hierarchical coordination with escalation rules
 * ✅ Implementing weighted tool merging for confident results
 * ✅ Demonstrating agent network setup and execution
 *
 * This showcases what multi-agent workflows are designed for:
 * - Coordinating multiple AI agents with different specialties
 * - Hierarchical escalation based on complexity/customer tier
 * - Weighted decision-making across multiple agent opinions
 * - Network topology management (supervisor, hierarchical, weighted)
 */
@AgenticWorkflow({
  id: 'enhanced-support-orchestration',
  name: 'Enhanced Support Orchestration',
  description:
    'Multi-agent workflow orchestrating specialized support agents with hierarchical coordination',
  requiredAgents: [
    'customer-support-specialist',
    'escalation-coordinator',
    'quality-assurance',
  ],
  config: {
    streaming: true,
    timeout: 900000, // 15 minutes for complex orchestration
    retry: { enabled: true, maxAttempts: 2, backoffMs: 3000 },
  },
})
@Injectable()
export class EnhancedSupportWorkflow {
  /**
   * Multi-agent orchestration execution
   * Demonstrates coordinated agent networks with escalation
   */
  @StreamProgress({ enabled: true, includeETA: true })
  async execute(
    input: TicketRequest,
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    const startTime = Date.now();
    try {
      // Step 1: Determine appropriate agent network topology
      const networkType = this.determineNetworkTopology(input);

      if (networkType === 'simple') {
        return await this.executeSimpleAgentWorkflow(input, context, startTime);
      } else if (networkType === 'hierarchical') {
        return await this.executeHierarchicalWorkflow(
          input,
          context,
          startTime
        );
      } else {
        return await this.executeWeightedCoordinationWorkflow(
          input,
          context,
          startTime
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: { message: errorMessage },
        data: {
          ticketId: input.customerId + '_' + Date.now(),
          status: 'failed',
        },
        metadata: {
          startTime: startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime,
          instanceId: context.instanceId,
        },
      };
    }
  }

  /**
   * Simple agent network for straightforward tickets
   */
  private async executeSimpleAgentWorkflow(
    input: TicketRequest,
    context: WorkflowContext,
    startTime: number
  ): Promise<WorkflowResult> {
    // Setup single-agent network
    const networkId = await context.coordinator.setupNetwork(
      'simple-support',
      [{ id: 'customer-support-specialist', type: 'CustomerSupportAgent' }],
      'supervisor',
      {
        systemPrompt:
          'Process customer support ticket efficiently and professionally',
        workers: ['customer-support-specialist'],
        maxExecutionTime: 300000, // 5 minutes
      }
    );

    // Execute simple workflow (checkpointing now automatic if adapter available)
    const result = await context.coordinator.executeSimpleWorkflow(
      networkId,
      `Process ticket: "${input.title}" - ${input.description}`
    );

    return {
      success: true,
      data: {
        ticketId: `TICKET_${Date.now()}`,
        status: 'completed',
        response:
          result.finalState.messages?.[result.finalState.messages.length - 1]
            ?.content || 'Ticket processed successfully',
        analysisType: 'simple',
        networkTopology: 'supervisor',
        executionTime: Date.now() - startTime,
      },
      metadata: {
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        instanceId: context.instanceId,
        agentsUsed: result.executionPath || ['customer-support-specialist'],
        checkpoints: result.checkpointCount || 1,
        threadId,
      },
    };
  }

  /**
   * Hierarchical network for complex/enterprise tickets
   * Demonstrates escalation rules and multi-level coordination
   */
  private async executeHierarchicalWorkflow(
    input: TicketRequest,
    context: WorkflowContext,
    startTime: number
  ): Promise<WorkflowResult> {
    // Setup hierarchical network with escalation rules
    const networkId = await context.coordinator.setupNetwork(
      'hierarchical-support',
      [
        { id: 'escalation-coordinator', type: 'EscalationCoordinator' },
        { id: 'customer-support-specialist', type: 'CustomerSupportAgent' },
        { id: 'quality-assurance', type: 'QualityAssurance' },
      ],
      'hierarchical',
      {
        levels: [
          ['escalation-coordinator'], // Level 0: Escalation Coordinator
          ['customer-support-specialist'], // Level 1: Support Specialist
          ['quality-assurance'], // Level 2: Quality Assurance
        ],
        escalationRules: [
          {
            condition: (state: AgentState) =>
              input.customerTier === 'enterprise',
            targetLevel: 0,
            message:
              'Enterprise customer - escalation coordinator handles directly',
          },
          {
            condition: (state: AgentState) => input.priority === 'critical',
            targetLevel: 0,
            message:
              'Critical priority - requires escalation coordinator oversight',
          },
          {
            condition: (state: AgentState) => {
              const complexity = (state as any).metadata?.complexity;
              return typeof complexity === 'number' && complexity > 0.8;
            },
            targetLevel: 1,
            message: 'High complexity - specialist expertise required',
          },
        ],
        systemPrompt: `Process ${input.customerTier} customer ticket with hierarchical escalation`,
        maxExecutionTime: 600000, // 10 minutes
      }
    );

    // Execute hierarchical workflow with checkpoint threading
    const threadId = `support-hierarchy-${input.customerTier}-${
      input.priority
    }-${Date.now()}`;
    const result = await context.coordinator.executeSimpleWorkflow(
      networkId,
      `HIERARCHICAL PROCESSING: "${input.title}" | Priority: ${input.priority} | Tier: ${input.customerTier} | Description: ${input.description}`,
      {
        configurable: {
          thread_id: threadId,
          checkpoint_ns: 'enhanced-support-hierarchy',
        },
      }
    );

    return {
      success: true,
      data: {
        ticketId: `TICKET_HIER_${Date.now()}`,
        status: 'completed',
        response:
          result.finalState.messages?.[result.finalState.messages.length - 1]
            ?.content || 'Hierarchical processing completed',
        analysisType: 'hierarchical',
        networkTopology: 'hierarchical',
        escalationLevel: this.determineEscalationLevel(input),
        executionTime: Date.now() - startTime,
      },
      metadata: {
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        instanceId: context.instanceId,
        agentsUsed: result.executionPath || [
          'escalation-coordinator',
          'customer-support-specialist',
        ],
        checkpoints: result.checkpointCount || 2,
        threadId,
      },
    };
  }

  /**
   * Weighted coordination for complex analysis requiring multiple perspectives
   * Demonstrates weighted tool merging across multiple agent opinions
   */
  private async executeWeightedCoordinationWorkflow(
    input: TicketRequest,
    context: WorkflowContext,
    startTime: number
  ): Promise<WorkflowResult> {
    // Setup weighted network where multiple agents provide analysis
    const networkId = await context.coordinator.setupNetwork(
      'weighted-analysis',
      [
        { id: 'customer-support-specialist', type: 'CustomerSupportAgent' },
        { id: 'escalation-coordinator', type: 'EscalationCoordinator' },
        { id: 'quality-assurance', type: 'QualityAssurance' },
      ],
      'weighted',
      {
        weights: {
          'customer-support-specialist': 0.4, // 40% weight for primary analysis
          'escalation-coordinator': 0.4, // 40% weight for risk assessment
          'quality-assurance': 0.2, // 20% weight for quality validation
        },
        consensusThreshold: 0.7, // Require 70% consensus for decisions
        systemPrompt:
          'Provide weighted analysis for complex customer support scenario',
        maxExecutionTime: 450000, // 7.5 minutes
      }
    );

    // Execute weighted workflow with checkpoint threading
    const threadId = `support-weighted-${input.title
      .replace(/\s+/g, '-')
      .toLowerCase()}-${Date.now()}`;
    const result = await context.coordinator.executeSimpleWorkflow(
      networkId,
      `WEIGHTED ANALYSIS: "${input.title}" | Multiple agent perspectives needed | Description: ${input.description}`,
      {
        configurable: {
          thread_id: threadId,
          checkpoint_ns: 'enhanced-support-weighted',
        },
      }
    );

    return {
      success: true,
      data: {
        ticketId: `TICKET_WEIGHTED_${Date.now()}`,
        status: 'completed',
        response:
          result.finalState.messages?.[result.finalState.messages.length - 1]
            ?.content || 'Weighted analysis completed',
        analysisType: 'weighted',
        networkTopology: 'weighted',
        consensusScore: result.finalState.metadata?.consensusScore || 0.8,
        agentContributions: {
          supportSpecialist:
            result.finalState.metadata?.supportAnalysis ||
            'Primary ticket analysis',
          escalationCoordinator:
            result.finalState.metadata?.riskAssessment ||
            'Risk and escalation assessment',
          qualityAssurance:
            result.finalState.metadata?.qualityValidation ||
            'Quality and compliance validation',
        },
        executionTime: Date.now() - startTime,
      },
      metadata: {
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        instanceId: context.instanceId,
        agentsUsed: result.executionPath || [
          'customer-support-specialist',
          'escalation-coordinator',
          'quality-assurance',
        ],
        checkpoints: result.checkpointCount || 3,
        threadId,
      },
    };
  }

  // Helper methods for workflow logic

  private determineNetworkTopology(
    input: TicketRequest
  ): 'simple' | 'hierarchical' | 'weighted' {
    // Enterprise or critical tickets use hierarchical
    if (input.customerTier === 'enterprise' || input.priority === 'critical') {
      return 'hierarchical';
    }

    // Complex issues requiring multiple perspectives use weighted
    if (input.description.length > 500 || input.category === 'technical') {
      return 'weighted';
    }

    // Simple tickets use basic supervisor network
    return 'simple';
  }

  private determineEscalationLevel(input: TicketRequest): number {
    if (input.customerTier === 'enterprise') return 0; // Top level
    if (input.priority === 'critical') return 0; // Top level
    if (input.priority === 'high') return 1; // Specialist level
    return 2; // Standard level
  }
}
