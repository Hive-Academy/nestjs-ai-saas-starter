# TASK_2025_051: HITL User Interruption & Neo4j UX Enhancements

## Executive Summary

**Objective**: Complete the remaining 25-30% of HITL (Human-in-the-Loop) functionality by implementing:

1. User Interruption Feature - Allow users to interrupt agents mid-execution with questions/clarifications
2. Neo4j Historical Analysis UX - Leverage stored approval data to enhance user experience with intelligent suggestions

**Current State**: HITL infrastructure is 70-75% complete:

- ✅ 16 HITL backend services (100% operational)
- ✅ @RequiresApproval decorator (working in 4 workflows)
- ✅ Neo4j storage adapters (5 adapters storing data)
- ✅ ResearcherAgent full HITL integration (API + UI + SSE)
- ❌ User interruption API/UI (0% complete)
- ❌ Neo4j historical analysis UX (0% complete)

**Estimated Effort**: 10-15 hours total

- Priority 1: User Interruption Feature (5-8 hours)
- Priority 2: Neo4j Historical Analysis UX (5-7 hours)

**Success Criteria**:

- Users can interrupt running workflows with questions/clarifications
- Approval modals show historical patterns and intelligent suggestions
- Neo4j stored data is surfaced in user-facing features
- Implementation is reusable across all workflows (ResearcherAgent, PersonalBrandStrategist, ContentCreator, etc.)

---

## Priority 1: User Interruption Feature

### Overview

**What It Does**: Allow users to interrupt agents mid-execution to:

- Ask clarifying questions ("Focus on quantum cryptography specifically")
- Request direction changes ("Skip the technical analysis, focus on business impact")
- Provide additional context ("Also check competitor X's approach")
- Correct agent assumptions ("I meant React, not Angular")

**Example User Flow**:

```
1. User starts research workflow: "Research quantum computing trends"
2. Agent begins research, user sees "Researching quantum computing applications..."
3. User clicks [Interrupt] button
4. Modal appears: "What would you like to clarify?"
5. User types: "Focus specifically on quantum cryptography for banking"
6. Agent receives interruption, adjusts research scope
7. Agent continues with refined focus
```

**Value Proposition**:

- Reduces wasted agent execution time (no need to restart workflow)
- Improves output quality through mid-execution guidance
- Enables collaborative human-agent interaction
- Leverages existing `UserInterruptionService` infrastructure

### Technical Architecture

**Backend Components**:

```
UserInterruptionService (exists)
         ↓
HitlController (new)
         ↓
WebSocket Gateway (new)
         ↓
Neo4j Storage (exists)
```

**Frontend Components**:

```
Interrupt Button (new)
         ↓
InterruptionDialogComponent (new)
         ↓
ApprovalApiService (new)
         ↓
WebSocket Client (enhancement)
```

**Data Flow**:

```
1. User clicks [Interrupt] → Frontend
2. POST /api/hitl/interruptions/request → Backend
3. UserInterruptionService.createInterruption() → Store in Neo4j
4. Workflow detects interruption via state check
5. Workflow pauses, waits for user response
6. WebSocket event: "interruption.requested" → Frontend
7. User provides response in modal → Frontend
8. POST /api/hitl/interruptions/:id/respond → Backend
9. UserInterruptionService.resolveInterruption() → Update Neo4j
10. Workflow resumes with user input
11. WebSocket event: "interruption.resolved" → Frontend
```

### Implementation Tasks

#### Task 1.1: Backend API - HitlController (2-3 hours)

**File**: `apps/dev-brand-api/src/app/controllers/hitl.controller.ts`

**Endpoints**:

```typescript
@Controller('hitl')
export class HitlController {
  constructor(
    private readonly userInterruptionService: UserInterruptionService,
    private readonly humanApprovalService: HumanApprovalService
  ) {}

  // ============================================
  // USER INTERRUPTION ENDPOINTS
  // ============================================

  /**
   * Request user interruption for running workflow
   * POST /api/hitl/interruptions/request
   * Body: { executionId, interruptionType, message, context }
   */
  @Post('interruptions/request')
  async requestUserInterruption(
    @Body() dto: CreateInterruptionDto
  ): Promise<InterruptionResponseDto> {
    const interruption = await this.userInterruptionService.createInterruption({
      executionId: dto.executionId,
      interruptionType: dto.interruptionType, // 'QUESTION' | 'CLARIFICATION' | 'INPUT_REQUEST' | 'CORRECTION'
      message: dto.message,
      context: dto.context,
      timestamp: new Date(),
    });

    return {
      interruptionId: interruption.id,
      status: 'pending',
      message: 'Interruption created. Workflow will pause at next checkpoint.',
    };
  }

  /**
   * Get active interruptions for workflow
   * GET /api/hitl/interruptions/active/:executionId
   */
  @Get('interruptions/active/:executionId')
  async getActiveInterruptions(
    @Param('executionId') executionId: string
  ): Promise<InterruptionDto[]> {
    const interruptions = await this.userInterruptionService.getActiveUserInterruptions(
      executionId
    );

    return interruptions.map((i) => ({
      id: i.id,
      executionId: i.executionId,
      type: i.interruptionType,
      message: i.message,
      context: i.context,
      status: i.status,
      createdAt: i.timestamp,
    }));
  }

  /**
   * Respond to user interruption
   * POST /api/hitl/interruptions/:id/respond
   * Body: { response, action }
   */
  @Post('interruptions/:id/respond')
  async respondToInterruption(
    @Param('id') interruptionId: string,
    @Body() dto: InterruptionResponseDto
  ): Promise<{ status: string; message: string }> {
    await this.userInterruptionService.resolveInterruption(interruptionId, {
      response: dto.response,
      action: dto.action, // 'CONTINUE' | 'ABORT' | 'MODIFY'
      resolvedAt: new Date(),
    });

    return {
      status: 'success',
      message: 'Interruption resolved. Workflow will resume.',
    };
  }

  /**
   * Cancel pending interruption
   * DELETE /api/hitl/interruptions/:id
   */
  @Delete('interruptions/:id')
  async cancelInterruption(@Param('id') interruptionId: string): Promise<{ status: string }> {
    await this.userInterruptionService.cancelInterruption(interruptionId);
    return { status: 'cancelled' };
  }

  // ============================================
  // GENERIC APPROVAL ENDPOINTS (BONUS)
  // ============================================

  /**
   * Get pending approvals for user
   * GET /api/hitl/approvals/pending?userId=...
   */
  @Get('approvals/pending')
  async getPendingApprovals(@Query('userId') userId: string): Promise<PendingApprovalDto[]> {
    const approvals = await this.humanApprovalService.getPendingApprovals(userId);

    return approvals.map((a) => ({
      id: a.id,
      executionId: a.executionId,
      message: a.message,
      metadata: a.metadata,
      createdAt: a.createdAt,
      timeoutAt: a.timeoutAt,
    }));
  }

  /**
   * Get approval request details
   * GET /api/hitl/approvals/:requestId
   */
  @Get('approvals/:requestId')
  async getApprovalDetails(@Param('requestId') requestId: string): Promise<ApprovalDetailsDto> {
    const approval = await this.humanApprovalService.getApprovalStatus(requestId);

    return {
      id: approval.requestId,
      status: approval.status,
      message: approval.message,
      metadata: approval.metadata,
      createdAt: approval.createdAt,
      resolvedAt: approval.resolvedAt,
      response: approval.response,
    };
  }

  /**
   * Submit approval decision
   * POST /api/hitl/approvals/:requestId/respond
   * Body: { approved, feedback }
   */
  @Post('approvals/:requestId/respond')
  async submitApprovalDecision(
    @Param('requestId') requestId: string,
    @Body() dto: ApprovalDecisionDto
  ): Promise<{ status: string; message: string }> {
    await this.humanApprovalService.processApprovalResponse(requestId, {
      approved: dto.approved,
      feedback: dto.feedback,
      respondedAt: new Date(),
    });

    return {
      status: 'success',
      message: dto.approved ? 'Approval granted' : 'Approval rejected',
    };
  }
}
```

