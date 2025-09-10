/**
 * Agent Behavior Simulator
 * Orchestrates all agent simulation components to create realistic behavior patterns
 */

const AgentStateMachine = require('./agent-state-machine');
const MemoryOperationsSimulator = require('./memory-operations.simulator');
const ToolExecutionSimulator = require('./tool-execution.simulator');
const CoordinationSimulator = require('./coordination.simulator');

class AgentBehaviorSimulator {
  constructor(io) {
    this.io = io;
    this.agents = new Map();
    this.stateMachines = new Map();
    
    // Initialize subsystems
    this.memorySimulator = new MemoryOperationsSimulator(io);
    this.toolSimulator = new ToolExecutionSimulator(io);
    this.coordinationSimulator = new CoordinationSimulator(io, []);
    
    // Activity scheduling
    this.activityIntervals = new Map();
    this.isSimulationRunning = false;
    
    // Agent behavior profiles
    this.behaviorProfiles = {
      coordinator: {
        activityFrequency: 0.7, // High activity
        coordinationInitiation: 0.8, // Often initiates coordination
        toolUsageFrequency: 0.4, // Moderate tool usage
        memoryAccessFrequency: 0.6 // Frequent memory access
      },
      specialist: {
        activityFrequency: 0.8, // Very high activity
        coordinationInitiation: 0.2, // Rarely initiates coordination
        toolUsageFrequency: 0.9, // Heavy tool usage
        memoryAccessFrequency: 0.7 // High memory access
      },
      analyst: {
        activityFrequency: 0.6, // Moderate activity
        coordinationInitiation: 0.3, // Occasional coordination
        toolUsageFrequency: 0.7, // High tool usage
        memoryAccessFrequency: 0.9 // Very high memory access
      },
      creator: {
        activityFrequency: 0.5, // Moderate activity
        coordinationInitiation: 0.4, // Some coordination
        toolUsageFrequency: 0.8, // High tool usage
        memoryAccessFrequency: 0.5 // Moderate memory access
      }
    };
  }

