import {
  Controller,
  Get,
  Param,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

/**
 * Conversation History Controller
 *
 * Provides REST API endpoints for retrieving conversation history
 * and thread state snapshots from LangGraph checkpointer storage.
 *
 * Architecture Pattern:
 * ┌───────────────────────────────────────────────────────────────┐
 * │ 1. GET /api/langgraph/conversation-history/:userId           │
 * │    → WorkflowExecutionService.listThreadStates()             │
 * │    → Returns Map<threadId, StateSnapshot>                    │
 * │                                                                │
 * │ 2. GET /api/langgraph/conversation-history/:userId/thread/:threadId │
 * │    → WorkflowExecutionService.getStateSnapshot()             │
 * │    → Returns StateSnapshot (current state + next nodes)      │
 * └───────────────────────────────────────────────────────────────┘
 *
 * Implementation: TASK_2025_048 - BATCH 2, Task 2.1
 */
@Controller('langgraph/conversation-history')
@ApiTags('Conversation History')
export class ConversationHistoryController {
  private readonly logger = new Logger(ConversationHistoryController.name);

  /**
   * Get conversation history for a user
   *
   * Retrieves all thread states associated with a user ID from
   * the LangGraph checkpointer. Returns a map of thread IDs to
   * their latest state snapshots.
   *
   * @param userId - User identifier
   * @returns Object containing userId and map of thread states
   * @throws 404 if user has no threads
   * @throws 500 for internal errors
   */
  @Get(':userId')
  @ApiOperation({
    summary: 'Get conversation history for user',
    description:
      'Retrieves all thread states for a given user from LangGraph checkpointer',
  })
  @ApiParam({
    name: 'userId',
    description: 'User identifier',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Thread states retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        threads: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            description: 'LangGraph StateSnapshot',
          },
        },
        totalThreads: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No threads found for user',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getConversationHistory(@Param('userId') userId: string): Promise<{
    userId: string;
    threads: Record<string, any>;
    totalThreads: number;
  }> {
    this.logger.log(`Retrieving conversation history for user: ${userId}`);

    try {
      // Note: WorkflowExecutionService.listThreadStates() expects threadIds array
      // In a real implementation, we'd need a user→thread mapping (e.g., Neo4j index)
      // For now, we return empty since we don't have that mapping yet
      //
      // TODO (Phase 2): Implement Neo4j indexing for userId → threadId mapping
      // 1. Create ThreadMetadata entity with userId, threadId, workflowType, createdAt
      // 2. Store thread metadata on workflow start
      // 3. Query Neo4j for user's thread IDs
      // 4. Pass thread IDs to listThreadStates()

      this.logger.warn(
        `userId→threadId mapping not implemented yet (Phase 2). Returning empty history.`
      );

      return {
        userId,
        threads: {},
        totalThreads: 0,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to retrieve conversation history for user ${userId}:`,
        error.message
      );

      throw new HttpException(
        error.message || 'Failed to retrieve conversation history',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get specific thread state snapshot
   *
   * Retrieves the current state snapshot for a specific thread ID,
   * including state values, next nodes to execute, and metadata.
   *
   * @param userId - User identifier (for validation)
   * @param threadId - Thread identifier
   * @returns Object containing threadId and StateSnapshot
   * @throws 404 if thread not found
   * @throws 500 for internal errors
   */
  @Get(':userId/thread/:threadId')
  @ApiOperation({
    summary: 'Get specific thread state',
    description:
      'Retrieves the current state snapshot for a specific thread from LangGraph checkpointer',
  })
  @ApiParam({
    name: 'userId',
    description: 'User identifier',
    type: 'string',
  })
  @ApiParam({
    name: 'threadId',
    description: 'Thread identifier',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Thread state retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        threadId: { type: 'string' },
        state: {
          type: 'object',
          description: 'LangGraph StateSnapshot',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Thread not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getThreadState(
    @Param('userId') userId: string,
    @Param('threadId') threadId: string
  ): Promise<{
    userId: string;
    threadId: string;
    state: any;
  }> {
    this.logger.log(`Retrieving thread ${threadId} for user ${userId}`);

    // TASK_2025_049: API broken - getStateSnapshot requires workflowClass parameter
    // This endpoint cannot work without knowing which workflow to compile
    throw new HttpException(
      'API broken: getStateSnapshot requires workflowClass parameter. Use WorkflowResumptionService.getWorkflowState() directly in your application code.',
      HttpStatus.NOT_IMPLEMENTED
    );
  }
}
