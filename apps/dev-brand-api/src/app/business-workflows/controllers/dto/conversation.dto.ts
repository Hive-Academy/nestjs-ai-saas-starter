import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Request DTO: Create new conversation
 */
export class NewConversationDto {
  @ApiProperty({
    required: false,
    example: 'How does LangGraph work?',
    description: 'Optional initial query to start conversation with',
  })
  @IsOptional()
  @IsString()
  initialQuery?: string;
}

/**
 * Response DTO: New conversation created
 */
export class NewConversationResponseDto {
  @ApiProperty({ example: 'research-1697456789-user-001' })
  threadId!: string;

  @ApiProperty({ example: 'created' })
  status!: 'created';

  @ApiProperty({ example: '/research-chat' })
  conversationUrl!: string;
}

/**
 * Response DTO: Conversation summary (list item)
 */
export class ConversationSummaryDto {
  @ApiProperty({ example: 'research-1697456789-user-001' })
  threadId!: string;

  @ApiProperty({ example: 'What are the benefits of LangGraph?' })
  preview!: string;

  @ApiProperty({ example: '2025-01-15T10:30:00.000Z' })
  timestamp!: string;

  @ApiProperty({ enum: ['active', 'completed', 'waiting'] })
  status!: 'active' | 'completed' | 'waiting';

  @ApiProperty({ type: Object })
  metadata!: {
    query?: string;
    reportTitle?: string;
    researchStatus?: string;
  };

  @ApiProperty({ example: false })
  unread!: boolean;
}

/**
 * Response DTO: Conversation list
 */
export class ConversationListResponseDto {
  @ApiProperty({ type: [ConversationSummaryDto] })
  conversations!: ConversationSummaryDto[];

  @ApiProperty({ example: 10 })
  totalCount!: number;

  @ApiProperty({ example: false })
  hasMore!: boolean;
}

/**
 * Response DTO: Message in conversation
 */
export class MessageDto {
  @ApiProperty({ enum: ['human', 'ai', 'system'] })
  role!: 'human' | 'ai' | 'system';

  @ApiProperty({ example: 'What are the benefits of LangGraph?' })
  content!: string;

  @ApiProperty({ example: '2025-01-15T10:30:00.000Z' })
  timestamp!: string;

  @ApiProperty({ type: [Object], required: false })
  toolCalls?: any[];
}

/**
 * Response DTO: Conversation history
 */
export class ConversationHistoryResponseDto {
  @ApiProperty({ example: 'research-1697456789-user-001' })
  threadId!: string;

  @ApiProperty({ example: 'test-researcher-001' })
  userId!: string;

  @ApiProperty({ type: [MessageDto] })
  conversationHistory!: MessageDto[];

  @ApiProperty({ type: Object })
  metadata!: {
    query?: string;
    reportTitle?: string;
    researchStatus?: string;
    confidenceScore?: number;
  };

  @ApiProperty({ type: [String] })
  nextSteps!: string[];

  @ApiProperty({ example: false })
  waitingForApproval!: boolean;

  @ApiProperty({ example: 'ckpt-123', required: false })
  checkpointId?: string;
}

/**
 * Supervisor-specific DTOs
 */
export class SupervisorConversationSummaryDto extends ConversationSummaryDto {
  @ApiProperty({ example: 'personal-brand-strategist', required: false })
  currentAgent?: string;

  @ApiProperty({ example: 45, required: false })
  workflowProgress?: number;
}

export class SupervisorMessageDto extends MessageDto {
  @ApiProperty({ example: 'github-analyzer', required: false })
  agentId?: string;
}

export class SupervisorConversationHistoryResponseDto extends ConversationHistoryResponseDto {
  @ApiProperty({ type: [SupervisorMessageDto] })
  declare conversationHistory: SupervisorMessageDto[];

  @ApiProperty({ type: Object })
  agentCoordination!: {
    currentAgent?: string;
    nextAgent?: string;
    agentHistory: Array<{ agentId: string; timestamp: string; action: string }>;
    pendingTasks: any[];
  };
}
