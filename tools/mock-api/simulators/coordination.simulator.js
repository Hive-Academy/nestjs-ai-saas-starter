/**
 * Multi-Agent Coordination Simulator
 * Simulates inter-agent communication flows and coordination patterns
 */

class CoordinationSimulator {
  constructor(io, agents) {
    this.io = io;
    this.agents = agents;
    this.activeWorkflows = new Map();
    this.communicationChannels = new Map();
    this.coordinationHistory = [];
  }

  /**
   * Start a multi-agent workflow coordination
   */
  startWorkflowCoordination(
    workflowId,
    coordinatorId,
    participantIds,
    workflowType = 'analysis'
  ) {
    const workflow = {
      id: workflowId,
      coordinatorId,
      participantIds,
      type: workflowType,
      status: 'planning',
      startTime: new Date(),
      currentStep: 0,
      totalSteps: this.getWorkflowSteps(workflowType),
      dependencies: this.createDependencyGraph(participantIds),
      communication: [],
    };

    this.activeWorkflows.set(workflowId, workflow);
    console.log(
      `Workflow coordination started: ${workflowId} with coordinator ${coordinatorId}`
    );

    // Notify all participants
    this.broadcastWorkflowUpdate(workflow);

    // Start coordination sequence
    setTimeout(() => {
      this.executeWorkflowStep(workflowId);
    }, 1000);

    return workflowId;
  }

  /**
   * Execute a workflow step with agent coordination
   */
  async executeWorkflowStep(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow || workflow.status === 'completed') return;

    workflow.currentStep++;
    workflow.status = 'executing';

    const stepInfo = this.getStepInfo(workflow.type, workflow.currentStep);
    console.log(
      `Executing workflow step ${workflow.currentStep}/${workflow.totalSteps}: ${stepInfo.name}`
    );

    // Determine agents needed for this step
    const requiredAgents = this.getStepAgents(
      stepInfo,
      workflow.participantIds
    );

    // Create agent dependencies and waiting states
    await this.coordinateAgentsForStep(workflow, requiredAgents, stepInfo);

    // Update workflow status
    this.broadcastWorkflowUpdate(workflow);

