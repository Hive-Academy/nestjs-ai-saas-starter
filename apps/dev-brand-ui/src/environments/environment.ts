export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  // Socket.io gateway URL (port 3000 to match API server)
  websocketUrl: 'http://localhost:3000',

  // Feature flags for showcase capabilities
  enableShowcaseMode: true,
  enable3DVisualization: true,
  enableRealTimeStreaming: true,
  enableAdvancedMetrics: true,

  // Enhanced streaming configuration
  streaming: {
    reconnectAttempts: 10,
    reconnectInterval: 3000,
    heartbeatInterval: 30000,
    maxConcurrentExecutions: 3,
    bufferSize: 100,
    enableCompression: true,
  },

  // Performance settings
  maxConcurrentAgents: 5,
  streamingUpdateInterval: 100,
  metricsUpdateInterval: 1000,

  // API timeouts
  defaultTimeout: 30000,
  streamingTimeout: 60000,

  // Debug settings
  enableDebugMode: true,
  logLevel: 'debug',

  // Gateway-specific settings
  gateway: {
    maxConnectionRetries: 10,
    connectionTimeout: 30000,
    enableAuthentication: false,
    defaultRooms: ['devbrand-streaming', 'showcase-demo'],
    enableRoomAutoJoin: true,
  },
};
