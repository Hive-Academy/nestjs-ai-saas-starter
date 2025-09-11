/**
 * Mock WebSocket API Server
 * Provides realistic agent simulation for frontend development
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const AgentBehaviorSimulator = require('./simulators/agent-behavior.simulator');

class MockAPIServer {
  constructor(options = {}) {
    this.port = options.port || 3001;
    this.corsOrigin = options.corsOrigin || [
      'http://localhost:4200',
      'http://localhost:3000',
    ];

    // Initialize Express app
    this.app = express();
    this.server = createServer(this.app);

    // Initialize Socket.IO
    this.io = new Server(this.server, {
      cors: {
        origin: this.corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // Initialize behavior simulator
    this.behaviorSimulator = new AgentBehaviorSimulator(this.io);

    // Connection tracking
    this.connectedClients = new Map();
    this.connectionCount = 0;

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocketHandlers();
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    this.app.use(
      cors({
        origin: this.corsOrigin,
        credentials: true,
      })
    );

    this.app.use(express.json());
    this.app.use(express.static('public'));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup REST API routes
   */
  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        simulation: this.behaviorSimulator.getSimulationStatus(),
      });
    });

    // Get all agents
    this.app.get('/api/agents', (req, res) => {
      res.json({
        agents: this.behaviorSimulator.getAllAgents(),
        count: this.behaviorSimulator.getAllAgents().length,
      });
    });

    // Get agent by ID
    this.app.get('/api/agents/:id', (req, res) => {
      const agent = this.behaviorSimulator.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      res.json(agent);
    });

    // Simulation controls
    this.app.post('/api/simulation/start', (req, res) => {
      this.behaviorSimulator.startSimulation();
      res.json({
        message: 'Simulation started',
        status: this.behaviorSimulator.getSimulationStatus(),
      });
    });

    this.app.post('/api/simulation/stop', (req, res) => {
      this.behaviorSimulator.stopSimulation();
      res.json({
        message: 'Simulation stopped',
        status: this.behaviorSimulator.getSimulationStatus(),
      });
    });

    this.app.get('/api/simulation/status', (req, res) => {
      res.json(this.behaviorSimulator.getSimulationStatus());
    });

    this.app.get('/api/simulation/metrics', (req, res) => {
      res.json(this.behaviorSimulator.getSimulationMetrics());
    });

    // Agent control endpoints
    this.app.post('/api/agents/:id/transition', (req, res) => {
      const { state } = req.body;
      const result = this.behaviorSimulator.forceAgentTransition(
        req.params.id,
        state
      );
      res.json({
        message: `Agent transition requested`,
        agentId: req.params.id,
        newState: state,
        result,
      });
    });

    this.app.post('/api/agents/:id/activity', (req, res) => {
      const { activityType, params } = req.body;
      const result = this.behaviorSimulator.triggerAgentActivity(
        req.params.id,
        activityType,
        params
      );
      res.json({
        message: `Activity triggered`,
        agentId: req.params.id,
        activityType,
        success: !!result,
        result,
      });
    });

    // WebSocket connection info
    this.app.get('/api/connections', (req, res) => {
      res.json({
        totalConnections: this.connectionCount,
        activeConnections: this.connectedClients.size,
        clients: Array.from(this.connectedClients.values()).map((client) => ({
          id: client.id,
          connectedAt: client.connectedAt,
          userAgent: client.userAgent,
        })),
      });
    });

    // Catch-all for unknown routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        availableEndpoints: [
          'GET /health',
          'GET /api/agents',
          'GET /api/agents/:id',
          'POST /api/simulation/start',
          'POST /api/simulation/stop',
          'GET /api/simulation/status',
          'GET /api/simulation/metrics',
          'POST /api/agents/:id/transition',
          'POST /api/agents/:id/activity',
          'GET /api/connections',
        ],
      });
    });
  }

  /**
   * Setup WebSocket event handlers
   */
  setupWebSocketHandlers() {
    this.io.on('connection', (socket) => {
      this.connectionCount++;
      const clientInfo = {
        id: socket.id,
        connectedAt: new Date(),
        userAgent: socket.handshake.headers['user-agent'] || 'Unknown',
      };

      this.connectedClients.set(socket.id, clientInfo);

      console.log(
        `Client connected: ${socket.id} (Total: ${this.connectedClients.size})`
      );

      // Send initial system status
      socket.emit('system_status', {
        type: 'system_status',
        timestamp: new Date(),
        data: {
          connected: true,
          simulationStatus: this.behaviorSimulator.getSimulationStatus(),
          serverInfo: {
            version: '1.0.0',
            uptime: process.uptime(),
            nodeVersion: process.version,
          },
        },
      });

      // Send current agent states
      this.behaviorSimulator.broadcastAllAgentStates();

      // Handle agent commands from client
      socket.on('agent_command', (message) => {
        this.handleAgentCommand(socket, message);
      });

      // Handle client requests for specific data
      socket.on('request_agent_data', (data) => {
        const { agentId } = data;
        const agent = this.behaviorSimulator.getAgent(agentId);

        if (agent) {
          socket.emit('agent_update', {
            type: 'agent_update',
            timestamp: new Date(),
            data: {
              agentId,
              state: agent,
            },
          });
        }
      });

      // Handle simulation control from client
      socket.on('simulation_control', (data) => {
        const { action } = data;

        if (action === 'start') {
          this.behaviorSimulator.startSimulation();
        } else if (action === 'stop') {
          this.behaviorSimulator.stopSimulation();
        }

        // Broadcast status update
        this.io.emit('system_status', {
          type: 'system_status',
          timestamp: new Date(),
          data: {
            simulationStatus: this.behaviorSimulator.getSimulationStatus(),
          },
        });
      });

      // Handle client disconnect
      socket.on('disconnect', (reason) => {
        this.connectedClients.delete(socket.id);
        console.log(
          `Client disconnected: ${socket.id} (${reason}) (Remaining: ${this.connectedClients.size})`
        );
      });

      // Handle client errors
      socket.on('error', (error) => {
        console.error(`Socket error for client ${socket.id}:`, error);
      });
    });

    // Handle server-level errors
    this.io.on('error', (error) => {
      console.error('Socket.IO server error:', error);
    });
  }

  /**
   * Handle agent commands from clients
   */
  handleAgentCommand(socket, message) {
    try {
      const { data } = message;
      const { type, agentId, toolName, workflowId, parameters } = data;

      console.log(`Agent command received: ${type} for agent ${agentId}`);

      switch (type) {
        case 'switch_agent':
          // Acknowledge agent switch
          socket.emit('agent_update', {
            type: 'agent_update',
            timestamp: new Date(),
            data: {
              agentId,
              state: { isActive: true },
            },
          });
          break;

        case 'execute_tool':
          if (toolName) {
            this.behaviorSimulator.triggerAgentActivity(
              agentId,
              'tool_execution',
              {
                toolName,
                inputs: parameters,
              }
            );
          }
          break;

        case 'pause_workflow':
          // Simulate workflow pause
          socket.emit('workflow_update', {
            type: 'workflow_update',
            timestamp: new Date(),
            data: {
              id: workflowId,
              status: 'paused',
            },
          });
          break;

        case 'resume_workflow':
          // Simulate workflow resume
          socket.emit('workflow_update', {
            type: 'workflow_update',
            timestamp: new Date(),
            data: {
              id: workflowId,
              status: 'executing',
            },
          });
          break;

        default:
          console.warn(`Unknown agent command type: ${type}`);
      }
    } catch (error) {
      console.error('Error handling agent command:', error);
      socket.emit('error', {
        type: 'command_error',
        message: 'Failed to process agent command',
        error: error.message,
      });
    }
  }

  /**
   * Start the mock API server
   */
  start() {
    return new Promise((resolve, reject) => {
      try {
        // Initialize agents
        this.behaviorSimulator.initializeAgents();

        // Start the server
        this.server.listen(this.port, () => {
          console.log(`🚀 Mock API Server running on port ${this.port}`);
          console.log(`📡 WebSocket endpoint: ws://localhost:${this.port}`);
          console.log(`🔗 Health check: http://localhost:${this.port}/health`);
          console.log(
            `📊 Metrics: http://localhost:${this.port}/api/simulation/metrics`
          );
          console.log(
            `\n🤖 ${
              this.behaviorSimulator.getAllAgents().length
            } agents initialized:`
          );

          this.behaviorSimulator.getAllAgents().forEach((agent) => {
            console.log(
              `   • ${agent.name} (${agent.type}): ${agent.capabilities
                .slice(0, 2)
                .join(', ')}...`
            );
          });

          console.log(`\n🎮 Starting simulation...`);
          this.behaviorSimulator.startSimulation();

          resolve();
        });

        this.server.on('error', (error) => {
          console.error('Server error:', error);
          reject(error);
        });
      } catch (error) {
        console.error('Failed to start server:', error);
        reject(error);
      }
    });
  }

  /**
   * Stop the mock API server
   */
  stop() {
    return new Promise((resolve) => {
      console.log('🛑 Stopping Mock API Server...');

      // Stop simulation
      this.behaviorSimulator.stopSimulation();

      // Close WebSocket connections
      this.io.close();

      // Close HTTP server
      this.server.close(() => {
        console.log('✅ Mock API Server stopped');
        resolve();
      });
    });
  }
}

// CLI usage
if (require.main === module) {
  const server = new MockAPIServer({
    port: process.env.MOCK_API_PORT || 3001,
    corsOrigin: process.env.MOCK_API_CORS_ORIGIN
      ? process.env.MOCK_API_CORS_ORIGIN.split(',')
      : ['http://localhost:4200', 'http://localhost:3000'],
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🔄 Received SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🔄 Received SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  // Start the server
  server.start().catch((error) => {
    console.error('❌ Failed to start Mock API Server:', error);
    process.exit(1);
  });
}

module.exports = MockAPIServer;