    // Schedule next step or completion
    if (workflow.currentStep >= workflow.totalSteps) {
      this.completeWorkflow(workflowId);
    } else {
      setTimeout(() => {
        this.executeWorkflowStep(workflowId);
      }, stepInfo.duration);
    }
  }

  /**
   * Coordinate agents for a specific workflow step
   */
  async coordinateAgentsForStep(workflow, requiredAgents, stepInfo) {
    const coordination = {
      step: workflow.currentStep,
      stepName: stepInfo.name,
      agents: requiredAgents,
      startTime: new Date(),
      communications: [],
    };

    // Set agents to waiting state first
    for (const agentId of requiredAgents) {
      this.setAgentWaitingState(
        agentId,
        `Waiting for coordination: ${stepInfo.name}`
      );
      await this.delay(100); // Stagger the waiting states
    }

    // Simulate coordinator communication
    await this.simulateCoordinatorCommunication(
      workflow.coordinatorId,
      requiredAgents,
      stepInfo
    );

    // Simulate agent dependencies and handoffs
    await this.simulateAgentDependencies(workflow, requiredAgents, stepInfo);

    workflow.communication.push(coordination);
  }

  /**
   * Simulate coordinator sending instructions to agents
   */
  async simulateCoordinatorCommunication(
    coordinatorId,
    targetAgents,
    stepInfo
  ) {
    console.log(
      `Coordinator ${coordinatorId} communicating with agents for step: ${stepInfo.name}`
    );

    for (const agentId of targetAgents) {
      // Simulate communication delay
      await this.delay(200 + Math.random() * 300);

      // Create communication record
      const communication = {
        from: coordinatorId,
        to: agentId,
        type: 'instruction',
        content: `Execute ${stepInfo.name}: ${stepInfo.description}`,
        timestamp: new Date(),
      };

      this.recordCommunication(communication);

      // Transition agent to thinking state
      this.setAgentThinkingState(agentId, stepInfo.name);
    }
  }

  /**
   * Simulate agent dependencies and handoffs
   */
  async simulateAgentDependencies(workflow, agents, stepInfo) {
    const dependencies = workflow.dependencies;

    for (let i = 0; i < agents.length; i++) {
      const agentId = agents[i];
      const dependsOn = dependencies[agentId] || [];

      // Wait for dependent agents if any
      if (dependsOn.length > 0) {
        console.log(
          `Agent ${agentId} waiting for dependencies: ${dependsOn.join(', ')}`
        );

        // Simulate dependency waiting time
        await this.delay(1000 + Math.random() * 2000);

        // Simulate handoff communications
        for (const dependentAgent of dependsOn) {
          const handoff = {
            from: dependentAgent,
            to: agentId,
            type: 'handoff',
            content: `Data ready for ${stepInfo.name}`,
            timestamp: new Date(),
          };

          this.recordCommunication(handoff);
        }
      }

      // Transition to executing
      this.setAgentExecutingState(agentId, stepInfo.name);

      // Stagger agent execution
      await this.delay(500);
    }
  }

  /**
   * Complete workflow coordination
   */
  completeWorkflow(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return;

    workflow.status = 'completed';
    workflow.endTime = new Date();

    console.log(
      `Workflow completed: ${workflowId} in ${
        workflow.endTime - workflow.startTime
      }ms`
    );

    // Return all agents to idle state
    const allAgents = [workflow.coordinatorId, ...workflow.participantIds];
    allAgents.forEach((agentId) => {
      this.setAgentIdleState(agentId);
    });

    // Broadcast final workflow update
    this.broadcastWorkflowUpdate(workflow);

    // Move to history
    this.coordinationHistory.push(workflow);
    this.activeWorkflows.delete(workflowId);
  }

  /**
   * Set agent to waiting state
   */
  setAgentWaitingState(agentId, task) {
    this.io.emit('agent_update', {
      type: 'agent_update',
      timestamp: new Date(),
      data: {
        agentId,
        state: {
          status: 'waiting',
          currentTask: task,
          lastActiveTime: new Date(),
        },
      },
    });
  }

  /**
   * Set agent to thinking state
   */
  setAgentThinkingState(agentId, task) {
    this.io.emit('agent_update', {
      type: 'agent_update',
      timestamp: new Date(),
      data: {
        agentId,
        state: {
          status: 'thinking',
          currentTask: `Planning: ${task}`,
          lastActiveTime: new Date(),
        },
      },
    });
  }

  /**
   * Set agent to executing state
   */
  setAgentExecutingState(agentId, task) {
    this.io.emit('agent_update', {
      type: 'agent_update',
      timestamp: new Date(),
      data: {
        agentId,
        state: {
          status: 'executing',
          currentTask: `Executing: ${task}`,
          lastActiveTime: new Date(),
        },
      },
    });
  }

  /**
   * Set agent to idle state
   */
  setAgentIdleState(agentId) {
    this.io.emit('agent_update', {
      type: 'agent_update',
      timestamp: new Date(),
      data: {
        agentId,
        state: {
          status: 'idle',
          currentTask: null,
          lastActiveTime: new Date(),
        },
      },
    });
  }

  /**
   * Record communication between agents
   */
  recordCommunication(communication) {
    const channelKey = `${communication.from}-${communication.to}`;

    if (!this.communicationChannels.has(channelKey)) {
      this.communicationChannels.set(channelKey, []);
    }

    this.communicationChannels.get(channelKey).push(communication);

    console.log(
      `Communication: ${communication.from} → ${communication.to}: ${communication.content}`
    );
  }

  /**
   * Get workflow steps based on type
   */
  getWorkflowSteps(workflowType) {
    const stepCounts = {
      analysis: 4,
      generation: 5,
      research: 3,
      coordination: 6,
      processing: 4,
    };
    return stepCounts[workflowType] || 4;
  }

  /**
   * Get step information
   */
  getStepInfo(workflowType, stepNumber) {
    const workflows = {
      analysis: [
        {
          name: 'Data Collection',
          description: 'Gather required data sources',
          duration: 3000,
        },
        {
          name: 'Data Processing',
          description: 'Clean and prepare data',
          duration: 4000,
        },
        {
          name: 'Analysis Execution',
          description: 'Perform analytical operations',
          duration: 5000,
        },
        {
          name: 'Results Synthesis',
          description: 'Compile and validate results',
          duration: 3000,
        },
      ],
      generation: [
        {
          name: 'Requirements Analysis',
          description: 'Analyze generation requirements',
          duration: 2000,
        },
        {
          name: 'Template Selection',
          description: 'Choose appropriate templates',
          duration: 2000,
        },
        {
          name: 'Content Generation',
          description: 'Generate content elements',
          duration: 6000,
        },
        {
          name: 'Quality Review',
          description: 'Review and validate output',
          duration: 3000,
        },
        {
          name: 'Final Assembly',
          description: 'Assemble final deliverable',
          duration: 2000,
        },
      ],
      research: [
        {
          name: 'Query Formulation',
          description: 'Formulate research queries',
          duration: 2000,
        },
        {
          name: 'Information Gathering',
          description: 'Collect information from sources',
          duration: 5000,
        },
        {
          name: 'Synthesis & Analysis',
          description: 'Synthesize findings',
          duration: 4000,
        },
      ],
    };

    const steps = workflows[workflowType] || workflows['analysis'];
    return (
      steps[stepNumber - 1] || {
        name: 'Unknown Step',
        description: 'Unknown step',
        duration: 3000,
      }
    );
  }

  /**
   * Get agents required for a step
   */
  getStepAgents(stepInfo, availableAgents) {
    // Simulate different agent requirements per step
    const agentCount = Math.min(
      Math.floor(Math.random() * 3) + 1, // 1-3 agents
      availableAgents.length
    );

    return availableAgents
      .sort(() => Math.random() - 0.5) // Shuffle
      .slice(0, agentCount);
  }

  /**
   * Create dependency graph between agents
   */
  createDependencyGraph(agentIds) {
    const dependencies = {};

    // Create some realistic dependencies
    for (let i = 1; i < agentIds.length; i++) {
      if (Math.random() < 0.4) {
        // 40% chance of dependency
        dependencies[agentIds[i]] = [agentIds[i - 1]];
      }
    }

    return dependencies;
  }

  /**
   * Broadcast workflow update
   */
  broadcastWorkflowUpdate(workflow) {
    this.io.emit('workflow_update', {
      type: 'workflow_update',
      timestamp: new Date(),
      data: {
        id: workflow.id,
        status: workflow.status,
        currentStep: workflow.currentStep,
        totalSteps: workflow.totalSteps,
        activeAgents: [workflow.coordinatorId, ...workflow.participantIds],
      },
    });
  }

  /**
   * Start random coordination activity
   */
  generateRandomCoordination(agents) {
    if (agents.length < 2) return;

    const coordinator =
      agents.find((agent) => agent.type === 'coordinator') || agents[0];
    const participants = agents
      .filter((agent) => agent.id !== coordinator.id)
      .slice(0, Math.floor(Math.random() * 3) + 1); // 1-3 participants

    const workflowTypes = ['analysis', 'generation', 'research', 'processing'];
    const workflowType =
      workflowTypes[Math.floor(Math.random() * workflowTypes.length)];

    const workflowId = `workflow_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 6)}`;

    return this.startWorkflowCoordination(
      workflowId,
      coordinator.id,
      participants.map((p) => p.id),
      workflowType
    );
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get active workflows
   */
  getActiveWorkflows() {
    const workflows = [];
    this.activeWorkflows.forEach((workflow, id) => {
      workflows.push({
        id,
        coordinatorId: workflow.coordinatorId,
        participantIds: workflow.participantIds,
        status: workflow.status,
        currentStep: workflow.currentStep,
        totalSteps: workflow.totalSteps,
        startTime: workflow.startTime,
        duration: Date.now() - workflow.startTime.getTime(),
      });
    });
    return workflows;
  }

  /**
   * Get communication history
   */
  getCommunicationHistory(limit = 50) {
    const allCommunications = [];

    this.communicationChannels.forEach((communications, channel) => {
      // Add channel metadata to communications
      const channelComms = communications.map((comm) => ({ ...comm, channel }));
      allCommunications.push(...channelComms);
    });

    return allCommunications
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}

module.exports = CoordinationSimulator;
