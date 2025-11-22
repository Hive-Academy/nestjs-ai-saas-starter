# Controller Implementation Guide - Conversation History & Resumption

**Task**: TASK_2025_049
**Purpose**: Implement conversation history and workflow resumption endpoints in application controllers
**Pattern**: Transport-agnostic service consumption

---

## Overview

Following the architectural improvement in TASK_2025_049, the workflow-engine library now exposes **services only** (business logic), not controllers (transport layer). This allows applications to:

1. ✅ Choose their API style (REST, GraphQL, gRPC, WebSocket)
2. ✅ Add custom business logic (auth, validation, pagination)
3. ✅ Customize endpoints per workflow type
4. ✅ Implement workflow-specific features

This guide provides implementation patterns for:

- **Researcher workflow** history endpoints (`research-chat.controller.ts`)
- **Supervisor workflow** history endpoints (`devbrand.controller.ts`)

---

## Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│  @hive-academy/langgraph-workflow-engine (LIBRARY)          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ WorkflowResumptionService (Business Logic)           │   │
│  │ - resumeWorkflow(workflowClass, threadId, value)     │   │
│  │ - getWorkflowState(workflowClass, threadId)          │   │
│  │ - updateWorkflowState(workflowClass, threadId, ...)  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ inject
                            │
┌───────────────────────────┴─────────────────────────────────┐
│  dev-brand-api (APPLICATION)                                │
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │ research-chat.controller│  │ devbrand.controller     │  │
│  │ (Researcher endpoints)  │  │ (Supervisor endpoints)  │  │
│  │                         │  │                         │  │
│  │ GET /history/:threadId  │  │ GET /history/:threadId  │  │
│  │ POST /resume/:threadId  │  │ POST /resume/:threadId  │  │
│  │ PATCH /state/:threadId  │  │ PATCH /state/:threadId  │  │
│  └─────────────────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation 1: Researcher Workflow Controller

**File**: `apps/dev-brand-api/src/app/business-workflows/controllers/research-chat.controller.ts`

### Add Import

```typescript
import { WorkflowResumptionService } from '@hive-academy/langgraph-workflow-engine';
```

### Inject Service

```typescript
@Controller('research-chat')
export class ResearchChatController {
  constructor(
    // ... existing dependencies
    private readonly workflowResumptionService: WorkflowResumptionService
  ) {}
}
```

### Endpoint 1: Get Conversation History

**Purpose**: Retrieve complete conversation history for a researcher workflow thread

**Pattern**:

- Extract userId from JWT authentication
- Verify thread ownership (security)
- Get sanitized state snapshot
- Return conversation messages + metadata

```typescript
/**
 * Get conversation history for researcher workflow
 *
 * @route GET /research-chat/conversation/history/:threadId
 * @auth Required (JWT)
 * @returns Sanitized conversation history with messages and metadata
 */
@Get('conversation/history/:threadId')
@UseGuards(JwtAuthGuard) // Ensure user is authenticated
async getConversationHistory(
  @Param('threadId') threadId: string,
  @Req() request: Request
) {
  const userId = request.user?.id; // Extract from JWT

  try {
    // Get workflow state from resumption service
    const stateSnapshot = await this.workflowResumptionService.getWorkflowState(
      ResearcherAgent, // Workflow class reference
      threadId
    );

    // Security: Verify thread ownership
    const threadUserId = stateSnapshot.values.metadata?.userId;
    if (threadUserId && threadUserId !== userId) {
      throw new UnauthorizedException(
        `User ${userId} cannot access thread ${threadId}`
      );
    }

    // Extract conversation messages
    const messages = stateSnapshot.values.messages || [];

    // Format response with researcher-specific structure
    return {
      threadId,
      userId: threadUserId,
      conversationHistory: messages.map((msg) => ({
        role: msg._getType(), // 'human' | 'ai' | 'system'
        content: msg.content,
        timestamp: msg.additional_kwargs?.timestamp || new Date().toISOString(),
        toolCalls: msg.tool_calls || [], // Show tool executions
      })),
      metadata: {
        query: stateSnapshot.values.metadata?.query,
        reportTitle: stateSnapshot.values.metadata?.reportTitle,
        researchStatus: stateSnapshot.values.metadata?.researchStatus,
        confidenceScore: stateSnapshot.values.metadata?.confidenceScore,
      },
      nextSteps: stateSnapshot.next, // Next nodes to execute
      waitingForApproval: stateSnapshot.values.metadata?.waitingForApproval || false,
      checkpointId: stateSnapshot.config.configurable?.checkpoint_id,
    };
  } catch (error) {
    this.logger.error(
      `Failed to retrieve conversation history for thread ${threadId}:`,
      error.message
    );

    if (error instanceof UnauthorizedException) {
      throw error;
    }

    throw new NotFoundException(
      `Conversation history not found for thread ${threadId}`
    );
  }
}
```

