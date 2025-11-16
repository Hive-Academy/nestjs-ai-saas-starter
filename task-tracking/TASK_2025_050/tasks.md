# Task Breakdown for TASK_2025_050

## Overview

- Total Tasks: 10
- Implementation Phases: 8
- Backend Tasks: 3 (backend-developer)
- Frontend Tasks: 7 (frontend-developer)

---

## TASK 1: Create Backend DTOs for Conversation Endpoints

**Status**: 🔄 IN PROGRESS
**Assigned To**: backend-developer
**File**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\controllers\dto\conversation.dto.ts
**Dependencies**: None

### Requirements

Create comprehensive Data Transfer Objects for conversation history endpoints. This includes DTOs for:

- Request: NewConversationDto (with optional initialQuery)
- Response: NewConversationResponseDto, ConversationListResponseDto, ConversationSummaryDto, MessageDto, ConversationHistoryResponseDto
- Supervisor-specific: SupervisorConversationSummaryDto, SupervisorMessageDto, SupervisorConversationHistoryResponseDto

**Reference**: implementation-plan.md:603-755 (Backend Data Transfer Objects section)

### Verification

- [ ] File exists at D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\controllers\dto\conversation.dto.ts
- [ ] Git commit matches pattern: `feat(langgraph): create conversation DTOs for history endpoints`
- [ ] All DTOs compile without TypeScript errors
- [ ] Validation decorators applied (@IsString, @IsOptional, @IsEnum)
- [ ] Swagger decorators applied (@ApiProperty) with examples
- [ ] Build passes: `npx nx build dev-brand-api`

### Git Commit Pattern

```
feat(langgraph): create conversation DTOs for history endpoints
```

### Implementation Details

**Key Imports**:

```typescript
import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
```

**DTOs to Create**:

1. `NewConversationDto` - Request body with optional initialQuery
2. `NewConversationResponseDto` - Response with threadId, status, conversationUrl
3. `ConversationSummaryDto` - Thread summary with preview, timestamp, status, metadata
4. `ConversationListResponseDto` - Array wrapper with conversations, totalCount, hasMore
5. `MessageDto` - Single message with role, content, timestamp, toolCalls
6. `ConversationHistoryResponseDto` - Full history with messages, metadata, nextSteps
7. `SupervisorConversationSummaryDto` (extends ConversationSummaryDto) - Adds currentAgent, workflowProgress
8. `SupervisorMessageDto` (extends MessageDto) - Adds agentId
9. `SupervisorConversationHistoryResponseDto` (extends ConversationHistoryResponseDto) - Adds agentCoordination

**Validation Rules**:

- All string fields: `@IsString()`
- Optional fields: `@IsOptional()`
- Enum fields: `@IsEnum(['active', 'completed', 'waiting'])`
- Swagger examples: Use `@ApiProperty({ example: '...' })`

---

## TASK 2: Implement ResearchChatController Conversation Endpoints

**Status**: ⏸️ PENDING
**Assigned To**: backend-developer
**File**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\controllers\research-chat.controller.ts
**Dependencies**: TASK 1 (requires DTOs)

### Requirements

Add 3 new endpoints to ResearchChatController:

1. `GET /research-chat/conversation/list` - Retrieve last 10 conversations for authenticated user
2. `GET /research-chat/conversation/history/:threadId` - Get full conversation history with thread ownership verification
3. `POST /research-chat/conversation/new` - Create new conversation thread

**Reference**: implementation-plan.md:154-481 (ResearchChatController endpoints section)

### Verification

- [ ] File modified at D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\controllers\research-chat.controller.ts
- [ ] Git commit matches pattern: `feat(langgraph): add conversation history endpoints to research chat`
- [ ] All 3 endpoints implemented with @UseGuards(JwtAuthGuard)
- [ ] Thread ownership verification implemented (checks metadata.userId)
- [ ] Error handling differentiates UnauthorizedException, NotFoundException, InternalServerErrorException
- [ ] Helper methods added: extractPreview(), determineStatus(), getThreadsForUser()
- [ ] Audit logging added for all operations
- [ ] Swagger documentation complete (@ApiOperation, @ApiResponse)
- [ ] Build passes: `npx nx build dev-brand-api`

### Git Commit Pattern

```
feat(langgraph): add conversation history endpoints to research chat
```

### Implementation Details

**Key Imports**:

