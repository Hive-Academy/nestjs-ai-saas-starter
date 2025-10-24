# WebSocket Streaming Architecture (Requirement A2)

**Research Date**: 2025-10-23
**Backend Service**: apps/dev-brand-api
**Core Module**: @hive-academy/langgraph-streaming

---

## WebSocket Server Configuration

### StreamingWebSocketService

**File Reference**: `libs/langgraph-modules/streaming/src/lib/services/streaming-websocket.service.ts:1-552`

#### Server Details

| Property       | Value                               | Configuration Source                              |
| -------------- | ----------------------------------- | ------------------------------------------------- |
| **Protocol**   | Socket.io                           | Line 108: `new Server(this.httpServer, {...})`    |
| **Port**       | 8080 (configurable)                 | Line 121: `this.config.websocket?.port \|\| 8080` |
| **Endpoint**   | ws://localhost:8080/streaming       | Default namespace: '/streaming'                   |
| **Transports** | ['websocket', 'polling']            | Line 111                                          |
| **CORS**       | { origin: true, credentials: true } | Line 109                                          |

#### Configuration Interface

**File Reference**: `apps/dev-brand-api/src/app/config/streaming.config.ts:1-49`

```typescript
export const getStreamingConfig = (): StreamingModuleOptions => ({
  websocket: {
    enabled: process.env.WEBSOCKET_ENABLED !== 'false',
    port: parseInt(process.env.WEBSOCKET_PORT || '3000', 10),
  },
  gateway: {
    enabled: process.env.WEBSOCKET_GATEWAY_ENABLED !== 'false',
    cors: {
      origin: process.env.CORS_ORIGIN || true,
      credentials: true,
    },
    websocket: {
      maxConnections: parseInt(process.env.MAX_WEBSOCKET_CONNECTIONS || '1000', 10),
      connectionTimeout: parseInt(process.env.WEBSOCKET_CONNECTION_TIMEOUT || '30000', 10),
      heartbeatInterval: parseInt(process.env.WEBSOCKET_HEARTBEAT_INTERVAL || '25000', 10),
      compression: process.env.WEBSOCKET_COMPRESSION !== 'false',
    },
    auth: {
      required: process.env.WEBSOCKET_AUTH_REQUIRED === 'true',
      jwtSecret: process.env.JWT_SECRET,
    },
    rateLimit: {
      max: parseInt(process.env.WEBSOCKET_RATE_LIMIT_MAX || '100', 10),
      windowMs: parseInt(process.env.WEBSOCKET_RATE_LIMIT_WINDOW || '60000', 10),
    },
  },
});
```

---

## Connection Lifecycle

### 1. Connection

**File Reference**: `streaming-websocket.service.ts:167-245`

#### Client Connection Event

```typescript
this.server.on('connection', (socket: Socket) => {
  this.handleConnection(socket);
});
```

#### Connection Metadata

**File Reference**: Lines 196-211

```typescript
interface WebSocketConnection {
  id: string; // Generated UUID
  socket: Socket; // Socket.io socket instance
  metadata: {
    ip: string; // socket.handshake.address
    userAgent?: string; // socket.handshake.headers['user-agent']
    connectedAt: Date;
    lastActivity: Date;
    userId?: string;
  };
  subscriptions: {
    executionIds: Set<string>; // Execution subscriptions
    eventTypes: Set<string>; // Event type filters
    rooms: Set<string>; // Room memberships
  };
  state: 'connecting' | 'connected' | 'disconnected';
}
```

#### Connection Response

**File Reference**: Lines 232-236

```typescript
socket.emit('connection_status', {
  connectionId,
  status: 'connected',
  serverTime: new Date(),
});
```

---

### 2. Subscription to Execution Stream

**File Reference**: `streaming-websocket.service.ts:282-322`

#### Client Message

```typescript
socket.emit('subscribe_execution', {
  executionId: 'devbrand-1697456789',
});
```

#### Server Handler

```typescript
private async handleSubscribeExecution(socket: Socket, payload: any): Promise<void> {
  const connection = this.getConnection(socket);

  if (!payload.executionId) {
    throw new Error('Execution ID is required');
  }

  // Add to subscriptions
  connection.subscriptions.executionIds.add(payload.executionId);
  connection.metadata.lastActivity = new Date();

  // Link with bridge service
  if (this.bridgeService) {
    this.bridgeService.linkClientToExecution(connection.id, payload.executionId);
  }

  // Send confirmation
  socket.emit('subscription_confirmed', {
    type: 'execution',
    executionId: payload.executionId,
    timestamp: new Date(),
  });
}
```

#### Subscription Confirmation