**DTOs** (create in `apps/dev-brand-api/src/app/controllers/dto/`):

```typescript
// create-interruption.dto.ts
export class CreateInterruptionDto {
  @IsString()
  executionId: string;

  @IsEnum(['QUESTION', 'CLARIFICATION', 'INPUT_REQUEST', 'CORRECTION'])
  interruptionType: InterruptionType;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

// interruption-response.dto.ts
export class InterruptionResponseDto {
  @IsString()
  response: string;

  @IsEnum(['CONTINUE', 'ABORT', 'MODIFY'])
  action: string;
}

// approval-decision.dto.ts
export class ApprovalDecisionDto {
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  feedback?: string;
}
```

**Module Registration** (update `apps/dev-brand-api/src/app/app.module.ts`):

```typescript
import { HitlController } from './controllers/hitl.controller';

@Module({
  controllers: [
    // ... existing controllers
    HitlController, // Add this
  ],
  // ...
})
```

**Deliverables**:

- ✅ HitlController with 7 endpoints (4 interruption, 3 approval)
- ✅ 3 DTO classes with validation
- ✅ Module registration
- ✅ Basic error handling (NotFoundException, BadRequestException)

**Testing**:

- Unit tests for each endpoint
- Integration test: Create interruption → Get active → Respond → Verify resolved
- Integration test: Get pending approvals → Submit decision

---

#### Task 1.2: WebSocket Gateway for Real-Time Events (2 hours)

**File**: `apps/dev-brand-api/src/app/gateways/hitl.gateway.ts`

**WebSocket Events**:

```typescript
@WebSocketGateway({
  namespace: 'hitl',
  cors: { origin: '*' },
})
export class HitlGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private executionRooms = new Map<string, Set<string>>(); // executionId → Set<socketId>

  constructor(
    private readonly userInterruptionService: UserInterruptionService,
    private readonly humanApprovalService: HumanApprovalService
  ) {}

  /**
   * Client connects and subscribes to execution updates
   */
  handleConnection(client: Socket) {
    console.log(`HITL client connected: ${client.id}`);
  }

  /**
   * Client disconnects
   */
  handleDisconnect(client: Socket) {
    console.log(`HITL client disconnected: ${client.id}`);
    // Clean up room subscriptions
    this.executionRooms.forEach((sockets, executionId) => {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.executionRooms.delete(executionId);
      }
    });
  }

  /**
   * Client subscribes to workflow execution events
   * @SubscribeMessage('subscribe:execution')
   */
  @SubscribeMessage('subscribe:execution')
  handleSubscribeToExecution(client: Socket, payload: { executionId: string }) {
    const { executionId } = payload;

    if (!this.executionRooms.has(executionId)) {
      this.executionRooms.set(executionId, new Set());
    }
    this.executionRooms.get(executionId).add(client.id);

    console.log(`Client ${client.id} subscribed to execution ${executionId}`);

    client.emit('subscribed', { executionId, message: 'Subscribed to execution updates' });
  }

  /**
   * Emit interruption request event to clients
   */
  emitInterruptionRequested(executionId: string, interruption: UserInterruption) {
    this.server.to(`execution:${executionId}`).emit('interruption.requested', {
      interruptionId: interruption.id,
      executionId,
      type: interruption.interruptionType,
      message: interruption.message,
      context: interruption.context,
      timestamp: interruption.timestamp,
    });

    console.log(`Emitted interruption.requested for execution ${executionId}`);
  }

  /**
   * Emit interruption resolved event to clients
   */
  emitInterruptionResolved(executionId: string, interruptionId: string, resolution: unknown) {
    this.server.to(`execution:${executionId}`).emit('interruption.resolved', {
      interruptionId,
      executionId,
      resolution,
      timestamp: new Date(),
    });

    console.log(`Emitted interruption.resolved for execution ${executionId}`);
  }

  /**
   * Emit approval request event to clients
   */
  emitApprovalRequested(executionId: string, approval: HumanApprovalRequest) {
    this.server.to(`execution:${executionId}`).emit('approval.requested', {
      approvalId: approval.id,
      executionId,
      message: approval.message,
      metadata: approval.metadata,
      timeoutAt: approval.timeoutAt,
      timestamp: new Date(),
    });

    console.log(`Emitted approval.requested for execution ${executionId}`);
  }

  /**
   * Emit approval resolved event to clients
   */
  emitApprovalResolved(
    executionId: string,
    approvalId: string,
    decision: { approved: boolean; feedback?: string }
  ) {
    this.server.to(`execution:${executionId}`).emit('approval.resolved', {
      approvalId,
      executionId,
      decision,
      timestamp: new Date(),
    });

    console.log(`Emitted approval.resolved for execution ${executionId}`);
  }
}
```

**Integration with Services**:

Update `UserInterruptionService` to emit events:

```typescript
// libs/langgraph-modules/hitl/src/lib/services/user-interruption.service.ts

@Injectable()
export class UserInterruptionService {
  constructor(
    // ... existing dependencies
    @Optional() @Inject('HITL_GATEWAY') private readonly gateway?: HitlGateway // Add this
  ) {}

  async createInterruption(data: CreateInterruptionData): Promise<UserInterruption> {
    // ... existing logic
    const interruption = await this.storageService.storeInterruption(data);

    // Emit WebSocket event
    if (this.gateway) {
      this.gateway.emitInterruptionRequested(data.executionId, interruption);
    }

    return interruption;
  }

  async resolveInterruption(
    interruptionId: string,
    resolution: InterruptionResolution
  ): Promise<void> {
    // ... existing logic
    const interruption = await this.storageService.getInterruption(interruptionId);
    await this.storageService.updateInterruption(interruptionId, {
      status: 'resolved',
      resolution,
    });

    // Emit WebSocket event
    if (this.gateway && interruption) {
      this.gateway.emitInterruptionResolved(interruption.executionId, interruptionId, resolution);
    }
  }
}
```

**Module Registration**:

```typescript
// apps/dev-brand-api/src/app/app.module.ts

import { HitlGateway } from './gateways/hitl.gateway';

@Module({
  // ...
  providers: [
    // ... existing providers
    HitlGateway,
    {
      provide: 'HITL_GATEWAY',
      useExisting: HitlGateway,
    },
  ],
})
```

**Deliverables**:

- ✅ WebSocket gateway with 4 events (interruption.requested/resolved, approval.requested/resolved)
- ✅ Room-based subscriptions (clients subscribe to specific executionId)
- ✅ Integration with UserInterruptionService
- ✅ Connection/disconnection handling

**Testing**:

- Integration test: Connect → Subscribe → Trigger interruption → Verify event received
- Integration test: Multiple clients, verify room isolation

---

#### Task 1.3: Frontend API Service (1.5 hours)

**File**: `apps/dev-brand-ui/src/app/shared/services/hitl-api.service.ts`

**Service Implementation**:

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

export interface CreateInterruptionRequest {
  executionId: string;
  interruptionType: 'QUESTION' | 'CLARIFICATION' | 'INPUT_REQUEST' | 'CORRECTION';
  message: string;
  context?: Record<string, unknown>;
}