  /**
   * Initialize agent population with realistic distribution
   */
  initializeAgents() {
    const agentConfigs = [
      // Coordinators (1-2)
      {
        id: 'agent_coordinator_001',
        name: 'Nova Prime',
        type: 'coordinator',
        capabilities: ['workflow_management', 'agent_coordination', 'task_delegation', 'decision_making'],
        personality: {
          color: '#FFD700', // Gold
          description: 'Primary coordinator responsible for orchestrating multi-agent workflows'
        },
        position: { x: 0, y: 0, z: 0 } // Center position
      },
      
      // Specialists (2-3)
      {
        id: 'agent_specialist_backend',
        name: 'Apex Engine',
        type: 'specialist',
        capabilities: ['backend_development', 'api_design', 'database_optimization', 'system_architecture'],
        personality: {
          color: '#FF6B6B', // Red
          description: 'Backend specialist focusing on server-side development and optimization'
        },
        position: { x: 5, y: 0, z: 2 }
      },
      {
        id: 'agent_specialist_ui',
        name: 'Vector Interface',
        type: 'specialist',
        capabilities: ['frontend_development', 'ui_design', '3d_visualization', 'user_experience'],
        personality: {
          color: '#4ECDC4', // Teal
          description: 'UI specialist focused on frontend development and user interface design'
        },
        position: { x: -3, y: 4, z: 1 }
      },
      {
        id: 'agent_specialist_data',
        name: 'Quantum Processor',
        type: 'specialist',
        capabilities: ['data_processing', 'machine_learning', 'analytics', 'model_training'],
        personality: {
          color: '#45B7D1', // Blue
          description: 'Data specialist handling ML operations and data processing workflows'
        },
        position: { x: 2, y: -5, z: -1 }
      },
      
      // Analysts (1-2)
      {
        id: 'agent_analyst_system',
        name: 'Insight Engine',
        type: 'analyst',
        capabilities: ['system_analysis', 'performance_monitoring', 'pattern_recognition', 'reporting'],
        personality: {
          color: '#96CEB4', // Green
          description: 'System analyst monitoring performance and identifying optimization opportunities'
        },
        position: { x: -4, y: -2, z: 3 }
      },
      {
        id: 'agent_analyst_user',
        name: 'Behavior Decoder',
        type: 'analyst',
        capabilities: ['user_behavior', 'interaction_analysis', 'feedback_processing', 'sentiment_analysis'],
        personality: {
          color: '#FFEAA7', // Yellow
          description: 'User behavior analyst tracking interaction patterns and user feedback'
        },
        position: { x: 4, y: 3, z: -2 }
      },
      
      // Creators (1-2)
      {
        id: 'agent_creator_003d',
        name: 'Dimension Forge',
        type: 'creator',
        capabilities: ['3d_modeling', 'visualization_design', 'creative_generation', 'spatial_interfaces'],
        personality: {
          color: '#DDA0DD', // Purple
          description: '3D creator specializing in spatial interfaces and immersive visualizations'
        },
        position: { x: -1, y: 5, z: 4 }
      },
      {
        id: 'agent_creator_content',
        name: 'Narrative Synthesizer',
        type: 'creator',
        capabilities: ['content_generation', 'documentation', 'creative_writing', 'communication'],
        personality: {
          color: '#F39C12', // Orange
          description: 'Content creator generating documentation and communication materials'
        },
        position: { x: 3, y: -1, z: -3 }
      }
    ];

    // Initialize agents
    agentConfigs.forEach(config => {
      const agent = {
        ...config,
        status: 'idle',
        currentTask: null,
        isActive: true,
        lastActiveTime: new Date(),
        currentTools: []
      };

      this.agents.set(agent.id, agent);
      
      // Create state machine for each agent
      const stateMachine = new AgentStateMachine(agent.id, agent.type, this.io);
      this.stateMachines.set(agent.id, stateMachine);

      console.log(`Initialized agent: ${agent.name} (${agent.id}) - ${agent.type}`);
    });

    // Update coordination simulator with agent list
    this.coordinationSimulator.agents = Array.from(this.agents.values());

    // Broadcast initial agent states
    this.broadcastAllAgentStates();
  }

  /**
   * Start simulation for all agents
   */
  startSimulation() {
    if (this.isSimulationRunning) return;
    
    this.isSimulationRunning = true;
    console.log('Starting agent behavior simulation...');

    // Start state machines
    this.stateMachines.forEach(stateMachine => {
      stateMachine.start();
    });

    // Schedule periodic activities
    this.schedulePeriodicActivities();

    // Start coordination workflows
    this.scheduleCoordinationActivities();

    console.log(`Simulation started with ${this.agents.size} agents`);
  }

  /**
   * Stop simulation
   */
  stopSimulation() {
    if (!this.isSimulationRunning) return;
    
    this.isSimulationRunning = false;
    console.log('Stopping agent behavior simulation...');

    // Stop state machines
    this.stateMachines.forEach(stateMachine => {
      stateMachine.stop();
    });

    // Clear activity intervals
    this.activityIntervals.forEach(interval => {
      clearInterval(interval);
    });
    this.activityIntervals.clear();

    console.log('Simulation stopped');
  }

  /**
   * Schedule periodic activities for agents
   */
  schedulePeriodicActivities() {
    this.agents.forEach((agent, agentId) => {
      const profile = this.behaviorProfiles[agent.type];
      
      // Tool execution activity
      const toolInterval = setInterval(() => {
        if (Math.random() < profile.toolUsageFrequency) {
          this.toolSimulator.generateRandomToolExecution(agentId, agent.type);
        }
      }, 8000 + Math.random() * 12000); // 8-20 seconds
      
      // Memory access activity
      const memoryInterval = setInterval(() => {
        if (Math.random() < profile.memoryAccessFrequency) {
          this.memorySimulator.generateRandomMemoryActivity(agentId);
        }
      }, 5000 + Math.random() * 10000); // 5-15 seconds
      
      this.activityIntervals.set(`${agentId}_tools`, toolInterval);
      this.activityIntervals.set(`${agentId}_memory`, memoryInterval);
    });
  }

