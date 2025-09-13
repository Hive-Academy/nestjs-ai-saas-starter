import type { StreamEventType, StreamUpdate } from './streaming.interface';

/**
 * Configuration options for the WebSocket gateway
 */
export interface WebSocketGatewayConfig {
  /** Enable/disable WebSocket gateway */
  enabled?: boolean;
  /** Port for WebSocket server (optional, defaults to HTTP server) */
  port?: number;
  /** CORS configuration for WebSocket connections */
  cors?: {
    origin?: string | string[] | boolean;
    credentials?: boolean;
    methods?: string[];
    allowedHeaders?: string[];
  };
  /** WebSocket-specific options */
  websocket?: {
    /** Maximum number of concurrent connections */
    maxConnections?: number;
    /** Connection timeout in milliseconds */
    connectionTimeout?: number;
    /** Heartbeat interval in milliseconds */
    heartbeatInterval?: number;
    /** Enable compression */
    compression?: boolean;
    /** Custom namespace for socket.io */
    namespace?: string;
  };
  /** Authentication configuration */
  auth?: {
    /** Enable authentication requirement */
    required?: boolean;
    /** JWT secret for token validation */
    jwtSecret?: string;
    /** Custom authentication handler */
    handler?: (socket: any, token: string) => Promise<boolean>;
  };
  /** Rate limiting configuration */
  rateLimit?: {
    /** Maximum requests per window */
    max?: number;
    /** Window duration in milliseconds */
    windowMs?: number;
    /** Skip rate limiting for specific connections */
    skip?: (socket: any) => boolean;
  };
}

/**
 * WebSocket client connection information
 */
export interface WebSocketConnection {
  /** Unique connection identifier */
  id: string;
  /** Socket.io socket instance */
  socket: any;
  /** Client metadata */
  metadata: {
    /** IP address of the client */
    ip?: string;
    /** User agent string */
    userAgent?: string;
    /** Authentication user ID */
    userId?: string;
    /** Connection timestamp */
    connectedAt: Date;
    /** Last activity timestamp */
    lastActivity: Date;
    /** Custom metadata */
    [key: string]: any;
  };
  /** Active subscriptions */
  subscriptions: {
    /** Subscribed execution IDs */
    executionIds: Set<string>;
    /** Subscribed event types */
    eventTypes: Set<StreamEventType>;
    /** Subscribed rooms */
    rooms: Set<string>;
  };
  /** Connection state */
  state: 'connecting' | 'connected' | 'disconnecting' | 'disconnected';
}

/**
 * WebSocket message types for client-server communication
 */
export enum WebSocketMessageType {
  // Client → Server messages
  SUBSCRIBE_EXECUTION = 'subscribe_execution',
  UNSUBSCRIBE_EXECUTION = 'unsubscribe_execution',
  SUBSCRIBE_EVENTS = 'subscribe_events',
  UNSUBSCRIBE_EVENTS = 'unsubscribe_events',
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  GET_STATUS = 'get_status',
  PING = 'ping',

  // Server → Client messages
  STREAM_UPDATE = 'stream_update',
  EXECUTION_STATUS = 'execution_status',
  CONNECTION_STATUS = 'connection_status',
  ERROR = 'error',
  PONG = 'pong',

  // Bidirectional
  AUTHENTICATION = 'authentication',
}

/**
 * Base message structure for WebSocket communication
 */
export interface WebSocketMessage<T = any> {
  /** Message type identifier */
  type: WebSocketMessageType;
  /** Unique message ID for tracking */
  id?: string;
  /** Message payload */
  data: T;
  /** Message metadata */
  metadata?: {
    /** Timestamp when message was created */
    timestamp: Date;
    /** Source of the message */
    source?: string;
    /** Priority level */
    priority?: 'low' | 'medium' | 'high';
    /** Retry count for failed messages */
    retryCount?: number;
  };
}

/**
 * Subscribe to execution message payload
 */
export interface SubscribeExecutionPayload {
  /** Execution ID to subscribe to */
  executionId: string;
  /** Specific event types to subscribe to (optional) */
  eventTypes?: StreamEventType[];
  /** Additional subscription options */
  options?: {
    /** Include historical events */
    includeHistory?: boolean;
    /** Buffer size for events */
    bufferSize?: number;
    /** Event filtering criteria */
    filter?: {
      nodeIds?: string[];
      agentTypes?: string[];
      minTimestamp?: Date;
      maxTimestamp?: Date;
    };
  };
}

/**
 * Subscribe to events message payload
 */
export interface SubscribeEventsPayload {
  /** Event types to subscribe to */
  eventTypes: StreamEventType[];
  /** Subscription scope */
  scope?: {
    /** Limit to specific execution IDs */
    executionIds?: string[];
    /** Limit to specific node IDs */
    nodeIds?: string[];
    /** Limit to specific agent types */
    agentTypes?: string[];
  };
}

/**
 * Join room message payload
 */
export interface JoinRoomPayload {
  /** Room ID to join */
  roomId: string;
  /** Room-specific options */
  options?: {
    /** Require authentication to join */
    requireAuth?: boolean;
    /** Custom room metadata */
    metadata?: Record<string, any>;
  };
}