```typescript
socket.on('subscription_confirmed', (data) => {
  // data.type === 'execution'
  // data.executionId === 'devbrand-1697456789'
  // data.timestamp === new Date()
});
```

---

### 3. Disconnect

**File Reference**: `streaming-websocket.service.ts:249-277`

#### Server Handler

```typescript
private async handleDisconnect(socket: Socket): Promise<void> {
  const connectionId = this.socketToConnection.get(socket.id);
  const connection = this.connections.get(connectionId);

  // Update connection state
  connection.state = 'disconnected';

  // Unregister from bridge service
  if (this.bridgeService) {
    this.bridgeService.unregisterClient(connectionId);
  }

  // Remove connection mappings
  this.connections.delete(connectionId);
  this.socketToConnection.delete(socket.id);

  // Update statistics
  this.stats.activeConnections--;
}
```

---

## WebSocketBridgeService Integration

**File Reference**: `libs/langgraph-modules/streaming/src/lib/services/websocket-bridge.service.ts:1-966`

### Architecture Role

**Purpose**: Routes workflow events from EventEmitter2 to WebSocket clients

#### Event Flow

```
WorkflowStreamService
  ↓ (emits via EventEmitter2)
EventEmitter2
  ↓ (@OnEvent decorators)
WebSocketBridgeService
  ↓ (broadcasts)
StreamingWebSocketService
  ↓ (emits to clients)
WebSocket Clients
```

### Event Routing Handlers

**File Reference**: Lines 456-616

#### 1. Stream Processed Events

```typescript
@OnEvent('stream.processed')
handleStreamProcessed(data: any): void {
  const { executionId } = data;
  const nodeId = data.nodeId || 'stream-processed';

  const update: StreamUpdate = {
    type: StreamEventType.EVENTS,
    data: data.data,
    metadata: {
      timestamp: data.timestamp || new Date(),
      sequenceNumber: this.getNodeSequence(executionId, nodeId),
      executionId,
      nodeId,
      ...nodeIdParts,
    },
  };

  this.broadcastToExecution(executionId, update);
}
```

#### 2. Progress Events

```typescript
@OnEvent('client.progress')
handleClientProgress(data: any): void {
  const { executionId, progress, message } = data;
  const nodeId = data.nodeId || 'client-progress';

  const update: StreamUpdate = {
    type: StreamEventType.PROGRESS,
    data: { progress, message },
    metadata: {
      timestamp: new Date(),
      sequenceNumber: this.getNodeSequence(executionId, nodeId),
      executionId,
      nodeId,
    },
  };

  this.broadcastToExecution(executionId, update);
}
```

#### 3. Milestone Events

```typescript
@OnEvent('client.milestone')
handleClientMilestone(data: any): void {
  const { executionId, milestone, timestamp } = data;
  const nodeId = data.nodeId || 'client-milestone';

  const update: StreamUpdate = {
    type: StreamEventType.MILESTONE,
    data: { milestone },
    metadata: {
      timestamp: timestamp || new Date(),
      sequenceNumber: this.getNodeSequence(executionId, nodeId),
      executionId,
      nodeId,
    },
  };

  this.broadcastToExecution(executionId, update);
}
```

#### 4. Token Aggregation

```typescript
@OnEvent('tokens.aggregated')
handleAggregatedTokens(data: any): void {
  const { executionId, tokens, totalCount } = data;
  const nodeId = data.nodeId || 'tokens-aggregated';

  const update: StreamUpdate = {
    type: StreamEventType.TOKEN,
    data: {
      tokens,
      totalCount,
      aggregated: true,
    },
    metadata: {
      timestamp: new Date(),
      sequenceNumber: this.getNodeSequence(executionId, nodeId),
      executionId,
      nodeId,
    },
  };

  this.broadcastToExecution(executionId, update);
}
```

#### 5. Workflow Stream Events

```typescript
@OnEvent('workflow.stream.*')
handleWorkflowStreamEvent(data: any, event: string): void {
  // Extract execution ID from event name
  const parts = event.split('.');
  const executionId = parts[parts.length - 1];

  const nodeId = data.nodeId || 'workflow-stream';

  const update: StreamUpdate = {
    type: StreamEventType.EVENTS,
    data,
    metadata: {
      timestamp: new Date(),
      sequenceNumber: this.getNodeSequence(executionId, nodeId),
      executionId,
      nodeId,
      event,
    },
  };

  this.broadcastToExecution(executionId, update);
}
```

### Sequence Number Management

**File Reference**: Lines 67-80

