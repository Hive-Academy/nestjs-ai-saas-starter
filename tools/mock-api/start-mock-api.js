#!/usr/bin/env node

/**
 * Mock API Server Startup Script
 * Provides easy startup with different configurations
 */

const MockAPIServer = require('./server');
const { getConfig, validateConfig } = require('./config/environment.config');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--env':
    case '-e':
      options.environment = args[++i];
      break;
    case '--port':
    case '-p':
      options.port = parseInt(args[++i]);
      break;
    case '--scenario':
    case '-s':
      options.scenario = args[++i];
      break;
    case '--cors':
    case '-c':
      options.corsOrigin = args[++i].split(',');
      break;
    case '--help':
    case '-h':
      showHelp();
      process.exit(0);
      break;
    default:
      console.warn(`Unknown argument: ${args[i]}`);
  }
}

function showHelp() {
  console.log(`
Mock API Server - Agent Simulation for Frontend Development

Usage:
  node start-mock-api.js [options]

Options:
  -e, --env <environment>     Environment: development, testing, production (default: development)
  -p, --port <port>          Port number (default: 3000)
  -s, --scenario <scenario>  Scenario preset: default, high_activity, error_testing, etc.
  -c, --cors <origins>       CORS origins (comma-separated)
  -h, --help                 Show this help message

Examples:
  node start-mock-api.js                           # Start with default settings
  node start-mock-api.js --env testing --port 3002 # Testing environment on port 3002
  node start-mock-api.js --scenario high_activity  # High activity simulation
  node start-mock-api.js --cors "http://localhost:4200,http://localhost:3000"

Available Scenarios:
  - default: Standard operation with balanced activity
  - high_activity: Intensive activity for stress testing
  - error_testing: Higher error rates for error handling tests
  - minimal: Low activity for basic functionality testing
  - coordination_focus: Heavy multi-agent coordination workflows
  - memory_intensive: Heavy memory access patterns
  - creative_workflow: Creator-focused workflow
  - performance_test: Maximum load scenario

Environment Variables:
  NODE_ENV                 Environment mode
  MOCK_API_PORT           Port number
  MOCK_API_CORS_ORIGIN    CORS origins (comma-separated)
`);
}

async function startServer() {
  try {
    console.log('🚀 Starting Mock API Server...\n');

    // Get configuration
    const config = getConfig(options.environment);
    validateConfig(config);

    // Override with command line options
    if (options.port) config.port = options.port;
    if (options.corsOrigin) config.corsOrigin = options.corsOrigin;

    console.log(`📋 Configuration:`);
    console.log(`   Environment: ${config.environment}`);
    console.log(`   Port: ${config.port}`);
    console.log(`   CORS Origins: ${config.corsOrigin.join(', ')}`);
    console.log(`   Activity Level: ${config.simulation.activityLevel}`);
    console.log(`   Auto Start: ${config.simulation.autoStart}`);

    if (options.scenario) {
      console.log(`   Scenario: ${options.scenario}`);
    }

    console.log('');

    // Create and start server
    const server = new MockAPIServer({
      port: config.port,
      corsOrigin: config.corsOrigin,
      config,
    });

    // Setup graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n🔄 Received ${signal}, shutting down gracefully...`);
      try {
        await server.stop();
        console.log('✅ Server stopped successfully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

    // Start the server
    await server.start();

    console.log(`\n✅ Mock API Server is running!`);
    console.log(`\n📱 Quick Actions:`);
    console.log(`   Health Check: curl http://localhost:${config.port}/health`);
    console.log(
      `   Agent List: curl http://localhost:${config.port}/api/agents`
    );
    console.log(
      `   Simulation Status: curl http://localhost:${config.port}/api/simulation/status`
    );
    console.log(
      `   Stop Simulation: curl -X POST http://localhost:${config.port}/api/simulation/stop`
    );
    console.log(
      `   Start Simulation: curl -X POST http://localhost:${config.port}/api/simulation/start`
    );
    console.log(`\n🔌 WebSocket Connection:`);
    console.log(`   URL: ws://localhost:${config.port}`);
    console.log(`   Test with Angular app on http://localhost:4200`);
    console.log(`\n🛑 Press Ctrl+C to stop the server`);
  } catch (error) {
    console.error('❌ Failed to start Mock API Server:', error.message);
    if (error.stack && options.environment === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = { startServer, showHelp };