/**
 * Stream update message payload (server → client)
 */
export interface StreamUpdatePayload {
  /** The streaming update */
  update: StreamUpdate;
  /** Delivery metadata */
  delivery?: {
    /** Delivery attempt number */
    attempt: number;
    /** Maximum delivery attempts */
    maxAttempts: number;
    /** Delivery guarantee level */
    guarantee: 'at-most-once' | 'at-least-once' | 'exactly-once';
  };
}

/**
 * Connection status message payload
 */
export interface ConnectionStatusPayload {
  /** Connection state */
  status: 'connected' | 'authenticated' | 'error' | 'disconnected';
  /** Connection information */
  connection?: {
    /** Connection ID */
    id: string;
    /** Server timestamp */
    serverTime: Date;
    /** Active subscriptions count */
    subscriptionsCount: number;
    /** Connection uptime in milliseconds */
    uptime: number;
  };
  /** Error information (if status is 'error') */
  error?: {
    /** Error code */
    code: string;
    /** Error message */
    message: string;
    /** Additional error details */
    details?: any;
  };
}

/**
 * Execution status message payload
 */
export interface ExecutionStatusPayload {
  /** Execution ID */
  executionId: string;
  /** Current execution status */
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  /** Status metadata */
  metadata?: {
    /** Execution start time */
    startTime?: Date;
    /** Execution end time */
    endTime?: Date;
    /** Current progress percentage */
    progress?: number;
    /** Active nodes */
    activeNodes?: string[];
    /** Error information (if failed) */
    error?: {
      message: string;
      stack?: string;
      nodeId?: string;
    };
  };
}

/**
 * Authentication message payload
 */
export interface AuthenticationPayload {
  /** Authentication token (JWT) */
  token?: string;
  /** API key */
  apiKey?: string;
  /** User credentials */
  credentials?: {
    username: string;
    password: string;
  };
  /** Additional authentication data */
  metadata?: {
    /** Client information */
    client?: string;
    /** Client version */
    version?: string;
    /** Request source */
    source?: string;
  };
}

/**
 * Error message payload
 */
export interface ErrorPayload {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Error category */
  category:
    | 'authentication'
    | 'authorization'
    | 'validation'
    | 'connection'
    | 'internal';
  /** Error details */
  details?: {
    /** Original message ID that caused error */
    messageId?: string;
    /** Field validation errors */
    validationErrors?: Array<{
      field: string;
      message: string;
      value?: any;
    }>;
    /** Stack trace (in development) */
    stack?: string;
    /** Error context */
    context?: Record<string, any>;
  };
  /** Suggested actions */
  actions?: Array<{
    /** Action type */
    type: 'retry' | 'reconnect' | 'authenticate' | 'contact_support';
    /** Action description */
    description: string;
    /** Action metadata */
    metadata?: Record<string, any>;
  }>;
}

/**
 * Gateway event listeners interface for integration with bridge service
 */
export interface WebSocketGatewayEvents {
  /** New client connected */
  'gateway.client.connected': (connection: WebSocketConnection) => void;
  /** Client disconnected */
  'gateway.client.disconnected': (
    connectionId: string,
    reason?: string
  ) => void;
  /** Client subscribed to execution */
  'gateway.subscription.execution': (
    connectionId: string,
    executionId: string
  ) => void;
  /** Client unsubscribed from execution */
  'gateway.unsubscription.execution': (
    connectionId: string,
    executionId: string
  ) => void;
  /** Client joined room */
  'gateway.room.joined': (connectionId: string, roomId: string) => void;
  /** Client left room */
  'gateway.room.left': (connectionId: string, roomId: string) => void;
  /** Gateway error occurred */
  'gateway.error': (error: Error, context?: Record<string, any>) => void;
  /** Message received from client */
  'gateway.message.received': (
    connectionId: string,
    message: WebSocketMessage
  ) => void;
  /** Message sent to client */
  'gateway.message.sent': (
    connectionId: string,
    message: WebSocketMessage
  ) => void;
}

/**
 * Gateway statistics for monitoring and debugging
 */
export interface WebSocketGatewayStats {
  /** Current connection count */
  activeConnections: number;
  /** Total connections since startup */
  totalConnections: number;
  /** Current subscription count */
  activeSubscriptions: number;
  /** Current room count */
  activeRooms: number;
  /** Message statistics */
  messages: {
    /** Messages received from clients */
    received: number;
    /** Messages sent to clients */
    sent: number;
    /** Failed message deliveries */
    failed: number;
    /** Messages per second (averaged) */
    rate: number;
  };
  /** Performance metrics */
  performance: {
    /** Average message processing time in ms */
    avgProcessingTime: number;
    /** Memory usage in bytes */
    memoryUsage: number;
    /** CPU usage percentage */
    cpuUsage: number;
  };
  /** Error statistics */
  errors: {
    /** Connection errors */
    connection: number;
    /** Authentication errors */
    authentication: number;
    /** Message processing errors */
    processing: number;
    /** Other errors */
    other: number;
  };
}
