import { Injectable } from '@nestjs/common';
import { AIMessage } from '@langchain/core/messages';
import {
  AgentDefinition,
  AgentState,
  AgentNetwork,
  SupervisorConfig,
  SwarmConfig,
  MULTI_AGENT_CONSTANTS,
} from '../interfaces/multi-agent.interface';

/**
 * Example service demonstrating 2025 LangGraph multi-agent patterns
 */
@Injectable()
export class AgentExamplesService {
  // Logger removed as it was not used in the implementation

  /**
   * Create a simple research assistant supervisor network
   */
  createResearchAssistantNetwork(): AgentNetwork {
    const researcherAgent: AgentDefinition = {
      id: 'researcher',
      name: 'Researcher',
      description:
        'Conducts thorough research and gathers information on topics',
      systemPrompt:
        'You are a research specialist. Gather comprehensive information and provide detailed analysis.',
      nodeFunction: async (state: AgentState) => {
        // Simulate research work
        const lastMessage = state.messages[state.messages.length - 1];
        const research = `Research findings on: ${lastMessage.content}
        
Key findings:
- Finding 1: Relevant information discovered
- Finding 2: Additional context provided
- Finding 3: Important insights gathered

Research complete. Passing to writer for documentation.`;

        return {
          messages: [new AIMessage(research)],
          scratchpad: `Research completed for: ${lastMessage.content}`,
        };
      },
    };

    const writerAgent: AgentDefinition = {
      id: 'writer',
      name: 'Writer',
      description:
        'Creates well-structured documents and reports from research',
      systemPrompt:
        'You are a technical writer. Create clear, well-structured documentation.',
      nodeFunction: async (state: AgentState) => {
        // Simulate writing work
        const researchContent = state.scratchpad || 'Previous research content';
        const document = `Technical Document
        
Based on the research conducted:
${researchContent}

Executive Summary:
This document presents the findings from our research analysis...

Recommendations:
1. Implementation of key findings
2. Further investigation areas
3. Action items for next steps

Document completed by Writer Agent.`;

        return {
          messages: [new AIMessage(document)],
          scratchpad: `${state.scratchpad}\nDocument created by writer`,
        };
      },
    };

    const reviewerAgent: AgentDefinition = {
      id: 'reviewer',
      name: 'Reviewer',
      description: 'Reviews and validates work quality before finalization',
      systemPrompt:
        'You are a quality reviewer. Ensure accuracy and completeness.',
      nodeFunction: async (state: AgentState) => {
        // Simulate review work
        const review = `Quality Review Complete
        
Review Status: APPROVED ✓

Quality Check Results:
- Accuracy: High
- Completeness: Comprehensive  
- Clarity: Excellent
- Recommendations: Well-structured

The research and documentation meet our quality standards.
Ready for delivery.`;

        return {
          messages: [new AIMessage(review)],
          scratchpad: `${state.scratchpad}\nQuality review completed`,
        };
      },
    };

    const supervisorConfig: SupervisorConfig = {
      systemPrompt: MULTI_AGENT_CONSTANTS.DEFAULT_SUPERVISOR_PROMPT,
      workers: ['researcher', 'writer', 'reviewer'],
      enableForwardMessage: true,
      removeHandoffMessages: true,
    };

    return {
      id: 'research-assistant-network',
      type: 'supervisor',
      agents: [researcherAgent, writerAgent, reviewerAgent],
      config: supervisorConfig,
      compilationOptions: {
        debug: true,
        enableInterrupts: false,
      },
    };
  }