export interface InterruptionDto {
  id: string;
  executionId: string;
  type: string;
  message: string;
  context?: Record<string, unknown>;
  status: string;
  createdAt: string;
}

export interface InterruptionEvent {
  type:
    | 'interruption.requested'
    | 'interruption.resolved'
    | 'approval.requested'
    | 'approval.resolved';
  data: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class HitlApiService {
  private readonly apiUrl = '/api/hitl';
  private socket?: Socket;
  private events$ = new Subject<InterruptionEvent>();

  constructor(private readonly http: HttpClient) {}

  // ============================================
  // HTTP API METHODS
  // ============================================

  /**
   * Request user interruption for running workflow
   */
  requestInterruption(
    request: CreateInterruptionRequest
  ): Observable<{ interruptionId: string; status: string; message: string }> {
    return this.http.post<{ interruptionId: string; status: string; message: string }>(
      `${this.apiUrl}/interruptions/request`,
      request
    );
  }

  /**
   * Get active interruptions for workflow
   */
  getActiveInterruptions(executionId: string): Observable<InterruptionDto[]> {
    return this.http.get<InterruptionDto[]>(`${this.apiUrl}/interruptions/active/${executionId}`);
  }

  /**
   * Respond to user interruption
   */
  respondToInterruption(
    interruptionId: string,
    response: string,
    action: 'CONTINUE' | 'ABORT' | 'MODIFY'
  ): Observable<{ status: string; message: string }> {
    return this.http.post<{ status: string; message: string }>(
      `${this.apiUrl}/interruptions/${interruptionId}/respond`,
      { response, action }
    );
  }

  /**
   * Cancel pending interruption
   */
  cancelInterruption(interruptionId: string): Observable<{ status: string }> {
    return this.http.delete<{ status: string }>(`${this.apiUrl}/interruptions/${interruptionId}`);
  }

  /**
   * Get pending approvals for user
   */
  getPendingApprovals(userId: string): Observable<PendingApprovalDto[]> {
    return this.http.get<PendingApprovalDto[]>(`${this.apiUrl}/approvals/pending?userId=${userId}`);
  }

  /**
   * Submit approval decision
   */
  submitApprovalDecision(
    approvalId: string,
    approved: boolean,
    feedback?: string
  ): Observable<{ status: string; message: string }> {
    return this.http.post<{ status: string; message: string }>(
      `${this.apiUrl}/approvals/${approvalId}/respond`,
      { approved, feedback }
    );
  }

  // ============================================
  // WEBSOCKET METHODS
  // ============================================

  /**
   * Connect to HITL WebSocket and subscribe to execution events
   */
  subscribeToExecutionEvents(executionId: string): Observable<InterruptionEvent> {
    if (!this.socket) {
      this.socket = io('/hitl', {
        transports: ['websocket'],
      });

      // Listen for all event types
      this.socket.on('interruption.requested', (data) => {
        this.events$.next({ type: 'interruption.requested', data });
      });

      this.socket.on('interruption.resolved', (data) => {
        this.events$.next({ type: 'interruption.resolved', data });
      });

      this.socket.on('approval.requested', (data) => {
        this.events$.next({ type: 'approval.requested', data });
      });

      this.socket.on('approval.resolved', (data) => {
        this.events$.next({ type: 'approval.resolved', data });
      });
    }

    // Subscribe to specific execution
    this.socket.emit('subscribe:execution', { executionId });

    return this.events$.asObservable();
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }
  }
}
```

**Deliverables**:

- ✅ HTTP methods for interruption management (4 methods)
- ✅ HTTP methods for approval management (2 methods)
- ✅ WebSocket integration with typed events
- ✅ Observable-based event streaming

**Testing**:

- Unit tests for each HTTP method
- Integration test: WebSocket connection → Subscribe → Receive event

---

#### Task 1.4: Frontend UI Components (2-3 hours)

**Component 1: Interrupt Button** (30 min)

**File**: `apps/dev-brand-ui/src/app/shared/components/interrupt-button.component.ts`

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-interrupt-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      class="interrupt-btn"
      [disabled]="disabled"
      (click)="onInterruptClick()"
      [title]="disabled ? 'Workflow not running' : 'Interrupt workflow to provide guidance'"
    >
      <span class="icon">⏸️</span>
      <span class="label">Interrupt</span>
    </button>
  `,
  styles: [
    `
      .interrupt-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .interrupt-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      }

      .interrupt-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .icon {
        font-size: 16px;
      }

      .label {
        font-size: 14px;
      }
    `,
  ],
})
export class InterruptButtonComponent {
  @Input() disabled = false;
  @Output() interrupt = new EventEmitter<void>();

  onInterruptClick(): void {
    this.interrupt.emit();
  }
}
```

**Component 2: Interruption Dialog** (1.5-2 hours)

**File**: `apps/dev-brand-ui/src/app/shared/components/interruption-dialog.component.ts`

```typescript
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface InterruptionRequest {
  type: 'QUESTION' | 'CLARIFICATION' | 'INPUT_REQUEST' | 'CORRECTION';
  message: string;
  context?: Record<string, unknown>;
}

@Component({
  selector: 'app-interruption-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (visible) {
    <div class="modal-overlay" (click)="onCancel()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>🛑 Interrupt Workflow</h2>
          <button class="close-btn" (click)="onCancel()">&times;</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Interruption Type:</label>
            <select [(ngModel)]="selectedType" class="form-control">
              <option value="QUESTION">Ask a Question</option>
              <option value="CLARIFICATION">Request Clarification</option>
              <option value="INPUT_REQUEST">Provide Additional Input</option>
              <option value="CORRECTION">Correct Agent Assumption</option>
            </select>
          </div>

          <div class="form-group">
            <label>Your Message:</label>
            <textarea
              [(ngModel)]="userMessage"
              class="form-control"
              rows="5"
              placeholder="What would you like to tell the agent?"
            >
            </textarea>
          </div>

          <div class="info-box">
            <p>
              <strong>Note:</strong> The workflow will pause at the next checkpoint and wait for the
              agent to process your message.
            </p>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="onCancel()">Cancel</button>
          <button class="btn btn-primary" (click)="onSubmit()" [disabled]="!userMessage.trim()">
            Send Interruption
          </button>
        </div>
      </div>
    </div>
    }
  `,
  styles: [
    `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(4px);
      }

      .modal-content {
        background: white;
        border-radius: 12px;
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        animation: slideIn 0.3s ease;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px;
        border-bottom: 1px solid #e5e7eb;
      }

      .modal-header h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 600;
        color: #1f2937;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 32px;
        color: #6b7280;
        cursor: pointer;
        line-height: 1;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .close-btn:hover {
        background: #f3f4f6;
        color: #1f2937;
      }

      .modal-body {
        padding: 24px;
      }

      .form-group {
        margin-bottom: 20px;
      }

      .form-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: #374151;
        font-size: 14px;
      }

      .form-control {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        font-family: inherit;
        transition: all 0.2s;
      }

      .form-control:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }

      select.form-control {
        cursor: pointer;
      }

      textarea.form-control {
        resize: vertical;
        min-height: 100px;
      }

      .info-box {
        background: #eff6ff;
        border-left: 4px solid #3b82f6;
        padding: 12px 16px;
        border-radius: 4px;
        margin-top: 16px;
      }

      .info-box p {
        margin: 0;
        font-size: 13px;
        color: #1e40af;
        line-height: 1.5;
      }

      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 20px 24px;
        border-top: 1px solid #e5e7eb;
      }

      .btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-secondary {
        background: #f3f4f6;
        color: #374151;
      }

      .btn-secondary:hover {
        background: #e5e7eb;
      }

      .btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .btn-primary:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
      }

      .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ],
})
export class InterruptionDialogComponent {
  @Input() visible = false;
  @Input() executionId = '';
  @Output() submit = new EventEmitter<InterruptionRequest>();
  @Output() cancel = new EventEmitter<void>();