  /**
   * Schedule coordination activities
   */
  scheduleCoordinationActivities() {
    const coordinationInterval = setInterval(() => {
      if (this.isSimulationRunning) {
        // Find coordinator agents
        const coordinators = Array.from(this.agents.values()).filter(agent => agent.type === 'coordinator');
        
        if (coordinators.length > 0 && Math.random() < 0.3) { // 30% chance every interval
          this.coordinationSimulator.generateRandomCoordination(Array.from(this.agents.values()));
        }
      }
    }, 15000 + Math.random() * 25000); // 15-40 seconds
    
    this.activityIntervals.set('coordination', coordinationInterval);
  }

  /**
   * Broadcast all agent states
   */
  broadcastAllAgentStates() {
    this.agents.forEach((agent, agentId) => {
      this.io.emit('agent_update', {
        type: 'agent_update',
        timestamp: new Date(),
        data: {
          agentId,
          state: agent
        }
      });
    });
  }

  /**
   * Update agent state
   */
  updateAgentState(agentId, updates) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    Object.assign(agent, updates, { lastActiveTime: new Date() });
    this.agents.set(agentId, agent);

    // Broadcast update
    this.io.emit('agent_update', {
      type: 'agent_update',
      timestamp: new Date(),
      data: {
        agentId,
        state: updates
      }
    });
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  getAllAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * Get simulation status
   */
  getSimulationStatus() {
    return {
      isRunning: this.isSimulationRunning,
      agentCount: this.agents.size,
      activeStateMachines: Array.from(this.stateMachines.values()).filter(sm => sm.isRunning).length,
      activeToolExecutions: this.toolSimulator.getActiveExecutions().length,
      activeWorkflows: this.coordinationSimulator.getActiveWorkflows().length,
      uptime: this.isSimulationRunning ? 'Running' : 'Stopped'
    };
  }

  /**
   * Force agent state transition
   */
  forceAgentTransition(agentId, newState) {
    const stateMachine = this.stateMachines.get(agentId);
    if (stateMachine) {
      stateMachine.forceTransition(newState);
    }
  }

  /**
   * Trigger specific agent activity
   */
  triggerAgentActivity(agentId, activityType, params = {}) {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    switch (activityType) {
      case 'tool_execution':
        return this.toolSimulator.startToolExecution(agentId, params.toolName || 'web_search', params.inputs);
      
      case 'memory_query':
        return this.memorySimulator.generateRandomMemoryActivity(agentId);
      
      case 'coordination':
        const participants = params.participants || Array.from(this.agents.keys()).filter(id => id !== agentId).slice(0, 2);
        return this.coordinationSimulator.startWorkflowCoordination(
          `manual_${Date.now()}`,
          agentId,
          participants,
          params.workflowType || 'analysis'
        );
      
      default:
        return false;
    }
  }

  /**
   * Get comprehensive simulation metrics
   */
  getSimulationMetrics() {
    return {
      status: this.getSimulationStatus(),
      agents: {
        total: this.agents.size,
        byType: this.getAgentDistribution(),
        active: Array.from(this.agents.values()).filter(agent => agent.isActive).length
      },
      activities: {
        toolExecutions: this.toolSimulator.getActiveExecutions(),
        workflows: this.coordinationSimulator.getActiveWorkflows(),
        communications: this.coordinationSimulator.getCommunicationHistory(10)
      },
      performance: {
        averageResponseTime: '150ms', // Mock metric
        messagesThroughput: Math.floor(Math.random() * 50) + 20, // Mock metric
        memoryUsage: `${Math.floor(Math.random() * 100) + 50}MB` // Mock metric
      }
    };
  }

  /**
   * Get agent distribution by type
   */
  getAgentDistribution() {
    const distribution = {};
    this.agents.forEach(agent => {
      distribution[agent.type] = (distribution[agent.type] || 0) + 1;
    });
    return distribution;
  }
}

module.exports = AgentBehaviorSimulator;