### Endpoint 2: Resume Researcher Workflow

**Purpose**: Resume researcher workflow after HITL approval

**Pattern**:

- Extract approval data from request body
- Get current checkpoint ID from state
- Resume workflow with user input
- Return resumption status

```typescript
/**
 * Resume researcher workflow after approval
 *
 * @route POST /research-chat/conversation/resume/:threadId
 * @auth Required (JWT)
 * @body { approved: boolean, feedback?: string }
 * @returns Workflow resumption status
 */
@Post('conversation/resume/:threadId')
@UseGuards(JwtAuthGuard)
async resumeResearcherWorkflow(
  @Param('threadId') threadId: string,
  @Body() resumeDto: ResumeWorkflowDto,
  @Req() request: Request
) {
  const userId = request.user?.id;

  try {
    // Get current state to extract checkpoint ID
    const stateSnapshot = await this.workflowResumptionService.getWorkflowState(
      ResearcherAgent,
      threadId
    );

    // Security: Verify thread ownership
    const threadUserId = stateSnapshot.values.metadata?.userId;
    if (threadUserId && threadUserId !== userId) {
      throw new UnauthorizedException(
        `User ${userId} cannot resume thread ${threadId}`
      );
    }

    // Verify workflow is waiting for approval
    if (!stateSnapshot.values.metadata?.waitingForApproval) {
      throw new BadRequestException(
        `Thread ${threadId} is not waiting for approval`
      );
    }

    // Extract checkpoint ID for precise resumption point
    const checkpointId = stateSnapshot.config.configurable?.checkpoint_id;

    // Resume workflow with approval data
    const result = await this.workflowResumptionService.resumeWorkflow(
      ResearcherAgent,
      threadId,
      {
        approved: resumeDto.approved,
        feedback: resumeDto.feedback || '',
        userId,
        timestamp: new Date().toISOString(),
      },
      checkpointId // Resume from exact checkpoint
    );

    this.logger.log(
      `Researcher workflow resumed: threadId=${threadId}, approved=${resumeDto.approved}`
    );

    return {
      success: true,
      threadId,
      checkpointId,
      resumedAt: new Date().toISOString(),
      approvalDecision: resumeDto.approved ? 'approved' : 'rejected',
      nextState: result.metadata?.researchStatus,
    };
  } catch (error) {
    this.logger.error(
      `Failed to resume researcher workflow for thread ${threadId}:`,
      error.message
    );

    if (
      error instanceof UnauthorizedException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }

    throw new InternalServerErrorException(
      `Failed to resume workflow for thread ${threadId}`
    );
  }
}
```

### Endpoint 3: Update Researcher State (Advanced)

**Purpose**: Manually update researcher workflow state (admin/debugging)

**Pattern**:

- Validate admin permissions
- Update specific state fields
- Log state changes for audit