  selectedType: InterruptionRequest['type'] = 'QUESTION';
  userMessage = '';

  onSubmit(): void {
    if (!this.userMessage.trim()) return;

    this.submit.emit({
      type: this.selectedType,
      message: this.userMessage,
      context: {
        executionId: this.executionId,
      },
    });

    // Reset form
    this.userMessage = '';
    this.selectedType = 'QUESTION';
  }

  onCancel(): void {
    this.cancel.emit();
    this.userMessage = '';
    this.selectedType = 'QUESTION';
  }
}
```

**Integration in Research Chat Component** (30 min)

**File**: `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.ts`

Add interruption support:

```typescript
import { InterruptButtonComponent } from '../../shared/components/interrupt-button.component';
import { InterruptionDialogComponent } from '../../shared/components/interruption-dialog.component';
import { HitlApiService } from '../../shared/services/hitl-api.service';

@Component({
  // ... existing config
  imports: [
    // ... existing imports
    InterruptButtonComponent,
    InterruptionDialogComponent,
  ],
})
export class ResearchChatComponent implements OnInit, OnDestroy {
  // ... existing properties

  showInterruptionDialog = false;
  canInterrupt = false; // True when workflow is running

  constructor(
    // ... existing dependencies
    private readonly hitlApiService: HitlApiService
  ) {}

  ngOnInit() {
    // ... existing init logic

    // Subscribe to HITL events
    this.hitlApiService.subscribeToExecutionEvents(this.currentExecutionId).subscribe((event) => {
      if (event.type === 'interruption.requested') {
        console.log('Interruption requested:', event.data);
      } else if (event.type === 'interruption.resolved') {
        console.log('Interruption resolved:', event.data);
        this.showInterruptionDialog = false;
      }
    });
  }

  onInterruptClick(): void {
    this.showInterruptionDialog = true;
  }

  onInterruptionSubmit(request: InterruptionRequest): void {
    this.hitlApiService
      .requestInterruption({
        executionId: this.currentExecutionId,
        interruptionType: request.type,
        message: request.message,
        context: request.context,
      })
      .subscribe({
        next: (response) => {
          console.log('Interruption created:', response);
          this.showInterruptionDialog = false;
          // Show toast notification
        },
        error: (error) => {
          console.error('Failed to create interruption:', error);
        },
      });
  }

  onInterruptionCancel(): void {
    this.showInterruptionDialog = false;
  }
}
```

Update template:

```html
<!-- Add interrupt button to workflow status bar -->
<div class="workflow-controls">
  <app-interrupt-button [disabled]="!canInterrupt" (interrupt)="onInterruptClick()">
  </app-interrupt-button>
</div>

<!-- Add interruption dialog -->
<app-interruption-dialog
  [visible]="showInterruptionDialog"
  [executionId]="currentExecutionId"
  (submit)="onInterruptionSubmit($event)"
  (cancel)="onInterruptionCancel()"
>
</app-interruption-dialog>
```

**Deliverables**:

- ✅ InterruptButtonComponent (reusable)
- ✅ InterruptionDialogComponent (form with type selection + message)
- ✅ Integration in ResearchChatComponent
- ✅ WebSocket event handling

**Testing**:

- Component tests for button and dialog
- Integration test: Click button → Show dialog → Submit → Verify API call
- E2E test: Full interruption flow with backend

---

#### Task 1.5: Workflow Integration (1 hour)

**Update Workflow Execution to Handle Interruptions**

**File**: `libs/langgraph-modules/workflow-engine/src/lib/services/workflow-execution.service.ts`

Add interruption checkpoint detection:

```typescript
async executeStreamingWorkflow<TAgent extends BaseAgent, TState extends TypedAgentState>(
  agentClass: Type<TAgent>,
  input: Partial<TState>,
  executionId?: string,
): Promise<Observable<WorkflowEvent<TState>>> {
  // ... existing implementation

  // Add interruption check in event loop
  for await (const event of stream) {
    // Check for user interruptions
    const interruptions = await this.userInterruptionService.getActiveUserInterruptions(executionId);

    if (interruptions.length > 0) {
      // Pause workflow, emit interruption event
      subscriber.next({
        type: 'interruption_requested',
        executionId,
        interruptions,
        state: event.state,
      });

      // Wait for interruption resolution
      await this.waitForInterruptionResolution(interruptions[0].id);

      // Continue workflow with updated state
      const resolution = await this.userInterruptionService.getInterruptionResolution(interruptions[0].id);
      // Inject resolution into workflow state
      event.state.metadata = {
        ...event.state.metadata,
        userInterruption: resolution,
      };
    }

    // ... continue with normal event processing
  }
}

private async waitForInterruptionResolution(interruptionId: string): Promise<void> {
  return new Promise((resolve) => {
    const checkInterval = setInterval(async () => {
      const interruption = await this.userInterruptionService.getInterruption(interruptionId);
      if (interruption.status === 'resolved') {
        clearInterval(checkInterval);
        resolve();
      }
    }, 1000); // Check every second
  });
}
```

**Deliverables**:

- ✅ Interruption detection in workflow loop
- ✅ Workflow pause/resume logic
- ✅ State injection with user response

**Testing**:

- Integration test: Start workflow → Interrupt → Verify pause → Resolve → Verify resume

---

### Priority 1 Summary

**Total Effort**: 5-8 hours

**Deliverables**:

1. ✅ Backend API (HitlController) - 7 endpoints
2. ✅ WebSocket Gateway - 4 event types
3. ✅ Frontend Service (HitlApiService) - HTTP + WebSocket
4. ✅ UI Components - Interrupt button + Dialog
5. ✅ Workflow Integration - Interruption handling

**Testing Coverage**:

- Unit tests for all components/services
- Integration tests for API + WebSocket
- E2E test for full interruption flow

**Success Metrics**:

- Users can interrupt workflows from UI
- Interruptions are stored in Neo4j
- Workflows pause and resume correctly
- Real-time events work via WebSocket

---

## Priority 2: Neo4j Historical Analysis UX

### Overview

**What It Does**: Surface historical approval data stored in Neo4j to enhance user decision-making:

- Show similar historical approvals when user reviews a request
- Display approval trends and statistics
- Provide intelligent suggestions based on past patterns
- Show "90% of similar requests were approved"

**Example User Flow**:

```
1. User sees approval modal for research report
2. Modal shows historical context:
   - "23 similar research reports found"
   - "21 approved (91%), 2 rejected (9%)"
   - "Average approval time: 2.3 minutes"
   - "Most common feedback: 'Add more sources'"
3. User sees suggestion: "Based on patterns, this report likely warrants approval"
4. User makes informed decision
```

**Value Proposition**:

- Faster approval decisions (context reduces cognitive load)
- More consistent decisions (see what was approved before)
- Learning from patterns (identify common approval criteria)
- Data-driven insights (trend analysis, bottleneck detection)

### Technical Architecture

**Backend Components**:

```
ApprovalHistorySearchService (exists)
         ↓
HitlController (enhance)
         ↓
Neo4j Storage Adapters (exists)
         ↓
Memory Adapter (optional integration)
```

**Frontend Components**:

```
ApprovalModalComponent (enhance)
         ↓
HitlApiService (add methods)
         ↓
