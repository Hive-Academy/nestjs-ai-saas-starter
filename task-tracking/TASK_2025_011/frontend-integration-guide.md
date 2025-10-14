# DevBrand Workflow Frontend Integration Guide

## Overview

The DevBrand workflow API exposes a **simplified REST + WebSocket architecture** that leverages the existing streaming infrastructure. No polling, no SSE endpoints - just a single REST endpoint to start the workflow and real-time WebSocket events for all updates.

## Architecture Flow

```
Client (Frontend)
  ↓ POST /devbrand/execute
Backend DevBrandController
  ↓ Returns executionId immediately
  ↓ Starts workflow in background
DevBrandSupervisorWorkflow.executeWithStreaming()
  ↓ (yields events via AsyncIterableIterator)
WorkflowStreamService.emit(`workflow.stream.${executionId}`, event)
  ↓ (EventEmitter2)
WebSocketBridgeService.@OnEvent('workflow.stream.*')
  ↓ (calls broadcastToExecution)
StreamingWebSocketService.broadcastStreamUpdate(update)
  ↓ (Socket.io)
Client (Frontend) - receives events in real-time
```

## REST API Endpoint

### POST /devbrand/execute

**Description**: Start the DevBrand personal branding workflow for a GitHub user.

**Request**:

```typescript
interface ExecuteDevBrandDto {
  githubUsername: string; // GitHub username to analyze
  userId?: string; // Optional user ID for personalization
}
```

**Response** (201 Created):

```typescript
interface ExecuteDevBrandResponseDto {
  executionId: string; // Unique execution ID (e.g., "devbrand-1697456789")
  status: 'started';
  message: string; // Human-readable message
  websocketUrl: string; // WebSocket URL (ws://localhost:8080/streaming)
  websocketInstructions: {
    connect: string; // Connection code
    subscribe: string; // Subscription code
    events: string[]; // Event types list
  };
}
```

**Example**:

```bash
curl -X POST http://localhost:3000/devbrand/execute \
  -H "Content-Type: application/json" \
  -d '{"githubUsername": "johnsmith", "userId": "user-123"}'
```

**Response**:

```json
{
  "executionId": "devbrand-1697456789",
  "status": "started",
  "message": "Workflow started successfully. Connect to WebSocket to receive real-time updates.",
  "websocketUrl": "ws://localhost:8080/streaming",
  "websocketInstructions": {
    "connect": "io(\"ws://localhost:8080/streaming\", { transports: [\"websocket\", \"polling\"] })",
    "subscribe": "socket.emit(\"subscribe_execution\", { executionId: \"devbrand-1697456789\" })",
    "events": ["stream_update - Workflow state changes (agent started, completed, routing)", "token_update - Real-time LLM token streaming (character-by-character)", "interruption_request - HITL approval requests from agents", "interruption_resolved - HITL responses processed, workflow continuing", "error - Workflow errors and failures"]
  }
}
```

## WebSocket Integration

### Connection Setup

**WebSocket Server**: `ws://localhost:8080/streaming` (Socket.io)

**Client Libraries**:

- **Browser**: `socket.io-client` (npm package)
- **Node.js**: `socket.io-client` (npm package)
- **React Native**: `socket.io-client` (npm package)

### JavaScript/TypeScript Example

```typescript
import { io, Socket } from 'socket.io-client';

// 1. Start workflow via REST API
const response = await fetch('http://localhost:3000/devbrand/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    githubUsername: 'johnsmith',
    userId: 'user-123',
  }),
});

const { executionId, websocketUrl } = await response.json();

// 2. Connect to WebSocket server
const socket: Socket = io(websocketUrl, {
  transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// 3. Subscribe to this specific execution
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  socket.emit('subscribe_execution', { executionId });
});

// 4. Listen for workflow events
socket.on('stream_update', (event) => {
  console.log('📊 Workflow state change:', event.data);
  // event.data contains: { update: StreamUpdate }
  // StreamUpdate has: { type, data, metadata: { executionId, nodeId, timestamp } }
});

// 5. Listen for real-time LLM token streaming
socket.on('token_update', (event) => {
  console.log('💬 Token:', event.data.token);
  // event.data contains: { token: string, executionId?: string, nodeId?: string }
  // Append tokens to UI for real-time text streaming effect
});

// 6. Listen for HITL (Human-in-the-Loop) interruptions
socket.on('interruption_request', (event) => {
  console.log('🤔 HITL approval required:', event.data);
  // Display approval UI to user
  // event.data contains: { interruptionId, agentId, reason, payload }
});

socket.on('interruption_resolved', (event) => {
  console.log('✅ HITL approved, workflow continuing:', event.data);
});

// 7. Listen for errors
socket.on('error', (event) => {
  console.error('❌ Workflow error:', event.data);
});

// 8. Handle disconnection
socket.on('disconnect', (reason) => {
  console.warn('⚠️ Disconnected from WebSocket:', reason);
  if (reason === 'io server disconnect') {
    // Server disconnected, manual reconnection needed
    socket.connect();
  }
});
```