```typescript
/**
 * Update researcher workflow state (admin only)
 *
 * @route PATCH /research-chat/conversation/state/:threadId
 * @auth Required (JWT + Admin role)
 * @body { updates: Record<string, any>, asNode?: string }
 * @returns Updated state confirmation
 */
@Patch('conversation/state/:threadId')
@UseGuards(JwtAuthGuard, AdminGuard) // Admin only
async updateResearcherState(
  @Param('threadId') threadId: string,
  @Body() updateDto: UpdateStateDto,
  @Req() request: Request
) {
  const adminId = request.user?.id;

  try {
    // Update workflow state
    await this.workflowResumptionService.updateWorkflowState(
      ResearcherAgent,
      threadId,
      updateDto.updates,
      updateDto.asNode // Optional: update as specific node
    );

    this.logger.warn(
      `Researcher workflow state updated by admin ${adminId}: threadId=${threadId}, updates=${JSON.stringify(updateDto.updates)}`
    );

    return {
      success: true,
      threadId,
      updatedBy: adminId,
      updatedAt: new Date().toISOString(),
      updates: updateDto.updates,
    };
  } catch (error) {
    this.logger.error(
      `Failed to update researcher workflow state for thread ${threadId}:`,
      error.message
    );

    throw new InternalServerErrorException(
      `Failed to update workflow state for thread ${threadId}`
    );
  }
}
```

### DTOs for Researcher Endpoints

**File**: `apps/dev-brand-api/src/app/business-workflows/controllers/dto/resume-workflow.dto.ts`

```typescript
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResumeWorkflowDto {
  @ApiProperty({
    description: 'Approval decision (true = approved, false = rejected)',
    example: true,
  })
  @IsBoolean()
  approved: boolean;

  @ApiProperty({
    description: 'Optional feedback from user',
    example: 'Research report looks good, please proceed',
    required: false,
  })
  @IsOptional()
  @IsString()
  feedback?: string;
}

export class UpdateStateDto {
  @ApiProperty({
    description: 'State updates to apply',
    example: { researchStatus: 'completed', confidenceScore: 0.95 },
  })
  updates: Record<string, any>;

  @ApiProperty({
    description: 'Apply updates as specific node (optional)',
    example: 'generateReport',
    required: false,
  })
  @IsOptional()
  @IsString()
  asNode?: string;
}
```

---

## Implementation 2: Supervisor Workflow Controller

**File**: `apps/dev-brand-api/src/app/controllers/devbrand.controller.ts`

### Add Import

```typescript
import { WorkflowResumptionService } from '@hive-academy/langgraph-workflow-engine';
```

### Inject Service

```typescript
@Controller('devbrand')
export class DevBrandController {
  constructor(
    // ... existing dependencies
    private readonly workflowResumptionService: WorkflowResumptionService
  ) {}
}
```

### Endpoint 1: Get Supervisor Conversation History

**Purpose**: Retrieve supervisor workflow conversation with multi-agent coordination details

**Pattern**:

- Similar to researcher but includes agent routing information
- Shows supervisor → worker agent handoffs
- Displays agent-specific task assignments