```typescript
import {
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { WorkflowResumptionService } from '@hive-academy/langgraph-workflow-engine';
import { ResearcherAgent } from '../workflows/researcher-agent.workflow';
import {
  ConversationListResponseDto,
  ConversationHistoryResponseDto,
  NewConversationResponseDto,
} from './dto/conversation.dto';
```

**Pattern to Follow**: task-tracking/TASK_2025_049/controller-implementation-guide.md:88-155 (getWorkflowState pattern)

**Endpoint 1: GET /conversation/list**

- Extract userId from `request.user.id` (JWT)
- Query checkpoint storage for all threads with metadata.userId matching
- Get state snapshots for each thread via WorkflowResumptionService.getWorkflowState()
- Sort by timestamp DESC, limit to 10
- Format response with preview (from first message or metadata.query)
- Determine status from metadata (waiting/completed/active)

**Endpoint 2: GET /conversation/history/:threadId**

- Extract userId from JWT
- Call WorkflowResumptionService.getWorkflowState(ResearcherAgent, threadId)
- Verify thread ownership: `stateSnapshot.values.metadata?.userId === userId`
- If ownership fails: throw UnauthorizedException
- Format messages array from stateSnapshot.values.messages
- Return metadata, nextSteps, waitingForApproval status

**Endpoint 3: POST /conversation/new**

- Extract userId from JWT
- Generate threadId: `research-${Date.now()}-${userId}`
- Return response with threadId, status: 'created', conversationUrl

**Error Handling Pattern**:

```typescript
try {
  // operation
} catch (error) {
  this.logger.error(`Operation failed:`, error.message);
  if (error instanceof UnauthorizedException) throw error;
  throw new InternalServerErrorException('Operation failed');
}
```

---

## TASK 3: Implement DevBrandController Conversation Endpoints

**Status**: ⏸️ PENDING
**Assigned To**: backend-developer
**File**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\controllers\devbrand.controller.ts
**Dependencies**: TASK 1 (requires DTOs)

### Requirements

Add 3 new endpoints to DevBrandController (supervisor workflow):

1. `GET /devbrand/conversation/list` - Retrieve last 10 supervisor workflow conversations
2. `GET /devbrand/conversation/history/:threadId` - Get supervisor conversation with agent coordination details
3. `POST /devbrand/conversation/new` - Create new supervisor thread

**Reference**: implementation-plan.md:483-601 (DevBrandController endpoints section)

### Verification

- [ ] File modified at D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\controllers\devbrand.controller.ts
- [ ] Git commit matches pattern: `feat(langgraph): add conversation history endpoints to devbrand supervisor`
- [ ] All 3 endpoints implemented with @UseGuards(JwtAuthGuard)
- [ ] Thread ownership verification implemented
- [ ] Supervisor-specific metadata included (currentAgent, nextAgent, agentHistory, workflowProgress)
- [ ] Helper method added: extractAgentHistory()
- [ ] Error handling, audit logging, Swagger docs complete
- [ ] Build passes: `npx nx build dev-brand-api`

### Git Commit Pattern

```
feat(langgraph): add conversation history endpoints to devbrand supervisor
```

### Implementation Details

**Key Imports**:

```typescript
import { DevBrandSupervisorWorkflow } from '../workflows/devbrand-supervisor.workflow';
import { SupervisorConversationHistoryResponseDto } from './dto/conversation.dto';
```

**Pattern to Follow**: task-tracking/TASK_2025_049/controller-implementation-guide.md:393-485 (Supervisor-specific response format)

**Differences from ResearchChatController**:

- Workflow class: DevBrandSupervisorWorkflow (not ResearcherAgent)
- Thread ID format: `devbrand-${Date.now()}-${userId}`
- Additional response fields:
  - `agentCoordination.currentAgent` (from stateSnapshot.values.current)
  - `agentCoordination.nextAgent` (from stateSnapshot.values.next)
  - `agentCoordination.agentHistory` (extract from messages with agentId)
  - `agentCoordination.pendingTasks` (from stateSnapshot.tasks)

**Helper: extractAgentHistory()**

```typescript
private extractAgentHistory(messages: any[]): Array<{ agentId: string; timestamp: string; action: string }> {
  return messages
    .filter(msg => msg.additional_kwargs?.agentId)
    .map(msg => ({
      agentId: msg.additional_kwargs.agentId,
      timestamp: msg.additional_kwargs.timestamp || new Date().toISOString(),
      action: msg.additional_kwargs.action || 'executed',
    }));
}
```