```typescript
// Hierarchical sequence counters scoped per execution + node ID
private readonly sequenceCounters = new Map<string, number>();

private getNodeSequence(executionId: string, nodeId: string): number {
  const counterKey = `${executionId}:${nodeId}`;

  if (!this.sequenceCounters.has(counterKey)) {
    this.sequenceCounters.set(counterKey, 0);
  }

  const currentSequence = this.sequenceCounters.get(counterKey)!;
  this.sequenceCounters.set(counterKey, currentSequence + 1);

  return currentSequence;
}
```

**Key Insight**: Sequence numbers are per-node, not global. Each `executionId:nodeId` pair has its own counter.

---

## Client Message Handlers

**File Reference**: `streaming-websocket.service.ts:164-186`

### Message Types

| Message               | Handler                    | Description                   |
| --------------------- | -------------------------- | ----------------------------- |
| `subscribe_execution` | `handleSubscribeExecution` | Subscribe to execution stream |
| `ping`                | Inline handler             | Heartbeat check               |
| `get_status`          | `handleGetStatus`          | Get connection status         |
| `interrupt_agent`     | `handleInterruptAgent`     | User interruption request     |
| `inject_input`        | `handleInjectInput`        | User input injection          |
| `disconnect`          | `handleDisconnect`         | Client disconnection          |

### Status Request

**File Reference**: Lines 327-345

```typescript
socket.emit('get_status');

// Response
socket.on('status_response', (data) => {
  // data.connectionId
  // data.status === 'connected'
  // data.serverTime
  // data.subscriptions (count)
  // data.uptime (milliseconds)
});
```

### Heartbeat (Ping/Pong)

**File Reference**: Line 174

```typescript
socket.emit('ping');

socket.on('pong', (data) => {
  // data.timestamp === new Date()
});
```

---

## Broadcasting to Clients

**File Reference**: `streaming-websocket.service.ts:428-457`

### Stream Update Broadcast

```typescript
broadcastStreamUpdate(update: StreamUpdate): void {
  const executionId = update.metadata?.executionId;

  // Find connections subscribed to this execution
  const targetConnections = Array.from(this.connections.values()).filter(
    (connection) => connection.subscriptions.executionIds.has(executionId)
  );

  // Broadcast to target connections
  targetConnections.forEach((connection) => {
    connection.socket.emit('stream_update', {
      type: 'stream_update',
      data: { update },
      timestamp: new Date(),
    });
    connection.metadata.lastActivity = new Date();
    this.stats.messagesSent++;
  });
}
```

### Token Update Emit

**File Reference**: Lines 462-480

```typescript
emitTokenUpdate(token: string, executionId?: string, nodeId?: string): void {
  const message = {
    type: 'token_update',
    data: { token, executionId, nodeId },
    timestamp: new Date(),
  };

  // Emit to all connected clients
  if (this.server) {
    this.server.emit('token_update', message);
    this.stats.messagesSent += this.connections.size;
  }
}
```

---

## Room-Based Streaming

**File Reference**: `websocket-bridge.service.ts:337-432`

### Join Room

```typescript
joinRoom(clientId: string, roomId: string, config?: {
  requireAuth?: boolean;
  metadata?: Record<string, unknown>;
}): void {
  const client = this.clients.get(clientId);

  // Create room if it doesn't exist
  if (!this.rooms.has(roomId)) {
    this.rooms.set(roomId, {
      id: roomId,
      clients: new Set(),
      config: {
        requireAuth: config?.requireAuth || false,
      },
      metadata: config?.metadata || {},
      createdAt: new Date(),
      lastActivity: new Date(),
    });
  }

  const room = this.rooms.get(roomId)!;

  // Add client to room
  client.rooms.add(roomId);
  room.clients.add(clientId);
  room.lastActivity = new Date();

  // Emit room join event
  this.eventEmitter.emit('websocket.room.join', {
    clientId,
    roomId,
    clientCount: room.clients.size,
  });
}
```

### Broadcast to Room

```typescript
broadcastToRoom(roomId: string, update: StreamUpdate): void {
  const room = this.rooms.get(roomId);
  if (!room) return;

  room.clients.forEach((clientId) => {
    this.sendToClient(clientId, update);
  });

  room.lastActivity = new Date();
}
```

---

## Error Handling

### Connection Errors

**File Reference**: Lines 241-244

```typescript
socket.emit('error', {
  message: error instanceof Error ? error.message : 'Unknown error',
});
```

### WebSocket Events

| Event                    | Trigger                 | Payload                                |
| ------------------------ | ----------------------- | -------------------------------------- |
| `error`                  | Any WebSocket error     | `{ message: string }`                  |
| `connection_status`      | Successful connection   | `{ connectionId, status, serverTime }` |
| `subscription_confirmed` | Successful subscription | `{ type, executionId, timestamp }`     |

---

## Statistics & Monitoring

