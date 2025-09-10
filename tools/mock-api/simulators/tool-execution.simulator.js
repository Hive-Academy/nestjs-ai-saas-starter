/**
 * Tool Execution Simulator
 * Simulates tool execution with incremental progress updates and realistic timing
 */

class ToolExecutionSimulator {
  constructor(io) {
    this.io = io;
    this.activeExecutions = new Map();
    this.executionHistory = [];
    
    // Define tool execution profiles
    this.toolProfiles = {
      'web_search': { minDuration: 2000, maxDuration: 5000, complexity: 'low', errorRate: 0.05 },
      'data_analysis': { minDuration: 5000, maxDuration: 15000, complexity: 'medium', errorRate: 0.1 },
      'code_generation': { minDuration: 8000, maxDuration: 20000, complexity: 'high', errorRate: 0.08 },
      'document_processing': { minDuration: 3000, maxDuration: 8000, complexity: 'medium', errorRate: 0.06 },
      'model_inference': { minDuration: 1000, maxDuration: 4000, complexity: 'low', errorRate: 0.03 },
      'database_query': { minDuration: 500, maxDuration: 2000, complexity: 'low', errorRate: 0.02 },
      'image_generation': { minDuration: 10000, maxDuration: 30000, complexity: 'high', errorRate: 0.12 },
      'text_summarization': { minDuration: 2000, maxDuration: 6000, complexity: 'medium', errorRate: 0.04 },
      'sentiment_analysis': { minDuration: 1500, maxDuration: 4000, complexity: 'low', errorRate: 0.03 },
      'workflow_coordination': { minDuration: 3000, maxDuration: 10000, complexity: 'medium', errorRate: 0.07 }
    };
  }

  /**
   * Start tool execution simulation
   */
  startToolExecution(agentId, toolName, inputs = {}) {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const profile = this.toolProfiles[toolName] || this.toolProfiles['web_search'];
    
    const execution = {
      id: executionId,
      toolName,
      agentId,
      status: 'pending',
      progress: 0,
      startTime: new Date(),
      inputs,
      profile,
      progressInterval: null,
      duration: this.getRandomDuration(profile.minDuration, profile.maxDuration)
    };

    this.activeExecutions.set(executionId, execution);

    console.log(`Tool execution started: ${toolName} (${executionId}) for agent ${agentId}`);

    // Broadcast initial tool execution message
    this.broadcastToolExecution(agentId, {
      id: executionId,
      toolName,
      status: 'pending',
      progress: 0,
      startTime: execution.startTime,
      inputs
    });

    // Start execution after brief delay
    setTimeout(() => {
      this.runToolExecution(executionId);
    }, 100);

    return executionId;
  }

  /**
   * Run tool execution with progress updates
   */
  runToolExecution(executionId) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return;

    // Transition to running state
    execution.status = 'running';
    this.broadcastToolExecution(execution.agentId, {
      id: execution.id,
      toolName: execution.toolName,
      status: 'running',
      progress: 0,
      startTime: execution.startTime,
      inputs: execution.inputs
    });

    // Calculate progress update intervals
    const updateCount = this.getProgressUpdateCount(execution.profile.complexity);
    const updateInterval = execution.duration / updateCount;

