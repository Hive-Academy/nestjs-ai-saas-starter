/**
 * Agent State Machine for realistic agent behavior simulation
 * Provides state transitions with configurable timing and behavior patterns
 */

class AgentStateMachine {
  constructor(agentId, agentType, io) {
    this.agentId = agentId;
    this.agentType = agentType;
    this.io = io;
    this.currentState = 'idle';
    this.stateStartTime = Date.now();
    this.transitionTimer = null;
    this.isRunning = false;

    // State configuration based on agent type
    this.stateConfig = this.getStateConfigByType(agentType);
  }

  /**
   * Get state configuration based on agent type
   * Different agent types have different behavior patterns
   */
  getStateConfigByType(type) {
    const baseConfig = {
      idle: { minDuration: 3000, maxDuration: 8000, nextStates: ['thinking'] },
      thinking: { minDuration: 2000, maxDuration: 5000, nextStates: ['executing', 'waiting'] },
      executing: { minDuration: 4000, maxDuration: 12000, nextStates: ['idle', 'thinking', 'error'] },
      waiting: { minDuration: 1000, maxDuration: 4000, nextStates: ['thinking', 'executing'] },
      error: { minDuration: 2000, maxDuration: 3000, nextStates: ['idle'] }
    };

    // Customize behavior by agent type
    switch (type) {
      case 'coordinator':
        return {
          ...baseConfig,
          thinking: { ...baseConfig.thinking, minDuration: 1500, maxDuration: 3000 },
          executing: { ...baseConfig.executing, minDuration: 2000, maxDuration: 6000 }
        };
      
      case 'specialist':
        return {
          ...baseConfig,
          executing: { ...baseConfig.executing, minDuration: 6000, maxDuration: 15000 },
          thinking: { ...baseConfig.thinking, minDuration: 3000, maxDuration: 7000 }
        };
      
      case 'analyst':
        return {
          ...baseConfig,
          thinking: { ...baseConfig.thinking, minDuration: 4000, maxDuration: 8000 },
          executing: { ...baseConfig.executing, minDuration: 5000, maxDuration: 10000 }
        };
      
      case 'creator':
        return {
          ...baseConfig,
          executing: { ...baseConfig.executing, minDuration: 8000, maxDuration: 20000 },
          thinking: { ...baseConfig.thinking, minDuration: 2000, maxDuration: 6000 }
        };
      
      default:
        return baseConfig;
    }
  }

  /**
   * Start the state machine
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.scheduleNextTransition();
    console.log(`State machine started for agent ${this.agentId} (${this.agentType})`);
  }

  /**
   * Stop the state machine
   */
  stop() {
    this.isRunning = false;
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    console.log(`State machine stopped for agent ${this.agentId}`);
  }

  /**
   * Force transition to specific state
   */
  forceTransition(newState) {
    if (!this.isValidState(newState)) {
      console.warn(`Invalid state: ${newState}`);
      return;
    }

    this.transitionToState(newState);
  }

  /**
   * Schedule the next state transition
   */
  scheduleNextTransition() {
    if (!this.isRunning) return;

    const config = this.stateConfig[this.currentState];
    if (!config) return;

    const duration = this.getRandomDuration(config.minDuration, config.maxDuration);
    
    this.transitionTimer = setTimeout(() => {
      if (!this.isRunning) return;
      
      const nextStates = config.nextStates;
      const nextState = this.selectNextState(nextStates);
      this.transitionToState(nextState);
      this.scheduleNextTransition();
    }, duration);
  }

  /**
   * Select next state based on probabilities and current context
   */
  selectNextState(possibleStates) {
    // Add some intelligence to state selection
    const weights = possibleStates.map(state => this.getStateWeight(state));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    let random = Math.random() * totalWeight;
    for (let i = 0; i < possibleStates.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return possibleStates[i];
      }
    }
    
    // Fallback to random selection
    return possibleStates[Math.floor(Math.random() * possibleStates.length)];
  }

  /**
   * Get weight for state selection (higher = more likely)
   */
  getStateWeight(state) {
    const timeSinceStart = Date.now() - this.stateStartTime;
    
    // Base weights
    const baseWeights = {
      idle: 30,
      thinking: 25,
      executing: 20,
      waiting: 15,
      error: 3
    };

    // Modify weights based on context
    let weight = baseWeights[state] || 10;

    // Reduce error probability for coordinators
    if (this.agentType === 'coordinator' && state === 'error') {
      weight *= 0.5;
    }

    // Increase thinking probability for analysts
    if (this.agentType === 'analyst' && state === 'thinking') {
      weight *= 1.5;
    }

    // Increase executing probability for creators
    if (this.agentType === 'creator' && state === 'executing') {
      weight *= 1.3;
    }

    return weight;
  }

  /**
   * Transition to new state and broadcast update
   */
  transitionToState(newState) {
    const previousState = this.currentState;
    this.currentState = newState;
    this.stateStartTime = Date.now();

    console.log(`Agent ${this.agentId}: ${previousState} → ${newState}`);

    // Broadcast state update via WebSocket
    this.io.emit('agent_update', {
      type: 'agent_update',
      timestamp: new Date(),
      data: {
        agentId: this.agentId,
        state: {
          status: newState,
          lastActiveTime: new Date()
        }
      }
    });
  }

  /**
   * Check if state is valid
   */
  isValidState(state) {
    return ['idle', 'thinking', 'executing', 'waiting', 'error'].includes(state);
  }

  /**
   * Get random duration between min and max
   */
  getRandomDuration(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Get current state info
   */
  getStateInfo() {
    return {
      agentId: this.agentId,
      agentType: this.agentType,
      currentState: this.currentState,
      timeInState: Date.now() - this.stateStartTime,
      isRunning: this.isRunning
    };
  }
}

module.exports = AgentStateMachine;