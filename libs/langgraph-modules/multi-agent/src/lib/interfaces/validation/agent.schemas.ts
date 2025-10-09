import { z } from 'zod';

/**
 * Validation schema for AgentDefinition
 */
export const AgentDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  systemPrompt: z.string().optional(),
  tools: z.array(z.unknown()).optional(),
  handoffTools: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        targetAgent: z.string(),
        schema: z.unknown().optional(),
        contextFilter: z.function().optional(),
      })
    )
    .optional(),
  capabilities: z.array(z.string()).optional(),
  nodeFunction: z.function(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Validation schema for AgentCommand
 */
export const AgentCommandSchema = z.object({
  goto: z.string(),
  update: z.record(z.unknown()).optional(),
  graph: z.enum(['PARENT', 'CURRENT']).or(z.string()).optional(),
});