**File Reference**: `streaming-websocket.service.ts:64-69, 485-487`

### Stats Object

```typescript
private stats = {
  activeConnections: 0,
  totalConnections: 0,
  messagesSent: 0,
  messagesReceived: 0,
};

getStats() {
  return { ...this.stats };
}
```

### Active Connections

```typescript
getActiveConnections(): WebSocketConnection[] {
  return Array.from(this.connections.values());
}
```

---

## Integration Pattern for POC

### 1. Connect to WebSocket

```typescript
import { io, Socket } from 'socket.io-client';

const socket: Socket = io('ws://localhost:8080/streaming', {
  transports: ['websocket', 'polling'],
});

// Wait for connection
socket.on('connect', () => {
  console.log('Connected to WebSocket');
});

// Handle connection status
socket.on('connection_status', (data) => {
  console.log('Connection ID:', data.connectionId);
  console.log('Status:', data.status);
  console.log('Server Time:', data.serverTime);
});
```

### 2. Subscribe to Execution

```typescript
const executionId = 'devbrand-1697456789'; // From REST API response

socket.emit('subscribe_execution', { executionId });

socket.on('subscription_confirmed', (data) => {
  console.log('Subscribed to:', data.executionId);
  console.log('Type:', data.type);
  console.log('Timestamp:', data.timestamp);
});
```

### 3. Listen for Events

```typescript
// Stream updates (workflow events)
socket.on('stream_update', (message) => {
  console.log('Stream Update:', message.data.update);
  // message.type === 'stream_update'
  // message.data.update.type === StreamEventType enum
  // message.data.update.metadata.executionId
  // message.data.update.metadata.sequenceNumber
});

// Token updates (LLM streaming)
socket.on('token_update', (message) => {
  console.log('Token:', message.data.token);
  // message.type === 'token_update'
  // message.data.token (single character or word)
  // message.data.executionId
  // message.data.nodeId
});

// Errors
socket.on('error', (data) => {
  console.error('WebSocket Error:', data.message);
});
```

### 4. Heartbeat (Optional)

```typescript
setInterval(() => {
  socket.emit('ping');
}, 25000); // Every 25 seconds

socket.on('pong', (data) => {
  console.log('Pong received at:', data.timestamp);
});
```

### 5. Cleanup on Disconnect

```typescript
socket.on('disconnect', () => {
  console.log('Disconnected from WebSocket');
});

// Manual disconnect
socket.disconnect();
```

---

## Key Insights for POC

### Event-Driven Architecture

- **No Manual Transformation**: Events automatically flow from workflow to WebSocket
- **EventEmitter2 Hub**: Central event bus coordinates all streaming
- **Decorator-Driven**: `@OnEvent` decorators handle routing

### Automatic Broadcasting

- **WorkflowStreamService** emits events via EventEmitter2
- **WebSocketBridgeService** listens via `@OnEvent` and transforms to StreamUpdate
- **StreamingWebSocketService** broadcasts to subscribed clients
- **No Manual Intervention**: Entire pipeline is automated

### Connection Management

- **UUID-based IDs**: Each connection gets unique identifier
- **Subscription Tracking**: Per-execution subscriptions
- **Automatic Cleanup**: Stale connections removed every 60 seconds
- **Statistics Tracking**: Connection counts, message counts

### Performance Features

- **Room-Based Broadcasting**: Efficient multi-client streaming
- **Sequence Numbers**: Per-node counters for ordering
- **Rate Limiting**: Configurable (100 messages/minute default)
- **Compression**: Optional WebSocket compression
- **Heartbeat**: 25-second interval prevents timeout

### Production Ready

- **CORS**: Configurable origin and credentials
- **Auth**: Optional JWT authentication
- **Max Connections**: Configurable limit (1000 default)
- **Connection Timeout**: 30 seconds default
- **Error Handling**: Graceful degradation

---

## Summary

### WebSocket Endpoint

- **URL**: ws://localhost:8080/streaming
- **Protocol**: Socket.io
- **Transports**: WebSocket, Polling
- **CORS**: Enabled with credentials

### Core Messages

1. **subscribe_execution** - Subscribe to workflow stream
2. **stream_update** - Workflow state changes
3. **token_update** - LLM token streaming
4. **error** - Error notifications

### Architecture

- **Automatic Event Flow**: EventEmitter2 → Bridge → WebSocket
- **Sequence Numbers**: Per-node counters
- **Room Support**: Multi-client broadcasting
- **Statistics**: Connection and message tracking

### POC Requirements

1. Socket.io client library
2. Execution ID from REST API
3. Event listeners for `stream_update`, `token_update`, `error`
4. Connection status handling