Historical Context Display (new)
         ↓
Trend Visualization (new)
```

**Data Flow**:

```
1. User opens approval modal → Frontend
2. GET /api/hitl/approvals/:requestId/similar-history → Backend
3. ApprovalHistorySearchService.getSimilarApprovals() → Query Neo4j
4. Return similar approvals with metadata → Frontend
5. Display historical context in modal → UI
6. User sees patterns, makes decision → Informed approval
```

### Implementation Tasks

#### Task 2.1: Backend API - Historical Analysis Endpoints (2 hours)

**File**: `apps/dev-brand-api/src/app/controllers/hitl.controller.ts` (enhance)

**New Endpoints**:

```typescript
@Controller('hitl')
export class HitlController {
  constructor(
    // ... existing dependencies
    private readonly approvalHistorySearchService: ApprovalHistorySearchService
  ) {}

  /**
   * Get similar historical approvals for context
   * GET /api/hitl/approvals/:requestId/similar-history
   */
  @Get('approvals/:requestId/similar-history')
  async getSimilarApprovals(
    @Param('requestId') requestId: string,
    @Query('limit') limit = 10
  ): Promise<SimilarApprovalsDto> {
    // Get current approval request
    const currentApproval = await this.humanApprovalService.getApprovalStatus(requestId);

    // Search for similar approvals using semantic search
    const similarApprovals = await this.approvalHistorySearchService.searchSimilarApprovals(
      currentApproval.message,
      {
        metadata: currentApproval.metadata,
        limit,
        minSimilarity: 0.7, // Cosine similarity threshold
      }
    );

    // Calculate statistics
    const approved = similarApprovals.filter((a) => a.response?.approved).length;
    const rejected = similarApprovals.filter((a) => a.response?.approved === false).length;
    const approvalRate =
      similarApprovals.length > 0 ? (approved / similarApprovals.length) * 100 : 0;

    // Extract common feedback themes
    const feedbackThemes = this.extractFeedbackThemes(
      similarApprovals.map((a) => a.response?.feedback).filter(Boolean)
    );

    // Calculate average approval time
    const avgApprovalTime = this.calculateAverageApprovalTime(similarApprovals);

    return {
      totalSimilar: similarApprovals.length,
      approvalRate,
      statistics: {
        approved,
        rejected,
        avgApprovalTimeMs: avgApprovalTime,
      },
      commonFeedback: feedbackThemes,
      similarApprovals: similarApprovals.map((a) => ({
        id: a.id,
        message: a.message,
        approved: a.response?.approved,
        feedback: a.response?.feedback,
        similarity: a.similarity, // Cosine similarity score
        createdAt: a.createdAt,
        resolvedAt: a.resolvedAt,
      })),
      suggestion: this.generateSuggestion(approvalRate, similarApprovals),
    };
  }

  /**
   * Get approval trends for user
   * GET /api/hitl/approvals/trends?userId=...&period=7d
   */
  @Get('approvals/trends')
  async getApprovalTrends(
    @Query('userId') userId: string,
    @Query('period') period = '7d' // 7d, 30d, 90d
  ): Promise<ApprovalTrendsDto> {
    const { startDate, endDate } = this.parsePeriod(period);

    // Get approval history for user
    const approvals = await this.approvalHistorySearchService.getApprovalHistory(userId, {
      startDate,
      endDate,
    });

    // Group by day
    const dailyStats = this.groupApprovalsByDay(approvals);

    // Calculate trends
    const avgApprovalsPerDay = approvals.length / this.getDayCount(period);
    const approvalRate =
      (approvals.filter((a) => a.response?.approved).length / approvals.length) * 100;
    const avgResponseTime = this.calculateAverageApprovalTime(approvals);

    // Identify bottlenecks (approvals taking > 2x avg time)
    const bottlenecks = approvals.filter((a) => {
      const approvalTime = new Date(a.resolvedAt).getTime() - new Date(a.createdAt).getTime();
      return approvalTime > avgResponseTime * 2;
    });

    return {
      period,
      totalApprovals: approvals.length,
      approvalRate,
      avgApprovalsPerDay,
      avgResponseTimeMs: avgResponseTime,
      dailyStats,
      bottlenecks: bottlenecks.map((a) => ({
        id: a.id,
        message: a.message,
        durationMs: new Date(a.resolvedAt).getTime() - new Date(a.createdAt).getTime(),
        createdAt: a.createdAt,
      })),
    };
  }