---

## TASK 4: Create Frontend Conversation Models

**Status**: ⏸️ PENDING
**Assigned To**: frontend-developer
**File**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\shared\models\conversation.model.ts
**Dependencies**: TASK 1 (backend DTOs define the contract)

### Requirements

Create TypeScript interfaces for frontend that match backend DTOs. These models provide type safety for API responses and component state.

**Reference**: implementation-plan.md:1193-1262 (ConversationApiService Design section)

### Verification

- [ ] File exists at D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\shared\models\conversation.model.ts
- [ ] Git commit matches pattern: `feat(angular-3d): create conversation models for type safety`
- [ ] All interfaces match backend DTO structure
- [ ] Enum types defined for status and role fields
- [ ] Build passes: `npx nx build dev-brand-ui`

### Git Commit Pattern

```
feat(angular-3d): create conversation models for type safety
```

### Implementation Details

**Interfaces to Create**:

```typescript
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
  currentAgent?: string; // Supervisor-specific
  workflowProgress?: number; // Supervisor-specific
}

export interface ConversationListResponse {
  conversations: ConversationSummary[];
  totalCount: number;
  hasMore: boolean;
}

export interface Message {
  role: 'human' | 'ai' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: any[];
  agentId?: string; // Supervisor-specific
}

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
}

export interface NewConversationResponse {
  threadId: string;
  status: 'created';
  conversationUrl: string;
}
```

---

## TASK 5: Create Frontend ConversationApiService

**Status**: ⏸️ PENDING
**Assigned To**: frontend-developer
**File**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\shared\services\conversation-api.service.ts
**Dependencies**: TASK 4 (requires models)

### Requirements

Create Angular service that handles all HTTP calls to conversation history endpoints. Service provides Observable-based API for components to consume.

**Reference**: implementation-plan.md:1193-1262 (ConversationApiService Design section)

### Verification

- [ ] File exists at D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\shared\services\conversation-api.service.ts
- [ ] Git commit matches pattern: `feat(angular-3d): create conversation API service`
- [ ] Service is injectable with providedIn: 'root'
- [ ] All 3 methods implemented (getConversationList, getConversationHistory, createNewConversation)
- [ ] Methods accept workflowType parameter ('researcher' | 'supervisor')
- [ ] All methods return correctly typed Observables
- [ ] Build passes: `npx nx build dev-brand-ui`

### Git Commit Pattern

```
feat(angular-3d): create conversation API service
```

### Implementation Details

**Key Imports**:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  ConversationListResponse,
  ConversationHistoryResponse,
  NewConversationResponse,
} from '../models/conversation.model';
```

**Service Structure**:

```typescript
@Injectable({ providedIn: 'root' })
export class ConversationApiService {
  private http = inject(HttpClient);
  private readonly baseUrls = {
    researcher: '/api/research-chat',
    supervisor: '/api/devbrand',
  };

  getConversationList(
    workflowType: 'researcher' | 'supervisor',
    userId: string
  ): Observable<ConversationListResponse> {
    const baseUrl = this.baseUrls[workflowType];
    return this.http.get<ConversationListResponse>(`${baseUrl}/conversation/list`);
    // JWT token sent automatically via HttpInterceptor
  }

  getConversationHistory(
    workflowType: 'researcher' | 'supervisor',
    threadId: string
  ): Observable<ConversationHistoryResponse> {
    const baseUrl = this.baseUrls[workflowType];
    return this.http.get<ConversationHistoryResponse>(
      `${baseUrl}/conversation/history/${threadId}`
    );
  }