    let currentUpdate = 0;
    execution.progressInterval = setInterval(() => {
      currentUpdate++;
      const progress = Math.min((currentUpdate / updateCount) * 100, 100);
      execution.progress = progress;

      // Broadcast progress update
      this.broadcastToolExecution(execution.agentId, {
        id: execution.id,
        toolName: execution.toolName,
        status: 'running',
        progress: Math.floor(progress),
        startTime: execution.startTime,
        inputs: execution.inputs
      });

      // Complete execution when progress reaches 100%
      if (progress >= 100) {
        this.completeToolExecution(executionId);
      }
    }, updateInterval);
  }

  /**
   * Complete tool execution (success or error)
   */
  completeToolExecution(executionId) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return;

    // Clear progress interval
    if (execution.progressInterval) {
      clearInterval(execution.progressInterval);
    }

    // Determine if execution should error based on error rate
    const shouldError = Math.random() < execution.profile.errorRate;
    const finalStatus = shouldError ? 'error' : 'completed';
    
    execution.status = finalStatus;
    execution.endTime = new Date();

    // Generate outputs or error message
    if (shouldError) {
      execution.error = this.generateErrorMessage(execution.toolName);
    } else {
      execution.outputs = this.generateOutputs(execution.toolName, execution.inputs);
    }

    // Broadcast final status
    const finalMessage = {
      id: execution.id,
      toolName: execution.toolName,
      status: finalStatus,
      progress: shouldError ? execution.progress : 100,
      startTime: execution.startTime,
      endTime: execution.endTime,
      inputs: execution.inputs
    };

    if (shouldError) {
      finalMessage.error = execution.error;
    } else {
      finalMessage.outputs = execution.outputs;
    }

    this.broadcastToolExecution(execution.agentId, finalMessage);

    // Move to history and remove from active
    this.executionHistory.push(execution);
    this.activeExecutions.delete(executionId);

    console.log(`Tool execution ${finalStatus}: ${execution.toolName} (${executionId}) - ${execution.endTime - execution.startTime}ms`);
  }

  /**
   * Broadcast tool execution update via WebSocket
   */
  broadcastToolExecution(agentId, toolExecution) {
    this.io.emit('tool_execution', {
      type: 'tool_execution',
      timestamp: new Date(),
      data: {
        agentId,
        toolExecution
      }
    });
  }

  /**
   * Get number of progress updates based on complexity
   */
  getProgressUpdateCount(complexity) {
    switch (complexity) {
      case 'low': return Math.floor(Math.random() * 5) + 3; // 3-7 updates
      case 'medium': return Math.floor(Math.random() * 8) + 5; // 5-12 updates
      case 'high': return Math.floor(Math.random() * 12) + 8; // 8-19 updates
      default: return 5;
    }
  }

  /**
   * Generate realistic error messages
   */
  generateErrorMessage(toolName) {
    const errorMessages = {
      'web_search': 'Request timeout: Search service unavailable',
      'data_analysis': 'Analysis failed: Insufficient data quality',
      'code_generation': 'Generation error: Context window exceeded',
      'document_processing': 'Processing failed: Unsupported document format',
      'model_inference': 'Inference error: Model service overloaded',
      'database_query': 'Query timeout: Database connection lost',
      'image_generation': 'Generation failed: Resource limits exceeded',
      'text_summarization': 'Summarization error: Text too complex',
      'sentiment_analysis': 'Analysis failed: Language not supported',
      'workflow_coordination': 'Coordination error: Agent dependency timeout'
    };

    return errorMessages[toolName] || 'Execution failed: Unknown error';
  }

  /**
   * Generate mock outputs based on tool type
   */
  generateOutputs(toolName, inputs) {
    const outputGenerators = {
      'web_search': () => ({
        results: [
          { title: 'Relevant Search Result', url: 'https://example.com/result1', snippet: 'Mock search result content...' },
          { title: 'Another Result', url: 'https://example.com/result2', snippet: 'More relevant information...' }
        ],
        totalFound: 847
      }),
      
      'data_analysis': () => ({
        summary: { mean: 42.7, median: 38.5, stdDev: 12.3 },
        patterns: ['Trend: increasing', 'Correlation: moderate positive'],
        confidence: 0.87
      }),
      
      'code_generation': () => ({
        code: '// Generated code example\nfunction processData(input) {\n  return input.map(item => item.value * 2);\n}',
        language: 'javascript',
        quality_score: 0.92
      }),
      
      'document_processing': () => ({
        extractedText: 'Processed document content goes here...',
        metadata: { pages: 5, words: 1247, entities: ['entity1', 'entity2'] },
        confidence: 0.94
      }),
      
      'model_inference': () => ({
        prediction: 'Classification result: positive',
        confidence: 0.89,
        alternatives: [{ label: 'neutral', confidence: 0.08 }]
      }),
      
      'database_query': () => ({
        rows: [
          { id: 1, name: 'Record 1', value: 123 },
          { id: 2, name: 'Record 2', value: 456 }
        ],
        executionTime: '45ms'
      }),
      
      'image_generation': () => ({
        imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        style: 'photorealistic',
        dimensions: { width: 512, height: 512 }
      }),
      
      'text_summarization': () => ({
        summary: 'This is a mock summary of the processed text content.',
        originalLength: 2456,
        summaryLength: 87,
        compressionRatio: 0.035
      }),
      
      'sentiment_analysis': () => ({
        sentiment: 'positive',
        confidence: 0.82,
        scores: { positive: 0.82, neutral: 0.15, negative: 0.03 }
      }),
      
      'workflow_coordination': () => ({
        coordinatedAgents: ['agent_specialist_001', 'agent_analyst_002'],
        taskAssignments: [
          { agentId: 'agent_specialist_001', task: 'Data preprocessing' },
          { agentId: 'agent_analyst_002', task: 'Analysis execution' }
        ],
        estimatedCompletion: new Date(Date.now() + 300000) // 5 minutes from now
      })
    };

    const generator = outputGenerators[toolName] || (() => ({ result: 'Mock tool output' }));
    return generator();
  }

  /**
   * Get random duration between min and max
   */
  getRandomDuration(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Get active executions for monitoring
   */
  getActiveExecutions() {
    const executions = [];
    this.activeExecutions.forEach((execution, id) => {
      executions.push({
        id,
        toolName: execution.toolName,
        agentId: execution.agentId,
        status: execution.status,
        progress: execution.progress,
        startTime: execution.startTime,
        duration: Date.now() - execution.startTime.getTime()
      });
    });
    return executions;
  }

  /**
   * Cancel tool execution
   */
  cancelExecution(executionId) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return false;

    if (execution.progressInterval) {
      clearInterval(execution.progressInterval);
    }

    execution.status = 'error';
    execution.endTime = new Date();
    execution.error = 'Execution cancelled by user';

    this.broadcastToolExecution(execution.agentId, {
      id: execution.id,
      toolName: execution.toolName,
      status: 'error',
      progress: execution.progress,
      startTime: execution.startTime,
      endTime: execution.endTime,
      error: execution.error
    });

    this.executionHistory.push(execution);
    this.activeExecutions.delete(executionId);

    console.log(`Tool execution cancelled: ${execution.toolName} (${executionId})`);
    return true;
  }

  /**
   * Generate random tool execution for agent activity
   */
  generateRandomToolExecution(agentId, agentType) {
    const toolsByType = {
      coordinator: ['workflow_coordination', 'database_query', 'model_inference'],
      specialist: ['data_analysis', 'code_generation', 'document_processing'],
      analyst: ['data_analysis', 'sentiment_analysis', 'text_summarization'],
      creator: ['code_generation', 'image_generation', 'document_processing']
    };

    const availableTools = toolsByType[agentType] || toolsByType.specialist;
    const randomTool = availableTools[Math.floor(Math.random() * availableTools.length)];
    
    return this.startToolExecution(agentId, randomTool, { context: 'automated_activity' });
  }
}

module.exports = ToolExecutionSimulator;