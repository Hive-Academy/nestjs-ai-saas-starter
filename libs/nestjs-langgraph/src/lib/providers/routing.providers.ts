import { Provider } from '@nestjs/common';
import { CommandProcessorService } from '../routing/command-processor.service';
import { AgentHandoffService } from '../routing/agent-handoff.service';
import { WorkflowRoutingService } from '../routing/workflow-routing.service';

/**
 * Routing service providers for the LangGraph module
 */
export function createRoutingProviders(): Provider[] {
  return [
    CommandProcessorService,
    AgentHandoffService,
    WorkflowRoutingService,
    // TODO: Re-enable when services are implemented
    // ConditionalRouterService,
    // RecoveryStrategyService,
    // PriorityRouterService,
  ];
}

/**
 * Routing service exports for the LangGraph module
 */
export const ROUTING_EXPORTS = [
  CommandProcessorService,
  AgentHandoffService,
  WorkflowRoutingService,
];