  /**
   * Create a customer support swarm network
   */
  createCustomerSupportSwarm(): AgentNetwork {
    const triageAgent: AgentDefinition = {
      id: 'triage',
      name: 'Triage Agent',
      description: 'Initial customer inquiry assessment and routing',
      handoffTools: [
        {
          name: 'transfer_to_technical',
          description: 'Transfer to technical support for complex issues',
          targetAgent: 'technical',
        },
        {
          name: 'transfer_to_billing',
          description: 'Transfer to billing for payment-related issues',
          targetAgent: 'billing',
        },
      ],
      nodeFunction: async (state: AgentState) => {
        const lastMessage = state.messages[state.messages.length - 1];
        const inquiry = lastMessage.content as string;

        // Simple routing logic based on keywords
        if (
          inquiry.toLowerCase().includes('billing') ||
          inquiry.toLowerCase().includes('payment')
        ) {
          return {
            messages: [
              new AIMessage(
                'I see this is billing-related. Transferring to our billing specialist.'
              ),
            ],
            next: 'billing',
            task: 'Handle billing inquiry',
          };
        } else if (
          inquiry.toLowerCase().includes('technical') ||
          inquiry.toLowerCase().includes('error')
        ) {
          return {
            messages: [
              new AIMessage(
                'This appears technical. Connecting you to technical support.'
              ),
            ],
            next: 'technical',
            task: 'Resolve technical issue',
          };
        }
        return {
          messages: [
            new AIMessage(
              'I can help with general inquiries. How may I assist you today?'
            ),
          ],
          next: MULTI_AGENT_CONSTANTS.END,
        };
      },
    };

    const technicalAgent: AgentDefinition = {
      id: 'technical',
      name: 'Technical Support',
      description: 'Handles technical issues and troubleshooting',
      handoffTools: [
        {
          name: 'transfer_to_triage',
          description: 'Transfer back to triage for non-technical issues',
          targetAgent: 'triage',
        },
      ],
      nodeFunction: async (state: AgentState) => {
        const response = `Technical Support Response:

I've analyzed your technical issue and here's my assessment:

1. Issue Classification: Technical inquiry
2. Troubleshooting Steps:
   - Step 1: Check system requirements
   - Step 2: Verify configuration
   - Step 3: Test connectivity
3. Resolution: Applied fix for reported issue

Your technical issue has been resolved. Is there anything else I can help with?`;

        return {
          messages: [new AIMessage(response)],
          next: MULTI_AGENT_CONSTANTS.END,
        };
      },
    };

    const billingAgent: AgentDefinition = {
      id: 'billing',
      name: 'Billing Support',
      description: 'Handles billing and payment inquiries',
      handoffTools: [
        {
          name: 'transfer_to_triage',
          description: 'Transfer back to triage for non-billing issues',
          targetAgent: 'triage',
        },
      ],
      nodeFunction: async (state: AgentState) => {
        const response = `Billing Support Response:

I've reviewed your billing inquiry:

Account Status: Active ✓
Payment Method: Valid ✓
Recent Charges: Processed successfully

Summary:
- All billing information is current
- No outstanding issues detected  
- Next billing cycle: As scheduled

Your billing inquiry has been resolved. Anything else I can help with today?`;

        return {
          messages: [new AIMessage(response)],
          next: MULTI_AGENT_CONSTANTS.END,
        };
      },
    };

    const swarmConfig: SwarmConfig = {
      enableDynamicHandoffs: true,
      messageHistory: {
        removeHandoffMessages: true,
        addAgentAttribution: true,
        maxMessages: 20,
      },
      contextIsolation: {
        enabled: false,
        sharedKeys: ['customer_id', 'session_id'],
      },
    };

    return {
      id: 'customer-support-swarm',
      type: 'swarm',
      agents: [triageAgent, technicalAgent, billingAgent],
      config: swarmConfig,
      compilationOptions: {
        debug: true,
      },
    };
  }

  /**
   * Create a simple two-agent conversation example
   */
  createSimpleConversationNetwork(): AgentNetwork {
    const aliceAgent: AgentDefinition = {
      id: 'alice',
      name: 'Alice',
      description: 'Friendly conversationalist who likes to ask questions',
      nodeFunction: async (state: AgentState) => {
        const response = `Hi! I'm Alice. I love having conversations! 
What's your favorite topic to discuss? I'm curious to hear your thoughts.`;

        return {
          messages: [new AIMessage(response)],
          next: 'bob',
          task: 'Continue the conversation',
        };
      },
    };

    const bobAgent: AgentDefinition = {
      id: 'bob',
      name: 'Bob',
      description: 'Thoughtful responder who provides detailed answers',
      nodeFunction: async (state: AgentState) => {
        const response = `Hello Alice! I'm Bob. I enjoy discussing technology, science, and philosophy.
I think meaningful conversations help us learn and grow. What interests you most?`;

        return {
          messages: [new AIMessage(response)],
          next: MULTI_AGENT_CONSTANTS.END,
        };
      },
    };

    const supervisorConfig: SupervisorConfig = {
      systemPrompt: `You are managing a friendly conversation between Alice and Bob.
Let them have a natural back-and-forth dialogue.`,
      workers: ['alice', 'bob'],
      removeHandoffMessages: true,
    };

    return {
      id: 'simple-conversation',
      type: 'supervisor',
      agents: [aliceAgent, bobAgent],
      config: supervisorConfig,
    };
  }

  /**
   * Get all example networks
   */
  getAllExampleNetworks(): AgentNetwork[] {
    return [
      this.createResearchAssistantNetwork(),
      this.createCustomerSupportSwarm(),
      this.createSimpleConversationNetwork(),
    ];
  }

  /**
   * Get example network by ID
   */
  getExampleNetwork(id: string): AgentNetwork | undefined {
    const networks = this.getAllExampleNetworks();
    return networks.find((network) => network.id === id);
  }
}
