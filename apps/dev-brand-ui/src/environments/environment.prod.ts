export const environment = {
  production: true,
  apiUrl: '/api',
  websocketUrl: 'wss://your-domain.com',

  // Feature flags for showcase capabilities
  enableShowcaseMode: true,
  enable3DVisualization: true,
  enableRealTimeStreaming: true,
  enableAdvancedMetrics: true,

  // Performance settings
  maxConcurrentAgents: 10,
  streamingUpdateInterval: 200,
  metricsUpdateInterval: 2000,

  // API timeouts
  defaultTimeout: 30000,
  streamingTimeout: 120000,

  // Debug settings
  enableDebugMode: false,
  logLevel: 'error',
};
