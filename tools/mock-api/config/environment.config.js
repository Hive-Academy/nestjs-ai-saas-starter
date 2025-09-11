/**
 * Environment Configuration for Mock API Server
 * Provides configurable settings for different deployment scenarios
 */

const config = {
  // Development configuration
  development: {
    port: 3001,
    corsOrigin: [
      'http://localhost:4200', // Angular dev server
      'http://localhost:3000', // Alternative dev port
      'http://127.0.0.1:4200'
    ],
    simulation: {
      autoStart: true,
      agentCount: 8,
      activityLevel: 'high', // low, medium, high
      enableToolSimulation: true,
      enableMemorySimulation: true,
      enableCoordinationSimulation: true
    },
    logging: {
      level: 'debug',
      enableRequestLogging: true,
      enableWebSocketLogging: true
    },
    database: {
      // Mock database simulation settings
      chromaDBDelay: { min: 100, max: 500 },
      neo4jDelay: { min: 50, max: 200 },
      errorRate: 0.05
    }
  },

  // Testing configuration
  testing: {
    port: 3002,
    corsOrigin: [
      'http://localhost:4200',
      'http://localhost:3000'
    ],
    simulation: {
      autoStart: false,
      agentCount: 4,
      activityLevel: 'medium',
      enableToolSimulation: true,
      enableMemorySimulation: true,
      enableCoordinationSimulation: false
    },
    logging: {
      level: 'info',
      enableRequestLogging: false,
      enableWebSocketLogging: false
    },
    database: {
      chromaDBDelay: { min: 10, max: 50 },
      neo4jDelay: { min: 5, max: 20 },
      errorRate: 0.01
    }
  },

  // Production mock configuration (for demo environments)
  production: {
    port: process.env.MOCK_API_PORT || 3001,
    corsOrigin: process.env.MOCK_API_CORS_ORIGIN ? 
      process.env.MOCK_API_CORS_ORIGIN.split(',') : 
      ['https://demo.example.com'],
    simulation: {
      autoStart: true,
      agentCount: 6,
      activityLevel: 'medium',
      enableToolSimulation: true,
      enableMemorySimulation: true,
      enableCoordinationSimulation: true
    },
    logging: {
      level: 'warn',
      enableRequestLogging: false,
      enableWebSocketLogging: false
    },
    database: {
      chromaDBDelay: { min: 150, max: 300 },
      neo4jDelay: { min: 75, max: 150 },
      errorRate: 0.03
    }
  }
};

/**
 * Get configuration for current environment
 */
function getConfig(environment = process.env.NODE_ENV || 'development') {
  const envConfig = config[environment] || config.development;
  
  return {
    ...envConfig,
    environment,
    timestamp: new Date().toISOString()
  };
}

/**
 * Validate configuration
 */
function validateConfig(config) {
  const required = ['port', 'corsOrigin', 'simulation'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
  
  return true;
}

/**
 * Activity level settings
 */
const activityLevels = {
  low: {
    toolExecutionInterval: { min: 15000, max: 30000 },
    memoryAccessInterval: { min: 20000, max: 40000 },
    coordinationInterval: { min: 45000, max: 90000 },
    stateTransitionSpeed: 1.0
  },
  medium: {
    toolExecutionInterval: { min: 8000, max: 20000 },
    memoryAccessInterval: { min: 10000, max: 25000 },
    coordinationInterval: { min: 25000, max: 50000 },
    stateTransitionSpeed: 1.2
  },
  high: {
    toolExecutionInterval: { min: 5000, max: 12000 },
    memoryAccessInterval: { min: 6000, max: 15000 },
    coordinationInterval: { min: 15000, max: 30000 },
    stateTransitionSpeed: 1.5
  }
};

/**
 * Get activity level configuration
 */
function getActivityLevel(level = 'medium') {
  return activityLevels[level] || activityLevels.medium;
}

module.exports = {
  getConfig,
  validateConfig,
  getActivityLevel,
  config
};