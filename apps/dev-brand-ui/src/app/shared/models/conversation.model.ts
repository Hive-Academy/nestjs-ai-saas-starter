/**
 * Frontend TypeScript interfaces matching backend conversation DTOs
 *
 * These models provide type safety for API responses and component state
 * in the conversation UI (research-chat and dev-brand-supervisor).
 *
 * IMPORTANT: Keep synchronized with backend DTOs at:
 * apps/dev-brand-api/src/app/business-workflows/controllers/dto/conversation.dto.ts
 */

/**
 * Conversation summary for list view
 * Matches backend: ConversationSummaryDto
 */
export interface ConversationSummary {
  threadId: string;
  preview: string;
  timestamp: string;
  status: 'active' | 'completed' | 'waiting';
  metadata: {
    query?: string;
    reportTitle?: string;
    researchStatus?: string;
  };
  unread: boolean;
  // Supervisor-specific fields (extends SupervisorConversationSummaryDto)
  currentAgent?: string;
  workflowProgress?: number;
}

/**
 * Response for conversation list endpoint
 * Matches backend: ConversationListResponseDto
 */
export interface ConversationListResponse {
  conversations: ConversationSummary[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Single message in conversation
 * Matches backend: MessageDto
 */
export interface Message {
  role: 'human' | 'ai' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: any[];
  // Supervisor-specific field (extends SupervisorMessageDto)
  agentId?: string;
}

/**
 * Full conversation history response
 * Matches backend: ConversationHistoryResponseDto
 */
export interface ConversationHistoryResponse {
  threadId: string;
  userId: string;
  conversationHistory: Message[];
  metadata: {
    query?: string;
    reportTitle?: string;
    researchStatus?: string;
    confidenceScore?: number;
  };
  nextSteps: string[];
  waitingForApproval: boolean;
  checkpointId?: string;
  // Supervisor-specific field (extends SupervisorConversationHistoryResponseDto)
  agentCoordination?: {
    currentAgent?: string;
    nextAgent?: string;
    agentHistory: Array<{ agentId: string; timestamp: string; action: string }>;
    pendingTasks: any[];
  };
}

/**
 * Response for new conversation creation
 * Matches backend: NewConversationResponseDto
 */
export interface NewConversationResponse {
  threadId: string;
  status: 'created';
  conversationUrl: string;
}

/**
 * Type guard: Check if conversation has supervisor-specific fields
 */
export function isSupervisorConversation(
  conversation: ConversationSummary
): conversation is ConversationSummary & { currentAgent: string } {
  return conversation.currentAgent !== undefined;
}

/**
 * Type guard: Check if message has supervisor-specific fields
 */
export function isSupervisorMessage(
  message: Message
): message is Message & { agentId: string } {
  return message.agentId !== undefined;
}

/**
 * Type guard: Check if history has supervisor-specific fields
 */
export function isSupervisorHistory(
  history: ConversationHistoryResponse
): history is ConversationHistoryResponse & {
  agentCoordination: NonNullable<
    ConversationHistoryResponse['agentCoordination']
  >;
} {
  return history.agentCoordination !== undefined;
}