```typescript
/**
 * Get conversation history for supervisor workflow
 *
 * @route GET /devbrand/conversation/history/:threadId
 * @auth Required (JWT)
 * @returns Supervisor conversation with agent routing details
 */
@Get('conversation/history/:threadId')
@UseGuards(JwtAuthGuard)
async getSupervisorConversationHistory(
  @Param('threadId') threadId: string,
  @Req() request: Request
) {
  const userId = request.user?.id;

  try {
    // Get workflow state from resumption service
    const stateSnapshot = await this.workflowResumptionService.getWorkflowState(
      DevBrandSupervisorWorkflow, // Supervisor workflow class
      threadId
    );

    // Security: Verify thread ownership
    const threadUserId = stateSnapshot.values.metadata?.userId;
    if (threadUserId && threadUserId !== userId) {
      throw new UnauthorizedException(
        `User ${userId} cannot access thread ${threadId}`
      );
    }

    // Extract conversation messages
    const messages = stateSnapshot.values.messages || [];

    // Format response with supervisor-specific structure
    return {
      threadId,
      userId: threadUserId,
      conversationHistory: messages.map((msg) => ({
        role: msg._getType(), // 'human' | 'ai' | 'system'
        content: msg.content,
        timestamp: msg.additional_kwargs?.timestamp || new Date().toISOString(),
        agentId: msg.additional_kwargs?.agentId, // Which agent sent message
        toolCalls: msg.tool_calls || [],
      })),
      metadata: {
        query: stateSnapshot.values.metadata?.query,
        currentAgent: stateSnapshot.values.current, // Current active agent
        nextAgent: stateSnapshot.values.next, // Next agent to execute
        taskAssignments: stateSnapshot.values.metadata?.taskAssignments || {},
        workflowProgress: stateSnapshot.values.metadata?.workflowProgress || 0,
      },
      agentCoordination: {
        currentAgent: stateSnapshot.values.current,
        nextAgent: stateSnapshot.values.next,
        agentHistory: this.extractAgentHistory(messages), // Agent handoff timeline
        pendingTasks: stateSnapshot.tasks || [], // Tasks waiting execution
      },
      waitingForApproval: stateSnapshot.values.metadata?.waitingForApproval || false,
      checkpointId: stateSnapshot.config.configurable?.checkpoint_id,
    };
  } catch (error) {
    this.logger.error(
      `Failed to retrieve supervisor conversation history for thread ${threadId}:`,
      error.message
    );

    if (error instanceof UnauthorizedException) {
      throw error;
    }

    throw new NotFoundException(
      `Supervisor conversation history not found for thread ${threadId}`
    );
  }
}

/**
 * Extract agent handoff timeline from messages
 */
private extractAgentHistory(messages: any[]): Array<{
  agentId: string;
  timestamp: string;
  action: string;
}> {
  return messages
    .filter((msg) => msg.additional_kwargs?.agentId)
    .map((msg) => ({
      agentId: msg.additional_kwargs.agentId,
      timestamp: msg.additional_kwargs.timestamp || new Date().toISOString(),
      action: msg.additional_kwargs.action || 'executed',
    }));
}
```

### Endpoint 2: Resume Supervisor Workflow

**Purpose**: Resume supervisor workflow after multi-agent coordination or HITL approval

```typescript
/**
 * Resume supervisor workflow
 *
 * @route POST /devbrand/conversation/resume/:threadId
 * @auth Required (JWT)
 * @body { approved: boolean, targetAgent?: string, feedback?: string }
 * @returns Workflow resumption status with agent routing
 */
@Post('conversation/resume/:threadId')
@UseGuards(JwtAuthGuard)
async resumeSupervisorWorkflow(
  @Param('threadId') threadId: string,
  @Body() resumeDto: ResumeSupervisorDto,
  @Req() request: Request
) {
  const userId = request.user?.id;

  try {
    // Get current state
    const stateSnapshot = await this.workflowResumptionService.getWorkflowState(
      DevBrandSupervisorWorkflow,
      threadId
    );

    // Security: Verify thread ownership
    const threadUserId = stateSnapshot.values.metadata?.userId;
    if (threadUserId && threadUserId !== userId) {
      throw new UnauthorizedException(
        `User ${userId} cannot resume thread ${threadId}`
      );
    }

    // Verify workflow is waiting for approval
    if (!stateSnapshot.values.metadata?.waitingForApproval) {
      throw new BadRequestException(
        `Thread ${threadId} is not waiting for approval`
      );
    }

    // Extract checkpoint ID
    const checkpointId = stateSnapshot.config.configurable?.checkpoint_id;

    // Resume workflow with supervisor-specific data
    const result = await this.workflowResumptionService.resumeWorkflow(
      DevBrandSupervisorWorkflow,
      threadId,
      {
        approved: resumeDto.approved,
        feedback: resumeDto.feedback || '',
        targetAgent: resumeDto.targetAgent, // Optional: route to specific agent
        userId,
        timestamp: new Date().toISOString(),
      },
      checkpointId
    );

    this.logger.log(
      `Supervisor workflow resumed: threadId=${threadId}, approved=${resumeDto.approved}, targetAgent=${resumeDto.targetAgent}`
    );

    return {
      success: true,
      threadId,
      checkpointId,
      resumedAt: new Date().toISOString(),
      approvalDecision: resumeDto.approved ? 'approved' : 'rejected',
      routedToAgent: resumeDto.targetAgent || result.next,
      workflowProgress: result.metadata?.workflowProgress,
    };
  } catch (error) {
    this.logger.error(
      `Failed to resume supervisor workflow for thread ${threadId}:`,
      error.message
    );

    if (
      error instanceof UnauthorizedException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }

    throw new InternalServerErrorException(
      `Failed to resume supervisor workflow for thread ${threadId}`
    );
  }
}
```

