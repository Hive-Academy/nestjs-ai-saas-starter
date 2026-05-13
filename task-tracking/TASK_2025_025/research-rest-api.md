# REST API Endpoint Discovery (Requirement A1)

**Research Date**: 2025-10-23
**Backend Service**: apps/dev-brand-api
**Source File**: apps/dev-brand-api/src/app/controllers/devbrand.controller.ts

---

## HTTP Endpoint

### POST /devbrand/execute

**File Reference**: `apps/dev-brand-api/src/app/controllers/devbrand.controller.ts:143-210`

**Method**: POST
**Path**: `/devbrand/execute`
**Status Code**: 201 (Created)
**Error Status**: 400 (Bad Request)

**Description**: Starts the DevBrand personal branding workflow for a GitHub user. Returns executionId immediately for WebSocket subscription.

---

## Request DTO: ExecuteDevBrandDto

**File Reference**: `apps/dev-brand-api/src/app/controllers/devbrand.controller.ts:50-66`

### Structure

```typescript
export class ExecuteDevBrandDto {
  @IsString()
  githubUsername!: string;

  @IsString()
  @IsOptional()
  userId?: string;
}
```

### Fields

| Field            | Type   | Required | Validation                     | Example     | Description                 |
| ---------------- | ------ | -------- | ------------------------------ | ----------- | --------------------------- |
| `githubUsername` | string | Yes      | `@IsString()`                  | "johnsmith" | GitHub username to analyze  |
| `userId`         | string | No       | `@IsString()`, `@IsOptional()` | "user-123"  | User ID for personalization |

### Validation Rules

- **githubUsername**: REQUIRED - Must be a non-empty string (validated in controller line 173)
- **userId**: OPTIONAL - Defaults to "anonymous" if not provided (line 178)

---

## Response DTO: ExecuteDevBrandResponseDto

**File Reference**: `apps/dev-brand-api/src/app/controllers/devbrand.controller.ts:68-112`

### Structure

```typescript
export class ExecuteDevBrandResponseDto {
  executionId!: string;
  status!: 'started';
  message!: string;
  websocketUrl!: string;
  websocketInstructions!: {
    connect: string;
    subscribe: string;
    events: string[];
  };
}
```

### Fields

| Field                   | Type      | Example                            | Description                                    |
| ----------------------- | --------- | ---------------------------------- | ---------------------------------------------- |
| `executionId`           | string    | "devbrand-1697456789"              | Unique execution ID for this workflow          |
| `status`                | 'started' | "started"                          | Workflow status (always 'started' for success) |
| `message`               | string    | "Workflow started successfully..." | Human-readable message                         |
| `websocketUrl`          | string    | "ws://localhost:8080/streaming"    | WebSocket URL for real-time updates            |
| `websocketInstructions` | object    | {...}                              | WebSocket integration instructions             |

### WebSocket Instructions Object

```typescript
{
  connect: 'io("ws://localhost:8080/streaming", { transports: ["websocket", "polling"] })',
  subscribe: 'socket.emit("subscribe_execution", { executionId: "${executionId}" })',
  events: [
    'stream_update - Workflow state changes (agent started, completed, routing)',
    'token_update - Real-time LLM token streaming (character-by-character)',
    'interruption_request - HITL approval requests from agents',
    'interruption_resolved - HITL responses processed, workflow continuing',
    'error - Workflow errors and failures'
  ]
}
```

---

## Execution ID Format

**File Reference**: `apps/dev-brand-api/src/app/controllers/devbrand.controller.ts:177`

### Format

```typescript
const executionId = `devbrand-${Date.now()}`;
```

**Pattern**: `devbrand-{timestamp}`
**Example**: `devbrand-1697456789`
**Generation Method**: JavaScript `Date.now()` (milliseconds since epoch)

---

## Error Responses

### 400 Bad Request

**Condition**: Missing `githubUsername` field
**File Reference**: Line 173-175

```typescript
if (!dto.githubUsername) {
  throw new BadRequestException('githubUsername is required');
}
```

**Error Format**:

```json
{
  "statusCode": 400,
  "message": "githubUsername is required"
}
```

---

## Background Execution Pattern

**File Reference**: `apps/dev-brand-api/src/app/controllers/devbrand.controller.ts:188-263`

### Flow

