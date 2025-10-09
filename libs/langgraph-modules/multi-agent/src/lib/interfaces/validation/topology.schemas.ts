import { z } from 'zod';

/**
 * Validation schema for SupervisorConfig
 */
export const SupervisorConfigSchema = z.object({
  systemPrompt: z.string(),
  workers: z.array(z.string()).min(1),
  llm: z
    .object({
      model: z.string(),
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
    })
    .optional(),
  routingTool: z
    .object({
      name: z.string(),
      description: z.string(),
    })
    .optional(),
  enableForwardMessage: z.boolean().optional(),
  removeHandoffMessages: z.boolean().optional(),
});

/**
 * Validation schema for SwarmConfig
 */
export const SwarmConfigSchema = z.object({
  enableDynamicHandoffs: z.boolean(),
  messageHistory: z.object({
    removeHandoffMessages: z.boolean(),
    addAgentAttribution: z.boolean(),
    maxMessages: z.number().positive().optional(),
  }),
  contextIsolation: z.object({
    enabled: z.boolean(),
    sharedKeys: z.array(z.string()).optional(),
  }),
});

/**
 * Validation schema for NetworkConfig (NEW)
 */
export const NetworkConfigSchema = z.object({
  enableLlmRouting: z.boolean(),
  routingStrategy: z.enum(['llm', 'rules', 'hybrid']),
  routingRules: z
    .array(
      z.object({
        condition: z.function(),
        targetAgent: z.string(),
        priority: z.number().optional(),
      })
    )
    .optional(),
  topology: z.enum(['full-mesh', 'partial-mesh', 'custom']).optional(),
  communicationMatrix: z.record(z.array(z.string())).optional(),
  trackRoutingHistory: z.boolean().optional(),
  maxRoutingHops: z.number().positive().optional(),
});

/**
 * Validation schema for HierarchicalConfig
 */
export const HierarchicalConfigSchema = z.object({
  levels: z.array(z.array(z.string())),
  escalationRules: z
    .array(
      z.object({
        condition: z.function(),
        targetLevel: z.number(),
        message: z.string().optional(),
      })
    )
    .optional(),
  parentGraphRules: z
    .array(
      z.object({
        condition: z.function(),
        targetAgent: z.string(),
        command: z.object({
          goto: z.string(),
          update: z.record(z.unknown()).optional(),
          graph: z.enum(['PARENT', 'CURRENT']).or(z.string()).optional(),
        }),
      })
    )
    .optional(),
});