### Endpoint 3: Route Supervisor to Specific Agent

**Purpose**: Manually route supervisor workflow to specific worker agent (admin debugging)

```typescript
/**
 * Route supervisor workflow to specific agent (admin only)
 *
 * @route POST /devbrand/conversation/route/:threadId
 * @auth Required (JWT + Admin role)
 * @body { targetAgent: string, reason?: string }
 * @returns Routing confirmation
 */
@Post('conversation/route/:threadId')
@UseGuards(JwtAuthGuard, AdminGuard)
async routeToAgent(
  @Param('threadId') threadId: string,
  @Body() routeDto: RouteAgentDto,
  @Req() request: Request
) {
  const adminId = request.user?.id;

  try {
    // Update workflow state to route to specific agent
    await this.workflowResumptionService.updateWorkflowState(
      DevBrandSupervisorWorkflow,
      threadId,
      {
        next: routeDto.targetAgent,
        task: routeDto.reason || `Manually routed to ${routeDto.targetAgent}`,
      }
    );

    this.logger.warn(
      `Supervisor workflow routed by admin ${adminId}: threadId=${threadId}, targetAgent=${routeDto.targetAgent}`
    );

    return {
      success: true,
      threadId,
      routedTo: routeDto.targetAgent,
      routedBy: adminId,
      routedAt: new Date().toISOString(),
      reason: routeDto.reason,
    };
  } catch (error) {
    this.logger.error(
      `Failed to route supervisor workflow for thread ${threadId}:`,
      error.message
    );

    throw new InternalServerErrorException(
      `Failed to route workflow to agent ${routeDto.targetAgent}`
    );
  }
}
```

### DTOs for Supervisor Endpoints

**File**: `apps/dev-brand-api/src/app/controllers/dto/resume-supervisor.dto.ts`

```typescript
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResumeSupervisorDto {
  @ApiProperty({
    description: 'Approval decision',
    example: true,
  })
  @IsBoolean()
  approved: boolean;

  @ApiProperty({
    description: 'Optional target agent to route to',
    example: 'personal-brand-strategist',
    required: false,
  })
  @IsOptional()
  @IsString()
  targetAgent?: string;

  @ApiProperty({
    description: 'Optional feedback from user',
    example: 'Please focus on technical achievements',
    required: false,
  })
  @IsOptional()
  @IsString()
  feedback?: string;
}

export class RouteAgentDto {
  @ApiProperty({
    description: 'Target agent ID to route workflow to',
    example: 'content-creator',
  })
  @IsString()
  targetAgent: string;

  @ApiProperty({
    description: 'Reason for manual routing',
    example: 'User requested content generation first',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
```

---

## Security Best Practices

### 1. Thread Ownership Verification

**Always verify thread ownership before operations**:

```typescript
// Extract userId from JWT
const userId = request.user?.id;

// Get workflow state
const stateSnapshot = await this.workflowResumptionService.getWorkflowState(
  WorkflowClass,
  threadId
);

// Verify ownership
const threadUserId = stateSnapshot.values.metadata?.userId;
if (threadUserId && threadUserId !== userId) {
  throw new UnauthorizedException(`User ${userId} cannot access thread ${threadId}`);
}
```

### 2. Input Validation

**Use DTOs with class-validator**:

```typescript
import { IsBoolean, IsString, IsOptional } from 'class-validator';

export class ResumeWorkflowDto {
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  feedback?: string;
}
```

### 3. Error Handling

**Differentiate error types**:

```typescript
try {
  // Operation
} catch (error) {
  // Re-throw auth/validation errors
  if (error instanceof UnauthorizedException) {
    throw error;
  }

  // Log and wrap unexpected errors
  this.logger.error(`Operation failed:`, error.message);
  throw new InternalServerErrorException('Operation failed');
}
```

### 4. Audit Logging

**Log all state-modifying operations**:

```typescript
this.logger.log(`Workflow resumed: threadId=${threadId}, userId=${userId}, approved=${approved}`);

this.logger.warn(
  `State updated by admin ${adminId}: threadId=${threadId}, updates=${JSON.stringify(updates)}`
);
```

---

## Response Formatting Patterns

### Researcher Response Format

```typescript
{
  threadId: string;
  userId: string;
  conversationHistory: Array<{
    role: 'human' | 'ai' | 'system';
    content: string;
    timestamp: string;
    toolCalls: any[];
  }>;
  metadata: {
    query: string;
    reportTitle?: string;
    researchStatus?: string;
    confidenceScore?: number;
  };
  nextSteps: string[];
  waitingForApproval: boolean;
  checkpointId?: string;
}
```

### Supervisor Response Format

```typescript
{
  threadId: string;
  userId: string;
  conversationHistory: Array<{
    role: 'human' | 'ai' | 'system';
    content: string;
    timestamp: string;
    agentId: string; // Which agent sent message
    toolCalls: any[];
  }>;
  metadata: {
    query: string;
    currentAgent: string;
    nextAgent: string;
    taskAssignments: Record<string, any>;
    workflowProgress: number;
  };
  agentCoordination: {
    currentAgent: string;
    nextAgent: string;
    agentHistory: Array<{ agentId: string; timestamp: string; action: string }>;
    pendingTasks: any[];
  };
  waitingForApproval: boolean;
  checkpointId?: string;
}
```

---

## Testing Examples

### Test Researcher History Endpoint

```bash
curl -X GET http://localhost:3000/research-chat/conversation/history/thread-123 \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Test Supervisor Resume Endpoint

```bash
curl -X POST http://localhost:3000/devbrand/conversation/resume/thread-456 \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "approved": true,
    "targetAgent": "content-creator",
    "feedback": "Focus on technical writing"
  }'
```

---

## Swagger/OpenAPI Documentation

### Add Swagger Decorators

```typescript
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiOperation({
  summary: 'Get conversation history for researcher workflow',
  description: 'Retrieves sanitized conversation history with messages and metadata',
})
@ApiResponse({
  status: 200,
  description: 'Conversation history retrieved successfully',
  type: ConversationHistoryResponseDto,
})
@ApiResponse({
  status: 401,
  description: 'Unauthorized - Invalid or missing JWT token',
})
@ApiResponse({
  status: 403,
  description: 'Forbidden - User does not own this thread',
})
@ApiResponse({
  status: 404,
  description: 'Not Found - Thread does not exist',
})
@ApiBearerAuth()
@Get('conversation/history/:threadId')
async getConversationHistory(...) { ... }
```

---

## Implementation Checklist

### Researcher Controller

- [ ] Add `WorkflowResumptionService` import
- [ ] Inject service in constructor
- [ ] Implement `getConversationHistory()` endpoint
- [ ] Implement `resumeResearcherWorkflow()` endpoint
- [ ] Implement `updateResearcherState()` endpoint (optional)
- [ ] Create `ResumeWorkflowDto` and `UpdateStateDto`
- [ ] Add thread ownership verification
- [ ] Add error handling
- [ ] Add audit logging
- [ ] Add Swagger documentation
- [ ] Write integration tests

### Supervisor Controller

- [ ] Add `WorkflowResumptionService` import
- [ ] Inject service in constructor
- [ ] Implement `getSupervisorConversationHistory()` endpoint
- [ ] Implement `resumeSupervisorWorkflow()` endpoint
- [ ] Implement `routeToAgent()` endpoint (optional)
- [ ] Create `ResumeSupervisorDto` and `RouteAgentDto`
- [ ] Add agent history extraction logic
- [ ] Add thread ownership verification
- [ ] Add error handling
- [ ] Add audit logging
- [ ] Add Swagger documentation
- [ ] Write integration tests

---

## Migration from Old Controller (Reference)

**Old Pattern** (conversation-history.controller.ts - REMOVED):

```typescript
@Controller('conversation-history')
export class ConversationHistoryController {
  @Get('thread-state/:threadId')
  async getThreadState() {
    throw new HttpException('NOT_IMPLEMENTED', HttpStatus.NOT_IMPLEMENTED);
  }
}
```

**New Pattern** (application controllers):

```typescript
@Controller('research-chat')
export class ResearchChatController {
  constructor(private readonly resumption: WorkflowResumptionService) {}