1. Controller returns immediately with `executionId`
2. `startWorkflowInBackground()` executes asynchronously (line 188)
3. Workflow events auto-broadcast via EventEmitter2 infrastructure
4. Clients subscribe via WebSocket to receive real-time updates

### Event Emission Chain

**File Reference**: Controller comments, lines 186-187

```
WorkflowStreamService → EventEmitter2 → WebSocketBridgeService → StreamingWebSocketService
```

**Event Patterns** (line 243-247):

- `workflow.stream.${executionId}`
- `workflow.token.${executionId}`
- `workflow.progress.${executionId}`
- `workflow.milestone.${executionId}`

---

## Integration Instructions for POC

### 1. Making the HTTP Request

```typescript
const response = await fetch('http://localhost:3000/devbrand/execute', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    githubUsername: 'octocat',
    userId: 'user-123',
  }),
});

const data: ExecuteDevBrandResponseDto = await response.json();
```

### 2. Extracting Execution ID

```typescript
const { executionId, websocketUrl } = data;
// executionId example: "devbrand-1697456789"
// websocketUrl: "ws://localhost:8080/streaming"
```

### 3. WebSocket Subscription (Next Step)

```typescript
import { io } from 'socket.io-client';

const socket = io(websocketUrl, {
  transports: ['websocket', 'polling'],
});

socket.emit('subscribe_execution', { executionId });
```

---

## Additional DTOs (From Separate Files)

### ExecuteDevBrandRequestDto

**File Reference**: `apps/dev-brand-api/src/app/dto/devbrand/execute-devbrand-request.dto.ts`

**Extended Version with Additional Options**:

```typescript
export class ExecuteDevBrandRequestDto {
  githubUsername!: string;
  userId?: string;
  sessionId?: string;
  options?: {
    timeframe?: 'week' | 'month' | 'quarter';
    enableStreamingToWebSocket?: boolean;
  };
}
```

### ExecuteDevBrandResponseDto (Alternative Version)

**File Reference**: `apps/dev-brand-api/src/app/dto/devbrand/execute-devbrand-response.dto.ts`

**Alternative Response Structure** (status tracking):

```typescript
export class ExecuteDevBrandResponseDto {
  sessionId!: string;
  status!: 'queued' | 'running' | 'completed' | 'failed' | 'interrupted';
  results?: {
    achievements: Array<{
      id: string;
      description: string;
      technologies: string[];
      impact: string;
    }>;
    strategy: { positioning: string; targetAudience: string; uniqueValue: string };
    content: { linkedin: string; devto: string };
    confidence: number;
  };
  currentStage?: {
    agentId: string;
    agentName: string;
    progress: number;
  };
  error?: {
    code: string;
    message: string;
    agentId?: string;
  };
}
```

---

## Workflow Details (Referenced in Controller)

**File Reference**: Controller comments, lines 123-140

### Workflow Includes

1. **GitHubCodeAnalyzerAgent** - Analyzes repositories, extracts achievements
2. **PersonalBrandStrategistAgent** - Develops brand strategy and positioning
3. **ContentCreatorAgent** - Generates platform-specific content (LinkedIn, Dev.to)

### Streaming Features

- `@StreamToken` and `@StreamProgress` decorators enabled on all agents
- HITL interruptions configured via `@MultiAgent` decorator metadata
- Real-time token streaming (character-by-character)
- Progress updates
- Workflow state changes
- Error broadcasting

---

## Summary for POC Implementation

### Required Actions

1. POST to `/devbrand/execute` with `{ githubUsername, userId? }`
2. Receive `executionId` in response
3. Use `executionId` to subscribe to WebSocket events
4. Handle real-time event stream (covered in research-websocket.md)

### Key Insights

- **Non-blocking**: Controller returns immediately (201 status)
- **Execution ID**: Unique identifier for WebSocket subscription
- **Auto-streaming**: Events automatically broadcast via existing infrastructure
- **No polling**: WebSocket provides real-time updates
- **Error handling**: 400 for missing required fields
- **Background processing**: Workflow executes asynchronously

### Integration Points

- HTTP endpoint: `POST /devbrand/execute`
- WebSocket endpoint: `ws://localhost:8080/streaming`
- Subscription event: `subscribe_execution` with `{ executionId }`
- Event types: `stream_update`, `token_update`, `interruption_request`, `interruption_resolved`, `error`