  createNewConversation(
    workflowType: 'researcher' | 'supervisor',
    userId: string,
    initialQuery?: string
  ): Observable<NewConversationResponse> {
    const baseUrl = this.baseUrls[workflowType];
    return this.http.post<NewConversationResponse>(`${baseUrl}/conversation/new`, { initialQuery });
  }
}
```

---

## TASK 6: Create ConversationSidebarComponent (TypeScript)

**Status**: ⏸️ PENDING
**Assigned To**: frontend-developer
**File**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\shared\components\conversation-sidebar\conversation-sidebar.component.ts
**Dependencies**: TASK 5 (requires ConversationApiService)

### Requirements

Create Angular standalone component TypeScript file with RxJS state management, event emitters, and conversation list logic.

**Reference**: implementation-plan.md:820-1006 (ConversationSidebarComponent Architecture section)

### Verification

- [ ] File exists at D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\shared\components\conversation-sidebar\conversation-sidebar.component.ts
- [ ] Git commit matches pattern: `feat(angular-3d): create conversation sidebar component logic`
- [ ] Component is standalone with selector 'app-conversation-sidebar'
- [ ] @Input properties: workflowType, userId, currentThreadId
- [ ] @Output events: conversationSelected, newConversationCreated
- [ ] RxJS state management with BehaviorSubject
- [ ] Methods implemented: loadConversations, onSelectConversation, onNewChat, toggleCollapse
- [ ] Helper methods: getRelativeTime, getStatusClass, getStatusLabel
- [ ] Build passes: `npx nx build dev-brand-ui`

### Git Commit Pattern

```
feat(angular-3d): create conversation sidebar component logic
```

### Implementation Details

**Key Imports**:

```typescript
import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, map, catchError, of } from 'rxjs';
import { ConversationApiService } from '../../services/conversation-api.service';
import type { ConversationSummary } from '../../models/conversation.model';
```

**State Interface**:

```typescript
interface SidebarState {
  conversations: ConversationSummary[];
  loading: boolean;
  error: string | null;
  collapsed: boolean;
}
```

**Component Properties**:

```typescript
@Input() workflowType: 'researcher' | 'supervisor' = 'researcher';
@Input() userId: string = '';
@Input() currentThreadId?: string;

@Output() conversationSelected = new EventEmitter<string>();
@Output() newConversationCreated = new EventEmitter<string>();

private state$ = new BehaviorSubject<SidebarState>({
  conversations: [],
  loading: false,
  error: null,
  collapsed: false,
});

conversations$ = this.state$.pipe(map(s => s.conversations));
loading$ = this.state$.pipe(map(s => s.loading));
error$ = this.state$.pipe(map(s => s.error));
collapsed$ = this.state$.pipe(map(s => s.collapsed));
```

**Key Methods**:

- `ngOnInit()`: Call loadConversations()
- `loadConversations()`: API call with loading/error state management
- `onSelectConversation(threadId)`: Emit conversationSelected event
- `onNewChat()`: API call to create new conversation, emit newConversationCreated
- `toggleCollapse()`: Toggle collapsed state, persist to localStorage
- `getRelativeTime(timestamp)`: Format timestamp as "2 hours ago"
- `getStatusClass(status)`: Return Tailwind classes for status badge
- `getStatusLabel(status)`: Return display text for status

---

## TASK 7: Create ConversationSidebarComponent (Template)

**Status**: ⏸️ PENDING
**Assigned To**: frontend-developer
**File**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\shared\components\conversation-sidebar\conversation-sidebar.component.html
**Dependencies**: TASK 6 (requires TypeScript component)

### Requirements

Create HTML template with conversation list, "New Chat" button, loading states, error states, and empty state.

**Reference**: implementation-plan.md:1008-1191 (ConversationSidebarComponent Template section)

### Verification

- [ ] File exists at D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\shared\components\conversation-sidebar\conversation-sidebar.component.html
- [ ] Git commit matches pattern: `feat(angular-3d): create conversation sidebar template`
- [ ] Template uses async pipe for all observables
- [ ] Loading state displays spinner with "Loading conversations..." message
- [ ] Error state displays error message with retry button
- [ ] Empty state displays "No conversations yet. Start a new chat!" with icon
- [ ] Conversation list items show preview, timestamp, status badge
- [ ] "New Chat" button with icon and text
- [ ] Collapse toggle button in header
- [ ] Build passes: `npx nx build dev-brand-ui`

### Git Commit Pattern

```
feat(angular-3d): create conversation sidebar template
```

### Implementation Details

**Template Structure**:

```html
<div
  class="conversation-sidebar flex flex-col h-full bg-white border-r border-gray-200"
  [class.collapsed]="(collapsed$ | async)"