  @Get('conversation/history/:threadId')
  async getConversationHistory(@Param('threadId') threadId: string) {
    return await this.resumption.getWorkflowState(ResearcherAgent, threadId);
  }
}
```

**Benefits of New Pattern**:

1. ✅ App-level implementation (not library)
2. ✅ Workflow-specific customization
3. ✅ Authentication/authorization integration
4. ✅ Custom response formatting
5. ✅ Transport layer flexibility (REST, GraphQL, etc.)

---

## Future Enhancements

### GraphQL Support

```typescript
@Resolver('Conversation')
export class ConversationResolver {
  constructor(private readonly resumption: WorkflowResumptionService) {}

  @Query('conversationHistory')
  async getHistory(@Args('threadId') threadId: string) {
    return await this.resumption.getWorkflowState(ResearcherAgent, threadId);
  }

  @Mutation('resumeWorkflow')
  async resume(@Args('input') input: ResumeInput) {
    return await this.resumption.resumeWorkflow(ResearcherAgent, input.threadId, input.value);
  }
}
```

### WebSocket Streaming

```typescript
@WebSocketGateway()
export class ConversationGateway {
  @SubscribeMessage('conversation:stream')
  async streamHistory(
    @MessageBody() data: { threadId: string },
    @ConnectedSocket() client: Socket
  ) {
    const state = await this.resumption.getWorkflowState(ResearcherAgent, data.threadId);

    client.emit('conversation:update', state);
  }
}
```

### Pagination Support

```typescript
@Get('conversation/history/:threadId')
async getConversationHistory(
  @Param('threadId') threadId: string,
  @Query('page') page = 1,
  @Query('limit') limit = 50
) {
  const state = await this.resumption.getWorkflowState(
    ResearcherAgent,
    threadId
  );

  const messages = state.values.messages || [];
  const startIdx = (page - 1) * limit;
  const endIdx = startIdx + limit;

  return {
    messages: messages.slice(startIdx, endIdx),
    pagination: {
      page,
      limit,
      total: messages.length,
      totalPages: Math.ceil(messages.length / limit),
    },
  };
}
```

---

## Summary

This guide provides complete implementation patterns for:

1. **Researcher workflow** conversation history and resumption endpoints
2. **Supervisor workflow** multi-agent coordination and routing endpoints
3. Security best practices (thread ownership, input validation, audit logging)
4. Response formatting patterns for each workflow type
5. Testing examples and Swagger documentation

**Architecture Benefits**:

- ✅ Library exposes services (business logic), apps implement controllers (transport)
- ✅ Apps choose API style (REST, GraphQL, gRPC, WebSocket)
- ✅ Workflow-specific customization per controller
- ✅ Transport-agnostic service layer

**Next Steps**:

1. Implement endpoints in respective controllers
2. Add authentication guards (JwtAuthGuard, AdminGuard)
3. Create DTOs with validation decorators
4. Write integration tests
5. Add Swagger/OpenAPI documentation
