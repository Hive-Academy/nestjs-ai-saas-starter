import { Injectable, Logger } from '@nestjs/common';
import { DeclarativeWorkflowBase } from '../base/declarative-workflow.base';
import { WorkflowState } from '../interfaces/workflow.interface';
import { StreamEventType } from '../constants';
import {
  Workflow,
  Node,
  StartNode,
  EndNode,
  StreamToken,
  StreamEvent,
  StreamProgress,
  StreamAll,
} from '../decorators';

interface StreamingWorkflowState extends WorkflowState {
  prompt?: string;
  content?: string;
  analysis?: string;
  processedFiles?: string[];
  files?: string[];
}

/**
 * Example workflow demonstrating streaming decorators
 * This shows how to use @StreamToken, @StreamEvent, @StreamProgress, and @StreamAll
 */
@Injectable()
@Workflow({
  name: 'streaming-example',
  description: 'Demonstrates all streaming decorator capabilities',
  streaming: true,
  pattern: 'pipeline',
})
export class StreamingWorkflowExample extends DeclarativeWorkflowBase<StreamingWorkflowState> {
  protected override readonly logger = new Logger(StreamingWorkflowExample.name);

  workflowConfig = {
    name: 'streaming-example',
    description: 'Demonstrates all streaming decorator capabilities',
    streaming: true,
  };

  /**
   * Start node with progress tracking
   */
  @StartNode({
    description: 'Initialize workflow with progress tracking',
  })
  @StreamProgress({
    enabled: true,
    interval: 500,
    granularity: 'coarse',
    includeETA: true,
  })
  async initializeWorkflow(state: StreamingWorkflowState): Promise<Partial<StreamingWorkflowState>> {
    this.logger.log('Initializing streaming workflow...');
    
    // Simulate initialization work
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      ...state,
      prompt: state.prompt || 'Generate a comprehensive analysis of AI capabilities',
      files: ['file1.txt', 'file2.txt', 'file3.txt', 'file4.txt'],
      status: 'active',
    };
  }

  /**
   * LLM node with token streaming
   */
  @Node({
    id: 'generate_content',
    description: 'Generate content with token-level streaming',
    type: 'llm',
  })
  @StreamToken({
    enabled: true,
    bufferSize: 50,
    format: 'text',
    flushInterval: 100,
    includeMetadata: true,
    filter: {
      minLength: 1,
      excludeWhitespace: true,
    },
  })
  async generateContent(state: StreamingWorkflowState): Promise<Partial<StreamingWorkflowState>> {
    this.logger.log('Generating content with token streaming...');
    
    // Simulate LLM token generation
    const tokens = ['AI', ' capabilities', ' include', ' natural', ' language', 
                   ' processing', ',', ' machine', ' learning', ',', ' and', 
                   ' problem', ' solving', '.'];
    
    let content = '';
    for (const token of tokens) {
      content += token;
      // Simulate token generation delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return {
      ...state,
      content,
    };
  }

  /**
   * Analysis node with event streaming
   */
  @Node({
    id: 'analyze_content',
    description: 'Analyze content with detailed event streaming',
    type: 'tool',
  })
  @StreamEvent({
    enabled: true,
    events: [
      StreamEventType.NODE_START,
      StreamEventType.NODE_COMPLETE,
      StreamEventType.TOOL_START,
      StreamEventType.TOOL_COMPLETE,
      StreamEventType.PROGRESS,
    ],
    bufferSize: 100,
    delivery: 'at-least-once',
    filter: {
      includeDebug: true,
    },
  })
  async analyzeContent(state: StreamingWorkflowState): Promise<Partial<StreamingWorkflowState>> {
    this.logger.log('Analyzing content with event streaming...');
    
    // Simulate analysis steps
    const steps = ['tokenize', 'extract_entities', 'sentiment_analysis', 'summarize'];
    let analysis = 'Analysis: ';
    
    for (const step of steps) {
      this.logger.debug(`Executing analysis step: ${step}`);
      
      // Simulate tool execution
      await new Promise(resolve => setTimeout(resolve, 300));
      analysis += `${step} completed; `;
    }
    
    return {
      ...state,
      analysis: analysis.trim(),
    };
  }

  /**
   * File processing node with progress streaming and detailed configuration
   */
  @Node({
    id: 'process_files',
    description: 'Process files with fine-grained progress tracking',
    type: 'tool',
  })
  @StreamProgress({
    enabled: true,
    interval: 250,
    granularity: 'fine',
    includeETA: true,
    includeMetrics: true,
    milestones: [25, 50, 75, 90],
    format: {
      showPercentage: true,
      showCurrent: true,
      showTotal: true,
      showRate: true,
      precision: 1,
    },
  })
  async processFiles(state: StreamingWorkflowState): Promise<Partial<StreamingWorkflowState>> {
    this.logger.log('Processing files with detailed progress tracking...');
    
    const files = state.files || [];
    const processedFiles: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.logger.debug(`Processing file ${i + 1}/${files.length}: ${file}`);
      
      // Simulate file processing
      await new Promise(resolve => setTimeout(resolve, 500));
      processedFiles.push(`processed_${file}`);
      
      // Progress is automatically tracked by the decorator
    }
    
    return {
      ...state,
      processedFiles,
    };
  }

  /**
   * Comprehensive streaming node using @StreamAll
   */
  @Node({
    id: 'comprehensive_processing',
    description: 'Node with all streaming capabilities enabled',
    type: 'llm',
  })
  @StreamAll({
    token: {
      enabled: true,
      format: 'structured',
      bufferSize: 25,
      processor: (token, metadata) => `[${new Date().toISOString()}] ${token}`,
    },
    event: {
      events: [StreamEventType.NODE_START, StreamEventType.NODE_COMPLETE, StreamEventType.PROGRESS],
      transformer: (event: any) => ({ ...event, enhanced: true, timestamp: new Date() }),
    },
    progress: {
      enabled: true,
      granularity: 'detailed',
      includeETA: true,
      calculator: (current, total, metadata) => {
        // Custom progress calculation
        return Math.min((current / total) * 100, 100);
      },
    },
  })
  async comprehensiveProcessing(state: StreamingWorkflowState): Promise<Partial<StreamingWorkflowState>> {
    this.logger.log('Executing comprehensive processing with all streaming features...');
    
    // Simulate complex processing with multiple phases
    const phases = ['initialization', 'data_processing', 'analysis', 'finalization'];
    
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      this.logger.debug(`Executing phase: ${phase}`);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    
    return {
      ...state,
      comprehensiveResult: 'All streaming capabilities demonstrated successfully',
    };
  }

  /**
   * End node with final progress update
   */
  @EndNode({
    description: 'Complete workflow with final status',
  })
  @StreamEvent({
    enabled: true,
    events: [StreamEventType.NODE_COMPLETE, StreamEventType.FINAL],
  })
  async completeWorkflow(state: StreamingWorkflowState): Promise<Partial<StreamingWorkflowState>> {
    this.logger.log('Completing streaming workflow...');
    
    return {
      ...state,
      status: 'completed',
      completedAt: new Date(),
      summary: {
        contentGenerated: !!state.content,
        analysisCompleted: !!state.analysis,
        filesProcessed: state.processedFiles?.length || 0,
        comprehensiveProcessingDone: true,
      },
    };
  }
}