>
  <!-- Header with collapse toggle -->
  <div class="sidebar-header flex items-center justify-between p-4 border-b border-gray-200">
    <h2 class="text-lg font-semibold text-gray-900" *ngIf="!(collapsed$ | async)">Conversations</h2>
    <button (click)="toggleCollapse()" class="p-2 rounded-lg hover:bg-gray-100 transition-colors">
      ...
    </button>
  </div>

  <!-- New Chat Button -->
  <div class="p-4" *ngIf="!(collapsed$ | async)">
    <button
      (click)="onNewChat()"
      [disabled]="loading$ | async"
      class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg..."
    >
      <svg>...</svg>
      <span>New Chat</span>
    </button>
  </div>

  <!-- Loading State -->
  <div *ngIf="loading$ | async" class="flex flex-col items-center justify-center p-8 space-y-4">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    <p class="text-sm text-gray-500" *ngIf="!(collapsed$ | async)">Loading conversations...</p>
  </div>

  <!-- Error State -->
  <div *ngIf="(error$ | async) as error" class="p-4 bg-red-50 border border-red-200 rounded-lg m-4">
    <p class="text-sm text-red-800">{{ error }}</p>
    <button
      (click)="loadConversations()"
      class="mt-2 text-sm text-red-600 hover:text-red-800 underline"
    >
      Retry
    </button>
  </div>

  <!-- Conversation List -->
  <div
    class="conversation-list flex-1 overflow-y-auto"
    *ngIf="!(loading$ | async) && !(error$ | async)"
  >
    <!-- Empty State -->
    <div
      *ngIf="(conversations$ | async)?.length === 0"
      class="flex flex-col items-center justify-center p-8 text-center"
    >
      <svg class="w-16 h-16 text-gray-300 mb-4">...</svg>
      <p class="text-gray-500" *ngIf="!(collapsed$ | async)">
        No conversations yet.<br />Start a new chat!
      </p>
    </div>

    <!-- Conversation Items -->
    <div class="space-y-1 p-2">
      <button
        *ngFor="let conversation of (conversations$ | async); trackBy: trackByThreadId"
        (click)="onSelectConversation(conversation.threadId)"
        [class.active]="conversation.threadId === currentThreadId"
        class="conversation-item w-full text-left p-3 rounded-lg transition-colors hover:bg-gray-50"
      >
        <!-- Conversation preview, timestamp, status badge -->
      </button>
    </div>
  </div>
</div>
```

**Tailwind Classes**:

- Container: `flex flex-col h-full bg-white border-r border-gray-200`
- Button: `bg-blue-600 text-white rounded-lg hover:bg-blue-700`
- Spinner: `animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600`
- Status badge: `px-2 py-0.5 rounded-full text-xs font-medium`

---

## TASK 8: Create ConversationSidebarComponent (Styles)

**Status**: ⏸️ PENDING
**Assigned To**: frontend-developer
**File**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\shared\components\conversation-sidebar\conversation-sidebar.component.scss
**Dependencies**: TASK 7 (requires template)

### Requirements

Create SCSS styles for responsive layout (desktop grid, mobile drawer), collapse animation, and sidebar states.

**Reference**: implementation-plan.md:1264-1351 (Responsive Layout Strategy section)

### Verification

- [ ] File exists at D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\shared\components\conversation-sidebar\conversation-sidebar.component.scss
- [ ] Git commit matches pattern: `feat(angular-3d): add conversation sidebar responsive styles`
- [ ] Desktop layout: Fixed width sidebar (280px normal, 64px collapsed)
- [ ] Mobile layout (< 768px): Drawer pattern with slide-in animation
- [ ] Collapse transition: smooth 250ms ease-in-out
- [ ] Active conversation highlighting styles
- [ ] Build passes: `npx nx build dev-brand-ui`

### Git Commit Pattern

```
feat(angular-3d): add conversation sidebar responsive styles
```

### Implementation Details

**SCSS Structure**:

```scss
.conversation-sidebar {
  // Desktop styles
  &.collapsed {
    width: 64px;
    .conversation-item p {
      display: none;
    }
  }

  .conversation-item {
    &.active {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
    }

    &:hover {
      background-color: #f9fafb;
    }
  }
}