### React Hook Example

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface WorkflowProgress {
  currentAgent: string;
  step: number;
  totalSteps: number;
  status: string;
  tokens: string[];
}

export function useDevBrandWorkflow(githubUsername: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<WorkflowProgress>({
    currentAgent: '',
    step: 0,
    totalSteps: 3,
    status: 'idle',
    tokens: [],
  });
  const [error, setError] = useState<string | null>(null);

  // Start workflow
  const startWorkflow = async () => {
    try {
      const response = await fetch('http://localhost:3000/devbrand/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubUsername }),
      });

      const data = await response.json();
      setExecutionId(data.executionId);

      // Connect to WebSocket
      const newSocket = io(data.websocketUrl, {
        transports: ['websocket', 'polling'],
      });

      newSocket.on('connect', () => {
        newSocket.emit('subscribe_execution', { executionId: data.executionId });
      });

      newSocket.on('stream_update', (event) => {
        const update = event.data.update;
        setProgress((prev) => ({
          ...prev,
          currentAgent: update.metadata?.nodeId || prev.currentAgent,
          status: 'processing',
        }));
      });

      newSocket.on('token_update', (event) => {
        setProgress((prev) => ({
          ...prev,
          tokens: [...prev.tokens, event.data.token],
        }));
      });

      newSocket.on('error', (event) => {
        setError(event.data.message || 'Workflow error');
        setProgress((prev) => ({ ...prev, status: 'error' }));
      });

      setSocket(newSocket);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start workflow');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  return {
    startWorkflow,
    progress,
    error,
    isConnected: socket?.connected || false,
    executionId,
  };
}
```

### Vue Composable Example

```typescript
import { ref, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';

export function useDevBrandWorkflow() {
  const socket = ref<Socket | null>(null);
  const executionId = ref<string | null>(null);
  const currentAgent = ref('');
  const tokens = ref<string[]>([]);
  const status = ref<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const error = ref<string | null>(null);

  const startWorkflow = async (githubUsername: string) => {
    try {
      const response = await fetch('http://localhost:3000/devbrand/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubUsername }),
      });

      const data = await response.json();
      executionId.value = data.executionId;

      socket.value = io(data.websocketUrl, {
        transports: ['websocket', 'polling'],
      });

      socket.value.on('connect', () => {
        socket.value?.emit('subscribe_execution', { executionId: executionId.value });
      });

      socket.value.on('stream_update', (event) => {
        currentAgent.value = event.data.update.metadata?.nodeId || '';
        status.value = 'processing';
      });

      socket.value.on('token_update', (event) => {
        tokens.value.push(event.data.token);
      });

      socket.value.on('error', (event) => {
        error.value = event.data.message || 'Workflow error';
        status.value = 'error';
      });
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to start workflow';
      status.value = 'error';
    }
  };

  onUnmounted(() => {
    socket.value?.disconnect();
  });

  return {
    startWorkflow,
    executionId,
    currentAgent,
    tokens,
    status,
    error,
  };
}
```

## Event Types Reference

### 1. stream_update

**Description**: Workflow state changes (agent started, completed, routing decisions)

**Payload**:

```typescript
{
  type: 'stream_update',
  data: {
    update: {
      type: 'values' | 'updates' | 'messages' | 'events' | 'debug',
      data: any,  // Workflow-specific data
      metadata: {
        timestamp: Date,
        executionId: string,
        nodeId?: string,  // Current agent/node ID
        sequenceNumber?: number
      }
    }
  }
}
```

**Example**:

```json
{
  "type": "stream_update",
  "data": {
    "update": {
      "type": "events",
      "data": { "agentId": "github-analyzer", "status": "started" },
      "metadata": {
        "timestamp": "2025-01-15T10:30:00.000Z",
        "executionId": "devbrand-1697456789",
        "nodeId": "GitHubCodeAnalyzerAgent",
        "sequenceNumber": 1
      }
    }
  }
}
```

### 2. token_update

**Description**: Real-time LLM token streaming (character-by-character)

**Payload**:

```typescript
{
  type: 'token_update',
  data: {
    token: string,        // Single token or character
    executionId?: string,
    nodeId?: string       // Agent generating the token
  }
}
```

**Example**:

```json
{
  "type": "token_update",
  "data": {
    "token": "Based",
    "executionId": "devbrand-1697456789",
    "nodeId": "PersonalBrandStrategistAgent"
  }
}
```

### 3. interruption_request

**Description**: HITL (Human-in-the-Loop) approval request from an agent

**Payload**:

```typescript
{
  type: 'interruption_request',
  data: {
    interruptionId: string,
    executionId: string,
    agentId: string,
    reason: string,       // Why approval is needed
    payload: any,         // Data requiring approval
    confidenceScore?: number
  }
}
```

**Example**:

```json
{
  "type": "interruption_request",
  "data": {
    "interruptionId": "hitl-123",
    "executionId": "devbrand-1697456789",
    "agentId": "ContentCreatorAgent",
    "reason": "Low confidence in generated content",
    "payload": {
      "generatedContent": "...",
      "platforms": ["LinkedIn", "Dev.to"]
    },
    "confidenceScore": 0.6
  }
}
```

**Frontend Action**: Display approval UI to user, send approval via separate HITL API endpoint.

### 4. interruption_resolved

**Description**: HITL response processed, workflow continuing

**Payload**:

```typescript
{
  type: 'interruption_resolved',
  data: {
    interruptionId: string,
    executionId: string,
    resolution: 'approved' | 'rejected' | 'modified',
    modifiedData?: any
  }
}
```

### 5. error

**Description**: Workflow errors and failures

**Payload**:

```typescript
{
  type: 'error',
  data: {
    executionId: string,
    error: string,        // Error message
    stack?: string,       // Stack trace (dev mode only)
    nodeId?: string       // Agent where error occurred
  }
}
```

## UI/UX Recommendations

### 1. Progress Visualization

**Agent Pipeline**:

```
GitHubCodeAnalyzer → PersonalBrandStrategist → ContentCreator
    [✅ Completed]           [⏳ In Progress]          [⏸️ Pending]
