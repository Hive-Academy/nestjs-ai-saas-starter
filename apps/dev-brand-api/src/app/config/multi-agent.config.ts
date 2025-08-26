/**
 * Multi-Agent Module Configuration for dev-brand-api
 * Enables coordination between multiple AI agents
 */
export function getMultiAgentConfig() {
  return {
    // Agent coordination settings
    coordination: {
      maxAgents: parseInt(process.env.MULTI_AGENT_MAX_AGENTS || '10'),
      communicationTimeout: parseInt(process.env.MULTI_AGENT_COMMUNICATION_TIMEOUT || '30000'),
      consensusThreshold: parseFloat(process.env.MULTI_AGENT_CONSENSUS_THRESHOLD || '0.7'),
    },
    
    // Network topology settings
    topology: {
      type: process.env.MULTI_AGENT_TOPOLOGY || 'mesh', // mesh, star, ring
      maxConnections: parseInt(process.env.MULTI_AGENT_MAX_CONNECTIONS || '5'),
      heartbeatInterval: parseInt(process.env.MULTI_AGENT_HEARTBEAT_INTERVAL || '5000'),
    },
    
    // Message routing settings
    messaging: {
      queueSize: parseInt(process.env.MULTI_AGENT_QUEUE_SIZE || '100'),
      retryAttempts: parseInt(process.env.MULTI_AGENT_RETRY_ATTEMPTS || '3'),
      compressionEnabled: process.env.MULTI_AGENT_COMPRESSION_ENABLED === 'true',
    },
    
    // Load balancing settings
    loadBalancing: {
      strategy: process.env.MULTI_AGENT_LOAD_BALANCING || 'round-robin', // round-robin, least-load, random
      healthCheckInterval: parseInt(process.env.MULTI_AGENT_HEALTH_CHECK_INTERVAL || '10000'),
      failoverEnabled: process.env.MULTI_AGENT_FAILOVER_ENABLED !== 'false',
    },
    
    // Development features for demo
    demo: {
      enableDashboard: process.env.NODE_ENV === 'development',
      logAgentCommunication: process.env.NODE_ENV === 'development',
      simulatedLatency: process.env.NODE_ENV === 'development' ? 100 : 0,
    },
  };
}