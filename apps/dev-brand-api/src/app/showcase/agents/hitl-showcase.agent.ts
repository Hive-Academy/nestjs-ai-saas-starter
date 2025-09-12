import { Injectable } from '@nestjs/common';
import { Agent } from '@hive-academy/langgraph-multi-agent';
import { RequiresApproval } from '@hive-academy/langgraph-hitl';
import {
  StreamEvent,
  StreamEventType,
} from '@hive-academy/langgraph-streaming';
import { HumanMessage } from '@langchain/core/messages';
import type { ShowcaseAgentState } from '../types/showcase.types';

/**
 * ✅ HITL SHOWCASE AGENT - Human-in-the-Loop Specialist
 *
 * This agent demonstrates sophisticated human-in-the-loop workflows
 * with approval processes, risk assessment, and delegation patterns.
 */
@Agent({
  id: 'hitl-showcase',
  name: 'HITL Showcase Agent',
  description:
    'Demonstrates human-in-the-loop workflows with approval processes and risk assessment',

  tools: ['approval-manager', 'risk-assessor', 'delegation-handler'],
  capabilities: ['approval'],
  priority: 'medium',
  executionTime: 'slow', // HITL workflows take time for human input

  systemPrompt: `You are the HITL Showcase Agent, demonstrating human-in-the-loop workflows.
  You manage approval processes, risk assessment, and delegation with sophisticated configuration.`,

  metadata: {
    version: '1.0.0',
    category: 'hitl-demonstration',
    approvalCapabilities: ['risk-assessment', 'delegation', 'escalation'],
    decoratorsUsed: ['@Agent', '@RequiresApproval', '@StreamEvent'],
  },
})
@Injectable()
export class HitlShowcaseAgent {
  @RequiresApproval({
    confidenceThreshold: 0.7,
    message:
      'HITL Showcase requires human validation for demonstration purposes',
    timeoutMs: 60000,
    onTimeout: 'approve',
    riskAssessment: { enabled: true },
  })
  @StreamEvent({
    events: [StreamEventType.EVENTS],
    transformer: (event: any) => ({ ...event, hitlDemo: true }),
  })
  async nodeFunction(
    state: ShowcaseAgentState
  ): Promise<Partial<ShowcaseAgentState>> {
    console.log('✅ HITL Showcase Agent demonstrating approval workflows...');

    // Simulate HITL processing
    await new Promise((resolve) => setTimeout(resolve, 3000));

    return {
      ...state,
      currentAgentId: 'hitl-showcase',
      messages: [
        ...state.messages,
        new HumanMessage('Human-in-the-loop workflow demonstrated'),
      ],
    };
  }
}