// Mobile drawer (< 768px)
@media (max-width: 767px) {
  .conversation-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    transform: translateX(-100%);
    transition: transform 250ms ease-in-out;
    z-index: 1000;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);

    &.open {
      transform: translateX(0);
    }
  }

  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
    opacity: 0;
    pointer-events: none;
    transition: opacity 250ms ease-in-out;

    &.open {
      opacity: 1;
      pointer-events: auto;
    }
  }
}
```

---

## TASK 9: Integrate ConversationSidebar into ResearchChatComponent

**Status**: ⏸️ PENDING
**Assigned To**: frontend-developer
**Files**:

- D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\research-chat\research-chat.component.ts
- D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\research-chat\research-chat.component.html
- D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\research-chat\research-chat.component.scss
  **Dependencies**: TASK 8 (requires complete ConversationSidebarComponent)

### Requirements

Integrate ConversationSidebarComponent into ResearchChatComponent with event handlers for conversation selection and new conversation creation. Update layout to use CSS Grid (sidebar + chat area).

**Reference**: implementation-plan.md:1353-1475 (ResearchChatComponent Integration section)

### Verification

- [ ] Files modified at specified paths
- [ ] Git commit matches pattern: `feat(angular-3d): integrate conversation sidebar into research chat`
- [ ] ConversationSidebarComponent imported and added to template
- [ ] Event handlers implemented: onConversationSelected, onNewConversation
- [ ] loadConversationHistory method implemented (calls ConversationApiService)
- [ ] sendMessage method updated to track currentThreadId
- [ ] CSS Grid layout applied (280px sidebar, 1fr chat area)
- [ ] Responsive layout works (drawer on mobile)
- [ ] userId hardcoded to 'test-researcher-001'
- [ ] Build passes: `npx nx build dev-brand-ui`

### Git Commit Pattern

```
feat(angular-3d): integrate conversation sidebar into research chat
```

### Implementation Details

**TypeScript Changes (research-chat.component.ts)**:

```typescript
export class ResearchChatComponent implements OnInit, OnDestroy {
  // Existing properties
  messages: ChatMessage[] = [];
  currentQuery = '';
  isResearching = false;

  // NEW properties
  userId = 'test-researcher-001'; // Hardcoded test user
  currentThreadId?: string;
  sidebarCollapsed = false;

  constructor(
    private researchService: ResearchService,
    private conversationApi: ConversationApiService // NEW inject
  ) {}

  // NEW: Handle conversation selection
  onConversationSelected(threadId: string): void {
    this.loadConversationHistory(threadId);
  }

  // NEW: Load conversation history
  private loadConversationHistory(threadId: string): void {
    this.conversationApi.getConversationHistory('researcher', threadId).subscribe({
      next: (response) => {
        this.currentThreadId = threadId;
        this.messages = response.conversationHistory.map((msg) => ({
          role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
          content: msg.content,
          type: 'text',
          timestamp: new Date(msg.timestamp),
          toolData: msg.toolCalls ? { toolOutput: msg.toolCalls } : undefined,
        }));
        this.scrollToBottom();
      },
      error: (error) => {
        this.addErrorMessage(`Failed to load conversation: ${error.message}`);
      },
    });
  }

  // NEW: Handle new conversation
  onNewConversation(threadId: string): void {
    this.currentThreadId = threadId;
    this.messages = [];
    this.currentQuery = '';
    this.addSystemMessage('New conversation started. Ask me to research any topic.');
  }

  // MODIFIED: Update sendMessage to use currentThreadId
  async sendMessage(): Promise<void> {
    // ... existing logic ...
    this.researchService.startResearch(query, this.userId, 'detailed').subscribe({
      next: (response) => {
        this.currentThreadId = response.executionId; // Track thread
        // ... existing logic ...
      },
    });
  }
}
```

**Template Changes (research-chat.component.html)**:

```html
<div class="chat-layout" [class.sidebar-collapsed]="sidebarCollapsed">
  <!-- Sidebar Column -->
  <div class="sidebar-column">
    <app-conversation-sidebar
      workflowType="researcher"
      [userId]="userId"
      [currentThreadId]="currentThreadId"
      (conversationSelected)="onConversationSelected($event)"
      (newConversationCreated)="onNewConversation($event)"
    />
  </div>

  <!-- Chat Column (Existing Chat UI) -->
  <div class="chat-column">
    <!-- Existing chat messages, input, etc. -->
  </div>
