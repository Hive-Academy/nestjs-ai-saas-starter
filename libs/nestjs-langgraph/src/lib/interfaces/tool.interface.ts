import { z } from 'zod';

export interface ToolDefinition {
  name: string;
  description: string;
  schema?: z.ZodSchema;
  agents?: string[] | '*';
  tags?: string[];
  examples?: ToolExample[];
  rateLimit?: RateLimitConfig;
  streaming?: boolean;
  timeout?: number;
}

export interface ToolExample {
  input: any;
  output: any;
  description?: string;
}

export interface RateLimitConfig {
  requests: number;
  window: number; // milliseconds
}

export interface ToolResult {
  success: boolean;
  output?: any;
  error?: Error;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: any;
  timestamp: Date;
}