  /**
   * Get approval patterns for workflow type
   * GET /api/hitl/approvals/patterns?workflowType=research
   */
  @Get('approvals/patterns')
  async getApprovalPatterns(
    @Query('workflowType') workflowType: string
  ): Promise<ApprovalPatternsDto> {
    const approvals = await this.approvalHistorySearchService.getApprovalsByWorkflowType(
      workflowType
    );

    // Analyze patterns
    const patterns = {
      totalApprovals: approvals.length,
      approvalRate: (approvals.filter((a) => a.response?.approved).length / approvals.length) * 100,
      commonApprovalReasons: this.extractReasons(approvals.filter((a) => a.response?.approved)),
      commonRejectionReasons: this.extractReasons(
        approvals.filter((a) => a.response?.approved === false)
      ),
      peakApprovalHours: this.calculatePeakHours(approvals),
      avgConfidenceScore: this.calculateAvgConfidence(approvals),
    };

    return patterns;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private extractFeedbackThemes(feedbacks: string[]): string[] {
    // Simple keyword extraction (can enhance with NLP)
    const keywords = new Map<string, number>();

    feedbacks.forEach((feedback) => {
      const words = feedback.toLowerCase().split(/\s+/);
      words.forEach((word) => {
        if (word.length > 4) {
          // Skip short words
          keywords.set(word, (keywords.get(word) || 0) + 1);
        }
      });
    });

    // Return top 5 keywords
    return Array.from(keywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private calculateAverageApprovalTime(approvals: ApprovalRecord[]): number {
    if (approvals.length === 0) return 0;

    const totalTime = approvals.reduce((sum, a) => {
      if (!a.resolvedAt) return sum;
      return sum + (new Date(a.resolvedAt).getTime() - new Date(a.createdAt).getTime());
    }, 0);

    return totalTime / approvals.length;
  }

  private generateSuggestion(approvalRate: number, similarApprovals: ApprovalRecord[]): string {
    if (similarApprovals.length === 0) {
      return 'No historical data available for comparison.';
    }

    if (approvalRate >= 80) {
      return `Strong approval pattern: ${approvalRate.toFixed(
        0
      )}% of similar requests were approved.`;
    } else if (approvalRate >= 50) {
      return `Mixed pattern: ${approvalRate.toFixed(
        0
      )}% of similar requests were approved. Review carefully.`;
    } else {
      return `Caution: Only ${approvalRate.toFixed(
        0
      )}% of similar requests were approved. Common issues: ${this.extractFeedbackThemes(
        similarApprovals.map((a) => a.response?.feedback).filter(Boolean)
      ).join(', ')}`;
    }
  }

  private parsePeriod(period: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    const days = parseInt(period.replace('d', ''));
    startDate.setDate(startDate.getDate() - days);

    return { startDate, endDate };
  }

  private groupApprovalsByDay(
    approvals: ApprovalRecord[]
  ): Record<string, { approved: number; rejected: number }> {
    const grouped: Record<string, { approved: number; rejected: number }> = {};

    approvals.forEach((approval) => {
      const day = new Date(approval.createdAt).toISOString().split('T')[0];
      if (!grouped[day]) {
        grouped[day] = { approved: 0, rejected: 0 };
      }

      if (approval.response?.approved) {
        grouped[day].approved++;
      } else {
        grouped[day].rejected++;
      }
    });

    return grouped;
  }

  private getDayCount(period: string): number {
    return parseInt(period.replace('d', ''));
  }

  private extractReasons(approvals: ApprovalRecord[]): string[] {
    return this.extractFeedbackThemes(approvals.map((a) => a.response?.feedback).filter(Boolean));
  }

  private calculatePeakHours(approvals: ApprovalRecord[]): number[] {
    const hourCounts = new Array(24).fill(0);

    approvals.forEach((approval) => {
      const hour = new Date(approval.createdAt).getHours();
      hourCounts[hour]++;
    });

    // Return top 3 peak hours
    return hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((item) => item.hour);
  }

  private calculateAvgConfidence(approvals: ApprovalRecord[]): number {
    const withConfidence = approvals.filter((a) => a.metadata?.confidence !== undefined);
    if (withConfidence.length === 0) return 0;

    const total = withConfidence.reduce((sum, a) => sum + (a.metadata.confidence || 0), 0);
    return total / withConfidence.length;
  }
}
```

**DTOs**:

```typescript
// similar-approvals.dto.ts
export interface SimilarApprovalsDto {
  totalSimilar: number;
  approvalRate: number;
  statistics: {
    approved: number;
    rejected: number;
    avgApprovalTimeMs: number;
  };
  commonFeedback: string[];
  similarApprovals: {
    id: string;
    message: string;
    approved: boolean;
    feedback?: string;
    similarity: number;
    createdAt: string;
    resolvedAt?: string;
  }[];
  suggestion: string;
}

// approval-trends.dto.ts
export interface ApprovalTrendsDto {
  period: string;
  totalApprovals: number;
  approvalRate: number;
  avgApprovalsPerDay: number;
  avgResponseTimeMs: number;
  dailyStats: Record<string, { approved: number; rejected: number }>;
  bottlenecks: {
    id: string;
    message: string;
    durationMs: number;
    createdAt: string;
  }[];
}

// approval-patterns.dto.ts
export interface ApprovalPatternsDto {
  totalApprovals: number;
  approvalRate: number;
  commonApprovalReasons: string[];
  commonRejectionReasons: string[];
  peakApprovalHours: number[];
  avgConfidenceScore: number;
}
```

**Deliverables**:

- ✅ 3 new endpoints (similar-history, trends, patterns)
- ✅ Historical analysis logic (similarity search, trend calculation)
- ✅ Intelligent suggestion generation
- ✅ 3 DTO definitions

**Testing**:

- Unit tests for helper methods (extractFeedbackThemes, generateSuggestion)
- Integration test: Create historical approvals → Query similar → Verify results

---

#### Task 2.2: Frontend Service - Historical Analysis Methods (1 hour)

**File**: `apps/dev-brand-ui/src/app/shared/services/hitl-api.service.ts` (enhance)

Add historical analysis methods:

```typescript
@Injectable({ providedIn: 'root' })
export class HitlApiService {
  // ... existing methods

  /**
   * Get similar historical approvals for context
   */
  getSimilarApprovals(approvalId: string, limit = 10): Observable<SimilarApprovalsDto> {
    return this.http.get<SimilarApprovalsDto>(
      `${this.apiUrl}/approvals/${approvalId}/similar-history?limit=${limit}`
    );
  }

  /**
   * Get approval trends for user
   */
  getApprovalTrends(userId: string, period = '7d'): Observable<ApprovalTrendsDto> {
    return this.http.get<ApprovalTrendsDto>(
      `${this.apiUrl}/approvals/trends?userId=${userId}&period=${period}`
    );
  }

  /**
   * Get approval patterns for workflow type
   */
  getApprovalPatterns(workflowType: string): Observable<ApprovalPatternsDto> {
    return this.http.get<ApprovalPatternsDto>(
      `${this.apiUrl}/approvals/patterns?workflowType=${workflowType}`
    );
  }
}
```

**Deliverables**:

- ✅ 3 new HTTP methods with typed responses

---

#### Task 2.3: Frontend UI - Historical Context Component (2-3 hours)

**Component: Historical Context Display**

**File**: `apps/dev-brand-ui/src/app/shared/components/approval-historical-context.component.ts`

```typescript
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HitlApiService, SimilarApprovalsDto } from '../services/hitl-api.service';

@Component({
  selector: 'app-approval-historical-context',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="historical-context">
      @if (loading) {
      <div class="loading">
        <div class="spinner"></div>
        <p>Analyzing historical patterns...</p>
      </div>
      } @else if (context) {
      <div class="context-header">
        <h3>📊 Historical Context</h3>
        <span class="badge">{{ context.totalSimilar }} similar found</span>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Approval Rate</div>
          <div
            class="stat-value"
            [class.high]="context.approvalRate >= 70"
            [class.medium]="context.approvalRate >= 40 && context.approvalRate < 70"
            [class.low]="context.approvalRate < 40"
          >
            {{ context.approvalRate.toFixed(0) }}%
          </div>
          <div class="stat-detail">
            {{ context.statistics.approved }} approved, {{ context.statistics.rejected }} rejected
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Avg. Response Time</div>
          <div class="stat-value">{{ formatDuration(context.statistics.avgApprovalTimeMs) }}</div>
          <div class="stat-detail">Based on {{ context.totalSimilar }} similar requests</div>
        </div>
      </div>

      @if (context.commonFeedback.length > 0) {
      <div class="feedback-section">
        <h4>Common Feedback Themes</h4>
        <div class="feedback-tags">
          @for (theme of context.commonFeedback; track theme) {
          <span class="tag">{{ theme }}</span>
          }
        </div>
      </div>
      }

      <div
        class="suggestion-box"
        [class.positive]="context.approvalRate >= 70"
        [class.warning]="context.approvalRate < 70"
      >
        <div class="suggestion-icon">
          {{ context.approvalRate >= 70 ? '✅' : '⚠️' }}
        </div>
        <div class="suggestion-text">{{ context.suggestion }}</div>
      </div>

      @if (showDetails) {
      <div class="similar-approvals">
        <h4>Similar Approvals (Top 5)</h4>
        @for (approval of context.similarApprovals.slice(0, 5); track approval.id) {
        <div class="approval-item">
          <div class="approval-header">
            <span
              class="approval-status"
              [class.approved]="approval.approved"
              [class.rejected]="!approval.approved"
            >
              {{ approval.approved ? '✓ Approved' : '✗ Rejected' }}
            </span>
            <span class="similarity-score"
              >{{ (approval.similarity * 100).toFixed(0) }}% similar</span
            >
          </div>
          <div class="approval-message">{{ approval.message }}</div>
          @if (approval.feedback) {
          <div class="approval-feedback">💬 {{ approval.feedback }}</div>
          }
          <div class="approval-date">{{ formatDate(approval.createdAt) }}</div>
        </div>
        }
      </div>
      }

      <button class="toggle-details" (click)="showDetails = !showDetails">
        {{ showDetails ? 'Hide Details' : 'Show Details' }}
      </button>
      } @else if (error) {
      <div class="error-message">
        <p>Unable to load historical context</p>
        <button (click)="loadContext()">Retry</button>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .historical-context {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
      }

      .loading {
        text-align: center;
        padding: 20px;
      }

      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #e5e7eb;
        border-top-color: #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 12px;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .context-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }

      .context-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
      }

      .badge {
        background: #667eea;
        color: white;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 20px;
      }

      .stat-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 16px;
      }

      .stat-label {
        font-size: 12px;
        color: #6b7280;
        margin-bottom: 8px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .stat-value {
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 4px;
        color: #1f2937;
      }

      .stat-value.high {
        color: #10b981;
      }
      .stat-value.medium {
        color: #f59e0b;
      }
      .stat-value.low {
        color: #ef4444;
      }

      .stat-detail {
        font-size: 12px;
        color: #6b7280;
      }

      .feedback-section {
        margin-bottom: 16px;
      }

      .feedback-section h4 {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
        margin: 0 0 8px 0;
      }

      .feedback-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .tag {
        background: #e0e7ff;
        color: #4338ca;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
      }

      .suggestion-box {
        display: flex;
        gap: 12px;
        padding: 12px 16px;
        border-radius: 6px;
        margin-bottom: 16px;
        border-left: 4px solid;
      }

      .suggestion-box.positive {
        background: #d1fae5;
        border-color: #10b981;
      }

      .suggestion-box.warning {
        background: #fef3c7;
        border-color: #f59e0b;
      }

      .suggestion-icon {
        font-size: 20px;
      }

      .suggestion-text {
        flex: 1;
        font-size: 13px;
        color: #1f2937;
        line-height: 1.5;
        font-weight: 500;
      }

      .similar-approvals {
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
      }

      .similar-approvals h4 {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
        margin: 0 0 12px 0;
      }

      .approval-item {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 8px;
      }

      .approval-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .approval-status {
        font-size: 12px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 4px;
      }

      .approval-status.approved {
        background: #d1fae5;
        color: #065f46;
      }

      .approval-status.rejected {
        background: #fee2e2;
        color: #991b1b;
      }

      .similarity-score {
        font-size: 11px;
        color: #6b7280;
        font-weight: 500;
      }

      .approval-message {
        font-size: 13px;
        color: #374151;
        margin-bottom: 6px;
      }

      .approval-feedback {
        font-size: 12px;
        color: #6b7280;
        font-style: italic;
        margin-bottom: 6px;
      }

      .approval-date {
        font-size: 11px;
        color: #9ca3af;
      }

      .toggle-details {
        width: 100%;
        padding: 8px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        color: #667eea;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .toggle-details:hover {
        background: #f3f4f6;
        border-color: #667eea;
      }

      .error-message {
        text-align: center;
        padding: 20px;
        color: #6b7280;
      }

      .error-message button {
        margin-top: 12px;
        padding: 8px 16px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
      }
    `,
  ],
})
export class ApprovalHistoricalContextComponent implements OnInit {
  @Input() approvalId = '';

  context: SimilarApprovalsDto | null = null;
  loading = false;
  error = false;
  showDetails = false;

  constructor(private readonly hitlApiService: HitlApiService) {}

  ngOnInit() {
    this.loadContext();
  }

  loadContext(): void {
    this.loading = true;
    this.error = false;

    this.hitlApiService.getSimilarApprovals(this.approvalId).subscribe({
      next: (data) => {
        this.context = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load historical context:', err);
        this.error = true;
        this.loading = false;
      },
    });
  }

  formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
}
```

**Integration in Approval Modal**

**File**: `apps/dev-brand-ui/src/app/features/research-chat/components/approval-modal.component.ts` (enhance)

```typescript
import { ApprovalHistoricalContextComponent } from '../../../shared/components/approval-historical-context.component';

@Component({
  // ... existing config
  imports: [
    CommonModule,
    ApprovalHistoricalContextComponent, // Add this
  ],
  template: `
    @if (visible) {
    <div class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>🛑 Review Research Report</h2>
          <button class="close-btn" (click)="onReject()">&times;</button>
        </div>

        <div class="modal-body">
          <!-- NEW: Historical Context -->
          <app-approval-historical-context [approvalId]="approvalId">
          </app-approval-historical-context>

          <!-- Existing: Report Preview -->
          <div class="report-preview">
            <h3>Report Draft</h3>
            <pre>{{ reportDraft }}</pre>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-reject" (click)="onReject()">❌ Reject</button>
          <button class="btn btn-approve" (click)="onApprove()">✅ Approve & Save</button>
        </div>
      </div>
    </div>
    }
  `,
})
export class ApprovalModalComponent {
  @Input() visible = false;
  @Input() reportDraft = '';
  @Input() approvalId = ''; // Add this input
  // ... rest of component
}
```

**Deliverables**:

- ✅ Historical context component with rich UI
- ✅ Statistics display (approval rate, avg time)
- ✅ Common feedback themes
- ✅ Intelligent suggestions
- ✅ Similar approvals list (collapsible)
- ✅ Integration in approval modal

**Testing**:

- Component test: Mock historical data → Verify display
- Integration test: Full flow with backend

---

#### Task 2.4: Approval Trends Dashboard (Optional - 1 hour)

**Component: Approval Trends Dashboard**

**File**: `apps/dev-brand-ui/src/app/features/approvals/approval-trends-dashboard.component.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HitlApiService, ApprovalTrendsDto } from '../../shared/services/hitl-api.service';

@Component({
  selector: 'app-approval-trends-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">
      <div class="dashboard-header">
        <h1>📊 Approval Trends</h1>
        <div class="period-selector">
          <button *ngFor="let p of periods" [class.active]="period === p" (click)="selectPeriod(p)">
            {{ p }}
          </button>
        </div>
      </div>

      @if (trends) {
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Total Approvals</div>
          <div class="metric-value">{{ trends.totalApprovals }}</div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Approval Rate</div>
          <div class="metric-value">{{ trends.approvalRate.toFixed(1) }}%</div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Avg. Per Day</div>
          <div class="metric-value">{{ trends.avgApprovalsPerDay.toFixed(1) }}</div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Avg. Response Time</div>
          <div class="metric-value">{{ formatDuration(trends.avgResponseTimeMs) }}</div>
        </div>
      </div>

      <!-- Simple bar chart for daily stats -->
      <div class="chart-section">
        <h3>Daily Approval Activity</h3>
        <div class="chart">
          @for (day of Object.keys(trends.dailyStats); track day) {
          <div class="chart-bar">
            <div class="bar-label">{{ formatDay(day) }}</div>
            <div class="bar-container">
              <div
                class="bar bar-approved"
                [style.width.%]="(trends.dailyStats[day].approved / maxDailyApprovals) * 100"
              >
                {{ trends.dailyStats[day].approved }}
              </div>
              <div
                class="bar bar-rejected"
                [style.width.%]="(trends.dailyStats[day].rejected / maxDailyApprovals) * 100"
              >
                {{ trends.dailyStats[day].rejected }}
              </div>
            </div>
          </div>
          }
        </div>
      </div>

      @if (trends.bottlenecks.length > 0) {
      <div class="bottlenecks-section">
        <h3>⚠️ Bottlenecks ({{ trends.bottlenecks.length }})</h3>
        <p class="section-description">Approvals taking longer than average</p>
        @for (bottleneck of trends.bottlenecks; track bottleneck.id) {
        <div class="bottleneck-item">
          <div class="bottleneck-duration">{{ formatDuration(bottleneck.durationMs) }}</div>
          <div class="bottleneck-message">{{ bottleneck.message }}</div>
          <div class="bottleneck-date">{{ formatDate(bottleneck.createdAt) }}</div>
        </div>
        }
      </div>
      } }
    </div>
  `,
  styles: [
    /* Dashboard styles - similar to historical context component */
  ],
})
export class ApprovalTrendsDashboardComponent implements OnInit {
  trends: ApprovalTrendsDto | null = null;
  periods = ['7d', '30d', '90d'];
  period = '7d';
  maxDailyApprovals = 0;

  constructor(private readonly hitlApiService: HitlApiService) {}

  ngOnInit() {
    this.loadTrends();
  }

  selectPeriod(period: string): void {
    this.period = period;
    this.loadTrends();
  }

  loadTrends(): void {
    const userId = 'current-user'; // Get from auth service
    this.hitlApiService.getApprovalTrends(userId, this.period).subscribe({
      next: (data) => {
        this.trends = data;
        this.maxDailyApprovals = Math.max(
          ...Object.values(data.dailyStats).map((d) => d.approved + d.rejected)
        );
      },
    });
  }

  formatDuration(ms: number): string {
    // ... same as historical context component
  }

  formatDay(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  Object = Object; // For template access
}
```

**Deliverables**:

- ✅ Trends dashboard with metrics
- ✅ Daily activity chart
- ✅ Bottleneck detection

---

### Priority 2 Summary

**Total Effort**: 5-7 hours

**Deliverables**:

1. ✅ Backend API - 3 new endpoints (similar-history, trends, patterns)
2. ✅ Frontend Service - 3 new HTTP methods
3. ✅ Historical Context Component - Rich UI with stats + suggestions
4. ✅ Integration in Approval Modal - Show context before decision
5. ✅ (Optional) Trends Dashboard - Analytics view

**Testing Coverage**:

- Unit tests for all components/services
- Integration tests for API endpoints
- E2E test for historical context display

**Success Metrics**:

- Historical context loads in < 500ms
- Suggestions are accurate (based on > 80% approval rate)
- Users report faster approval decisions (subjective)
- Neo4j data is surfaced in user-facing features

---

## Overall Project Summary

### Total Implementation Effort

| Priority  | Feature                      | Estimated Hours | Status      |
| --------- | ---------------------------- | --------------- | ----------- |
| **P1**    | User Interruption Feature    | 5-8 hours       | Pending     |
| **P2**    | Neo4j Historical Analysis UX | 5-7 hours       | Pending     |
| **Total** | **Both Priorities**          | **10-15 hours** | **Pending** |

### Deliverables Breakdown

**Backend** (6-8 hours):

- HitlController with 10 endpoints total
- WebSocket Gateway with 4 event types
- Historical analysis logic
- DTOs and validation

**Frontend** (4-7 hours):

- HitlApiService with HTTP + WebSocket
- 3 UI components (Interrupt button, Dialog, Historical context)
- Optional: Trends dashboard
- Integration in existing components

**Testing** (2-3 hours):

- Unit tests for all services/components
- Integration tests for API + WebSocket
- E2E tests for full flows

### Success Criteria

**User Interruption**:

- ✅ Users can interrupt workflows from UI
- ✅ Interruptions are stored in Neo4j
- ✅ Workflows pause and resume correctly
- ✅ Real-time events work via WebSocket
- ✅ Feature works across all workflows (ResearcherAgent, PersonalBrandStrategist, etc.)

**Neo4j Historical Analysis**:

- ✅ Historical context loads in approval modals
- ✅ Suggestions are based on > 10 similar approvals
- ✅ Approval trends dashboard shows meaningful insights
- ✅ Neo4j stored data is surfaced in user-facing features
- ✅ Users report improved decision-making (qualitative)

### Dependencies

**Required**:

- Node.js + npm
- Angular CLI
- NestJS CLI
- Neo4j running (port 7687)
- Existing HITL module infrastructure

**Optional**:

- Chart library for trends visualization (Chart.js, ApexCharts)
- NLP library for feedback theme extraction (compromise, natural)

### Risks & Mitigations

| Risk                         | Impact | Mitigation                                      |
| ---------------------------- | ------ | ----------------------------------------------- |
| WebSocket connection issues  | High   | Add reconnection logic, fallback to polling     |
| Neo4j query performance      | Medium | Add indexes, implement caching                  |
| Historical data insufficient | Low    | Graceful degradation, "Not enough data" message |
| Workflow state conflicts     | Medium | Add state versioning, conflict resolution       |

### Next Steps

1. **Review & Approval** - User reviews this implementation plan
2. **Task Breakdown** - Create detailed tasks in project management tool
3. **Development Environment** - Verify Neo4j, services running
4. **Implementation** - Follow priority order (P1 → P2)
5. **Testing** - Unit → Integration → E2E
6. **Documentation** - Update CLAUDE.md files
7. **Deployment** - Deploy to staging → production

---

## Appendix: Code References

### Existing Files to Modify

**Backend**:

- `apps/dev-brand-api/src/app/app.module.ts` - Add HitlController, HitlGateway
- `libs/langgraph-modules/hitl/src/lib/services/user-interruption.service.ts` - Add WebSocket events
- `libs/langgraph-modules/workflow-engine/src/lib/services/workflow-execution.service.ts` - Add interruption detection

**Frontend**:

- `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.ts` - Add interrupt button + dialog
- `apps/dev-brand-ui/src/app/features/research-chat/components/approval-modal.component.ts` - Add historical context

### New Files to Create

**Backend**:

- `apps/dev-brand-api/src/app/controllers/hitl.controller.ts`
- `apps/dev-brand-api/src/app/controllers/dto/create-interruption.dto.ts`
- `apps/dev-brand-api/src/app/controllers/dto/interruption-response.dto.ts`
- `apps/dev-brand-api/src/app/controllers/dto/approval-decision.dto.ts`
- `apps/dev-brand-api/src/app/controllers/dto/similar-approvals.dto.ts`
- `apps/dev-brand-api/src/app/controllers/dto/approval-trends.dto.ts`
- `apps/dev-brand-api/src/app/controllers/dto/approval-patterns.dto.ts`
- `apps/dev-brand-api/src/app/gateways/hitl.gateway.ts`

**Frontend**:

- `apps/dev-brand-ui/src/app/shared/services/hitl-api.service.ts`
- `apps/dev-brand-ui/src/app/shared/components/interrupt-button.component.ts`
- `apps/dev-brand-ui/src/app/shared/components/interruption-dialog.component.ts`
- `apps/dev-brand-ui/src/app/shared/components/approval-historical-context.component.ts`
- `apps/dev-brand-ui/src/app/features/approvals/approval-trends-dashboard.component.ts` (optional)

### Library References

**HITL Services** (existing):

- `libs/langgraph-modules/hitl/src/lib/services/human-approval.service.ts`
- `libs/langgraph-modules/hitl/src/lib/services/user-interruption.service.ts`
- `libs/langgraph-modules/hitl/src/lib/services/approval-history-search.service.ts`

**Storage Adapters** (existing):

- `libs/langgraph-modules/adapters/src/lib/adapters/hitl/neo4j-hitl-storage.adapter.ts`
- `libs/langgraph-modules/adapters/src/lib/adapters/hitl/neo4j-interruption-storage.adapter.ts`

---

## Final Notes

This implementation plan represents the final 25-30% of HITL functionality needed to complete the system. The backend infrastructure (70-75%) is already production-ready, making this a focused enhancement effort rather than a ground-up build.

**Key Insight**: You correctly identified that the missing pieces are:

1. User interruption API/UI exposure
2. Neo4j data surfaced in user experience

This plan addresses both with minimal effort (10-15 hours) and maximum impact on user experience.

**Recommendation**: Implement Priority 1 first (User Interruption) as it provides immediate value and can be tested independently. Priority 2 (Historical Analysis) can follow as an enhancement once interruption is stable.

---

**Document Version**: 1.0
**Created**: 2025-01-16
**Status**: Ready for Review
**Estimated Effort**: 10-15 hours
**Priority**: P1-High