</div>
```

**SCSS Changes (research-chat.component.scss)**:

```scss
.chat-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  grid-template-rows: 1fr;
  height: 100vh;
  overflow: hidden;

  &.sidebar-collapsed {
    grid-template-columns: 64px 1fr;
  }

  .sidebar-column {
    overflow-y: auto;
  }

  .chat-column {
    overflow-y: auto;
  }
}
```

---

## TASK 10: Integrate ConversationSidebar into DevBrandPocPageComponent

**Status**: ⏸️ PENDING
**Assigned To**: frontend-developer
**Files**:

- D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\pages\devbrand-poc-page.component.ts
- D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\pages\devbrand-poc-page.component.html (inline template)
  **Dependencies**: TASK 8 (requires complete ConversationSidebarComponent)

### Requirements

Integrate ConversationSidebarComponent into DevBrandPocPageComponent for supervisor workflow. Add event handlers and update layout to include sidebar.

**Reference**: implementation-plan.md:1477-1542 (DevBrandPocPageComponent Integration section)

### Verification

- [ ] Files modified at specified paths
- [ ] Git commit matches pattern: `feat(angular-3d): integrate conversation sidebar into devbrand supervisor poc`
- [ ] ConversationSidebarComponent imported and added to template
- [ ] Event handlers implemented: onConversationSelected, onNewConversation
- [ ] onExecutionStarted updated to track currentThreadId
- [ ] Grid layout added (280px sidebar, 1fr main content)
- [ ] userId hardcoded to 'test-supervisor-001'
- [ ] Build passes: `npx nx build dev-brand-ui`

### Git Commit Pattern

```
feat(angular-3d): integrate conversation sidebar into devbrand supervisor poc
```

### Implementation Details

**TypeScript Changes (devbrand-poc-page.component.ts)**:

```typescript
export class DevbrandPocPageComponent implements OnDestroy {
  private readonly sseService = inject(DevBrandSseService);
  private readonly workflowStateService = inject(DevBrandWorkflowStateService);
  private readonly conversationApi = inject(ConversationApiService); // NEW

  userId = 'test-supervisor-001'; // NEW: Hardcoded test user
  currentThreadId?: string; // NEW

  // NEW: Handle conversation selection
  onConversationSelected(threadId: string): void {
    this.currentThreadId = threadId;
    // Optionally: Load conversation history and display
  }

  // NEW: Handle new conversation
  onNewConversation(threadId: string): void {
    this.currentThreadId = threadId;
    // Reset workflow state
  }

  onExecutionStarted(response: { executionId: string }): void {
    this.currentThreadId = response.executionId; // Track thread
    // Existing workflow execution logic
  }
}
```

**Template Changes (devbrand-poc-page.component.html - inline template)**:

```html
<div class="container mx-auto px-4 py-8">
  <header class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900">DevBrand Workflow POC</h1>
  </header>

  <!-- NEW: Grid Layout with Sidebar -->
  <div class="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
    <!-- Sidebar Column -->
    <div>
      <app-conversation-sidebar
        workflowType="supervisor"
        [userId]="userId"
        [currentThreadId]="currentThreadId"
        (conversationSelected)="onConversationSelected($event)"
        (newConversationCreated)="onNewConversation($event)"
      />
    </div>

    <!-- Main Content Column -->
    <div class="space-y-8">
      <app-execution-control (executionStarted)="onExecutionStarted($event)" />
      <app-progress-visualization />
      <app-event-stream />
    </div>
  </div>
</div>
```

---

## Completion Criteria

- All 10 tasks completed and verified
- All git commits follow conventional commit format
- Backend endpoints tested with Postman/REST client
- Frontend components render without errors
- Integration flows work (select conversation → load history → display)
- Build passes for both dev-brand-api and dev-brand-ui
- No TypeScript compilation errors
- Responsive layout works (desktop grid, mobile drawer)

---

## Notes

**Backend Tasks (1-3)**: Assigned to backend-developer

- TASK 1: DTOs (foundation)
- TASK 2: ResearchChatController endpoints
- TASK 3: DevBrandController endpoints

**Frontend Tasks (4-10)**: Assigned to frontend-developer

- TASK 4-5: Type safety and API service layer
- TASK 6-8: Sidebar component (TypeScript, template, styles)
- TASK 9-10: Integration into existing pages

**Sequential Dependencies**:

- TASK 2 & 3 depend on TASK 1 (need DTOs)
- TASK 5 depends on TASK 4 (need models)
- TASK 6 depends on TASK 5 (need API service)
- TASK 7 depends on TASK 6 (need component logic)
- TASK 8 depends on TASK 7 (need template)
- TASK 9 & 10 depend on TASK 8 (need complete sidebar)

**Parallel Execution Possible**:

- TASK 2 & 3 can be done in parallel (both use same DTOs)
- TASK 9 & 10 can be done in parallel (both integrate same sidebar)
