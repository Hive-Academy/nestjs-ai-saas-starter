import { z } from 'zod';
import { AgentDefinitionSchema } from './agent.schemas';
import {
  SupervisorConfigSchema,
  SwarmConfigSchema,
  HierarchicalConfigSchema,
  NetworkConfigSchema,
} from './topology.schemas';

/**
 * Validation schema for RoutingDecision
 */
export const RoutingDecisionSchema = z.object({
  next: z.string(),
  reasoning: z.string().optional(),
  task: z.string().optional(),
});

/**
 * Validation schema for AgentNetwork
 */
export const AgentNetworkSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['supervisor', 'swarm', 'hierarchical', 'network']),
  agents: z.array(AgentDefinitionSchema).min(1),
  config: z.union([
    SupervisorConfigSchema,
    SwarmConfigSchema,
    HierarchicalConfigSchema,
    NetworkConfigSchema,
  ]),
  stateSchema: z.unknown().optional(),
  compilationOptions: z
    .object({
      enableInterrupts: z.boolean().optional(),
      checkpointer: z.unknown().optional(),
      debug: z.boolean().optional(),
    })
    .optional(),
});
