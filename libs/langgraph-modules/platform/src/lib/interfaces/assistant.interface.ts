/**
 * LangGraph Platform Assistant interfaces
 * Based on the official LangGraph Platform API structure
 */

export interface Assistant {
  assistant_id: string;
  graph_id: string;
  name: string;
  config: AssistantConfig;
  metadata: AssistantMetadata;
  created_at: string;
  updated_at: string;
}

export interface AssistantConfig {
  configurable?: Record<string, unknown>;
  recursion_limit?: number;
  tags?: readonly string[];
  [key: string]: unknown;
}

export interface AssistantMetadata {
  created_by?: string;
  version?: string;
  description?: string;
  [key: string]: unknown;
}

export interface CreateAssistantRequest {
  graph_id: string;
  name: string;
  config?: AssistantConfig;
  metadata?: AssistantMetadata;
}

export interface UpdateAssistantRequest {
  name?: string;
  config?: AssistantConfig;
  metadata?: AssistantMetadata;
}

export interface AssistantSearchParams {
  offset?: number;
  limit?: number;
  graph_id?: string;
  metadata?: Record<string, unknown>;
}

export interface AssistantsSearchResponse {
  assistants: readonly Assistant[];
}