```

**Token Streaming Display**:

- Use a typewriter effect for real-time token display
- Buffer tokens in batches of 5-10 for smoother animation
- Display tokens with a blinking cursor during generation

### 2. HITL Interruption UI

**Approval Modal**:

```
┌─────────────────────────────────────────────┐
│ 🤔 Human Approval Required                  │
│                                             │
│ Agent: ContentCreatorAgent                  │
│ Reason: Low confidence in generated content │
│ Confidence: 60%                             │
│                                             │
│ Generated Content:                          │
│ ┌─────────────────────────────────────────┐ │
│ │ [Preview of generated content]          │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [✅ Approve]  [✏️ Modify]  [❌ Reject]      │
└─────────────────────────────────────────────┘
```

### 3. Error Handling UI

**Error Toast**:

```
┌─────────────────────────────────────────────┐
│ ❌ Workflow Error                           │
│                                             │
│ The DevBrand workflow encountered an error  │
│ in the GitHubCodeAnalyzerAgent step.        │
│                                             │
│ [View Details]  [Retry]  [Cancel]           │
└─────────────────────────────────────────────┘
```

## Testing Tips

### 1. WebSocket Connection Testing

**Browser Console**:

```javascript
const socket = io('ws://localhost:8080/streaming', { transports: ['websocket'] });
socket.on('connect', () => console.log('✅ Connected'));
socket.emit('subscribe_execution', { executionId: 'devbrand-123' });
socket.on('stream_update', (e) => console.log('📊', e));
socket.on('token_update', (e) => console.log('💬', e.data.token));
```

### 2. REST API Testing with cURL

```bash
# Start workflow
curl -X POST http://localhost:3000/devbrand/execute \
  -H "Content-Type: application/json" \
  -d '{"githubUsername": "torvalds"}'
```

### 3. End-to-End Testing with Playwright

```typescript
import { test, expect } from '@playwright/test';
import { io } from 'socket.io-client';

test('DevBrand workflow real-time streaming', async ({ page }) => {
  // Start workflow via REST API
  const response = await page.request.post('http://localhost:3000/devbrand/execute', {
    data: { githubUsername: 'testuser' },
  });
  const { executionId, websocketUrl } = await response.json();

  // Connect to WebSocket
  const socket = io(websocketUrl);
  const events: any[] = [];

  socket.on('connect', () => {
    socket.emit('subscribe_execution', { executionId });
  });

  socket.on('stream_update', (event) => events.push(event));
  socket.on('token_update', (event) => events.push(event));

  // Wait for workflow completion
  await page.waitForTimeout(30000);

  // Assert events received
  expect(events.length).toBeGreaterThan(0);
  expect(events.some((e) => e.type === 'stream_update')).toBe(true);
});
```

## Production Configuration

### Environment Variables

```bash
# Backend (dev-brand-api)
WEBSOCKET_ENABLED=true
WEBSOCKET_PORT=8080
WEBSOCKET_GATEWAY_ENABLED=true
CORS_ORIGIN=https://yourdomain.com
MAX_WEBSOCKET_CONNECTIONS=1000
WEBSOCKET_CONNECTION_TIMEOUT=30000
WEBSOCKET_HEARTBEAT_INTERVAL=25000
WEBSOCKET_COMPRESSION=true
WEBSOCKET_AUTH_REQUIRED=false  # Set to true for production
WEBSOCKET_RATE_LIMIT_MAX=100
WEBSOCKET_RATE_LIMIT_WINDOW=60000
```

### CORS Configuration

For production, update `apps/dev-brand-api/src/app/config/streaming.config.ts`:

```typescript
export const getStreamingConfig = (): StreamingModuleOptions => ({
  gateway: {
    cors: {
      origin: process.env.CORS_ORIGIN || 'https://yourdomain.com',
      credentials: true,
      methods: ['GET', 'POST'],
    },
  },
});
```

### WebSocket Authentication (Optional)

If `WEBSOCKET_AUTH_REQUIRED=true`, clients must send JWT token:

```typescript
const socket = io(websocketUrl, {
  auth: {
    token: 'your-jwt-token',
  },
});
```

## Troubleshooting

### Issue 1: WebSocket Connection Refused

**Symptom**: `ERR_CONNECTION_REFUSED` when connecting to WebSocket

**Solution**:

1. Verify backend is running: `curl http://localhost:3000/health`
2. Check WebSocket port: `WEBSOCKET_PORT=8080` in `.env`
3. Verify firewall allows port 8080

### Issue 2: No Events Received

**Symptom**: Connected to WebSocket but no `stream_update` or `token_update` events

**Solution**:

1. Verify subscription: `socket.emit('subscribe_execution', { executionId })`
2. Check backend logs for workflow errors
3. Verify `executionId` matches the one from REST API response

### Issue 3: CORS Errors

**Symptom**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**:

1. Update `CORS_ORIGIN` in backend `.env`
2. Ensure `credentials: true` in streaming config
3. For local dev, use `CORS_ORIGIN=true` to allow all origins

### Issue 4: Token Streaming Too Slow

**Symptom**: Token updates arrive in large batches, not real-time

**Solution**:

1. Reduce `flushInterval` in streaming config (default: 50ms)
2. Check network latency between client and server
3. Enable WebSocket compression: `WEBSOCKET_COMPRESSION=true`

## Further Reading

- **Streaming Module Documentation**: `libs/langgraph-modules/streaming/CLAUDE.md`
- **Workflow Engine Documentation**: `libs/langgraph-modules/workflow-engine/CLAUDE.md`
- **HITL Module Documentation**: `libs/langgraph-modules/hitl/CLAUDE.md`
- **Socket.io Client API**: https://socket.io/docs/v4/client-api/
- **DevBrand Controller Source**: `apps/dev-brand-api/src/app/controllers/devbrand.controller.ts`
